import Link from "next/link";
import { Landmark, ShieldCheck, FileCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Consular & Embassy Support — SafirPass",
  description: "Emergency travel document issuance and instant consular verification for international tourists who lose physical passports abroad.",
};

export default function EmbassyPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Consular Services</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Lost Passport Abroad? Instant Consular Verification
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            If a tourist loses their physical passport while travelling abroad, diplomatic missions and consular desks use SafirPass to verify identity instantly, accelerating emergency travel document issuance from days to minutes.
          </p>
        </div>

        {/* Hero Image */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
          <img
            src="/assets/embassy.jpg"
            alt="Consular officer verifying international tourist identity for emergency travel document"
            className="w-full h-[380px] object-cover"
          />
        </div>

        {/* Process */}
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-3">
            <span className="font-serif text-3xl font-extrabold text-blue-600">01</span>
            <h3 className="text-lg font-bold text-slate-900">Encrypted Identity Vault</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The traveller's pre-verified e-KYC record, passport metadata, and liveness audit trail are securely accessible by accredited consular officials.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-3">
            <span className="font-serif text-3xl font-extrabold text-blue-600">02</span>
            <h3 className="text-lg font-bold text-slate-900">Biometric Face Re-Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The embassy desk executes a live 1-to-1 face match comparing the traveller present in the room with the original passport photo embedding stored during e-KYC.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-3">
            <span className="font-serif text-3xl font-extrabold text-blue-600">03</span>
            <h3 className="text-lg font-bold text-slate-900">Emergency Travel Document</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              With identity confirmed beyond doubt, the embassy issues an official Emergency Certificate or replacement passport without waiting for postal verification from the home country.
            </p>
          </div>
        </div>

        {/* Call to action */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <h3 className="font-serif text-2xl font-bold text-slate-900">Embassies &amp; Diplomatic Missions</h3>
            <p className="text-sm text-slate-700">
              Access the official diplomatic verification portal to resolve lost document claims and verify foreign nationals in India.
            </p>
          </div>
          <Link
            href="/auth"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors shrink-0"
          >
            <span>Consular Portal Access</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
