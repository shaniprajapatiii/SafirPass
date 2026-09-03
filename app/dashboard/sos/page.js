"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Siren, MapPin, PhoneCall, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "../../../lib/auth-context";

export default function SosPanicPage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [category, setCategory] = useState("medical");
  const [notes, setNotes] = useState("");
  const [holding, setHolding] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [coords, setCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [transmitted, setTransmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    fetch("/api/kyc/status")
      .then((res) => res.json())
      .then((data) => setKyc(data?.kyc || null))
      .catch(() => {});
  }, [user]);

  const isVerified = kyc?.status === "verified";

  const loadAlerts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/sos");
      const data = await res.json();
      if (data?.alerts) {
        setAlerts(data.alerts);
      }
    } catch (e) {
      console.warn("Error fetching SOS alerts:", e);
    }
  }, [user]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Real Browser Geolocation Lock
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("GPS lock note:", err.message)
      );
    }
  }, []);

  const triggerSos = useCallback(async () => {
    setSubmitting(true);
    setErrorMsg("");

    const lat = coords?.lat ?? null;
    const lng = coords?.lng ?? null;
    const refCode = `INC-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          latitude: lat,
          longitude: lng,
          notes: notes.trim() || "Emergency SOS panic button triggered by tourist.",
          reference: refCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transmit SOS alert");

      setTransmitted(true);
      loadAlerts();
      setTimeout(() => setTransmitted(false), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to transmit SOS alert.");
    } finally {
      setSubmitting(false);
    }
  }, [category, coords, notes, loadAlerts]);

  const startHold = () => {
    if (timer.current) return;
    timer.current = setInterval(() => {
      setHolding((h) => {
        if (h >= 100) {
          clearInterval(timer.current);
          timer.current = null;
          triggerSos();
          return 0;
        }
        return h + 5;
      });
    }, 100);
  };

  const stopHold = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHolding(0);
  };

  useEffect(() => () => stopHold(), []);

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="container-page max-w-xl space-y-6 text-center">
          <div className="rounded-3xl border-2 border-amber-300 bg-white p-10 shadow-xl space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Siren className="size-8" />
            </div>
            <div className="space-y-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Authority Verification Required
              </span>
              <h1 className="font-serif text-2xl font-bold text-slate-900">
                SOS Emergency Dispatch is Locked
              </h1>
              <p className="text-sm text-slate-600">
                To route high-priority emergency telemetry to National 112 control units, your digital identity must be verified by the Government Authority.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="/dashboard/verify"
                className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                Go to e-KYC Verification
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page max-w-4xl space-y-8">

        {/* Header */}
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
            <Siren className="size-4 animate-pulse" /> Part 6 Emergency SOS Grid
          </span>
          <h1 className="font-serif text-3xl font-extrabold text-slate-900">
            One-Touch Emergency SOS Panic Trigger
          </h1>
          <p className="text-sm text-slate-700">
            Press and hold the red SOS button for 3 seconds. Your GPS telemetry, medical indicators, and identity token are locked and recorded on Neon Postgres.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-800 border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Panic Trigger Control Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Transmit Emergency Alert</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1">Incident Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-slate-900 bg-white"
                >
                  <option value="medical">Medical Emergency</option>
                  <option value="assault">Physical Assault or Threat</option>
                  <option value="harassment">Scam or Harassment</option>
                  <option value="lost_property">Lost Passport / Theft</option>
                  <option value="general">Other Emergency / Unsure</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-500 mb-1">Context for Emergency Responders</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Landmarks, vehicle details, medical symptoms..."
                  className="w-full rounded-xl border border-slate-200 p-3 font-medium text-slate-900"
                />
              </div>

              {/* Real Geolocation Lock */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="size-4 text-red-600" /> GPS Position Lock:
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Locking GPS Position..."}
                </span>
              </div>
            </div>

            {/* Hold Button */}
            <button
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              disabled={submitting}
              className="relative w-full overflow-hidden rounded-2xl bg-red-600 py-8 text-center text-white font-serif text-xl font-extrabold shadow-xl hover:bg-red-700 transition-colors select-none"
            >
              <span
                className="absolute inset-y-0 left-0 bg-slate-950/30 transition-all duration-100"
                style={{ width: `${holding}%` }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Siren className="size-6 animate-pulse" />
                {submitting ? "TRANSMITTING SOS..." : holding > 0 ? `HOLDING... ${Math.round(holding)}%` : "PRESS & HOLD (3s) FOR SOS"}
              </span>
            </button>

            {transmitted && (
              <div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span>SOS Incident Transmitted! Responders notified.</span>
              </div>
            )}
          </div>

          {/* Emergency History & Hotlines */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Official Toll-Free Helplines</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="tel:112"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-center space-y-1 block hover:bg-red-100 transition-colors"
                >
                  <PhoneCall className="mx-auto size-6 text-red-600" />
                  <span className="block text-xs font-bold text-red-800 uppercase">National Emergency</span>
                  <span className="block font-serif text-2xl font-extrabold text-red-950">112</span>
                </a>

                <a
                  href="tel:1363"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center space-y-1 block hover:bg-amber-100 transition-colors"
                >
                  <PhoneCall className="mx-auto size-6 text-amber-600" />
                  <span className="block text-xs font-bold text-amber-800 uppercase">Tourist Helpline</span>
                  <span className="block font-serif text-2xl font-extrabold text-amber-950">1363</span>
                </a>
              </div>
            </div>

            {/* Emergency Alerts History */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Transmitted Database Incident History</h3>
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500">No emergency alerts recorded in database yet.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {alerts.map((a) => (
                    <div key={a.id} className="rounded-xl border border-slate-200 p-4 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 capitalize">{a.category} Emergency</span>
                        <span className="rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 font-bold uppercase text-[10px] border border-red-200">
                          {a.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{a.notes}</p>
                      <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400">
                        <span>Ref: {a.reference}</span>
                        <span>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
