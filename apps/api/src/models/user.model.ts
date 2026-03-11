import { Schema, model, models, Document, Model } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  username?: string;
  phone?: string; // ← ADD THIS
  totalReplies: number;
  replyLimit: number;
  accountLimit: number;
  photo?: string;
  firstName?: string;
  lastName?: string;
  referredBy?: string;
  hasUsedReferral: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String },
    totalReplies: { type: Number, default: 0 },
    replyLimit: { type: Number, default: 500 },
    accountLimit: { type: Number, default: 1 },
    phone: { type: String }, // ← ADD THIS
    photo: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    referredBy: { type: String },
    hasUsedReferral: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const User = (models?.User || model<IUser>("User", UserSchema)) as Model<IUser>;

export default User;
