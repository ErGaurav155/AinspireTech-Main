import mongoose, { Schema, Document, model } from "mongoose";

// Define the Plan interface
export interface IPlan extends Document {
  productId: string;
  razorpaymonthlyplanId: string;
  paypalmonthlyplanId: string;
  razorpayyearlyplanId: string;
  paypalyearlyplanId: string;
  name: string;
}

// Create the Plan schema
const PlanSchema = new Schema<IPlan>({
  productId: { type: String, unique: true, required: true },
  razorpaymonthlyplanId: { type: String },
  razorpayyearlyplanId: { type: String },

  name: { type: String, required: true },
});

// Create the Plan model
const Plan = mongoose.models?.Plan || model<IPlan>("Plan", PlanSchema);

export default Plan;
