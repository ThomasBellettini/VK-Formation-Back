import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { config } from "dotenv";
config();

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATA_FILE = path.join('./data.json');
const PORT = 3010;
const API_URL = process.env.API_URL;

let cachedEvents: { title: string; description: string; dates: (string | undefined)[]; }[] = [];
let cachedMessages: { author: string; authorImage: string; date: string; content: string; }[] = [];

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
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
            console.log(Object.fromEntries(dataTracking));
            await axios.post(`${API_URL}?full=true`, Object.fromEntries(dataTracking), {
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
                    dataTracking.set(member.id, (dataTracking.get(member.id) || 0) + 1);
                    globalDataTracking.set("voice", (globalDataTracking.get("voice") || 0) + 1);
                }
            });
        }
    });
}, 1000);

client.on('messageCreate', (message) => {
    if (!message.author.bot) {
        globalDataTracking.set("messages", (globalDataTracking.get("messages") || 0) + 1);
        dataTracking.set(message.author.id, (dataTracking.get(message.author.id) || 0) + 1);
    }
});

client.on('guildMemberAdd', () => {
    globalDataTracking.set("join", (globalDataTracking.get("join") || 0) + 1);
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
        cachedMessages = filteredMessages.map(msg => ({
            author: msg.author.username,
            authorImage: msg.author.displayAvatarURL(),
            date: msg.createdAt.toISOString(),
            content: msg.content
        }));
    } catch (err) {
        console.error('Erreur lors de la récupération des messages :', err);
    }
};

const uploadGlobalStat = async () => {
    try {
        await axios.post(`${API_URL}`, Object.fromEntries(globalDataTracking), {
            headers: {
                'X-VK-TOKEN': process.env.API_KEY
            }
        });
        globalDataTracking.clear();
    } catch (err) {
        console.error('Erreur lors de l\'envoi des données :', err);
    }
}

client.once('ready', async () => {
    let refreshTime = 30 * 1000;
    await updateEventsCache();
    await updateMessagesCache();
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
