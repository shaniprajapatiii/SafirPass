export const metadata = {
  title: "Privacy Policy — SafirPass",
  description: "Read our privacy policy and zero PII data minimization commitment under GDPR and DPDP guidelines.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page max-w-4xl space-y-8 text-slate-700">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Legal &amp; Compliance</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900">Privacy Policy &amp; Data Sovereignty</h1>
          <p className="text-sm text-slate-500">Effective Date: August 19, 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-slate-900">1. Data Minimization Principle</h2>
          <p>
            SafirPass operates strictly on the principle of data minimization ("Share Only What Is Necessary"). We never broadcast full passport copies, visa files, or facial biometric embeddings to verifiers or third-party service providers.
          </p>

          <h2 className="text-lg font-bold text-slate-900">2. Blockchain &amp; Zero PII Guarantee</h2>
          <p>
            Under no circumstances are raw passport numbers, full names, or facial biometric vectors stored on the blockchain. The ledger stores only cryptographic Merkle roots of issued credentials, authority signature registry keys, and binary revocation flags.
          </p>

          <h2 className="text-lg font-bold text-slate-900">3. Hardware Device Binding</h2>
          <p>
            Cryptographic keys issued to your profile are sealed in your smartphone's physical secure enclave (TPM/Keychain). Credential keys cannot be cloned or transferred to another device.
          </p>

          <h2 className="text-lg font-bold text-slate-900">4. Statutory Compliance</h2>
          <p>
            Attributes shared during hotel check-in strictly satisfy statutory reporting requirements (such as Form C under the Foreigners Act in India). Every data disclosure requires your explicit real-time approval.
          </p>
        </div>
      </div>
    </div>
  );
}
