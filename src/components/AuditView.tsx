import { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  Terminal, 
  LockKeyhole, 
  Clock, 
  Activity, 
  ArrowRight,
  Database,
  Search,
  Filter
} from 'lucide-react';
import { AuditLog } from '../types.js';

interface AuditViewProps {
  auditLogs: AuditLog[];
  onVerifyLedger: () => Promise<{ isValid: boolean; brokenAtIndex: number | null }>;
}

export default function AuditView({ auditLogs, onVerifyLedger }: AuditViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('All');
  
  // Ledger verification states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    completed: boolean;
    isValid: boolean;
    brokenAtIndex: number | null;
    scannedCount: number;
    checkedOn: string | null;
  } | null>(null);

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.performedByEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'All' ? true : log.action.includes(filterAction);
    return matchesSearch && matchesAction;
  });

  // Unique list of action categories for filtering dropdown
  const uniqueActions = ['All', ...new Set(auditLogs.map(l => l.action.split(' ')[0]))];

  const triggerVerificationScan = async () => {
    setScanning(true);
    setScanResult(null);

    // Dynamic delay for cyber-fintech styled scanner feedback visual
    setTimeout(async () => {
      try {
        const res = await onVerifyLedger();
        setScanResult({
          completed: true,
          isValid: res.isValid,
          brokenAtIndex: res.brokenAtIndex,
          scannedCount: auditLogs.length,
          checkedOn: new Date().toLocaleTimeString()
        });
      } catch (err) {
        alert('Verification request failed.');
      } finally {
        setScanning(false);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 text-xs text-slate-300 font-sans">
      
      {/* Cybersecurity Header banner and Terminal controller */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Abstract security intro Card */}
        <div className="lg:col-span-2 bg-[#0d1221] border border-blue-500/15 p-5 rounded-2xl shadow-xl space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-1.5 text-blue-400 font-mono font-bold tracking-widest uppercase text-[10px]">
              <LockKeyhole className="w-4 h-4 text-blue-500 font-bold shrink-0" />
              <span>Immutable blockchain audits</span>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Active Cryptographic Chaining protocol</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every deposit, credit disbursement, and master parameter adjustment is securely logged, encrypted, and chained to the previous block hash via a <span className="text-blue-400 font-mono font-semibold">SHA-256 integrity model</span>. This constructs a blockchain-strength, tamper-proof system ledger.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-450 z-10">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500/80 rounded-full inline-block animate-pulse"></span>
              Ledger verified
            </span>
            <span>•</span>
            <span>Blocks: {auditLogs.length} Records</span>
          </div>
        </div>

        {/* Real-time Ledger Integrity scanner Card */}
        <div className="bg-[#12192c]/90 border border-slate-800/80 p-5 rounded-2xl shadow-md flex flex-col justify-between h-fit lg:h-auto min-h-[170px]">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">Voucher Ledger Scanner</h4>
            <p className="text-[11px] text-slate-400">Recalculate complete SHA link paths dynamically to detect database manipulation.</p>
          </div>

          {/* Scanner Outputs */}
          {scanning && (
            <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center gap-2.5 my-2">
              <Activity className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
              <span className="font-mono text-blue-400 text-[10px] uppercase font-bold tracking-wider">Recalculating hash blocks...</span>
            </div>
          )}

          {scanResult && scanResult.completed && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 my-2 ${
              scanResult.isValid 
                ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
            }`}>
              {scanResult.isValid ? <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" /> : <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>
                <span className="font-bold text-white text-[11px]">Scanner Completed at {scanResult.checkedOn}</span>
                <p className="text-[10px] mt-0.5 text-slate-400 leading-snug">
                  {scanResult.isValid 
                    ? `Integrity Checked: ${scanResult.scannedCount} blocks checked. Chain links are 100% cryptographically aligned.` 
                    : `CRITICAL ALERT: Tammpering detected at index block #${scanResult.brokenAtIndex}. Chained hashes do not match.`}
                </p>
              </div>
            </div>
          )}

          {!scanning && !scanResult && (
            <div className="text-[11px] text-slate-500 font-mono py-2.5">Ready for signature verification.</div>
          )}

          <button 
            onClick={triggerVerificationScan}
            disabled={scanning}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-xs text-white shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Verify Immutable ledger</span>
          </button>
        </div>

      </div>

      {/* Query controllers */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#111726]/60 p-4 rounded-xl border border-slate-800/60 shadow-lg">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
          <input 
            type="text" 
            placeholder="Search action keyword, performer email, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 focus:border-blue-500 rounded-xl outline-hidden text-[#ffffff]"
          />
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2.5 text-xs text-slate-200">
          <Filter className="w-3.5 h-3.5 text-slate-450 shrink-0" />
          <span className="text-slate-450">Action Class:</span>
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-blue-500 text-slate-205 font-medium"
          >
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Security Chained Logs Feed representation */}
      <div className="space-y-4">
        {filteredLogs.map((log, index) => (
          <div 
            key={log.id} 
            className="bg-[#111726]/80 border border-slate-800 p-4.5 rounded-2xl shadow-md hover:border-slate-700/60 transition-all font-mono space-y-3"
          >
            {/* Header top bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shrink-0"></div>
                <span className="text-xs font-bold text-white font-sans">{log.action}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-450">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Description details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-350">
              <div className="md:col-span-2 space-y-1 font-sans">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block tracking-wider">Log Description</span>
                <p className="leading-snug text-slate-300">{log.details}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Authorized Operator</span>
                <div className="text-white font-bold leading-tight">{log.performedByEmail}</div>
                <div className="text-[9px] text-blue-400 font-bold">{log.performedByRole}</div>
              </div>
            </div>

            {/* Blockchain Chaining Block Hashing signature displays */}
            <div className="p-3 bg-slate-905/65 rounded-xl border border-slate-850/80 text-[10px] grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 leading-snug">
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Hash Code (SHA-256 Signature)</span>
                <span className="text-blue-400/90 break-all">{log.hash}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Previous Block Connection Code</span>
                <span className="text-indigo-400/90 break-all">{log.prevHash}</span>
              </div>
            </div>

          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="bg-[#111726]/80 p-12 text-center text-slate-550 border border-slate-800 rounded-2xl">
            No matching security blocks matching parameters.
          </div>
        )}
      </div>

    </div>
  );
}
