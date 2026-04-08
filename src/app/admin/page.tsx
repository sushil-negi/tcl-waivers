"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Waiver {
  id: number;
  document_id: string;
  full_name: string;
  email: string;
  phone: string;
  team: string;
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  ip_address: string;
  signed_at: string;
  drive_file_id: string;
  drive_file_url: string;
  pdf_hash: string;
}

interface Stats {
  totalWaivers: number;
  teamBreakdown: { team: string; count: number }[];
  recentSignings: any[];
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<Waiver | null>(null);
  const [view, setView] = useState<"dashboard" | "waivers" | "teams">("dashboard");
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamDeleteConfirm, setTeamDeleteConfirm] = useState<string | null>(null);

  const authHeader = useCallback(
    () => ({ Authorization: `Bearer ${password}` }),
    [password]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
  }, [authHeader]);

  const fetchWaivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (teamFilter) params.set("team", teamFilter);

      const res = await fetch(`/api/admin/waivers?${params}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setWaivers(data.waivers);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, teamFilter, authHeader]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams", { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch {
      // ignore
    }
  }, [authHeader]);

  const handleExportCsv = async () => {
    try {
      const res = await fetch("/api/admin/export", { headers: authHeader() });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tcl-waivers-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  };

  const handleAddTeam = async () => {
    setTeamError("");
    if (!newTeamName.trim()) return;
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewTeamName("");
      fetchTeams();
      fetchStats();
    } else {
      setTeamError(data.error || "Failed to add team");
    }
  };

  const handleRemoveTeam = async (name: string) => {
    setTeamError("");
    const res = await fetch("/api/admin/teams", {
      method: "DELETE",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setTeamDeleteConfirm(null);
      fetchTeams();
      fetchStats();
    } else {
      setTeamError(data.error || "Failed to remove team");
      setTeamDeleteConfirm(null);
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setAuthError("Invalid password");
    }
  };

  const handleDelete = async (id: number, deleteDrive: boolean = false) => {
    const res = await fetch(`/api/admin/waivers/${id}?deleteDrive=${deleteDrive}`, {
      method: "DELETE",
      headers: authHeader(),
    });
    if (res.ok) {
      setDeleteConfirm(null);
      setDeleteModal(null);
      fetchWaivers();
      fetchStats();
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchStats();
      fetchWaivers();
      fetchTeams();
    }
  }, [authenticated, fetchStats, fetchWaivers, fetchTeams]);

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src="/tcl-logo.png" alt="TCL" width={40} height={40} />
            <h1 className="text-xl font-bold text-[#1E2533]">TCL Admin</h1>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 focus:bg-white mb-4"
          />
          {authError && (
            <p className="text-red-500 text-sm mb-4">{authError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-[#1E2533] text-white rounded-lg font-semibold hover:bg-[#2a3647] transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-[#1E2533] text-white py-4 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/tcl-logo.png" alt="TCL" width={40} height={40} />
            <div>
              <h1 className="text-lg font-bold">TCL Admin Panel</h1>
              <p className="text-orange-300 text-xs">Waiver Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "dashboard"
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView("waivers")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "waivers"
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              All Waivers
            </button>
            <button
              onClick={() => setView("teams")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "teams"
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Teams
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Dashboard View */}
        {view === "dashboard" && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Total Signed Waivers</p>
                <p className="text-4xl font-bold text-[#1E2533] mt-1">
                  {stats.totalWaivers}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Teams Represented</p>
                <p className="text-4xl font-bold text-orange-600 mt-1">
                  {stats.teamBreakdown.length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Total Registered Teams</p>
                <p className="text-4xl font-bold text-green-600 mt-1">
                  {teams.length}
                </p>
              </div>
            </div>

            {/* Waivers by Team Chart */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1E2533]">
                  Waivers by Team
                </h2>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> Signed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-8 h-0.5 bg-red-500 inline-block border-dashed" /> Min. 15
                  </span>
                </div>
              </div>
              {stats.teamBreakdown.length === 0 ? (
                <p className="text-gray-400 text-sm">No waivers signed yet</p>
              ) : (
                <div className="w-full" style={{ height: Math.max(350, stats.teamBreakdown.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.teamBreakdown}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="team"
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: any) => [
                          `${value} waiver${value !== 1 ? "s" : ""}`,
                          "Signed",
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                      <ReferenceLine
                        x={15}
                        stroke="#ef4444"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        label={{
                          value: "Min. 15",
                          position: "top",
                          fill: "#ef4444",
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {stats.teamBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.count >= 15 ? "#22c55e" : "#f97316"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent Signings */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-[#1E2533] mb-4">
                Recent Signings
              </h2>
              {stats.recentSignings.length === 0 ? (
                <p className="text-gray-400 text-sm">No waivers signed yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-semibold">Name</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-semibold">Email</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-semibold">Team</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-semibold">Signed</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-semibold">Doc ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentSignings.map((w: any) => (
                        <tr key={w.document_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{w.full_name}</td>
                          <td className="py-2 px-3 text-gray-600">{w.email}</td>
                          <td className="py-2 px-3">
                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                              {w.team || "—"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500">{w.signed_at}</td>
                          <td className="py-2 px-3 font-mono text-xs text-gray-400">{w.document_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Waivers List View */}
        {view === "waivers" && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchWaivers()}
                  placeholder="Search by name or email..."
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 focus:bg-white text-sm"
                />
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-sm"
                >
                  <option value="">All Teams</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchWaivers}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors text-sm"
                >
                  Search
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-6 py-2 bg-[#1E2533] text-white rounded-lg font-semibold hover:bg-[#2a3647] transition-colors text-sm"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : waivers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No waivers found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">Team</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">Phone</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">Signed</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">IP</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">PDF</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waivers.map((w) => (
                        <tr
                          key={w.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 font-medium text-gray-900">{w.full_name}</td>
                          <td className="py-3 px-4 text-gray-600">{w.email}</td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                              {w.team || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{w.phone}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs">{w.signed_at}</td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-400">{w.ip_address}</td>
                          <td className="py-3 px-4">
                            {w.drive_file_url ? (
                              <a
                                href={w.drive_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-600 hover:text-orange-800 underline text-xs font-medium"
                              >
                                View PDF
                              </a>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                              <button
                                onClick={() => setDeleteModal(w)}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-400">
                {waivers.length} waiver{waivers.length !== 1 ? "s" : ""} found
              </div>
            </div>
          </div>
        )}

        {/* Teams Management View */}
        {view === "teams" && (
          <div className="space-y-4">
            {/* Add Team */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-[#1E2533] mb-4">Add New Team</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                  placeholder="Enter team name..."
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 focus:bg-white text-sm"
                />
                <button
                  onClick={handleAddTeam}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors text-sm"
                >
                  Add Team
                </button>
              </div>
              {teamError && (
                <p className="text-red-500 text-sm mt-2">{teamError}</p>
              )}
            </div>

            {/* Teams List */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-[#1E2533] mb-4">
                All Teams ({teams.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {teams.map((team) => (
                  <div
                    key={team}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 group"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {team}
                    </span>
                    {teamDeleteConfirm === team ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRemoveTeam(team)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setTeamDeleteConfirm(null)}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setTeamDeleteConfirm(team)}
                        className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Waiver</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-900">
              <p><span className="font-semibold">Name:</span> {deleteModal.full_name}</p>
              <p><span className="font-semibold">Email:</span> {deleteModal.email}</p>
              <p><span className="font-semibold">Team:</span> {deleteModal.team || "N/A"}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm font-semibold mb-1">Warning</p>
              <ul className="text-red-700 text-xs space-y-1">
                <li>- This will permanently remove the waiver record from the database</li>
                <li>- The player will be able to sign a new waiver with the same email</li>
                <li>- This action cannot be undone</li>
              </ul>
            </div>

            <div className="space-y-2">
              {deleteModal.drive_file_id ? (
                <>
                  <button
                    onClick={() => handleDelete(deleteModal.id, true)}
                    className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    Delete from Database & Google Drive
                  </button>
                  <button
                    onClick={() => handleDelete(deleteModal.id, false)}
                    className="w-full py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Delete from Database Only (keep PDF in Drive)
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleDelete(deleteModal.id, false)}
                  className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete Waiver Record
                </button>
              )}
              <button
                onClick={() => setDeleteModal(null)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
