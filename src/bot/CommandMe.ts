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
            axios.get(`${process.env.API_URL}/discord/user/${interaction.user.id}`, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            }).then(async response => {
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
                        { name: `📧 Email:`, value: `${email || "Non renseigné"}`, inline: false },
                        { name: `🪙 Valek Coins`, value: `${coin} VK`, inline: false },
                        { name: `⭐ Experience`, value: `${xp} XP`, inline: false },
                        { name: `📌 Projets terminés`, value: `${holyProjects.length} projet(s) terminé(s)`, inline: false },
                        { name: `📚 Leçons terminées`, value: `${lessonsFinished.length} leçon(s) terminée(s)`, inline: false }
                    )
                    .setFooter({ text: "Valek-Studio.fr" });
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }).catch(error => {
                return interaction.reply({ content: "❌ Erreur, " + error.response.data.data.message, ephemeral: true });
            })
        } catch (error: any) {
            await interaction.reply({ content: "❌ Erreur, De configuration", ephemeral: true });
        }
    }
};
