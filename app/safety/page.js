import Link from "next/link";
import { Siren, MapPin, AlertTriangle, ShieldCheck, PhoneCall, ArrowRight, Activity, Radio } from "lucide-react";

export const metadata = {
  title: "Safety Grid & Emergency SOS — SafirPass",
  description: "AI-powered spatial safety monitoring, PostGIS digital geofencing, real-time telemetry lock, and automated 112 emergency dispatch pipeline.",
};

export default function SafetyPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
            <Siren className="size-4 animate-pulse" /> Autonomous Safety Architecture
          </span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Proactive Spatial Safety &amp; Emergency Incident Grid
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            SafirPass operates a silent, background safety grid that monitors movement trends, sends localized advisories, and instantly dispatches emergency responders when panic triggers occur.
          </p>
        </div>

        {/* Hero Image */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
          <img
            src="/assets/emergency-response.jpg"
            alt="Police and paramedics responding to SafirPass emergency SOS dispatch"
            className="w-full h-[380px] object-cover"
          />
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-red-100 text-red-600 font-bold">
              <MapPin className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">PostGIS Digital Geofencing</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Virtual polygonal boundaries are rendered across maps to mark restricted zones, active hazard areas, or known scam hotspots. Travellers receive gentle warnings upon approach.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-amber-100 text-amber-600 font-bold">
              <Activity className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">AI Movement Anomaly Detection</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sequential movement models analyze anonymized telemetry. Prolonged static immobility or sudden drift into desolate restricted areas prompts automated safety status check-ins.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              <Radio className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Automated Safety Broadcasts</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Receive hyper-local broadcasts regarding weather warnings, political disturbances, or active tourist scam advisories verified by state tourism authorities.
            </p>
          </div>
        </div>

        {/* Multi-Stage SOS Explanation */}
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 md:p-12 space-y-8">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">Emergency Protocol</span>
            <h2 className="font-serif text-3xl font-bold text-slate-900">
              How the Multi-Stage SOS Panic Button Works
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Designed for high-stress situations, the SOS trigger prevents accidental pocket dials while ensuring instant dispatch within seconds.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "3-Second Hold Gesture", desc: "User holds the SOS control for 3 full seconds to confirm intent." },
              { step: "02", title: "Instant Telemetry Lock", desc: "Locks exact GPS coordinates, altitude, and device battery level." },
              { step: "03", title: "AI Classification", desc: "Classifies incident into Medical, Assault, Scam, or Lost Property." },
              { step: "04", title: "Targeted Dispatch", desc: "Routes ticket to nearest Police 112 unit, Ambulance, or Embassy." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-red-200 bg-white p-5 shadow-sm space-y-2">
                <span className="font-serif text-2xl font-extrabold text-red-600">{s.step}</span>
                <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                <p className="text-xs text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-red-200">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-800">
              <span>National Helpline: <a href="tel:112" className="text-red-700 font-bold underline">112</a></span>
              <span>Tourist Helpline: <a href="tel:1363" className="text-blue-700 font-bold underline">1363</a></span>
            </div>

            <Link
              href="/dashboard/sos"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-700 transition-colors"
            >
              <span>Test SOS Simulation</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
