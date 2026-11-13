import * as React from "react";

export function TermsOfServiceContent() {
  return (
    <div className="space-y-6 text-[#374151]">
      <div>
        <p className="text-xs uppercase tracking-wider text-[#16A34A] font-semibold mb-1">
          NexDrop Enterprise Logistics
        </p>
        <h2 className="text-xl font-bold text-[#064E3B]">Terms of Service</h2>
        <p className="text-xs text-[#64748B] mt-1">
          Last revised: October 2026 • Effective across all NexDrop customer, merchant, courier, and dispatch operations.
        </p>
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">1. Merchant Account & Registration</h3>
          <p className="text-sm leading-relaxed">
            By registering as a merchant on NexDrop, you confirm that all company identification, business registration numbers, and operational addresses submitted are true, verified, and legally registered with the relevant authorities. Merchant accounts undergo verification within 1–2 business days before full API access and courier dispatch privileges are granted.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">2. Permissible Shipments & Packaging Standards</h3>
          <p className="text-sm leading-relaxed">
            Merchants agree to package items securely according to NexDrop packaging guidelines. NexDrop strictly prohibits the shipping of hazardous materials, flammable goods, contraband, narcotics, perishable foods without refrigeration clearance, and unregistered firearms or explosives. Any prohibited parcels will be rejected immediately, reported to law enforcement, and lead to permanent account suspension.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">3. Pickup, Dispatch & Delivery SLA</h3>
          <p className="text-sm leading-relaxed">
            NexDrop provides scheduled daily fleet pickups from registered merchant warehouses. Parcels are processed through automated sorting centers with real-time barcode tracking. Standard deliveries are executed within 24–48 hours across primary metropolitan zones. NexDrop commits up to three (3) delivery attempts before redirecting the consignment back to the merchant.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">4. Cash on Delivery (COD) & Payout Cycles</h3>
          <p className="text-sm leading-relaxed">
            When Cash on Delivery (COD) is selected, our couriers collect payment upon customer handover and issue digital confirmation receipts. Collected COD funds are reconciled and settled directly to the merchant&apos;s registered corporate bank account on our automated bi-weekly remittance schedule.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">5. Rates, Billing & Cancellations</h3>
          <p className="text-sm leading-relaxed">
            Shipping rates are computed via the NexDrop Tiered Pricing Engine based on parcel weight, volume dimensions, and destination zones. Parcel cancellation requests must be received prior to courier pickup dispatch. Once a parcel is in transit, standard routing charges apply.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">6. Liability, Insurance & Claims</h3>
          <p className="text-sm leading-relaxed">
            In the event of verified transit damage or loss attributable to courier handling, claims must be logged within forty-eight (48) hours of delivery status update. Reimbursements follow the NexDrop Standard Merchant Protection Policy or declared parcel insurance value.
          </p>
        </section>
      </div>
    </div>
  );
}

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-[#374151]">
      <div>
        <p className="text-xs uppercase tracking-wider text-[#16A34A] font-semibold mb-1">
          NexDrop Data Protection
        </p>
        <h2 className="text-xl font-bold text-[#064E3B]">Privacy Policy</h2>
        <p className="text-xs text-[#64748B] mt-1">
          Last revised: October 2026 • How we safeguard customer, merchant, and courier data.
        </p>
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">1. Information We Collect</h3>
          <p className="text-sm leading-relaxed">
            To provide reliable parcel logistics, NexDrop collects:
          </p>
          <ul className="list-disc pl-5 text-sm space-y-1 text-[#4B5563]">
            <li><strong>Merchant Data:</strong> Business name, registration numbers, contact person, verified email address, billing information, and warehouse coordinates.</li>
            <li><strong>Recipient Details:</strong> Customer name, masked delivery contact number, delivery address, and parcel contents declaration.</li>
            <li><strong>Courier Telemetry:</strong> Real-time GPS location updates while couriers are actively completing an assigned delivery route.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">2. How We Utilize Your Data</h3>
          <p className="text-sm leading-relaxed">
            Your data is utilized strictly for executing shipping orders, calculating optimal delivery routes, sending automated tracking milestone alerts (SMS/Email), reconciling COD remittances, and preventing fraudulent shipments. We never sell or license merchant or customer personal data to third-party advertisers.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">3. Data Masking & Courier Privacy</h3>
          <p className="text-sm leading-relaxed">
            NexDrop enforces privacy-by-design. Couriers access recipient phone numbers only through one-way masked relay channels or masked strings (e.g., +94 771 *** 4521) to prevent unauthorized retention of personal customer details on personal mobile devices.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">4. Infrastructure Security & Encryption</h3>
          <p className="text-sm leading-relaxed">
            All data in transit is encrypted using TLS 1.3/HTTPS and secure WebSockets. Data at rest is encrypted in high-security cloud database infrastructure (PostgreSQL/Supabase) with strict Row Level Security (RLS) policies and Argon2 password hashing.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-[#064E3B]">5. Your Data Rights & Contact</h3>
          <p className="text-sm leading-relaxed">
            Under applicable digital data protection standards, merchants and recipients may request inspection, correction, or deletion of their account records by emailing our Data Protection Officer at{" "}
            <a href="mailto:privacy@nexdrop.com" className="text-[#064E3B] font-medium underline hover:text-[#16A34A]">
              privacy@nexdrop.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

