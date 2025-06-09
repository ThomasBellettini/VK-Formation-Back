import { ChatInputCommandInteraction, SlashCommandBuilder, User } from 'discord.js';
import axios from 'axios';
import { config } from 'dotenv';
config();

export const giveCommand = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Donne de l\'argent à un membre')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à qui donner l\'argent')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Montant à donner')
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const membre: User = interaction.options.getUser('membre', true);
        const amount = interaction.options.getInteger('amount', true);

        try {
            const response = await axios.post(`${process.env.API_URL}/discord/give`, {
                discordId: membre.id,
                number: amount
            }, {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            });

            if (response.status === 201) {
                return interaction.reply({
                    content: `✅ ${membre.username} a reçu ${amount} 💰 avec succès.`,
                    ephemeral: false
                });
            } else {
                return interaction.reply({
                    content: `❌ Erreur inattendue (code ${response.status}).`,
                    ephemeral: true
                });
            }
        } catch (error: any) {
            console.error(error);
            return interaction.reply({
                content: `❌ Erreur API : ${error?.response?.data?.message || error.message}`,
                ephemeral: true
            });
        }
    }
};
