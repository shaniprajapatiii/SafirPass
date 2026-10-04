"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ShieldAlert,
  Send,
  MapPin,
  Clock,
  CheckCircle2,
  Bell,
  BellRing,
  FileText,
  Search,
  RefreshCw,
  Sparkles,
  PhoneCall,
  User,
  DollarSign,
  Camera,
  Check,
  ChevronRight,
  Info,
  Car,
  Building,
  Ticket,
  ShoppingBag,
  Briefcase,
  Layers,
} from "lucide-react";
import { useAuth } from "../../../lib/auth-context";

const CATEGORIES = [
  {
    id: "taxi_overcharging",
    label: "Taxi / Auto Overcharging",
    desc: "Rigged meter, extortion, refusal to honor prepaid airport kiosk slip.",
    icon: Car,
    color: "amber",
  },
  {
    id: "fake_tour_guide",
    label: "Fake Guide / Monument Closure Scam",
    desc: "Claimed monument was closed or diverted to high-commission emporiums.",
    icon: Ticket,
    color: "rose",
  },
  {
    id: "hotel_fraud",
    label: "Hotel Booking Repudiation",
    desc: "Refused prepaid online booking, forced night-time cash payment or cancellation.",
    icon: Building,
    color: "blue",
  },
  {
    id: "counterfeit_goods",
    label: "Counterfeit Gem / Silk Scam",
    desc: "Sold fake certificates of authenticity or high-pressure export sales.",
    icon: ShoppingBag,
    color: "purple",
  },
  {
    id: "theft",
    label: "Theft / Lost Luggage / Passport",
    desc: "Personal items, bags, or travel documents stolen in public transit.",
    icon: Briefcase,
    color: "red",
  },
  {
    id: "other_scam",
    label: "Other Harassment / Fraud",
    desc: "Unauthorized vendor harassment, currency exchange rigging, or overbilling.",
    icon: AlertTriangle,
    color: "slate",
  },
];

const STATUS_STEPS = ["submitted", "under_investigation", "action_taken", "resolved"];

