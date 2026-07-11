const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const mysteryBoxRepository = require('../../repositories/mysteryBoxRepository');
const {
  buildMysteryBoxEmbed,
  canSendInChannel,
  createBoxPayload,
  handleMysteryBoxClaim,
} = require('../../services/mysteryBoxService');

const buildSettingsEmbed = (settings) => createEmbed({
  title: 'Mystery Box Settings',
  description: settings?.enabled
    ? 'Mystery Box is enabled. Moonlight will drop a random box every 10 minutes in the configured channel.'
    : 'Mystery Box is disabled.',
  variant: settings?.enabled ? 'success' : 'warning',
  thumbnail: icons.system,
  fields: [
    { name: 'Channel', value: settings?.channelId ? `<#${settings.channelId}>` : 'Not set', inline: true },
    { name: 'Interval', value: 'Every 10 minutes', inline: true },
  ],
  footer: 'Moonlight Mystery Box',
});

const executeSetup = async (interaction) => {
  if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: 'You need Manage Server to change Mystery Box settings.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const enabled = interaction.options.getBoolean('enabled', true);
  const channel = interaction.options.getChannel('channel', true);

  if (!canSendInChannel(interaction.guild, channel)) {
    await interaction.reply({
      content: 'Moonlight needs View Channel, Send Messages, and Embed Links in that channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = await mysteryBoxRepository.setSettings({
    guildId: interaction.guildId,
    channelId: channel.id,
    enabled,
    updatedBy: interaction.user.id,
  });

  await interaction.reply({
    embeds: [buildSettingsEmbed(settings)],
    flags: MessageFlags.Ephemeral,
  });
};

const executeStatus = async (interaction) => {
  const settings = await mysteryBoxRepository.getSettings(interaction.guildId);
  await interaction.reply({
    embeds: [buildSettingsEmbed(settings)],
    flags: MessageFlags.Ephemeral,
  });
};

const executePreview = async (interaction) => {
  const payload = createBoxPayload();
  await interaction.reply({
    embeds: [buildMysteryBoxEmbed({
      id: 'preview',
      ...payload,
    })],
    flags: MessageFlags.Ephemeral,
  });
};

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') return executeSetup(interaction);
  if (subcommand === 'status') return executeStatus(interaction);
  if (subcommand === 'preview') return executePreview(interaction);

  return interaction.reply({
    content: 'Unknown mystery box action.',
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  category: 'system',
  label: 'Mystery Box',

  data: new SlashCommandBuilder()
    .setName('mysterybox')
    .setDescription('Setup automatic mystery boxes')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Enable or disable automatic mystery boxes')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel where Mystery Box should appear')
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Whether Mystery Box should auto-drop every 10 minutes')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('View Mystery Box settings')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('preview')
        .setDescription('Preview a random Mystery Box privately')
    ),

  execute,
  handleComponent: handleMysteryBoxClaim,

  _private: {
    buildSettingsEmbed,
  },
};
