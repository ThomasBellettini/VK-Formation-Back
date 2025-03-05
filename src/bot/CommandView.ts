import {ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, User, PermissionsBitField} from 'discord.js';
import axios from 'axios';
import { config } from "dotenv";
config();

export const viewCommand = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription('Permet de récupérer les informations de votre profil depuis le site de formation !')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addMentionableOption(option =>
            option.setName('user')
                .setDescription('Utilisateur que vous voulez inspecter')
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const mentionedUser = interaction.options.getMentionable('user') as User;
            if (!mentionedUser || !mentionedUser.id) {
                return await interaction.reply({ content: "❌ L'utilisateur mentionné est invalide.", ephemeral: true });
            }
            const userAvatar = mentionedUser.displayAvatarURL({ size: 256 });
            axios.get(`${process.env.API_URL}/discord/user/${mentionedUser.id}`, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            }).then(async response => {
                const userData = response.data?.data?.user;
                if (!userData) {
                    return await interaction.reply({ content: "Impossible de récupérer les données utilisateur.", ephemeral: true });
                }
                let { email, xp, coin, holyProjects, lessonsFinished } = userData;
                holyProjects = holyProjects.filter((project: any) => project.resultPercent >= 80);
                const embed = new EmbedBuilder()
                    .setColor("#6f3eda")
                    .setTitle(`📜 Informations du profil de ${mentionedUser.displayName}`)
                    .setThumbnail(userAvatar)
                    .addFields(
                        { name: `📧 Email:`, value: `${email || "Non renseigné"}`, inline: false },
                        { name: `🪙 Valek Coins`, value: `${coin.toFixed(2)} VK`, inline: false },
                        { name: `⭐ Experience`, value: `${xp} XP`, inline: false },
                        { name: `📌 Projets terminés`, value: `${holyProjects.length} projet(s) terminé(s)`, inline: false },
                        { name: `📚 Leçons terminées`, value: `${lessonsFinished.length} leçon(s) terminée(s)`, inline: false }
                    )
                    .setFooter({ text: "valekstudio.com" });
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }).catch(error => {
                return interaction.reply({ content: "❌ Erreur, " + error.response?.data?.data?.message || error.message, ephemeral: true });
            });
        } catch (error: any) {
            await interaction.reply({ content: "❌ Erreur de configuration", ephemeral: true });
        }
    }
};
