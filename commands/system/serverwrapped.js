const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const serverWrappedRepository = require('../../repositories/serverWrappedRepository');
const { buildWrappedEmbed } = require('../../services/serverWrappedService');
const { getPreviousWeekRange } = require('../../utils/timeKeys');

const buildSettingsEmbed = (settings) => createEmbed({
  title: 'Server Wrapped Settings',
  description: settings?.enabled
    ? `Server Wrapped is enabled and will post every Monday 00:00 in <#${settings.channelId}>.`
    : 'Server Wrapped is disabled.',
  variant: settings?.enabled ? 'success' : 'warning',
  thumbnail: icons.system,
  fields: [
    { name: 'Schedule', value: 'Every Monday 00:00', inline: true },
    { name: 'Channel', value: settings?.channelId ? `<#${settings.channelId}>` : 'Not set', inline: true },
  ],
  footer: 'Moonlight Server Wrapped',
});

const executeSetup = async (interaction) => {
  if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: 'You need Manage Server to change Server Wrapped settings.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);
  const enabled = interaction.options.getBoolean('enabled', true);
  const settings = await serverWrappedRepository.setSettings({
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
  const settings = await serverWrappedRepository.getSettings(interaction.guildId);
  await interaction.reply({
    embeds: [buildSettingsEmbed(settings)],
    flags: MessageFlags.Ephemeral,
  });
};

const executePreview = async (interaction) => {
  const { startKey, endKey } = getPreviousWeekRange();
  const summary = await serverWrappedRepository.getSummary({
    guildId: interaction.guildId,
    startKey,
    endKey,
  });

  await interaction.reply({
    embeds: [buildWrappedEmbed({ guild: interaction.guild, summary, startKey, endKey })],
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
};

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') return executeSetup(interaction);
  if (subcommand === 'status') return executeStatus(interaction);
  if (subcommand === 'preview') return executePreview(interaction);

  return interaction.reply({
    content: 'Unknown server wrapped action.',
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  category: 'system',
  label: 'Server Wrapped',

  data: new SlashCommandBuilder()
    .setName('serverwrapped')
    .setDescription('Setup automatic weekly server wrapped recaps')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Enable or disable weekly Server Wrapped')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel where weekly recaps will be posted')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Whether Server Wrapped should post every Monday')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('View Server Wrapped settings')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('preview')
        .setDescription('Preview the current weekly recap privately')
    ),

  execute,

  _private: {
    buildSettingsEmbed,
  },
};
