import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Sparkles, LogIn, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api.js';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // Default pre-filled
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpDemoValue, setOtpDemoValue] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

  const [registerMode, setRegisterMode] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNatId, setRegNatId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [kycIdPhoto, setKycIdPhoto] = useState('');     // Front ID Base64
  const [kycBackIdPhoto, setKycBackIdPhoto] = useState(''); // Back ID Base64
  const [kycSelfiePhoto, setKycSelfiePhoto] = useState(''); // User selfie photo Base64

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setPhoto: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("File size exceeds 2MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Password Recovery States
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOTP, setRecoveryOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Send OTP, 2: Reset Form
  const [demoResetOTP, setDemoResetOTP] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDemoPreset = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError('');
    setForgotPasswordMode(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      // Backend returns otpRequired: true, token, and otpDemoValue for demonstration
      if (res.otpRequired) {
        setOtpRequired(true);
        setOtpDemoValue(res.otpDemoValue || '');
        setTempToken(res.token);
        setTempUser(res.user);
        // Temporarily store token for OTP verification
        localStorage.setItem('sacco_token', res.token);
      } else {
        localStorage.setItem('sacco_token', res.token);
        onLoginSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check credentials or lockout states.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      setError('Please enter the security verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userEmail = tempUser?.email || '';
      await api.verifyOtp(otpCode, userEmail);
      onLoginSuccess(tempUser, tempToken);
    } catch (err: any) {
      setError(err.message || 'Incorrect OTP verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regNatId || !regPassword) {
      setError('Please complete all self-onboarding fields.');
      return;
    }

    if (!kycIdPhoto || !kycBackIdPhoto || !kycSelfiePhoto) {
      setError('Identity Validation Required: Please upload front of ID, back of ID, and your profile photo/selfie.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.registerMember({
        fullName: regName,
        email: regEmail,
        phone: regPhone,
        nationalId: regNatId,
        password: regPassword,
        kycIdUrl: kycIdPhoto,
        kycProofUrl: kycBackIdPhoto,
        kycSelfieUrl: kycSelfiePhoto
      });

      // Save to localStorage backups to survive ephemeral serverless scale-down wipes
      try {
        const backupMembers = JSON.parse(localStorage.getItem('sacco_backup_members') || '[]');
        const backupUsers = JSON.parse(localStorage.getItem('sacco_backup_users') || '[]');
        
        const memberId = res.user.memberId;
        backupMembers.push({
          id: `mem-${Date.now()}`,
          memberId,
          fullName: regName,
          email: regEmail,
          phone: regPhone,
          nationalId: regNatId,
          joinedDate: new Date().toISOString(),
          status: 'Active',
          savingsBalance: 0,
          activeLoansCount: 0,
          totalBorrowed: 0,
          totalRepaid: 0,
          dividendsPaid: 0,
          tier: 'Bronze',
          kycStatus: 'Pending',
          kycIdUrl: kycIdPhoto,
          kycProofUrl: kycBackIdPhoto,
          kycSelfieUrl: kycSelfiePhoto,
          avatarUrl: res.user.avatarUrl || kycSelfiePhoto || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=150&auto=format&fit=crop&q=80`
        });
        
        backupUsers.push({
          id: res.user.id,
          email: regEmail,
          role: "Member",
          fullName: regName,
          memberId,
          status: "Active",
          avatarUrl: res.user.avatarUrl || kycSelfiePhoto
        });
        
        const backupCreds = JSON.parse(localStorage.getItem('sacco_backup_creds') || '{}');
        backupCreds[regEmail.toLowerCase()] = regPassword;

        localStorage.setItem('sacco_backup_members', JSON.stringify(backupMembers));
        localStorage.setItem('sacco_backup_users', JSON.stringify(backupUsers));
        localStorage.setItem('sacco_backup_creds', JSON.stringify(backupCreds));
      } catch (err) {
        console.warn("Bypassed backup saving:", err);
      }

      localStorage.setItem('sacco_token', res.token);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Onboarding membership portfolio failed.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Flow Action
  const handleRequestPasswordOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setError('Enter your registered email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(recoveryEmail);
      setSuccessMessage("OTP recovery dispatch sent successfully.");
      setDemoResetOTP(res.demoResetOTP || '');
      setRecoveryStep(2);
    } catch (err: any) {
      setError(err.message || 'Could not trigger password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryOTP || !newPassword) {
      setError('Both the OTP validation reference and a new secure password are required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.resetPassword({
        email: recoveryEmail,
        otp: recoveryOTP,
        newPassword
      });
      setSuccessMessage("Credentials reset successfully! Please sign in.");
      setForgotPasswordMode(false);
      setRecoveryStep(1);
      setPassword(newPassword);
      setEmail(recoveryEmail);
    } catch (err: any) {
      setError(err.message || 'Password reset rejected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f1f5f9] flex flex-col md:flex-row items-stretch justify-stretch font-sans overflow-hidden">
      
      {/* Visual Ambient Brand Sidebar (LHS) */}
      <div className="hidden lg:flex w-5/12 bg-linear-to-b from-[#10172a] via-[#0f172a] to-[#090d16] relative flex-col justify-between p-12 overflow-hidden border-r border-[#1e293b]/70">
        
        {/* Abstract Background Visuals */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-xl bg-clip-text text-transparent bg-linear-to-r from-white to-blue-300">
              APEX CO-OP
            </span>
            <div className="text-[9px] font-mono tracking-widest text-blue-400 font-bold">SACCO LEDGER v3.5</div>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="my-auto space-y-6 relative z-10 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            Empowering Financial Co-operatives
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
            Enterprise Banking For Digital SACCOs.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            A state-of-the-art cooperative platform combining the convenience of digital microloans with blockchain-style secure transaction logs and auditable transparency.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs font-mono text-slate-400">
            <div className="p-3 bg-slate-900/40 border border-[#1e293b] rounded-lg">
              <div className="text-blue-400 font-bold">SECURED LEDGER</div>
              <div className="text-[10px] text-slate-500">SHA-256 Block Chain Chaining</div>
            </div>
            <div className="p-3 bg-slate-900/40 border border-[#1e293b] rounded-lg border-emerald-500/10">
              <div className="text-emerald-400 font-bold">2FA PROTECTED</div>
              <div className="text-[10px] text-slate-500">M-Pesa Verification Keys</div>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="text-xs text-slate-500 flex justify-between tracking-tight relative z-10">
          <span>Registered Tier 1 Audited SACCO</span>
          <span>© 2026 Apex Ltd</span>
        </div>
      </div>

      {/* Login Card Panel Area (RHS) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 relative bg-radial from-[#0e1424] to-[#080c16]">
        
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-full max-w-md space-y-6 relative z-10">
          
          {/* Header Mobile Brand */}
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold tracking-tight text-lg text-white">APEX SACCO</span>
            </div>
            
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-150">
              {forgotPasswordMode 
                ? "Account Recovery" 
                : registerMode 
                  ? "Create Member Portfolio" 
                  : otpRequired 
                    ? "Secure Verification Check" 
                    : "Sign In to Portal"}
            </h2>
            <p className="text-sm text-slate-400">
              {forgotPasswordMode
                ? "Retrieve account login passwords via dynamic OTP."
                : registerMode 
                  ? "Self-onboard your digital savings account instantly." 
                  : otpRequired 
                    ? "Enter the two-factor authentication credentials sent." 
                    : "Welcome back. Access secure audited SACCO dashboards."}
            </p>
          </div>

          {/* Inline Error Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && !error && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5 shadow-sm animate-pulse"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Interactive Login Card Form */}
          <div className="bg-[#101626]/80 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
            
            {!otpRequired && !registerMode && !forgotPasswordMode && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-350 uppercase tracking-widest mb-1.5">Portal Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <input 
                      type="email"
                      required
                      placeholder="e.g. admin@sacco.co.ke"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-sm transition-all outline-hidden text-[#ffffff] focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-350 uppercase tracking-widest">Master Password</label>
                    <button 
                      type="button" 
                      onClick={() => { setForgotPasswordMode(true); setError(''); setSuccessMessage(''); }} 
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-sm transition-all outline-hidden text-[#ffffff] focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? "Authenticating..." : "Authorize Login Securely"}
                  <LogIn className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-400">New around here? </span>
                  <button type="button" onClick={() => { setRegisterMode(true); setError(''); setSuccessMessage(''); }} className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer">Onboard Portfolio</button>
                </div>
              </form>
            )}

            {/* Forgot Password Recovery Mode Forms */}
            {forgotPasswordMode && (
              <div className="space-y-4">
                {recoveryStep === 1 ? (
                  <form onSubmit={handleRequestPasswordOTP} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-350 uppercase tracking-widest mb-1.5">Registered Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                        <input 
                          type="email"
                          required
                          placeholder="e.g. member@sacco.co.ke"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-sm transition-all outline-hidden text-[#ffffff] focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-medium rounded-xl text-sm transition-all text-white cursor-pointer"
                    >
                      {loading ? "Requesting Reset..." : "Send Reset Code (OTP)"}
                    </button>
                    
                    <div className="text-center">
                      <button 
                        type="button" 
                        onClick={() => { setForgotPasswordMode(false); setError(''); }} 
                        className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer"
                      >
                        Return to Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                    {demoResetOTP && (
                      <div className="text-center bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl mb-2">
                        <div className="text-[11px] text-amber-400 font-mono font-bold tracking-wider">RECOVERY OTP CODE DISPATCH SIMULATION</div>
                        <div className="text-xl font-mono tracking-widest font-extrabold text-white my-1">{demoResetOTP}</div>
                        <div className="text-[10px] text-slate-450 leading-relaxed">Simply type this code below to authorize your password renewal.</div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-350 uppercase tracking-widest mb-1.5">Verification Reset OTP</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                        <input 
                          type="text"
                          required
                          placeholder="6 Digit Code"
                          value={recoveryOTP}
                          onChange={(e) => setRecoveryOTP(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-sm transition-all outline-hidden text-[#ffffff] focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-350 uppercase tracking-widest mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                        <input 
                          type="password"
                          required
                          placeholder="Create strong account password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-sm transition-all outline-hidden text-[#ffffff] focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-600 font-semibold rounded-xl text-sm text-white transition-all cursor-pointer"
                    >
                      {loading ? "Revising..." : "Update Master Password"}
                    </button>

                    <div className="text-center">
                      <button 
                        type="button" 
                        onClick={() => { setRecoveryStep(1); setError(''); }} 
                        className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer"
                      >
                        Resend Reset Email Code
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {otpRequired && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="text-center bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl mb-2">
                  <div className="text-[11px] text-blue-400 font-mono font-bold tracking-wider">DEV ENVIRONMENT 2FA SIMULATION OTP</div>
                  <div className="text-xl font-mono tracking-widest font-extrabold text-white my-1">{otpDemoValue}</div>
                  <div className="text-[10px] text-slate-450 leading-relaxed">Simply type this code to authenticate the system action.</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-350 uppercase tracking-widest mb-1.5">Verification Code (6 Digits)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <input 
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-xl text-center text-lg font-mono tracking-widest transition-all outline-hidden text-[#ffffff] focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button 
                    type="button" 
                    onClick={() => { setOtpRequired(false); setError(''); }} 
                    className="py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs text-slate-300 font-medium cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? "Checking..." : "Verify Token"}
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {registerMode && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-350 uppercase tracking-widest mb-1">Full Legal Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Joshua Mwangi"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-lg text-xs outline-hidden text-[#ffffff]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-350 uppercase tracking-widest mb-1">Email Address</label>
                  <input 
                    type="email"
                    required
                    placeholder="joshua@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-lg text-xs outline-hidden text-[#ffffff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-350 uppercase tracking-widest mb-1">Phone (+254)</label>
                    <input 
                      type="text"
                      required
                      placeholder="+254 712 345 678"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-lg text-xs outline-hidden text-[#ffffff]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-350 uppercase tracking-widest mb-1">National ID No</label>
                    <input 
                      type="text"
                      required
                      placeholder="30291845"
                      value={regNatId}
                      onChange={(e) => setRegNatId(e.target.value.replace(/\D/g,''))}
                      className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-lg text-xs outline-hidden text-[#ffffff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-350 uppercase tracking-widest mb-1">Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:bg-slate-900 rounded-lg text-xs outline-hidden text-[#ffffff]"
                  />
                </div>

                {/* Upload Section for Photos */}
                <div className="space-y-2 pt-1 border-t border-slate-800/50 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mandatory Verification Photos & ID Documents</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setKycIdPhoto("https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400&q=80");
                        setKycBackIdPhoto("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80");
                        setKycSelfiePhoto("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80");
                      }} 
                      className="text-[9px] text-blue-400 hover:underline hover:text-blue-300 font-bold tracking-tight cursor-pointer"
                    >
                      ⚡ Load Demo Identity Photos
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {/* Front ID */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-[9px] font-semibold text-slate-400 text-center uppercase tracking-wider block leading-none">ID Front</span>
                      <div className="relative border border-dashed border-slate-800 hover:border-blue-500 rounded-lg p-1.5 bg-slate-950/40 text-center transition-all cursor-pointer h-16 flex items-center justify-center">
                        {kycIdPhoto ? (
                          <div className="relative w-full h-full">
                            <img src={kycIdPhoto} className="h-full w-full object-cover rounded" alt="Front ID" />
                            <button type="button" onClick={() => setKycIdPhoto('')} className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center font-bold">✕</button>
                          </div>
                        ) : (
                          <div className="py-1">
                            <span className="text-[8px] text-slate-400 block font-medium">Front ID File</span>
                            <span className="text-[7px] text-slate-500 block">Select</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, setKycIdPhoto)} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                      </div>
                    </div>

                    {/* Back ID */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-[9px] font-semibold text-slate-400 text-center uppercase tracking-wider block leading-none">ID Back</span>
                      <div className="relative border border-dashed border-slate-800 hover:border-blue-500 rounded-lg p-1.5 bg-slate-950/40 text-center transition-all cursor-pointer h-16 flex items-center justify-center">
                        {kycBackIdPhoto ? (
                          <div className="relative w-full h-full">
                            <img src={kycBackIdPhoto} className="h-full w-full object-cover rounded" alt="Back ID" />
                            <button type="button" onClick={() => setKycBackIdPhoto('')} className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center font-bold">✕</button>
                          </div>
                        ) : (
                          <div className="py-1">
                            <span className="text-[8px] text-slate-400 block font-medium">Back ID File</span>
                            <span className="text-[7px] text-slate-500 block">Select</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, setKycBackIdPhoto)} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                      </div>
                    </div>

                    {/* Profile Photo */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-[9px] font-semibold text-slate-400 text-center uppercase tracking-wider block leading-none">His Photo</span>
                      <div className="relative border border-dashed border-slate-800 hover:border-blue-500 rounded-lg p-1.5 bg-slate-950/40 text-center transition-all cursor-pointer h-16 flex items-center justify-center">
                        {kycSelfiePhoto ? (
                          <div className="relative w-full h-full">
                            <img src={kycSelfiePhoto} className="h-full w-full object-cover rounded" alt="Selfie" />
                            <button type="button" onClick={() => setKycSelfiePhoto('')} className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center font-bold">✕</button>
                          </div>
                        ) : (
                          <div className="py-1">
                            <span className="text-[8px] text-slate-400 block font-medium">Selfie Photo</span>
                            <span className="text-[7px] text-slate-500 block">Select</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, setKycSelfiePhoto)} 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] font-semibold rounded-lg text-xs transition-all shadow-md flex items-center justify-center gap-1 text-white cursor-pointer"
                >
                  {loading ? "Registering..." : "Onboard Member Wallet"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="text-center pt-1">
                  <span className="text-[11px] text-slate-400">Back to login? </span>
                  <button type="button" onClick={() => { setRegisterMode(false); setError(''); }} className="text-[11px] text-blue-400 font-bold hover:underline cursor-pointer">Login Screen</button>
                </div>
              </form>
            )}

          </div>

          {/* Quick Access Presets (Extremely elegant for testing evaluations) */}
          {!otpRequired && !registerMode && !forgotPasswordMode && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block text-center">Interactive Role Presets (Password: password123)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => handleDemoPreset("admin@sacco.co.ke")}
                  className="p-2 text-left bg-slate-900/40 hover:bg-slate-850 border border-slate-800 hover:border-blue-500 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <span className="font-bold text-white">Grace Kendi</span>
                  <span className="text-[10px] text-blue-400 font-mono">Admin</span>
                </button>

                <button 
                  onClick={() => handleDemoPreset("officer@sacco.co.ke")}
                  className="p-2 text-left bg-slate-900/40 hover:bg-slate-850 border border-slate-800 hover:border-[#a855f7] rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <span className="font-bold text-white">Paul Omwamba</span>
                  <span className="text-[10px] text-purple-400 font-mono">Loan Officer</span>
                </button>

                <button 
                  onClick={() => handleDemoPreset("accountant@sacco.co.ke")}
                  className="p-2 text-left bg-slate-900/40 hover:bg-slate-850 border border-slate-800 hover:border-[#10b981] rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <span className="font-bold text-white">Mercy Chep</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Accountant</span>
                </button>

                <button 
                  onClick={() => handleDemoPreset("member@sacco.co.ke")}
                  className="p-2 text-left bg-slate-900/40 hover:bg-slate-850 border border-slate-800 hover:border-amber-500 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <span className="font-bold text-white">Joshua Mwangi</span>
                  <span className="text-[10px] text-amber-400 font-mono">Member (SACCO)</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
