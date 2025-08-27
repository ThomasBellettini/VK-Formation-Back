import mongoose, {Document, Schema} from 'mongoose';

export enum POSITION {
    RIGHT = "right",
    LEFT = "left"
}

export interface IActuality extends Document {
    _id: mongoose.Types.ObjectId;

    position: POSITION;
    order: number
    imageUrl: string;

    createdAt?: Date;
    updatedAt?: Date;
}



const actualitySchema: Schema<IActuality> = new mongoose.Schema({
    position: {
        type: String,
        enum: Object.values(POSITION),
        required: true,
        default: POSITION.LEFT
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    imageUrl: {
        type: String,
        required: true,
    }

}, {
    timestamps: true
});

const Actuality = mongoose.model<IActuality>('Actuality', actualitySchema);

export default Actuality;
