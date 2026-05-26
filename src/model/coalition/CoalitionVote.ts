import mongoose, { Document, Schema } from "mongoose";
import type { CoalitionId } from "./constants.js";
import { IUser } from "../User.js";

export interface ICoalitionVote extends Document {
  _id: mongoose.Types.ObjectId;
  voter: mongoose.Types.ObjectId | IUser;
  candidate: mongoose.Types.ObjectId | IUser;
  seasonKey: string;
  coalitionId: CoalitionId;
  createdAt?: Date;
  updatedAt?: Date;
}

const coalitionVoteSchema = new Schema<ICoalitionVote>(
  {
    voter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidate: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seasonKey: { type: String, required: true, index: true },
    coalitionId: {
      type: String,
      required: true,
      enum: ["orion", "noctis", "pulse"],
    },
  },
  { timestamps: true }
);

coalitionVoteSchema.index({ voter: 1, seasonKey: 1 }, { unique: true });

const CoalitionVote = mongoose.model<ICoalitionVote>(
  "CoalitionVote",
  coalitionVoteSchema
);
export default CoalitionVote;
