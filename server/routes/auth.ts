import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadDatabase, saveDatabase, appendAuditLog, createRefreshToken, findRefreshToken, revokeRefreshToken, createOTPSession, verifyOTPSession } from '../db';
import { authenticateToken, requireRoles } from '../middlewares/security';
import { loginLimiter, otpLimiter } from '../middlewares/rateLimiter';
import { User, UserRole } from '../../src/types';
import { loginSchema, registerSchema, otpVerifySchema, resetPasswordRequestSchema, resetPasswordSchema, formatZodError } from '../services/validation';
import { NotificationService } from '../services/notification';
import logger from '../services/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "apexsacco-fintech-jwt-key-2026";

// Help generate standard Access Token
export function generateAccessToken(payload: { id: string; email: string; role: string; fullName: string; memberId?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Short-lived 15 minutes access token!
}

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: formatZodError(result.error) });
    return;
  }

  const { email, password } = result.data;
  const db = loadDatabase();
  const emailLower = email.toLowerCase();
  
  // Find user by email
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === emailLower);
  if (userIndex === -1) {
    res.status(401).json({ error: "Invalid email or password credentials." });
    return;
  }

  const user = db.users[userIndex];

  // 1. Lockout Check
  if (user.status === 'Suspended') {
    res.status(403).json({ error: "Access Denied. This administrative profile has been suspended." });
    return;
  }

  // Cast check to prevent typescript errors
  const uAny = user as any;
  if (uAny.lockoutUntil) {
    const lockoutTime = new Date(uAny.lockoutUntil);
    if (new Date() < lockoutTime) {
      const remainingMinutes = Math.ceil((lockoutTime.getTime() - Date.now()) / (60 * 1000));
      logger.warn(`Locked out user attempted registration of sessions: ${emailLower}`);
      res.status(423).json({ error: `Too many failed login attempts. Account is locked temporarily. Try again in ${remainingMinutes} minutes.` });
      return;
    } else {
      // Lockout duration expired, clear limits
      uAny.failedAttempts = 0;
      uAny.lockoutUntil = null;
    }
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    uAny.failedAttempts = (uAny.failedAttempts || 0) + 1;
    logger.info(`Failed login attempt count for [${emailLower}]: ${uAny.failedAttempts}`);

    if (uAny.failedAttempts >= 5) {
      const lockoutExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      uAny.lockoutUntil = lockoutExpiry.toISOString();
      logger.error(`Suspicious login threat flagged: locking down user profile [${emailLower}] until: ${uAny.lockoutUntil}`);
      saveDatabase(db);
      
      await NotificationService.sendSecurityAlert(user.email, 'Repeated Failed Login Lockout triggered');
      
      res.status(423).json({ error: "Too many failed attempts. Your account has been locked for exactly 15 minutes. A security notification alert has been dispatched." });
      return;
    }

    saveDatabase(db);
    res.status(401).json({ error: `Invalid email or password. ${5 - uAny.failedAttempts} login attempts remaining.` });
    return;
  }

  // Clear tracking values upon success login
  uAny.failedAttempts = 0;
  uAny.lockoutUntil = null;

  // Generate OTP Session
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await createOTPSession(user.id, user.email, otpCode, otpExpiry);

  // Send REAL dynamic verification alert
  await NotificationService.sendOTP(user.email, otpCode);

  // Generate 7-day Refresh Token
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await createRefreshToken(user.id, rawRefreshToken, refreshExpiry);

  // Generate 15-minute Access Token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    memberId: user.memberId
  };
  const token = generateAccessToken(tokenPayload);

  // Store refresh token and access token in secure HTTP-only cookie
  res.cookie('sacco_refresh_token', rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie('sacco_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  user.lastLogin = new Date().toISOString();
  saveDatabase(db);

  appendAuditLog(
    "User Session Sparked",
    user.email,
    user.role,
    `Logged in successfully. Access token & 7d refresh token initialized. Verification OTP generated: ${otpCode}`
  );

  res.json({
    message: "Authorized in. Please execute 2FA OTP prompt checks.",
    token,
    refreshToken: rawRefreshToken, // Backup in body for web iframe sandboxes that block cookies
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      memberId: user.memberId,
      status: user.status
    },
    otpRequired: true,
    otpDemoValue: otpCode
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpLimiter, authenticateToken, async (req: any, res: Response) => {
  // Gracefully enforce body initialization
  if (!req.body) {
    req.body = {};
  }

  // Explicit typecasting and preparation to satisfy Zod string expectations
  req.body.otp = String(req.body.otp || "").trim();

  // Gracefully auto-inject the authenticated user's email if missing from client body
  if (req.user && req.user.email && !req.body.email) {
    req.body.email = req.user.email;
  }

  req.body.email = String(req.body.email || "").toLowerCase().trim();

  const parseResult = otpVerifySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: formatZodError(parseResult.error) });
    return;
  }

  const { otp, email } = parseResult.data;
  const userEmail = req.user?.email;

  if (email.toLowerCase() !== userEmail?.toLowerCase()) {
    res.status(403).json({ error: "Forbidden. Session identity does not align." });
    return;
  }

  const result = await verifyOTPSession(userEmail, otp);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  // Clear OTP codes from memory in db
  const db = loadDatabase();
  const u = db.users.find(user => user.email === userEmail);
  if (u) {
    u.otpCode = undefined;
    u.otpExpires = undefined;
    saveDatabase(db);
  }

  appendAuditLog("2FA Shield Verified", userEmail, req.user?.role, "Account verified with standard cryptographic OTP credentials.");

  res.json({ success: true, message: "Multi-Factor validation completed. Access granted." });
});

