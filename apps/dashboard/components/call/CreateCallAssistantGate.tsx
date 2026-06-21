"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Check, Phone, Sparkles } from "lucide-react";
import { Button, Orbs, toast, useThemeStyles } from "@rocketreplai/ui";
import { useApi } from "@/lib/useApi";
import { createCallAssistant } from "@/lib/services/call-actions.api";

const DEFAULT_PROMPT =
  "You are CatchCustomerCall's inbound voice assistant for prospective customers. Speak warmly, clearly, and briefly. Your job is to qualify new leads interested in AI call answering for businesses. Explain only these verified basics: the service helps businesses avoid missed inbound calls by using AI to answer, collect lead details, and support routing/notifications. Pricing: Free includes 10 minutes and 1 concurrent inbound call. Business is 5000 rupees per month, with the first month at 2500 rupees during the 50% launch offer, and includes 200 minutes with 3 concurrent inbound calls. Collect: caller name, phone number, business name, and the service or plan they want. Never invent features, pricing, or promises. If unsure, say Gaurav will follow up. End by confirming captured details and saying Gaurav will call back soon.";

const SUGGESTED_QUESTIONS = [
  "May I know your name?",
  "What is your phone number?",
  "What is your business name?",
  "Which service or plan are you interested in?",
  "Should Gaurav call you back today?",
];

const COLLECT_FIELDS = [
  ["name", "Caller name"],
  ["phone", "Phone number"],
  ["business_name", "Business name"],
  ["service_or_plan", "Service or plan"],
  ["callback_time", "Callback time"],
];

export default function CreateCallAssistantGate({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { apiRequest } = useApi();
  const { styles, isDark } = useThemeStyles();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ownerName: "Gaurav",
    businessName: "CatchCustomerCall",
    businessPhone: "",
    ownerEmail: "",
    whatsappNumber: "",
    smsNumber: "",
    greeting:
      "Hello, thanks for calling CatchCustomerCall. I can collect your details and ask Gaurav to call you back.",
    assistantBehavior: DEFAULT_PROMPT,
    questions: SUGGESTED_QUESTIONS,
    collectFields: ["name", "phone", "business_name", "service_or_plan"],
    noVoiceTimeoutSec: 120,
  });

  const update = (key: string, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleField = (field: string) =>
    update(
      "collectFields",
      form.collectFields.includes(field)
        ? form.collectFields.filter((item) => item !== field)
        : [...form.collectFields, field],
    );

  const submit = async () => {
    const missingFields = [
      ["ownerName", "Owner name"],
      ["businessName", "Business name"],
      ["businessPhone", "Business phone"],
      ["ownerEmail", "Owner email"],
      ["whatsappNumber", "WhatsApp alert number"],
    ].filter(([key]) => !(form as any)[key]?.trim());

    if (missingFields.length > 0) {
      toast({
        title: "Complete call assistant setup",
        description: `Please fill: ${missingFields
          .map(([, label]) => label)
          .join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await createCallAssistant(apiRequest, form);
      toast({ title: "AI call assistant created" });
      onCreated();
    } catch (error) {
      console.error(error);
      toast({ title: "Could not create assistant", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      {isDark && <Orbs />}
      <div className={styles.container}>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${styles.card} overflow-hidden p-5 md:p-8 lg:p-10`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-2 mb-5">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
              Create Call Assistant
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
            <div>
              <h1 className={`text-3xl md:text-5xl font-black ${styles.text.primary}`}>
                Build your AI receptionist before opening the dashboard.
              </h1>
              <p className={`font-montserrat mt-4 text-sm leading-relaxed ${styles.text.secondary}`}>
                Free mode starts with 10 inbound minutes and 1 concurrent call.
                When the minute limit finishes, calls pause and the owner gets
                an upgrade email.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "Collect caller details",
                  "Send alerts to WhatsApp, SMS, and email",
                  "Stop silent calls after 2 minutes",
                  "Owner-only dashboard access",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className={styles.text.secondary}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.innerCard} p-4 md:p-5 space-y-4`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ["ownerName", "Owner name"],
                  ["businessName", "Business name"],
                  ["businessPhone", "Business phone"],
                  ["ownerEmail", "Owner email"],
                  ["whatsappNumber", "WhatsApp alert number"],
                  ["smsNumber", "SMS alert number"],
                ].map(([key, label]) => (
                  <label key={key} className="space-y-1">
                    <span className={`text-xs font-semibold ${styles.text.muted}`}>
                      {label}
                    </span>
                    <input
                      value={(form as any)[key]}
                      onChange={(event) => update(key, event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                        isDark
                          ? "border-white/[0.08] bg-white/[0.04] text-white"
                          : "border-gray-200 bg-white text-gray-900"
                      }`}
                    />
                  </label>
                ))}
              </div>

              <label className="space-y-1 block">
                <span className={`text-xs font-semibold ${styles.text.muted}`}>
                  Assistant greeting
                </span>
                <textarea
                  value={form.greeting}
                  onChange={(event) => update("greeting", event.target.value)}
                  rows={2}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                    isDark
                      ? "border-white/[0.08] bg-white/[0.04] text-white"
                      : "border-gray-200 bg-white text-gray-900"
                  }`}
                />
              </label>

              <label className="space-y-1 block">
                <span className={`text-xs font-semibold ${styles.text.muted}`}>
                  Voice assistant behavior
                </span>
                <textarea
                  value={form.assistantBehavior}
                  onChange={(event) =>
                    update("assistantBehavior", event.target.value)
                  }
                  rows={6}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                    isDark
                      ? "border-white/[0.08] bg-white/[0.04] text-white"
                      : "border-gray-200 bg-white text-gray-900"
                  }`}
                />
              </label>

              <div>
                <p className={`text-xs font-semibold mb-2 ${styles.text.muted}`}>
                  What should the assistant collect?
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLLECT_FIELDS.map(([field, label]) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleField(field)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        form.collectFields.includes(field)
                          ? "border-pink-500 bg-pink-500/10 text-pink-400"
                          : isDark
                            ? "border-white/[0.08] text-white/55"
                            : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={submit}
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white"
              >
                <Phone className="h-4 w-4 mr-2" />
                {saving ? "Creating..." : "Create AI Call Assistant"}
              </Button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
