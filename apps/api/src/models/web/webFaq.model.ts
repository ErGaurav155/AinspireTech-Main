// models/FAQ.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFAQ extends Document {
  clerkId: string;
  chatbotType: string;
  questions: {
    id: string;
    question: string;
    answer: string;
    category?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>(
  {
    clerkId: {
      type: String,
      required: true,
    },
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
    questions: [
      {
        id: {
          type: String,
          required: true,
          default: () => new mongoose.Types.ObjectId().toString(),
        },
        question: {
          type: String,
          required: true,
          trim: true,
          minlength: 5,
          maxlength: 500,
        },
        answer: {
          type: String,
          required: true,
          trim: true,
          minlength: 10,
          maxlength: 2000,
        },
        category: {
          type: String,
          default: "General",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for optimized queries
FAQSchema.index({ clerkId: 1, chatbotType: 1 }, { unique: true });

const webFaq =
  mongoose.models?.webFaq || mongoose.model<IFAQ>("webFaq", FAQSchema);

export default webFaq;