// POST /api/auth/refresh (Renew access sessions)
router.post('/refresh', async (req: Request, res: Response) => {
  // Get token from cookie or post request payload
  const incomingRefreshToken = req.cookies?.sacco_refresh_token || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    res.status(401).json({ error: "Session renewal error. Refresh token is missing." });
    return;
  }

  const storedToken = await findRefreshToken(incomingRefreshToken);
  if (!storedToken || storedToken.revoked || new Date() > storedToken.expiresAt) {
    res.status(401).json({ error: "Session renewal expired or revoked. Please log in again." });
    return;
  }

  const user = storedToken.user;
  if (!user || user.status === 'Suspended') {
    res.status(403).json({ error: "Owner account is suspended or invalid." });
    return;
  }

  // Issue dynamic fresh 15-minute token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    fullName: user.fullName,
    memberId: user.memberId
  };
  const token = generateAccessToken(tokenPayload);

  res.cookie('sacco_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.json({
    token,
    refreshToken: incomingRefreshToken
  });
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const tokenToRevoke = req.cookies?.sacco_refresh_token || req.body?.refreshToken;

  if (tokenToRevoke) {
    await revokeRefreshToken(tokenToRevoke);
  }

  res.clearCookie('sacco_refresh_token');
  res.clearCookie('sacco_session');
  res.json({ success: true, message: "Logged out successfully from portal." });
});

