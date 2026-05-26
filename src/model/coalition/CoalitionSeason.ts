import mongoose, { Document, Schema } from "mongoose";

export interface ICoalitionSeason extends Document {
  _id: mongoose.Types.ObjectId;
  seasonKey: string;
  year: number;
  seasonIndex: number;
  warStartDateKey: string;
  warEndDateKey: string;
  voteStartDateKey: string;
  voteEndDateKey: string;
  archivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const coalitionSeasonSchema = new Schema<ICoalitionSeason>(
  {
    seasonKey: { type: String, required: true, unique: true, index: true },
    year: { type: Number, required: true, index: true },
    seasonIndex: { type: Number, required: true, min: 1, max: 4 },
    warStartDateKey: { type: String, required: true, index: true },
    warEndDateKey: { type: String, required: true },
    voteStartDateKey: { type: String, required: true },
    voteEndDateKey: { type: String, required: true },
    archivedAt: { type: Date, required: false, index: true },
  },
  { timestamps: true }
);

const CoalitionSeason = mongoose.model<ICoalitionSeason>(
  "CoalitionSeason",
  coalitionSeasonSchema
);
export default CoalitionSeason;
