import mongoose, {Document, Schema} from 'mongoose';
import {ICourseBundle} from "./CourseBundle.js";

export interface IHolyProject extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;

    level: number;
    xpReward: number;
    url: string;
    content: string;
    evaluationText: string;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;

    externalLink: {
        url: string;
        title: string;
    }[]

    createdAt?: Date;
    updatedAt?: Date;
}

const holyProjectSchema: Schema<IHolyProject> = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        default: 1
    },
    xpReward: {
        type: Number,
        default: 1
    },
    url: {
        type: String,
        unique: true,
        required: true
    },
    content: {
        type: String,
        required: false,
        default: ""
    },
    cdnVideoContent: {
        type: String,
        required: false
    },
    evaluationText: {
        type: String,
        default: ""
    },
    cdnAudioContent: {
        type: String,
        required: false
    },
    externalLink: [{
        url: {
            type: String,
            required: false,
            default: ""

        },
        title: {
            type: String,
            required: false,
            default: ""
        }
    }]

}, {
    timestamps: true
});

const HolyProject = mongoose.model<IHolyProject>('HolyProject', holyProjectSchema);

export default HolyProject;
