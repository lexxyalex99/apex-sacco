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
  Lock
} from 'lucide-react';
import { SACCOSettings, User } from '../types';
import { api } from '../services/api.js';

interface SettingsViewProps {
  settings: SACCOSettings;
  onUpdateSettings: (payload: Partial<SACCOSettings>) => Promise<any>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
  onUpdateCurrentUserFullName: (name: string) => void;
}

export default function SettingsView({ 
  settings, 
  onUpdateSettings, 
  theme, 
  setTheme,
  currentUser,
  onRefreshData,
  onUpdateCurrentUserFullName
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

  useEffect(() => {
    fetchUsers();
  }, []);

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
        onUpdateCurrentUserFullName(editingName);
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

    </div>
  );
}
