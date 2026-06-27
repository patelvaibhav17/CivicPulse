import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Settings, Award, Layers, Zap, LogOut } from 'lucide-react';
import type { UserRole } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { 
    currentUser, 
    changeRole, 
    notifications, 
    markNotificationRead, 
    clearNotifications,
    logoutUser
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRoleChange = (role: UserRole) => {
    changeRole(role);
    setShowRoleDropdown(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-brand-600 to-brand-400 p-2.5 rounded-xl shadow-glow-primary flex items-center justify-center animate-pulse-slow">
          <Zap className="w-5 h-5 text-white fill-white/20" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-xl tracking-wide bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
            CivicPulse
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-brand-400/80">Hyperlocal Engagement</p>
        </div>
      </div>

      {/* Center Role-Switcher Dropdown for evaluation convenience */}
      <div className="relative">
        <button 
          onClick={() => setShowRoleDropdown(!showRoleDropdown)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-sm font-semibold transition"
        >
          <Layers className="w-4 h-4 text-brand-400" />
          <span className="text-slate-300">View As:</span>
          <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-lg text-xs">
            {currentUser.role}
          </span>
        </button>

        {showRoleDropdown && (
          <div className="absolute top-full mt-2 left-0 w-52 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-2 flex flex-col gap-1 z-50">
            <p className="text-[10px] text-slate-500 font-bold px-3 py-1 uppercase">Switch Sandbox Role</p>
            {(['Citizen', 'Validator', 'Officer', 'Admin'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${
                  currentUser.role === r 
                    ? 'bg-brand-600 text-white font-medium' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {r}
                {currentUser.role === r && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Stats and Navigation */}
      <div className="flex items-center gap-4">
        {/* XP Counter */}
        {currentUser.role !== 'Officer' && currentUser.role !== 'Admin' && (
          <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-brand-950 to-brand-900/40 border border-brand-500/20 px-4.5 py-1.5 rounded-xl shadow-glow-primary/10">
            <Award className="w-4 h-4 text-brand-400" />
            <div className="text-xs">
              <p className="font-bold text-slate-200">{currentUser.xp} XP</p>
              <p className="text-[9px] text-brand-300 uppercase tracking-wider font-semibold">
                {currentUser.role === 'Validator' ? 'TRUST RATED' : `STREAK: ${currentUser.streakCount}D`}
              </p>
            </div>
          </div>
        )}

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowRoleDropdown(false);
            }}
            className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 transition relative"
          >
            <Bell className="w-4.5 h-4.5 text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                <h3 className="text-xs font-bold text-slate-300">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={clearNotifications}
                    className="text-[10px] text-brand-400 hover:text-brand-300 hover:underline transition"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No new alerts or notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 text-xs transition cursor-pointer hover:bg-slate-850 ${
                        !n.read ? 'bg-brand-950/20 border-l-2 border-brand-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1 mb-1">
                        <span className="font-semibold text-slate-200">{n.title}</span>
                        <span className="text-[9px] text-slate-500 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings Toggle */}
        <button 
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 transition"
          title="App Settings"
        >
          <Settings className="w-4.5 h-4.5 text-slate-300" />
        </button>

        {/* Log Out Icon */}
        <button 
          onClick={logoutUser}
          className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/20 text-slate-300 hover:text-rose-450 transition"
          title="Log Out Session"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>

        {/* User Info Capsule */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
            <p className="text-[9px] text-slate-400">{currentUser.ward}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow-inner">
            {currentUser.name.split(' ').map(n=>n[0]).join('')}
          </div>
        </div>
      </div>
    </header>
  );
};
