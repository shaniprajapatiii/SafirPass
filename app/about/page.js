import Link from "next/link";
import { ShieldCheck, Award, Globe, Heart } from "lucide-react";

export const metadata = {
  title: "About SafirPass — Vision & Alignment",
  description: "Learn about SafirPass, our mission to protect international tourists, and alignment with Digital India and Incredible India initiatives.",
};

export default function AboutPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Mission &amp; Alignment</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Pioneering Safe &amp; Seamless Tourism for India and Beyond
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            SafirPass was born out of a single vision: to empower international travellers with absolute data sovereignty while providing government authorities with a real-time, proactive safety grid.
          </p>
        </div>

        {/* Core Values */}
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
              <ShieldCheck className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Privacy First</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We strictly enforce minimal data disclosure. Your physical passport document and face biometrics are never sold, rented, or stored unencrypted.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
              <Globe className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Digital India Integration</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              SafirPass aligns seamlessly with DigiYatra airport flows, e-Visa portals, and the National Emergency Response System (112).
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-700 font-bold">
              <Heart className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Atithi Devo Bhava</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Embodying India's timeless ethos "The Guest is God", SafirPass ensures that every international traveller enjoys safety, respect, and peace of mind.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
