import mongoose, {Document, Schema} from 'mongoose';

export interface IDiscordStats extends Document {
    _id: mongoose.Types.ObjectId;

    date: Date;

    totalMessages: number;
    totalVocal: number;
    totalNewMembers: number;

    createdAt?: Date;
    updatedAt?: Date;
}

const discordSchema: Schema<IDiscordStats> = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    totalMessages: {
        type: Number,
        required: true,
        default: 0
    },
    totalVocal: {
        type: Number,
        required: true,
        default: 0
    },
    totalNewMembers: {
        type: Number,
        required: true,
        default: 0
    }

}, {
    timestamps: true
});

const DiscordStats = mongoose.model<IDiscordStats>('DiscordStats', discordSchema);

export default DiscordStats;
