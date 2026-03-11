import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IReplyTemplateContent {
  text: string;
  link: string;
  buttonTitle?: string;
}

export interface IWelcomeMessage {
  enabled: boolean;
  text: string;
  buttonTitle: string;
}

export interface IPublicReply {
  enabled: boolean;
  replies: string[];
  tagType: "none" | "user" | "account";
}

export interface IAskFollow {
  enabled: boolean;
  message: string;
  visitProfileBtn: string;
  followingBtn: string;
}

export interface IAskEmail {
  enabled: boolean;
  openingMessage: string;
  retryMessage: string;
  sendDmIfNoEmail: boolean;
}

// ── New Phone Interface ────────────────────────────────────────────────────────
export interface IAskPhone {
  enabled: boolean;
  openingMessage: string;
  retryMessage: string;
  sendDmIfNoPhone: boolean;
}

// ── Follow-Up DM Message Interface ─────────────────────────────────────────────
export interface IFollowUpMessage {
  condition: string; // e.g., "no_reply", "no_action"
  waitTime: number;
  waitUnit: "minutes" | "hours";
  message: string;
  links: Array<{
    url: string;
    buttonTitle: string;
  }>;
}

export interface IFollowUpDMs {
  enabled: boolean;
  messages: IFollowUpMessage[];
}

// ─── Main document interface ──────────────────────────────────────────────────

export interface IReplyTemplate extends Document {
  userId: string;
  accountId: string;
  accountUsername: string;
  name: string;

  // Media
  mediaId: string;
  mediaUrl?: string;
  mediaType?: string;

  // Core DM content (multiple options, randomly chosen)
  content: IReplyTemplateContent[];

  // Comment replies (multiple options, randomly chosen)
  reply: string[];

  // Trigger keywords (empty array = respond to any keyword)
  triggers: string[];

  // Legacy follow flag (kept for backwards compat)
  isFollow: boolean;

  // Timing
  delaySeconds: number;
  delayOption: "immediate" | "3min" | "5min" | "10min";

  // Status & ordering
  isActive: boolean;
  priority: number;

  // Statistics
  usageCount: number;
  lastUsed?: Date;
  successRate?: number;

  // Legacy tier settings (kept for backwards compat)
  settingsByTier: {
    free: {
      requireFollow: boolean;
      skipFollowCheck: boolean;
      directLink: boolean;
    };
    pro: {
      requireFollow: boolean;
      useAdvancedFlow: boolean;
      maxRetries: number;
    };
  };

  // ── New automation fields ──────────────────────────────────────────────────

  /** Which type of automation this is */
  automationType: "comments" | "stories" | "dms" | "live";

  /** Whether "any post or reel" is selected */
  anyPostOrReel: boolean;

  /** Whether "any keyword" is selected */
  anyKeyword: boolean;

  /** Welcome message shown before main DM */
  welcomeMessage: IWelcomeMessage;

  /** Public comment reply config */
  publicReply: IPublicReply;

  /** Ask user to follow before sending DM */
  askFollow: IAskFollow;

  /** Ask user for their email (Pro) */
  askEmail: IAskEmail;

  /** Ask user for their phone (Pro) - NEW */
  askPhone: IAskPhone;

  /** Send follow-up DMs (Pro) */
  followUpDMs: IFollowUpDMs;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ReplyTemplateSchema = new Schema<IReplyTemplate>(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountUsername: { type: String, required: true },
    name: { type: String, required: true },

    // Media
    mediaId: { type: String, default: "", index: true },
    mediaUrl: { type: String },
    mediaType: { type: String },

    // Core DM content
    content: [
      {
        text: { type: String, required: true },
        link: { type: String, default: "" },
        buttonTitle: { type: String, default: "Get Access" },
      },
    ],

    // Comment replies
    reply: { type: [String], required: true },

    // Triggers
    triggers: { type: [String], default: [] },

    // Legacy follow flag
    isFollow: { type: Boolean, default: false },

    // Timing
    delaySeconds: { type: Number, default: 0 },
    delayOption: {
      type: String,
      enum: ["immediate", "3min", "5min", "10min"],
      default: "immediate",
    },

    // Status
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },

