import Link from "next/link";
import { Radar, Activity, BarChart3, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Authority Command Center — SafirPass",
  description: "Live incident map radar, triage dispatch queue, and scam analytics for law enforcement, emergency services, and tourism ministries.",
};

export default function AuthoritiesPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Law Enforcement &amp; Government Portal</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Authority Command Center &amp; Incident Radar
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Designed for Police Control Rooms, Emergency Medical Dispatchers, and Ministry of Tourism operators to triage alerts, manage geofences, and coordinate rapid response.
          </p>
        </div>

        {/* Hero Image */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
          <img
            src="/assets/command-center.jpg"
            alt="Government emergency command center live radar map displays"
            className="w-full h-[380px] object-cover"
          />
        </div>

        {/* Core Capabilities */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
              <Radar className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Live Incident Map Radar</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Real-time spatial visualization displaying active SOS crisis points, geofence boundary alerts, and anonymized tourist density heatmaps across India.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
              <Activity className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Incident Triage Queue</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              A live updating dispatch triage board where operators manage, assign, and advance emergency response workflows from initial intake to on-scene resolution.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
              <BarChart3 className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Fraud &amp; Trend Analytics</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Visual analytics charts (using Recharts) tracking common scam locations, peak influx zones, responder efficiency, and resolution time metrics.
            </p>
          </div>
        </div>

        {/* Live Demo Callout */}
        <div className="rounded-2xl bg-slate-900 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <h3 className="font-serif text-2xl font-bold">Access the Live Command Center</h3>
            <p className="text-sm text-slate-300">
              Authorized control room operators and emergency personnel can access the interactive radar dashboard immediately.
            </p>
          </div>
          <Link
            href="/dashboard/command"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 transition-colors shrink-0"
          >
            <span>Open Command Console</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
