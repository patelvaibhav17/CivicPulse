import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogIn, UserPlus, Mail, Phone, Lock, Zap, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '../types';

export const AuthScreen: React.FC = () => {
  const { loginUser, registerUser, allUsers } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  
  // Login states
  const [emailInput, setEmailInput] = useState(() => localStorage.getItem('prefilled_email') || '');

  React.useEffect(() => {
    localStorage.removeItem('prefilled_email');
  }, []);
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Citizen');
  const [regWard, setRegWard] = useState('Ward 1 (Vallabh Vidyanagar)');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailInput.trim() || !passwordInput.trim()) {
      setError('Please fill in both email and password.');
      return;
    }

    const res = await loginUser(emailInput, passwordInput);
    if (!res.success) {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim() || !regEmail.trim()) {
      setError("Name and Email are required fields.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Check if email already exists
    const duplicate = allUsers.find(u => u.email.toLowerCase() === regEmail.toLowerCase().trim());
    if (duplicate) {
      setError("An account with this email already exists.");
      return;
    }

    registerUser({
      name: regName,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
      role: regRole,
      ward: regWard
    });
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-650/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Brand logo banner */}
      <div className="flex flex-col items-center gap-2.5 mb-6 text-center z-10">
        <div className="bg-gradient-to-tr from-brand-600 to-brand-400 p-3 rounded-2xl shadow-glow-primary flex items-center justify-center animate-pulse-slow">
          <Zap className="w-7 h-7 text-white fill-white/20" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-slate-100">
            CivicPulse
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-brand-400">Hyperlocal Engagement Platform</p>
        </div>
      </div>

      {/* Auth Card container */}
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden z-10 backdrop-blur-glass">
        
        {/* Tabs switcher */}
        <div className="flex gap-2 p-1 bg-slate-950/60 border border-white/5 rounded-xl mb-6">
          <button
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-brand-600 text-white shadow-glow-primary/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-brand-600 text-white shadow-glow-primary/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register Account
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 mb-4 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 font-medium animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* SIGN IN TAB */}
        {activeTab === 'login' && (
          <div className="space-y-6">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Enter email e.g. aarav.patel@civicpulse.org"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 p-1 transition"
                  >
                    {showLoginPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-glow-primary/10"
              >
                Sign In <LogIn className="w-4 h-4" />
              </button>
            </form>

            <div className="border-t border-white/5 pt-4 text-center">
              <p className="text-[10px] text-slate-500 font-medium">
                💡 Default developer accounts use password: <code className="bg-slate-950 px-1 py-0.5 rounded text-brand-300 font-bold">password</code>
              </p>
            </div>
          </div>
        )}

        {/* REGISTER TAB */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Aarav Patel"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    placeholder="+91 98765..."
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="citizen@gmail.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Set Password
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="At least 6 chars"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 p-1"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 p-1"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Register Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Citizen">General Citizen</option>
                  <option value="Validator">Validator (Trust Rated)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Assigned Ward (Anand, GJ)
                </label>
                <select
                  value={regWard}
                  onChange={(e) => setRegWard(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none text-left"
                >
                  <option value="Ward 1 (Vallabh Vidyanagar)">Ward 1 (Vallabh Vidyanagar)</option>
                  <option value="Ward 2 (Amul Dairy Road)">Ward 2 (Amul Dairy Road)</option>
                  <option value="Ward 3 (Karamsad Area)">Ward 3 (Karamsad Area)</option>
                  <option value="Ward 4 (Lambhvel Area)">Ward 4 (Lambhvel Area)</option>
                  <option value="Ward 5 (Borsad Chowkdi)">Ward 5 (Borsad Chowkdi)</option>
                  <option value="Ward 6 (Ganesh Crossing)">Ward 6 (Ganesh Crossing)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-glow-primary/10"
            >
              Activate Account & Login <UserPlus className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
export default AuthScreen;
