import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICallNumberPool extends Document {
  phoneNumber: string;
  label: string;
  countryCode: string;
  type: "local" | "tollfree";
  tier: "free_shared" | "paid_dedicated";
  status: "available" | "leased" | "assigned" | "disabled";
  assignedClerkId?: string;
  activeCallSid?: string;
  leaseExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallNumberPoolSchema = new Schema<ICallNumberPool>(
  {
    phoneNumber: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: "Exotel number" },
    countryCode: { type: String, default: "IN" },
    type: { type: String, enum: ["local", "tollfree"], default: "local" },
    tier: {
      type: String,
      enum: ["free_shared", "paid_dedicated"],
      default: "free_shared",
      index: true,
    },
    status: {
      type: String,
      enum: ["available", "leased", "assigned", "disabled"],
      default: "available",
      index: true,
    },
    assignedClerkId: { type: String, index: true },
    activeCallSid: String,
    leaseExpiresAt: Date,
  },
  { timestamps: true },
);

CallNumberPoolSchema.index({ tier: 1, status: 1 });

const CallNumberPool = (mongoose.models?.CallNumberPool ||
  mongoose.model<ICallNumberPool>(
    "CallNumberPool",
    CallNumberPoolSchema,
  )) as Model<ICallNumberPool>;

export default CallNumberPool;
