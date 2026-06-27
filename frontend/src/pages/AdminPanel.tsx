import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shield, Users, Edit3, Check, X, FileText, Star } from "lucide-react";

type UserRole = "Citizen" | "Validator" | "Officer" | "Admin";

interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  ward: string;
  xp: number;
  reportedCount: number;
  verifiedCount: number;
  badges: { id: string; name: string; icon: string }[];
}

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Officer: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Validator: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  Citizen: "bg-slate-700/40 text-slate-300 border-slate-600/40"
};

export const AdminPanel: React.FC = () => {
  const { currentUser, allUsers } = useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("Citizen");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Fetch all users from backend
  useEffect(() => {
    const token = localStorage.getItem("civicpulse_token");
    fetch("/api/auth/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers(allUsers as any));
  }, [allUsers]);

  if (!currentUser || currentUser.role !== "Admin") {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
        <Shield className="w-12 h-12 text-rose-500/60" />
        <h2 className="font-display font-extrabold text-lg text-slate-200">Admin Access Required</h2>
        <p className="text-sm text-slate-400">This panel is restricted to Administrator accounts only.</p>
      </div>
    );
  }

  const handleStartEdit = (user: AdminUser) => {
    setEditingUid(user.uid);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async (uid: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("civicpulse_token");
      const res = await fetch(`/api/auth/admin/users/${uid}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: selectedRole })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: selectedRole } : u));
        setEditingUid(null);
      }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.ward.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "Admin").length,
    officers: users.filter(u => u.role === "Officer").length,
    validators: users.filter(u => u.role === "Validator").length,
    citizens: users.filter(u => u.role === "Citizen").length,
    totalXP: users.reduce((s, u) => s + u.xp, 0),
    totalReports: users.reduce((s, u) => s + u.reportedCount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 bg-gradient-to-r from-rose-950/20 to-slate-900/60 border border-rose-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl">
            <Shield className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-lg text-slate-100">Admin Control Panel</h2>
            <p className="text-xs text-slate-400">Manage user accounts, roles, and platform access</p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-rose-400/70 border border-rose-500/20 px-3 py-1.5 rounded-lg bg-rose-950/20">
          ?? RESTRICTED � Admin Only
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "text-brand-400" },
          { label: "Total XP Earned", value: stats.totalXP.toLocaleString(), icon: Star, color: "text-amber-400" },
          { label: "Reports Submitted", value: stats.totalReports, icon: FileText, color: "text-emerald-400" },
          { label: "Officers + Admins", value: stats.officers + stats.admins, icon: Shield, color: "text-rose-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel rounded-xl p-4 border border-white/5">
            <Icon className={`w-4.5 h-4.5 ${color} mb-2`} />
            <p className="font-display font-extrabold text-xl text-slate-100">{value}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or ward..."
          className="flex-1 bg-slate-900/70 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/40 transition"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="bg-slate-900/70 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-brand-500/40 transition"
        >
          <option value="all">All Roles ({stats.total})</option>
          <option value="Admin">Admin ({stats.admins})</option>
          <option value="Officer">Officer ({stats.officers})</option>
          <option value="Validator">Validator ({stats.validators})</option>
          <option value="Citizen">Citizen ({stats.citizens})</option>
        </select>
      </div>

      {/* User Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            User Accounts ({filteredUsers.length})
          </h3>
        </div>

        <div className="divide-y divide-white/5">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No users match your filters.</div>
          ) : (
            filteredUsers.map(user => (
              <div key={user.uid} className={`p-4 transition hover:bg-slate-800/20 ${user.uid === currentUser.uid ? 'bg-brand-950/10 border-l-2 border-brand-500' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                      {user.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-200 truncate">{user.name}</p>
                        {user.uid === currentUser.uid && (
                          <span className="text-[9px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded-md font-bold">YOU</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      <p className="text-[10px] text-slate-600">{user.ward}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-center shrink-0">
                    <div>
                      <p className="text-xs font-bold text-amber-300">{user.xp}</p>
                      <p className="text-[9px] text-slate-500 uppercase">XP</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-300">{user.reportedCount}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Reports</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-300">{user.verifiedCount}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Verified</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-300">{(user.badges || []).length}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Badges</p>
                    </div>
                  </div>

                  {/* Role Badge + Edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingUid === user.uid ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value as UserRole)}
                          className="bg-slate-900 border border-brand-500/40 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                        >
                          {(["Citizen", "Validator", "Officer", "Admin"] as UserRole[]).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveRole(user.uid)}
                          disabled={saving}
                          className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingUid(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${ROLE_COLORS[user.role]}`}>
                          {user.role}
                        </span>
                        {user.uid !== currentUser.uid && (
                          <button
                            onClick={() => handleStartEdit(user)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-white/5 rounded-lg transition"
                            title="Change role"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Badges strip */}
                {(user.badges || []).length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap pl-13">
                    {user.badges.map(b => (
                      <span key={b.id} className="text-xs" title={b.name}>{b.icon}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
