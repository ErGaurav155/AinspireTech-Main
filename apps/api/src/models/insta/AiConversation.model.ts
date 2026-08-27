import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInstagramAiConversation extends Document {
  clerkId: string;
  accountId: string;
  participantId: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstagramAiConversationSchema =
  new Schema<IInstagramAiConversation>(
    {
      clerkId: { type: String, required: true, index: true },
      accountId: { type: String, required: true },
      participantId: { type: String, required: true },
      messages: [
        {
          _id: false,
          role: { type: String, enum: ["user", "assistant"], required: true },
          content: { type: String, required: true, maxlength: 3500 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    { timestamps: true },
  );

InstagramAiConversationSchema.index(
  { clerkId: 1, accountId: 1, participantId: 1 },
  { unique: true },
);
InstagramAiConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const InstagramAiConversation =
  (mongoose.models?.InstagramAiConversation ||
    mongoose.model<IInstagramAiConversation>(
      "InstagramAiConversation",
      InstagramAiConversationSchema,
    )) as Model<IInstagramAiConversation>;

export default InstagramAiConversation;
