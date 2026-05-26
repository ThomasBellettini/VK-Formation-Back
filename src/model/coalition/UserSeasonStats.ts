import mongoose, { Document, Schema } from "mongoose";
import type { CoalitionId } from "./constants.js";
import { IUser } from "../User.js";

export interface IUserSeasonStats extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | IUser;
  seasonKey: string;
  coalitionId: CoalitionId;
  points: number;
  globalRank: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSeasonStatsSchema = new Schema<IUserSeasonStats>(
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
      index: true,
    },
    points: { type: Number, default: 0 },
    globalRank: { type: Number, default: null },
  },
  { timestamps: true }
);

userSeasonStatsSchema.index(
  { user: 1, seasonKey: 1 },
  { unique: true }
);

const UserSeasonStats = mongoose.model<IUserSeasonStats>(
  "UserSeasonStats",
  userSeasonStatsSchema
);
export default UserSeasonStats;
