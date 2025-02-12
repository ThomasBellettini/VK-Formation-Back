import mongoose, {Document, Schema} from 'mongoose';
import {IUser} from "../User.js";
import {IHolyProject} from "./HolyProject.js";

export interface IEvaluation extends Document {
    _id: mongoose.Types.ObjectId;

    project: (mongoose.Types.ObjectId | IHolyProject);
    user: (mongoose.Types.ObjectId | IUser);
    percent: number | null;

    createdAt?: Date;
    updatedAt?: Date;
}



const evaluation: Schema<IEvaluation> = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HolyProject'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    percent: {
        type: Number,
        required: false
    }

}, {
    timestamps: true
});

const Evaluation = mongoose.model<IEvaluation>('Evaluation', evaluation);

export default Evaluation;
