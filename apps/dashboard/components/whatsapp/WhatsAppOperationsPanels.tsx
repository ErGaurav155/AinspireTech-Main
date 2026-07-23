"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  HelpCircle,
  IndianRupee,
  ListChecks,
  MessageSquareText,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge, Button } from "@rocketreplai/ui";

type PanelProps = {
  cardClass: string;
  softCardClass: string;
};

type AutomationPanelProps = PanelProps & {
  automationConfig: any;
  appointmentConfig: any;
  notificationSettings: any;
  onSave: (payload: {
    automationConfig: Record<string, any>;
    appointmentConfig: Record<string, any>;
    notificationSettings: Record<string, any>;
  }) => Promise<void>;
};

const MENU_OPTIONS = [
  {
    id: "book_appointment",
    title: "Book appointment",
    description: "Choose a service, date and time",
  },
  {
    id: "talk_to_owner",
    title: "Talk to owner",
    description: "Get the owner's contact details",
  },
  {
    id: "need_support",
    title: "Need support",
    description: "Describe an issue for assistance",
  },
  {
    id: "service_pricing",
    title: "Service pricing",
    description: "View services and prices",
  },
  {
    id: "browse_faqs",
    title: "FAQs",
    description: "Browse common questions",
  },
];

const DEFAULT_QUESTIONS = [
  {
    id: "name",
    field: "patientName",
    question: "What is your full name?",
    type: "text",
    required: true,
    options: [],
  },
  {
    id: "email",
    field: "patientEmail",
    question: "What is your email address?",
    type: "email",
    required: false,
    options: [],
  },
  {
    id: "service",
    field: "service",
    question: "Which service do you need?",
    type: "select",
    required: true,
    options: [],
  },
  {
    id: "date",
    field: "preferredDate",
    question: "Choose your preferred date.",
    type: "date",
    required: true,
    options: [],
  },
  {
    id: "time",
    field: "preferredTime",
    question: "Choose your preferred time.",
    type: "time",
    required: true,
    options: [],
  },
  {
    id: "requirement",
    field: "symptoms",
    question: "Please describe your requirement.",
    type: "textarea",
    required: true,
    options: [],
  },
];

const normalizeAutomation = (value: any) => ({
  enabled: value?.enabled !== false,
  greetingMessage:
    value?.greetingMessage ||
    "Hi, thanks for messaging us. How can we help you today?",
  menuMessage:
    value?.menuMessage ||
    "Choose an option below, or type your question for an AI-assisted reply.",
  supportPrompt:
    value?.supportPrompt ||
    "We are listening. Please explain the issue in detail and we will help you.",
  pricingMessage:
    value?.pricingMessage || "Choose a service to view pricing and booking options.",
  negotiationMessage:
    value?.negotiationMessage ||
    "Need a custom quote? We are open to discussing your requirements.",
  ownerContactMessage:
    value?.ownerContactMessage ||
    "You can contact the business owner using the details below.",
  menuOptions: MENU_OPTIONS.map((fallback) => {
    const existing = value?.menuOptions?.find(
      (item: any) => item.id === fallback.id,
    );
    return { ...fallback, ...existing, enabled: existing?.enabled !== false };
  }),
  appointmentQuestions:
    value?.appointmentQuestions?.length > 0
      ? value.appointmentQuestions
      : DEFAULT_QUESTIONS,
  followUps: {
    enabled: value?.followUps?.enabled !== false,
    firstDelayMinutes: value?.followUps?.firstDelayMinutes || 30,
    secondDelayMinutes: value?.followUps?.secondDelayMinutes || 180,
    firstMessage:
      value?.followUps?.firstMessage ||
      "Do you need any more information or help booking an appointment?",
    secondMessage:
      value?.followUps?.secondMessage ||
      "We are still available if you would like to discuss your requirement or book an appointment.",
  },
});

const fieldClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white";
const labelClass =
  "text-[11px] font-bold uppercase tracking-widest text-gray-400";

