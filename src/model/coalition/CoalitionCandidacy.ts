import mongoose, { Document, Schema } from "mongoose";
import type { CoalitionId } from "./constants.js";
import { IUser } from "../User.js";

export interface ICoalitionCandidacy extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | IUser;
  seasonKey: string;
  coalitionId: CoalitionId;
  presentation: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const coalitionCandidacySchema = new Schema<ICoalitionCandidacy>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seasonKey: { type: String, required: true, index: true },
    coalitionId: {
      type: String,
      required: true,
      enum: ["orion", "noctis", "pulse"],
    },
    presentation: { type: String, required: true, maxlength: 8000 },
  },
  { timestamps: true }
);

coalitionCandidacySchema.index({ user: 1, seasonKey: 1 }, { unique: true });

const CoalitionCandidacy = mongoose.model<ICoalitionCandidacy>(
  "CoalitionCandidacy",
  coalitionCandidacySchema
);
export default CoalitionCandidacy;
