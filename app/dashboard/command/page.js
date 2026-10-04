"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Radar,
  Radio,
  Activity,
  Siren,
  ShieldCheck,
  BarChart2,
  MapPin,
  Scale,
  Bell,
  Send,
  AlertTriangle,
  User,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "../../../lib/auth-context";

const BOUNDS = { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98 };

function project(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(4, y)) };
}

const FLOW = ["active", "triage", "dispatched", "responding", "resolved"];
const COMPLAINT_FLOW = ["submitted", "under_investigation", "action_taken", "resolved", "dismissed"];

export default function CommandConsolePage() {
  const { user } = useAuth();
  const [consoleTab, setConsoleTab] = useState("sos"); // 'sos' | 'complaints'

  // SOS Incidents & Radar State
  const [incidents, setIncidents] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Complaints & Grievances State
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [officerInput, setOfficerInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [updatingComplaint, setUpdatingComplaint] = useState(false);

  // Broadcast Advisory Modal State
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [advTitle, setAdvTitle] = useState("");
  const [advBody, setAdvBody] = useState("");
  const [advSeverity, setAdvSeverity] = useState("warning");
  const [advLocation, setAdvLocation] = useState("National");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState("");

  const loadDatabaseData = useCallback(async () => {
    try {
      const [sosRes, geoRes, compRes] = await Promise.all([
        fetch("/api/sos?mode=all"),
        fetch("/api/geofences"),
        fetch("/api/complaints?mode=all"),
      ]);

      const [sosData, geoData, compData] = await Promise.all([
        sosRes.json(),
        geoRes.json(),
        compRes.json(),
      ]);

      if (sosData?.alerts) setIncidents(sosData.alerts);
      if (geoData?.geofences) setGeofences(geoData.geofences);
      if (compData?.complaints) setComplaints(compData.complaints);
      setConnected(true);
    } catch (e) {
      console.warn("Error fetching command center data:", e);
      setConnected(false);
    } finally {
      setLoading(false);
      setLoadingComplaints(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
    const interval = setInterval(loadDatabaseData, 5000);
    return () => clearInterval(interval);
  }, [loadDatabaseData]);

  const currentSelected = incidents.find((i) => i.id === selectedId) || incidents[0];

  const advanceStatus = async (alert) => {
    const idx = FLOW.indexOf(alert.status);
    const nextStatus = FLOW[Math.min(FLOW.length - 1, (idx < 0 ? 0 : idx) + 1)];

    try {
      await fetch("/api/sos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: alert.id,
          status: nextStatus,
          responder: alert.responder || "National 112 Control Unit",
        }),
      });

      loadDatabaseData();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Complaint Status & Notes
  const handleUpdateComplaint = async (newStatus) => {
    if (!selectedComplaint) return;
    setUpdatingComplaint(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedComplaint.id,
          status: newStatus,
          assignedOfficer: officerInput.trim() || selectedComplaint.assigned_officer || "Tourist Police Duty SI",
          resolutionNotes: notesInput.trim() || selectedComplaint.resolution_notes || "Action initiated by Tourist Police.",
        }),
      });

      if (res.ok) {
        setSelectedComplaint(null);
        setOfficerInput("");
        setNotesInput("");
        loadDatabaseData();
      }
    } catch (err) {
      console.warn("Update complaint note:", err);
    } finally {
      setUpdatingComplaint(false);
    }
  };

  // Broadcast Advisory
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!advTitle || !advBody) return;
    setBroadcasting(true);
    setBroadcastSuccess("");
    try {
      const res = await fetch("/api/notifications/advisories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: advTitle,
          body: advBody,
          severity: advSeverity,
          location: advLocation,
          issuedBy: "National Tourist Safety Command",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBroadcastSuccess(data.message || "Advisory broadcasted.");
        setAdvTitle("");
        setAdvBody("");
        setTimeout(() => {
          setBroadcastOpen(false);
          setBroadcastSuccess("");
        }, 1500);
      }
    } catch (err) {
      console.warn("Broadcast note:", err);
    } finally {
      setBroadcasting(false);
    }
  };

  // Compute SOS category analytics
  const categoryAnalytics = useMemo(() => {
    const counts = {};
    incidents.forEach((i) => {
      const cat = i.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];
    return Object.keys(counts).map((key, index) => ({
      name: key.toUpperCase(),
      count: counts[key],
      color: colors[index % colors.length],
    }));
  }, [incidents]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Radar className="size-4" /> Authority Safety Command &amp; Triage Console
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              National Dispatch &amp; Tourist Grievance Terminal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-channel authority dashboard for Emergency SOS telemetry and Tourist Police fraud triage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBroadcastOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-colors cursor-pointer"
            >
              <Bell className="size-3.5" />
              <span>Broadcast Web Push Advisory</span>
            </button>

            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 border border-emerald-200">
              <Radio className="size-3.5 text-emerald-600 animate-pulse" />
              <span>{connected ? "Postgres Telemetry Live" : "Connecting..."}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setConsoleTab("sos")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${consoleTab === "sos"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
          >
            <Siren className="size-4 text-red-600" />
            <span>Emergency SOS Incidents ({incidents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setConsoleTab("complaints")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${consoleTab === "complaints"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
          >
            <Scale className="size-4 text-amber-600" />
            <span>Tourist Complaints &amp; Scam Desk ({complaints.length})</span>
          </button>
        </div>

        {/* TAB 1: EMERGENCY SOS & MAP RADAR                                          */}

        {consoleTab === "sos" && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Active Incidents</span>
                <p className="font-serif text-3xl font-extrabold text-slate-900">
                  {incidents.filter((i) => i.status !== "resolved").length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Dispatched Units</span>
                <p className="font-serif text-3xl font-extrabold text-blue-600">
                  {incidents.filter((i) => i.status === "dispatched").length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Responders On-Scene</span>
                <p className="font-serif text-3xl font-extrabold text-indigo-600">
                  {incidents.filter((i) => i.status === "responding").length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Resolved Today</span>
                <p className="font-serif text-3xl font-extrabold text-emerald-600">
                  {incidents.filter((i) => i.status === "resolved").length}
                </p>
              </div>
            </div>

            {/* Map Radar & Dispatch Triage Queue */}
            <div className="grid gap-8 lg:grid-cols-12">
              {/* India Schematic Map Radar */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Radar className="size-4 text-blue-600" /> Spatial Map Radar — India Geofences &amp; Incidents
                </h2>

                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                  <svg viewBox="0 0 100 120" className="absolute inset-0 size-full">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <line key={`v-${i}`} x1={i * 10} y1={0} x2={i * 10} y2={120} stroke="#334155" strokeWidth={0.3} />
                    ))}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <line key={`h-${i}`} x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="#334155" strokeWidth={0.3} />
                    ))}

                    {/* Landmass Outline */}
                    <path
                      d="M26 18 L40 12 L58 16 L70 12 L82 22 L76 38 L66 46 L62 60 L54 82 L46 104 L38 84 L30 66 L22 52 L18 34 Z"
                      fill="#1e293b"
                      stroke="#3b82f6"
                      strokeWidth={0.8}
                    />

                    {/* Geofence Circles */}
                    {geofences.map((gf) => {
                      const { x, y } = project(gf.latitude, gf.longitude);
                      return (
                        <circle
                          key={gf.id}
                          cx={x}
                          cy={y}
                          r={4}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={0.6}
                          strokeDasharray="1 1"
                        />
                      );
                    })}
                  </svg>

                  {/* Real DB Incident Map Pins */}
                  {incidents.map((inc) => {
                    if (!inc.latitude || !inc.longitude) return null;
                    const { x, y } = project(inc.latitude, inc.longitude);
                    const isSelected = currentSelected?.id === inc.id;
                    return (
                      <button
                        key={inc.id}
                        onClick={() => setSelectedId(inc.id)}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group"
                      >
                        <span className={`block size-4 rounded-full border-2 border-white ${inc.status === "active" ? "bg-red-600 animate-ping" :
                          inc.status === "triage" ? "bg-amber-500" :
                            inc.status === "dispatched" ? "bg-blue-600" :
                              inc.status === "responding" ? "bg-indigo-600" : "bg-emerald-500"
                          } ${isSelected ? "scale-150 ring-4 ring-blue-400" : ""}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Triage Dispatch Board */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-h-[340px] overflow-y-auto">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Siren className="size-4 text-red-600" /> Dispatch Queue (Neon Postgres)
                  </h3>

                  {incidents.length === 0 ? (
                    <p className="text-xs text-slate-500">No emergency alerts recorded in PostgreSQL yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {incidents.map((inc) => (
                        <button
                          key={inc.id}
                          onClick={() => setSelectedId(inc.id)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex justify-between items-center ${currentSelected?.id === inc.id
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                        >
                          <div>
                            <p className="font-bold text-slate-900">{inc.reference || inc.id.slice(0, 8)}</p>
                            <p className="text-slate-500 capitalize">{inc.category} · {new Date(inc.created_at).toLocaleTimeString()}</p>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold uppercase text-[10px] text-slate-700">
                            {inc.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Incident Actions */}
                {currentSelected && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Incident Triage Actions</h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Ref Code</span>
                        <span className="font-mono font-bold text-slate-900">{currentSelected.reference}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Category</span>
                        <span className="font-bold text-slate-900 capitalize">{currentSelected.category}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Responder</span>
                        <span className="font-bold text-blue-600">{currentSelected.responder || "Unassigned"}</span>
                      </div>
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                        {currentSelected.notes}
                      </p>
                    </div>

                    <button
                      disabled={currentSelected.status === "resolved"}
                      onClick={() => advanceStatus(currentSelected)}
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {currentSelected.status === "resolved" ? "Incident Resolved" : "Advance Incident Workflow"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Analytics with Recharts */}
            {categoryAnalytics.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="size-4 text-blue-600" /> Real Database Incident Category Analytics
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryAnalytics}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name}: ${entry.count}`}
                      >
                        {categoryAnalytics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}


        {/* TAB 2: TOURIST GRIEVANCES & SCAM TRIAGE DESK                             */}

        {consoleTab === "complaints" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Grievance Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Total Grievances</span>
                <p className="font-serif text-3xl font-extrabold text-slate-900">{complaints.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Under Police Inquiry</span>
                <p className="font-serif text-3xl font-extrabold text-amber-600">
                  {complaints.filter((c) => c.status === "under_investigation" || c.status === "submitted").length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">High-Risk / Urgent</span>
                <p className="font-serif text-3xl font-extrabold text-rose-600">
                  {complaints.filter((c) => c.urgency === "high" || c.urgency === "critical").length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500">Resolved Cases</span>
                <p className="font-serif text-3xl font-extrabold text-emerald-600">
                  {complaints.filter((c) => c.status === "resolved").length}
                </p>
              </div>
            </div>

            {/* Complaints Feed */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="size-4 text-blue-600" /> Active Tourist Grievances Feed
                  </h3>
                  <p className="text-xs text-slate-500">
                    Triaged by AI safety engine and mapped to local tourist police units.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {complaints.map((cmp) => {
                  const isUrgent = cmp.urgency === "high" || cmp.urgency === "critical";
                  return (
                    <div key={cmp.id} className="p-5 hover:bg-slate-50/50 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-sm text-blue-900">{cmp.tracking_number}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {cmp.category?.replace(/_/g, " ")}
                          </span>
                          {isUrgent && (
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 uppercase border border-rose-200">
                              Urgent
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${cmp.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800"
                              : cmp.status === "under_investigation"
                                ? "bg-amber-100 text-amber-800"
                                : cmp.status === "action_taken"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {cmp.status?.replace(/_/g, " ")}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedComplaint(cmp);
                              setOfficerInput(cmp.assigned_officer || "");
                              setNotesInput(cmp.resolution_notes || "");
                            }}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 transition-colors cursor-pointer"
                          >
                            Take Action
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 text-slate-600">
                        <div>
                          <strong>Tourist:</strong> {cmp.tourist_name} ({cmp.tourist_id})
                        </div>
                        <div>
                          <strong>Location:</strong> {cmp.location || "N/A"}
                        </div>
                        {cmp.vendor_name && (
                          <div>
                            <strong>Vendor / Vehicle:</strong> {cmp.vendor_name}
                          </div>
                        )}
                        {cmp.amount && (
                          <div>
                            <strong>Disputed Loss:</strong> {cmp.currency} {cmp.amount}
                          </div>
                        )}
                      </div>

                      <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                        "{cmp.description}"
                      </p>

                      {/* AI Triage Snippet */}
                      {cmp.ai_triage && (
                        <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-2.5 text-[11px] text-blue-900 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-blue-600" />
                            <strong>AI Triage:</strong> {cmp.ai_triage.classification}
                          </span>
                          <span className="font-mono font-bold">Risk: {cmp.ai_triage.risk_score}/100</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Complaint Officer Action Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Police Grievance Action
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedComplaint.tracking_number} • {selectedComplaint.category?.replace(/_/g, " ")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Police Officer / Liaison</label>
                  <input
                    type="text"
                    value={officerInput}
                    onChange={(e) => setOfficerInput(e.target.value)}
                    placeholder="e.g. SI Sharma, Tourist Police Unit #3"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Police Action &amp; Resolution Notes</label>
                  <textarea
                    rows={3}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Enter action taken (e.g. Kiosk visited, refund issued, driver summoned, ASI license verified)..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleUpdateComplaint("under_investigation")}
                  disabled={updatingComplaint}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 cursor-pointer"
                >
                  Mark Under Investigation
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateComplaint("action_taken")}
                  disabled={updatingComplaint}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 cursor-pointer"
                >
                  Mark Action Taken
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateComplaint("resolved")}
                  disabled={updatingComplaint}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 cursor-pointer"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Critical Advisory Modal */}
        {broadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="size-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Broadcast Web Push Safety Advisory
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="size-5" />
                </button>
              </div>

              {broadcastSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>{broadcastSuccess}</span>
                </div>
              )}

              <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Advisory Headline *</label>
                  <input
                    type="text"
                    required
                    value={advTitle}
                    onChange={(e) => setAdvTitle(e.target.value)}
                    placeholder="e.g. Rip Current Alert: Baga Beach Red Flag Swimming Ban"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Severity</label>
                    <select
                      value={advSeverity}
                      onChange={(e) => setAdvSeverity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:bg-white focus:outline-none font-semibold"
                    >
                      <option value="warning">Warning (Amber)</option>
                      <option value="danger">Critical Danger (Red)</option>
                      <option value="info">Informational (Blue)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Region / Sector</label>
                    <input
                      type="text"
                      value={advLocation}
                      onChange={(e) => setAdvLocation(e.target.value)}
                      placeholder="e.g. Goa Coastal Belt, Taj Ganj, Leh..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Advisory Description &amp; Instructions *</label>
                  <textarea
                    rows={3}
                    required
                    value={advBody}
                    onChange={(e) => setAdvBody(e.target.value)}
                    placeholder="Specify exact caution, prohibited actions, and emergency numbers..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 cursor-pointer disabled:opacity-50"
                  >
                    {broadcasting ? "Broadcasting..." : "Send Web Push Alert"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
