import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  ShieldAlert, 
  Activity, 
  Mail, 
  Phone, 
  Settings, 
  UserCheck, 
  CheckCircle, 
  AlertTriangle, 
  Coins, 
  BadgeCheck, 
  FileCheck2,
  ChevronRight,
  TrendingDown,
  X
} from 'lucide-react';
import { Member, UserRole } from '../types';

interface MembersViewProps {
  members: Member[];
  onAddMember: (payload: any) => Promise<void>;
  onUpdateMember: (memberId: string, payload: any) => Promise<void>;
  role: UserRole;
  currentUserMemberId?: string;
}

export default function MembersView({ members, onAddMember, onUpdateMember, role, currentUserMemberId }: MembersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Controls for registration modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [natId, setNatId] = useState('');
  const [initialSavings, setInitialSavings] = useState('2000');
  const [tier, setTier] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [formError, setFormError] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  // Filter members list based on queries
  const filteredMembers = members.filter(m => {
    // If the currently registered user is a standard Member, restrict view if policy demands, 
    // or let them browse other co-members but restrict mutation. Standard Branch/Tala dashboard allows member detail browsing.
    const matchesSearch = m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'All' ? true : m.tier === filterTier;
    const matchesStatus = filterStatus === 'All' ? true : m.status === filterStatus;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !natId) {
      setFormError('Please fill out all required attributes.');
      return;
    }
    setFormError('');
    setSavingForm(true);

    try {
      await onAddMember({
        fullName: name,
        email,
        phone,
        nationalId: natId,
        initialSavings,
        tier
      });
      setShowAddModal(false);
      // Reset State
      setName('');
      setEmail('');
      setPhone('');
      setNatId('');
      setInitialSavings('2000');
    } catch (err: any) {
      setFormError(err.message || 'Onboarding failed.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleStatusToggle = async (member: Member) => {
    const nextStatus = member.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await onUpdateMember(member.memberId, { status: nextStatus });
      // Update local drawer state if visible
      setSelectedMember({ ...member, status: nextStatus });
    } catch (err: any) {
      alert(err.message || 'Error updating policy');
    }
  };

  const handleTierAdjust = async (member: Member, nextTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum') => {
    try {
      await onUpdateMember(member.memberId, { tier: nextTier });
      setSelectedMember({ ...member, tier: nextTier });
    } catch (err: any) {
      alert(err.message || 'Error setting tier');
    }
  };

  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  const isAccessDeniedForMutate = role === 'Member';

  return (
    <div className="space-y-6 relative">
      
      {/* Top action and filter bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#111726]/60 p-4 rounded-xl border border-slate-800/60 shadow-lg">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
          <input 
            type="text" 
            placeholder="Search active, suspended, gold, plat, bronze..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800 focus:border-blue-500 rounded-xl text-xs transition-all outline-hidden text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-200">
          <span className="text-slate-400">Class Rank:</span>
          <select 
            value={filterTier} 
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-blue-500 text-slate-200"
          >
            <option value="All">All Tiers</option>
            <option value="Bronze">Bronze Tier</option>
            <option value="Silver">Silver Tier</option>
            <option value="Gold">Gold Tier</option>
            <option value="Platinum">Platinum Tier</option>
          </select>

          <span className="text-slate-400">Ledger Index:</span>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-blue-500 text-slate-200"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active Accounts</option>
            <option value="Suspended">Suspended</option>
          </select>

          {!isAccessDeniedForMutate && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid display layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <div 
            key={member.id} 
            onClick={() => setSelectedMember(member)}
            className={`cursor-pointer transition-all border p-4.5 rounded-2xl flex flex-col justify-between h-48 hover:shadow-xl hover:-translate-y-1 ${
              selectedMember?.memberId === member.memberId 
                ? 'bg-[#101b33] border-blue-500/60 shadow-lg shadow-blue-500/5' 
                : 'bg-[#111726]/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Top row */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img 
                  src={member.avatarUrl} 
                  alt={member.fullName} 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full bg-slate-800 shrink-0 border border-slate-700/80"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-none mb-1">{member.fullName}</h4>
                  <span className="text-[10px] font-mono font-bold text-slate-450 uppercase">{member.memberId}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[9px] ${
                  member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                }`}>
                  {member.status}
                </span>
                <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] font-semibold ${
                  member.tier === 'Platinum' ? 'bg-[#9333ea]/15 text-[#a855f7]' :
                  member.tier === 'Gold' ? 'bg-amber-500/15 text-amber-500' :
                  member.tier === 'Silver' ? 'bg-blue-500/15 text-blue-400' :
                  'bg-slate-500/15 text-slate-400'
                }`}>
                  {member.tier}
                </span>
              </div>
            </div>

            {/* Balances details */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/40">
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-bold block mb-0.5">Total Savings</span>
                <span className="text-xs font-bold font-mono text-white">{formatKES(member.savingsBalance)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-bold block mb-0.5">Active Loans</span>
                <span className="text-xs font-bold font-mono text-white text-indigo-400">
                  {member.activeLoansCount > 0 ? `${member.activeLoansCount} Active` : 'None'}
                </span>
              </div>
            </div>

            {/* Bottom meta */}
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-2">
              <span>National ID: {member.nationalId}</span>
              <span className="flex items-center gap-0.5 text-blue-400 font-semibold hover:underline">
                <span>Core Profile</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Slide Drawer detail of Selected Member */}
      {selectedMember && (
        <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-[#0b0e17] border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300">
          <div className="space-y-6">
            
            {/* Header drawer */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedMember.avatarUrl} 
                  alt={selectedMember.fullName} 
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full border border-slate-700 shrink-0" 
                />
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedMember.fullName}</h3>
                  <span className="text-[10px] text-blue-400 font-mono font-bold tracking-wider">{selectedMember.memberId}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info cards */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 space-y-3.5 text-xs text-slate-350">
              <div className="text-[10px] font-mono text-blue-400 tracking-wider font-bold uppercase pb-1 border-b border-slate-800/40">Portfolio Parameters</div>
              <div className="flex justify-between">
                <span>Personal Email:</span>
                <span className="text-white font-semibold truncate leading-none">{selectedMember.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone Account:</span>
                <span className="text-white font-mono font-semibold">{selectedMember.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>National Identification:</span>
                <span className="text-white font-mono font-semibold">{selectedMember.nationalId}</span>
              </div>
              <div className="flex justify-between">
                <span>Onboarding Timestamp:</span>
                <span className="text-white font-mono">{new Date(selectedMember.joinedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Security Status:</span>
                <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                  selectedMember.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                }`}>{selectedMember.status}</span>
              </div>
            </div>

            {/* SACCO balances summary */}
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Reserves Pool</span>
                <div className="text-sm font-extrabold text-white mt-1">{formatKES(selectedMember.savingsBalance)}</div>
              </div>
              <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Dividends Claimed</span>
                <div className="text-sm font-extrabold text-purple-400 mt-1">{formatKES(selectedMember.dividendsPaid)}</div>
              </div>
            </div>

            {/* Borrow history */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 text-xs space-y-3">
              <div className="text-[10px] font-mono text-blue-400 tracking-wider font-bold uppercase pb-1 border-b border-slate-800/40">Credit Agreement index</div>
              <div className="flex justify-between text-slate-400">
                <span>Total Ever Borrowed:</span>
                <span className="text-white font-bold">{formatKES(selectedMember.totalBorrowed)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Ever Repaid:</span>
                <span className="text-white font-bold">{formatKES(selectedMember.totalRepaid)}</span>
              </div>
              <div className="flex justify-between text-slate-450 uppercase font-bold text-[9px] pt-1">
                <span>Status Lock:</span>
                <span className={selectedMember.activeLoansCount > 0 ? 'text-amber-500 font-semibold' : 'text-emerald-400'}>
                  {selectedMember.activeLoansCount > 0 ? `${selectedMember.activeLoansCount} Active loan contracts` : 'Debt-Free clean record'}
                </span>
              </div>
            </div>

            {/* Admin Policy Actions panel */}
            {!isAccessDeniedForMutate && (
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Policy Supervision actions</div>
                
                {/* Suspension Toggle */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-405 font-bold">M-Pesa Ledger Locker</span>
                  <button 
                    onClick={() => handleStatusToggle(selectedMember)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer transition-all active:scale-[0.98] ${
                      selectedMember.status === 'Active' 
                        ? 'bg-rose-500/10 text-rose-450 hover:bg-rose-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {selectedMember.status === 'Active' ? 'Lock/Suspend' : 'Unlock/Activate'}
                  </button>
                </div>

                {/* Rank adjust */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/40 text-xs">
                  <div className="text-[10px] font-mono text-slate-450">Change Member Portfolio Tier Rank</div>
                  <div className="flex gap-1.5">
                    {(['Bronze', 'Silver', 'Gold', 'Platinum'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleTierAdjust(selectedMember, t)}
                        className={`flex-1 py-1 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                          selectedMember.tier === t 
                            ? 'bg-blue-600/25 border-blue-500 text-blue-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-450 hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

          <button 
            onClick={() => setSelectedMember(null)}
            className="w-full py-2 bg-slate-900 hover:bg-slate-850 mt-4 border border-slate-800 rounded-xl text-xs text-slate-400 font-semibold cursor-pointer"
          >
            Collapse Drawer
          </button>
        </div>
      )}

      {/* Onboarding Dialog/Modal (RHS/Centered) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#000000]/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#101626] border border-slate-850 w-full max-w-lg p-6 rounded-2xl shadow-2xl relative space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>Onboard Audited SACCO Member Portfolio</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Legal Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Tabitha Kamau"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Email address</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="tabitha@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Phone Number (+254)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="+254 722 987 654"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">National ID Document</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="28301984"
                    value={natId}
                    onChange={(e) => setNatId(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Initial Regular Deposit (KES)</label>
                  <input 
                    type="number" 
                    placeholder="2000"
                    value={initialSavings}
                    onChange={(e) => setInitialSavings(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Tier Allocation</label>
                  <select 
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-slate-200"
                  >
                    <option value="Bronze">Bronze Tier</option>
                    <option value="Silver">Silver Tier</option>
                    <option value="Gold">Gold Tier</option>
                    <option value="Platinum">Platinum Tier</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-3 justify-end font-semibold">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl cursor-pointer"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  disabled={savingForm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white cursor-pointer"
                >
                  {savingForm ? "Onboarding to blockchain..." : "Authorize Portfolio Creation"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
