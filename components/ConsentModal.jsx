"use client";

import { ShieldAlert, CheckCircle2, XCircle, Building2, Smartphone, Shield, ArrowRight } from "lucide-react";

export function ConsentModal({ request, onApprove, onDeny }) {
  if (!request) return null;

  const requesterIcons = {
    hotel: <Building2 className="size-6 text-blue-600" />,
    telecom: <Smartphone className="size-6 text-emerald-600" />,
    authority: <Shield className="size-6 text-red-600" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100">
            {requesterIcons[request.requester_type] || <ShieldAlert className="size-6 text-amber-600" />}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Real-Time Data Consent Request</span>
            <h3 className="text-lg font-bold text-slate-900">{request.requester}</h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          This verified provider is requesting temporary access to specific attributes of your SafirPass identity.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span className="text-xs font-semibold uppercase text-slate-500">Requested Data Attributes:</span>
          <ul className="mt-2 space-y-1.5 text-sm">
            {request.attributes.map((attr) => (
              <li key={attr} className="flex items-center gap-2 font-medium text-slate-800">
                <CheckCircle2 className="size-4 text-blue-600" />
                <span className="capitalize">{attr.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
          <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
          <span>Full passport copy and biometric face vectors are NEVER shared.</span>
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <XCircle className="size-4 text-red-500" /> Deny Access
          </button>
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            <CheckCircle2 className="size-4" /> Approve Token
          </button>
        </div>
      </div>
    </div>
  );
}