    // Statistics
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date },
    successRate: { type: Number, default: 0 },

    // Legacy tier settings
    settingsByTier: {
      free: {
        requireFollow: { type: Boolean, default: false },
        skipFollowCheck: { type: Boolean, default: true },
        directLink: { type: Boolean, default: true },
      },
      pro: {
        requireFollow: { type: Boolean, default: true },
        useAdvancedFlow: { type: Boolean, default: true },
        maxRetries: { type: Number, default: 3 },
      },
    },

    // ── New automation fields ────────────────────────────────────────────────

    automationType: {
      type: String,
      enum: ["comments", "stories", "dms", "live"],
      default: "comments",
    },

    anyPostOrReel: { type: Boolean, default: false },

    anyKeyword: { type: Boolean, default: false },

    welcomeMessage: {
      enabled: { type: Boolean, default: false },
      text: {
        type: String,
        default:
          "Hi {{username}}! So glad you're interested 🎉\nClick below and I'll share the link with you in a moment 🧲",
      },
      buttonTitle: { type: String, default: "Send me the link" },
    },

    publicReply: {
      enabled: { type: Boolean, default: false },
      replies: {
        type: [String],
        default: [
          "Replied in DMs 📨",
          "Coming your way 🧲",
          "Check your DM 📩",
        ],
      },
      tagType: {
        type: String,
        enum: ["none", "user", "account"],
        default: "none",
      },
    },

    askFollow: {
      enabled: { type: Boolean, default: false },
      message: {
        type: String,
        default:
          "Hey! It seems you haven't followed me yet 🙂\n\nHit the follow button on my profile, then tap 'I'm following' below to get your link 🧲",
      },
      visitProfileBtn: { type: String, default: "Visit Profile" },
      followingBtn: { type: String, default: "I'm following ✅" },
    },

    askEmail: {
      enabled: { type: Boolean, default: false },
      openingMessage: {
        type: String,
        default:
          "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your email address first. Please share it in the chat.",
      },
      retryMessage: {
        type: String,
        default: "Please enter a correct email address, e.g. info@gmail.com",
      },
      sendDmIfNoEmail: { type: Boolean, default: true },
    },

    // NEW: Ask Phone
    askPhone: {
      enabled: { type: Boolean, default: false },
      openingMessage: {
        type: String,
        default:
          "Hey there! I'm so happy you're here. Thank you so much for your interest 🤩 . I'll need your phone number first. Please share it in the chat.",
      },
      retryMessage: {
        type: String,
        default: "Please enter a correct phone number, e.g. +1234567890",
      },
      sendDmIfNoPhone: { type: Boolean, default: true },
    },

    // Follow-up DMs with full message structure
    followUpDMs: {
      enabled: { type: Boolean, default: false },
      messages: [
        {
          condition: { type: String, default: "" }, // "no_reply", "no_action"
          waitTime: { type: Number, default: 60 },
          waitUnit: {
            type: String,
            enum: ["minutes", "hours"],
            default: "minutes",
          },
          message: { type: String, default: "" },
          links: [
            {
              url: { type: String, default: "" },
              buttonTitle: { type: String, default: "Get Access" },
            },
          ],
        },
      ],
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ReplyTemplateSchema.index({ userId: 1, mediaId: 1, isActive: 1 });
ReplyTemplateSchema.index({ accountId: 1, mediaId: 1 });
ReplyTemplateSchema.index({ triggers: 1 });
ReplyTemplateSchema.index({ userId: 1, automationType: 1, isActive: 1 });
ReplyTemplateSchema.index({ userId: 1, createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────
const InstaReplyTemplate = (mongoose.models?.InstaReplyTemplate ||
  mongoose.model<IReplyTemplate>(
    "InstaReplyTemplate",
    ReplyTemplateSchema,
  )) as Model<IReplyTemplate>;

export default InstaReplyTemplate;
