import { 
  TrendingUp, 
  Users, 
  PiggyBank, 
  HandCoins, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  FileLock,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { DashboardStats, UserRole } from '../types.js';

interface DashboardViewProps {
  stats: DashboardStats;
  onNavigateToTab: (tabId: string) => void;
  role: UserRole;
  fullName: string;
}

export default function DashboardView({ stats, onNavigateToTab, role, fullName }: DashboardViewProps) {
  
  // Format numbers nicely as currency e.g. 145,000 KES
  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  // Static Mock Data for Growth Trend charts to look premium (can merge with current states)
  const savingsTimelineData = [
    { month: 'Jan', Savings: 480000, Disbursements: 150000 },
    { month: 'Feb', Savings: 520000, Disbursements: 190000 },
    { month: 'Mar', Savings: 610000, Disbursements: 260000 },
    { month: 'Apr', Savings: 690000, Disbursements: 380000 },
    { month: 'May', Savings: stats.totalSavings || 745000, Disbursements: stats.activeLoansAmount || 490000 },
  ];

  const repaymentDistributionData = [
    { name: 'Active Loans Outstanding', value: stats.activeLoansAmount },
    { name: 'Total Recovered Capital', value: stats.totalSavings * 0.45 }, // Simulated proportion
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      
      {/* Premium Ambient Greeting Banner */}
      <div className="bg-linear-to-r from-[#111827] via-[#101726] to-[#0d1527] p-6 rounded-2xl border border-slate-800/80 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-1.5">
          <div className="text-xs text-blue-400 font-mono tracking-widest font-bold uppercase">Apex Ledger Gateway</div>
          <h2 className="text-xl font-bold text-white">Karibu, {fullName}</h2>
          <p className="text-xs text-slate-400 leading-normal max-w-xl">
            You are currently authorized as an <span className="text-blue-400 font-bold font-mono">{role}</span>. The cryptographic micro-ledger hashes have scanned green. Standard security policies are active.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0 z-10">
          <button 
            onClick={() => onNavigateToTab('savings')}
            className="px-4 py-2 bg-[#17253d] text-blue-400 hover:bg-[#1a2d4b] rounded-xl text-xs font-semibold border border-blue-500/10 cursor-pointer transition-all active:scale-[0.98]"
          >
            Manage Savings
          </button>
          <button 
            onClick={() => onNavigateToTab('loans')}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/10 cursor-pointer transition-all active:scale-[0.98]"
          >
            Credit Actions
          </button>
        </div>
      </div>

      {/* Grid of 4 Key Stats Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-[#12192c]/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium tracking-wide uppercase text-slate-400">Total Savings Pool</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <PiggyBank className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono break-all leading-none">{formatKES(stats.totalSavings)}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>+18.4% APY</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#12192c]/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium tracking-wide uppercase text-slate-400">Active Debt Portfolio</span>
            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
              <HandCoins className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono break-all leading-none">{formatKES(stats.activeLoansAmount)}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{stats.pendingLoansCount} Applications</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#12192c]/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium tracking-wide uppercase text-slate-400">Vetted Members</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono break-all leading-none">{stats.totalMembers}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Full-status Active</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#12192c]/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium tracking-wide uppercase text-slate-400">Repayment Health</span>
            <div className="p-1.5 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono break-all leading-none">{stats.loanRepaymentRate}%</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span>98.6% Operational Limit</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Savings & Disbursement Growth timeline (double-width span) */}
        <div className="bg-[#111726]/90 border border-slate-800/70 p-5 rounded-2xl shadow-md lg:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Savings APY & Disbursement Flow</h3>
              <p className="text-[11px] text-slate-400 leading-normal">Co-operative liquidity trends across the previous active quarter.</p>
            </div>
            <div className="flex gap-2 text-[10px] font-mono text-slate-400 uppercase">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>Savings</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>Outstanding</span>
            </div>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDisburse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#233554" opacity={0.2} />
                <XAxis dataKey="month" stroke="#475569" fontSize={11} strokeWidth={0.5} />
                <YAxis stroke="#475569" fontSize={11} strokeWidth={0.5} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="Savings" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" />
                <Area type="monotone" dataKey="Disbursements" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDisburse)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Portfolios Distribution circular representation */}
        <div className="bg-[#111726]/90 border border-slate-800/70 p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Capital Allocation Assessment</h3>
            <p className="text-[11px] text-slate-400 leading-normal">Distribution of active assets vs liquid backup balances.</p>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={repaymentDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {repaymentDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Liquidity</span>
              <span className="text-lg font-bold font-mono text-white">
                {Math.round((stats.totalSavings / (stats.totalSavings + stats.activeLoansAmount)) * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 block"></span>
                <span className="text-slate-400">Total Liquid Reserves</span>
              </div>
              <span className="font-mono text-white text-[11px] font-bold">{formatKES(stats.totalSavings - stats.activeLoansAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 block"></span>
                <span className="text-slate-400">Invested Debt Asset</span>
              </div>
              <span className="font-mono text-white text-[11px] font-bold">{formatKES(stats.activeLoansAmount)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Lists visual section: Recent Transactions and Chained security Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LHS: Recent Activity List */}
        <div className="bg-[#111726]/90 border border-slate-800/70 p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
            <div>
              <h3 className="text-sm font-bold text-white">Live Transactions</h3>
              <p className="text-[11px] text-slate-400">Instant credit/deposit updates occurring in the SACCO.</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-2.5 bg-slate-900/30 rounded-xl hover:bg-slate-850/40 transition-colors border border-slate-850">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] uppercase font-mono ${
                      tx.type === 'Deposit' ? 'bg-blue-500/10 text-blue-400' :
                      tx.type === 'Withdrawal' ? 'bg-amber-500/10 text-amber-400' :
                      tx.type === 'Repayment' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {tx.type.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">{tx.memberName}</div>
                      <div className="text-[10px] text-slate-450 truncate flex items-center gap-1.5 font-mono">
                        <span>{tx.reference}</span>
                        <span>•</span>
                        <span>{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-none">
                    <div className={`text-xs font-bold font-mono ${
                      tx.type === 'Deposit' || tx.type === 'Repayment' ? 'text-emerald-400 font-semibold' : 'text-rose-400'
                    }`}>
                      {tx.type === 'Deposit' || tx.type === 'Repayment' ? '+' : '-'}{formatKES(tx.amount)}
                    </div>
                    <span className="text-[9px] text-slate-500 block font-mono">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-8 text-xs">No recorded transactions today.</div>
            )}
          </div>
        </div>

        {/* RHS: Security Logs / Blockchain block validations */}
        <div className="bg-[#111726]/90 border border-slate-800/70 p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
            <div>
              <h3 className="text-sm font-bold text-white">Chained Security Logs</h3>
              <p className="text-[11px] text-slate-400">Hash-coupled real-time state ledger ledger audits.</p>
            </div>
            {role !== 'Member' && (
              <button 
                onClick={() => onNavigateToTab('audit')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer font-mono"
              >
                <span>Audit Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {stats.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
              stats.recentAuditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-900/30 rounded-xl hover:bg-slate-850/40 transition-colors border border-slate-850 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block animate-pulse shrink-0"></div>
                      <span className="text-xs font-bold text-white truncate">{log.action}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-sm">{log.performedByRole}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 leading-normal">{log.details}</p>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-1">
                    <span className="truncate pr-2">PrevHash: {log.prevHash.slice(0, 15)}...</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-8 text-xs">Security ledger initialized with Genesis block.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
