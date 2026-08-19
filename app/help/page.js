import Link from "next/link";
import { PhoneCall, HelpCircle, ShieldAlert, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Help & FAQs — SafirPass",
  description: "Frequently asked questions, emergency helpline numbers, and tourist support directory.",
};

const FAQS = [
  {
    q: "Is SafirPass legally recognized in India?",
    a: "Yes. SafirPass integrates e-Visa records and provides Form-C statutory guest reporting for hotels under the Foreigners Act, operating alongside Ministry of Tourism guidelines.",
  },
  {
    q: "Do I need an internet connection to present my QR credential?",
    a: "No. Critical credential tokens and Code 128 barcodes are safely cached locally in your phone's secure enclave. Desks can scan your QR code offline.",
  },
  {
    q: "What happens if I press the Emergency SOS button by accident?",
    a: "The panic button requires a deliberate 3-second press-and-hold gesture. If triggered accidentally, you have a 5-second countdown window to cancel the alert.",
  },
  {
    q: "How does hotel check-in work with SafirPass?",
    a: "Simply show your dynamic QR code at the reception desk. The hotel scanner receives only your Name, ID validity, and Stay dates — satisfying Form C requirements without taking physical paper photocopies.",
  },
];

export default function HelpPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Support &amp; Assistance</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Frequently Asked Questions &amp; Helplines
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Need help setting up your Digital Tourist ID or navigating emergency features? Explore answers below or call our 24x7 toll-free helpline.
          </p>
        </div>

        {/* Emergency Callouts */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">24x7 Multilingual Tourist Helpline</span>
              <p className="font-serif text-2xl font-bold text-amber-950 mt-1">1363 / 1800-11-1363</p>
            </div>
            <a href="tel:1363" className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-700">
              Call 1363
            </a>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-800">National Emergency Response</span>
              <p className="font-serif text-2xl font-bold text-red-950 mt-1">112</p>
            </div>
            <a href="tel:112" className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700">
              Call 112
            </a>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-bold text-slate-900">Common Questions</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-2">
                <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
