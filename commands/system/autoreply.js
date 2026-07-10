const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const autoReplyRepository = require('../../repositories/autoReplyRepository');
const { clearAutoReplyCache } = require('../../services/autoReplyService');

const matchModeChoices = [
  { name: 'Contains', value: 'contains' },
  { name: 'Exact', value: 'exact' },
  { name: 'Starts With', value: 'starts_with' },
];

const buildAutoReplyEmbed = ({ title, description, fields = [], variant = 'system' }) => createEmbed({
  title,
  description,
  fields,
  variant,
  thumbnail: icons.system,
  footer: 'Moonlight Autoreply',
});

const formatRule = (rule) => [
  `Trigger: \`${rule.trigger}\``,
  `Reply: ${rule.reply}`,
  `Channel: ${rule.channelId ? `<#${rule.channelId}>` : '**All channels**'}`,
  `Mode: \`${rule.matchMode}\``,
  `Status: **${rule.enabled ? 'Enabled' : 'Disabled'}**`,
].join('\n');

const reply = (interaction, payload) => interaction.reply({
  embeds: [buildAutoReplyEmbed(payload)],
  flags: MessageFlags.Ephemeral,
});

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (subcommand === 'add') {
    const trigger = interaction.options.getString('trigger', true);
    const response = interaction.options.getString('reply', true);
    const matchMode = interaction.options.getString('mode') || 'contains';
    const channel = interaction.options.getChannel('channel');

    try {
      const rule = await autoReplyRepository.add({
        guildId,
        trigger,
        reply: response,
        matchMode,
        channelId: channel?.id || null,
        createdBy: interaction.user.id,
      });
      clearAutoReplyCache(guildId);

      return reply(interaction, {
        title: 'Autoreply Created',
        description: 'Moonlight will now respond when this trigger is detected.',
        fields: [{ name: 'Rule', value: formatRule(rule) }],
      });
    } catch (error) {
      return reply(interaction, {
        title: 'Could Not Create Autoreply',
        description: error.code === 'DUPLICATE_AUTOREPLY'
          ? 'This trigger already exists in this server. Use `/autoreply edit` instead.'
          : error.message,
        variant: 'error',
      });
    }
  }

  if (subcommand === 'list') {
    const rules = await autoReplyRepository.list(guildId);
    if (rules.length === 0) {
      return reply(interaction, {
        title: 'No Autoreplies Yet',
        description: 'Create one with `/autoreply add trigger: reply:`.',
        variant: 'warning',
      });
    }

    return reply(interaction, {
      title: 'Autoreplies',
      description: `Found **${rules.length}** autoreply rule(s) in this server.`,
      fields: rules.slice(0, 10).map((rule) => ({
        name: `#${rule.id} - ${rule.enabled ? 'Enabled' : 'Disabled'}`,
        value: formatRule(rule),
        inline: false,
      })),
    });
  }

  if (subcommand === 'edit') {
    const trigger = interaction.options.getString('trigger', true);
    const response = interaction.options.getString('reply', true);
    const rule = await autoReplyRepository.updateReply({ guildId, trigger, reply: response });
    clearAutoReplyCache(guildId);

    return reply(interaction, rule
      ? {
        title: 'Autoreply Updated',
        description: 'The reply text has been updated. Use `||` between replies to let Moonlight pick one randomly.',
        fields: [{ name: 'Rule', value: formatRule(rule) }],
      }
      : {
        title: 'Autoreply Not Found',
        description: 'No autoreply with that trigger exists in this server.',
        variant: 'warning',
      });
  }

  if (subcommand === 'remove') {
    const trigger = interaction.options.getString('trigger', true);
    const rule = await autoReplyRepository.remove({ guildId, trigger });
    clearAutoReplyCache(guildId);

    return reply(interaction, rule
      ? {
        title: 'Autoreply Removed',
        description: `Removed trigger \`${rule.trigger}\`.`,
      }
      : {
        title: 'Autoreply Not Found',
        description: 'No autoreply with that trigger exists in this server.',
        variant: 'warning',
      });
  }

  if (subcommand === 'toggle') {
    const trigger = interaction.options.getString('trigger', true);
    const enabled = interaction.options.getBoolean('enabled', true);
    const rule = await autoReplyRepository.setEnabled({ guildId, trigger, enabled });
    clearAutoReplyCache(guildId);

    return reply(interaction, rule
      ? {
        title: enabled ? 'Autoreply Enabled' : 'Autoreply Disabled',
        description: `Trigger \`${rule.trigger}\` is now **${enabled ? 'enabled' : 'disabled'}**.`,
      }
      : {
        title: 'Autoreply Not Found',
        description: 'No autoreply with that trigger exists in this server.',
        variant: 'warning',
      });
  }

  if (subcommand === 'channel') {
    const trigger = interaction.options.getString('trigger', true);
    const channel = interaction.options.getChannel('channel');
    const rule = await autoReplyRepository.setChannel({
      guildId,
      trigger,
      channelId: channel?.id || null,
    });
    clearAutoReplyCache(guildId);

    return reply(interaction, rule
      ? {
        title: channel ? 'Autoreply Channel Set' : 'Autoreply Set To All Channels',
        description: channel
          ? `Trigger \`${rule.trigger}\` will only reply in ${channel}.`
          : `Trigger \`${rule.trigger}\` will reply in every channel.`,
        fields: [{ name: 'Rule', value: formatRule(rule) }],
      }
      : {
        title: 'Autoreply Not Found',
        description: 'No autoreply with that trigger exists in this server.',
        variant: 'warning',
      });
  }

  return reply(interaction, {
    title: 'Unknown Subcommand',
    description: 'That autoreply action is not supported yet.',
    variant: 'error',
  });
};

