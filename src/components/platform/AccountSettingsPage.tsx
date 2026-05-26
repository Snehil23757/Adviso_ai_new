import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Database,
  Key,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { motion } from "motion/react";

import { apiFailureMessage, authorizedFetch, readApiJson } from "../../config";

type SettingsTab = "account" | "billing" | "preferences" | "security" | "api" | "notifications";

interface AccountSettingsResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    full_name: string;
    profile_picture: string;
    auth_provider: string;
    plan_id: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    last_login: string | null;
    login_count?: number;
  };
  subscription: {
    plan_id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    auto_renew: boolean;
    razorpay_order_id?: string | null;
    razorpay_payment_id?: string | null;
  };
  plan: {
    id: string;
    name: string;
    monthly_price: number;
    yearly_price: number;
    description: string;
  };
  permissions: {
    features: Record<string, boolean>;
    tabs: string[];
    routes: string[];
  };
  preferences: AccountPreferences;
  payment_preference: PaymentPreference;
  payments: Array<{
    id: number;
    plan_id: string;
    amount: number;
    currency: string;
    payment_status: string;
    razorpay_order_id: string;
    razorpay_payment_id: string | null;
    created_at: string;
  }>;
  usage: Array<{
    id: number;
    endpoint: string;
    tokens_used: number;
    request_type: string;
    created_at: string;
  }>;
  activity: {
    last_login: string | null;
    login_count: number;
    created_at: string | null;
    auth_provider: string;
    active_sessions: number;
  };
}

interface AccountPreferences {
  theme: string;
  language: string;
  timezone: string;
  email_notifications: boolean;
  product_updates: boolean;
  security_alerts: boolean;
}

interface PaymentPreference {
  preferred_method: string;
  upi_id: string;
  billing_name: string;
  billing_email: string;
  billing_phone: string;
  notes: string;
  updated_at?: string;
}

