import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
    },
    totalReplies: {
      type: Number,
      default: 0,
    },
    replyLimit: {
      type: Number,
      default: 500,
    },
    accountLimit: {
      type: Number,
      default: 1,
    },
    photo: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    referredBy: {
      type: String,
    },
    hasUsedReferral: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = models?.User || model("User", UserSchema);

export default User;