module.exports = {
  category: 'system',
  label: 'Autoreply',

  data: new SlashCommandBuilder()
    .setName('autoreply')
    .setDescription('Create automatic replies for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Create an autoreply')
        .addStringOption((option) =>
          option
            .setName('trigger')
            .setDescription('Word or phrase that triggers the reply')
            .setRequired(true)
            .setMaxLength(120)
        )
        .addStringOption((option) =>
          option
            .setName('reply')
            .setDescription('Reply text. Use || for random replies. Supports {user}, {username}, {server}, {channel}')
            .setRequired(true)
            .setMaxLength(1800)
        )
        .addStringOption((option) =>
          option
            .setName('mode')
            .setDescription('How Moonlight should match the trigger')
            .addChoices(...matchModeChoices)
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Only reply in this channel. Leave empty for every channel.')
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List autoreplies in this server')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('edit')
        .setDescription('Edit an autoreply response')
        .addStringOption((option) =>
          option
            .setName('trigger')
            .setDescription('Existing trigger')
            .setRequired(true)
            .setMaxLength(120)
        )
        .addStringOption((option) =>
          option
            .setName('reply')
            .setDescription('New reply text')
            .setRequired(true)
            .setMaxLength(1800)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove an autoreply')
        .addStringOption((option) =>
          option
            .setName('trigger')
            .setDescription('Existing trigger')
            .setRequired(true)
            .setMaxLength(120)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable an autoreply')
        .addStringOption((option) =>
          option
            .setName('trigger')
            .setDescription('Existing trigger')
            .setRequired(true)
            .setMaxLength(120)
        )
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Whether the autoreply is enabled')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Limit an autoreply to one channel, or clear the limit')
        .addStringOption((option) =>
          option
            .setName('trigger')
            .setDescription('Existing trigger')
            .setRequired(true)
            .setMaxLength(120)
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Target channel. Leave empty to allow every channel.')
        )
    ),

  execute,

  _private: {
    buildAutoReplyEmbed,
    formatRule,
  },
};
