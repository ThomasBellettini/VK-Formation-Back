import {ChatInputCommandInteraction, Client, GatewayIntentBits, REST, Routes} from 'discord.js';
import express from 'express';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { linkCommand } from './bot/CommandLink.js';
import { meCommand } from './bot/CommandMe.js';
import { viewCommand } from './bot/CommandView.js';
import {buttonHandler, shopCommand} from './bot/CommandShop.js';
import { config } from "dotenv";
config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATA_FILE = path.join('./data/data.json');
const PORT = 3010;
const API_URL = process.env.API_URL;

let REGEX_CACHE: string[] = [];

let cachedEvents: { title: string; description: string; dates: (string | undefined)[]; }[] = [];
let cachedMessages: { author: string; authorImage: string; date: string; content: string; }[] = [];

async function formatDiscordMessage(content: string, guild: any): Promise<string> {
    const userMentions = content.match(/<@!?(\d+)>/g) || [];
    for (const mention of userMentions) {
        const userId = mention.replace(/[<@!>]/g, '');
        try {
            const user = guild.members.cache.get(userId) || await guild.members.fetch(userId);
            if (user) content = content.replace(mention, `@${user.user.username}`);
        } catch {
        }
    }

    const roleMentions = content.match(/<@&(\d+)>/g) || [];
    for (const mention of roleMentions) {
        const roleId = mention.replace(/[<@&>]/g, '');
        const role = guild.roles.cache.get(roleId);
        if (role) content = content.replace(mention, `@${role.name}`);
    }

    const channelMentions = content.match(/<#(\d+)>/g) || [];
    for (const mention of channelMentions) {
        const channelId = mention.replace(/[<#>]/g, '');
        const channel = guild.channels.cache.get(channelId);
        if (channel) content = content.replace(mention, `#${channel.name}`);
    }

    content = content.replace(/<a?:\w+:\d+>/g, '');

    content = content.replace(/(\*{1,3}|_{1,3}|~{2,})/g, '');

    return content.trim();
}

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

let dataTracking = new Map<string, number>();
let globalDataTracking = new Map<string, number>();

if (fs.existsSync(DATA_FILE)) {
    dataTracking = new Map(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
}

setInterval(() => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(dataTracking.entries())));
}, 60 * 10 * 1000);

setInterval(async () => {
    const now = new Date();
    if (now.getHours() == 23) {
        try {
            await axios.post(`${API_URL}/discord/upload?full=true`, Object.fromEntries(dataTracking), {
                headers: {
                    'X-VK-TOKEN': process.env.API_KEY
                }
            });
            dataTracking.clear();
            if (fs.existsSync(DATA_FILE))
                fs.unlinkSync(DATA_FILE);
        } catch (err) {
            console.error('Erreur lors de l\'envoi des données :', err);
        }
    }

}, 60 * 60 * 1000);

setInterval(() => {
    const guild = client.guilds.cache.get(GUILD_ID as string);
    if (!guild) return;

    guild.channels.cache.forEach(channel => {
        if (channel.isVoiceBased()) {
            channel.members.forEach(member => {
                if (!member.voice.mute) {
                    let hasRole = member.roles.cache.has("1024829882569596959");
                    let actualPoint = dataTracking.get(member.id) || 0;
                    if (!hasRole && actualPoint < 18050)
                        dataTracking.set(member.id, (dataTracking.get(member.id) || 0) + 1);
                    else if (hasRole && actualPoint < 27075)
                        dataTracking.set(member.id, (dataTracking.get(member.id) || 0) + 1.5);
                    globalDataTracking.set("voice", (globalDataTracking.get("voice") || 0) + 1);
                }
            });
        }
    });
}, 1000);

client.on('messageCreate', async (message) => {
    if (!message.author.bot) {
        if (!message.member) return console.log('Member not found');
        globalDataTracking.set("messages", (globalDataTracking.get("messages") || 0) + 1);
        let member = message.member;
        let hasRole = member.roles.cache.has("1024829882569596959");
        let actualPoint = dataTracking.get(member.id) || 0;
        if (!hasRole && actualPoint < 18050)
            dataTracking.set(member.id, (dataTracking.get(member.id) || 0) + 1);
        else if (hasRole && actualPoint < 27075)
            dataTracking.set(member.id, (dataTracking.get(member.id) || 0) + 1.5);
    }


    if (REGEX_CACHE.length !== 0) {
        for (const pattern of REGEX_CACHE) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(message.content)) {
                console.log(`Message "${message.content}" match avec la regex : ${pattern}`);
                //TODO: Le role et le ping pour ban
                return;
            }
        }
    }
});

