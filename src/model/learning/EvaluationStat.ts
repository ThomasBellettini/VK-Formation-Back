import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "../User.js";
import { IHolyProject } from "./HolyProject.js";
import {IPlanet} from "./Planet";

export enum EvalStatSource {
  LIVE = "live",
  LEGACY = "legacy",
}

export interface IEvaluationStat extends Document {
  evaluator: mongoose.Types.ObjectId | IUser;
  evaluatedUser: mongoose.Types.ObjectId | IUser;
  project?: mongoose.Types.ObjectId | IHolyProject;
  planetId?: mongoose.Types.ObjectId | IPlanet;
  polarisIdentifier?: string;

  resultPercent?: number;

  messageCount?: number;
  timeSpentSec?: number;

  source: EvalStatSource;
  legacyIndex?: number;
  createdAt: Date;
}

const EvaluationStatSchema = new Schema<IEvaluationStat>({
    evaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    evaluatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HolyProject",
      required: false
    },
    planetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Planet",
      required: false
    },
    polarisIdentifier: {
      type: String,
      required: false
    },
    resultPercent: {
      type: Number,
      required: false
    },

    messageCount: {
      type: Number,
      required: false,
      min: 0
    },
    timeSpentSec: {
      type: Number,
      required: false,
      min: 0
    },
    source: {
      type: String,
      enum: Object.values(EvalStatSource),
      required: true
    },
    legacyIndex: {
      type: Number,
      required: false
    }
}, {
    timestamps: true
});

EvaluationStatSchema.index({ evaluator: 1, createdAt: -1 });
EvaluationStatSchema.index(
  { evaluator: 1, source: 1, legacyIndex: 1 },
  { unique: true, partialFilterExpression: { source: "legacy" } }
);

const EvaluationStat = mongoose.model<IEvaluationStat>("EvaluationStat", EvaluationStatSchema);

export default EvaluationStat;