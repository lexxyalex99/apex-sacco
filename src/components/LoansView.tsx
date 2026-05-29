import React, { useState } from 'react';
import { 
  FileBadge, 
  HelpCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  UserCheck, 
  Sparkles, 
  TrendingUp, 
  HandCoins, 
  PlusCircle, 
  Activity, 
  CheckCircle,
  X,
  CreditCard
} from 'lucide-react';
import { Loan, Member, UserRole } from '../types';

interface LoansViewProps {
  loans: Loan[];
  members: Member[];
  onApplyLoan: (payload: any) => Promise<any>;
  onApproveRejectLoan: (loanId: string, action: 'Approve' | 'Reject') => Promise<void>;
  role: UserRole;
  currentUserMemberId?: string;
  onNavigateToTab: (tabId: string) => void;
  onPostRepayment: (payload: { loanId: string; amount: number; paymentMethod: string }) => Promise<any>;
}

export default function LoansView({
  loans,
  members,
  onApplyLoan,
  onApproveRejectLoan,
  role,
  currentUserMemberId,
  onNavigateToTab,
  onPostRepayment
}: LoansViewProps) {
  
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('6');
  const [purpose, setPurpose] = useState('');
  const [guarantor1, setGuarantor1] = useState('');
  const [guarantor2, setGuarantor2] = useState('');
  
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Repayment form states for direct quick payback from selected loan drawer
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'M-Pesa' | 'Bank Transfer' | 'Card' | 'SACCO Balance'>('M-Pesa');
  const [repaySuccess, setRepaySuccess] = useState('');
  const [repayError, setRepayError] = useState('');

  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please specify a positive numeric loan balance.');
      return;
    }

    if (!purpose) {
      setFormError('Please describe the purpose of this commercial credit agreement.');
      return;
    }

    const guarantorsArray = [guarantor1, guarantor2].filter(g => g.length > 0);

    setLoading(true);

    try {
      await onApplyLoan({
        amount: parsedAmount,
        tenureMonths: parseInt(tenure),
        purpose,
        guarantors: guarantorsArray
      });
      setSuccessMsg('Your credit request has been submitted successfully to our Automated Risk Underwriting module.');
      setShowApplyModal(false);
      // Reset
      setAmount('');
      setPurpose('');
      setGuarantor1('');
      setGuarantor2('');
    } catch (err: any) {
      setFormError(err.message || 'Verification rejected this application.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (loanId: string, action: 'Approve' | 'Reject') => {
    setFormError('');
    setActionLoading(true);

    try {
      await onApproveRejectLoan(loanId, action);
      setSelectedLoan(null);
    } catch (err: any) {
      setFormError(err.message || 'Verification policy error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickPayback = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepayError('');
    setRepaySuccess('');

    if (!selectedLoan) return;
    const payAmount = parseFloat(repayAmount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setRepayError('Please define a valid payback payment installment.');
      return;
    }

    setLoading(true);

    try {
      const res = await onPostRepayment({
        loanId: selectedLoan.loanId,
        amount: payAmount,
        paymentMethod: repayMethod
      });
      setRepaySuccess(`Repayment received successfully! Loan outstanding reduced.`);
      setRepayAmount('');
      
      // Update selected loan local state
      setSelectedLoan(res.loan);
    } catch (err: any) {
      setRepayError(err.message || 'Error processing payback');
    } finally {
      setLoading(false);
    }
  };

  const isStaff = role === 'Admin' || role === 'Loan Officer';

  return (
    <div className="space-y-6 relative text-xs">
      
      {/* Visual Stats Overview rows */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#111726]/60 p-5 rounded-2xl border border-slate-800/65 shadow-md">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">Financial Credit Portfolios dashboard</h4>
          <p className="text-[11px] text-slate-400">Manage risk factors, peer guarantees, and amortization schedule matrices.</p>
        </div>
        {role === 'Member' && (
          <button 
            onClick={() => { setShowApplyModal(true); setFormError(''); setSuccessMsg(''); }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/10 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply For Loan Credit</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main timeline listing (grid format) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loans.map((loan) => {
          // Progress of payment indicator
          const repaidAmount = loan.amount - loan.outstandingBalance;
          const ratio = Math.min(100, Math.round((repaidAmount / loan.amount) * 100));
          
          return (
            <div 
              key={loan.id}
              onClick={() => { setSelectedLoan(loan); setRepaySuccess(''); setRepayError(''); }}
              className={`cursor-pointer transition-all border p-4.5 rounded-2xl flex flex-col justify-between h-56 hover:shadow-xl hover:-translate-y-1 ${
                selectedLoan?.loanId === loan.loanId
                  ? 'bg-[#101b33] border-blue-500 shadow-md shadow-blue-500/5'
                  : 'bg-[#111726]/80 border-slate-800 hover:border-slate-705'
              }`}
            >
              {/* Header metadata row */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">{loan.loanId}</span>
                  <h4 className="text-sm font-extrabold text-white leading-none mt-1">{loan.purpose}</h4>
                  <p className="text-[10px] text-slate-450 mt-1">Applicant: {loan.memberName}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-sm font-bold text-[9px] font-mono tracking-wide ${
                  loan.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  loan.status === 'Pending' ? 'bg-blue-500/10 text-blue-400' :
                  loan.status === 'Overdue' ? 'bg-rose-500/10 text-rose-450 animate-pulse' :
                  loan.status === 'Fully Paid' ? 'bg-slate-700/20 text-slate-400' :
                  'bg-rose-500/10 text-rose-450'
                }`}>{loan.status}</span>
              </div>

              {/* Progress visual indicators */}
              {loan.status !== 'Pending' && loan.status !== 'Rejected' && (
                <div className="space-y-1.5 my-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Payback progress</span>
                    <span>{ratio}% ({formatKES(repaidAmount)} paid)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        loan.status === 'Overdue' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${ratio}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Primary values stats */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/40">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Agreement Principal</span>
                  <span className="text-xs font-bold font-mono text-white">{formatKES(loan.amount)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Installment Due</span>
                  <span className="text-xs font-bold font-mono text-indigo-400">{formatKES(loan.monthlyInstallment)} / mo</span>
                </div>
              </div>

              {/* Bottom footer bar */}
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono pt-2 mt-2 border-t border-slate-800/20">
                <span>Risk rating: <span className={`font-bold ${
                  loan.riskScore === 'Low' ? 'text-emerald-400' :
                  loan.riskScore === 'Medium' ? 'text-amber-500' :
                  'text-rose-500'
                }`}>{loan.riskScore}</span></span>
                <span className="text-blue-400 hover:underline font-semibold">Verify schedule →</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Side Amortization schedule detailed drawer */}
      {selectedLoan && (
        <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-[#0b0e17] border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300">
          <div className="space-y-5">
            
            {/* Header */}
            <div className="flex justify-between items-start pb-2 border-b border-slate-800/40">
              <div>
                <span className="text-[9px] font-mono font-bold text-blue-400 uppercase">Agreement index details</span>
                <h3 className="text-sm font-bold text-white mt-1">{selectedLoan.purpose}</h3>
                <span className="text-[10px] text-slate-450 font-mono italic">{selectedLoan.loanId}</span>
              </div>
              <button 
                onClick={() => setSelectedLoan(null)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer hover:border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Micro details panel */}
            <div className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2.5 text-xs text-slate-350">
              <div className="flex justify-between">
                <span>Principal Borrowed Amount:</span>
                <span className="text-white font-mono font-bold">{formatKES(selectedLoan.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Balance Balance:</span>
                <span className="text-white font-mono font-bold text-amber-400">{formatKES(selectedLoan.outstandingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly rate premium:</span>
                <span className="text-white font-mono">{selectedLoan.interestRate || '1.2'}% per month</span>
              </div>
              <div className="flex justify-between">
                <span>Tenure Duration:</span>
                <span className="text-white font-bold">{selectedLoan.tenureMonths} Months repayment agreement</span>
              </div>
              <div className="flex justify-between">
                <span>Security guarantors list:</span>
                <span className="text-white font-semibold font-mono">{selectedLoan.guarantors.join(', ') || 'No Guarantors required'}</span>
              </div>
            </div>

            {/* Verification status warnings */}
            <div className="p-3.5 bg-[#121927] border border-blue-500/10 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5">
                {selectedLoan.riskScore === 'Low' ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
                <span className="font-bold text-white">Algorithmic Underwriting risks</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">{selectedLoan.riskReason}</p>
            </div>

            {/* Officer controllers */}
            {selectedLoan.status === 'Pending' && isStaff && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Administrative Credit decision vetting</span>
                <div className="flex gap-2.5">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApproveReject(selectedLoan.loanId, 'Reject')}
                    className="flex-1 py-2 border border-slate-700 text-rose-450 font-bold rounded-lg cursor-pointer hover:bg-rose-500/5 transition-all text-xs"
                  >
                    Reject Loan
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApproveReject(selectedLoan.loanId, 'Approve')}
                    className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer hover:bg-emerald-500 transition-all text-xs"
                  >
                    Authorize Disbursement
                  </button>
                </div>
              </div>
            )}

            {/* Repayment Installment Schedule */}
            {selectedLoan.status !== 'Pending' && selectedLoan.status !== 'Rejected' && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-widest font-mono">Prospective Amortization timeline</span>
                
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {selectedLoan.repaymentSchedule && selectedLoan.repaymentSchedule.length > 0 ? (
                    selectedLoan.repaymentSchedule.map((inst) => (
                      <div key={inst.installmentNumber} className="flex justify-between items-center p-2.5 bg-slate-900/40 rounded-xl border border-slate-850 hover:bg-slate-900/80 transition-colors">
                        <div>
                          <div className="text-[11px] font-bold font-mono">Installment #{inst.installmentNumber}</div>
                          <span className="text-[9px] text-slate-500 font-mono">Due: {new Date(inst.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-mono text-white font-bold block">{formatKES(inst.amountDue)}</span>
                          <span className={`text-[8px] font-bold font-mono ${
                            inst.status === 'Paid' ? 'text-emerald-400' :
                            inst.status === 'Overdue' ? 'text-rose-400' :
                            'text-slate-400'
                          }`}>{inst.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 italic text-[11px] py-4">Timeline was cleared or not initialized.</div>
                  )}
                </div>

                {/* Quick repayment module inside detailed view! */}
                {selectedLoan.status !== 'Fully Paid' && (
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5 mt-3">
                    <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider block font-mono">Quick Repay Payback console</span>
                    
                    {repaySuccess && <p className="text-[10px] text-emerald-400 font-bold">{repaySuccess}</p>}
                    {repayError && <p className="text-[10px] text-rose-400 font-bold">{repayError}</p>}
                    
                    <form onSubmit={handleQuickPayback} className="flex gap-2">
                      <input 
                        type="number"
                        placeholder="Repay Amount (KES)"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs outline-hidden text-white font-mono"
                      />
                      <button 
                        type="submit"
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs text-white font-bold cursor-pointer"
                      >
                        Pay
                      </button>
                    </form>
                  </div>
                )}

              </div>
            )}

          </div>

          <button 
            onClick={() => setSelectedLoan(null)}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-400 font-semibold cursor-pointer"
          >
            Collapse Drawer
          </button>
        </div>
      )}

      {/* Credit application popup Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#101626] border border-slate-850 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <HandCoins className="w-5 h-5 text-blue-400" />
                <span>Request SME Loan Capital portfolio</span>
              </h3>
              <button 
                onClick={() => setShowApplyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-4">
              
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Requested Borrow Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">KES</span>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl outline-hidden text-white font-mono"
                  />
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Rule checklist: Maximum requested borrow cannot exceed 3x your total active savings portfolio reserves.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Repayment Tenure (Months)</label>
                  <select 
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl outline-hidden text-slate-200"
                  >
                    <option value="3">3 Months tenure</option>
                    <option value="6">6 Months tenure (standard)</option>
                    <option value="12">12 Months (year scale)</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Monthly Rate APY</label>
                  <div className="w-full px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-400 select-none">
                    1.2% Interest rate
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Primary Commercial Credit Purpose</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Agricultural drip feed farming purchase"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl outline-hidden text-white font-medium"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                <span className="block text-[9px] text-slate-450 uppercase font-extrabold tracking-widest font-mono">Onboard co-guarantor references (Policy requires 2)</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={guarantor1} 
                    onChange={(e) => setGuarantor1(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-200"
                  >
                    <option value="">-- Guarantor #1 --</option>
                    {members.filter(m => m.memberId !== currentUserMemberId).map(m => (
                      <option key={m.memberId} value={m.memberId}>{m.fullName} ({m.memberId})</option>
                    ))}
                  </select>
                  <select 
                    value={guarantor2} 
                    onChange={(e) => setGuarantor2(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-200"
                  >
                    <option value="">-- Guarantor #2 --</option>
                    {members.filter(m => m.memberId !== currentUserMemberId && m.memberId !== guarantor1).map(m => (
                      <option key={m.memberId} value={m.memberId}>{m.fullName} ({m.memberId})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-3 justify-end font-semibold">
                <button 
                  type="button" 
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-900 text-slate-400 rounded-xl hover:bg-slate-850 cursor-pointer"
                >
                  Discard App
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white cursor-pointer"
                >
                  {loading ? "Vetting details..." : "Authorize request"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
