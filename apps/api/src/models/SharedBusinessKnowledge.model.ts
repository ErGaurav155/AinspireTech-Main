import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISharedBusinessKnowledge extends Document {
  clerkId: string;
  websiteUrl: string;
  businessInfo: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  knowledgeBaseUrl: string;
  knowledgeBasePublicId: string;
  knowledgeBaseResourceType: "image" | "raw";
  knowledgeBaseFileName: string;
  knowledgeUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SharedBusinessKnowledgeSchema =
  new Schema<ISharedBusinessKnowledge>(
    {
      clerkId: { type: String, required: true, unique: true, index: true },
      websiteUrl: { type: String, default: "", trim: true },
      businessInfo: { type: String, default: "", maxlength: 12000 },
      fileName: { type: String, default: "", maxlength: 240 },
      fileType: { type: String, default: "", maxlength: 120 },
      fileSize: { type: Number, default: 0, min: 0 },
      knowledgeBaseUrl: { type: String, default: "" },
      knowledgeBasePublicId: { type: String, default: "" },
      knowledgeBaseResourceType: {
        type: String,
        enum: ["image", "raw"],
        default: "raw",
      },
      knowledgeBaseFileName: { type: String, default: "" },
      knowledgeUpdatedAt: Date,
    },
    { timestamps: true },
  );

const SharedBusinessKnowledge =
  (mongoose.models?.SharedBusinessKnowledge ||
    mongoose.model<ISharedBusinessKnowledge>(
      "SharedBusinessKnowledge",
      SharedBusinessKnowledgeSchema,
    )) as Model<ISharedBusinessKnowledge>;

export default SharedBusinessKnowledge;
