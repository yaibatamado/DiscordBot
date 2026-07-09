require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const { clientId } = require('./config/app');

const commands = [];

const folders = fs.readdirSync('./commands');

for (const folder of folders) {
  const files = fs.readdirSync(`./commands/${folder}`).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const command = require(`./commands/${folder}/${file}`);

    if (command.data && command.data.toJSON) {
      commands.push(command.data.toJSON());
    }
  }
}

(async () => {
  try {
    const applicationId = process.env.CLIENT_ID || clientId;

    if (!process.env.TOKEN || !applicationId) {
      throw new Error('Missing required env: TOKEN and application client id');
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    console.log(`Deploying ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationCommands(applicationId),
      { body: commands }
    );

    console.log('Deploy done.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
