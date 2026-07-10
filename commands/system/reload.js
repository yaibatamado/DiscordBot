const path = require('path');
const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');
const { loadCommands } = require('../../handlers/commandHandler');
const loadSlash = require('../../handlers/slashLoader');
const { assertOwner } = require('../../utils/ownerOnly');

const commandsRoot = path.join(__dirname, '..');

const clearCommandCache = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(commandsRoot)) {
      delete require.cache[key];
    }
  }
};

const clearSettingsCache = () => {
  const targets = [
    path.join(__dirname, '../../utils/guildSettings.js'),
    path.join(__dirname, 'settings.js'),
  ].map((target) => require.resolve(target));

  for (const target of targets) {
    delete require.cache[target];
  }
};

const execute = async (interaction) => {
  if (!(await assertOwner(interaction))) return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'command') {
    clearCommandCache();
    loadCommands();
    loadSlash(interaction.client);

    await interaction.reply({
      content: `Reloaded ${interaction.client.slashCommands.size} slash commands without restarting bot.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subcommand === 'settings') {
    dotenv.config({ override: true });
    clearSettingsCache();
    const settingsCommand = require('./settings');
    interaction.client.slashCommands.set(settingsCommand.data.name, settingsCommand);

    await interaction.reply({
      content: 'Reloaded .env and settings cache.',
      flags: MessageFlags.Ephemeral,
    });
  }
};

module.exports = {
  category: 'system',
  label: 'Reload',

  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Owner-only reload tools')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('command')
        .setDescription('Reload command modules without restarting the bot')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('settings')
        .setDescription('Reload .env and settings modules')
    ),

  execute,

  _private: {
    clearCommandCache,
    clearSettingsCache,
  },
};
