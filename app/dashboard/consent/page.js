"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Smartphone,
  Shield,
  CheckCircle2,
  XCircle,
  Plus,
  Sparkles,
  Loader2,
  Radio,
  ExternalLink,
  Clock,
  Lock,
  ArrowRight,
  Car,
  Landmark,
} from "lucide-react";
import { useAuth } from "../../../lib/auth-context";
import { ConsentModal } from "../../../components/ConsentModal";

export default function ConsentEnginePage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalRequest, setActiveModalRequest] = useState(null);
  const [listening, setListening] = useState(true);

  // New Request Form State (Simulator)
  const [showForm, setShowForm] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterType, setRequesterType] = useState("hotel");
  const [submitting, setSubmitting] = useState(false);

  // Load KYC status
  useEffect(() => {
    fetch("/api/kyc/status")
      .then((res) => res.json())
      .then((data) => setKyc(data?.kyc || null))
      .catch(() => {});
  }, [user]);

  const isVerified = kyc?.status === "verified";

  // Polling for live incoming requests from hotel/telecom terminals
  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/consent");
      const data = await res.json();
      if (data?.requests) {
        setRequests(data.requests);

        // Check if there is an unhandled pending request that hasn't been shown in modal yet
        const pending = data.requests.find((r) => r.status === "pending");
        if (pending && (!activeModalRequest || activeModalRequest.id !== pending.id)) {
          setActiveModalRequest(pending);
        }
      }
    } catch (e) {
      console.warn("Error fetching consent requests:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeModalRequest]);

  useEffect(() => {
    loadRequests();
    // Continuous 3-second live polling for hotel/terminal scans
    const poller = setInterval(loadRequests, 3000);
    return () => clearInterval(poller);
  }, [loadRequests]);

  const handleApprove = async (id) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    setActiveModalRequest(null);
    try {
      await fetch("/api/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" }),
      });
      loadRequests();
    } catch (err) {
      console.error("Error approving consent:", err);
    }
  };

  const handleDeny = async (id) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "denied" } : r))
    );
    setActiveModalRequest(null);
    try {
      await fetch("/api/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "denied" }),
      });
      loadRequests();
    } catch (err) {
      console.error("Error denying consent:", err);
    }
  };

  // Insert a simulated or manual consent request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);

    const defaultAttributes =
      requesterType === "hotel"
        ? ["full_name", "nationality", "passport_number", "visa", "validity"]
        : requesterType === "telecom"
        ? ["full_name", "nationality", "passport_number", "visa"]
        : ["full_name", "emergency_contact", "validity"];

    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester: requesterName.trim() || "Simulated Front Desk",
          requester_type: requesterType,
          attributes: defaultAttributes,
          tourist_id: kyc?.tourist_id,
        }),
      });

      const data = await res.json();
      setShowForm(false);
      loadRequests();
      if (data?.request) setActiveModalRequest(data.request);
    } catch (err) {
      console.error("Error creating consent request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const pastRequests = requests.filter((r) => r.status !== "pending");

  const getRequesterIcon = (type) => {
    switch (type) {
      case "hotel":
        return <Building2 className="size-5 text-blue-600" />;
      case "telecom":
        return <Smartphone className="size-5 text-purple-600" />;
      case "rental":
        return <Car className="size-5 text-emerald-600" />;
      case "attraction":
        return <Landmark className="size-5 text-amber-600" />;
      default:
        return <Shield className="size-5 text-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page space-y-8 max-w-4xl">
        {/* Header with Live Channel Beacon */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <Lock className="size-3.5 text-blue-600" />
              <span>DPDP Act 2023 Consent Management Hub</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Consent &amp; Data Siloing Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Every hotel check-in, telecom SIM agent, and rental service must request your live cryptographic approval before accessing your details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
              <Radio className="size-3.5 text-emerald-600 animate-pulse" />
              <span>Channel Listening (3s Polling)</span>
            </div>

            <Link
              href="/services/verify"
              target="_blank"
              className="flex items-center gap-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
            >
              <ExternalLink className="size-3.5" />
              <span>Open Service Terminal</span>
            </Link>
          </div>
        </div>

        {/* Pending Requests Alert Banner */}
        {pendingRequests.length > 0 && (
          <div className="rounded-3xl border-2 border-amber-400 bg-amber-50/90 p-6 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Radio className="size-5 animate-ping" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                    Immediate Action Required
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {pendingRequests.length} Incoming Check-In Access Challenge(s)
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-amber-300 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                      {getRequesterIcon(req.requester_type)}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {req.requester_type} Access Request
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">{req.requester}</h4>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {req.attributes?.map((attr) => (
                          <span
                            key={attr}
                            className="rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 capitalize border border-slate-200"
                          >
                            {attr.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeny(req.id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 px-4 py-2 text-xs font-bold text-slate-700 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <XCircle className="size-3.5 text-rose-500" />
                      <span>Deny</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Approve Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulator Tool & Manual Injection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Testing &amp; Development Handshake Simulator</h3>
            <p className="text-xs text-slate-500">
              Want to test how incoming hotel check-in requests appear? Simulate an incoming check-in event.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{showForm ? "Close Simulator" : "Simulate Check-In"}</span>
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateRequest}
            className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 space-y-4 animate-in fade-in"
          >
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" />
              <span>Simulate Service Provider Challenge</span>
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">
                  Provider / Hotel Name
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. The Imperial Hotel, Janpath"
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white font-medium text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">
                  Category Profile
                </label>
                <select
                  value={requesterType}
                  onChange={(e) => setRequesterType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white font-medium text-slate-900 outline-none focus:border-blue-500"
                >
                  <option value="hotel">Hotel Check-in (Form C Registration)</option>
                  <option value="telecom">Telecom SIM Kiosk (e-KYC)</option>
                  <option value="rental">Vehicle / Scooter Rental Counter</option>
                  <option value="attraction">Monument / National Park Gate</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Transmit Challenge"}
              </button>
            </div>
          </form>
        )}

        {/* Historical Consent Audit Trail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Data Disclosure Audit Trail &amp; History
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total Recorded: {requests.length}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs animate-pulse">
              <p className="text-xs text-slate-500 font-bold">Synchronizing consent records from Neon Postgres...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm space-y-3">
              <ShieldCheck className="mx-auto size-12 text-slate-300" />
              <h3 className="text-base font-bold text-slate-900">No Consent Requests Logged Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Whenever a hotel, SIM counter, or police officer scans your dynamic QR code, their request will appear here for your explicit authorization.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm divide-y divide-slate-100">
              {requests.map((r) => {
                const isApproved = r.status === "approved";
                const isDenied = r.status === "denied";

                return (
                  <div key={r.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                        {getRequesterIcon(r.requester_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">{r.requester}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isApproved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isDenied
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {new Date(r.created_at || Date.now()).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })} IST
                        </p>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {r.attributes?.map((attr) => (
                            <span key={attr} className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                              {attr}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="size-4" />
                          <span>Approved &amp; Token Disclosed</span>
                        </span>
                      )}
                      {isDenied && (
                        <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-bold">
                          <XCircle className="size-4" />
                          <span>Access Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Incoming Modal */}
      {activeModalRequest && (
        <ConsentModal
          request={activeModalRequest}
          onApprove={() => handleApprove(activeModalRequest.id)}
          onDeny={() => handleDeny(activeModalRequest.id)}
        />
      )}
    </div>
  );
}