export function WhatsAppAutomationsPanel({
  cardClass,
  softCardClass,
  automationConfig,
  appointmentConfig,
  notificationSettings,
  onSave,
}: AutomationPanelProps) {
  const [section, setSection] = useState<
    "menu" | "questions" | "services" | "followups"
  >("menu");
  const [automation, setAutomation] = useState(() =>
    normalizeAutomation(automationConfig),
  );
  const [services, setServices] = useState<any[]>(
    appointmentConfig?.services || [],
  );
  const [ownerWhatsAppNumber, setOwnerWhatsAppNumber] = useState(
    notificationSettings?.whatsappNumber || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAutomation(normalizeAutomation(automationConfig));
    setServices(appointmentConfig?.services || []);
    setOwnerWhatsAppNumber(notificationSettings?.whatsappNumber || "");
  }, [automationConfig, appointmentConfig, notificationSettings]);

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave({
        automationConfig: automation,
        appointmentConfig: {
          ...appointmentConfig,
          services,
        },
        notificationSettings: {
          ...notificationSettings,
          whatsappNumber: ownerWhatsAppNumber,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = (index: number, patch: Record<string, any>) => {
    setAutomation((current: any) => ({
      ...current,
      appointmentQuestions: current.appointmentQuestions.map(
        (question: any, questionIndex: number) =>
          questionIndex === index ? { ...question, ...patch } : question,
      ),
    }));
  };

  const sectionItems = [
    { id: "menu", label: "Menu", icon: MessageSquareText },
    { id: "questions", label: "Questions", icon: ListChecks },
    { id: "services", label: "Services", icon: IndianRupee },
    { id: "followups", label: "Follow-ups", icon: Clock3 },
  ] as const;

  return (
    <div className="space-y-4">
      <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-black">Customer Automations</h2>
              <Badge className="bg-emerald-500/15 text-emerald-500">
                {automation.enabled ? "Active" : "Paused"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-2 rounded-lg border ${softCardClass} px-3 py-2 text-sm font-semibold`}>
              Enabled
              <input
                type="checkbox"
                checked={automation.enabled}
                onChange={(event) =>
                  setAutomation((current: any) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-emerald-500"
              />
            </label>
            <Button
              type="button"
              disabled={isSaving}
              onClick={save}
              className="gap-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                    : "border-gray-200 text-gray-500 dark:border-white/[0.08] dark:text-white/55"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {section === "menu" && (
        <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
            <div className="space-y-4">
              <TextareaField
                label="Greeting message"
                value={automation.greetingMessage}
                onChange={(greetingMessage) =>
                  setAutomation((current: any) => ({
                    ...current,
                    greetingMessage,
                  }))
                }
              />
              <TextareaField
                label="Menu message"
                value={automation.menuMessage}
                onChange={(menuMessage) =>
                  setAutomation((current: any) => ({
                    ...current,
                    menuMessage,
                  }))
                }
              />
              <TextareaField
                label="Support prompt"
                value={automation.supportPrompt}
                onChange={(supportPrompt) =>
                  setAutomation((current: any) => ({
                    ...current,
                    supportPrompt,
                  }))
                }
              />
              <TextareaField
                label="Owner contact message"
                value={automation.ownerContactMessage}
                onChange={(ownerContactMessage) =>
                  setAutomation((current: any) => ({
                    ...current,
                    ownerContactMessage,
                  }))
                }
              />
              <label className="block space-y-2">
                <span className={labelClass}>Owner WhatsApp number</span>
                <input
                  type="tel"
                  value={ownerWhatsAppNumber}
                  onChange={(event) =>
                    setOwnerWhatsAppNumber(event.target.value)
                  }
                  placeholder="+919876543210"
                  className={fieldClass}
                />
                <span className="block text-xs leading-5 text-gray-500 dark:text-white/45">
                  Used for the Talk to owner reply and new appointment alerts.
                </span>
              </label>
            </div>
            <div className={`rounded-lg border ${softCardClass} p-3`}>
              <p className={labelClass}>WhatsApp menu</p>
              <div className="mt-3 space-y-2">
                {automation.menuOptions.map((option: any, index: number) => (
                  <div
                    key={option.id}
                    className="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        value={option.title}
                        onChange={(event) =>
                          setAutomation((current: any) => ({
                            ...current,
                            menuOptions: current.menuOptions.map(
                              (item: any, itemIndex: number) =>
                                itemIndex === index
                                  ? { ...item, title: event.target.value }
                                  : item,
                            ),
                          }))
                        }
                        className={`${fieldClass} font-semibold`}
                      />
                      <input
                        type="checkbox"
                        checked={option.enabled}
                        onChange={(event) =>
                          setAutomation((current: any) => ({
                            ...current,
                            menuOptions: current.menuOptions.map(
                              (item: any, itemIndex: number) =>
                                itemIndex === index
                                  ? { ...item, enabled: event.target.checked }
                                  : item,
                            ),
                          }))
                        }
                        className="h-4 w-4 flex-shrink-0 accent-emerald-500"
                      />
                    </div>
                    <input
                      value={option.description}
                      onChange={(event) =>
                        setAutomation((current: any) => ({
                          ...current,
                          menuOptions: current.menuOptions.map(
                            (item: any, itemIndex: number) =>
                              itemIndex === index
                                ? { ...item, description: event.target.value }
                                : item,
                          ),
                        }))
                      }
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {section === "questions" && (
        <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">Appointment Questions</h2>
            <Button
              type="button"
              onClick={() =>
                setAutomation((current: any) => ({
                  ...current,
                  appointmentQuestions: [
                    ...current.appointmentQuestions,
                    {
                      id: `custom_${Date.now()}`,
                      field: "custom",
                      question: "New question",
                      type: "text",
                      required: false,
                      options: [],
                    },
                  ].slice(0, 10),
                }))
              }
              className="gap-2 rounded-lg border border-emerald-500 bg-transparent text-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {automation.appointmentQuestions.map(
              (question: any, index: number) => (
                <div
                  key={question.id}
                  className={`grid gap-3 rounded-lg border ${softCardClass} p-3 sm:p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <button
                      type="button"
                      title="Delete question"
                      onClick={() =>
                        setAutomation((current: any) => ({
                          ...current,
                          appointmentQuestions:
                            current.appointmentQuestions.filter(
                              (_: any, itemIndex: number) => itemIndex !== index,
                            ),
                        }))
                      }
                      className="rounded-md p-2 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={question.question}
                    onChange={(event) =>
                      updateQuestion(index, { question: event.target.value })
                    }
                    className={fieldClass}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={question.field}
                      onChange={(event) =>
                        updateQuestion(index, { field: event.target.value })
                      }
                      className={fieldClass}
                    >
                      <option value="patientName">Customer name</option>
                      <option value="patientEmail">Email</option>
                      <option value="service">Service</option>
                      <option value="preferredDate">Date</option>
                      <option value="preferredTime">Time</option>
                      <option value="symptoms">Requirement</option>
                      <option value="custom">Custom</option>
                    </select>
                    <select
                      value={question.type}
                      onChange={(event) =>
                        updateQuestion(index, { type: event.target.value })
                      }
                      className={fieldClass}
                    >
                      <option value="text">Short text</option>
                      <option value="email">Email</option>
                      <option value="select">Options</option>
                      <option value="date">Future dates</option>
                      <option value="time">Available times</option>
                      <option value="textarea">Long text</option>
                    </select>
                    <label className="flex min-h-10 items-center justify-between rounded-lg border border-gray-200 px-3 text-sm font-semibold dark:border-white/[0.1]">
                      Required
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) =>
                          updateQuestion(index, {
                            required: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-emerald-500"
                      />
                    </label>
                  </div>
                  {question.type === "select" && question.field !== "service" && (
                    <input
                      value={(question.options || []).join(", ")}
                      onChange={(event) =>
                        updateQuestion(index, {
                          options: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Option one, Option two"
                      className={fieldClass}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {section === "services" && (
        <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">Services and Pricing</h2>
            <Button
              type="button"
              onClick={() =>
                setServices((current) => [
                  ...current,
                  {
                    name: "New service",
                    description: "",
                    durationMinutes: 30,
                    priceInr: 0,
                    isActive: true,
                  },
                ])
              }
              className="gap-2 rounded-lg border border-emerald-500 bg-transparent text-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {services.map((service, index) => (
              <div
                key={`${service.name}-${index}`}
                className={`rounded-lg border ${softCardClass} p-3 sm:p-4`}
              >
                <div className="flex items-center justify-between gap-3">
                  <input
                    value={service.name}
                    onChange={(event) =>
                      setServices((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className={`${fieldClass} font-bold`}
                  />
                  <button
                    type="button"
                    title="Delete service"
                    onClick={() =>
                      setServices((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="rounded-md p-2 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={service.description || ""}
                  onChange={(event) =>
                    setServices((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, description: event.target.value }
                          : item,
                      ),
                    )
                  }
                  rows={2}
                  placeholder="Service description"
                  className={`${fieldClass} mt-3 resize-y`}
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Price INR</span>
                    <input
                      type="number"
                      min={0}
                      value={service.priceInr || 0}
                      onChange={(event) =>
                        setServices((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, priceInr: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={labelClass}>Minutes</span>
                    <input
                      type="number"
                      min={15}
                      value={service.durationMinutes || 30}
                      onChange={(event) =>
                        setServices((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  durationMinutes: Number(event.target.value),
                                }
                              : item,
                          ),
                        )
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                <label className="mt-3 flex items-center justify-between text-sm font-semibold">
                  Available
                  <input
                    type="checkbox"
                    checked={service.isActive !== false}
                    onChange={(event) =>
                      setServices((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, isActive: event.target.checked }
                            : item,
                        ),
                      )
                    }
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TextareaField
              label="Pricing menu message"
              value={automation.pricingMessage}
              onChange={(pricingMessage) =>
                setAutomation((current: any) => ({
                  ...current,
                  pricingMessage,
                }))
              }
            />
            <TextareaField
              label="Negotiation message"
              value={automation.negotiationMessage}
              onChange={(negotiationMessage) =>
                setAutomation((current: any) => ({
                  ...current,
                  negotiationMessage,
                }))
              }
            />
          </div>
        </section>
      )}

      {section === "followups" && (
        <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">Appointment Follow-ups</h2>
            <label className="flex items-center gap-2 text-sm font-semibold">
              Enabled
              <input
                type="checkbox"
                checked={automation.followUps.enabled}
                onChange={(event) =>
                  setAutomation((current: any) => ({
                    ...current,
                    followUps: {
                      ...current.followUps,
                      enabled: event.target.checked,
                    },
                  }))
                }
                className="h-4 w-4 accent-emerald-500"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {[
              {
                key: "first",
                label: "First follow-up",
                delayKey: "firstDelayMinutes",
                messageKey: "firstMessage",
              },
              {
                key: "second",
                label: "Second follow-up",
                delayKey: "secondDelayMinutes",
                messageKey: "secondMessage",
              },
            ].map((item) => (
              <div
                key={item.key}
                className={`rounded-lg border ${softCardClass} p-4`}
              >
                <p className="font-black">{item.label}</p>
                <label className="mt-3 grid gap-1.5">
                  <span className={labelClass}>Delay in minutes</span>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={(automation.followUps as any)[item.delayKey]}
                    onChange={(event) =>
                      setAutomation((current: any) => ({
                        ...current,
                        followUps: {
                          ...current.followUps,
                          [item.delayKey]: Number(event.target.value),
                        },
                      }))
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="mt-3 grid gap-1.5">
                  <span className={labelClass}>Message guidance</span>
                  <textarea
                    rows={4}
                    value={(automation.followUps as any)[item.messageKey]}
                    onChange={(event) =>
                      setAutomation((current: any) => ({
                        ...current,
                        followUps: {
                          ...current.followUps,
                          [item.messageKey]: event.target.value,
                        },
                      }))
                    }
                    className={`${fieldClass} resize-y`}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClass}>{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} resize-y`}
      />
    </label>
  );
}

export function WhatsAppFaqsPanel({
  cardClass,
  softCardClass,
  faqs,
  onSave,
}: PanelProps & {
  faqs: any[];
  onSave: (faqs: any[]) => Promise<void>;
}) {
  const [items, setItems] = useState<any[]>(faqs || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setItems(faqs || []), [faqs]);

  return (
    <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-black">Frequently Asked Questions</h2>
          <Badge className="bg-emerald-500/15 text-emerald-500">
            {items.filter((item) => item.isActive !== false).length} active
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  id: `faq_${Date.now()}`,
                  question: "",
                  answer: "",
                  isActive: true,
                },
              ])
            }
            className="gap-2 rounded-lg border border-emerald-500 bg-transparent text-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(
                  items.filter(
                    (item) => item.question.trim() && item.answer.trim(),
                  ),
                );
              } finally {
                setIsSaving(false);
              }
            }}
            className="gap-2 rounded-lg bg-emerald-600 text-white"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {items.map((faq, index) => (
          <article
            key={faq.id}
            className={`rounded-lg border ${softCardClass} p-3 sm:p-4`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-xs font-black text-white">
                {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  Active
                  <input
                    type="checkbox"
                    checked={faq.isActive !== false}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, isActive: event.target.checked }
                            : item,
                        ),
                      )
                    }
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <button
                  type="button"
                  title="Delete FAQ"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="rounded-md p-2 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              value={faq.question}
              placeholder="Question"
              onChange={(event) =>
                setItems((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, question: event.target.value }
                      : item,
                  ),
                )
              }
              className={`${fieldClass} mt-3 font-bold`}
            />
            <textarea
              rows={5}
              value={faq.answer}
              placeholder="Answer"
              onChange={(event) =>
                setItems((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, answer: event.target.value }
                      : item,
                  ),
                )
              }
              className={`${fieldClass} mt-3 resize-y`}
            />
          </article>
        ))}
      </div>
      {!items.length && (
        <div className={`mt-5 rounded-lg border ${softCardClass} p-8 text-center`}>
          <HelpCircle className="mx-auto h-7 w-7 text-gray-400" />
          <p className="mt-3 text-sm font-semibold text-gray-500">
            No FAQs added
          </p>
        </div>
      )}
    </section>
  );
}

const APPOINTMENT_STATUSES = [
  { value: "active", label: "Active", tone: "bg-blue-500/15 text-blue-500" },
  {
    value: "confirmed",
    label: "Confirmed",
    tone: "bg-emerald-500/15 text-emerald-500",
  },
  {
    value: "resolved",
    label: "Resolved",
    tone: "bg-violet-500/15 text-violet-500",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    tone: "bg-red-500/15 text-red-500",
  },
  {
    value: "no_show",
    label: "No show",
    tone: "bg-amber-500/15 text-amber-500",
  },
] as const;

export function WhatsAppAppointmentsPanel({
  cardClass,
  softCardClass,
  appointments,
  onStatusChange,
}: PanelProps & {
  appointments: any[];
  onStatusChange: (appointmentId: string, status: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");
  const normalized = useMemo(
    () =>
      (appointments || []).map((item) => ({
        ...item,
        status: item.status === "requested" ? "active" : item.status,
      })),
    [appointments],
  );
  const filtered =
    filter === "all"
      ? normalized
      : normalized.filter((item) => item.status === filter);
  const metrics = [
    {
      label: "Total",
      value: normalized.length,
      icon: CalendarDays,
    },
    {
      label: "Active",
      value: normalized.filter((item) => item.status === "active").length,
      icon: CircleDot,
    },
    {
      label: "Confirmed",
      value: normalized.filter((item) => item.status === "confirmed").length,
      icon: CheckCircle2,
    },
    {
      label: "Resolved",
      value: normalized.filter((item) => item.status === "resolved").length,
      icon: ListChecks,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`rounded-xl border ${cardClass} p-4`}
            >
              <div className="flex items-center justify-between">
                <p className={labelClass}>{metric.label}</p>
                <Icon className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-3 text-2xl font-black">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <section className={`rounded-xl border ${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Appointments</h2>
            <p className="mt-1 text-xs font-semibold text-gray-400">
              14-day retention
            </p>
          </div>
          <label className="relative">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              <option value="all">All statuses</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </label>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {filtered.map((appointment) => {
            const status =
              APPOINTMENT_STATUSES.find(
                (item) => item.value === appointment.status,
              ) || APPOINTMENT_STATUSES[0];
            return (
              <article
                key={appointment._id || appointment.createdAt}
                className={`rounded-lg border ${softCardClass} p-4`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-black">
                          {appointment.patientName || "WhatsApp customer"}
                        </h3>
                        <p className="truncate text-sm text-gray-500 dark:text-white/50">
                          {appointment.patientPhone || appointment.patientWaId}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge className={status.tone}>{status.label}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Detail label="Service" value={appointment.service} />
                  <Detail
                    label="Date and time"
                    value={
                      [appointment.preferredDate, appointment.preferredTime]
                        .filter(Boolean)
                        .join(" at ") || "Not specified"
                    }
                  />
                  <Detail
                    label="Email"
                    value={appointment.patientEmail || "Not provided"}
                  />
                  <Detail
                    label="Created"
                    value={new Date(appointment.createdAt).toLocaleString()}
                  />
                </div>
                {appointment.symptoms && (
                  <div className="mt-3 rounded-lg border border-gray-200 p-3 text-sm leading-6 text-gray-600 dark:border-white/[0.08] dark:text-white/60">
                    {appointment.symptoms}
                  </div>
                )}
                {appointment.notes && (
                  <div className="mt-3 rounded-lg border border-gray-200 p-3 text-sm leading-6 text-gray-600 dark:border-white/[0.08] dark:text-white/60">
                    {appointment.notes}
                  </div>
                )}
                <label className="mt-4 grid gap-1.5">
                  <span className={labelClass}>Status</span>
                  <select
                    value={appointment.status}
                    disabled={updatingId === String(appointment._id)}
                    onChange={async (event) => {
                      setUpdatingId(String(appointment._id));
                      try {
                        await onStatusChange(
                          String(appointment._id),
                          event.target.value,
                        );
                      } finally {
                        setUpdatingId("");
                      }
                    }}
                    className={fieldClass}
                  >
                    {APPOINTMENT_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            );
          })}
        </div>
        {!filtered.length && (
          <div className="py-12 text-center">
            <CalendarDays className="mx-auto h-7 w-7 text-gray-400" />
            <p className="mt-3 text-sm font-semibold text-gray-500">
              No appointments in this view
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 break-words font-semibold">{value || "Not provided"}</p>
    </div>
  );
}
