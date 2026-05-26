import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "../User.js";

/** One document per user per calendar day (date key YYYY-MM-DD, Europe/Paris). */
export interface IUserDailyCoinLedger extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | IUser;
  /** YYYY-MM-DD in Europe/Paris */
  dateKey: string;
  coinsEarned: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const userDailyCoinLedgerSchema = new Schema<IUserDailyCoinLedger>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: { type: String, required: true, index: true },
    coinsEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userDailyCoinLedgerSchema.index({ user: 1, dateKey: 1 }, { unique: true });

const UserDailyCoinLedger = mongoose.model<IUserDailyCoinLedger>(
  "UserDailyCoinLedger",
  userDailyCoinLedgerSchema
);
export default UserDailyCoinLedger;
