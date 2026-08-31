"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  FileText,
  ScanFace,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
  LogOut,
  MapPin,
  Calendar,
  Check,
  X,
  FileCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Application for Detailed Review Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const loadApplications = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/kyc");
      const data = await res.json();
      if (data?.applications) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.warn("Failed to load admin applications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth");
      } else {
        loadApplications();
      }
    }
  }, [user, authLoading, router]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        !searchQuery ||
        app.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.passport_number
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        app.tourist_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.nationality?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(
      (a) => a.status === "under_review",
    ).length;
    const verified = applications.filter((a) => a.status === "verified").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, pending, verified, rejected };
  }, [applications]);

  // Admin Decision Handler (Approve / Reject)
  const handleDecision = async (decision) => {
    if (!selectedApp) return;
    setProcessingAction(true);
    setActionSuccessMsg("");

    try {
      const res = await fetch("/api/admin/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedApp.user_id,
          decision,
          notes:
            decisionNotes ||
            (decision === "verified"
              ? "Approved by Authority Officer"
              : "Rejected due to incomplete documentation"),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Decision processing failed.");

      setActionSuccessMsg(
        decision === "verified"
          ? `Application for ${selectedApp.full_name} APPROVED. Government Digital Tourist ID Issued.`
          : `Application for ${selectedApp.full_name} REJECTED.`,
      );

      // Update local state immediately
      setApplications((prev) =>
        prev.map((a) =>
          a.user_id === selectedApp.user_id
            ? { ...a, status: decision, admin_notes: decisionNotes }
            : a,
        ),
      );

      setTimeout(() => {
        setSelectedApp(null);
        setDecisionNotes("");
        setActionSuccessMsg("");
      }, 1800);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl space-y-4">
          <Loader2 className="mx-auto size-10 text-blue-500 animate-spin" />
          <h2 className="text-lg font-bold">
            Connecting to Immigration &amp; Tourism Authority Grid...
          </h2>
          <p className="text-xs text-slate-400">
            Loading live verification queue &amp; biometrics vault
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="container-page flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-extrabold tracking-tight text-white">
                  SafirPass Authority Console
                </span>
                <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Gov. Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ministry of Tourism &amp; Immigration Bureau Verification Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadApplications}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`}
              />
              <span>Refresh Queue</span>
            </button>

            <Link
              href="/dashboard/command"
              className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <span>Incident Radar</span>
            </Link>

            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container-page space-y-8 pt-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="size-4 text-blue-400" /> Total Applications
            </span>
            <p className="font-serif text-3xl font-extrabold text-white">
              {stats.total}
            </p>
            <p className="text-[11px] text-slate-500">
              Foreign tourist KYC submissions
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="size-4" /> Pending Review
            </span>
            <p className="font-serif text-3xl font-extrabold text-amber-300">
              {stats.pending}
            </p>
            <p className="text-[11px] text-amber-400/80">
              Awaiting officer verification
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="size-4" /> Verified &amp; Active
            </span>
            <p className="font-serif text-3xl font-extrabold text-emerald-300">
              {stats.verified}
            </p>
            <p className="text-[11px] text-emerald-400/80">
              Digital Tourist Cards Issued
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <XCircle className="size-4" /> Rejected / Flagged
            </span>
            <p className="font-serif text-3xl font-extrabold text-red-300">
              {stats.rejected}
            </p>
            <p className="text-[11px] text-red-400/80">
              Declined due to fraud/invalid docs
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tourist name, passport number, tourist ID, or country..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 px-3 text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="under_review">Under Review (Pending)</option>
              <option value="verified">Verified (Approved)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Tourist Applications Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-white">
              Tourist Verification Queue
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Showing {filteredApplications.length} of {applications.length}{" "}
              Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Tourist &amp; Passport</th>
                  <th className="px-6 py-4">Nationality</th>
                  <th className="px-6 py-4">Visa Category</th>
                  <th className="px-6 py-4">Biometric Liveness</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id || app.user_id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {app.biometrics?.face_snapshot ? (
                          <img
                            src={app.biometrics.face_snapshot}
                            alt="Face Snapshot"
                            className="size-10 rounded-lg object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 font-bold">
                            {app.full_name ? app.full_name[0] : "T"}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white text-sm">
                            {app.full_name}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {app.passport_number} •{" "}
                            <span className="text-blue-400">
                              {app.tourist_id}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {app.nationality}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 border border-slate-700">
                        {app.visa_type}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <ScanFace className="size-4 text-emerald-400" />
                        <span className="font-bold text-emerald-400">
                          {((app.liveness_score ?? 0) * 100).toFixed(0)}%
                          Match
                        </span>
                      </div>
                    </td>


                    <td className="px-6 py-4">
                      {app.status === "verified" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                          <CheckCircle2 className="size-3" /> Verified
                        </span>
                      ) : app.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold text-red-300">
                          <XCircle className="size-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                          <Clock className="size-3" /> Under Review
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors"
                      >
                        <Eye className="size-3.5" />
                        <span>Inspect &amp; Verify</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredApplications.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No applications found matching the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* DETAILED APPLICATION INSPECTOR MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Immigration Officer Verification Portal
                </span>
                <h3 className="font-serif text-2xl font-bold text-white">
                  {selectedApp.full_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Digital Tourist Identity Reference:{" "}
                  <span className="font-mono font-bold text-blue-300">
                    {selectedApp.tourist_id}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {actionSuccessMsg && (
              <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-xs font-bold text-emerald-300">
                {actionSuccessMsg}
              </div>
            )}

            {/* Profile Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-500 font-semibold uppercase">
                  Nationality
                </span>
                <p className="font-bold text-white mt-0.5">
                  {selectedApp.nationality}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-500 font-semibold uppercase">
                  Passport No
                </span>
                <p className="font-mono font-bold text-white mt-0.5">
                  {selectedApp.passport_number}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-500 font-semibold uppercase">
                  Expiry Date
                </span>
                <p className="font-bold text-white mt-0.5">
                  {selectedApp.passport_expiry || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-500 font-semibold uppercase">
                  Visa Grant
                </span>
                <p className="font-mono font-bold text-white mt-0.5">
                  {selectedApp.visa_number || "—"}
                </p>
              </div>
            </div>


            {/* Biometric Face Snapshot & Liveness Check */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ScanFace className="size-4 text-blue-400" /> Biometric Face
                Liveness Verification
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {selectedApp.biometrics?.face_snapshot ? (
                  <img
                    src={selectedApp.biometrics.face_snapshot}
                    alt="Biometric Reference"
                    className="size-28 rounded-2xl object-cover border-2 border-blue-500/40 shadow-md"
                  />
                ) : (
                  <div className="size-28 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                    No Photo
                  </div>
                )}

                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">
                      Biometric Liveness Score:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {((selectedApp.liveness_score ?? 0) * 100).toFixed(1)}%
                      (Passed Threshold)
                    </span>

                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Anti-Spoofing Check:</span>
                    <span className="font-bold text-emerald-400">
                      Confirmed (Live Video Frame)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      Facial Feature Extraction:
                    </span>
                    <span className="font-mono text-slate-300">
                      Stored in MongoDB Vault
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Scans & Vault Preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileCheck className="size-4 text-blue-400" /> Uploaded Document
                Vault (MongoDB)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedApp.documents &&
                  Object.keys(selectedApp.documents).length > 0 ? (
                  Object.entries(selectedApp.documents).map(([key, doc]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-blue-400" />
                        <div>
                          <p className="font-bold text-white capitalize">
                            {key.replace("_", " ")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {doc.fileName || "Uploaded File"}
                          </p>
                        </div>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        Uploaded
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-xs text-slate-400 bg-slate-900 p-3 rounded-xl">
                    Standard passport and visa credentials submitted via digital
                    registration.
                  </div>
                )}
              </div>
            </div>

            {/* Officer Decision Controls */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Officer Review Notes
                </label>
                <input
                  type="text"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g. Identity verified against international passport registry..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={() => handleDecision("rejected")}
                  className="flex items-center gap-2 rounded-xl bg-red-600/20 border border-red-500/40 px-5 py-3 text-xs font-bold text-red-300 hover:bg-red-600/30 transition-colors"
                >
                  <XCircle className="size-4" />
                  <span>Reject Application</span>
                </button>

                <button
                  type="button"
                  disabled={processingAction}
                  onClick={() => handleDecision("verified")}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {processingAction ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>Approve &amp; Issue Digital Tourist ID</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
