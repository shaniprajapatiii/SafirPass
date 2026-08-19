import Link from "next/link";
import { QrCode, Lock, Blocks, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Technology & Cryptography — SafirPass",
  description: "Deep dive into Time-Based Rotating Payloads (TRP), Zero-Knowledge Proofs (ZKP), device enclave binding, and Merkle root blockchain anchors.",
};

export default function TechnologyPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Cryptographic Architecture</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Privacy-Preserving Dynamic Credentials
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            SafirPass bridges real-world government e-KYC with modern zero-trust cryptography. Learn how our multi-layered security prevents identity theft, document cloning, and central database leaks.
          </p>
        </div>

        {/* Pillars of Tech */}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <QrCode className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Time-Based Rotating Payload (TRP)</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Similar to TOTP two-factor authentication, SafirPass generates dynamic QR credentials that recalculate their cryptographic signature every 30 to 60 seconds. A stolen screenshot or printed photo becomes instantly invalid after the time window expires.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Lock className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Zero-Knowledge Proofs (ZKP)</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Verifiers receive signed binary responses (Valid / Invalid) along with only the specific authorized attribute fields requested. The verifier proves that the traveller meets age or stay requirements without reading background personal information.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Smartphone className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Hardware Enclave Binding</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Digital identity private keys are cryptographically bound to the smartphone's Trusted Platform Module (TPM) or Apple Secure Enclave. Exporting or cloning credentials to another device is physically impossible.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Blocks className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Blockchain Merkle Anchor &amp; Revocation</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Zero PII is written to the ledger. Instead, only Merkle root hashes of issued credentials, authority public keys, and revocation status booleans exist on-chain. If a phone is reported lost, the revocation flag immediately invalidates all scans globally.
            </p>
          </div>
        </div>

        {/* Security Specs Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <h3 className="font-serif text-2xl font-bold text-slate-900">Security Architecture Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3 px-4 font-bold">Security Layer</th>
                  <th className="py-3 px-4 font-bold">Standard Enforced</th>
                  <th className="py-3 px-4 font-bold">Privacy Guarantee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Data at Rest</td>
                  <td className="py-3 px-4 text-slate-600">AES-256 GCM Encryption</td>
                  <td className="py-3 px-4 text-slate-600">Encrypted in smartphone hardware vault</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Data in Transit</td>
                  <td className="py-3 px-4 text-slate-600">TLS 1.3 with Perfect Forward Secrecy</td>
                  <td className="py-3 px-4 text-slate-600">E2E payload protection</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Blockchain Ledger</td>
                  <td className="py-3 px-4 text-slate-600">Merkle Root Hashing &amp; Public Key Registry</td>
                  <td className="py-3 px-4 text-slate-600">Zero PII or raw text on-chain</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Local Offline Checks</td>
                  <td className="py-3 px-4 text-slate-600">Offline Scanned JWT / Local Bluetooth RSA-2048</td>
                  <td className="py-3 px-4 text-slate-600">Verifiable without cellular coverage</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
