import {
    EmbedBuilder,
    PermissionFlagsBits,
    Client,
    ButtonInteraction,
    ChannelType,
    TextChannel,
    ThreadAutoArchiveDuration,
} from "discord.js";
import axios from "axios";
import { config } from "dotenv";
import * as process from "node:process";
import { IHolyProject } from "../../model/learning/HolyProject.js";
import { IEvaluation } from "../../model/learning/Evaluation";
import { IUser } from "../../model/User";
config();

let globalEvaluationCooldown = 0;

export const EvaluationButton = {
    async execute(interaction: ButtonInteraction, client: Client) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith("eval-")) return;

        const now = Date.now();
        const remaining = globalEvaluationCooldown - now;
        if (remaining > 0) {
            return interaction.reply({
                content: `⏳ Merci de patienter encore **${(remaining / 1000).toFixed(
                    1
                )}s** avant de pouvoir réclamer une évaluation.`,
                ephemeral: true,
            });
        }
        globalEvaluationCooldown = now + 5000;

        const itemId = interaction.customId.replace("eval-", "");

        try {
            await axios
                .post(
                    `${process.env.API_URL}/evaluation/claim/${itemId}`,
                    { discordId: interaction.user.id },
                    { headers: { "X-VK-TOKEN": process.env.API_KEY } }
                )
                .then(async (response) => {
                    if (!response.data?.success) return;

                    const evaluation = response.data?.data.evaluation as IEvaluation;
                    const project = evaluation.project as IHolyProject;
                    const student = evaluation.user as IUser;

                    const parent = await client.channels.fetch("1450927089460187166");
                    if (!parent || parent.type !== ChannelType.GuildText) {
                        return interaction.reply({
                            content: "❌ Le salon d’évaluations est introuvable ou invalide.",
                            ephemeral: true,
                        });
                    }

                    const guild =
                        client.guilds.cache.get(process.env.DISCORD_GUILD_ID as string) ??
                        parent.guild;

                    if (!guild) {
                        return interaction.reply({
                            content:
                                "❌ Erreur de configuration, veuillez contacter un administrateur !",
                            ephemeral: true,
                        });
                    }

                    const threadName = `${student.email.replace("@", "|")}-${project.name}`.slice(
                        0,
                        95
                    );

                    const thread = await (parent as TextChannel).threads.create({
                        name: threadName,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                        reason: `Evaluation claim ${evaluation._id}`,
                        type: ChannelType.PrivateThread,
                        invitable: false
                    });

                    // Ajoute les membres au thread (discret)
                    await thread.members.add(interaction.user.id).catch(() => {});
                    if (student?.discordId) {
                        await thread.members.add(student.discordId).catch(() => {});
                    }

                    await axios
                        .post(
                            `${process.env.API_URL}/evaluation/channel/${itemId}`,
                            { channelId: thread.id },
                            { headers: { "X-VK-TOKEN": process.env.API_KEY } }
                        )
                        .catch((error) => {
                            console.log(JSON.stringify(error));
                            return interaction.reply({
                                content:
                                    "❌ Erreur, " +
                                    (error.response?.data?.data?.message || error.message),
                                ephemeral: true,
                            });
                        });

                    const studentDiscordId = student?.discordId;
                    const studentTag = studentDiscordId
                        ? `<@${studentDiscordId}>`
                        : "Non renseigné";

                    const uploadFiles = evaluation.uploadFiles || [];
                    const shareLinks = evaluation.shareLinks || [];

                    const embed = new EmbedBuilder()
                        .setTitle("📋 Nouvelle Évaluation")
                        .setColor(0x301934)
                        .addFields(
                            { name: "🧑‍🏫 Évaluateur", value: interaction.user.tag, inline: true },
                            { name: "👨‍🎓 Élève", value: studentTag, inline: true },
                            { name: "📘 Projet", value: project.name, inline: false },
                            {
                                name: "🖋️ Lien d'évaluation (Concerne le formateur)",
                                value: `🔗 ${process.env.FRONTEND_URL}/${evaluation._id}`,
                                inline: false,
                            }
                        );

                    if (uploadFiles.length > 0) {
                        embed.addFields({
                            name: "📎 Fichiers Uploadés",
                            value: uploadFiles.map((f) => `🔗 ${f}`).join("\n").slice(0, 1024),
                            inline: false,
                        });
                    }
                    if (shareLinks.length > 0) {
                        embed.addFields({
                            name: "🌐 Liens Partagés",
                            value: shareLinks.map((l) => `🔗 ${l}`).join("\n").slice(0, 1024),
                            inline: false,
                        });
                    }

                    await thread.send({
                        embeds: [embed],
                        allowedMentions: { parse: [] }, // pas de ping
                    });

                    if (studentDiscordId) {
                        await thread.send({
                            content: `||<@${studentDiscordId}>||`,
                            allowedMentions: { parse: [] },
                        });
                    }

                    await interaction.message.delete().catch(() => {});
                    return interaction.reply({
                        content: "✅ Evaluation claim avec succès !",
                        ephemeral: true,
                    });
                })
                .catch((error) => {
                    console.log(error);
                    return interaction.reply({
                        content:
                            "❌ Erreur, " +
                            (error.response?.data?.data?.message || error.message),
                        ephemeral: true,
                    });
                });
        } catch (error) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                return interaction.followUp({ content: "❌ Erreur !", ephemeral: true });
            }
            return interaction.reply({ content: "❌ Erreur !", ephemeral: true });
        }
    },
};
