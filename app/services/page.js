import Link from "next/link";
import {
  Building2,
  Smartphone,
  Landmark,
  Car,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Universal Tourist Ecosystem — SafirPass Services Integration",
  description:
    "Verify once and use across hotels (Form C), telecom SIM KYC, national monuments, public transit, and vehicle rentals.",
};

const SERVICES = [
  {
    icon: <Building2 className="size-8 text-blue-600" />,
    title: "Hotels & Homestays (Form C Compliance)",
    desc: "Under the Foreigners Act, Indian hotels must register international guests. SafirPass transmits verified check-in fragments (Name, ID validity, Stay dates) directly to Form-C portals without paper photocopying.",
    attributes: [
      "Full Name",
      "Nationality",
      "Check-in / Check-out Dates",
      "Tourist ID",
    ],
  },
  {
    icon: <Smartphone className="size-8 text-blue-600" />,
    title: "Telecom e-SIM & Physical SIM KYC",
    desc: "Instantly activate local mobile data plans upon arrival. SIM providers receive mandatory telecom e-KYC fragments with explicit traveller consent, eliminating long airport queues.",
    attributes: [
      "Full Name",
      "Nationality",
      "Masked Passport Number",
      "e-Visa Reference",
    ],
  },
  {
    icon: <Landmark className="size-8 text-blue-600" />,
    title: "National Parks, Monuments & Museums",
    desc: "Enjoy seamless entry at UNESCO heritage sites, ASI national monuments, and museums. Ticketing desks scan your dynamic QR to verify international tourist pricing and concessions.",
    attributes: ["Nationality", "Tourist ID Validity"],
  },
  {
    icon: <Car className="size-8 text-blue-600" />,
    title: "Car, Scooter & Vehicle Rentals",
    desc: "Rent vehicles confidently. Rental agencies verify international driving permits and identity status via signed binary tokens without retaining physical copies.",
    attributes: ["Full Name", "Driving Eligibility Flag", "Emergency Contact"],
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Universal Ecosystem
          </span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Verify Once, Use Across Trusted Services
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            SafirPass seamlessly integrates with public and private service
            providers across India, eliminating redundant paperwork for
            international travellers.
          </p>
        </div>

        {/* Hero image */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
          <img
            src="/assets/hotel-checkin.jpg"
            alt="International tourist checking into hotel desk with SafirPass digital QR token"
            className="w-full h-[360px] object-cover"
          />
        </div>

        {/* Services List */}
        <div className="grid gap-8 lg:grid-cols-2">
          {SERVICES.map((s, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex size-14 items-center justify-center rounded-xl bg-white shadow-md border border-slate-200">
                  {s.icon}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{s.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Data Disclosed With Consent:
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {s.attributes.map((attr) => (
                    <span
                      key={attr}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      <CheckCircle2 className="size-3 text-blue-600" /> {attr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="rounded-2xl bg-slate-900 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <h3 className="font-serif text-2xl font-bold">
              Are you a service provider or hotel manager?
            </h3>
            <p className="text-sm text-slate-300">
              Integrate SafirPass verification API to accelerate guest check-in,
              ensure Form-C compliance, and eliminate fraud.
            </p>
          </div>
          <Link
            href="/auth"
            className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 transition-colors shrink-0"
          >
            Partner Integration Access
          </Link>
        </div>
      </div>
    </div>
  );
}
