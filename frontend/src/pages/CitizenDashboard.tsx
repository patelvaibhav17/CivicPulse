import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../utils/translations';
import { 
  FileText, 
  CheckSquare, 
  Percent, 
  MapPin, 
  Clock, 
  ChevronRight, 
  ThumbsUp, 
  MessageSquare, 
  PlusCircle
} from 'lucide-react';
import type { Issue, Status } from '../types';

interface CitizenDashboardProps {
  setActiveTab: (tab: string) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ setActiveTab }) => {
  const { 
    currentUser, 
    issues, 
    upvoteIssue, 
    verifyIssue, 
    addComment 
  } = useApp();

  const { t } = useTranslation(useApp().settings.language);

  const [activeSubTab, setActiveSubTab] = useState<'my_reports' | 'verify_nearby'>('my_reports');
  const [inspectIssue, setInspectIssue] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Verification form state
  const [verifyingIssueId, setVerifyingIssueId] = useState<string | null>(null);
  const [activeInspectPhotoIndex, setActiveInspectPhotoIndex] = useState(0);

  React.useEffect(() => {
    setActiveInspectPhotoIndex(0);
  }, [inspectIssue]);
  const [verificationNote, setVerificationNote] = useState('');
  const [verificationChoice, setVerificationChoice] = useState<boolean | null>(null);

  if (!currentUser) return null;

  // Filter lists
  const myReports = issues.filter(issue => issue.reportedBy === currentUser.uid);
  
  // Nearby issues are: reported in the same ward, reported by others, status SUBMITTED or UNDER_REVIEW
  const nearbyIssues = issues.filter(
    issue => 
      issue.reportedBy !== currentUser.uid && 
      issue.location.ward === currentUser.ward &&
      (issue.status === 'SUBMITTED' || issue.status === 'UNDER_REVIEW') &&
      !issue.verifiers.includes(currentUser.uid)
  );

  const handleOpenInspect = (issue: Issue) => {
    setInspectIssue(issue);
  };

  const handleCloseInspect = () => {
    setInspectIssue(null);
    setCommentText('');
  };

  const handlePostComment = (e: React.FormEvent, issueId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(issueId, commentText);
    
    // Refresh inspect issue state
    const updated = issues.find(i => i.id === issueId);
    if (updated) {
      setInspectIssue(updated);
    }
    setCommentText('');
  };

  const handleVerifySubmit = (issueId: string) => {
    if (verificationChoice === null) return;
    verifyIssue(issueId, verificationChoice, verificationNote || 'Verified physically at location.');
    
    setVerifyingIssueId(null);
    setVerificationNote('');
    setVerificationChoice(null);
    
    // Auto reopen inspect if viewing
    const updated = issues.find(i => i.id === issueId);
    if (updated) {
      setInspectIssue(updated);
    }
  };

  const getStatusStyle = (status: Status) => {
    switch (status) {
      case 'SUBMITTED': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'UNDER_REVIEW': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'VERIFIED': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'ASSIGNED': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'IN_PROGRESS': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'RESOLVED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'CLOSED': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid Banner: Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Profile Card */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-5 flex gap-4 items-center relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 rounded-full bg-brand-500/10 blur-xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-700 text-white font-extrabold flex items-center justify-center text-xl shadow-lg shrink-0">
            {currentUser.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-100">{currentUser.name}</h3>
            <p className="text-xs text-slate-400 font-semibold">{currentUser.ward}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg">
                Role: {currentUser.role}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Percent className="w-2.5 h-2.5" /> Trust: {currentUser.trustScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats Column 1 */}
        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reports Logged</p>
            <p className="font-display font-extrabold text-2xl text-slate-100">{currentUser.reportedCount}</p>
          </div>
        </div>

        {/* Stats Column 2 */}
        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verifications Made</p>
            <p className="font-display font-extrabold text-2xl text-slate-100">{currentUser.verifiedCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: List and Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Issues Selector Tabs */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Tab Selector */}
          <div className="flex gap-2 p-1 bg-slate-900 border border-white/5 rounded-2xl">
            <button
              onClick={() => { setActiveSubTab('my_reports'); handleCloseInspect(); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeSubTab === 'my_reports'
                  ? 'bg-brand-600 text-white shadow-glow-primary/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              My Reported Incidents ({myReports.length})
            </button>
            <button
              onClick={() => { setActiveSubTab('verify_nearby'); handleCloseInspect(); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 relative ${
                activeSubTab === 'verify_nearby'
                  ? 'bg-brand-600 text-white shadow-glow-primary/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Verify Nearby ({nearbyIssues.length})
              {nearbyIssues.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute right-3 top-3" />
              )}
            </button>
          </div>

          {/* Sub-tab 1: My Reports List */}
          {activeSubTab === 'my_reports' && (
            <div className="space-y-3">
              {myReports.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-slate-800 border border-white/5 text-slate-500 mb-3">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-300">No Reports Logged yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Help make your neighborhood safer. Report potholes, leaks, and waste instantly.
                  </p>
                  <button 
                    onClick={() => setActiveTab('report')}
                    className="mt-4 inline-flex items-center gap-2 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    <PlusCircle className="w-4 h-4" /> File New Incident
                  </button>
                </div>
              ) : (
                myReports.map((issue) => (
                  <div 
                    key={issue.id}
                    onClick={() => handleOpenInspect(issue)}
                    className={`glass-card rounded-2xl p-4.5 cursor-pointer flex gap-4 items-start ${
                      inspectIssue?.id === issue.id ? 'border-brand-500/50 bg-slate-800/40 shadow-glow-primary/5' : ''
                    }`}
                  >
                    {issue.mediaUrls?.[0] ? (
                      <img 
                        src={issue.mediaUrls[0]} 
                        alt="Issue thumbnail" 
                        className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 text-2xl">
                        🕳️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-extrabold text-brand-300 uppercase tracking-wider">{t(issue.category)}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getStatusStyle(issue.status)}`}>
                          {t(issue.status)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-200 text-sm truncate leading-snug">{issue.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" /> {issue.location.address}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 self-center" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sub-tab 2: Verify Nearby Queue */}
          {activeSubTab === 'verify_nearby' && (
            <div className="space-y-3">
              {nearbyIssues.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-slate-800 border border-white/5 text-slate-500 mb-3">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-300">Clean Ward Alert!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    There are currently no outstanding issues requiring validation in {currentUser.ward}.
                  </p>
                </div>
              ) : (
                nearbyIssues.map((issue) => (
                  <div 
                    key={issue.id}
                    className="glass-panel rounded-2xl p-5 border border-white/5 flex flex-col gap-4"
                  >
                    <div className="flex gap-4 items-start">
                      {issue.mediaUrls?.[0] && (
                        <img 
                          src={issue.mediaUrls[0]} 
                          alt="Unverified issue" 
                          className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                            Requires Verification
                          </span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" /> 
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-200 text-sm leading-snug">{issue.title}</h4>
                        <p className="text-[11.5px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                          {issue.description}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-600" /> {issue.location.address}
                        </p>
                      </div>
                    </div>

                    {/* Proximity Verification Drawer */}
                    {verifyingIssueId === issue.id ? (
                      <div className="p-4.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                        <h5 className="text-xs font-bold text-slate-300">Help Verify Incident Exists</h5>
                        
                        {/* Choice Radio Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => setVerificationChoice(true)}
                            className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                              verificationChoice === true
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-glow-success/5'
                                : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            ✔️ Yes, issue exists
                          </button>
                          <button
                            onClick={() => setVerificationChoice(false)}
                            className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                              verificationChoice === false
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                                : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            ❌ No, duplicate / fake
                          </button>
                        </div>

                        {/* Note Input */}
                        <input
                          type="text"
                          placeholder="Provide evidence notes (e.g. 'Pothole is ~15cm deep, blocked path')"
                          value={verificationNote}
                          onChange={(e) => setVerificationNote(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                        />

                        {/* Actions */}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setVerifyingIssueId(null)}
                            className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleVerifySubmit(issue.id)}
                            disabled={verificationChoice === null}
                            className="px-4 py-1.5 text-[10px] font-bold bg-brand-600 hover:bg-brand-500 disabled:bg-slate-850 disabled:text-slate-600 text-white rounded-lg transition"
                          >
                            Submit Verification
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 border-t border-white/5 pt-3.5 mt-1 justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">
                          Progress: {issue.verificationCount}/3 confirmation votes
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              upvoteIssue(issue.id);
                            }}
                            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                              issue.upvoters.includes(currentUser.uid)
                                ? 'bg-brand-600 border-brand-500 text-white font-bold'
                                : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Upvote ({issue.upvotes})
                          </button>
                          <button
                            onClick={() => {
                              setVerifyingIssueId(issue.id);
                              setVerificationChoice(null);
                            }}
                            className="px-4.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-700 hover:from-brand-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition"
                          >
                            Verify Incident (+5 XP)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Side: Issue Details Inspector Panel */}
        <div className="lg:col-span-1">
          {inspectIssue ? (
            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-24">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display font-extrabold text-sm text-slate-100 uppercase tracking-wider">
                  Incident Inspector
                </h3>
                <button
                  onClick={handleCloseInspect}
                  className="text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold"
                >
                  Close
                </button>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Incident Status</p>
                  <p className="text-xs font-extrabold text-slate-200 mt-0.5">{t(inspectIssue.status)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase border ${getStatusStyle(inspectIssue.status)}`}>
                  {inspectIssue.status}
                </span>
              </div>

              {/* Media Display */}
              {inspectIssue.mediaUrls && inspectIssue.mediaUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 aspect-video relative group">
                    <img
                      src={inspectIssue.mediaUrls[activeInspectPhotoIndex] || inspectIssue.mediaUrls[0]}
                      alt="Incident documentation"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {/* Overlay Category badge */}
                    <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-[9.5px] font-bold tracking-wider text-slate-200">
                      📂 {t(inspectIssue.category)}
                    </span>
                  </div>
                  {inspectIssue.mediaUrls.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10">
                      {inspectIssue.mediaUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveInspectPhotoIndex(idx)}
                          className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                            activeInspectPhotoIndex === idx
                              ? 'border-brand-500 shadow-glow-primary/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title & Desc */}
              <div>
                <h4 className="font-bold text-slate-100 text-base leading-tight">{inspectIssue.title}</h4>
                <p className="text-slate-400 text-xs mt-2.5 leading-relaxed">
                  {inspectIssue.description}
                </p>
              </div>

              {/* Reverse Geocoded address */}
              <div className="flex gap-2 items-start text-xs text-slate-400 bg-slate-850/30 p-3 rounded-xl border border-white/5">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-300">Geospatial Location</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">{inspectIssue.location.address}</p>
                  <p className="text-[9px] text-slate-500 mt-1">Ward: {inspectIssue.location.ward}</p>
                </div>
              </div>

              {/* AI Diagnostic breakdown */}
              <div className="p-4.5 rounded-xl bg-brand-950/20 border border-brand-500/25 space-y-2">
                <h5 className="text-[10px] text-brand-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  🤖 Gemini AI Analysis
                </h5>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
                  <div className="bg-slate-900/50 p-2 rounded-lg">
                    <span className="text-slate-500">Confidence Score</span>
                    <p className="font-extrabold text-slate-200 mt-0.5">{(inspectIssue.aiAnalysis.confidenceScore * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-slate-900/50 p-2 rounded-lg">
                    <span className="text-slate-500">Estimated Size</span>
                    <p className="font-extrabold text-slate-200 mt-0.5 truncate">{inspectIssue.aiAnalysis.estimatedDimensions.description || 'N/A'}</p>
                  </div>
                </div>

                <div className="text-[10.5px] leading-relaxed pt-1.5 border-t border-brand-500/10 space-y-1.5 text-slate-300">
                  <p><span className="font-bold text-brand-300">AI Risk Assessment:</span> {inspectIssue.aiAnalysis.riskDescription || 'None flagged'}</p>
                  <p><span className="font-bold text-brand-300">Department Routed:</span> {inspectIssue.aiAnalysis.suggestedDepartment}</p>
                  <p className="italic text-slate-400 font-sans">"{inspectIssue.aiAnalysis.officerSummary}"</p>
                </div>
              </div>

              {/* Comments drawer */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  Incidents Log ({inspectIssue.comments.length})
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {inspectIssue.comments.map((comm) => (
                    <div key={comm.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-white/5 text-[11px] leading-relaxed">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-300">{comm.author}</span>
                        <span className="text-[9px] text-slate-500">{new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-400">{comm.text}</p>
                    </div>
                  ))}
                </div>
                
                {/* Submit Comment */}
                <form onSubmit={(e) => handlePostComment(e, inspectIssue.id)} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contribute text updates..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl h-80 sticky top-24">
              <FileText className="w-10 h-10 text-slate-600 mb-3" />
              <h4 className="font-bold text-slate-400 text-sm">No Incident Selected</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                Select any incident from the reports list to inspect AI diagnostics, view status updates, and read comments.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default CitizenDashboard;
