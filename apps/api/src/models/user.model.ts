import { Schema, model, models, Document, Model, Types } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  username?: string;
  totalReplies: number;
  replyLimit: number;
  accountLimit: number;
  photo?: string;
  firstName?: string;
  lastName?: string;
  platformAccountType?: "AGENCY" | "BUSINESS" | "MEMBER";
  platformOwnerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String },
    totalReplies: { type: Number, default: 0 },
    replyLimit: { type: Number, default: 200 },
    accountLimit: { type: Number, default: 1 },
    photo: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    platformAccountType: {
      type: String,
      enum: ["AGENCY", "BUSINESS", "MEMBER"],
      index: true,
    },
    platformOwnerId: { type: Schema.Types.ObjectId, index: true },
  },
  { timestamps: true },
);

UserSchema.index({ platformAccountType: 1, platformOwnerId: 1 });

const User = (models?.User || model<IUser>("User", UserSchema)) as Model<IUser>;

export default User;
