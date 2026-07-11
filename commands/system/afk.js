const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const afkRepository = require('../../repositories/afkRepository');

const formatAfkTime = (date, now = Date.now()) => {
  if (!date) return 'unknown time';
  const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

const buildAfkEmbed = ({ title, description, fields = [], variant = 'system' }) => createEmbed({
  title,
  description,
  fields,
  variant,
  thumbnail: icons.system,
  footer: 'Moonlight AFK',
});

const executeSet = async (interaction) => {
  const reason = interaction.options.getString('reason') || 'AFK';
  const afk = await afkRepository.set({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    reason,
  });

  await interaction.reply({
    embeds: [buildAfkEmbed({
      title: 'AFK Enabled',
      description: 'Moonlight will let people know when they mention you.',
      fields: [
        { name: 'Reason', value: afk.reason, inline: false },
      ],
    })],
    flags: MessageFlags.Ephemeral,
  });
};

const executeClear = async (interaction) => {
  const afk = await afkRepository.remove({
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  await interaction.reply({
    embeds: [buildAfkEmbed(afk
      ? {
        title: 'AFK Cleared',
        description: 'Welcome back. Your AFK status is now off.',
      }
      : {
        title: 'You Were Not AFK',
        description: 'There was no AFK status to clear.',
        variant: 'warning',
      })],
    flags: MessageFlags.Ephemeral,
  });
};

const executeStatus = async (interaction) => {
  const user = interaction.options.getUser('user') || interaction.user;
  const afk = await afkRepository.find({ guildId: interaction.guildId, userId: user.id });

  await interaction.reply({
    embeds: [buildAfkEmbed(afk
      ? {
        title: `${user.username} is AFK`,
        description: afk.reason,
        fields: [
          { name: 'Since', value: formatAfkTime(afk.createdAt), inline: true },
        ],
      }
      : {
        title: `${user.username} is not AFK`,
        description: 'No active AFK status found.',
        variant: 'warning',
      })],
    flags: MessageFlags.Ephemeral,
  });
};

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'set') return executeSet(interaction);
  if (subcommand === 'clear') return executeClear(interaction);
  if (subcommand === 'status') return executeStatus(interaction);

  return interaction.reply({
    embeds: [buildAfkEmbed({
      title: 'Unknown AFK Action',
      description: 'That AFK action is not supported yet.',
      variant: 'error',
    })],
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  category: 'system',
  label: 'AFK',

  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set or check AFK status')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Set yourself as AFK')
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Why you are AFK')
            .setMaxLength(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('clear')
        .setDescription('Clear your AFK status')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Check AFK status')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('User to check')
        )
    ),

  execute,

  _private: {
    buildAfkEmbed,
    formatAfkTime,
  },
};
