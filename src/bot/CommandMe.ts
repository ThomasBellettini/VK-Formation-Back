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
                        { name: `📧 Email: ${email || "Non renseigné"}`, value: '** **', inline: false },
                        { name: `🪙 Coins: ${coin}`, value: `** **`, inline: false },
                        { name: `⭐ XP: ${xp}`, value: `** **`, inline: false },
                        { name: `📌 Projets: ${holyProjects.length}`, value: `** **`, inline: false },
                        { name: `📚 Leçons terminées: ${lessonsFinished.length}`, value: `** **`, inline: true }
                    )
                    .setFooter({ text: "Généré via la commande /me" });
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }).catch(error => {
                return interaction.reply({ content: "❌ Erreur, " + error.response.data.data.message, ephemeral: true });
            })
        } catch (error: any) {
            await interaction.reply({ content: "❌ Erreur, De configuration", ephemeral: true });
        }
    }
};
