import React, { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  Upload, 
  Sparkles, 
  Phone, 
  Mail, 
  Fingerprint, 
  CheckCircle, 
  AlertTriangle, 
  Coins, 
  ArrowUpRight,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { Member, UserRole, Transaction } from '../types';

interface ProfileViewProps {
  currentUser: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    memberId?: string;
    avatarUrl?: string;
    status: string;
  };
  currentUserMember: Member | null;
  onUpdateCurrentUserProfile: (name: string, avatar?: string) => Promise<void>;
  onUpdateMember: (memberId: string, payload: any) => Promise<void>;
  recentTransactions: Transaction[];
}

export default function ProfileView({
  currentUser,
  currentUserMember,
  onUpdateCurrentUserProfile,
  onUpdateMember,
  recentTransactions
}: ProfileViewProps) {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  
  // KYC files inside Profile update state
  const [kycIdUrl, setKycIdUrl] = useState(currentUserMember?.kycIdUrl || '');
  const [kycProofUrl, setKycProofUrl] = useState(currentUserMember?.kycProofUrl || '');
  const [kycSelfieUrl, setKycSelfieUrl] = useState(currentUserMember?.kycSelfieUrl || '');
  
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  // 1. Check Monthly Contribution Compliance as per Agreement
  // Tier parameters mapping:
  const tierAgreements = {
    Bronze: 1000,
    Silver: 2500,
    Gold: 5000,
    Platinum: 10000
  };

  const memberTier = currentUserMember?.tier || 'Bronze';
  const agreedMonthlyContribution = tierAgreements[memberTier];

  // Calculate actual deposits made in the current calendar month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthDeposits = recentTransactions
    .filter(t => {
      const tDate = new Date(t.timestamp);
      return t.memberId === currentUserMember?.memberId &&
             t.type === 'Deposit' &&
             t.status === 'Completed' &&
             tDate.getMonth() === currentMonth &&
             tDate.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const contributionPercentage = Math.min(100, Math.round((currentMonthDeposits / agreedMonthlyContribution) * 100));
  const metAgreement = currentMonthDeposits >= agreedMonthlyContribution;

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setSuccess('');
    setError('');

    try {
      // Step A: Update basic auth profile (name / main avatar)
      await onUpdateCurrentUserProfile(fullName, avatarUrl || kycSelfieUrl);

      // Step B: Update member profile if member account is linked
      if (currentUserMember) {
        const payload: any = {
          fullName,
          kycIdUrl,
          kycProofUrl,
          kycSelfieUrl,
          avatarUrl: avatarUrl || kycSelfieUrl
        };
        
        // If they uploaded documents, queue KYC status as Pending if it was Unverified or Rejected
        if (currentUserMember.kycStatus === 'Unverified' || currentUserMember.kycStatus === 'Rejected') {
          payload.kycStatus = 'Pending';
        }

        await onUpdateMember(currentUserMember.memberId, payload);
      }

      setSuccess("Profile safeguards and verification files updated successfully!");
    } catch (err: any) {
      setError(err.message || 'Verification update failed.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#111726]/60 p-4.5 rounded-2xl border border-slate-800/60 shadow-lg">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            <Fingerprint className="w-5 h-5 text-blue-400" />
            <span>My Security & Member Profile</span>
          </h2>
          <p className="text-[11px] text-slate-400">Update legal identities, photograph files, and examine monthly agreement parameters.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-850">
          <span className="text-[10px] font-mono pr-2 text-slate-400 border-r border-slate-800 uppercase font-bold leading-none">Security Level:</span>
          <span className="text-[10px] text-blue-400 font-bold font-mono tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            AES-256 PORTAL LOCK
          </span>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 shadow-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Side Info & Agreements */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Avatar Card */}
          <div className="bg-[#111726]/70 border border-slate-800 p-6 rounded-2xl text-center space-y-4">
            <div className="relative mx-auto w-24 h-24 rounded-full border-2 border-blue-500/30 overflow-hidden flex items-center justify-center bg-slate-950 shadow-inner">
              {avatarUrl || kycSelfieUrl ? (
                <img src={avatarUrl || kycSelfieUrl} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-12 h-12 text-slate-500" />
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-white truncate">{currentUser.fullName}</h3>
              <span className="text-[10px] font-mono text-blue-400 font-bold tracking-wider block mt-1 uppercase">{currentUser.role}</span>
              {currentUserMember && (
                <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold mt-0.5 block">{currentUserMember.memberId}</span>
              )}
            </div>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 border-t-2 border-t-indigo-500/40 text-left space-y-2 text-[11px] font-mono text-slate-400 leading-snug">
              <div className="flex justify-between">
                <span>Account Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{currentUser.status}</span>
              </div>
              {currentUserMember && (
                <>
                  <div className="flex justify-between">
                    <span>Rank Tier:</span>
                    <span className="text-purple-400 font-bold">{memberTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KYC Audit:</span>
                    <span className={`font-bold ${
                      currentUserMember.kycStatus === 'Approved' ? 'text-emerald-400' :
                      currentUserMember.kycStatus === 'Rejected' ? 'text-rose-450' : 'text-amber-400 animate-pulse'
                    }`}>{currentUserMember.kycStatus || 'Pending'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Monthly Savings Contribution Agreement Compliance */}
          {currentUserMember && (
            <div className="bg-[#111726]/70 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h4 className="text-[11px] font-mono tracking-widest text-[#94a3b8] font-bold uppercase flex items-center gap-1.5 border-b border-slate-850 pb-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Contribution Agreement</span>
              </h4>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Monthly Agreement:</span>
                  <span className="text-white font-mono font-bold">{formatKES(agreedMonthlyContribution)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Deposits (This Month):</span>
                  <span className="text-emerald-400 font-mono font-bold">{formatKES(currentMonthDeposits)}</span>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-350 ${
                        metAgreement ? 'bg-linear-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-linear-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${contributionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{contributionPercentage}% Target</span>
                    <span>{formatKES(currentMonthDeposits)} / {formatKES(agreedMonthlyContribution)}</span>
                  </div>
                </div>

                {/* Directive Status Lock */}
                <div className={`p-3 rounded-lg border text-[11px] font-medium leading-relaxed ${
                  metAgreement 
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/5 border-amber-500/10 text-amber-400'
                }`}>
                  {metAgreement ? (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                      <span><strong>Agreement Met:</strong> Thank you! You are contributing fully as per your {memberTier} Tier Sacco Agreement.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                      <span><strong>Contribution Deficit:</strong> Under your agreement, you require an additional <strong>{formatKES(agreedMonthlyContribution - currentMonthDeposits)}</strong> regular deposit before end of month.</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Right Column: Update Forms & Identification Uploads */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSaveProfile} className="bg-[#111726]/70 border border-slate-800 p-6 rounded-2xl space-y-5 text-xs">
            <h4 className="text-[11px] font-mono tracking-widest text-[#94a3b8] font-bold uppercase pb-2 border-b border-slate-850 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Identity safeguards profile form</span>
            </h4>

            {/* Legal Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Full Legal Name (Audited)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Legal Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-xs outline-hidden text-white focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-405 uppercase font-bold">Email Address</label>
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-900/50 border border-slate-850/60 rounded-xl text-slate-400 text-xs font-mono select-none">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-405 uppercase font-bold">Linked Registered Phone Line</label>
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-900/50 border border-slate-850/60 rounded-xl text-slate-400 text-xs font-mono select-none">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">{currentUserMember?.phone || 'No Linked Phone No'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-405 uppercase font-bold">Selfie Photo URL override (Optional)</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-xs outline-hidden text-white focus:border-blue-500"
                />
              </div>
            </div>

            {/* Document upload segment */}
            <div className="space-y-3 pt-3 border-t border-slate-850">
              <div className="flex justify-between items-center pb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Identity and Portrait uploads</span>
                <button 
                  type="button" 
                  onClick={() => {
                    setKycIdUrl("https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400&q=80");
                    setKycProofUrl("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80");
                    setKycSelfieUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80");
                  }} 
                  className="text-[9px] text-blue-400 hover:underline hover:text-blue-300 font-bold tracking-tight cursor-pointer"
                >
                  ⚡ Dynamic Demo Photos
                </button>
              </div>

              <p className="text-[10px] text-slate-500 leading-normal max-w-lg">
                To guarantee M-Pesa KYC alignment and regulatory approval, please enter or upload high definition scans of your Front ID, Back ID, and a personal selfie photo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                {/* ID Front */}
                <div className="space-y-1.5 text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block text-left mb-1">ID Card Front</span>
                  <div className="relative border border-dashed border-slate-800 hover:border-blue-500 bg-slate-950/40 rounded-xl h-24 flex items-center justify-center p-2 cursor-pointer transition-all">
                    {kycIdUrl ? (
                      <div className="relative w-full h-full">
                        <img src={kycIdUrl} className="w-full h-full object-cover rounded-lg" alt="ID Front" />
                        <button type="button" onClick={() => setKycIdUrl('')} className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 border border-slate-800 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold shadow-md">✕</button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500 flex flex-col items-center">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span className="text-[8px] font-semibold font-mono uppercase">Upload File</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setKycIdUrl)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* ID Back */}
                <div className="space-y-1.5 text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block text-left mb-1">ID Card Back</span>
                  <div className="relative border border-dashed border-slate-800 hover:border-blue-500 bg-slate-950/40 rounded-xl h-24 flex items-center justify-center p-2 cursor-pointer transition-all">
                    {kycProofUrl ? (
                      <div className="relative w-full h-full">
                        <img src={kycProofUrl} className="w-full h-full object-cover rounded-lg" alt="ID Back" />
                        <button type="button" onClick={() => setKycProofUrl('')} className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 border border-slate-800 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold shadow-md">✕</button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500 flex flex-col items-center">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span className="text-[8px] font-semibold font-mono uppercase">Upload File</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setKycProofUrl)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* Selfie Photo */}
                <div className="space-y-1.5 text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block text-left mb-1">His Selfie Photo</span>
                  <div className="relative border border-dashed border-slate-800 hover:border-blue-500 bg-slate-950/40 rounded-xl h-24 flex items-center justify-center p-2 cursor-pointer transition-all">
                    {kycSelfieUrl ? (
                      <div className="relative w-full h-full">
                        <img src={kycSelfieUrl} className="w-full h-full object-cover rounded-lg" alt="Selfie" />
                        <button type="button" onClick={() => setKycSelfieUrl('')} className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 border border-slate-800 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold shadow-md">✕</button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500 flex flex-col items-center">
                        <ImageIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-[8px] font-semibold font-mono uppercase">Upload Selfie</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setKycSelfieUrl)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

              </div>
            </div>

            <button 
              type="submit"
              disabled={updating}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] rounded-xl text-center font-bold text-xs text-white transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {updating ? "Processing Updates..." : "Sync Safeguards & Profile Pictures"}
              <ArrowUpRight className="w-4 h-4" />
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}
