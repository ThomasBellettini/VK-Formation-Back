import mongoose, {Document, Schema} from 'mongoose';

export interface IActuality extends Document {
    _id: mongoose.Types.ObjectId;

    title: string;
    description: string;
    position: number;
    url: string;

    imageUrl: string[];

    createdAt?: Date;
    updatedAt?: Date;
}



const actualitySchema: Schema<IActuality> = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    position: {
        type: Number,
        required: false,
        unique: true
    },
    url: {
        type: String,
        required: false,
        trim: true
    },
    imageUrl: [{
        type: String,
        required: false
    }]

}, {
    timestamps: true
});

const Actuality = mongoose.model<IActuality>('Actuality', actualitySchema);

export default Actuality;
