"use client";

import { useMemo, useState } from "react";

type ServiceGroup = "core" | "addon" | "maint";

type Service = {
  id: string;
  icon: string;
  name: string;
  note: string;
  mrp: number;
  price: number;
  group: ServiceGroup;
  incl?: string;
  mandatory?: boolean;
};

type ClientDetails = {
  businessName: string;
  ownerName: string;
  niche: string;
  city: string;
  proposalDate: string;
  validDays: number;
  problem: string;
};

type PackageTotals = {
  balance: number;
  deposit: number;
  firstMonthServices: number;
  firstMonthTotal: number;
  metaFirstMonthFee: number;
  metaRegularFee: number;
  recurring: number;
  saved: number;
  serviceMrp: number;
};

const CORE_SERVICES: Service[] = [
  {
    id: "wchat",
    icon: "🤖",
    name: "Website AI Chatbot + Appointment Booking",
    note: "DeepSeek-powered, trained on website. Captures leads and books appointments 24/7.",
    incl: "Booking included",
    mrp: 1000,
    price: 500,
    group: "core",
  },
  {
    id: "ichat",
    icon: "📸",
    name: "Instagram Chatbot + Appointment Booking",
    note: "DM auto-replies, comment triggers, and story CTAs that book appointments from Instagram.",
    incl: "Booking included",
    mrp: 500,
    price: 250,
    group: "core",
  },
];

const ADDON_SERVICES: Service[] = [
  {
    id: "wa",
    icon: "💬",
    name: "WhatsApp Automation",
    note: "Auto-reply, sequences, broadcasts, and lead follow-up.",
    mrp: 3000,
    price: 1500,
    group: "addon",
  },
  {
    id: "content",
    icon: "🎬",
    name: "AI Reels + AI Poster Creation",
    note: "AI reels and AI-designed posters, scripted, designed, and posted monthly.",
    mrp: 4000,
    price: 2000,
    group: "addon",
    mandatory: true,
  },
  {
    id: "call",
    icon: "📞",
    name: "AI Call Assistant",
    note: "Missed calls are answered by AI, then the details are sent to WhatsApp/email instantly.",
    mrp: 5000,
    price: 2500,
    group: "addon",
  },
  {
    id: "maint",
    icon: "🔧",
    name: "Website + Maps + Social Media Maintenance",
    note: "Monthly website updates, GMB posts, review replies, and social profile upkeep.",
    mrp: 500,
    price: 250,
    group: "maint",
    mandatory: true,
  },
];

const FREE_SERVICES = [
  { icon: "🌐", name: "Website Development", mrp: 15000 },
  { icon: "📍", name: "Google Maps Business Profile", mrp: 5000 },
  { icon: "📱", name: "Social Media Profiles Setup", mrp: 5000 },
];

const todayIso = () => new Date().toISOString().split("T")[0];

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

