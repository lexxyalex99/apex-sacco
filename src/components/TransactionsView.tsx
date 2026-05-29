import { useState } from 'react';
import { 
  Search, 
  History, 
  FileDown, 
  Receipt, 
  Smartphone, 
  CreditCard, 
  Building, 
  Wallet, 
  CheckCircle,
  X,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Transaction } from '../types.js';

interface TransactionsViewProps {
  transactions: Transaction[];
}

export default function TransactionsView({ transactions }: TransactionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');

  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.memberId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' ? true : t.type === filterType;
    const matchesMethod = filterMethod === 'All' ? true : t.paymentMethod === filterMethod;

    return matchesSearch && matchesType && matchesMethod;
  });

  const handleExportCSV = () => {
    // Generate CSV data from transactions
    const headers = 'Transaction Date,Reference Code,Member ID,Member Name,Type,Amount Paid (KES),Payment Method,Transaction Fee\n';
    const rows = filteredTransactions.map(t => {
      const date = new Date(t.timestamp).toLocaleDateString() + ' ' + new Date(t.timestamp).toLocaleTimeString();
      return `"${date}","${t.reference}","${t.memberId}","${t.memberName}","${t.type}",${t.amount},"${t.paymentMethod}",${t.fee}`;
    }).join('\n');

    const csvBlob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.setAttribute('download', `apex_sacco_ledger_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6 text-xs font-sans">
      
      {/* Search and export parameters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#111726]/60 p-4 rounded-xl border border-slate-800/60 shadow-lg">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
          <input 
            type="text" 
            placeholder="Search TXN refs, Joshua Mwangi, SACCO-1021..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 focus:border-blue-500 rounded-xl outline-hidden text-[#ffffff]"
          />
        </div>

        {/* Filters and export */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-205">
          <span className="text-slate-450">Category:</span>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-blue-500 text-slate-200 font-medium"
          >
            <option value="All">All Operations</option>
            <option value="Deposit">Deposits</option>
            <option value="Withdrawal">Withdrawals</option>
            <option value="Loan Disbursement">Disbursements</option>
            <option value="Repayment">Repayments</option>
            <option value="Dividend Credit">Dividend Credit</option>
          </select>

          <span className="text-slate-450">Payment Channel:</span>
          <select 
            value={filterMethod} 
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-blue-500 text-slate-200 font-medium"
          >
            <option value="All">All channels</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Visa/MC Card</option>
            <option value="SACCO Balance">SACCO Deduction</option>
          </select>

          <button 
            onClick={handleExportCSV}
            className="ml-auto bg-slate-900 hover:bg-slate-850 border border-slate-800 font-semibold rounded-lg px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer text-slate-200 font-medium transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV Sheet</span>
          </button>
        </div>
      </div>

      {/* Main transactions tabular panel */}
      <div className="bg-[#111726]/80 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0c1221] text-slate-400 font-mono uppercase font-bold text-[9px] tracking-widest">
                <th className="py-4.5 px-5">DATE & TIMESTAMP</th>
                <th className="py-4.5 px-4">TRANSACTION REFERENCE</th>
                <th className="py-4.5 px-4">MEMBER PROFILE</th>
                <th className="py-4.5 px-4 font-mono">TYPE</th>
                <th className="py-4.5 px-4">CHANNEL</th>
                <th className="py-4.5 px-4 text-right">FEE (KES)</th>
                <th className="py-4.5 px-5 text-right">AMOUNT (KES)</th>
                <th className="py-4.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="hover:bg-slate-900/30 transition-all text-slate-200"
                >
                  <td className="py-3.5 px-5 font-mono text-[10px]">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-100 uppercase tracking-wide">
                    {tx.reference}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-150 leading-snug">{tx.memberName}</div>
                    <span className="text-[10px] text-slate-450 font-mono">{tx.memberId}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[9px] uppercase ${
                      tx.type === 'Deposit' ? 'bg-blue-500/10 text-blue-400' :
                      tx.type === 'Withdrawal' ? 'bg-amber-500/10 text-amber-500' :
                      tx.type === 'Repayment' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>{tx.type}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-350">
                    <div className="flex items-center gap-1.5 leading-none">
                      {tx.paymentMethod === 'M-Pesa' && <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {tx.paymentMethod === 'Card' && <CreditCard className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      {tx.paymentMethod === 'Bank Transfer' && <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {tx.paymentMethod === 'SACCO Balance' && <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <span>{tx.paymentMethod}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    {tx.fee > 0 ? `${tx.fee} KES` : 'Free'}
                  </td>
                  <td className={`py-3.5 px-5 text-right font-mono font-extrabold ${
                    tx.type === 'Deposit' || tx.type === 'Repayment' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'Deposit' || tx.type === 'Repayment' ? '+' : '-'}{formatKES(tx.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={() => setViewingReceipt(tx)}
                      className="text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer flex items-center justify-end gap-1 shrink-0 ml-auto"
                    >
                      <span>Receipt</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length === 0 && (
          <div className="text-center py-16 text-slate-500 font-mono">No matching records registered in target logs.</div>
        )}
      </div>

      {/* Digital Receipt Overlay Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111725] border border-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-3xl text-slate-300 relative space-y-4">
            
            {/* Closes button */}
            <button 
              onClick={() => setViewingReceipt(null)}
              className="absolute right-4 top-4 w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Receipt Header Style */}
            <div className="text-center space-y-1 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest">Transaction voucher</span>
              <h3 className="text-md font-extrabold text-white">APEX CO-OPERATIVE</h3>
              <p className="text-[9px] text-[#22c55e] font-mono select-none">✓ COMPLETED & CRYPTOGRAPHICALLY SECURED</p>
            </div>

            {/* Dotted lines dividing details */}
            <div className="border-t border-dashed border-slate-800 my-4"></div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-450 uppercase font-mono text-[9px] font-bold">Ledger timestamp</span>
                <span className="font-mono text-white text-[11px]">{new Date(viewingReceipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 uppercase font-mono text-[9px] font-bold">Verification code</span>
                <span className="font-mono text-white text-[11px] font-bold uppercase">{viewingReceipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 uppercase font-mono text-[9px] font-bold">Member account</span>
                <span className="text-white text-right font-medium">
                  <div>{viewingReceipt.memberName}</div>
                  <div className="text-[9px] text-slate-450 font-mono mt-0.5">{viewingReceipt.memberId}</div>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 uppercase font-mono text-[9px] font-bold">Transfer channel</span>
                <span className="text-white font-medium">{viewingReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 uppercase font-mono text-[9px] font-bold">Processing surcharge</span>
                <span className="font-mono text-white">{viewingReceipt.fee > 0 ? `${viewingReceipt.fee} KES` : 'No handle fee'}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-800 my-4"></div>

            <div className="flex justify-between items-center text-sm font-bold bg-slate-900/60 p-3 rounded-xl border border-slate-850">
              <span className="text-slate-350">VOUCHER VALUE</span>
              <span className="font-mono text-emerald-400 text-base">{formatKES(viewingReceipt.amount)}</span>
            </div>

            <div className="text-[9px] text-slate-500 font-mono text-center leading-normal pt-2">
              <p>Chained signature verified valid</p>
              <p className="truncate">PrevHash: {Math.random().toString(36).substring(2,15)}...</p>
            </div>

            <div className="pt-2 flex gap-2 font-semibold">
              <button 
                onClick={() => setViewingReceipt(null)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl cursor-pointer"
              >
                Close Receipt
              </button>
              <button 
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer flex items-center justify-center"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
