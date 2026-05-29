import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  Activity, 
  HelpCircle, 
  Terminal,
  PiggyBank,
  CheckCircle,
  TrendingUp,
  History,
  AlertOctagon,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.js';
import { 
  User, 
  Member, 
  Loan, 
  Transaction, 
  AuditLog, 
  SACCOSettings, 
  DashboardStats,
  UserRole 
} from './types.js';

import LoginView from './components/LoginView.js';
import Sidebar from './components/Sidebar.js';
import Header from './components/Header.js';
import DashboardView from './components/DashboardView.js';
import MembersView from './components/MembersView.js';
import SavingsView from './components/SavingsView.js';
import LoansView from './components/LoansView.js';
import TransactionsView from './components/TransactionsView.js';
import AuditView from './components/AuditView.js';
import SettingsView from './components/SettingsView.js';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('sacco_token'));
  const [user, setUser] = useState<User | null>(null);
  
  // App state logs
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SACCOSettings | null>(null);

  // App layouts
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [operationMsg, setOperationMsg] = useState('');

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  // Security Inactivity Session Tracking (15 mins)
  const [sessionExpired, setSessionExpired] = useState(false);

  // Real-time live system notification streams (Fintech requirement #3)
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  // Appearance theme support (light and dark mode options)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sacco_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('sacco_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token || !user) return;

    const clientId = `cli-fe-${user.email}-${Date.now()}`;
    const eventSource = new EventSource(`/api/live-updates?clientId=${clientId}`);

    const showNotif = (notif: { id: string; title: string; message: string; type: 'success' | 'info' | 'warning' }) => {
      setLiveNotifications((prev) => [notif, ...prev].slice(0, 5));
      setTimeout(() => {
        setLiveNotifications((prev) => prev.filter((item) => item.id !== notif.id));
      }, 7000);
    };

    eventSource.addEventListener('balance_update', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        showNotif({
          id: `notif-${Date.now()}`,
          title: 'Ledger Contribution Post',
          message: `${payload.type} for ${payload.fullName}: ${payload.amount.toLocaleString()} KES. New Balance: ${payload.newBalance.toLocaleString()} KES.`,
          type: 'success'
        });
        refreshAllData();
      } catch (err) {
        console.error('SSE balance_update parse failed:', err);
      }
    });

    eventSource.addEventListener('repayment_made', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        showNotif({
          id: `notif-${Date.now()}`,
          title: 'Loan Debt Settled',
          message: `${payload.fullName} repaid KES ${payload.repaymentAmount.toLocaleString()}. New Debt Balance: ${payload.outstandingBalance.toLocaleString()} KES.`,
          type: 'info'
        });
        refreshAllData();
      } catch (err) {
        console.error('SSE repayment_made parse failed:', err);
      }
    });

    eventSource.addEventListener('loan_approved', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        showNotif({
          id: `notif-${Date.now()}`,
          title: 'Liquidity Disbursed',
          message: `Approved KES ${payload.amount.toLocaleString()} disbursed under loan account ${payload.loanId} for ${payload.memberName}.`,
          type: 'warning'
        });
        refreshAllData();
      } catch (err) {
        console.error('SSE loan_approved parse failed:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[SSE Connection Warning] Re-establishing secure pub-sub lines...');
    };

    return () => {
      eventSource.close();
    };
  }, [token, user]);

  useEffect(() => {
    // 1. Detect if on iOS Device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleMobile);

    // 2. Capture standard beforeinstallprompt
    const captureInstallationHandler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPwaBanner(true); // show the install button automatically!
    };

    window.addEventListener('beforeinstallprompt', captureInstallationHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallationHandler);
    };
  }, []);

  // Inactivity tracking
  useEffect(() => {
    if (!token || !user) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      // Automatically log out after 15 minutes of inactivity
      inactivityTimer = setTimeout(() => {
        setSessionExpired(true);
        handleLocalLogout();
      }, 15 * 60 * 1000);
    };

    // Activity listeners
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);

    resetInactivityTimer(); // Start tracking initial boot session

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
    };
  }, [token, user]);

  const triggerPwaApplicationInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }
    if (!deferredPrompt) {
      alert("This modern browser does not require a PWA installation prompt, or application is installed already.");
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('User embraced PWA installer payload');
    }
    setDeferredPrompt(null);
  };

  // Auto-authentication check on startup
  const syncLocalBackups = async () => {
    try {
      const backupMembers = JSON.parse(localStorage.getItem('sacco_backup_members') || '[]');
      const backupUsers = JSON.parse(localStorage.getItem('sacco_backup_users') || '[]');
      const backupCreds = JSON.parse(localStorage.getItem('sacco_backup_creds') || '{}');

      const usersToSync = backupUsers.map((u: any) => ({
        ...u,
        password: backupCreds[u.email.toLowerCase()] || 'password123'
      }));

      if (backupMembers.length > 0 || usersToSync.length > 0) {
        await api.syncBackups(backupMembers, usersToSync);
      }
    } catch (e) {
      console.warn("Local storage database synchronization bypassed:", e);
    }
  };

  useEffect(() => {
    async function checkSession() {
      await syncLocalBackups();
      if (!token) {
        setBootstrapping(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
        // Load operational statistics
        await refreshAllData();
      } catch (err) {
        console.error('Session expired or handshake failed:', err);
        handleLocalLogout();
      } finally {
        setBootstrapping(false);
      }
    }
    checkSession();
  }, [token]);

  // Combined fetch coordinating routine
  const refreshAllData = async () => {
    setFetchingData(true);
    try {
      const [statsRes, membersRes, loansRes, txRes, settingsRes, auditRes] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getMembers(),
        api.getLoans(),
        api.getTransactions(),
        api.getSettings(),
        api.getAuditLogs()
      ]);

      if (statsRes.status === 'fulfilled') setDashboardStats(statsRes.value);
      if (membersRes.status === 'fulfilled') setMembers(membersRes.value);
      if (loansRes.status === 'fulfilled') setLoans(loansRes.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value);
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value);
      if (auditRes.status === 'fulfilled' && auditRes.value) setAuditLogs(auditRes.value);

    } catch (error) {
      console.error('Handshake synchronization aborted:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleLocalLogin = async (loggedUser: any, authToken: string) => {
    setToken(authToken);
    setUser(loggedUser);
    localStorage.setItem('sacco_token', authToken);
    // Refresh to update dashboard states
    setBootstrapping(true);
    try {
      await refreshAllData();
    } finally {
      setBootstrapping(false);
    }
  };

  const handleLocalLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn("Server logout callback failed:", e);
    }
    localStorage.removeItem('sacco_token');
    localStorage.removeItem('sacco_refresh_token');
    setToken(null);
    setUser(null);
    setDashboardStats(null);
    setMembers([]);
    setLoans([]);
    setTransactions([]);
    setSettings(null);
    setCurrentTab('dashboard');
  };

  // Helper selectors
  const currentUserMember = user && user.role === 'Member' 
    ? members.find(m => m.memberId === user.memberId) || null 
    : null;

  // Handles quick triggers dispatched from subcomponents or top navigation widgets
  const handleTopGlobalQuickAction = (actionType: 'deposit' | 'applyLoan' | 'repayment') => {
    if (actionType === 'deposit') {
      setCurrentTab('savings');
    } else if (actionType === 'applyLoan') {
      setCurrentTab('loans');
    } else {
      setCurrentTab('loans'); // Opens Loan scheduler to view list
    }
  };

  // API Mutating Callbacks (passed as props)
  const handleAddNewMember = async (payload: any) => {
    const newMember = await api.createMember(payload);
    
    // Save newly added member to local backups for seamless serverless cold reboots
    try {
      const backupMembers = JSON.parse(localStorage.getItem('sacco_backup_members') || '[]');
      backupMembers.push(newMember);
      localStorage.setItem('sacco_backup_members', JSON.stringify(backupMembers));

      const backupUsers = JSON.parse(localStorage.getItem('sacco_backup_users') || '[]');
      backupUsers.push({
        email: payload.email,
        role: "Member",
        fullName: payload.fullName,
        memberId: newMember.memberId,
        status: "Active",
        avatarUrl: newMember.avatarUrl
      });
      localStorage.setItem('sacco_backup_users', JSON.stringify(backupUsers));
      
      const backupCreds = JSON.parse(localStorage.getItem('sacco_backup_creds') || '{}');
      backupCreds[payload.email.toLowerCase()] = "password123"; // default pwd for administratively added members
      localStorage.setItem('sacco_backup_creds', JSON.stringify(backupCreds));
    } catch (error) {
      console.warn("Bypassed backup appending:", error);
    }

    await refreshAllData();
  };

  const handleUpdateMember = async (memberId: string, payload: any) => {
    await api.updateMember(memberId, payload);
    await refreshAllData();
  };

  const handleExecuteSavingsAction = async (payload: any) => {
    const res = await api.executeSavingsTransaction(payload);
    await refreshAllData();
    return res;
  };

  const handleApplyForCredit = async (payload: any) => {
    const res = await api.applyForLoan(payload);
    await refreshAllData();
    return res;
  };

  const handleApproveRejectCredit = async (loanId: string, action: 'Approve' | 'Reject') => {
    await api.processLoanAction(loanId, action);
    await refreshAllData();
  };

  const handlePostRepayment = async (payload: any) => {
    const res = await api.submitRepayment(payload);
    await refreshAllData();
    return res;
  };

  const handleUpdateSACCOSettings = async (payload: Partial<SACCOSettings>) => {
    const res = await api.updateSettings(payload);
    await refreshAllData();
    return res;
  };

  const handleVerifyLedgerSignature = async () => {
    return await api.verifyLedger();
  };

  const formatKES = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
  };

  // Loading indicator for background polling / bootup state
  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-[#070b14] text-[#f8fafc] flex flex-col items-center justify-center font-sans space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-900 border-t-blue-500 animate-spin"></div>
          <ShieldCheck className="w-5 h-5 text-blue-400 absolute font-bold" />
        </div>
        <div className="text-center space-y-1.5">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-mono font-bold">APEX SACCO LEDGER</div>
          <p className="text-[11px] text-slate-500 font-medium">Synchronizing SSL audit chains...</p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLocalLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-[#f8fafc] flex font-sans overflow-hidden">
      
      {/* 1. LHS Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role={user.role}
        fullName={user.fullName}
        onLogout={handleLocalLogout}
      />

      {/* 2. Main content block wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header Bar */}
        <Header 
          role={user!.role}
          fullName={user!.fullName}
          avatarUrl={user!.avatarUrl}
          onQuickAction={handleTopGlobalQuickAction}
          theme={theme}
          toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />

        {/* 3. Central Router View Body Scrollport */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top dynamic sync indicator bar */}
          {fetchingData && (
            <div className="fixed bottom-6 right-6 p-3 bg-blue-600 border border-blue-500/10 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-mono font-bold text-white transition-opacity uppercase tracking-wider">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Syncing Ledger state...</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              
              {currentTab === 'dashboard' && dashboardStats && (
                <DashboardView 
                  stats={dashboardStats}
                  onNavigateToTab={setCurrentTab}
                  role={user.role}
                  fullName={user.fullName}
                />
              )}

              {currentTab === 'members' && (
                <MembersView 
                  members={members}
                  onAddMember={handleAddNewMember}
                  onUpdateMember={handleUpdateMember}
                  role={user.role}
                  currentUserMemberId={user.memberId}
                />
              )}

              {currentTab === 'savings' && (
                <SavingsView 
                  currentUserMember={currentUserMember}
                  allMembers={members}
                  onExecuteTransaction={handleExecuteSavingsAction}
                  recentTransactions={transactions}
                  role={user.role}
                />
              )}

              {currentTab === 'loans' && (
                <LoansView 
                  loans={loans}
                  members={members}
                  onApplyLoan={handleApplyForCredit}
                  onApproveRejectLoan={handleApproveRejectCredit}
                  role={user.role}
                  currentUserMemberId={user.memberId}
                  onNavigateToTab={setCurrentTab}
                  onPostRepayment={handlePostRepayment}
                />
              )}

              {currentTab === 'transactions' && (
                <TransactionsView 
                  transactions={transactions}
                />
              )}

              {currentTab === 'audit' && (
                <AuditView 
                  auditLogs={auditLogs}
                  onVerifyLedger={handleVerifyLedgerSignature}
                />
              )}

              {currentTab === 'settings' && settings && (
                <SettingsView 
                  settings={settings}
                  onUpdateSettings={handleUpdateSACCOSettings}
                  theme={theme}
                  setTheme={setTheme}
                  currentUser={user}
                  onRefreshData={refreshAllData}
                  onUpdateCurrentUserFullName={(name) => setUser(u => u ? { ...u, fullName: name } : null)}
                />
              )}

              {/* Enhanced Visual analytics tab representation */}
              {currentTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">System-Wide Co-operative Growth Analytics</h3>
                      <p className="text-[11px] text-slate-400">Review dynamic stats for loans, active portfolios, and regular savings.</p>
                    </div>
                    <button onClick={refreshAllData} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg font-bold border border-blue-500/20 cursor-pointer">Re-fetch</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 space-y-4">
                      <span className="text-[11px] font-mono tracking-wider text-blue-400 font-bold uppercase flex items-center gap-1.5"><TrendingUp className="w-4 h-4" />Liquidity reserves comparison</span>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/80">
                          <span className="text-slate-450 text-[10px] uppercase font-bold">Reserves Pool</span>
                          <div className="text-sm font-bold text-white mt-1">{formatKES(members.reduce((s,m) => s + m.savingsBalance, 0))}</div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/80">
                          <span className="text-slate-450 text-[10px] uppercase font-bold">Invested Debt</span>
                          <div className="text-sm font-bold text-indigo-400 mt-1">{formatKES(loans.filter(l => l.status === 'Approved' || l.status === 'Overdue').reduce((s,l) => s + l.outstandingBalance, 0))}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 space-y-4">
                      <span className="text-[11px] font-mono tracking-wider text-purple-400 font-bold uppercase flex items-center gap-1.5"><History className="w-4 h-4" />Credit lifecycle metrics</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-2 hover:bg-slate-900/45 rounded-lg">
                          <span>Total Ever Borrowed Capital:</span>
                          <span className="text-white font-bold font-mono">{formatKES(loans.reduce((s,l) => s+l.amount, 0))}</span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-slate-900/45 rounded-lg">
                          <span>Outstanding active liabilities:</span>
                          <span className="text-white font-bold font-mono">{formatKES(loans.reduce((s,l) => s + l.outstandingBalance, 0))}</span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-slate-900/45 rounded-lg">
                          <span>Fully Payed Loans counts:</span>
                          <span className="text-white font-bold font-mono">{loans.filter(l => l.status === 'Fully Paid').length} Contracts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </main>

      </div>

      {/* ============================================================= */}
      {/* 4. SECURITY SYSTEM MODALS: SESSION INACTIVITY SLEEP */}
      {/* ============================================================= */}
      <AnimatePresence>
        {sessionExpired && (
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl relative space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white tracking-tight">Security Session Locked</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have been logged out automatically after 15 minutes of inactivity to safeguard your digital SACCO ledger wallets and audit logs.
                </p>
              </div>
              <button 
                onClick={() => setSessionExpired(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-xs text-white transition-all cursor-pointer"
              >
                Acknowledge & Sign In
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* 5. FINTECH DESKTOP & IPHONE PWA INSTALLATION CORNER */}
      {/* ============================================================= */}
      <AnimatePresence>
        {showPwaBanner && (
          <div className="fixed bottom-6 left-6 max-w-xs bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-lg flex items-start gap-3 z-40">
            <img 
              src="/icon.png" 
              alt="Apex SACCO Logo" 
              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">Install Mobile App</h4>
                <p className="text-[10px] text-slate-300 leading-normal font-medium">Download Apex SACCO directly on your iPhone or desktop.</p>
              </div>
              <div className="flex gap-2 text-[10px]">
                <button 
                  onClick={triggerPwaApplicationInstall}
                  className="px-2.5 py-1 bg-linear-to-r from-blue-600 to-indigo-600 font-bold rounded-lg text-white hover:opacity-90 cursor-pointer"
                >
                  Download Setup
                </button>
                <button 
                  onClick={() => setShowPwaBanner(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* iOS Safari manual guidance prompt popover */}
      <AnimatePresence>
        {showIOSHint && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[60] p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-w-xs text-center space-y-4 shadow-2xl"
            >
              <img 
                src="/icon.png" 
                alt="App" 
                className="w-16 h-16 rounded-2xl object-cover border border-slate-750 shadow-lg mx-auto"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">iPhone Deployment Guide</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Standard iOS Safari limits silent installations. To install completely:
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-left text-[11px] text-slate-350 leading-relaxed font-mono space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Tap on the <span className="text-blue-300 underline font-sans">"Share"</span> button (bottom bar).</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Scroll down and tap <span className="text-blue-300 underline font-sans">"Add to Home Screen"</span>.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Open from your device springboard with the custom golden SACCO icon.</span>
                </div>
              </div>
              <button 
                onClick={() => setShowIOSHint(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* REAL-TIME NOTIFICATION POPUPS FLIGHT-DECK */}
      {/* ============================================================= */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {liveNotifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-full bg-slate-900/95 border border-slate-750 p-4 rounded-xl shadow-2xl backdrop-blur-md flex gap-3 items-start"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                n.type === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' :
                n.type === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' :
                'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'
              }`} />
              <div className="flex-1 space-y-1">
                <h5 className="text-[11px] font-bold text-white tracking-wider uppercase font-mono">{n.title}</h5>
                <p className="text-[10px] text-slate-300 leading-normal">{n.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
