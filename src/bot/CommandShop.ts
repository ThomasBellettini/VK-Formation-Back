import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder, ButtonInteraction
} from 'discord.js';
import axios from 'axios';
import { config } from "dotenv";
config();

interface Item {
    _id: string;
    name: string;
    cost: number;
}

export const shopCommand = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription("Permet d'acheter du contenu avec des valeks coins !"),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const userAvatar = interaction.user.displayAvatarURL({ size: 256 });

            const response = await axios.get(`${process.env.API_URL}/discord/items/list`, {
                headers: { 'X-VK-TOKEN': process.env.API_KEY }
            });

            const items = response.data?.data?.items;
            if (!items || items.length === 0) {
                return await interaction.reply({ content: "Impossible de récupérer les données du shop !", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛒 Boutique')
                .setDescription("Voici les articles disponibles à l'achat :")
                .setColor('#0099ff');

            let actionRows = [];
            let row = new ActionRowBuilder<ButtonBuilder>();

            items.forEach((item: Item, index: number) => {
                embed.addFields({ name: item.name, value: `💰 ${item.cost} VC`, inline: true });

                const button = new ButtonBuilder()
                    .setCustomId(`${item._id}`)
                    .setLabel(`Acheter ${item.name}`)
                    .setStyle(ButtonStyle.Primary);

                if (row.components.length < 5) {
                    row.addComponents(button);
                } else {
                    actionRows.push(row);
                    row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
                }
            });

            if (row.components.length > 0) {
                actionRows.push(row);
            }

            await interaction.reply({ embeds: [embed], components: actionRows, ephemeral: true });

        } catch (error) {
            await interaction.reply({ content: "❌ Erreur de configuration", ephemeral: true });
        }
    }
};

export const buttonHandler = {
    async execute(interaction: ButtonInteraction) {
        if (!interaction.isButton()) return;

        const itemId = interaction.customId;
        try {
            axios.post(`${process.env.API_URL}/discord/buy`, {
                itemId: itemId,
                discordId: interaction.user.id
            }, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            }).then(async response => {
               if (response.data?.success) {
                   return interaction.reply({ content: "✅ Achat effectué avec succès !", ephemeral: true });
               }
            }).catch(error => {
                return interaction.reply({ content: "❌ Erreur, " + error.response?.data?.data?.message || error.message, ephemeral: true });
            })
        } catch (error) {
            await interaction.reply({ content: "❌ Erreur lors de l'achat !", ephemeral: true });
        }
    }
};
