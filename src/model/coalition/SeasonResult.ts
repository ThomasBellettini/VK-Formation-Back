import mongoose, { Document, Schema } from "mongoose";
import type { CoalitionId } from "./constants.js";
import { IUser } from "../User.js";

export interface ISeasonResult extends Document {
  _id: mongoose.Types.ObjectId;
  seasonKey: string;
  year: number;
  seasonIndex: number;
  coalitionTotals: Record<CoalitionId, number>;
  winningCoalitionId: CoalitionId | null;
  electedLeaders: Partial<Record<CoalitionId, mongoose.Types.ObjectId | IUser>>;
  participantCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const seasonResultSchema = new Schema<ISeasonResult>(
  {
    seasonKey: { type: String, required: true, unique: true, index: true },
    year: { type: Number, required: true },
    seasonIndex: { type: Number, required: true, min: 1, max: 4 },
    coalitionTotals: {
      type: Schema.Types.Mixed,
      required: true,
    },
    winningCoalitionId: {
      type: String,
      enum: ["orion", "noctis", "pulse", null],
      default: null,
    },
    electedLeaders: { type: Schema.Types.Mixed, default: {} },
    participantCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SeasonResult = mongoose.model<ISeasonResult>(
  "SeasonResult",
  seasonResultSchema
);
export default SeasonResult;
