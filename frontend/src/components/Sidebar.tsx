import React from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Map, 
  Trophy, 
  BarChart3, 
  AlertTriangle,
  UserCheck,
  Shield
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, settings } = useApp();
  const { t } = useTranslation(settings.language);
  if (!currentUser) return null;

  const getNavItems = () => {
    const role = currentUser.role;
    const items = [
      { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, roles: ['Citizen', 'Validator', 'Officer', 'Admin'] },
      { id: 'report', label: t('reportIssue'), icon: PlusCircle, roles: ['Citizen'] },
      { id: 'map', label: t('interactiveMap'), icon: Map, roles: ['Citizen', 'Validator', 'Officer', 'Admin'] },
      { id: 'gamification', label: t('gamification'), icon: Trophy, roles: ['Citizen', 'Validator'] },
      { id: 'alerts', label: t('predictiveAlerts'), icon: AlertTriangle, roles: ['Officer', 'Admin', 'Validator'] },
      { id: 'analytics', label: t('analytics'), icon: BarChart3, roles: ['Citizen', 'Validator', 'Officer', 'Admin'] },
      { id: 'admin', label: 'Admin Panel', icon: Shield, roles: ['Admin'] },
    ];
    return items.filter(item => item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Desktop Sidebar (Left Docked) */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-white/10 p-4 min-h-[calc(100vh-76px)]">
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-glow-primary/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105 text-slate-500 group-hover:text-slate-300'
                }`} />
                <span>{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              </button>
            );
          })}
        </nav>

        {/* User Card inside Sidebar Footer */}
        <div className="mt-auto border-t border-white/5 pt-4">
          <div className="p-4.5 rounded-xl bg-slate-950/60 border border-white/5 text-center">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-brand-500/10 mb-2">
              <UserCheck className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-300">{currentUser.name}</h4>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mt-1">{currentUser.role} Account</p>
            {currentUser.role !== 'Officer' && currentUser.role !== 'Admin' && (
              <div className="mt-2.5 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(currentUser.xp % 100)}%` }} 
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Bar (Bottom Sticky) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10 flex justify-around py-2.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition ${
                isActive ? 'text-brand-300 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