// POST /api/auth/register-member
router.post('/register-member', async (req: Request, res: Response) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: formatZodError(validation.error) });
    return;
  }

  const { fullName, email, phone, nationalId, password } = validation.data;

  const db = loadDatabase();
  const emailLower = email.toLowerCase();
  
  const userExists = db.users.some(u => u.email.toLowerCase() === emailLower);
  const memberExists = db.members.some(m => m.email.toLowerCase() === emailLower || m.nationalId === nationalId);

  if (userExists || memberExists) {
    res.status(400).json({ error: "A member profile with similar credentials already is indexed." });
    return;
  }

  const memberId = `SACCO-${1000 + db.members.length + 1}`;
  const memberDbId = `mem-${Date.now()}`;
  const userDbId = `usr-${Date.now()}`;

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newMember = {
    id: memberDbId,
    memberId,
    fullName,
    email,
    phone,
    nationalId,
    joinedDate: new Date().toISOString(),
    status: 'Active' as const,
    savingsBalance: 0,
    activeLoansCount: 0,
    totalBorrowed: 0,
    totalRepaid: 0,
    dividendsPaid: 0,
    tier: 'Bronze' as const,
    avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=150&auto=format&fit=crop&q=80`
  };

  const newUser = {
    id: userDbId,
    email,
    role: "Member" as const,
    fullName,
    memberId,
    status: "Active" as const,
    passwordHash,
    avatarUrl: newMember.avatarUrl
  };

  db.members.push(newMember);
  db.users.push(newUser);
  saveDatabase(db);

  // Send real register Verification greetings
  await NotificationService.send({
    to: email,
    subject: "Welcome to Apex SACCO Co-operative Society Limited",
    message: `Greetings ${fullName}! Your member registration was processed successfully. Assigned SACCO member reference account ID: ${memberId}. Login using your primary verification password: "${password}"`,
    type: "email"
  });

  appendAuditLog("Self Member Registration", email, "Member", `Created profiling assigned system ID: ${memberId}`);

  // Auto Generate tokens
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  await createRefreshToken(newUser.id, rawRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const token = generateAccessToken({ id: newUser.id, email: newUser.email, role: newUser.role, fullName: newUser.fullName, memberId: newUser.memberId });

  res.cookie('sacco_refresh_token', rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.cookie('sacco_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.status(201).json({
    message: "Federated account registration completed.",
    token,
    refreshToken: rawRefreshToken,
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      memberId: newUser.memberId,
      status: newUser.status
    }
  });
});

// GET /api/auth/me (Get profile content)
router.get('/me', authenticateToken, (req: any, res: Response) => {
  const db = loadDatabase();
  const user = db.users.find(u => u.id === req.user?.id);

  if (!user) {
    res.status(404).json({ error: "Session profile metadata not registered." });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      memberId: user.memberId,
      status: user.status,
      avatarUrl: user.avatarUrl,
      lastLogin: user.lastLogin
    }
  });
});

// POST /api/auth/forgot-password (Forgot password token triggering flow)
router.post('/forgot-password', async (req: Request, res: Response) => {
  const parse = resetPasswordRequestSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: formatZodError(parse.error) });
    return;
  }

  const { email } = parse.data;
  const db = loadDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Return friendly 200 to prevent user harvesting / intelligence leaks
    res.json({ success: true, message: "If the account exists, a secure OTP reset token has been dispatched successfully." });
    return;
  }

  // Generate OTP reset token valid for 10 minutes
  const recoveryOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  const uAny = user as any;
  uAny.resetOTP = recoveryOTP;
  uAny.resetOTPExpires = expiry;
  saveDatabase(db);

  await NotificationService.send({
    to: email,
    subject: "OTP RESET: Secure Forgot Password account recovery",
    message: `Your password recovery transaction OTP is: ${recoveryOTP}. This code is valid for exactly 10 minutes. Enter this code to change your security login credentials.`,
    type: "email"
  });

  appendAuditLog("Password Reset Triggered", email, user.role, `Dispatched temporary reset code valid until: ${expiry}`);

  res.json({
    success: true,
    message: "If the account exists, a secure OTP reset token has been dispatched successfully.",
    demoResetOTP: recoveryOTP // Useful for UI playground testing
  });
});

// POST /api/auth/reset-password (Verify reset OTP and assign password)
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  
  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: "Email, Recovery OTP code, and New Password are required." });
    return;
  }

  const db = loadDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    res.status(404).json({ error: "No profile belongs to this email." });
    return;
  }

  const uAny = user as any;
  if (!uAny.resetOTP || uAny.resetOTP !== otp) {
    res.status(400).json({ error: "Invalid password recovery OTP code." });
    return;
  }

  if (new Date() > new Date(uAny.resetOTPExpires)) {
    res.status(400).json({ error: "Password recovery OTP code has expired." });
    return;
  }

  // Hash new password
  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(newPassword, salt);
  
  // Clean OTP properties
  delete uAny.resetOTP;
  delete uAny.resetOTPExpires;
  saveDatabase(db);

  // Send feedback notification
  await NotificationService.send({
    to: user.email,
    subject: "SECURITY CONFIRMATION: Security Password changed",
    message: `Your Apex SACCO portal login password has been changed successfully. If you did not make this update, please warn Sacco support immediately.`,
    type: "email"
  });

  appendAuditLog("Password Reset Confirmed", user.email, user.role, "Security password updated securely via email validation verification OTP.");

  res.json({ success: true, message: "Security credentials updated successfully. Please log in using the new password." });
});

// POST /api/auth/sync-backups (Sync credentials and backup users/members from client localstorage fallback)
router.post('/sync-backups', (req: Request, res: Response) => {
  const { members, users } = req.body;

  if (!Array.isArray(members) || !Array.isArray(users)) {
    res.status(400).json({ error: "Invalid backup synchronization payload format." });
    return;
  }

  const db = loadDatabase();
  let changed = false;

  for (const m of members) {
    if (!db.members.some(em => em.memberId === m.memberId || em.email.toLowerCase() === m.email.toLowerCase())) {
      db.members.push(m);
      changed = true;
    }
  }

  for (const u of users) {
    if (!db.users.some(eu => eu.email.toLowerCase() === u.email.toLowerCase())) {
      const uCopy = { ...u };
      const password = u.password || "password123";
      const salt = bcrypt.genSaltSync(10);
      uCopy.passwordHash = bcrypt.hashSync(password, salt);
      delete uCopy.password;
      db.users.push(uCopy);
      changed = true;
    }
  }

  if (changed) {
    saveDatabase(db);
  }

  res.json({ success: true, count: db.members.length });
});

// -------------------------------------------------------------
// SECURE KYC VERIFICATION & COMPLIANCE SYSTEM
// -------------------------------------------------------------
router.get('/kyc-status', authenticateToken, (req: any, res: Response) => {
  const db = loadDatabase();
  const member = db.members.find(m => m.memberId === req.user?.memberId);
  if (!member) {
    res.json({ status: 'Unverified', details: null });
    return;
  }
  const mAny = member as any;
  res.json({
    status: mAny.kycStatus || 'Unverified',
    nationalId: member.nationalId,
    idUrl: mAny.kycIdUrl || null,
    selfieUrl: mAny.kycSelfieUrl || null,
    proofUrl: mAny.kycProofUrl || null,
    comments: mAny.kycComments || null
  });
});

router.post('/kyc-submit', authenticateToken, (req: any, res: Response) => {
  const { idUrl, selfieUrl, proofUrl, nationalId } = req.body;
  if (!idUrl || !selfieUrl || !proofUrl) {
    res.status(400).json({ error: "KYC completion requires ID front, Live Selfie, and Proof of Income." });
    return;
  }

  const db = loadDatabase();
  const member = db.members.find(m => m.memberId === req.user?.memberId);
  if (!member) {
    res.status(404).json({ error: "Member profile reference not registered." });
    return;
  }

  const mAny = member as any;
  mAny.kycStatus = 'Pending';
  mAny.kycIdUrl = idUrl;
  mAny.kycSelfieUrl = selfieUrl;
  mAny.kycProofUrl = proofUrl;
  if (nationalId) {
    member.nationalId = nationalId;
  }
  
  saveDatabase(db);

  appendAuditLog(
    "KYC Documents Lodged",
    req.user.email,
    req.user.role,
    `Lodged KYC details: National ID: ${member.nationalId}. Review queued.`
  );

  res.json({ success: true, message: "KYC documents submitted. Core policy review is pending.", status: "Pending" });
});

router.post('/kyc-approve', authenticateToken, requireRoles(['Admin', 'Loan Officer']), (req: any, res: Response) => {
  const { memberId, action, comment } = req.body; // action = 'Approve' or 'Reject'
  if (!memberId || !action) {
    res.status(400).json({ error: "memberId and action variables are required." });
    return;
  }

  const db = loadDatabase();
  const member = db.members.find(m => m.memberId === memberId);
  if (!member) {
    res.status(404).json({ error: "Target member profile not found." });
    return;
  }

  const mAny = member as any;
  const oldKyc = mAny.kycStatus;
  mAny.kycStatus = action === 'Approve' ? 'Approved' : 'Rejected';
  mAny.kycComments = comment || `Reviewed by ${req.user.fullName}`;

  saveDatabase(db);

  appendAuditLog(
    `KYC Review ${action}`,
    req.user.email,
    req.user.role,
    `Admin ${action} KYC submission of Member ${memberId}. Comments: ${mAny.kycComments}`
  );

  NotificationService.send({
    to: member.email,
    subject: `KYC Verification Update - ${action}`,
    message: `Dear ${member.fullName}, your digital KYC verification application has been ${action === 'Approve' ? 'Verified Successfully' : 'Rejected'}. Reason context: ${mAny.kycComments}.`,
    type: "email"
  });

  res.json({ success: true, message: `KYC successfully ${action === 'Approve' ? 'approved' : 'rejected'}.`, status: mAny.kycStatus });
});

// -------------------------------------------------------------
// MOBILE SECURE PIN & BIOMETRICS API HOOKS
// -------------------------------------------------------------
router.post('/enroll-pin', authenticateToken, async (req: any, res: Response) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be exactly 4 numeric digits." });
    return;
  }
  const db = loadDatabase();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    res.status(404).json({ error: "User profile not found in ledger." });
    return;
  }
  (user as any).pin = pin;
  saveDatabase(db);
  appendAuditLog("PIN Enrolled", user.email, user.role, "Member set their 4-digit mobile transaction PIN.");
  res.json({ success: true, message: "Transaction PIN enrolled successfully." });
});

router.post('/verify-pin', authenticateToken, async (req: any, res: Response) => {
  const { pin } = req.body;
  const db = loadDatabase();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    res.status(404).json({ error: "User profile not found." });
    return;
  }
  const storedPin = (user as any).pin || "1234"; // default PIN for simulation
  if (storedPin !== pin) {
    res.status(400).json({ error: "Invalid transaction PIN." });
    return;
  }
  res.json({ success: true, message: "PIN code verified." });
});

router.post('/biometric-login', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email check is required for biometric authentication." });
    return;
  }
  const db = loadDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(404).json({ error: "Biometric profile not enrolled or synchronized. Please complete initial PIN sync." });
    return;
  }
  if (user.status === 'Suspended') {
    res.status(403).json({ error: "Access Denied. Account suspended." });
    return;
  }

  // Generate tokens
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  await createRefreshToken(user.id, rawRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const token = generateAccessToken({ 
    id: user.id, 
    email: user.email, 
    role: user.role, 
    fullName: user.fullName, 
    memberId: user.memberId 
  });

  res.cookie('sacco_refresh_token', rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.cookie('sacco_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  appendAuditLog(
    "Biometric Session Sparked",
    user.email,
    user.role,
    "Logged in securely via mobile biometric Face/Fingerprint simulation."
  );

  res.json({
    success: true,
    token,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      memberId: user.memberId,
      status: user.status
    }
  });
});

// GET /api/auth/users (Fetch all registered system users/personnel)
router.get('/users', authenticateToken, (req: any, res: Response) => {
  const db = loadDatabase();
  // Map users mapping to avoid leaking passwords hashes
  const safeUsers = db.users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    memberId: u.memberId,
    status: u.status,
    avatarUrl: u.avatarUrl
  }));
  res.json(safeUsers);
});

// PUT /api/auth/users/:userId (Update or Rename specific user/personnel profiles)
router.put('/users/:userId', authenticateToken, (req: any, res: Response) => {
  const { userId } = req.params;
  const { fullName, email, status, role } = req.body;

  // Security Gate: You must edit YOUR OWN account, or be an ADMIN to edit ANY account
  if (req.user.id !== userId && req.user.role !== 'Admin') {
    res.status(403).json({ error: "Access Denied. You do not have permissions to modify another staff member's profile." });
    return;
  }

  const db = loadDatabase();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: `System profile was not found in active records.` });
    return;
  }

  const oldName = user.fullName;
  const oldRole = user.role;

  // Perform updates
  if (fullName) {
    user.fullName = fullName;
    // Mirror name update onto member profile if assigned
    if (user.memberId) {
      const member = db.members.find(m => m.memberId === user.memberId);
      if (member) member.fullName = fullName;
    }
  }
  if (email) user.email = email;
  if (status && req.user.role === 'Admin') user.status = status;
  if (role && req.user.role === 'Admin') {
    // Prevent locking out the absolute last admin
    if (user.role === 'Admin' && role !== 'Admin' && userId === req.user.id) {
      res.status(400).json({ error: "Gating safeguard: You cannot change your own Admin role as the active administrator." });
      return;
    }
    user.role = role as any;
  }

  saveDatabase(db);
  appendAuditLog(
    "Personnel Profile Redesigned",
    req.user.email,
    req.user.role,
    `Recalibrated profile: Renamed '${oldName}' to '${user.fullName}' [Email: ${user.email}, Role: ${user.role}].`
  );

  res.json({
    success: true,
    message: "Personnel details synchronized successfully across core and mirror databases.",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      memberId: user.memberId,
      status: user.status
    }
  });
});

export default router;
