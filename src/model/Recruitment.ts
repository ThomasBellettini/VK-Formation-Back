import mongoose, {Document, Schema} from 'mongoose';

export interface IRecruitment extends Document {
    _id: mongoose.Types.ObjectId;

    budget: number;
    deliveryDate: Date;
    details: string;
    email: string;
    name: string;

    createdAt?: Date;
    updatedAt?: Date;
}

const recruitmentSchema: Schema<IRecruitment> = new mongoose.Schema({
    budget: {
        type: Number,
        required: false,
        default: -1
    },
    deliveryDate: {
        type: Date,
        required: false
    },
    details: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false,
        default: null
    },
    name: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Recruitment = mongoose.model<IRecruitment>('Recruitment', recruitmentSchema);

export default Recruitment;