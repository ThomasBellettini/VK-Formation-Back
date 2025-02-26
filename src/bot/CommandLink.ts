import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import axios from 'axios';
import { config } from "dotenv";
config();

export const linkCommand = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Permet de lier son compte à celui de la formation !')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Code de liaison, à récupérer sur la section profil du site de formation')
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const code = interaction.options.getString('code');
        try {
            const member = await interaction.guild?.members.fetch(interaction.user.id);
            const roleId = "1286734787377102888";
            axios.post(`${process.env.API_URL}/discord/link`, {
                discordId: interaction.user.id,
                code: code
            }, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            }).then(async response => {
                if (response.status === 201)
                    await member.roles.add(roleId);
                    await interaction.reply({ content: `Félicitation, vous venez de lier votre compte discord à votre compte de formation ayant pour email ${response.data.data.user.email}`, ephemeral: true });
                }).catch(error => {
                return interaction.reply({ content: "❌ Erreur, " + error.response.data.data.message, ephemeral: true });
            });
        } catch (error) {
            console.error(error);
            // @ts-ignore
            await interaction.reply({ content: `Erreur lors de la requête : ${error.message}`, ephemeral: true });
        }
    }
};
