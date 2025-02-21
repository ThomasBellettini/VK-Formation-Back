import mongoose, {Document, Schema} from 'mongoose';

export interface IDiscord extends Document {
    _id: mongoose.Types.ObjectId;

    shopItems: {
        name: string;
        cost: number;
    }[];

    createdAt?: Date;
    updatedAt?: Date;
}

const discordDataSchema: Schema<IDiscord> = new mongoose.Schema({
    shopItems: [{
        name: {
            type: String,
            required: true
        },
        cost: {
            type: Number,
            required: true
        }
    }]

}, {
    timestamps: true
});

const DiscordDataStats = mongoose.model<IDiscord>('Discord', discordDataSchema);

export default DiscordDataStats;

export const getOrCreateDiscordData = async (): Promise<IDiscord> => {
    let data = await DiscordDataStats.findOne();

    if (!data) {
        console.log("Aucun document trouvé, création d'un nouveau...");
        data = new DiscordDataStats({
            shopItems: []
        });
        await data.save();
    }

    return data;
};
