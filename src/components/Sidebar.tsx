import { 
  LayoutDashboard, 
  Users, 
  PiggyBank, 
  HandCoins, 
  History, 
  TrendingUp, 
  Activity, 
  Settings, 
  LogOut, 
  FileLock2,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types.js';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  role: UserRole;
  fullName: string;
  onLogout: () => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  collapsed, 
  setCollapsed, 
  role, 
  fullName, 
  onLogout 
}: SidebarProps) {

  // Sidebar mapping: name, icon, key, allowed roles
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, key: 'dashboard', roles: ['Admin', 'Loan Officer', 'Accountant', 'Member'] },
    { name: 'My Profile', icon: UserCheck, key: 'profile', roles: ['Admin', 'Loan Officer', 'Accountant', 'Member'] },
    { name: 'Member Profiles', icon: Users, key: 'members', roles: ['Admin', 'Loan Officer', 'Accountant'] },
    { name: 'Savings Portfolio', icon: PiggyBank, key: 'savings', roles: ['Admin', 'Loan Officer', 'Accountant'] },
    { name: 'Credit Loans', icon: HandCoins, key: 'loans', roles: ['Admin', 'Loan Officer', 'Accountant'] },
    { name: 'Transaction Logs', icon: History, key: 'transactions', roles: ['Admin', 'Loan Officer', 'Accountant'] },
    { name: 'System Analytics', icon: TrendingUp, key: 'analytics', roles: ['Admin', 'Loan Officer', 'Accountant'] },
    { name: 'Immutable Logs', icon: FileLock2, key: 'audit', roles: ['Admin'] },
    { name: 'SACCO Policies', icon: Settings, key: 'settings', roles: ['Admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`bg-[#0d1425] border-r border-[#1e293b]/50 text-[#e2e8f0] flex flex-col justify-between transition-all duration-300 relative ${
      collapsed 
        ? 'w-20 md:flex hidden' 
        : 'w-64 md:flex fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-0 shadow-2xl md:shadow-none'
    }`}>
      
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-12 bg-blue-600 hover:bg-blue-500 w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center text-white cursor-pointer select-none z-30"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div>
        {/* Core Sidebar Header Branding */}
        <div className="p-6 flex items-center gap-3 border-b border-[#1e293b]/40">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <span className="font-black text-white text-base">A</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-white leading-tight">APEX SACCO</span>
              <span className="text-[10px] font-mono text-blue-400 font-bold tracking-wider uppercase">Co-operative</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-4">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                id={`sidebar-item-${item.key}`}
                onClick={() => setCurrentTab(item.key)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                  isActive 
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/10' 
                    : 'text-slate-400 hover:bg-[#151e33] hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-blue-400 font-bold' : 'text-slate-450 group-hover:text-slate-200'}`} />
                {!collapsed && (
                  <span className="truncate">{item.name}</span>
                )}
                {!collapsed && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/55"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Quick Info Box & Logout Area */}
      <div className="p-3 border-t border-[#1e293b]/40">
        {!collapsed && (
          <div className="p-3 bg-[#131b2e]/60 rounded-xl border border-slate-800/60 mb-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs shrink-0 font-bold text-blue-400 uppercase">
              {fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{fullName}</div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <UserCheck className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                <span className="truncate">{role}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent transition-all cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout Account</span>}
        </button>
      </div>

    </aside>
  );
}
