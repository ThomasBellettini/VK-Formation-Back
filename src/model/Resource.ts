import mongoose, {Document, Schema} from 'mongoose';

export interface IResource extends Document {
    _id: mongoose.Types.ObjectId;

    pathFile: string;
    video: boolean;

    originalName: string;
    duration: number | null;

    createdAt?: Date;
    updatedAt?: Date;
}



const resourceSchema: Schema<IResource> = new mongoose.Schema({
    pathFile: {
        type: String,
        required: true,
        unique: true
    },
    video: {
        type: Boolean,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: false
    }

}, {
    timestamps: true
});

const Resource = mongoose.model<IResource>('Resource', resourceSchema);

export default Resource;
