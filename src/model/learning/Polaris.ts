import mongoose, { Document, mongo, Schema } from "mongoose";
import { IPlanet } from "./Planet.js";

export interface IPolaris extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  identifier: string;

  name: string;
  description: string;

  planets: (IPlanet | mongoose.Types.ObjectId)[];

  level: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const polarisSchema: Schema<IPolaris> = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    planets: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Planet",
      },
    ],
    level: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Polaris = mongoose.model<IPolaris>("Polaris", polarisSchema);

export default Polaris;
