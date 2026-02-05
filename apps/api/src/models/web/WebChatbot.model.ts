import mongoose, { Schema, Document, Model } from "mongoose";

export type ChatbotType =
  | "chatbot-customer-support"
  | "chatbot-e-commerce"
  | "chatbot-lead-generation"
  | "chatbot-education";
export type WidgetPosition = "bottom-right" | "bottom-left";

export interface IChatbotSettings {
  welcomeMessage: string;
  primaryColor: string;
  position: WidgetPosition;
  autoExpand: boolean;
}

export interface IChatbotAnalytics {
  totalConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  satisfactionScore: number;
}

export interface IChatbot extends Document {
  clerkId: string;
  name: string;
  type: ChatbotType;
  websiteUrl?: string;
  phone?: string;
  scrappedFile?: string;
  isScrapped: boolean;
  embedCode: string;
  settings: IChatbotSettings;
  analytics: IChatbotAnalytics;
  isActive: boolean;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotSettingsSchema = new Schema<IChatbotSettings>(
  {
    welcomeMessage: {
      type: String,
      required: true,
      default: "Hello! How can I help you today?",
      maxlength: 200,
    },
    primaryColor: {
      type: String,
      required: true,
      default: "#3B82F6",
      match: [
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        "Please enter a valid hex color",
      ],
    },
    position: {
      type: String,
      required: true,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
    },
    autoExpand: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const ChatbotAnalyticsSchema = new Schema<IChatbotAnalytics>(
  {
    totalConversations: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    satisfactionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { _id: false },
);

const ChatbotSchema = new Schema<IChatbot>(
  {
    clerkId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "chatbot-customer-support",
        "chatbot-e-commerce",
        "chatbot-lead-generation",
        "chatbot-education",
      ],
    },
    websiteUrl: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "Please enter a valid URL",
      ],
    },
    phone: {
      type: String,
    },
    scrappedFile: {
      type: String,
    },
    isScrapped: {
      type: Boolean,
      default: false,
    },
    embedCode: {
      type: String,
      required: true,
    },
    settings: {
      type: ChatbotSettingsSchema,
      default: () => ({}),
    },
    analytics: {
      type: ChatbotAnalyticsSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscriptionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure unique chatbot type per user
ChatbotSchema.index({ clerkId: 1, type: 1 }, { unique: true });

// Indexes for optimized queries
ChatbotSchema.index({ clerkId: 1 });
ChatbotSchema.index({ type: 1, isActive: 1 });

const WebChatbot =
  mongoose.models?.WebChatbot ||
  mongoose.model<IChatbot>("WebChatbot", ChatbotSchema);

export default WebChatbot;