const compactInr = (value: number) => {
  const rounded = Math.round(value);
  return rounded >= 1000 ? `₹${(rounded / 1000).toFixed(0)}K` : inr(rounded);
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const metaFeeForBudget = (budget: number, firstMonth: boolean) => {
  const cleanBudget = Math.max(5000, Math.round(Number(budget) || 5000));
  if (cleanBudget <= 20000) return firstMonth ? 500 : 1000;

  return Math.round((firstMonth ? 500 : 1000) + (cleanBudget - 20000) * 0.1);
};

export function PackagesBuilder() {
  const [client, setClient] = useState<ClientDetails>({
    businessName: "FitZone Premium Gym",
    ownerName: "Rahul Mehta",
    niche: "gym",
    city: "Mumbai",
    proposalDate: todayIso(),
    validDays: 7,
    problem:
      "missing online leads, no automated follow-up for trial inquiries, losing members to nearby competitors",
  });
  const [selectedCore, setSelectedCore] = useState<Set<string>>(
    () => new Set(["wchat", "ichat"]),
  );
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(
    () => new Set(["content", "maint"]),
  );
  const [adsBudget, setAdsBudget] = useState(5000);

  const normalizedBudget = Math.max(5000, Math.round(adsBudget || 5000));
  const metaOn = true;

  const coreSelected = useMemo(
    () => CORE_SERVICES.filter((service) => selectedCore.has(service.id)),
    [selectedCore],
  );

  const addonSelected = useMemo(
    () =>
      ADDON_SERVICES.filter(
        (service) =>
          service.group === "addon" && selectedAddons.has(service.id),
      ),
    [selectedAddons],
  );

  const maintenanceSelected = useMemo(
    () =>
      ADDON_SERVICES.filter(
        (service) =>
          service.group === "maint" && selectedAddons.has(service.id),
      ),
    [selectedAddons],
  );

  const allSelected = useMemo(
    () => [...coreSelected, ...addonSelected, ...maintenanceSelected],
    [coreSelected, addonSelected, maintenanceSelected],
  );

  const totals = useMemo(() => {
    const serviceMrp = allSelected.reduce(
      (sum, service) => sum + service.mrp,
      0,
    );
    const firstMonthServices = allSelected.reduce(
      (sum, service) => sum + service.price,
      0,
    );
    const metaFirstMonthFee = metaOn
      ? metaFeeForBudget(normalizedBudget, true)
      : 0;
    const metaRegularFee = metaOn
      ? metaFeeForBudget(normalizedBudget, false)
      : 0;
    const firstMonthTotal = firstMonthServices + metaFirstMonthFee;

    return {
      serviceMrp,
      firstMonthServices,
      saved: serviceMrp - firstMonthServices,
      metaFirstMonthFee,
      metaRegularFee,
      firstMonthTotal,
      deposit: Math.round(firstMonthTotal / 2),
      balance: firstMonthTotal - Math.round(firstMonthTotal / 2),
      recurring: serviceMrp + metaRegularFee,
    };
  }, [allSelected, metaOn, normalizedBudget]);

  const coreUnlocked = selectedCore.has("wchat") && selectedCore.has("ichat");
  const totalFreeValue = 25000;
  const firstName = client.ownerName.trim().split(" ")[0] || client.ownerName;
  const proposalDate = formatDate(client.proposalDate);
  const projectedMembers = Math.round((normalizedBudget * 3) / 2000);
  const projectedRevenue = projectedMembers * 2000;
  const totalMonthlySpend =
    totals.serviceMrp + normalizedBudget + totals.metaRegularFee;
  const projectedRoi =
    totalMonthlySpend > 0
      ? (projectedRevenue / totalMonthlySpend).toFixed(1)
      : "0";

  const updateClient = <K extends keyof ClientDetails>(
    key: K,
    value: ClientDetails[K],
  ) => setClient((current) => ({ ...current, [key]: value }));

  const toggleCore = (service: Service) => {
    setSelectedCore((current) => {
      const next = new Set(current);
      next.has(service.id) ? next.delete(service.id) : next.add(service.id);
      return next;
    });
  };

  const toggleAddon = (service: Service) => {
    if (service.mandatory) return;

    setSelectedAddons((current) => {
      const next = new Set(current);
      next.has(service.id) ? next.delete(service.id) : next.add(service.id);
      return next;
    });
  };

  return (
    <section className="mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-transparent shadow-2xl dark:border-white/10">
      <div className="grid items-stretch lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="flex h-full flex-col border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f0f18] lg:border-b-0 lg:border-r">
          <BuilderHeader />
          <div className="flex-1 px-2 md:px-4 pb-4">
            <SectionTitle>Client details</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business name">
                <input
                  value={client.businessName}
                  onChange={(event) =>
                    updateClient("businessName", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Owner name">
                <input
                  value={client.ownerName}
                  onChange={(event) =>
                    updateClient("ownerName", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Business type">
                <input
                  value={client.niche}
                  onChange={(event) =>
                    updateClient("niche", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="City">
                <input
                  value={client.city}
                  onChange={(event) => updateClient("city", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={client.proposalDate}
                  onChange={(event) =>
                    updateClient("proposalDate", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Valid days">
                <input
                  type="number"
                  min={1}
                  value={client.validDays}
                  onChange={(event) =>
                    updateClient("validDays", Number(event.target.value) || 1)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Problem you're solving" className="mt-3">
              <textarea
                value={client.problem}
                onChange={(event) =>
                  updateClient("problem", event.target.value)
                }
                className={`${inputClass} min-h-[78px] resize-y leading-6`}
              />
            </Field>

            <SectionTitle>Core services</SectionTitle>
            <InfoBanner
              icon="🔓"
              title="Core AI services with 50% first-month offer"
              text="Website Chatbot and Instagram Chatbot include appointment booking. These services help convert website and Instagram visitors into leads automatically."
            />
            <div className="space-y-2">
              {CORE_SERVICES.map((service) => (
                <ServiceToggle
                  key={service.id}
                  service={service}
                  selected={selectedCore.has(service.id)}
                  badge="Core"
                  onClick={() => toggleCore(service)}
                />
              ))}
            </div>

            {coreUnlocked && (
              <>
                <SectionTitle>Free services unlocked</SectionTitle>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  {FREE_SERVICES.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between border-b border-emerald-500/10 py-2 last:border-b-0"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {service.icon} {service.name}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        FREE
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between border-t border-dashed border-emerald-500/30 pt-2 text-sm font-bold text-emerald-600">
                    <span>Total setup savings</span>
                    <span>{inr(totalFreeValue)} FREE</span>
                  </div>
                </div>
              </>
            )}

            <SectionTitle>Add-on services</SectionTitle>
            <div className="space-y-2">
              {ADDON_SERVICES.filter(
                (service) => service.group === "addon",
              ).map((service) => (
                <ServiceToggle
                  key={service.id}
                  service={service}
                  selected={selectedAddons.has(service.id)}
                  badge={service.mandatory ? "Mandatory" : undefined}
                  onClick={() => toggleAddon(service)}
                />
              ))}
            </div>

            <SectionTitle>Monthly maintenance</SectionTitle>
            <InfoBanner
              icon="🔧"
              title="Keep everything running perfectly"
              text="Monthly maintenance keeps your website, Google Maps, and social profiles updated, secure, and optimised every month."
              amber
            />
            <div className="space-y-2">
              {ADDON_SERVICES.filter(
                (service) => service.group === "maint",
              ).map((service) => (
                <ServiceToggle
                  key={service.id}
                  service={service}
                  selected={selectedAddons.has(service.id)}
                  badge="Mandatory"
                  onClick={() => toggleAddon(service)}
                />
              ))}
            </div>

            <SectionTitle>Meta ads management</SectionTitle>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-[#171724]">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-5 w-9 rounded-full bg-blue-500 after:ml-5 after:mt-0.5 after:block after:h-4 after:w-4 after:rounded-full after:bg-white" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                    📊 Meta Ads Management
                    <Badge amber>Mandatory</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Full campaign management. Minimum ad budget is ₹5,000.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600">
                    {compactInr(totals.metaFirstMonthFee)}/mo
                  </div>
                  <Badge>Month 1</Badge>
                </div>
              </div>
              <Field label="Monthly ad budget" className="mt-3">
                <input
                  type="number"
                  min={5000}
                  step={500}
                  value={adsBudget}
                  onChange={(event) =>
                    setAdsBudget(
                      Math.max(5000, Number(event.target.value) || 5000),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Management fee
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {inr(totals.metaFirstMonthFee)}/mo month 1 ·{" "}
                  {inr(totals.metaRegularFee)}/mo later
                </span>
              </div>
            </div>
          </div>

          <PriceSummary
            coreUnlocked={coreUnlocked}
            totalFreeValue={totalFreeValue}
            totals={totals}
          />
        </aside>

        <div className="min-w-0 bg-transparent p-2 md:p-4 sm:p-6">
          <ProposalPreview
            client={client}
            coreUnlocked={coreUnlocked}
            coreSelected={coreSelected}
            addonSelected={addonSelected}
            maintenanceSelected={maintenanceSelected}
            normalizedBudget={normalizedBudget}
            projectedMembers={projectedMembers}
            projectedRevenue={projectedRevenue}
            projectedRoi={projectedRoi}
            proposalDate={proposalDate}
            firstName={firstName}
            totals={totals}
            totalFreeValue={totalFreeValue}
          />
        </div>
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-[#13131e] dark:text-white";

function BuilderHeader() {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-5 py-4 dark:border-white/10 dark:from-[#12121c] dark:to-[#0f0f18]">
      <div className="flex items-center gap-2">
        <span className="text-lg">🚀</span>
        <div>
          <div className="bg-gradient-to-r from-violet-400 to-blue-300 bg-clip-text text-sm font-extrabold text-transparent">
            RocketReplAI
          </div>
          <div className="mt-0.5 text-[10px] tracking-wide text-slate-500 dark:text-slate-500">
            Proposal Builder v2 · select services, auto-calculate pricing
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
      <span>{children}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function Field({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoBanner({
  amber = false,
  icon,
  text,
  title,
}: {
  amber?: boolean;
  icon: string;
  text: string;
  title: string;
}) {
  return (
    <div
      className={`mb-3 flex gap-3 rounded-xl border p-3 ${
        amber
          ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <p className="text-xs leading-5">
        <strong className="block">{title}</strong>
        {text}
      </p>
    </div>
  );
}

function Badge({
  amber = false,
  children,
}: {
  amber?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
        amber
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      }`}
    >
      {children}
    </span>
  );
}

function ServiceToggle({
  badge,
  onClick,
  selected,
  service,
}: {
  badge?: string;
  onClick: () => void;
  selected: boolean;
  service: Service;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-[#13131e] dark:hover:border-white/20"
      } ${service.mandatory ? "cursor-default" : "cursor-pointer"}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-5 w-9 shrink-0 rounded-full transition after:mt-0.5 after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:transition ${
            selected
              ? "bg-indigo-500 after:ml-5"
              : "bg-slate-300 after:ml-0.5 dark:bg-slate-700"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-950 dark:text-white">
            <span>{service.icon}</span>
            <span>{service.name}</span>
            {badge && <Badge amber={badge !== "Core"}>{badge}</Badge>}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            {service.note}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[10px] text-red-500 line-through">
            {inr(service.mrp)}/mo
          </span>
          <span className="block text-sm font-bold text-emerald-600">
            {inr(service.price)}/mo
          </span>
          <Badge>50% OFF</Badge>
        </div>
      </div>
    </button>
  );
}

function PriceSummary({
  coreUnlocked,
  totalFreeValue,
  totals,
}: {
  coreUnlocked: boolean;
  totalFreeValue: number;
  totals: PackageTotals;
}) {
  return (
    <div className="border-t border-slate-200 bg-gradient-to-br from-white to-blue-50 p-2 md:p-4 dark:border-white/10 dark:from-[#12102a] dark:to-[#101828]">
      <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs">
        <SummaryRow label="MRP total" value={`${inr(totals.serviceMrp)}/mo`} />
        <SummaryRow
          label="First month discount"
          value={`-${inr(totals.saved)}`}
        />
        {coreUnlocked && (
          <SummaryRow label="Free setup value" value={inr(totalFreeValue)} />
        )}
      </div>
      <SummaryRow
        label="Month 1 total"
        value={`${inr(totals.firstMonthTotal)} only`}
      />
      <SummaryRow
        label="Meta ads fee"
        value={`${inr(totals.metaFirstMonthFee)}/mo month 1`}
      />
      <div className="my-3 h-px bg-slate-200 dark:bg-white/10" />
      <div className="grid grid-cols-2 gap-3">
        <HighlightCard
          color="green"
          label="Pay today"
          sub="50% first month"
          value={inr(totals.deposit)}
        />
        <HighlightCard
          color="blue"
          label="Month 2 onwards"
          sub="Auto-billed Razorpay"
          value={`${inr(totals.recurring)}/mo`}
        />
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20"
      >
        Generate Proposal
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-500 hover:text-indigo-500 dark:border-white/10"
      >
        Print / Save PDF
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-xs text-slate-500 dark:text-slate-400">
      <span>{label}</span>
      <strong className="text-right font-bold text-slate-900 dark:text-white">
        {value}
      </strong>
    </div>
  );
}

function HighlightCard({
  color,
  label,
  sub,
  value,
}: {
  color: "blue" | "green";
  label: string;
  sub: string;
  value: string;
}) {
  const palette =
    color === "green"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
      : "border-blue-500/25 bg-blue-500/10 text-blue-600";

  return (
    <div className={`rounded-xl border p-3 text-center ${palette}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
      <div className="mt-1 text-[10px] opacity-70">{sub}</div>
    </div>
  );
}

function ProposalPreview({
  addonSelected,
  client,
  coreSelected,
  coreUnlocked,
  firstName,
  maintenanceSelected,
  normalizedBudget,
  projectedMembers,
  projectedRevenue,
  projectedRoi,
  proposalDate,
  totalFreeValue,
  totals,
}: {
  addonSelected: Service[];
  client: ClientDetails;
  coreSelected: Service[];
  coreUnlocked: boolean;
  firstName: string;
  maintenanceSelected: Service[];
  normalizedBudget: number;
  projectedMembers: number;
  projectedRevenue: number;
  projectedRoi: string;
  proposalDate: string;
  totalFreeValue: number;
  totals: PackageTotals;
}) {
  const selectedServices = [
    ...coreSelected,
    ...addonSelected,
    ...maintenanceSelected,
  ];

  return (
    <article className="mx-auto max-w-[740px] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#09090f] via-[#1a0f40] to-[#0d2040] px-3 md:px-6 py-8 text-white sm:px-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span>🚀</span>
            <div>
              <div className="font-extrabold">RocketReplAI</div>
              <div className="text-[10px] text-white/40">
                AI-Powered Marketing | Full Business Growth
              </div>
            </div>
          </div>
          <div className="my-5 h-px bg-white/10" />
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Business growth proposal for
          </div>
          <h2 className="mt-1 text-3xl font-light">
            <strong className="bg-gradient-to-r from-violet-200 to-blue-200 bg-clip-text font-extrabold text-transparent">
              {client.businessName || "Your Business"}
            </strong>
          </h2>
          <div className="mt-6 grid overflow-hidden rounded-xl border border-white/10 sm:grid-cols-4">
            <HeaderMeta label="Prepared for" value={client.ownerName} />
            <HeaderMeta label="Date" value={proposalDate} />
            <HeaderMeta label="Valid" value={`${client.validDays} days`} />
            <HeaderMeta label="Pay today" value={inr(totals.deposit)} accent />
          </div>
        </div>
      </header>

      <div className="space-y-8 px-3 md:px-6 py-8 sm:px-10">
        <ProposalSection title={`Hello ${firstName}`}>
          <p className="text-sm leading-7 text-slate-700">
            Thank you for considering <strong>RocketReplAI</strong> as your
            growth partner. After reviewing{" "}
            <strong>{client.businessName}</strong>, we have identified a clear
            gap in {client.city}'s {client.niche} market, and we know exactly
            how to help you close it.
          </p>
          <div className="mt-4 rounded-r-xl border-l-4 border-amber-500 bg-amber-50 p-4">
            <p className="text-xs leading-6 text-amber-900">
              <strong>The challenge:</strong> Most {client.niche}s in{" "}
              {client.city} are struggling with {client.problem}. Potential
              customers are searching online and finding competitors instead.
            </p>
          </div>
        </ProposalSection>

        <ProposalSection title="What you get">
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedServices.map((service) => (
              <ProposalServiceCard key={service.id} service={service} />
            ))}
            {coreUnlocked &&
              FREE_SERVICES.map((service) => (
                <ProposalFreeCard key={service.name} service={service} />
              ))}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
              <div className="text-lg">📊</div>
              <div className="text-xs font-bold">Meta Ads Management</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Full campaign management with minimum ₹5,000 ad budget.
              </p>
              <Badge amber>
                Month 1 {inr(totals.metaFirstMonthFee)} · Month 2+{" "}
                {inr(totals.metaRegularFee)}
              </Badge>
            </div>
          </div>
          {coreUnlocked && (
            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
              <strong>Free setup unlocked!</strong> Website development, Google
              Maps profile, and social media setup are included at zero cost,
              saving you {inr(totalFreeValue)}.
            </div>
          )}
        </ProposalSection>

        <ProposalSection title="Pricing - transparent breakdown">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Service</th>
                  <th className="px-3 text-right">MRP</th>
                  <th className="px-3 text-right">Offer</th>
                  <th className="pl-3 text-right">You pay</th>
                </tr>
              </thead>
              <tbody>
                {selectedServices.map((service) => (
                  <PricingRow key={service.id} service={service} />
                ))}
                {coreUnlocked &&
                  FREE_SERVICES.map((service) => (
                    <tr key={service.name} className="border-b border-slate-50">
                      <td className="py-2 pr-3">
                        {service.icon} {service.name}
                      </td>
                      <td className="px-3 text-right text-slate-300 line-through">
                        {inr(service.mrp)}
                      </td>
                      <td className="px-3 text-right">
                        <Badge>FREE</Badge>
                      </td>
                      <td className="pl-3 text-right font-bold text-emerald-600">
                        ₹0
                      </td>
                    </tr>
                  ))}
                <tr className="border-b border-slate-50">
                  <td className="py-2 pr-3">📊 Meta Ads Management</td>
                  <td className="px-3 text-right text-slate-300 line-through">
                    ₹1,000 base + slab
                  </td>
                  <td className="px-3 text-right">-</td>
                  <td className="pl-3 text-right font-bold text-amber-600">
                    {inr(totals.metaFirstMonthFee)} month 1
                    <br />
                    <span className="text-[10px] font-medium">
                      {inr(totals.metaRegularFee)} from month 2
                    </span>
                  </td>
                </tr>
                <tr className="bg-violet-50 font-bold">
                  <td className="py-3 pr-3">Month 1 total</td>
                  <td className="px-3 text-right text-slate-300 line-through">
                    {inr(totals.serviceMrp)}
                  </td>
                  <td className="px-3 text-right text-emerald-600">
                    Save{" "}
                    {inr(totals.saved + (coreUnlocked ? totalFreeValue : 0))}
                  </td>
                  <td className="pl-3 text-right text-emerald-600">
                    {inr(totals.firstMonthTotal)}
                  </td>
                </tr>
                <tr className="bg-indigo-950 text-indigo-100">
                  <td className="py-3 pr-3 font-bold">
                    Month 2 onwards full price
                  </td>
                  <td />
                  <td className="px-3 text-right text-[10px] text-indigo-200">
                    Auto-billed Razorpay
                  </td>
                  <td className="pl-3 text-right font-bold">
                    {inr(totals.recurring)}/mo
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PaymentCard
              label="Pay today"
              sub="50% of month 1"
              tone="green"
              value={inr(totals.deposit)}
            />
            <PaymentCard
              label="On delivery"
              sub="Remaining 50%"
              tone="blue"
              value={inr(totals.balance)}
            />
            <PaymentCard
              label="Month 2 onwards"
              sub="Full price"
              tone="purple"
              value={inr(totals.recurring)}
            />
          </div>
        </ProposalSection>

        <ProposalSection title="Expected ROI - Month 2">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="text-xs font-bold text-amber-800">
              Based on {inr(normalizedBudget)}/mo ad spend +{" "}
              {inr(totals.metaRegularFee)}/mo Meta management fee
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <RoiCard
                label="New leads/mo from ads"
                value={`~${projectedMembers}`}
              />
              <RoiCard
                label="Extra revenue at ₹2K/member"
                value={inr(projectedRevenue)}
              />
              <RoiCard
                label="ROI on total monthly spend"
                value={`${projectedRoi}x`}
              />
            </div>
          </div>
        </ProposalSection>

        <ProposalSection title="Delivery timeline">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Day 1-2", "Deposit, onboarding call, assets collected."],
              ["Day 3-5", "Website live, GMB optimised, profiles branded."],
              ["Day 6-10", "Chatbots and automations active and tested."],
              ["Day 10-30", "Content delivered, subscription activated."],
            ].map(([week, text]) => (
              <div
                key={week}
                className="rounded-xl border bg-violet-50 p-3 text-center"
              >
                <div className="text-[10px] font-bold uppercase text-violet-600">
                  {week}
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </ProposalSection>

        <ProposalSection title="How to start">
          <div className="rounded-2xl bg-gradient-to-br from-[#09090f] via-[#1a0f40] to-[#0d2040] p-6 text-center text-white">
            <h3 className="text-xl font-extrabold">
              Ready to grow {client.businessName}?
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Three steps. We go live in 48 hours.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <StartStep title="Step 1" text='Reply "I am in" on WhatsApp' />
              <StartStep
                title="Step 2"
                text={`Pay ${inr(totals.deposit)} deposit`}
              />
              <StartStep title="Step 3" text="Live in 48 hours" />
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-xs text-amber-800">
            This offer is valid for <strong>{client.validDays} days</strong>{" "}
            from {proposalDate}.
          </div>
        </ProposalSection>
      </div>

      <footer className="flex flex-col gap-3 border-t bg-violet-50 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="leading-6">
          <strong className="block text-slate-900">RocketReplAI</strong>
          +91 93243 50209
          <br />
          support@rocketreplai.com
          <br />
          www.rocketreplai.com
        </div>
        <div className="text-left text-[11px] sm:text-right">
          Confidential proposal
          <br />
          prepared exclusively for
          <br />
          <strong>{client.businessName}</strong>
        </div>
      </footer>
    </article>
  );
}

function HeaderMeta({
  accent = false,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-white/10 p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-[9px] uppercase tracking-wide text-white/30">
        {label}
      </div>
      <div
        className={`mt-1 text-xs font-semibold ${accent ? "text-violet-200" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function ProposalSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600">
          {title}
        </h3>
        <span className="h-px flex-1 bg-slate-100" />
      </div>
      {children}
    </section>
  );
}

function ProposalServiceCard({ service }: { service: Service }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
      <div className="text-lg">{service.icon}</div>
      <div className="text-xs font-bold">{service.name}</div>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {service.note}
      </p>
      {service.incl && <Badge amber>{service.incl}</Badge>}
    </div>
  );
}

function ProposalFreeCard({
  service,
}: {
  service: (typeof FREE_SERVICES)[number];
}) {
  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
      <div className="text-lg">{service.icon}</div>
      <div className="text-xs font-bold">{service.name}</div>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        Fully set up and optimised
      </p>
      <Badge>FREE - {inr(service.mrp)} value</Badge>
    </div>
  );
}

function PricingRow({ service }: { service: Service }) {
  return (
    <tr className="border-b border-slate-50">
      <td className="py-2 pr-3">
        {service.icon} {service.name}
      </td>
      <td className="px-3 text-right text-slate-300 line-through">
        {inr(service.mrp)}/mo
      </td>
      <td className="px-3 text-right">
        <Badge>50% OFF</Badge>
      </td>
      <td className="pl-3 text-right font-bold text-emerald-600">
        {inr(service.price)}/mo
      </td>
    </tr>
  );
}

function PaymentCard({
  label,
  sub,
  tone,
  value,
}: {
  label: string;
  sub: string;
  tone: "blue" | "green" | "purple";
  value: string;
}) {
  const palette = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 text-center ${palette}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
      <div className="mt-1 text-[10px] opacity-80">{sub}</div>
    </div>
  );
}

function RoiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-3 text-center">
      <div className="text-lg font-extrabold text-amber-600">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-amber-800">{label}</div>
    </div>
  );
}

function StartStep({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-3">
      <strong className="block text-xs text-violet-200">{title}</strong>
      <span className="text-[10px] text-white/50">{text}</span>
    </div>
  );
}
