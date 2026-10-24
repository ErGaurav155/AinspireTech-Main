import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAgencyTrialClaim extends Document {
  identityHash: string;
  claimedByUserId: string;
  firstAgencyId?: mongoose.Types.ObjectId;
  claimedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyTrialClaimSchema = new Schema<IAgencyTrialClaim>(
  {
    identityHash: { type: String, required: true, unique: true },
    claimedByUserId: { type: String, required: true, index: true },
    firstAgencyId: { type: Schema.Types.ObjectId, ref: "Agency" },
    claimedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

const AgencyTrialClaim =
  (mongoose.models?.AgencyTrialClaim ||
    mongoose.model<IAgencyTrialClaim>(
      "AgencyTrialClaim",
      AgencyTrialClaimSchema,
    )) as Model<IAgencyTrialClaim>;

export default AgencyTrialClaim;