interface AccountSettingsPageProps {
  fallbackEmail: string;
  onUpgrade: () => void;
  currentTheme: "light" | "dark";
  onThemePreferenceChange?: (preference: string) => void;
}

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "billing", label: "Plan & Billing" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "api", label: "API Keys" },
  { id: "notifications", label: "Notifications" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(amountPaise = 0) {
  if (!amountPaise) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultPreferences(): AccountPreferences {
  return {
    theme: "system",
    language: "English",
    timezone: "Asia/Kolkata",
    email_notifications: true,
    product_updates: true,
    security_alerts: true,
  };
}

function defaultPaymentPreference(fallbackEmail: string): PaymentPreference {
  return {
    preferred_method: "razorpay_checkout",
    upi_id: "",
    billing_name: "",
    billing_email: fallbackEmail,
    billing_phone: "",
    notes: "",
  };
}

export default function AccountSettingsPage({
  fallbackEmail,
  onUpgrade,
  currentTheme,
  onThemePreferenceChange,
}: AccountSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [settings, setSettings] = useState<AccountSettingsResponse | null>(null);
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultPreferences);
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference>(defaultPaymentPreference(fallbackEmail));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authorizedFetch("/api/account/settings");
      const payload = await readApiJson<AccountSettingsResponse>(response);
      const nextPreferences = { ...defaultPreferences(), ...payload.preferences };
      setSettings(payload);
      setPreferences(nextPreferences);
      setPaymentPreference({ ...defaultPaymentPreference(fallbackEmail), ...payload.payment_preference });
      onThemePreferenceChange?.(nextPreferences.theme);
    } catch (nextError) {
      setError(apiFailureMessage(nextError, "Account settings could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const savePreferences = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await authorizedFetch("/api/account/preferences", {
        method: "PATCH",
        body: JSON.stringify(preferences),
      });
      const payload = await readApiJson<AccountSettingsResponse>(response);
      const nextPreferences = { ...defaultPreferences(), ...payload.preferences };
      setSettings(payload);
      setPreferences(nextPreferences);
      setPaymentPreference({ ...defaultPaymentPreference(fallbackEmail), ...payload.payment_preference });
      onThemePreferenceChange?.(nextPreferences.theme);
      setSuccess("Preferences saved.");
    } catch (nextError) {
      setError(apiFailureMessage(nextError, "Preferences could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const savePaymentPreference = async () => {
    setSavingPayment(true);
    setError("");
    setSuccess("");
    try {
      const response = await authorizedFetch("/api/account/payment-method", {
        method: "PATCH",
        body: JSON.stringify(paymentPreference),
      });
      const payload = await readApiJson<AccountSettingsResponse>(response);
      setSettings(payload);
      setPaymentPreference({ ...defaultPaymentPreference(fallbackEmail), ...payload.payment_preference });
      setSuccess("Payment option saved.");
    } catch (nextError) {
      setError(apiFailureMessage(nextError, "Payment option could not be saved."));
    } finally {
      setSavingPayment(false);
    }
  };

  const user = settings?.user;
  const plan = settings?.plan;
  const activity = settings?.activity;
  const featureNames = useMemo(
    () => Object.entries(settings?.permissions.features || {}).filter(([, enabled]) => enabled).map(([feature]) => feature),
    [settings],
  );
  const displayName = user?.full_name || user?.email?.split("@")[0] || fallbackEmail.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const role = user?.is_admin ? "Owner" : "Member";

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--ap-text)]">Account Settings</h1>
          <p className="mt-1 text-sm ap-muted">Manage your profile, plan, security, and preferences.</p>
        </div>
        <button onClick={loadSettings} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black self-start xl:self-auto">
          Refresh account data
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto border-b" style={{ borderColor: "var(--ap-border)" }}>
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-black transition ${activeTab === tab.id ? "border-[#145DFF] text-[#145DFF]" : "border-transparent ap-muted"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-500">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600">{success}</div>}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="ap-card h-64 animate-pulse rounded-2xl border" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "account" && settings && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)]">
              <section className="ap-card rounded-2xl border p-5">
                <SectionHeader title="Profile Information" detail="Synced from authenticated backend user records." />
                <div className="mt-8 grid gap-8 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="text-center">
                    <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#145DFF] to-[#20D7FF] text-4xl font-black text-white shadow-lg shadow-blue-500/20">
                      {user?.profile_picture ? <img src={user.profile_picture} alt="" className="h-full w-full object-cover" /> : initial}
                    </div>
                    <button className="ap-btn mt-4 rounded-xl px-4 py-2.5 text-xs font-black">Change Avatar</button>
                  </div>
                  <div className="grid gap-4 text-sm">
                    <InfoRow label="Full Name" value={displayName} />
                    <InfoRow label="Email" value={user?.email || fallbackEmail} />
                    <InfoRow label="Role" value={role} />
                    <InfoRow label="Auth Provider" value={titleCase(user?.auth_provider || "password")} />
                    <InfoRow label="Joined On" value={formatDate(user?.created_at)} />
                  </div>
                </div>
              </section>

              <section className="ap-card rounded-2xl border p-5">
                <SectionHeader title="Active Plan" detail={`You are currently on the ${plan?.name || "Free"} plan.`} />
                <div className="ap-plan-panel mt-5 rounded-2xl border p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">{plan?.name || "Free"} Plan</h3>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-black text-emerald-600">
                            {titleCase(settings.subscription.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm ap-muted">{plan?.description || "Basic workspace access."}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {featureNames.slice(0, 6).map((feature) => (
                            <span key={feature} className="rounded-full border px-2.5 py-1 text-[11px] font-bold text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
                              {titleCase(feature)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black">{formatPrice(plan?.monthly_price)}</div>
                      <div className="text-xs ap-muted">per month</div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-2" style={{ borderColor: "var(--ap-border)" }}>
                    <InfoRow label="Billing Cycle" value={settings.subscription.auto_renew ? "Auto renew" : "Manual renewal"} compact />
                    <InfoRow label="Next Renewal" value={settings.subscription.end_date ? formatDate(settings.subscription.end_date) : "No expiry"} compact />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button className="ap-btn rounded-xl px-4 py-3 text-sm font-black" onClick={() => setActiveTab("billing")}>Manage Subscription</button>
                  <button className="ap-btn-primary rounded-xl px-4 py-3 text-sm font-black" onClick={onUpgrade}>Upgrade Plan</button>
                </div>
              </section>

              <PaymentMethodCard
                paymentPreference={paymentPreference}
                setPaymentPreference={setPaymentPreference}
                onSave={savePaymentPreference}
                saving={savingPayment}
              />

              <ActivityCard settings={settings} />
              <SecurityCard settings={settings} />
              <PreferencesCard preferences={preferences} setPreferences={setPreferences} onSave={savePreferences} saving={saving} currentTheme={currentTheme} />
              <EnterpriseCard onUpgrade={onUpgrade} />
            </div>
          )}

          {activeTab === "billing" && settings && (
            <BillingTab
              settings={settings}
              onUpgrade={onUpgrade}
              paymentPreference={paymentPreference}
              setPaymentPreference={setPaymentPreference}
              onSavePayment={savePaymentPreference}
              savingPayment={savingPayment}
            />
          )}

          {activeTab === "preferences" && (
            <PreferencesCard preferences={preferences} setPreferences={setPreferences} onSave={savePreferences} saving={saving} currentTheme={currentTheme} expanded />
          )}

          {activeTab === "security" && settings && (
            <SecurityTab settings={settings} />
          )}

          {activeTab === "api" && settings && (
            <ApiKeysTab settings={settings} />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab preferences={preferences} setPreferences={setPreferences} onSave={savePreferences} saving={saving} />
          )}
        </>
      )}
    </motion.div>
  );
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h2 className="text-lg font-black text-[var(--ap-text)]">{title}</h2>
      <p className="mt-1 text-sm ap-muted">{detail}</p>
    </div>
  );
}

