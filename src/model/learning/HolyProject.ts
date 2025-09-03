import mongoose, {Document, Schema} from 'mongoose';
import {ICourseBundle} from "./CourseBundle.js";
import { IPlanet } from './Planet.js';

export enum EvaluationType {
    STANDARD = "standard",
    QCM = "qcm",
    UPLOAD = "upload-files",
    DISCORD="discord",
    SHARE_LINKS="share-links"
}

export enum EvaluatorType {
    EVALUATOR="evaluator",
    FORMATOR="formator",
}

export enum QCMType {
    BOOLEAN = "yesno",
    SINGLE = "single",
    MULTIPLE = "multiple"
}

export interface IHolyProject extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;

    planet: IPlanet | mongoose.Types.ObjectId;

    url: string;
    content: string;
    evaluationText: string | null;

    evaluationType: EvaluationType;
    evaluatorType: EvaluatorType;

    uploadFilesDescription: string | null;
    uploadFilesCount: number | null;

    qcmContent: {
        question: string;
        type: QCMType;
        options: string[];
        correctAnswers: string[];
    }[];

    shareLinksDescription: string | null;
    shareLinksCount: string | null;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;
    cost: number;

    links: {
        url: string;
        name: string;
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
        default: null
    },
    cdnAudioContent: {
        type: String,
        required: false
    },
    links: [{
        url: {
            type: String,
            required: false,
            default: ""

        },
        name: {
            type: String,
            required: false,
            default: ""
        }
    }],
    cost: {
        type: Number,
        required: false,
        default: 10
    },
    evaluationType: {
        type: String,
        enum: Object.values(EvaluationType),
        default: EvaluationType.STANDARD
    },
    evaluatorType: {
        type: String,
        enum: Object.values(EvaluatorType),
        default: EvaluatorType.EVALUATOR
    },
    uploadFilesDescription: {
        type: String,
        required: false,
        default: null
    },
    uploadFilesCount: {
        type: Number,
        required: false,
        default: null
    },
    shareLinksDescription: {
        type: String,
        required: false,
        default: null
    },
    shareLinksCount: {
        type: Number,
        required: false,
        default: null
    },
    qcmContent: [{
        question: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: Object.values(QCMType),
            default: QCMType.SINGLE
        },
        options: {
            type: [String],
            required: true
        },
        correctAnswers: {
            type: [String],
            required: true
        }
    }],
    planet: {
        type: mongoose.Types.ObjectId,
        ref: 'Planet',
        required: false
    }

}, {
    timestamps: true
});

const HolyProject = mongoose.model<IHolyProject>('HolyProject', holyProjectSchema);

export default HolyProject;
