import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import axios from 'axios';
import { config } from "dotenv";
config();

export const meCommand = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Permet de récupérer les informations de votre profil depuis le site de formation !'),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            let authorID = interaction.user.id;
            const response = await axios.get(`${process.env.API_URL}/discord/user/459094461276880897`, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            });
            await interaction.reply({ content: `Réponse de mdr.com: ${response.data}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            // @ts-ignore
            await interaction.reply({ content: `Erreur lors de la requête : ${error.message}`, ephemeral: true });
        }
    }
};
