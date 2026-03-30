require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const { loadCommands } = require('./handlers/commandHandler');
const loadSlash = require('./handlers/slashLoader');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.slashCommands = new Map();

// 🔥 LOAD COMMAND
loadCommands();
loadSlash(client);

// LOAD EVENTS
const eventFiles = fs.readdirSync('./events');

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  event(client);
}

client.on('clientReady', () => {
  console.log(`📡 BOT ONLINE: ${client.user.tag}`);
});

client.login(process.env.TOKEN);