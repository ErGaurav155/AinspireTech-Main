import { Schema, model, models, Document, Model, Types } from "mongoose";

export interface ITransaction extends Document {
  customerId: string;
  amount: number;
  plan?: string;
  buyer?: Types.ObjectId;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  createdAt: { type: Date, default: Date.now },
  customerId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  plan: { type: String },
  buyer: { type: Schema.Types.ObjectId, ref: "User" },
});

const Transaction = (models?.Transaction ||
  model<ITransaction>("Transaction", TransactionSchema)) as Model<ITransaction>;

export default Transaction;
