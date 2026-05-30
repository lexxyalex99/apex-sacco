import { useState } from 'react';
import { 
  Bell, 
  Search, 
  Smartphone, 
  ShieldAlert, 
  ChevronDown, 
  CheckCircle, 
  PiggyBank, 
  Receipt,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Menu
} from 'lucide-react';
import { UserRole } from '../types.js';

interface HeaderProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  onQuickAction: (type: 'deposit' | 'applyLoan' | 'repayment') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  secondsRemaining?: number | null;
  onExtendSession?: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({ 
  role, 
  fullName, 
  avatarUrl, 
  onQuickAction, 
  theme, 
  toggleTheme,
  secondsRemaining,
  onExtendSession,
  onToggleSidebar
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Savings Credited', desc: '15,000 KES deposited via M-Pesa.', time: '10 mins ago', unread: true },
    { id: 2, title: 'Loan Approved Vetting', desc: 'LN-5295 for SME has passed basic verification check.', time: '1 hour ago', unread: true },
    { id: 3, title: 'Daily Backups Verified', desc: 'Chained audit hashes verified green.', time: '1 day ago', unread: false }
  ]);

  const hasUnread = notifications.some(n => n.unread);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleMarkOneRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  return (
    <header className="bg-[#090d16] border-b border-[#1e293b]/40 h-16 px-6 flex items-center justify-between relative z-40 select-none">
      
      {/* Search Input Bar (Fintech dashboard style) */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search members, transactions, loan contracts, audit keys..."
            className="w-full pl-10 pr-4 py-1.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-xl text-xs transition-all outline-hidden text-[#ffffff]"
          />
        </div>
      </div>

      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-350 cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 text-white" />
        </button>
        <span className="font-extrabold text-xs text-blue-500 tracking-tight">APEX SACCO</span>
      </div>

      {/* Actionable Section */}
      <div className="flex items-center gap-4 ml-auto">
        
        {/* Security Badge Indicator */}
        <div className="hidden md:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] text-emerald-400 font-mono">
          <CheckCircle className="w-3 h-3 text-emerald-400 font-bold" />
          <span>AES-256 SECURED</span>
        </div>

        {/* Subtle inactivity countdown timer */}
        {secondsRemaining !== undefined && secondsRemaining !== null && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg animate-pulse" id="header-countdown-timer">
            <Clock className="w-3.5 h-3.5 text-rose-400 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
            <span className="text-[10px] sm:text-xs font-mono font-bold text-rose-400 flex items-center gap-1 leading-none shrink-0">
              Session expires in {secondsRemaining}s
            </span>
            <button
              onClick={onExtendSession}
              type="button"
              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-mono cursor-pointer transition-colors shrink-0"
              title="Extend your session for another 15 minutes"
            >
              Extend
            </button>
          </div>
        )}

        {/* Quick Deposit Trigger (M-Pesa simulator shorthand) */}
        <div className="relative">
          <button 
            onClick={() => onQuickAction('deposit')}
            className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-emerald-600/10 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>M-Pesa Push</span>
          </button>
        </div>

        {/* Theme Toggler Switch Option (Light/Dark mode) */}
        <button 
          onClick={toggleTheme}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-9 h-9 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 rounded-lg flex items-center justify-center text-slate-350 transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-[#3b82f6]" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="w-9 h-9 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 rounded-lg flex items-center justify-center text-slate-350 transition-all cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-[#101726] border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-slate-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-widest text-[#94a3b8]">Alert Notification Hub</span>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium font-mono"
                >
                  Mark all read
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleMarkOneRead(notif.id)}
                    className={`text-xs p-2 rounded-lg transition-colors cursor-pointer ${notif.unread ? 'bg-slate-850/40 hover:bg-slate-850' : 'hover:bg-slate-900/30'}`}
                  >
                    <div className="flex justify-between font-bold text-slate-100">
                      <span className={`${notif.unread ? 'text-white' : 'text-slate-400'} truncate pr-1`}>{notif.title}</span>
                      {notif.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-none animate-pulse"></span>}
                    </div>
                    <p className={`text-[11px] leading-snug mt-0.5 ${notif.unread ? 'text-slate-300' : 'text-slate-500'}`}>{notif.desc}</p>
                    <span className="text-[9px] text-slate-500 block text-right mt-1 font-mono">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Profile dropdown visual */}
        <div className="relative">
          <button 
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="flex items-center gap-2 hover:bg-slate-900/40 p-1 rounded-lg transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 uppercase">
              {fullName.charAt(0)}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-white leading-none">{fullName}</div>
              <div className="text-[10px] text-slate-400 leading-none mt-1 font-semibold">{role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2.5 w-56 bg-[#101726] border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-slate-200">
              <div className="space-y-2 text-xs">
                <div className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-widest mb-1">Session Info</div>
                <div className="truncate text-white font-bold">{fullName}</div>
                <div className="text-slate-400 flex justify-between">
                  <span>Authorized Role:</span>
                  <span className="font-bold text-slate-200">{role}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex flex-col gap-1.5">
                  <button onClick={() => { onQuickAction('deposit'); setShowProfile(false); }} className="text-left py-1 hover:text-white cursor-pointer hover:bg-slate-900/30 px-1 rounded flex items-center gap-1.5 text-slate-350">
                    <PiggyBank className="w-3.5 h-3.5 text-slate-400" />
                    Make Savings deposit
                  </button>
                  <button onClick={() => { onQuickAction('applyLoan'); setShowProfile(false); }} className="text-left py-1 hover:text-white cursor-pointer hover:bg-slate-900/30 px-1 rounded flex items-center gap-1.5 text-slate-350">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    Request SME Loan Credit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
