import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Smartphone, 
  CreditCard, 
  Building, 
  Wallet, 
  ShieldAlert, 
  FileDown, 
  PlusCircle, 
  MinusCircle,
  HelpCircle,
  QrCode
} from 'lucide-react';
import { Member, Transaction, UserRole } from '../types';

interface SavingsViewProps {
  currentUserMember: Member | null;
  allMembers: Member[];
  onExecuteTransaction: (payload: {
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    paymentMethod: string;
    targetMemberId?: string;
  }) => Promise<any>;
  recentTransactions: Transaction[];
  role: UserRole;
}

export default function SavingsView({ 
  currentUserMember, 
  allMembers, 
  onExecuteTransaction, 
  recentTransactions,
  role 
}: SavingsViewProps) {
  
  const [transactionType, setTransactionType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'M-Pesa' | 'Bank Transfer' | 'Card'>('M-Pesa');
  
  // Dynamic target member selection for administrative operators, standard members default to their own portfolios
  const [targetMemberId, setTargetMemberId] = useState(currentUserMember?.memberId || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUserMember?.phone || '+254 712 345 678');
  
  React.useEffect(() => {
    if (currentUserMember) {
      setTargetMemberId(currentUserMember.memberId);
      setPhoneNumber(currentUserMember.phone);
    }
  }, [currentUserMember]);
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Find active focus member profile based on context
  const activeFocus = role === 'Member' 
    ? currentUserMember 
    : allMembers.find(m => m.memberId === targetMemberId);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please specify a positive decimal transaction amount.');
      return;
    }

    setLoading(true);

    try {
      const res = await onExecuteTransaction({
        type: transactionType,
        amount: parsedAmount,
        paymentMethod,
        targetMemberId: role === 'Member' ? undefined : targetMemberId
      });
      setSuccessMsg(`Transaction completed successfully! Reference: ${res.transaction.reference}. Balance updated.`);
      setAmount('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Savings transaction execution failed.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic dynamic downloading of JSON/CSV statement files
  const handleExportStatement = () => {
    if (!activeFocus) return;
    
    const filteredTxns = recentTransactions.filter(t => t.memberId === activeFocus.memberId);
    
    // Create custom string statement content
    const header = `=========================================\n       APEX CO-OPERATIVE SACCO\n       OFFICIAL STATEMENT OF ACCOUNT\n=========================================\n`;
    const memberDetails = `MEMBER ID: ${activeFocus.memberId}\nNAME: ${activeFocus.fullName}\nSTATUS: ${activeFocus.status}\nTIER RANKING: ${activeFocus.tier}\nCURRENT SAVINGS: ${activeFocus.savingsBalance} KES\n=========================================\n\nTimestamp             Type        Details                        Amount       Fee\n`;
    
    const body = filteredTxns.map(t => {
      const date = new Date(t.timestamp).toLocaleDateString();
      const typeStr = t.type.padEnd(12);
      const refStr = `${t.reference} (${t.paymentMethod})`.padEnd(30);
      const amountStr = `${t.type === 'Deposit' ? '+' : '-'}${t.amount} KES`.padEnd(12);
      const feeStr = `${t.fee} KES`;
      return `${date}    ${typeStr}${refStr}${amountStr}${feeStr}`;
    }).join('\n');

    const fullStatementText = header + memberDetails + body + `\n\n=========================================\nStatement generated on ${new Date().toLocaleString()}\nVerified Secure Ledger Chain.`;

    const blob = new Blob([fullStatementText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeFocus.memberId}_savings_statement.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LHS: Live Savings balances and stats */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Revolut style premium debit balance card */}
        <div className="bg-linear-to-b from-[#17253f] via-[#101b30] to-[#0a1120] border border-blue-500/10 p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between h-56">
          
          {/* Abstract details */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider font-mono">Member Savings account balance</span>
              <h3 className="text-3xl font-black text-white font-mono mt-1.5">{activeFocus ? formatKES(activeFocus.savingsBalance) : '0 KES'}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="flex justify-between items-end relative z-10 text-xs">
            <div className="space-y-1">
              <span className="text-slate-450 text-[10px] uppercase font-bold pr-1 block">Account Owner</span>
              <span className="font-bold text-slate-200">{activeFocus ? activeFocus.fullName : 'Guest'}</span>
              <span className="text-[10px] text-slate-450 block font-mono font-bold">{activeFocus ? activeFocus.memberId : ''}</span>
            </div>
            {activeFocus && (
              <button 
                onClick={handleExportStatement}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-xs font-semibold rounded-xl text-slate-250 flex items-center gap-1.5 border border-slate-800 transition-all cursor-pointer shadow-md"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Statement</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Saving Action History timelines */}
        <div className="bg-[#111726]/90 border border-slate-800/70 p-5 rounded-2xl shadow-md">
          <div className="pb-3 border-b border-slate-800/40 mb-3.5">
            <h4 className="text-sm font-bold text-white tracking-tight">Recent Savings Adjustments</h4>
            <p className="text-[11px] text-slate-400">Chronological history of registered micro-deposits, regular cash ins, and handle fees.</p>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {activeFocus ? (
              recentTransactions.filter(t => t.memberId === activeFocus.memberId && (t.type === 'Deposit' || t.type === 'Withdrawal')).length > 0 ? (
                recentTransactions.filter(t => t.memberId === activeFocus.memberId && (t.type === 'Deposit' || t.type === 'Withdrawal')).map((txn) => (
                  <div key={txn.id} className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl hover:bg-slate-850/40 transition-colors border border-slate-850">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        txn.type === 'Deposit' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {txn.type === 'Deposit' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{txn.description}</div>
                        <span className="text-[10px] text-slate-500 font-mono italic block mt-0.5">{txn.reference} • {txn.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono ${
                        txn.type === 'Deposit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {txn.type === 'Deposit' ? '+' : '-'}{formatKES(txn.amount)}
                      </span>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date(txn.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-12 text-xs">No savings entries logged for this member portfolio yet.</div>
              )
            ) : (
              <div className="text-center text-slate-500 py-12 text-xs">Please select a member target from administrative operators.</div>
            )}
          </div>
        </div>

      </div>

      {/* RHS: Interactive Transactions Form Panel */}
      <div className="bg-[#111726]/90 border border-slate-800/70 p-5 rounded-2xl shadow-md h-fit">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">Post Savings Transaction</h4>
          <p className="text-[11px] text-slate-400">Run a simulated live deposit STK push or instant drawer withdrawal withdrawal.</p>
        </div>

        {successMsg && (
          <div className="my-3.5 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-start gap-2">
            <ArrowUpRight className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-3.5 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAction} className="space-y-4 mt-4 text-xs font-medium">
          
          {/* Target Select for Staff Role */}
          {role !== 'Member' && (
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Select Active Member Portfolio</label>
              <select 
                value={targetMemberId}
                onChange={(e) => {
                  setTargetMemberId(e.target.value);
                  const mem = allMembers.find(m => m.memberId === e.target.value);
                  if (mem) setPhoneNumber(mem.phone);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-hidden text-[#ffffff] focus:border-blue-500"
              >
                <option value="">-- Choose Member --</option>
                {allMembers.map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.fullName} ({m.memberId})</option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Type */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Transaction Action Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setTransactionType('Deposit')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  transactionType === 'Deposit' 
                    ? 'bg-blue-600/15 border-blue-500 text-blue-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Regular Deposit
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('Withdrawal')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  transactionType === 'Withdrawal' 
                    ? 'bg-amber-600/15 border-amber-500 text-amber-500' 
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Withdrawal Out
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Transaction Amount (KES)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">KES</span>
              <input 
                type="number"
                required
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Payment Method selectors */}
          {transactionType === 'Deposit' && (
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">Method Channel</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('M-Pesa')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-1 shrink-0 ${
                    paymentMethod === 'M-Pesa' ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-850 text-slate-400 font-normal'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  M-Pesa Push
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Bank Transfer')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-1 shrink-0 ${
                    paymentMethod === 'Bank Transfer' ? 'bg-blue-600/15 border-blue-500 text-blue-400 font-bold' : 'bg-slate-950 border-slate-850 text-slate-400 font-normal'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  EFT/Bank
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-1 shrink-0 ${
                    paymentMethod === 'Card' ? 'bg-purple-600/15 border-purple-500 text-purple-400 font-bold' : 'bg-slate-950 border-slate-850 text-slate-400 font-normal'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Visa/MC
                </button>
              </div>
            </div>
          )}

          {/* Phone input for M-Pesa push Simulation */}
          {paymentMethod === 'M-Pesa' && transactionType === 'Deposit' && (
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1 font-bold">STK push Phone number</label>
              <input 
                type="text"
                placeholder="+254 712 345 678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-hidden focus:border-blue-500 font-mono"
              />
              <span className="text-[9px] text-[#22c55e] mt-1 block">✓ Simulates immediate mobile STK prompt to trigger savings balance credit.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (role !== 'Member' && !targetMemberId)}
            className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl text-xs text-white transition-all shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Processing transaction..." : `Authorize secure ${transactionType}`}
          </button>

        </form>

      </div>

    </div>
  );
}
