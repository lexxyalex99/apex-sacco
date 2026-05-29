import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Percent, 
  Users, 
  Smartphone, 
  CheckCircle, 
  ShieldAlert, 
  Save, 
  Info,
  Scale,
  Edit3,
  X,
  Check,
  Shield,
  Loader2,
  Lock,
  Camera,
  Upload,
  User as UserIcon,
  Eye,
  FileText,
  AlertTriangle,
  FolderOpen,
  UserCheck
} from 'lucide-react';
import { SACCOSettings, User, Member } from '../types';
import { api } from '../services/api.js';

interface SettingsViewProps {
  settings: SACCOSettings;
  onUpdateSettings: (payload: Partial<SACCOSettings>) => Promise<any>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
  onUpdateCurrentUserProfile: (name: string, avatarUrl?: string) => void;
}

export default function SettingsView({ 
  settings, 
  onUpdateSettings, 
  theme, 
  setTheme,
  currentUser,
  onRefreshData,
  onUpdateCurrentUserProfile
}: SettingsViewProps) {
  const [saccoName, setSaccoName] = useState(settings.saccoName);
  const [savingsRate, setSavingsRate] = useState(settings.baseInterestRateSavings.toString());
  const [loanRate, setLoanRate] = useState(settings.baseInterestRateLoans.toString());
  const [loanMultiplier, setLoanMultiplier] = useState(settings.maxLoanMultiplier.toString());
  const [minGuarantors, setMinGuarantors] = useState(settings.minGuarantorsRequired.toString());
  const [mpesaShortcode, setMpesaShortcode] = useState(settings.mpesaShortcode);
  const [mpesaCallbackUrl, setMpesaCallbackUrl] = useState(settings.mpesaCallbackUrl);
  const [regFee, setRegFee] = useState(settings.registrationFee.toString());
  const [penaltyRate, setPenaltyRate] = useState(settings.penaltyOverdueRate.toString());

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Personnel & Directory list state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingRole, setEditingRole] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // --- OWN PERSONAL PROFILE PIC & DECORATIVE AVATAR STATE ---
  const [isEditingProfilePic, setIsEditingProfilePic] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [savingAvatar, setSavingAvatar] = useState(false);

  // --- OWN KYC DOCUMENT STATE ---
  const [ownKyc, setOwnKyc] = useState<{
    status: 'Unverified' | 'Pending' | 'Approved' | 'Rejected';
    nationalId: string;
    idUrl: string | null;
    selfieUrl: string | null;
    proofUrl: string | null;
    comments: string | null;
  } | null>(null);
  const [loadingOwnKyc, setLoadingOwnKyc] = useState(false);

  // Form states for KYC submission
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycNationalId, setKycNationalId] = useState('');
  const [kycIdFrontUrl, setKycIdFrontUrl] = useState('');
  const [kycIdBackUrl, setKycIdBackUrl] = useState('');
  const [kycSelfieUrl, setKycSelfieUrl] = useState('');
  const [kycFormSuccess, setKycFormSuccess] = useState('');
  const [kycFormError, setKycFormError] = useState('');

  // Dropzone drag-state simulators
  const [draggingFront, setDraggingFront] = useState(false);
  const [draggingBack, setDraggingBack] = useState(false);
  const [draggingSelfie, setDraggingSelfie] = useState(false);

  // --- COMPLIANCE REVIEW DESK FOR STAFF members ---
  const [membersListData, setMembersListData] = useState<Member[]>([]);
  const [loadingKycMembers, setLoadingKycMembers] = useState(false);
  const [selectedReviewMember, setSelectedReviewMember] = useState<Member | null>(null);
  const [reviewVerdict, setReviewVerdict] = useState<'Approve' | 'Reject'>('Approve');
  const [reviewComment, setReviewComment] = useState('');
  const [processingReview, setProcessingReview] = useState(false);
  const [reviewResponseSuccess, setReviewResponseSuccess] = useState('');
  const [reviewResponseError, setReviewResponseError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchOwnKycStatus();
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Loan Officer') {
      fetchMembersKycData();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error("Failed to load staff accounts:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOwnKycStatus = async () => {
    setLoadingOwnKyc(true);
    try {
      const data = await api.getKycStatus();
      setOwnKyc(data);
      if (data.nationalId) {
        setKycNationalId(data.nationalId);
      }
      if (data.idUrl) {
        setKycIdFrontUrl(data.idUrl);
      }
      if (data.selfieUrl) {
        setKycSelfieUrl(data.selfieUrl);
      }
    } catch (err: any) {
      console.error("Failed to retrieve personal KYC compliance state:", err);
    } finally {
      setLoadingOwnKyc(false);
    }
  };

  const fetchMembersKycData = async () => {
    setLoadingKycMembers(true);
    try {
      const members = await api.getMembers();
      setMembersListData(members);
    } catch (err: any) {
      console.error("Failed to fetch organization compliance ledger", err);
    } finally {
      setLoadingKycMembers(false);
    }
  };

  const handleStartEditing = (u: User) => {
    setEditingUserId(u.id);
    setEditingName(u.fullName);
    setEditingEmail(u.email);
    setEditingRole(u.role);
    setActionSuccess('');
    setActionError('');
  };

  const handleSaveUserDetail = async (userId: string) => {
    if (!editingName.trim()) {
      setActionError("Error: Name cannot be blank.");
      return;
    }
    setActionError('');
    setActionSuccess('');
    setSavingUser(true);
    try {
      await api.updateUserProfile(userId, {
        fullName: editingName,
        email: editingEmail,
        role: editingRole
      });
      
      setActionSuccess(`Account for '${editingName}' was successfully saved and updated across databases.`);
      setEditingUserId(null);

      // Trigger hot syncing if edited user is the current active session user
      if (currentUser && currentUser.id === userId) {
        onUpdateCurrentUserProfile(editingName, undefined);
      }

      // Re-trigger global app sync
      await fetchUsers();
      await onRefreshData();
    } catch (err: any) {
      setActionError(err.message || "Failed to update directory info.");
    } finally {
      setSavingUser(false);
    }
  };

  const AVATAR_PRESETS = [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", // Female
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", // Male
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", // Female
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", // Male
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", // Female
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"  // Male
  ];

  const handleSaveAvatarUrl = async (urlToSave: string) => {
    if (!currentUser) return;
    setSavingAvatar(true);
    setActionError('');
    setActionSuccess('');
    try {
      await api.updateUserProfile(currentUser.id, {
        avatarUrl: urlToSave
      });
      onUpdateCurrentUserProfile(currentUser.fullName, urlToSave);
      setActionSuccess("Your premium profile picture has been synchronized across all databases.");
      setIsEditingProfilePic(false);
      await fetchUsers();
      await onRefreshData();
    } catch (err: any) {
      setActionError(err.message || "Failed to update profile picture.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycFormError('');
    setKycFormSuccess('');

    if (!kycNationalId.trim()) {
      setKycFormError("Please enter your valid National ID number.");
      return;
    }
    if (!kycIdFrontUrl) {
      setKycFormError("Please select or simulate uploading your ID card front face.");
      return;
    }

    setSubmittingKyc(true);
    try {
      await api.submitKyc({
        nationalId: kycNationalId,
        idUrl: kycIdFrontUrl,
        selfieUrl: kycSelfieUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        proofUrl: kycIdBackUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80"
      });
      setKycFormSuccess("KYC documentation successfully submitted for manual audit. Your compliance status is now pending review.");
      await fetchOwnKycStatus();
      if (currentUser?.role === 'Admin' || currentUser?.role === 'Loan Officer') {
        await fetchMembersKycData();
      }
    } catch (err: any) {
      setKycFormError(err.message || "Failed to submit KYC credentials.");
    } finally {
      setSubmittingKyc(false);
    }
  };

  const handleSimulateFileUpload = (type: 'front' | 'back' | 'selfie') => {
    // Standard mock documents curated beautifully
    const mocks = {
      front: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=450&auto=format&fit=crop&q=80",
      back: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=450&auto=format&fit=crop&q=80",
      selfie: currentUser?.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=350&auto=format&fit=crop&q=80"
    };

    if (type === 'front') setKycIdFrontUrl(mocks.front);
    else if (type === 'back') setKycIdBackUrl(mocks.back);
    else if (type === 'selfie') setKycSelfieUrl(mocks.selfie);
  };

  const handleProcessKycReview = async (memberId: string) => {
    setReviewResponseError('');
    setReviewResponseSuccess('');
    setProcessingReview(true);
    try {
      await api.approveRejectKyc({
        memberId,
        action: reviewVerdict,
        comment: reviewComment || `Reviewed by ${currentUser?.fullName} at Compliance Desk`
      });

      setReviewResponseSuccess(`Compliance verification processed successfully. member is marked as ${reviewVerdict === 'Approve' ? 'Approved' : 'Rejected'}.`);
      setReviewComment('');
      setSelectedReviewMember(null);
      await fetchMembersKycData();
      await onRefreshData();
    } catch (err: any) {
      setReviewResponseError(err.message || "Could not record compliance judgment.");
    } finally {
      setProcessingReview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setErrorMsg('');
    setLoading(true);

    try {
      await onUpdateSettings({
        saccoName,
        baseInterestRateSavings: parseFloat(savingsRate),
        baseInterestRateLoans: parseFloat(loanRate),
        maxLoanMultiplier: parseFloat(loanMultiplier),
        minGuarantorsRequired: parseInt(minGuarantors),
        mpesaShortcode,
        mpesaCallbackUrl,
        registrationFee: parseFloat(regFee),
        penaltyOverdueRate: parseFloat(penaltyRate)
      });
      setSuccess('SACCO administrative rules and policy settings updated on core ledger databases.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Settings update rejected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto text-xs text-slate-300 font-sans space-y-6">
      
      {/* Alert panels */}
      {success && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main configuration form */}
      <form onSubmit={handleSubmit} className="bg-[#111726]/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        
        {/* Section 1 */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Primary Organization Particulars</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">SACCO Registered Brand Name</label>
              <input 
                type="text" 
                required 
                value={saccoName} 
                onChange={(e) => setSaccoName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Onboarding Registration Payment (KES)</label>
              <input 
                type="number" 
                required 
                value={regFee} 
                onChange={(e) => setRegFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-800 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Yield Ratings & Policy limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Savings APY Yield Rating (%)</label>
              <input 
                type="number" 
                step="0.1"
                required 
                value={savingsRate} 
                onChange={(e) => setSavingsRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Base Loan Interest / Month (%)</label>
              <input 
                type="number" 
                step="0.05"
                required 
                value={loanRate} 
                onChange={(e) => setLoanRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Late Installment Penalty Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                required 
                value={penaltyRate} 
                onChange={(e) => setPenaltyRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Max Loan Factor Multiplier</label>
              <select 
                value={loanMultiplier} 
                onChange={(e) => setLoanMultiplier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500"
              >
                <option value="2">2x (Double of portfolio Active Savings)</option>
                <option value="3">3x (Triple base savings capacity limit)</option>
                <option value="4">4x (Aggressive expansion threshold)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Policy Min Guarantor Count Quota</label>
              <select 
                value={minGuarantors} 
                onChange={(e) => setMinGuarantors(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500"
              >
                <option value="1">1 Peer guarantor check</option>
                <option value="2">2 Peer guarantors (policy baseline)</option>
                <option value="3">3 Peer guarantors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-800 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Corporate M-Pesa Integration Parameters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Mobile Paybill/Till Shortcode</label>
              <input 
                type="text" 
                required 
                value={mpesaShortcode} 
                onChange={(e) => setMpesaShortcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Immediate API webhook Callback URL</label>
              <input 
                type="url" 
                required 
                value={mpesaCallbackUrl} 
                onChange={(e) => setMpesaCallbackUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Visual System Theme Preference */}
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Visual Interface Theme Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Workspace Appearance Mode</label>
              <select 
                value={theme} 
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-hidden focus:border-blue-500"
              >
                <option value="dark">Immersive Deep Dark Theme (Default)</option>
                <option value="light">Crisp High-Contrast Light Theme</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer info warning */}
        <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-450 leading-relaxed">
            Note: All adjustments here are evaluated immediately on active backend servers and are securely logged inside our chained auditable ledger with a corresponding cryptographic block.
          </p>
        </div>

        {/* Actions row */}
        <div className="pt-3 flex justify-end">
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white shadow-lg active:scale-[0.99] transition-all cursor-pointer flex items-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Updating parameters..." : "Authorize Rule Changes"}</span>
          </button>
        </div>

      </form>

      {/* SECTION B: SYSTEM PERSONNEL CREDENTIALS & ROLE-BASED PROFILES MANAGER */}
      <div className="bg-[#111726]/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#3b82f6]" />
            <div>
              <h3 className="font-bold text-white text-[11px] uppercase tracking-wider">SACCO Organization Staff Directory</h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Edit, rename, or adapt account credentials and corporate roles.</p>
            </div>
          </div>
          {loadingUsers && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
        </div>

        {actionSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px]">{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[11px]">{actionError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {users.map((u) => {
            const isEditing = editingUserId === u.id;
            const isMe = currentUser?.id === u.id;
            const hasPrivilege = currentUser?.role === 'Admin' || isMe;

            return (
              <div 
                key={u.id} 
                className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl transition-all duration-200 hover:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* User avatar & identification description details */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={u.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`} 
                      alt="" 
                      className="w-10 h-10 rounded-full border border-slate-800 shrink-0 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isMe && (
                      <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded-full border border-[#0f172a] uppercase tracking-wider scale-90">ME</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Full Name</label>
                          <input 
                            type="text" 
                            className="bg-slate-950 px-2.5 py-1 text-xs border border-slate-800 rounded-lg text-white"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email Address</label>
                          <input 
                            type="email" 
                            className="bg-slate-950 px-2.5 py-1 text-xs border border-slate-800 rounded-lg text-white font-mono"
                            value={editingEmail}
                            onChange={(e) => setEditingEmail(e.target.value)}
                            required
                          />
                        </div>
                        {currentUser?.role === 'Admin' && !isMe ? (
                          <div>
                            <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">System Assigned Role</label>
                            <select 
                              className="bg-slate-950 px-2.5 py-1 text-xs border border-slate-800 rounded-lg text-white"
                              value={editingRole}
                              onChange={(e) => setEditingRole(e.target.value)}
                            >
                              <option value="Admin">Admin (Full administrative scope)</option>
                              <option value="Loan Officer">Loan Officer (Credit approvals)</option>
                              <option value="Accountant">Accountant (Financial auditor)</option>
                              <option value="Member">Member (Client portfolio)</option>
                            </select>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{u.fullName}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider font-mono ${
                            u.role === 'Admin' ? 'bg-red-500/10 text-rose-400 border border-red-500/20' :
                            u.role === 'Loan Officer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            u.role === 'Accountant' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-700/20 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-450 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{u.email}</span>
                          {u.memberId && <span className="text-blue-500/80">• Portfolio ID: {u.memberId}</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Direct Action control buttons */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={() => handleSaveUserDetail(u.id)}
                        disabled={savingUser}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all text-[10px] cursor-pointer"
                      >
                        {savingUser ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save Change</span>
                      </button>
                      <button 
                        onClick={() => setEditingUserId(null)}
                        disabled={savingUser}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold flex items-center gap-1.5 transition-all text-[10px] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    hasPrivilege && (
                      <button 
                        onClick={() => handleStartEditing(u)}
                        className="py-1.5 px-3.5 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-350 rounded-lg flex items-center gap-2 transition-all text-[9px] font-bold uppercase tracking-wider cursor-pointer font-mono"
                      >
                        <Edit3 className="w-3 h-3 text-blue-400" />
                        <span>Rename Profile</span>
                      </button>
                    )
                  )}

                  {!hasPrivilege && (
                    <span className="text-[9px] text-slate-500 font-mono italic flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Administrative Lock</span>
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION C: MY PRIVATE PORTFOLIO & CORE KYC COMPLIANCE HUB */}
      <div className="bg-[#111726]/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-[11px] uppercase tracking-wider">My Profile & Compliance Documentation</h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Manage your active profile picture and verify government-issued ID documents.</p>
            </div>
          </div>
          {loadingOwnKyc && <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />}
        </div>

        {/* 1. Profile Picture Management */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative group">
              <img 
                src={currentUser?.avatarUrl || `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80`} 
                alt="" 
                className="w-16 h-16 rounded-full border-2 border-slate-850 object-cover shrink-0"
              />
              <button 
                onClick={() => setIsEditingProfilePic(!isEditingProfilePic)}
                className="absolute bottom-0 right-0 p-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full border border-[#0f172a] shadow transition-transform cursor-pointer"
                title="Change picture"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1 text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <h4 className="font-bold text-white text-sm">{currentUser?.fullName}</h4>
                <span className="px-2 py-0.5 bg-slate-800/60 rounded-full font-mono text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{currentUser?.role}</span>
              </div>
              <p className="text-[10px] text-slate-450 font-mono">{currentUser?.email}</p>
              {currentUser?.memberId && (
                <p className="text-[10px] text-blue-400/90 font-semibold font-mono">SACCO Registered Account: {currentUser.memberId}</p>
              )}
            </div>
          </div>

          {isEditingProfilePic && (
            <div className="pt-3 border-t border-slate-800/60 space-y-3">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Select visually polished premium avatar presets</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomAvatarUrl(p);
                        handleSaveAvatarUrl(p);
                      }}
                      disabled={savingAvatar}
                      className="relative rounded-full overflow-hidden border border-slate-800 hover:border-blue-500 focus:border-blue-500 cursor-pointer active:scale-95 transition-all w-10 h-10 mx-auto group"
                    >
                      <img src={p} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Or submit custom personal photo URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/your-custom-profile-url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="flex-1 bg-slate-950 px-3 py-1.5 text-xs border border-slate-800 rounded-lg text-white font-mono"
                  />
                  <button
                    onClick={() => handleSaveAvatarUrl(customAvatarUrl)}
                    disabled={savingAvatar || !customAvatarUrl.trim()}
                    className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {savingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Apply Link</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. KYC Submission Panel */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/60 border border-slate-805 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] font-mono">KYC Verification State</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-wider border font-mono ${
                ownKyc?.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                ownKyc?.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                ownKyc?.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                'bg-slate-850 text-slate-400 border-slate-800'
              }`}>
                {ownKyc?.status || 'Unverified'}
              </span>
            </div>

            {ownKyc?.status === 'Approved' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px]">System Authenticated Portfolio</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Your identity documentation has been thoroughly audited and approved by the co-operative compliance desk. Your high-limit credit applications are active.</p>
                </div>
              </div>
            )}

            {ownKyc?.status === 'Rejected' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px]">Verification Issue Flagged</p>
                  <p className="text-[10px] text-rose-300">Feedback: {ownKyc.comments || "Some documents were found illegible or invalid. Please inspect and re-submit front and back photos."}</p>
                </div>
              </div>
            )}

            {ownKyc?.status === 'Pending' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px]">Auditing Queued</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Your uploaded ID Front, ID Back and Live Selfie are awaiting evaluation. This typical compliance review is completed within business hours.</p>
                </div>
              </div>
            )}

            {/* Submit KYC Form (Visible when Unverified or Rejected) */}
            {(ownKyc?.status === 'Unverified' || ownKyc?.status === 'Rejected') && (
              <form onSubmit={handleKycSubmit} className="space-y-4 pt-2">
                {kycFormSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px]">{kycFormSuccess}</span>
                  </div>
                )}

                {kycFormError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[11px]">{kycFormError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Government National Identification Number (ID / Registration No.)</label>
                    <input 
                      type="text" 
                      placeholder="E.g., 34509122"
                      required
                      value={kycNationalId}
                      onChange={(e) => setKycNationalId(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 text-xs border border-slate-850 rounded-xl text-white font-mono"
                    />
                  </div>

                  {/* 3 drag-and-drop document cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    
                    {/* Front ID upload card */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDraggingFront(true); }}
                      onDragLeave={() => setDraggingFront(false)}
                      onDrop={(e) => { e.preventDefault(); setDraggingFront(false); handleSimulateFileUpload('front'); }}
                      className={`p-4 rounded-xl border border-dashed transition-all flex flex-col items-center text-center justify-between gap-3 ${
                        draggingFront ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold uppercase tracking-wider text-[8px] text-slate-450 font-mono">1. ID Card Front Face</span>
                      {kycIdFrontUrl ? (
                        <div className="relative w-full h-20 rounded-lg overflow-hidden border border-slate-800 group">
                          <img src={kycIdFrontUrl} alt="ID Front Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setKycIdFrontUrl('')}
                            className="absolute -top-1 -right-1 p-1 bg-red-600 rounded-full text-white cursor-pointer hover:bg-red-500 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-2 flex flex-col items-center gap-1.5">
                          <FileText className="w-6 h-6 text-slate-500" />
                          <p className="text-[9px] text-slate-450 leading-relaxed">Drop ID front file here, or select option below</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSimulateFileUpload('front')}
                        className="py-1 px-3 bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-blue-400 inline-block mr-1" />
                        Simulate Upload
                      </button>
                    </div>

                    {/* Back ID upload card */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDraggingBack(true); }}
                      onDragLeave={() => setDraggingBack(false)}
                      onDrop={(e) => { e.preventDefault(); setDraggingBack(false); handleSimulateFileUpload('back'); }}
                      className={`p-4 rounded-xl border border-dashed transition-all flex flex-col items-center text-center justify-between gap-3 ${
                        draggingBack ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold uppercase tracking-wider text-[8px] text-slate-450 font-mono">2. ID Card Back Face</span>
                      {kycIdBackUrl ? (
                        <div className="relative w-full h-20 rounded-lg overflow-hidden border border-slate-800 group">
                          <img src={kycIdBackUrl} alt="ID Back Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setKycIdBackUrl('')}
                            className="absolute -top-1 -right-1 p-1 bg-red-600 rounded-full text-white cursor-pointer hover:bg-red-500 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-2 flex flex-col items-center gap-1.5">
                          <FileText className="w-6 h-6 text-slate-500" />
                          <p className="text-[9px] text-slate-450 leading-relaxed">Drop ID back file here, or select option below</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSimulateFileUpload('back')}
                        className="py-1 px-3 bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-emerald-400 inline-block mr-1" />
                        Simulate Upload
                      </button>
                    </div>

                    {/* Selfie Live Capture card */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDraggingSelfie(true); }}
                      onDragLeave={() => setDraggingSelfie(false)}
                      onDrop={(e) => { e.preventDefault(); setDraggingSelfie(false); handleSimulateFileUpload('selfie'); }}
                      className={`p-4 rounded-xl border border-dashed transition-all flex flex-col items-center text-center justify-between gap-3 ${
                        draggingSelfie ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold uppercase tracking-wider text-[8px] text-slate-450 font-mono">3. Live Selfie Portrait</span>
                      {kycSelfieUrl ? (
                        <div className="relative w-full h-20 rounded-lg overflow-hidden border border-slate-800 group">
                          <img src={kycSelfieUrl} alt="Selfie Portrait Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setKycSelfieUrl('')}
                            className="absolute -top-1 -right-1 p-1 bg-red-600 rounded-full text-white cursor-pointer hover:bg-red-500 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-2 flex flex-col items-center gap-1.5">
                          <Eye className="w-6 h-6 text-slate-500" />
                          <p className="text-[9px] text-slate-450 leading-relaxed">Drop camera portrait selfie photo frame here</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSimulateFileUpload('selfie')}
                        className="py-1 px-3 bg-slate-900 border border-slate-800 hover:text-white rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider cursor-pointer"
                      >
                        <Camera className="w-3 h-3 text-rose-400 inline-block mr-1" />
                        Capture Selfie
                      </button>
                    </div>

                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingKyc}
                    className="px-5 py-2 bg-[#10b981] hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider shadow-md transition-transform flex items-center gap-1.5 cursor-pointer"
                  >
                    {submittingKyc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Lodging Audit documents...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Publish Compliance KYC Dossier</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>

      {/* SECTION D: CORPORATE COMPLIANCE REVIEW DESK (Admins and Loan Officers Only) */}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Loan Officer') && (
        <div className="bg-[#111726]/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <FolderOpen className="w-4 h-4 text-rose-500" />
              <div>
                <h3 className="font-bold text-white text-[11px] uppercase tracking-wider">KYC Compliance Review Desk</h3>
                <p className="text-[10px] text-slate-450 mt-0.5">Evaluate member ID documents, visual identity profile photos, and grant credit clearance.</p>
              </div>
            </div>
            {loadingKycMembers && <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin shrink-0" />}
          </div>

          {reviewResponseSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px]">{reviewResponseSuccess}</span>
            </div>
          )}

          {reviewResponseError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[11px]">{reviewResponseError}</span>
            </div>
          )}

          <div className="space-y-4">
            <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Select a Member Portfolio to inspect</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {membersListData.map((member) => {
                const mAny = member as any;
                const status = mAny.kycStatus || 'Unverified';

                return (
                  <button
                    key={member.memberId}
                    type="button"
                    onClick={() => {
                      setSelectedReviewMember(member);
                      // Default values to simulate review
                      setReviewVerdict('Approve');
                      setReviewComment('');
                      setReviewResponseSuccess('');
                      setReviewResponseError('');
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedReviewMember?.memberId === member.memberId
                        ? 'border-blue-500 bg-blue-600/5'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={member.avatarUrl || `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80`} 
                        alt="" 
                        className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                      />
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-[11px]">{member.fullName}</p>
                        <p className="text-[9px] text-slate-450 font-mono italic">{member.memberId} • National ID: {member.nationalId || 'N/A'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase font-mono tracking-wider ${
                      status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      status === 'Rejected' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active inspection terminal card */}
            {selectedReviewMember && (
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white uppercase text-[10px] tracking-wider">Evaluating Dossier: {selectedReviewMember.fullName}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedReviewMember(null)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3 side-by-side documents viewer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ID Front view */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">Government ID Front Face</span>
                    <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden h-28 relative group">
                      <img 
                        src={(selectedReviewMember as any).kycIdUrl || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=450&auto=format&fit=crop&q=80"} 
                        alt="ID Front" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[8px] text-center py-1 font-mono text-slate-400">ID FRONT CARD</div>
                    </div>
                  </div>

                  {/* ID Back view */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">Government ID Back Face</span>
                    <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden h-28 relative group">
                      <img 
                        src={(selectedReviewMember as any).kycProofUrl || "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=450&auto=format&fit=crop&q=80"} 
                        alt="ID Back" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[8px] text-center py-1 font-mono text-slate-400">ID BACK CARD</div>
                    </div>
                  </div>

                  {/* Face Selfie Portrait view */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">Facial Portrait Selfie</span>
                    <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden h-28 relative group">
                      <img 
                        src={(selectedReviewMember as any).kycSelfieUrl || selectedReviewMember.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=350&auto=format&fit=crop&q=80"} 
                        alt="Face Portrait" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[8px] text-center py-1 font-mono text-slate-400">LIVE SELFIE CONFIRMATION</div>
                    </div>
                  </div>
                </div>

                {/* Verdict Controls */}
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Select Security Verdict</label>
                      <select
                        value={reviewVerdict}
                        onChange={(e) => setReviewVerdict(e.target.value as 'Approve' | 'Reject')}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Approve">Approve Documents (Verify Portfolio)</option>
                        <option value="Reject">Reject Documents (Request Re-upload)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Assigned KYC National ID</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={selectedReviewMember.nationalId || 'Not uploaded'}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Review Comments & Feedback Instructions</label>
                    <textarea
                      placeholder="Write exact instructions here, e.g., 'ID is clearly visible. Approved.' or 'Back photo is blurry, please take a high resolution photo.'"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-sans"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleProcessKycReview(selectedReviewMember.memberId)}
                      disabled={processingReview}
                      className={`px-4 py-2 font-bold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer text-white flex items-center gap-1 shadow-md ${
                        reviewVerdict === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      {processingReview ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Commit Compliance Verdict</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
