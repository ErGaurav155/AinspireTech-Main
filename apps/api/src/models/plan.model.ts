import mongoose, { Schema, Document, model, Model } from "mongoose";

export interface IPlan extends Document {
  productId: string;
  razorpaymonthlyplanId?: string;
  paypalmonthlyplanId?: string;
  razorpayyearlyplanId?: string;
  paypalyearlyplanId?: string;
  name: string;
}

const PlanSchema = new Schema<IPlan>({
  productId: { type: String, unique: true, required: true },
  razorpaymonthlyplanId: { type: String },
  razorpayyearlyplanId: { type: String },
  name: { type: String, required: true },
});

const Plan = (mongoose.models?.Plan ||
  model<IPlan>("Plan", PlanSchema)) as Model<IPlan>;

export default Plan;
