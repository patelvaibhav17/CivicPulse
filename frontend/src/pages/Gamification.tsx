import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { Award, Download, Flame, Trophy, Star, Clock, Calendar } from 'lucide-react';
import { jsPDF } from 'jspdf';

export const Gamification: React.FC = () => {
  const { currentUser, allUsers, issues, settings } = useApp();
  const { t } = useTranslation(settings.language);
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'monthly' | 'alltime'>('alltime');
  if (!currentUser) return null;

  // Compute leaderboard by tab
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  const getUserXPInPeriod = (uid: string, periodMs: number) => {
    return issues
      .filter(i => i.reportedBy === uid && (now - new Date(i.createdAt).getTime()) < periodMs)
      .length * 10 +
    issues
      .filter(i => i.verifiers.includes(uid) && (now - new Date(i.createdAt).getTime()) < periodMs)
      .length * 5;
  };

  const leaderboardUsers = [...allUsers]
    .filter(u => u.role === 'Citizen' || u.role === 'Validator')
    .map(u => ({
      ...u,
      displayXP: leaderboardTab === 'alltime'
        ? u.xp
        : leaderboardTab === 'monthly'
          ? getUserXPInPeriod(u.uid, monthMs)
          : getUserXPInPeriod(u.uid, weekMs)
    }))
    .sort((a, b) => b.displayXP - a.displayXP);

  // All 9 badge types with unlock conditions for display
  const ALL_BADGE_TYPES = [
    { id: 'first_report', name: 'First Report', icon: '🌱', condition: '1 report submitted' },
    { id: 'pothole_spotter', name: 'Pothole Spotter', icon: '🕳️', condition: '2+ pothole reports' },
    { id: 'water_guardian', name: 'Water Guardian', icon: '💧', condition: 'Report water leak' },
    { id: 'waste_warrior', name: 'Waste Warrior', icon: '♻️', condition: 'Report waste issue' },
    { id: 'community_guardian', name: 'Community Guardian', icon: '🛡️', condition: '10+ verifications' },
    { id: 'problem_solver', name: 'Problem Solver', icon: '🔧', condition: 'First issue resolved' },
    { id: 'level_bronze', name: 'Bronze Contributor', icon: '🥉', condition: 'Reach 150 XP' },
    { id: 'level_silver', name: 'Silver Guardian', icon: '🥈', condition: 'Reach 500 XP' },
    { id: 'level_gold', name: 'Gold Champion', icon: '🥇', condition: 'Reach 1000 XP' },
  ];

  // Generate Civic Certificate PDF
  const handleGenerateCertificate = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4' // 297 x 210
      });

      // Background Border
      doc.setDrawColor(139, 92, 246); // Brand violet
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 277, 190);

      doc.setDrawColor(30, 41, 59); // Slate-800
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 273, 186);

      // Certificate Header
      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(26);
      doc.text('CIVIC HERO CERTIFICATE', 148, 40, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('CIVICPULSE engagements & local problem resolutions', 148, 47, { align: 'center' });

      // Graphic line
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(1);
      doc.line(100, 53, 197, 53);

      // Certificate Body
      doc.setFontSize(14);
      doc.text('This official citation of civic merit is awarded to:', 148, 75, { align: 'center' });

      // User name
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(139, 92, 246);
      doc.text(currentUser.name.toUpperCase(), 148, 93, { align: 'center' });

      // Recognition text
      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(12.5);
      
      const details = `For exceptional and consecutive civic contributions in ${currentUser.ward || 'Anand Wards'}. 
Through active reporting of municipal infrastructure hazards, community validation, and collaborative 
engagement, they have accumulated a total of ${currentUser.xp} Experience Points (XP) with a 
trust score of ${currentUser.trustScore}%, directly fostering a safer, cleaner, and more resilient community.`;
      
      const splitDetails = doc.splitTextToSize(details, 220);
      doc.text(splitDetails, 148, 110, { align: 'center' });

      // Footer seals & signatures
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.5);
      // Signature left
      doc.line(45, 160, 105, 160);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('MUNICIPAL COMMISSIONER', 75, 165, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.text('Govt of India Urban Dev.', 75, 170, { align: 'center' });

      // Signature right
      doc.line(192, 160, 252, 160);
      doc.setFont('Helvetica', 'bold');
      doc.text('CIVICPULSE ADMINISTRATION', 222, 165, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.text('Verified Digital Signature', 222, 170, { align: 'center' });

      // Gold Medal graphic placement simulation
      doc.setFillColor(245, 158, 11);
      doc.ellipse(148, 160, 10, 10, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('SEAL', 148, 162.5, { align: 'center' });

      doc.save(`${currentUser.name}_Civic_Hero_Certificate.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400/10 shrink-0" />;
    if (index === 1) return <Star className="w-5 h-5 text-slate-350 fill-slate-300/10 shrink-0" />;
    if (index === 2) return <Star className="w-5 h-5 text-amber-600 fill-amber-600/10 shrink-0" />;
    return <span className="w-5 font-bold text-slate-500 text-center text-xs shrink-0">{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Level Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Level details & Streak */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-40 h-40 rounded-full bg-brand-500/15 blur-2xl pointer-events-none" />
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">Citizen Standing</p>
              <h2 className="font-display font-extrabold text-2xl text-slate-100 mt-1">
                Level {Math.floor(currentUser.xp / 100) + 1} Contributor
              </h2>
            </div>
            
            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 px-3.5 py-1.5 rounded-xl text-rose-400">
              <Flame className="w-4.5 h-4.5 fill-rose-500/10 animate-bounce" />
              <div className="text-left leading-none">
                <span className="text-xs font-black block">{currentUser.streakCount} Day Streak</span>
                <span className="text-[8px] uppercase font-bold text-rose-500/80">Multiplier: 1.2x</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>Progress to Level {Math.floor(currentUser.xp / 100) + 2}</span>
              <span>{currentUser.xp % 100} / 100 XP</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-white/5 p-0.5">
              <div 
                className="bg-gradient-to-r from-brand-600 to-indigo-500 h-full rounded-full transition-all duration-500 shadow-glow-primary"
                style={{ width: `${(currentUser.xp % 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Certificate Claim card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-brand-500/25 bg-brand-950/10">
          <div className="flex gap-3">
            <div className="p-3 bg-brand-500/15 border border-brand-500/20 text-brand-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-200">Municipal Citation</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Download your official PDF recognition signed by the Municipal Council for contributing.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateCertificate}
            className="w-full mt-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-extrabold rounded-xl shadow-glow-primary/20 transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download Certificate (PDF)
          </button>
        </div>
      </div>

      {/* Badges and Leaderboard block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Badges Drawer */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-display font-extrabold text-sm text-slate-100 uppercase tracking-wide">
            {t('badgesTitle')} ({currentUser.badges.length}/{ALL_BADGE_TYPES.length} unlocked)
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ALL_BADGE_TYPES.map((badge) => {
              const isUnlocked = currentUser.badges.some(b => b.id === badge.id);
              const unlockedBadge = currentUser.badges.find(b => b.id === badge.id);
              return (
                <div 
                  key={badge.id}
                  className={`p-4 border rounded-2xl flex flex-col items-center text-center gap-2 transition ${
                    isUnlocked 
                      ? 'border-brand-500/30 bg-brand-950/10 text-slate-200' 
                      : 'border-white/5 bg-slate-950/10 text-slate-600 opacity-50'
                  }`}
                >
                  <span className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-60'}`}>{badge.icon}</span>
                  <div>
                    <h4 className={`text-xs font-bold ${isUnlocked ? 'text-brand-300' : 'text-slate-500'}`}>{badge.name}</h4>
                    <p className="text-[9.5px] text-slate-500 mt-1 leading-snug">
                      {isUnlocked ? (unlockedBadge?.description || badge.condition) : `🔒 ${badge.condition}`}
                    </p>
                  </div>
                  {isUnlocked && (
                    <span className="text-[8px] bg-brand-500/20 text-brand-300 font-extrabold px-1.5 py-0.5 rounded border border-brand-500/20 uppercase mt-1">
                      Unlocked ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Leaderboard */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-display font-extrabold text-sm text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/10" />
            {t('leaderboardTitle')}
          </h3>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-950/60 rounded-xl p-1">
            {([['weekly', '7D', Clock], ['monthly', '30D', Calendar], ['alltime', 'All', Trophy]] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setLeaderboardTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition ${
                  leaderboardTab === tab
                    ? 'bg-brand-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-white/5">
            {leaderboardUsers.map((user, idx) => (
              <div 
                key={user.uid}
                className={`py-3.5 flex items-center gap-3.5 transition ${
                  currentUser.uid === user.uid ? 'bg-brand-950/10 border-y border-brand-500/10 px-2' : ''
                }`}
              >
                {getRankBadge(idx)}
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-bold truncate ${
                    currentUser.uid === user.uid ? 'text-brand-300' : 'text-slate-300'
                  }`}>
                    {user.name}
                  </h4>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{user.ward}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-200 block">{user.displayXP}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
export default Gamification;