function InfoRow({ label, value, compact = false }: { label: string; value: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? "" : "border-b pb-3"} style={{ borderColor: "var(--ap-border)" }}>
      <div className="text-xs font-bold ap-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--ap-text)]">{value}</div>
    </div>
  );
}

function ActivityCard({ settings }: { settings: AccountSettingsResponse }) {
  return (
    <section className="ap-card rounded-2xl border p-5">
      <SectionHeader title="Account Activity" detail="Recent login and authenticated workspace activity." />
      <div className="mt-5 space-y-4">
        <ActivityRow icon={<User className="h-4 w-4" />} label="Last Login" value={formatDate(settings.activity.last_login)} />
        <ActivityRow icon={<Database className="h-4 w-4" />} label="Verified Sessions" value={`${settings.activity.login_count || 0} checks`} />
        <ActivityRow icon={<CheckCircle2 className="h-4 w-4" />} label="Account Status" value={<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-black text-emerald-600">Active</span>} />
      </div>
      <div className="mt-5 rounded-xl border p-3" style={{ borderColor: "var(--ap-border)" }}>
        <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] ap-muted">Recent API activity</div>
        {settings.usage.length ? (
          <div className="space-y-2">
            {settings.usage.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-[var(--ap-text)]">{item.request_type || item.endpoint}</span>
                <span className="ap-muted">{formatDate(item.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm ap-muted">No usage events recorded yet.</p>
        )}
      </div>
    </section>
  );
}

function ActivityRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">{icon}</span>
      <span className="w-36 text-sm font-black">{label}</span>
      <span className="text-sm ap-muted">{value}</span>
    </div>
  );
}

function SecurityCard({ settings }: { settings: AccountSettingsResponse }) {
  return (
    <section className="ap-card rounded-2xl border p-5">
      <SectionHeader title="Security" detail="Managed by the authentication provider and backend session validation." />
      <div className="mt-5 divide-y" style={{ borderColor: "var(--ap-border)" }}>
        <SecurityRow icon={<Lock className="h-4 w-4" />} title="Password" detail={`${titleCase(settings.user.auth_provider)} sign-in enabled`} action="Managed securely" />
        <SecurityRow icon={<ShieldCheck className="h-4 w-4" />} title="Two-Factor Authentication" detail="Use your identity provider security settings." action="Provider-level" />
        <SecurityRow icon={<Database className="h-4 w-4" />} title="Active Sessions" detail={`${settings.activity.active_sessions} active session`} action="Current device" />
      </div>
    </section>
  );
}

function SecurityRow({ icon, title, detail, action }: { icon: React.ReactNode; title: string; detail: string; action: string }) {
  return (
    <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black">{title}</div>
        <div className="text-xs ap-muted">{detail}</div>
      </div>
      <span className="rounded-xl border px-3 py-2 text-xs font-black text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>{action}</span>
    </div>
  );
}

function PreferencesCard({
  preferences,
  setPreferences,
  onSave,
  saving,
  currentTheme,
  expanded = false,
}: {
  preferences: AccountPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<AccountPreferences>>;
  onSave: () => void;
  saving: boolean;
  currentTheme: "light" | "dark";
  expanded?: boolean;
}) {
  return (
    <section className={`ap-card rounded-2xl border p-5 ${expanded ? "max-w-3xl" : ""}`}>
      <SectionHeader title="Preferences" detail="Customize your workspace experience." />
      <div className="mt-5 space-y-4">
        <PreferenceSelect label="Theme" value={preferences.theme} options={["system", "light", "dark"]} onChange={(theme) => setPreferences((current) => ({ ...current, theme }))} />
        <PreferenceSelect label="Language" value={preferences.language} options={["English", "Hindi", "Spanish", "French"]} onChange={(language) => setPreferences((current) => ({ ...current, language }))} />
        <PreferenceSelect label="Timezone" value={preferences.timezone} options={["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"]} onChange={(timezone) => setPreferences((current) => ({ ...current, timezone }))} />
      </div>
      <div className="mt-4 rounded-xl border p-3 text-xs ap-muted" style={{ borderColor: "var(--ap-border)" }}>
        Current applied workspace theme: <span className="font-black text-[var(--ap-text)]">{titleCase(currentTheme)}</span>
      </div>
      <button onClick={onSave} disabled={saving} className="ap-btn-primary mt-5 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-60">
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </section>
  );
}

function PreferenceSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <span className="text-sm font-black">{label}</span>
      <select className="ap-input rounded-xl border px-3 py-3 text-sm" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{titleCase(option)}</option>
        ))}
      </select>
    </label>
  );
}

function EnterpriseCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="ap-enterprise-card rounded-2xl border p-6">
      <h2 className="text-xl font-black text-[#0B3FCC]">Get more with Adviso AI Enterprise</h2>
      <p className="mt-2 text-sm leading-6 ap-muted">Advanced analytics, custom models, priority support, and team controls.</p>
      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        {["Custom AI models", "Priority support", "Advanced security", "Dedicated onboarding"].map((item) => (
          <div key={item} className="flex items-center gap-2 font-bold">
            <Sparkles className="h-4 w-4 text-[#145DFF]" />
            {item}
          </div>
        ))}
      </div>
      <button onClick={onUpgrade} className="ap-btn mt-6 rounded-xl px-5 py-3 text-sm font-black">Contact Sales</button>
    </section>
  );
}

function PaymentMethodCard({
  paymentPreference,
  setPaymentPreference,
  onSave,
  saving,
  expanded = false,
}: {
  paymentPreference: PaymentPreference;
  setPaymentPreference: React.Dispatch<React.SetStateAction<PaymentPreference>>;
  onSave: () => void;
  saving: boolean;
  expanded?: boolean;
}) {
  return (
    <section className={`ap-card rounded-2xl border p-5 ${expanded ? "xl:col-span-2" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">
          <CreditCard className="h-5 w-5" />
        </div>
        <SectionHeader
          title="Payment Option"
          detail="Saved checkout preference and billing contact. Card numbers are collected only inside Razorpay."
        />
      </div>

      <div className="mt-5 grid gap-4">
        <PreferenceSelect
          label="Preferred Checkout"
          value={paymentPreference.preferred_method}
          options={["razorpay_checkout", "upi", "card"]}
          onChange={(preferred_method) => setPaymentPreference((current) => ({ ...current, preferred_method }))}
        />
        <SettingsTextInput
          label="UPI ID"
          value={paymentPreference.upi_id}
          placeholder="name@bank"
          onChange={(upi_id) => setPaymentPreference((current) => ({ ...current, upi_id }))}
        />
        <SettingsTextInput
          label="Billing Name"
          value={paymentPreference.billing_name}
          placeholder="Your billing name"
          onChange={(billing_name) => setPaymentPreference((current) => ({ ...current, billing_name }))}
        />
        <SettingsTextInput
          label="Billing Email"
          value={paymentPreference.billing_email}
          placeholder="billing@example.com"
          type="email"
          onChange={(billing_email) => setPaymentPreference((current) => ({ ...current, billing_email }))}
        />
        <SettingsTextInput
          label="Phone"
          value={paymentPreference.billing_phone}
          placeholder="+91 98765 43210"
          onChange={(billing_phone) => setPaymentPreference((current) => ({ ...current, billing_phone }))}
        />
        <SettingsTextArea
          label="Billing Notes"
          value={paymentPreference.notes}
          placeholder="GST, company name, or internal billing note"
          onChange={(notes) => setPaymentPreference((current) => ({ ...current, notes }))}
        />
      </div>

      <div className="mt-4 rounded-xl border p-3 text-xs leading-5 ap-muted" style={{ borderColor: "var(--ap-border)" }}>
        To update an actual saved card or UPI mandate, open checkout again. Adviso AI stores only this preference and verified Razorpay payment IDs.
      </div>
      <button onClick={onSave} disabled={saving} className="ap-btn-primary mt-5 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-60">
        {saving ? "Saving..." : "Save payment option"}
      </button>
    </section>
  );
}

function SettingsTextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <span className="text-sm font-black">{label}</span>
      <input
        className="ap-input rounded-xl border px-3 py-3 text-sm"
        style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SettingsTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
      <span className="pt-3 text-sm font-black">{label}</span>
      <textarea
        className="ap-input min-h-24 resize-y rounded-xl border px-3 py-3 text-sm"
        style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function BillingTab({
  settings,
  onUpgrade,
  paymentPreference,
  setPaymentPreference,
  onSavePayment,
  savingPayment,
}: {
  settings: AccountSettingsResponse;
  onUpgrade: () => void;
  paymentPreference: PaymentPreference;
  setPaymentPreference: React.Dispatch<React.SetStateAction<PaymentPreference>>;
  onSavePayment: () => void;
  savingPayment: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="ap-card rounded-2xl border p-5">
        <SectionHeader title="Current Plan" detail={settings.plan.description || "Workspace subscription"} />
        <div className="mt-5 text-4xl font-black">{formatPrice(settings.plan.monthly_price)}</div>
        <div className="text-sm ap-muted">{settings.plan.name} plan, monthly</div>
        <button onClick={onUpgrade} className="ap-btn-primary mt-6 w-full rounded-xl px-4 py-3 text-sm font-black">Upgrade Plan</button>
      </section>
      <PaymentMethodCard
        paymentPreference={paymentPreference}
        setPaymentPreference={setPaymentPreference}
        onSave={onSavePayment}
        saving={savingPayment}
      />
      <section className="ap-card rounded-2xl border p-5 xl:col-span-2">
        <SectionHeader title="Payment History" detail="Stored in PostgreSQL from verified Razorpay orders." />
        <div className="mt-5 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ap-border)" }}>
          {settings.payments.length ? (
            settings.payments.map((payment) => (
              <div key={payment.id} className="grid gap-2 border-b p-4 text-sm last:border-b-0 md:grid-cols-[1fr_140px_120px]" style={{ borderColor: "var(--ap-border)" }}>
                <div>
                  <div className="font-black">{payment.plan_id.toUpperCase()} plan</div>
                  <div className="text-xs ap-muted">{payment.razorpay_payment_id || payment.razorpay_order_id}</div>
                </div>
                <div className="font-black">{formatPrice(payment.amount)}</div>
                <div className="text-xs font-black text-emerald-600">{titleCase(payment.payment_status)}</div>
              </div>
            ))
          ) : (
            <div className="p-5 text-sm ap-muted">No payment records yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function SecurityTab({ settings }: { settings: AccountSettingsResponse }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SecurityCard settings={settings} />
      <section className="ap-card rounded-2xl border p-5">
        <SectionHeader title="Security Events" detail="Recent authenticated backend usage." />
        <div className="mt-5 space-y-3">
          {settings.usage.length ? settings.usage.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border p-3 text-sm" style={{ borderColor: "var(--ap-border)" }}>
              <span className="font-bold">{item.endpoint}</span>
              <span className="text-xs ap-muted">{formatDate(item.created_at)}</span>
            </div>
          )) : <p className="text-sm ap-muted">No security-relevant usage events yet.</p>}
        </div>
      </section>
    </div>
  );
}

function ApiKeysTab({ settings }: { settings: AccountSettingsResponse }) {
  return (
    <section className="ap-card max-w-3xl rounded-2xl border p-6">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-[#145DFF]">
        <Key className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-black">API Keys</h2>
      <p className="mt-2 text-sm leading-6 ap-muted">
        User-facing API keys are not enabled for this workspace yet. Backend-only AI keys remain on the server; no OpenAI or payment secrets are exposed to the browser.
      </p>
      <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "var(--ap-border)" }}>
        <div className="text-xs font-black uppercase tracking-[0.16em] ap-muted">Available API routes</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.permissions.routes.map((route) => (
            <span key={route} className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-[#145DFF]">{route}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function NotificationsTab({
  preferences,
  setPreferences,
  onSave,
  saving,
}: {
  preferences: AccountPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<AccountPreferences>>;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="ap-card max-w-3xl rounded-2xl border p-5">
      <SectionHeader title="Notifications" detail="Stored in account preferences for this user." />
      <div className="mt-5 divide-y" style={{ borderColor: "var(--ap-border)" }}>
        <ToggleRow icon={<Bell className="h-4 w-4" />} title="Email notifications" detail="Workspace summaries and account alerts." checked={preferences.email_notifications} onChange={(email_notifications) => setPreferences((current) => ({ ...current, email_notifications }))} />
        <ToggleRow icon={<Sparkles className="h-4 w-4" />} title="Product updates" detail="New feature and module announcements." checked={preferences.product_updates} onChange={(product_updates) => setPreferences((current) => ({ ...current, product_updates }))} />
        <ToggleRow icon={<ShieldCheck className="h-4 w-4" />} title="Security alerts" detail="Important authentication and billing events." checked={preferences.security_alerts} onChange={(security_alerts) => setPreferences((current) => ({ ...current, security_alerts }))} />
      </div>
      <button onClick={onSave} disabled={saving} className="ap-btn-primary mt-5 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-60">
        {saving ? "Saving..." : "Save notifications"}
      </button>
    </section>
  );
}

function ToggleRow({ icon, title, detail, checked, onChange }: { icon: React.ReactNode; title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{title}</span>
        <span className="block text-xs ap-muted">{detail}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
