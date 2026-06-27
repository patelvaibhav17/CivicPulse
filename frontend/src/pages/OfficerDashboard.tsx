import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { 
  ShieldAlert, 
  MapPin, 
  Clock, 
  CheckCircle,
  Edit3,
  Check,
  AlertTriangle
} from 'lucide-react';
import type { Issue, Status, Category, Severity } from '../types';

export const OfficerDashboard: React.FC = () => {
  const { issues, currentUser, updateIssueStatus, addComment } = useApp();
  const { t } = useTranslation(useApp().settings.language);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issues[0]?.id || null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [selectedIssueId]);
  
  // Status editing form state
  const [targetStatus, setTargetStatus] = useState<Status>('ASSIGNED');
  const [updateNotes, setUpdateNotes] = useState('');
  const [etaDays, setEtaDays] = useState('2');
  const [progressPhoto, setProgressPhoto] = useState('');

  // AI manual override state
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState<Category>('POTHOLE');
  const [overrideSeverity, setOverrideSeverity] = useState<Severity>('HIGH');
  const [overrideNote, setOverrideNote] = useState('');

  if (!currentUser) return null;

  const activeIssue = issues.find(i => i.id === selectedIssueId);

  // Priority Score Algorithm
  const calculatePriorityScore = (issue: Issue): number => {
    let score = 0;
    
    // 1. Severity weight
    if (issue.severity === 'CRITICAL') score += 45;
    else if (issue.severity === 'HIGH') score += 30;
    else if (issue.severity === 'MEDIUM') score += 15;
    else score += 5;

    // 2. Verification weight
    score += Math.min(issue.verificationCount * 5, 25);

    // 3. Upvotes weight
    score += Math.min(issue.upvotes * 1.5, 20);

    // 4. Age weight (unresolved hours simulation)
    const hours = (Date.now() - new Date(issue.createdAt).getTime()) / (3600 * 1000);
    score += Math.min(hours * 0.2, 10);

    return Math.min(Math.round(score), 100);
  };

  // Sort queue by priority score (descending)
  const workQueue = [...issues]
    .filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED')
    .map(i => {
      const hoursOld = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
      const isEscalated = hoursOld > 48 && i.severity === 'CRITICAL';
      return { ...i, priorityScore: calculatePriorityScore(i), isEscalated, hoursOld: Math.round(hoursOld) };
    })
    .sort((a, b) => {
      // Escalated items always float to top
      if (a.isEscalated && !b.isEscalated) return -1;
      if (!a.isEscalated && b.isEscalated) return 1;
      return b.priorityScore - a.priorityScore;
    });

  const handleUpdateStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId || !activeIssue) return;
    
    let note = updateNotes;
    if (targetStatus === 'ASSIGNED') {
      note = `Assigned to department. Resolution target: ${etaDays} days. Note: ${updateNotes}`;
    }

    updateIssueStatus(selectedIssueId, targetStatus, note, progressPhoto);
    setUpdateNotes('');
    setProgressPhoto('');
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId || !activeIssue) return;

    // Simulate override by pushing audit log comment & altering properties directly
    // This demonstrates manual editing with logs
    const auditText = `Manual classification override by Officer ${currentUser.name}. Category adjusted from [${activeIssue.category}] to [${overrideCategory}], severity adjusted from [${activeIssue.severity}] to [${overrideSeverity}]. Reason: "${overrideNote}"`;
    
    activeIssue.category = overrideCategory;
    activeIssue.severity = overrideSeverity;
    activeIssue.department = overrideCategory === 'POTHOLE' || overrideCategory === 'ROAD_DAMAGE' ? 'Roads & Infrastructure' : 
                             overrideCategory === 'WATER_LEAK' ? 'Water & Sanitation' :
                             overrideCategory === 'WASTE' ? 'Waste Management' : 'Electricity';

    addComment(selectedIssueId, auditText);
    setShowOverridePanel(false);
    setOverrideNote('');
  };

  const getSeverityStyle = (sev: Severity) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'LOW': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Side: Intelligent Work Queue */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-display font-extrabold text-sm text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-400" />
            Work Queue ({workQueue.length})
          </h3>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Sorted by Priority</span>
        </div>

        <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
          {workQueue.length === 0 ? (
            <div className="glass-panel p-8 text-center text-xs text-slate-500 rounded-2xl">
              All queue items completed! Great work.
            </div>
          ) : (
            workQueue.map((issue) => {
              const priority = issue.priorityScore;
              const severityColor = getSeverityStyle(issue.severity);
              const isActive = selectedIssueId === issue.id;

              return (
                <div
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssueId(issue.id);
                    setShowOverridePanel(false);
                  }}
                  className={`glass-card rounded-2xl p-4.5 cursor-pointer border transition flex gap-3.5 items-start ${
                    issue.isEscalated
                      ? 'border-rose-500/40 bg-rose-950/10'
                      : isActive 
                        ? 'border-brand-500/60 bg-brand-950/10 shadow-glow-primary/5' 
                        : 'border-white/5 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Priority indicator ring */}
                  <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-slate-900 border border-white/5">
                    <span className="text-xs font-black text-slate-100">{priority}</span>
                    <span className="text-[7px] text-slate-500 uppercase tracking-wider absolute bottom-1">Pri</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                      <span className="text-[9.5px] font-extrabold text-brand-400 uppercase tracking-wider">{t(issue.category)}</span>
                      <div className="flex items-center gap-1">
                        {issue.isEscalated && (
                          <span className="text-[8px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded animate-pulse">
                            🚨 ESCALATED
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${severityColor}`}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-200 text-xs truncate leading-snug">{issue.title}</h4>
                    <p className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {issue.location.address}
                    </p>
                    {issue.isEscalated && (
                      <p className="text-[9px] text-rose-400 mt-0.5 font-semibold">
                        ⏱ Unresolved for {issue.hoursOld}h — Immediate action required
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side: Detailed Incident Control Center */}
      <div className="lg:col-span-2">
        {activeIssue ? (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded uppercase tracking-widest">
                    AI PRIORITY INCIDENT: {activeIssue.id}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                    activeIssue.status === 'SUBMITTED' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                    activeIssue.status === 'VERIFIED' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                  }`}>
                    Status: {activeIssue.status}
                  </span>
                </div>
                <h2 className="font-display font-extrabold text-lg text-slate-100">{activeIssue.title}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-500" /> Reported by {activeIssue.reportedByName} on {new Date(activeIssue.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setShowOverridePanel(!showOverridePanel);
                    setOverrideCategory(activeIssue.category);
                    setOverrideSeverity(activeIssue.severity);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-white/5 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4 text-slate-400" />
                  Override AI
                </button>
              </div>
            </div>

            {/* Overrides form modal */}
            {showOverridePanel && (
              <div className="glass-panel p-5 rounded-2xl border border-brand-500/30 bg-brand-950/5 animate-in slide-in-from-top-3 duration-250">
                <h4 className="font-display font-bold text-sm text-slate-200 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-orange-400" />
                  AI Classification Override
                </h4>
                <form onSubmit={handleOverrideSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Adjust Category</label>
                      <select
                        value={overrideCategory}
                        onChange={(e) => setOverrideCategory(e.target.value as Category)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="POTHOLE">Pothole</option>
                        <option value="WATER_LEAK">Water Leak</option>
                        <option value="STREETLIGHT">Streetlight</option>
                        <option value="WASTE">Waste Management</option>
                        <option value="SEWAGE">Sewage Leak</option>
                        <option value="ROAD_DAMAGE">Road Damage</option>
                        <option value="OTHER">Other Hazard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Adjust Severity</label>
                      <select
                        value={overrideSeverity}
                        onChange={(e) => setOverrideSeverity(e.target.value as Severity)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Reason for Override (Audit Log)</label>
                    <input
                      type="text"
                      placeholder="Visual depth check shows pothole is shallow..."
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowOverridePanel(false)}
                      className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white rounded-lg transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Overrides
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Split layout: Image & Metadata details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Media Card */}
              {activeIssue.mediaUrls && activeIssue.mediaUrls.length > 0 && (
                <div className="glass-panel rounded-2xl p-4 space-y-4">
                  <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                    Evidence Media
                  </h4>
                  <div className="rounded-xl overflow-hidden bg-black aspect-video relative border border-white/5">
                    <img
                      src={activeIssue.mediaUrls[activePhotoIndex] || activeIssue.mediaUrls[0]}
                      alt="Incident Documentation"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {activeIssue.mediaUrls.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10">
                      {activeIssue.mediaUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                            activePhotoIndex === idx
                              ? 'border-brand-500 shadow-glow-primary/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-3 bg-slate-950/60 rounded-xl text-xs space-y-1">
                    <p><span className="text-slate-500">Address:</span> <span className="text-slate-300 font-semibold">{activeIssue.location.address}</span></p>
                    <p><span className="text-slate-500">Coordinates:</span> <span className="text-slate-300">{activeIssue.location.coordinates.join(', ')}</span></p>
                  </div>
                </div>
              )}

              {/* Status Update Form */}
              <div className="glass-panel rounded-2xl p-5 space-y-4">
                <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                  Update Issue State
                </h4>
                <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Advance Status To</label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value as Status)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="ASSIGNED">Assigned (Set Department & ETA)</option>
                      <option value="IN_PROGRESS">In Progress (Active Maintenance)</option>
                      <option value="RESOLVED">Resolved (Work Completed)</option>
                    </select>
                  </div>

                  {targetStatus === 'ASSIGNED' && (
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Target ETA (Days)</label>
                      <select
                        value={etaDays}
                        onChange={(e) => setEtaDays(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="1">1 Day (Critical)</option>
                        <option value="2">2 Days (Standard)</option>
                        <option value="5">5 Days</option>
                        <option value="7">7 Days (General Repair)</option>
                      </select>
                    </div>
                  )}

                  {targetStatus === 'RESOLVED' && (
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Attach Completion Image URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://example.com/resolved_pothole.jpg"
                        value={progressPhoto}
                        onChange={(e) => setProgressPhoto(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">State Update Notes (Visible to Reporter)</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Roads division crew deployed with asphalt batching unit."
                      value={updateNotes}
                      onChange={(e) => setUpdateNotes(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-slate-200 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Apply Status Transition
                  </button>
                </form>
              </div>
            </div>

            {/* Audit log trail */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                Unified Lifecycle Audit Trail ({activeIssue.comments.length + activeIssue.progressUpdates.length})
              </h4>
              <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                {activeIssue.comments.map((comm) => (
                  <div key={comm.id} className="p-3 bg-slate-950/30 border border-white/5 rounded-xl text-xs">
                    <div className="flex justify-between items-center mb-1 text-[10.5px]">
                      <span className="font-extrabold text-slate-300">
                        {comm.author} <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 font-normal ml-1">{comm.authorRole}</span>
                      </span>
                      <span className="text-[9px] text-slate-500">{new Date(comm.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-400 mt-1 leading-relaxed">{comm.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl h-80">
            <ShieldAlert className="w-10 h-10 text-slate-600 mb-3" />
            <h4 className="font-bold text-slate-400">Officer Workspace Empty</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Select any incident in the work queue to review AI diagnostic categorizations, issue override adjustments, and update resolution lifecycle states.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
export default OfficerDashboard;
