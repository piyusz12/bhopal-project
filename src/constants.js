export const C = {
  bg: "#03080f", panel: "#080e1a", border: "#0f1e35",
  teal: "#00e5c7", blue: "#1e6fff", purple: "#9b7ff4",
  amber: "#ffa733", red: "#ff4055", green: "#00cc88",
  cyan: "#00d4ff",
  text: "#c0cce0", muted: "#3d4f6a", dim: "#1a2840"
};

export const DOMAINS = {
  ecommerce: {
    label: "E-Commerce", icon: "◈", accent: C.teal,
    kb: `[Return Policy] Items returnable within 30 days. Software licenses non-refundable after activation. Electronics must be unopened. 15% restocking fee on items over ₹40,000.
[Shipping] Standard 5-7 days (₹500). Express 2-3 days (₹1,000). Overnight (₹2,000). Free shipping orders over ₹5,000.
[Order Tracking] Track via customer portal with order ID. Tracking numbers emailed within 24h of dispatch.
[Cancellation] Orders cancellable within 2 hours of placement. Post-dispatch: initiate return instead.
[Payment] Visa, Mastercard, Amex, PayPal, UPI, RuPay accepted. EMI installments for orders over ₹5,000.
[Damaged Items] Report within 48h with photo evidence. Replacement/refund within 3-5 business days.`,
    greeting: "Welcome to ShopAI Support. Ask me about orders, returns, shipping, or product policies.",
  },
  banking: {
    label: "Banking", icon: "⬡", accent: C.blue,
    kb: `[Account Opening] Requires 2 government IDs, proof of address (<90 days), minimum ₹10,000 deposit.
[Interest Rates] Savings: 4.75% APY. Money Market: 5.12% APY. 12-mo CD: 5.45% APY.
[Wire Transfers] Domestic: ₹100 fee, same-day. International: ₹1,000 fee, 3-5 days. SWIFT: NXBNK22.
[Fraud Reporting] Call 1-800-NEXUS-FR. Card frozen in 60s. Provisional credit in 48h per Regulation E.
[Loans] Personal: 7.9–24.9% APR. Home equity: Prime+1.5%. Auto 36-mo: 6.4%, 60-mo: 6.9%.
[Compliance] DICGC insured up to ₹5,00,000. CTR required for transactions over ₹10,00,000. SOC 2 Type II certified.`,
    greeting: "Welcome to Nexus Bank. I can assist with accounts, transfers, loans, and compliance questions.",
  },
  healthcare: {
    label: "Healthcare", icon: "◉", accent: "#ff6b9d",
    kb: `[Appointments] Primary care: 3-5 days. Urgent care: same day. Specialist: 2-4 weeks (referral required). Telehealth: within 4h.
[Insurance] BlueCross, Aetna, Cigna, United, Medicare, Medicaid accepted. Co-pay: ₹500 primary, ₹1,000 specialist.
[Prescriptions] 90-day maintenance supply covered. Mail-order saves 20%. Specialty meds require prior auth.
[HIPAA] PHI encrypted AES-256 at rest, TLS 1.3 in transit. Patients may access records within 30 days.
[Emergency] Call 911 for emergencies. ER: MedCore Central & North Campus (both 24/7). Nurse line: 1-877-MED-CORE.
[Billing] Itemized bills in 10 days. Financial assistance available. 0% interest payment plans offered.`,
    greeting: "Hello, I'm MedCore's health assistant. I can help with appointments, insurance, prescriptions, and billing.",
  },
  education: {
    label: "Education", icon: "△", accent: C.amber,
    kb: `[Enrollment] Fall: June 1. Spring: Nov 1. Transfer credits evaluated in 3 weeks. TOEFL ≥90 or IELTS ≥7.0 for international students.
[Financial Aid] FAFSA priority: March 1. Merit scholarships for GPA ≥3.7. Need-based grants up to ₹5,00,000/yr.
[Tuition] Undergrad in-state: ₹1,00,000/semester. Out-of-state: ₹2,50,000. Graduate: ₹1,50,000. Online: ₹5,000/credit hour.
[Academic Policy] Grade appeal: 15 business days post-submission. Incomplete deadline: end of following semester.
[FERPA] Student records protected under FERPA. Third-party release requires written student consent.
[Resources] Tutoring Mon-Fri 9am-9pm. 5 free counseling sessions/semester. Career services available.`,
    greeting: "Welcome to Apex University Support. Ask me about enrollment, financial aid, courses, or campus resources.",
  },
  government: {
    label: "Government", icon: "⬟", accent: C.purple,
    kb: `[Tax Filing] Federal deadline April 15. Extension to Oct 15 (Form 4868). Tax rebate up to ₹12,500 under 87A. Child education allowance ₹1,200/child.
[Business Permits] Business license: 15-30 days. Zoning variance: 45-60 days. Building permit: 10-25 days.
[Benefits] SNAP: household income ≤130% poverty line. Medicaid up to 138% FPL. UI: up to 26 weeks, 50% avg wages.
[FedRAMP] Cloud services require FedRAMP authorization. Continuous monitoring & annual pen testing mandatory.
[Section 508] WCAG 2.1 Level AA compliance required for all digital services. Screen reader testing mandatory.
[DMV] License renewal: online ₹500, in-person ₹800. Title transfer: ₹300+taxes. REAL ID available at all branches.`,
    greeting: "Welcome to CivicAI — your government services assistant. I can help with taxes, permits, and benefits.",
  },
};

export const PII_PATTERNS = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, label: "SSN" },
  { re: /\b\d{16}\b/g, label: "Credit Card" },
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "Email" },
  { re: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: "Phone" },
];

export const SENTIMENT_CONFIG = {
  very_frustrated: { color: C.red, label: "⚡ Very Frustrated", bg: "#1a0510" },
  frustrated: { color: C.amber, label: "⚠ Frustrated", bg: "#1a1005" },
  negative: { color: "#ff9966", label: "↓ Negative", bg: "#180e08" },
  neutral: { color: C.muted, label: "— Neutral", bg: "#0a1020" },
  positive: { color: C.green, label: "↑ Positive", bg: "#051510" },
};

export const INTENT_ICONS = {
  order_status: "📦", policy_query: "📋", complaint: "⚠", billing: "💳",
  general: "💬", emergency: "🚨", escalation: "↑", scheduling: "📅",
  account: "👤", default: "◈"
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";
