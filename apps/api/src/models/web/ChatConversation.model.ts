// apps/api/src/models/web/ChatConversation.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  metadata?: {
    sentiment?: "positive" | "negative" | "neutral";
    intent?: string;
    confidence?: number;
  };
}

export interface IChatConversation extends Document {
  chatbotType: string;
  clerkId: string;
  sessionId: string; // Unique identifier for the chat session
  visitorId?: string; // For anonymous users
  customerEmail?: string;
  customerName?: string;
  messages: IChatMessage[];
  totalTokensUsed: number;
  totalMessages: number;
  hasAppointment: boolean;
  status: "active" | "completed" | "abandoned";
  tags: string[];
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageMetadataSchema = new Schema(
  {
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral"],
    },
    intent: {
      type: String,
      trim: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  { _id: false },
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    id: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "bot"],
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: ChatMessageMetadataSchema,
    },
  },
  { _id: false },
);

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    chatbotType: {
      type: String,
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    visitorId: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    customerName: {
      type: String,
      trim: true,
    },
    messages: [ChatMessageSchema],
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    hasAppointment: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for optimized queries
ChatConversationSchema.index({ chatbotType: 1, status: 1 });
ChatConversationSchema.index({ clerkId: 1, status: 1 });
ChatConversationSchema.index({ sessionId: 1 });
ChatConversationSchema.index({ lastActivity: -1 });
ChatConversationSchema.index({ "messages.timestamp": 1 });

// TTL index to automatically delete old conversations after 90 days
ChatConversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const WebChatConversation = (mongoose.models?.WebChatConversation ||
  mongoose.model<IChatConversation>(
    "WebChatConversation",
    ChatConversationSchema,
  )) as Model<IChatConversation>;

export default WebChatConversation;
