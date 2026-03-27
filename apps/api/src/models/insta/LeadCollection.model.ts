// models/insta/LeadCollection.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadCollection extends Document {
  userId: string;
  accountId: string;
  accountUsername: string;
  templateId: string;
  templateName: string;
  commenterUserId: string;
  commenterUsername: string;
  mediaId: string;
  automationType: "comments" | "stories" | "dms";
  email?: string;
  phone?: string;
  source: "email_collection" | "phone_collection";
  createdAt: Date;
  updatedAt: Date;
}

const LeadCollectionSchema = new Schema<ILeadCollection>(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountUsername: { type: String, required: true },
    templateId: { type: String, required: true, index: true },
    templateName: { type: String, required: true },
    commenterUserId: { type: String, required: true, index: true },
    commenterUsername: { type: String, default: "unknown" },
    mediaId: { type: String, default: "" },
    automationType: {
      type: String,
      enum: ["comments", "stories", "dms"],
      default: "comments",
    },
    email: { type: String },
    phone: { type: String },
    source: {
      type: String,
      enum: ["email_collection", "phone_collection"],
      required: true,
    },
  },
  { timestamps: true },
);

LeadCollectionSchema.index({ userId: 1, createdAt: -1 });
LeadCollectionSchema.index({ templateId: 1, createdAt: -1 });
LeadCollectionSchema.index({ accountId: 1, source: 1, createdAt: -1 });
LeadCollectionSchema.index({ commenterUserId: 1, templateId: 1 });

const LeadCollection = (mongoose.models?.LeadCollection ||
  mongoose.model<ILeadCollection>(
    "LeadCollection",
    LeadCollectionSchema,
  )) as Model<ILeadCollection>;

export default LeadCollection;