client.on('guildMemberAdd', () => {
    globalDataTracking.set("join", (globalDataTracking.get("join") || 0) + 1);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        const command = interaction.commandName;
        if (command === 'me') {
            await meCommand.execute(interaction as ChatInputCommandInteraction);
        } else if (command === 'link') {
            await linkCommand.execute(interaction as ChatInputCommandInteraction);
        } else if (command === 'shop') {
            await shopCommand.execute(interaction as ChatInputCommandInteraction);
        } else if (command === 'view') {
            await viewCommand.execute(interaction as ChatInputCommandInteraction);
        }
    } else if (interaction.isButton()) {
        await buttonHandler.execute(interaction, client);

    }



});

const updateEventsCache = async () => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID as string);
        const events = await guild.scheduledEvents.fetch();
        cachedEvents = events.map(event => ({
            title: event.name,
            description: event.description || 'Aucune description',
            dates: [...new Set([event.scheduledStartAt?.toISOString(), event.scheduledEndAt?.toISOString()].filter(Boolean))]
        }));
    } catch (err) {
        console.error('Erreur lors de la récupération des événements :', err);
    }
};

const updateMessagesCache = async () => {
    try {
        const guild = client.guilds.cache.get(GUILD_ID as string);
        if (!guild) return;

        const channel = guild.channels.cache.find(c => c.isTextBased() && c.id === process.env.DISCORD_ANNOUNCE_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) return;

        const messages = await channel.messages.fetch({ limit: 10 });
        const filteredMessages = messages.filter(msg => !msg.author.bot).first(3);
        cachedMessages = [];
        for (const msg of filteredMessages) {
            let content = await formatDiscordMessage(msg.content, guild);
            cachedMessages.push({
                author: msg.author.username,
                authorImage: msg.author.displayAvatarURL(),
                date: msg.createdAt.toISOString(),
                content: content
            })
        }
    } catch (err) {
        console.error('Erreur lors de la récupération des messages :', err);
    }
};

const uploadGlobalStat = async () => {
    try {
        await axios.post(`${API_URL}/discord/upload`, Object.fromEntries(globalDataTracking), {
            headers: {
                'X-VK-TOKEN': process.env.API_KEY
            }
        });
        globalDataTracking.clear();
    } catch (err) {
        console.error('Erreur lors de l\'envoi des données :', err);
    }
}

const cacheRegexBan = async () => {
    try {
        let response = await axios.get(`${API_URL}/discord/regex/list`, {
            headers: {
                'X-VK-TOKEN': process.env.API_KEY
            }
        });
        if (response.status === 201) {
            REGEX_CACHE = response.data.data.regex;
        }
    } catch (err) {
        console.error('Erreur lors de l\'envoi des données :', err);
    }
}



client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(TOKEN as string);
    await (async () => {
        try {
            await rest.put(Routes.applicationCommands(CLIENT_ID as string), {body: [linkCommand.data.toJSON(), meCommand.data.toJSON(), shopCommand.data.toJSON(), viewCommand.data.toJSON() ]});
        } catch (error) {
            console.error('Erreur lors du déploiement de la commande:', error);
        }

        const commands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID as string, GUILD_ID as string));
        // @ts-ignore
        for (const command of commands) {
            await rest.delete(`${Routes.applicationGuildCommands(CLIENT_ID as string, GUILD_ID as string)}/${command.id}`);
        }
    })();

    let refreshTime = 30 * 1000;
    await updateEventsCache();
    await updateMessagesCache();
    setInterval(cacheRegexBan, refreshTime);
    setInterval(updateEventsCache, refreshTime);
    setInterval(updateMessagesCache, refreshTime);
    setInterval(uploadGlobalStat, refreshTime);
});

app.get('/discord/schedule', async (req, res) => {
    res.json(cachedEvents);
});

app.get('/discord/messages', async (req, res) => {
    res.json(cachedMessages);
});

app.listen(PORT, () => console.log(`API launched on http://localhost:${PORT}`));

client.login(TOKEN);
