"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Radar, Radio, Activity, Siren, ShieldCheck, BarChart2, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis,YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, } from "recharts";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";

const BOUNDS = { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98 };

function project(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(4, y)) };
}

const FLOW = ["active", "triage", "dispatched", "responding", "resolved"];

export default function CommandConsolePage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const loadDatabaseData = useCallback(async () => {
    try {
      const { data: alertData } = await supabase
        .from("sos_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (alertData) setIncidents(alertData);

      const { data: geofenceData } = await supabase
        .from("geofences")
        .select("*");

      if (geofenceData) setGeofences(geofenceData);
    } catch (e) {
      console.warn("Error fetching command center data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Realtime Supabase Channel Listener
  useEffect(() => {
    const channel = supabase
      .channel("sos-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        () => {
          loadDatabaseData();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDatabaseData]);

  const currentSelected = incidents.find((i) => i.id === selectedId) || incidents[0];

  const advanceStatus = async (alert) => {
    const idx = FLOW.indexOf(alert.status);
    const nextStatus = FLOW[Math.min(FLOW.length - 1, (idx < 0 ? 0 : idx) + 1)];

    try {
      await supabase
        .from("sos_alerts")
        .update({
          status: nextStatus,
          responder: alert.responder || "National 112 Control Unit",
          updated_at: new Date().toISOString(),
        })
        .eq("id", alert.id);

      loadDatabaseData();
    } catch (err) {
      console.error(err);
    }
  };

  // Compute analytics dynamically from real PostgreSQL records
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
      <div className="container-page space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Radar className="size-4" /> Part 8 Authority Command Center
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              National Spatial Radar &amp; Dispatch Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live PostgreSQL telemetry channel listening for incoming emergency alerts across India.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            <Radio className="size-3.5 text-emerald-600 animate-pulse" />
            <span>{connected ? "Supabase Realtime Channel Connected" : "Connecting Channel..."}</span>
          </div>
        </div>

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
              {/* Grid Lines */}
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
                    <span className={`block size-4 rounded-full border-2 border-white ${
                      inc.status === "active" ? "bg-red-600 animate-ping" :
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
                <Siren className="size-4 text-red-600" /> Dispatch Queue (Supabase)
              </h3>

              {incidents.length === 0 ? (
                <p className="text-xs text-slate-500">No emergency alerts recorded in PostgreSQL yet.</p>
              ) : (
                <div className="space-y-2">
                  {incidents.map((inc) => (
                    <button
                      key={inc.id}
                      onClick={() => setSelectedId(inc.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex justify-between items-center ${
                        currentSelected?.id === inc.id
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
    </div>
  );
}