export default function ComplaintsGrievancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("report"); // 'report' | 'track' | 'advisories'

  // Form State
  const [category, setCategory] = useState("taxi_overcharging");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Tracking List & Advisories
  const [myComplaints, setMyComplaints] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [loadingAdvisories, setLoadingAdvisories] = useState(true);

  // Web Push State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  // Check Web Push support and existing registration
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setPushSubscribed(true);
        });
      });
    }
  }, []);

  const registerPushNotifications = async () => {
    if (!pushSupported) return;
    setSubscribingPush(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/notifications/subscribe");
      const keyData = await keyRes.json();
      const vapidPublicKey = keyData.publicKey;

      // Subscribe to PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      // Save to SafirPass DB
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (res.ok) {
        setPushSubscribed(true);
        // Trigger welcome notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("SafirPass Push Active", {
            body: "You will receive real-time updates for critical advisories and your reported grievances.",
            icon: "/icons/icon-192x192.png",
          });
        }
      }
    } catch (err) {
      console.warn("Web Push registration note:", err.message);
    } finally {
      setSubscribingPush(false);
    }
  };

  // Fetch Complaints
  const loadComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await fetch("/api/complaints");
      const data = await res.json();
      if (data?.complaints) {
        setMyComplaints(data.complaints);
      }
    } catch (e) {
      console.warn("Failed to load complaints:", e);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Fetch Advisories
  const loadAdvisories = async () => {
    setLoadingAdvisories(true);
    try {
      const res = await fetch("/api/notifications/advisories");
      const data = await res.json();
      if (data?.advisories) {
        setAdvisories(data.advisories);
      }
    } catch (e) {
      console.warn("Failed to load advisories:", e);
    } finally {
      setLoadingAdvisories(false);
    }
  };

  useEffect(() => {
    loadComplaints();
    loadAdvisories();
  }, []);

  // Fetch GPS location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        if (!locationName) {
          setLocationName(`GPS: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`);
        }
        setFetchingGps(false);
      },
      (err) => {
        console.warn("GPS lookup note:", err.message);
        setFetchingGps(false);
      }
    );
  };

  // Submit Complaint
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg("Please provide a detailed description (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSubmissionSuccess(null);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          vendorName,
          amount,
          currency,
          location: locationName,
          latitude,
          longitude,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit grievance.");
      }

      setSubmissionSuccess(data.complaint);
      // Reset form
      setVendorName("");
      setAmount("");
      setDescription("");
      // Reload list
      loadComplaints();
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit grievance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page max-w-4xl space-y-6">
        {/* Top Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-rose-600" /> Republic of India • Ministry of Tourism &amp; Police
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Tourist Grievance &amp; Scam Desk
            </h1>
            <p className="text-xs text-slate-500 max-w-xl">
              Report fare gouging, tout scams, unauthorized emporiums, or booking fraud. Reports are triaged by AI and routed directly to the State Tourist Police.
            </p>
          </div>

          {/* Web Push Subscription Action */}
          {pushSupported && (
            <button
              type="button"
              onClick={registerPushNotifications}
              disabled={subscribingPush || pushSubscribed}
              className={`inline-flex items-center gap-2 rounded-xl text-xs font-bold px-3.5 py-2.5 transition-all shadow-xs cursor-pointer ${pushSubscribed
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
            >
              {pushSubscribed ? (
                <>
                  <BellRing className="size-4 text-emerald-600" />
                  <span>Push Alerts Active</span>
                </>
              ) : (
                <>
                  <Bell className="size-4" />
                  <span>{subscribingPush ? "Activating..." : "Enable Push Alerts"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === "report"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
          >
            <Send className="size-4" />
            <span>Report Scam / Issue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("track")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === "track"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
          >
            <FileText className="size-4" />
            <span>Track My Reports ({myComplaints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("advisories")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === "advisories"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
          >
            <AlertTriangle className="size-4" />
            <span>Live Advisories ({advisories.length})</span>
          </button>
        </div>


        {/* TAB 1: REPORT SCAM / FILE COMPLAINT                                       */}

        {activeTab === "report" && (
          <div className="space-y-6">
            {submissionSuccess ? (
              <div className="rounded-3xl border-2 border-emerald-500 bg-white p-6 md:p-8 shadow-xl space-y-6 animate-in fade-in">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                      Grievance Officially Logged
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">
                      Report Dispatched to Tourist Police Cell
                    </h2>
                    <p className="text-xs text-slate-600">
                      Tracking Reference:{" "}
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {submissionSuccess.tracking_number}
                      </span>
                    </p>
                  </div>
                </div>

                {/* AI Triage Card */}
                {submissionSuccess.ai_triage && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="size-4 text-blue-600" />
                        AI Police Triage &amp; Risk Assessment
                      </span>
                      <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-blue-300">
                        Risk Score: {submissionSuccess.ai_triage.risk_score}/100
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p>
                        <strong>Classification:</strong> {submissionSuccess.ai_triage.classification}
                      </p>
                      <p>
                        <strong>Police Action:</strong> {submissionSuccess.ai_triage.recommended_action}
                      </p>
                    </div>

                    {Array.isArray(submissionSuccess.ai_triage.tags) && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-blue-200/60">
                        {submissionSuccess.ai_triage.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-white border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmissionSuccess(null)}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer"
                  >
                    File Another Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("track")}
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer"
                  >
                    View Status in Tracker
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitComplaint} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                {errorMsg && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Category Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    1. Select Incident / Scam Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected
                            ? "border-blue-600 bg-blue-50/50 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-2 rounded-xl ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                              <Icon className="size-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {cat.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {cat.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Incident Specifics */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    2. Vendor &amp; Extortion Details
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold mb-1 block">
                        Vendor / Taxi / Guide Identification
                      </span>
                      <input
                        type="text"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        placeholder="e.g. Taxi DL-1T-4912, Kiosk #4, Guide Name..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold mb-1 block">
                        Disputed Amount / Overcharged Sum
                      </span>
                      <div className="flex gap-2">
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
                        >
                          <option value="INR">₹ INR</option>
                          <option value="USD">$ USD</option>
                          <option value="EUR">€ EUR</option>
                          <option value="GBP">£ GBP</option>
                        </select>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 4500"
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 font-semibold text-xs">
                        Incident Location / Landmark
                      </span>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={fetchingGps}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                      >
                        <MapPin className="size-3" />
                        <span>{fetchingGps ? "Acquiring GPS..." : "Tag My GPS Location"}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Taj Ganj Western Gate, Delhi Airport T3 Pre-paid booth, Paharganj Main Bazaar..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold text-xs mb-1 block">
                      Incident Chronology &amp; Details *
                    </span>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what occurred: what was promised, what was demanded, vehicle registration if visible, or any threats made..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Info className="size-3.5 text-slate-400" />
                    Encrypted submission routed to State Tourist Police
                  </span>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`size-3.5 ${submitting ? "animate-pulse" : ""}`} />
                    <span>{submitting ? "Analyzing & Submitting..." : "Submit Grievance to Police"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: TRACK REPORTS & STATUS                                           */}

        {activeTab === "track" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Grievances Filed ({myComplaints.length})
              </h3>
              <button
                type="button"
                onClick={loadComplaints}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                <RefreshCw className="size-3" />
                <span>Refresh Status</span>
              </button>
            </div>

            {loadingComplaints ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center animate-pulse">
                <RefreshCw className="mx-auto size-6 text-slate-400 animate-spin" />
                <p className="mt-2 text-xs text-slate-500">Checking grievance status records...</p>
              </div>
            ) : myComplaints.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
                <p className="text-sm font-bold text-slate-800">No Complaints on Record</p>
                <p className="text-xs text-slate-500">
                  You have not filed any grievances or scam reports. Safe travels!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myComplaints.map((item) => {
                  const currentIdx = STATUS_STEPS.indexOf(item.status);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-blue-800">
                              {item.tracking_number}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">
                              {item.category?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Filed: {new Date(item.created_at).toLocaleString()} • {item.location || "Location on record"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${item.status === "resolved"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : item.status === "under_investigation"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : item.status === "action_taken"
                                ? "bg-blue-100 text-blue-800 border border-blue-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                        >
                          {item.status?.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* 4-Step Progress Flow */}
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                        {STATUS_STEPS.map((step, sIdx) => {
                          const isDone = sIdx <= currentIdx;
                          const isCurrent = sIdx === currentIdx;
                          return (
                            <div key={step} className="space-y-1">
                              <div
                                className={`h-1.5 rounded-full transition-all ${isDone ? "bg-blue-600" : "bg-slate-200"
                                  }`}
                              />
                              <span className={isCurrent ? "text-blue-700 font-extrabold" : "text-slate-400"}>
                                {step.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Content & Police Resolution */}
                      <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2 border border-slate-200">
                        <p className="text-slate-800 leading-relaxed font-medium">
                          "{item.description}"
                        </p>

                        {item.assigned_officer && (
                          <div className="pt-2 border-t border-slate-200 text-[11px] text-blue-900 flex items-center gap-1.5 font-semibold">
                            <User className="size-3.5 text-blue-600" />
                            <span>Assigned Officer: {item.assigned_officer}</span>
                          </div>
                        )}

                        {item.resolution_notes && (
                          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900">
                            <strong>Police Resolution:</strong> {item.resolution_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE SAFETY ADVISORIES*/}

        {activeTab === "advisories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  National Tourist Safety Advisories
                </h3>
                <p className="text-xs text-slate-500">
                  Official alerts issued by UP Tourism Police, Drishti Marine, Delhi Police, and ASI.
                </p>
              </div>

              <button
                type="button"
                onClick={loadAdvisories}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                <RefreshCw className="size-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingAdvisories ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center animate-pulse">
                <RefreshCw className="mx-auto size-6 text-slate-400 animate-spin" />
                <p className="mt-2 text-xs text-slate-500">Checking latest advisories...</p>
              </div>
            ) : advisories.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
                <ShieldAlert className="mx-auto size-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No Active Advisories</p>
                <p className="text-xs text-slate-500">All regional perimeters currently normal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {advisories.map((adv) => {
                  const isDanger = adv.severity === "danger";
                  const isWarning = adv.severity === "warning";
                  return (
                    <div
                      key={adv.id}
                      className={`rounded-2xl border p-5 shadow-xs space-y-2 ${isDanger
                        ? "border-rose-200 bg-rose-50/70"
                        : isWarning
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-blue-200 bg-blue-50/70"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${isDanger
                              ? "bg-rose-600 text-white"
                              : isWarning
                                ? "bg-amber-500 text-white"
                                : "bg-blue-600 text-white"
                              }`}
                          >
                            {adv.severity}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{adv.title}</h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(adv.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{adv.body}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                        <span>Issued by: {adv.issuedBy}</span>
                        <span className="font-semibold text-slate-700">{adv.location}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
