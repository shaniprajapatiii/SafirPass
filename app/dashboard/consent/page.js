"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Building2, Smartphone, Shield, CheckCircle2, XCircle, Plus, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../../../lib/auth-context";
import { ConsentModal } from "../../../components/ConsentModal";

export default function ConsentEnginePage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalRequest, setActiveModalRequest] = useState(null);

  // New Request Form State
  const [showForm, setShowForm] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterType, setRequesterType] = useState("hotel");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/kyc/status")
      .then((res) => res.json())
      .then((data) => setKyc(data?.kyc || null))
      .catch(() => {});
  }, [user]);

  const isVerified = kyc?.status === "verified";

  const loadRequests = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/consent");
      const data = await res.json();
      if (data?.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.warn("Error fetching consent requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

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

  // Insert a new real consent request into Neon Postgres
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);

    const defaultAttributes =
      requesterType === "hotel"
        ? ["full_name", "nationality", "validity", "tourist_id"]
        : requesterType === "telecom"
        ? ["full_name", "nationality", "passport_number", "visa"]
        : ["full_name", "emergency_contact", "validity"];

    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester: requesterName,
          requester_type: requesterType,
          attributes: defaultAttributes,
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

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="container-page max-w-xl space-y-6 text-center">
          <div className="rounded-3xl border-2 border-amber-300 bg-white p-10 shadow-xl space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Building2 className="size-8" />
            </div>
            <div className="space-y-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Authority Verification Required
              </span>
              <h1 className="font-serif text-2xl font-bold text-slate-900">
                Hotel &amp; SIM Consent Engine is Locked
              </h1>
              <p className="text-sm text-slate-600">
                Granular selective attribute sharing for hotel check-ins and telecom SIM kiosks unlocks after your digital identity is approved by the Government Authority.
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
      <div className="container-page space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Part 2 Privacy Engine</span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Granular Consent &amp; Data Siloing Engine
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time PostgreSQL records tracking third-party attribute access requests.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" /> Simulate Incoming Verification Access
          </button>
        </div>

        {/* New Request Form */}
        {showForm && (
          <form onSubmit={handleCreateRequest} className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" /> Create Test Verification Access Request
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Requester Organization Name</label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. Taj Hotel / Airtel Store"
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">Requester Category</label>
                <select
                  value={requesterType}
                  onChange={(e) => setRequesterType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white font-medium text-slate-900"
                >
                  <option value="hotel">Hotel Check-in (Form C)</option>
                  <option value="telecom">Telecom e-SIM Provider</option>
                  <option value="authority">Police / Consular Authority</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Insert Request into Database"}
              </button>
            </div>
          </form>
        )}

        {/* Requests Queue */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-slate-900">PostgreSQL Consent Requests Log</h2>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm animate-pulse">
              <p className="text-xs text-slate-500 font-bold">Loading consent records from Neon Postgres...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-3">
              <ShieldCheck className="mx-auto size-10 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900">No active consent requests yet</h3>
              <p className="text-xs text-slate-500">
                Click "Simulate Incoming Verification Access" above to trigger a live consent popup and test real database approvals.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.requester}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          req.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : req.status === "denied"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {req.attributes?.map((attr) => (
                        <span key={attr} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 capitalize">
                          {attr.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {req.status === "pending" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeny(req.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                      >
                        Approve Token
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      Resolved on {new Date(req.decided_at || req.created_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Popup Modal */}
        {activeModalRequest && (
          <ConsentModal
            request={activeModalRequest}
            onApprove={() => handleApprove(activeModalRequest.id)}
            onDeny={() => handleDeny(activeModalRequest.id)}
          />
        )}
      </div>
    </div>
  );
}
