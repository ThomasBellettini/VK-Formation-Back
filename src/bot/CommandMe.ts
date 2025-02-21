import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { config } from "dotenv";
config();

export const meCommand = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Permet de récupérer les informations de votre profil depuis le site de formation !'),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const userAvatar = interaction.user.displayAvatarURL({ size: 256 });
            const response = await axios.get(`${process.env.API_URL}/discord/user/${interaction.user.id}`, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            });

            const userData = response.data?.data?.user;
            if (!userData) {
                return await interaction.reply({ content: "Impossible de récupérer les données utilisateur.", ephemeral: true });
            }

            const { email, xp, coin, holyProjects, lessonsFinished } = userData;

            const embed = new EmbedBuilder()
                .setColor("#6f3eda")
                .setTitle("📜 Informations de ton profil")
                .setThumbnail(userAvatar)
                .addFields(
                    { name: "📧 Email", value: email || "Non renseigné", inline: false },
                    { name: "🪙 Coins", value: `${coin}`, inline: true },
                    { name: "⭐ XP", value: `${xp}`, inline: true },
                    { name: "📌 Projets", value: `${holyProjects.length}`, inline: true },
                    { name: "📚 Leçons terminées", value: `${lessonsFinished.length}`, inline: true }
                )
                .setFooter({ text: "Généré via la commande /me" });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error: any) {
            console.error(error);
            await interaction.reply({ content: "❌ Erreur, " + error.message, ephemeral: true });
        }
    }
};
