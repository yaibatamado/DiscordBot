require('dotenv').config();

const { ActivityType, Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const { loadCommands } = require('./handlers/commandHandler');
const loadSlash = require('./handlers/slashLoader');
const { startAutomationScheduler } = require('./services/schedulerService');
const { startStatusFileWriter, startStatusServer } = require('./utils/statusServer');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.slashCommands = new Map();

loadCommands();
loadSlash(client);

const eventFiles = fs.readdirSync('./events');

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  event(client);
}

let statusServer;
let statusFileWriter;
let automationScheduler;

client.on('clientReady', () => {
  client.user.setPresence({
    activities: [{ name: '/help', type: ActivityType.Playing }],
    status: 'online',
  });

  if (!statusServer) {
    statusServer = startStatusServer(client);
  }

  if (!statusFileWriter) {
    statusFileWriter = startStatusFileWriter(client);
  }

  if (!automationScheduler) {
    automationScheduler = startAutomationScheduler(client);
  }

  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.login(process.env.TOKEN);
