import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    Client,
    ButtonBuilder, ButtonInteraction
} from 'discord.js';
import axios from 'axios';
import { config } from "dotenv";
import * as process from "node:process";
import {IHolyProject} from "../../model/learning/HolyProject.js";
import {IEvaluation} from "../../model/learning/Evaluation";
import {IUser} from "../../model/User";
config();

export const EvaluationButton = {
    async execute(interaction: ButtonInteraction, client: Client) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith("eval-")) return;

        const itemId = interaction.customId.replace("eval-", "");
        console.log(`Claim evaluation for ${itemId} (${interaction.user.id})`);
        try {
            axios.post(`${process.env.API_URL}/evaluation/claim/${itemId}`, {
                discordId: interaction.user.id
            }, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            }).then(async response => {
               if (response.data?.success) {
                   console.log("PLEASE WORKZ");

                   let evaluation = response.data?.data.evaluation as IEvaluation;
                   let project = evaluation.project as IHolyProject;
                   const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID as string);
                   let user = interaction.user;
                   let supportRole = ["1018989669393899610", "1098544186015367198"];
                   let permissionOverwrites = [];
                   const student = evaluation.user as IUser;
                   console.log(JSON.stringify(response.data));

                   if (!guild) {
                       return interaction.reply({ content: "❌ Erreur de configuration, veuillez contacter un administrateur !", ephemeral: true });
                   }
                   console.log("PLEASE WORKS");

                   supportRole.forEach(role => {
                       permissionOverwrites.push({
                           id: role,
                           allow: [PermissionFlagsBits.Administrator]
                       });
                   })
                   permissionOverwrites.push({
                          id: guild.roles.everyone.id,
                          deny: [PermissionFlagsBits.ViewChannel]
                   });
                   permissionOverwrites.push({
                       id: user.id,
                       allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                   });
                   if (student?.discordId) {
                       permissionOverwrites.push({
                           id: student.discordId,
                           allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                       });
                   }
                   const channelName = `${user.username}-${project.name}`;

                   const newChannel = await guild.channels.create({
                       name: channelName,
                       type: 0,
                       parent: process.env.DISCORD_EVALUATION_CATEGORY_ID,
                       permissionOverwrites: permissionOverwrites
                   });
                   console.log("PLEASE WORK", newChannel.id);

                   await axios.post(`${process.env.API_URL}/evaluation/channel/${itemId}`, {
                       channelId: newChannel.id
                   }, {
                       headers: {
                           'X-VK-TOKEN': process.env.API_KEY
                       }
                   }).catch(error => {
                       console.log(JSON.stringify(error));
                       return interaction.reply({ content: "❌ Erreur, " + error.response?.data?.data?.message || error.message, ephemeral: true });
                   }).then(async (response) => {
                       const evaluatorTag = interaction.user.tag;
                       const studentDiscordId = student.discordId;
                       const studentTag = studentDiscordId ? `<@${studentDiscordId}>` : "Non renseigné";
                       const projectName = project.name;
                       const xp = project.xp;
                       const evaluationText = project.evaluationText;
                       const uploadFiles = evaluation.uploadFiles || [];
                       const shareLinks = evaluation.shareLinks || [];

                       const embed = new EmbedBuilder()
                           .setTitle("📋 Nouvelle Évaluation")
                           .setColor(0x301934) // Violet foncé
                           .addFields(
                               {name: "🧑‍🏫 Évaluateur", value: evaluatorTag, inline: true},
                               {name: "👨‍🎓 Élève", value: studentTag, inline: true},
                               {name: "📘 Projet", value: projectName, inline: false},
                               {name: "✨ XP Gagnée", value: `${xp} XP`, inline: true},
                               {
                                   name: "🖋️ Lien d'évaluation",
                                   value: `🔗 ${process.env.FRONTEND_URL}/${evaluation._id}`,
                                   inline: false
                               },
                           );
                       if (evaluationText) {
                           embed.addFields({name: "📝 Commentaire", value: evaluationText, inline: false});
                       }
                       if (uploadFiles.length > 0) {
                           embed.addFields({
                               name: "📎 Fichiers Uploadés",
                               value: uploadFiles.map(f => `🔗 ${f}`).join('\n'),
                               inline: false
                           });
                       }
                       if (shareLinks.length > 0) {
                           embed.addFields({
                               name: "🌐 Liens Partagés",
                               value: shareLinks.map(l => `🔗 ${l}`).join('\n'),
                               inline: false
                           });
                       }
                       await newChannel.send({embeds: [embed]});
                       await interaction.message.delete();
                       return interaction.reply({content: "Evaluation claim avec succès !", ephemeral: true});
                   });


               }
            }).catch(error => {
                console.log(error);
                return interaction.reply({ content: "❌ Erreur, " + error.response?.data?.data?.message || error.message, ephemeral: true });
            })
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "❌ Erreur !", ephemeral: true });
        }
    }
};
