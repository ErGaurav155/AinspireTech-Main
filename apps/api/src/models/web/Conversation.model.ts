import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  metadata?: {
    sentiment?: "positive" | "negative" | "neutral";
    intent?: string;
    confidence?: number;
  };
}

export interface IAppointmentFormData {
  name: string;
  email: string;
  phone?: string;
  service: string;
  date: Date;
  message?: string;
}
export interface IFormField {
  question: string;
  answer: string;
}
export interface IConversation extends Document {
  chatbotType:
    | "chatbot-customer-support"
    | "chatbot-e-commerce"
    | "chatbot-lead-generation"
    | "chatbot-education";
  clerkId: string;
  customerEmail?: string;
  customerName?: string;
  messages: IMessage[];
  formData?: IFormField[];
  status: "active" | "resolved" | "pending";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageMetadataSchema = new Schema(
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

const MessageSchema = new Schema<IMessage>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
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
    metadata: {
      type: MessageMetadataSchema,
    },
  },
  { _id: false },
);

const FormFieldSchema = new Schema<IFormField>(
  {
    question: { type: String },
    answer: { type: String },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversation>(
  {
    chatbotType: {
      type: String,
      required: true,
      enum: [
        "chatbot-customer-support",
        "chatbot-e-commerce",
        "chatbot-lead-generation",
        "chatbot-education",
      ],
    },

    clerkId: {
      type: String,
      required: true,
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
    messages: [MessageSchema],
    formData: [FormFieldSchema],
    status: {
      type: String,
      required: true,
      enum: ["active", "resolved", "pending"],
      default: "active",
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for optimized queries
ConversationSchema.index({ chatbotType: 1, status: 1 });
ConversationSchema.index({ "messages.timestamp": 1 });
ConversationSchema.index({ clerkId: 1, status: 1 });

// Add TTL index to automatically delete documents after 3 hours (10800 seconds)
ConversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1296000 });

const WebConversation =
  mongoose.models?.WebConversation ||
  mongoose.model<IConversation>("WebConversation", ConversationSchema);

export default WebConversation;
