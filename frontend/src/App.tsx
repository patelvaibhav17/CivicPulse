import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ReportIssue } from './pages/ReportIssue';
import { Gamification } from './pages/Gamification';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { PredictiveAlerts } from './pages/PredictiveAlerts';
import { ImpactDashboard } from './pages/ImpactDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { InteractiveMap } from './components/InteractiveMap';
import { CivicBot } from './components/CivicBot';
import { AuthScreen } from './pages/AuthScreen';
import { MapPin, Eye, EyeOff, Layers, Settings, Globe, Zap, Lock as LockIcon } from 'lucide-react';

const App: React.FC = () => {
  const { currentUser, currentUserUid, issues, settings, saveSettings, logoutUser, updateCurrentUserProfile } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [_, setSelectedIssueId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showWardBoundaries, setShowWardBoundaries] = useState(false);

  // Settings Modal & Profile Update States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'system' | 'profile'>('system');
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // System Config States
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [simulatedModeInput, setSimulatedModeInput] = useState(false);
  const [languageInput, setLanguageInput] = useState<'en' | 'hi' | 'gu'>('en');

  // Profile & Security States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileWard, setProfileWard] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  useEffect(() => {
    if (settings) {
      setApiKeyInput(settings.geminiApiKey);
      setSimulatedModeInput(settings.simulatedAIMode);
      setLanguageInput(settings.language);
    }
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
      setProfilePhone(currentUser.phone || '');
      setProfileWard(currentUser.ward);
      // Don't pre-fill password — backend strips it from profile response
      // Leave blank: only send if user explicitly types a new one
      setProfilePassword('');
    }
  }, [settings, currentUser, showSettingsModal]);

  // Redirect to valid tab when user role changes
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'Officer' || role === 'Admin') {
      if (activeTab === 'report' || activeTab === 'gamification') {
        setActiveTab('dashboard'); // Redirect to officer queue
      }
    } else {
      if (activeTab === 'alerts') {
        setActiveTab('dashboard'); // Redirect to citizen view
      }
    }
    setSelectedIssueId(null);
  }, [currentUser?.role, activeTab]);

  const handleSaveSettings = () => {
    // 1. Save system config (only admin can change API settings)
    if (currentUser?.role === 'Admin') {
      saveSettings({
        ...settings,
        geminiApiKey: apiKeyInput,
        simulatedAIMode: simulatedModeInput,
        language: languageInput
      });
    } else {
      // Non-admins can only change language
      saveSettings({ ...settings, language: languageInput });
    }
    // 2. Save profile updates — only include password if user typed a new one
    if (currentUser) {
      const profileUpdates: Partial<import('./types').UserProfile> = {
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        ward: profileWard,
      };
      if (profilePassword.trim().length >= 6) {
        profileUpdates.password = profilePassword;
      }
      updateCurrentUserProfile(profileUpdates);
    }
    setShowSettingsModal(false);
  };

  // Gating access check
  if (!currentUserUid || !currentUser) {
    return <AuthScreen />;
  }

  // Handle selecting an issue from map/dashboard to view detail
  const handleSelectIssue = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      if (currentUser.role === 'Officer' || currentUser.role === 'Admin') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('dashboard');
      }
      setSelectedIssueId(issueId);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (currentUser.role === 'Officer' || currentUser.role === 'Admin') {
          return <OfficerDashboard />;
        }
        return (
          <CitizenDashboard 
            setActiveTab={setActiveTab} 
          />
        );
      
      case 'report':
        return <ReportIssue setActiveTab={setActiveTab} />;
      
      case 'gamification':
        return <Gamification />;
      
      case 'alerts':
        return <PredictiveAlerts />;
      
      case 'analytics':
        return <ImpactDashboard />;

      case 'admin':
        return <AdminPanel />;

      case 'map':
        return (
          <div className="space-y-4 h-[calc(100vh-170px)] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-400" />
                  Hyperlocal Geospatial Canvas
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Showing active and resolved incident reports</p>
              </div>

              {/* Map Layer Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    showHeatmap 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-glow-error/5'
                      : 'bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showHeatmap ? 'Hide Heatmap Density' : 'Show Density Heatmap'}
                </button>
                <button
                  onClick={() => setShowWardBoundaries(!showWardBoundaries)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    showWardBoundaries 
                      ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-glow-primary/5'
                      : 'bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {showWardBoundaries ? 'Hide Ward Boundaries' : 'Show Ward Boundaries'}
                </button>
              </div>
            </div>

            {/* Map wrapper container */}
            <div className="flex-1 min-h-0 relative">
              <InteractiveMap
                issues={issues}
                mode="view"
                showHeatmap={showHeatmap}
                showWardBoundaries={showWardBoundaries}
                onSelectIssue={handleSelectIssue}
              />
            </div>
          </div>
        );

      default:
        return <div className="p-8 text-center text-slate-500">View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Premium Header */}
      <Header onOpenSettings={() => setShowSettingsModal(true)} />
      
      {/* Sidebar & Core Panel container */}
      <div className="flex flex-1 relative">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-8 max-h-[calc(100vh-76px)] overflow-y-auto pb-24 md:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Persistent floating AI support Chatbot */}
      <CivicBot />

      {/* Re-designed Settings Modal with spacious dimensions, rendered at root level */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[520px] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Tab Selector Sidebar */}
            <div className="w-full md:w-56 bg-slate-950/40 border-r border-white/5 p-4 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-display font-extrabold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                    <Settings className="w-4.5 h-4.5 text-brand-400" />
                    Settings Panel
                  </h3>
                  <p className="text-[9px] text-slate-500 uppercase mt-0.5 tracking-wider">Control Center</p>
                </div>
                
                <nav className="flex flex-row md:flex-col gap-1.5">
                  <button
                    onClick={() => setSettingsTab('system')}
                    className={`flex-1 md:flex-initial text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      settingsTab === 'system'
                        ? 'bg-brand-600/20 border border-brand-500/30 text-brand-350 shadow-glow-primary/5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <Zap className="w-4 h-4" /> System Config
                  </button>
                  <button
                    onClick={() => setSettingsTab('profile')}
                    className={`flex-1 md:flex-initial text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      settingsTab === 'profile'
                        ? 'bg-brand-600/20 border border-brand-500/30 text-brand-350 shadow-glow-primary/5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <LockIcon className="w-4 h-4" /> Profile & Security
                  </button>
                </nav>
              </div>
              
              {/* Active user status tag */}
              <div className="hidden md:block p-3 rounded-xl bg-slate-900 border border-white/5 text-center">
                <p className="text-[9px] uppercase font-bold text-slate-500">Logged in as</p>
                <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{currentUser?.name}</p>
                <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">{currentUser?.role}</p>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 flex flex-col min-w-0 font-sans">
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/60">
                <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wide">
                  {settingsTab === 'system' ? 'System Configuration' : 'Profile & Security'}
                </h3>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              {/* Form Inputs Container */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0 bg-slate-950/10">
                {settingsTab === 'system' ? (
                  <>
                    {/* Language Selection */}
                    <div className="space-y-2">
                      <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Preferred Translation Language
                      </label>
                      <div className="flex gap-2.5">
                        {(['en', 'hi', 'gu'] as const).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => setLanguageInput(lang)}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                              languageInput === lang 
                                ? 'bg-brand-600/20 border-brand-500 text-brand-300 font-bold shadow-glow-primary/5' 
                                : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : 'ગુજરાતી'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gemini API & Simulation configuration - only accessible to Admin role */}
                    {currentUser.role === 'Admin' ? (
                      <>
                        {/* Gemini API Key */}
                        <div className="space-y-2">
                          <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                            Gemini API Studio Credentials
                          </label>
                          <input
                            type="password"
                            placeholder="AI Studio API Key (AI-xxxxx)"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                          />
                          <p className="text-[10px] text-slate-555 mt-1 leading-normal">
                            Live analysis uses this credentials directly on client-side requests. Retrieve keys at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Google AI Studio</a>.
                          </p>
                        </div>

                        {/* Toggle Simulated AI Mode */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-white/5">
                          <div>
                            <h4 className="text-xs font-bold text-slate-300">Simulate Offline AI Responses</h4>
                            <p className="text-[9px] text-slate-500 leading-normal mt-0.5">Toggle local mocks if live API rate limits are exceeded.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSimulatedModeInput(!simulatedModeInput)}
                            className={`w-12 h-6.5 rounded-full p-1 transition ${
                              simulatedModeInput ? 'bg-brand-600' : 'bg-slate-800'
                            }`}
                          >
                            <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition ${
                              simulatedModeInput ? 'translate-x-5.5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 text-center text-xs text-slate-500 space-y-2">
                        <p className="font-bold text-slate-400">🔒 Administrative Lock</p>
                        <p className="text-[10.5px] leading-relaxed text-slate-500">System configurations (Gemini API credentials & AI analysis mode) require Municipal Administrator privileges to view or edit.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Name & Email Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Phone & Ward Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Assigned Ward (Anand, GJ)
                        </label>
                        <select
                          value={profileWard}
                          onChange={(e) => setProfileWard(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
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

                    {/* Change Password Input */}
                    <div className="space-y-1.5 border-t border-white/5 pt-3.5">
                      <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Update Password
                        <span className="ml-1.5 font-normal text-slate-600 normal-case">(leave blank to keep current)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showProfilePassword ? 'text' : 'password'}
                          placeholder="Enter new password (min. 6 chars)"
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          autoComplete="new-password"
                          className="w-full bg-slate-950 border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfilePassword(!showProfilePassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 p-1"
                          title={showProfilePassword ? 'Hide password' : 'Show password'}
                        >
                          {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {profilePassword.length > 0 && profilePassword.length < 6 && (
                        <p className="text-[9px] text-rose-400 font-medium mt-1">⚠️ Password must be at least 6 characters.</p>
                      )}
                    </div>

                    {/* Quick Action - Logout */}
                    <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex justify-between items-center mt-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-rose-300">Session Security</h4>
                        <p className="text-[9px] text-rose-450 leading-normal mt-0.5">End active account session and delete local cache keys.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsModal(false);
                          logoutUser();
                        }}
                        className="px-3.5 py-1.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] rounded-lg transition"
                      >
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="bg-slate-950/20 border-t border-white/5 px-6 py-4 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-400 transition"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition shadow-glow-primary/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  };
  export default App;
