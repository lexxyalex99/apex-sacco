import React, { useState } from 'react';
import { 
  Building, 
  Percent, 
  Users, 
  Smartphone, 
  CheckCircle, 
  ShieldAlert, 
  Save, 
  Info,
  Scale
} from 'lucide-react';
import { SACCOSettings } from '../types';

interface SettingsViewProps {
  settings: SACCOSettings;
  onUpdateSettings: (payload: Partial<SACCOSettings>) => Promise<any>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function SettingsView({ settings, onUpdateSettings, theme, setTheme }: SettingsViewProps) {
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

    </div>
  );
}
