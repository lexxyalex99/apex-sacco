import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loadDatabase, saveDatabase, appendAuditLog } from '../db';
import { authenticateToken, requireRoles } from '../middlewares/security';
import { Member, Transaction } from '../../src/types';

const router = Router();

// GET /api/members
router.get('/', authenticateToken, (req: any, res: Response) => {
  const db = loadDatabase();
  res.json(db.members);
});

// GET /api/members/:memberId
router.get('/:memberId', authenticateToken, (req: any, res: Response) => {
  const { memberId } = req.params;
  const db = loadDatabase();
  const member = db.members.find(m => m.memberId === memberId);
  if (!member) {
    res.status(404).json({ error: `Member portfolio with reference ${memberId} is not registered.` });
    return;
  }
  res.json(member);
});

// POST /api/members Onboard fresh member administratively
router.post('/', authenticateToken, requireRoles(['Admin', 'Loan Officer', 'Accountant']), (req: any, res: Response) => {
  const { fullName, email, phone, nationalId, initialSavings, tier } = req.body;
  
  if (!fullName || !email || !phone || !nationalId) {
    res.status(400).json({ error: "Missing required profile parameters. Required: fullName, email, phone, nationalId" });
    return;
  }

  const db = loadDatabase();
  const emailLower = email.toLowerCase();
  
  const exists = db.members.some(m => m.email.toLowerCase() === emailLower || m.nationalId === nationalId);
  if (exists) {
    res.status(400).json({ error: "A member with this exact email or National ID already exists in the system database." });
    return;
  }

  const memberId = `SACCO-${1000 + db.members.length + 1}`;
  const memberDbId = `mem-${Date.now()}`;
  const userDbId = `usr-${Date.now()}`;
  
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync("password123", salt); // standard first default credential

  const newMember: Member = {
    id: memberDbId,
    memberId,
    fullName,
    email,
    phone,
    nationalId,
    joinedDate: new Date().toISOString(),
    status: 'Active',
    savingsBalance: parseFloat(initialSavings || 0),
    activeLoansCount: 0,
    totalBorrowed: 0,
    totalRepaid: 0,
    dividendsPaid: 0,
    tier: tier || 'Bronze',
    avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=150&auto=format&fit=crop&q=80`
  };

  db.members.push(newMember);
  db.users.push({
    id: userDbId,
    email,
    role: "Member",
    fullName,
    memberId,
    status: "Active",
    passwordHash,
    avatarUrl: newMember.avatarUrl
  });

  if (parseFloat(initialSavings) > 0) {
    const reference = `TXN-REG-${Math.floor(10000000 + Math.random() * 89999999)}`;
    const depositDeposit: Transaction = {
      id: `tx-init-${Date.now()}`,
      reference,
      memberId,
      memberName: fullName,
      type: "Deposit",
      amount: parseFloat(initialSavings),
      paymentMethod: "Bank Transfer",
      fee: 0,
      timestamp: new Date().toISOString(),
      status: "Completed",
      description: "Initial savings credit during administrative onboarding"
    };
    db.transactions.push(depositDeposit);
  }

  saveDatabase(db);
  appendAuditLog("Administrative Onboard Member", req.user.email, req.user.role, `Registered profile for ${fullName} with ${initialSavings || 0} KES first saving deposit.`);

  res.status(201).json(newMember);
});

// PUT /api/members/:memberId
router.put('/:memberId', authenticateToken, requireRoles(['Admin', 'Loan Officer', 'Accountant']), (req: any, res: Response) => {
  const { memberId } = req.params;
  const { fullName, phone, nationalId, tier, status } = req.body;

  const db = loadDatabase();
  const member = db.members.find(m => m.memberId === memberId);
  const user = db.users.find(u => u.memberId === memberId);

  if (!member) {
    res.status(404).json({ error: `Member with assignment ID ${memberId} is not in databases.` });
    return;
  }

  if (fullName) member.fullName = fullName;
  if (phone) member.phone = phone;
  if (nationalId) member.nationalId = nationalId;
  if (tier) member.tier = tier;
  if (status) {
    member.status = status;
    if (user) user.status = status;
  }

  saveDatabase(db);
  appendAuditLog("Update Member Details", req.user.email, req.user.role, `Recalibrated member profile records: ${member.fullName} (${memberId}). State: ${member.status}`);

  res.json(member);
});

export default router;
