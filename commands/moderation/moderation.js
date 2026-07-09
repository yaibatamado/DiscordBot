const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const { createEmbed } = require('../../utils/uiEmbed');

const clearTimeChoices = [
  { name: 'Do Not Filter By Time', value: 'all' },
  { name: 'Last 1 Hour', value: '1h' },
  { name: 'Last 6 Hours', value: '6h' },
  { name: 'Last 12 Hours', value: '12h' },
  { name: 'Last 24 Hours', value: '24h' },
  { name: 'Last 3 Days', value: '3d' },
  { name: 'Last 7 Days', value: '7d' },
];

const clearTimeMs = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const bulkDeleteLimitMs = 14 * 24 * 60 * 60 * 1000;

const modEmbed = ({ title, description, variant = 'moderation', fields = [] }) => createEmbed({
  title,
  description,
  variant,
  fields,
  footer: 'Moonlight Moderation',
});

const replyEmbed = (interaction, payload) => interaction.reply({
  embeds: [modEmbed(payload)],
  flags: payload.ephemeral ? MessageFlags.Ephemeral : undefined,
});

const editEmbed = (interaction, payload) => interaction.editReply({
  embeds: [modEmbed(payload)],
});

const hasPermission = (interaction, permission) => interaction.member.permissions.has(permission);

const fetchTarget = async (interaction, user) => {
  try {
    return await interaction.guild.members.fetch(user.id);
  } catch (err) {
    await replyEmbed(interaction, {
      title: '❌ Member Not Found',
      description: `Could not find ${user ? `<@${user.id}>` : 'that member'} in this server.`,
      variant: 'error',
      ephemeral: true,
    });
    return null;
  }
};

const executeClear = async (interaction) => {
  if (!hasPermission(interaction, PermissionFlagsBits.ManageMessages)) {
    return replyEmbed(interaction, {
      title: '❌ Missing Permission',
      description: 'You need **Manage Messages** to clear messages.',
      variant: 'error',
      ephemeral: true,
    });
  }

  const amountLimit = interaction.options.getInteger('amount');
  const user = interaction.options.getUser('user');
  const userId = user?.id || interaction.options.getString('userid');
  const time = interaction.options.getString('time') || 'all';
  const now = Date.now();
  const bulkDeleteCutoff = now - bulkDeleteLimitMs;
  const timeCutoff = clearTimeMs[time] ? now - clearTimeMs[time] : null;
  const cutoff = Math.max(timeCutoff || 0, bulkDeleteCutoff);
  let before;
  let deletedCount = 0;
  let scannedCount = 0;
  let shouldContinue = true;

  if (interaction.deferReply) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  while (shouldContinue) {
    const remaining = amountLimit ? amountLimit - deletedCount : 100;
    if (remaining <= 0) break;

    const fetched = await interaction.channel.messages.fetch({
      limit: Math.min(100, remaining || 100),
      ...(before ? { before } : {}),
    });

    if (fetched.size === 0) break;

    const pageMessages = Array.from(fetched.values());
    scannedCount += pageMessages.length;
    before = pageMessages[pageMessages.length - 1].id;

    const messages = pageMessages.filter((message) => {
      const matchesUser = !userId || message.author?.id === userId;
      const matchesTime = message.createdTimestamp >= cutoff;

      return matchesUser && matchesTime;
    });

    const tooOld = pageMessages.some((message) => message.createdTimestamp < cutoff);

    if (messages.length > 0) {
      const deleted = await interaction.channel.bulkDelete(messages, true);
      deletedCount += deleted.size ?? messages.length;
    }

    shouldContinue = !tooOld && fetched.size === 100 && (!amountLimit || deletedCount < amountLimit);
  }

  const payload = deletedCount === 0
    ? {
      title: '❌ No Messages Deleted',
      description: 'No matching messages were found within the deletable range.',
      variant: 'warning',
    }
    : {
      title: '✅ Messages Cleared',
      description: `Deleted **${deletedCount}** message(s).`,
      fields: [
        { name: 'Target', value: userId ? `<@${userId}>` : 'Any user', inline: true },
        { name: 'Time Filter', value: time, inline: true },
        { name: 'Scanned', value: String(scannedCount), inline: true },
      ],
    };

  if (interaction.editReply) {
    return editEmbed(interaction, payload);
  }

  return replyEmbed(interaction, { ...payload, ephemeral: true });
};

const executeModeration = async (interaction) => {
  const sub = interaction.options.getSubcommand();

  if (sub === 'clear') {
    return executeClear(interaction);
  }

  if (['slowmode', 'lockchannel', 'unlockchannel'].includes(sub)) {
    if (!hasPermission(interaction, PermissionFlagsBits.ManageChannels)) {
      return replyEmbed(interaction, {
        title: '❌ Missing Permission',
        description: 'You need **Manage Channels** to use this command.',
        variant: 'error',
        ephemeral: true,
      });
    }

    if (sub === 'slowmode') {
      const seconds = interaction.options.getInteger('seconds');
      const reason = interaction.options.getString('reason') || `Slowmode changed by ${interaction.user.tag}`;
      await interaction.channel.setRateLimitPerUser(seconds, reason);
      return replyEmbed(interaction, {
        title: seconds === 0 ? '✅ Slowmode Disabled' : '✅ Slowmode Updated',
        description: seconds === 0
          ? `Slowmode has been disabled in <#${interaction.channel.id}>.`
          : `Slowmode is now **${seconds} seconds** in <#${interaction.channel.id}>.`,
        fields: [{ name: 'Reason', value: reason }],
      });
    }

    const locked = sub === 'lockchannel';
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      SendMessages: locked ? false : null,
    });

    return replyEmbed(interaction, {
      title: locked ? '🔒 Channel Locked' : '🔓 Channel Unlocked',
      description: locked
        ? `<#${interaction.channel.id}> is now read-only for everyone.`
        : `<#${interaction.channel.id}> can be used by everyone again.`,
    });
  }

  if (!hasPermission(interaction, PermissionFlagsBits.ModerateMembers)) {
    return replyEmbed(interaction, {
      title: '❌ Missing Permission',
      description: 'You need **Moderate Members** to use this command.',
      variant: 'error',
      ephemeral: true,
    });
  }

  if (sub === 'kick') {
    const user = interaction.options.getUser('user');
    const target = await fetchTarget(interaction, user);
    if (!target) return null;

    await target.kick();
    return replyEmbed(interaction, {
      title: '👢 Member Kicked',
      description: `${user.tag} has been kicked.`,
      fields: [{ name: 'User', value: `<@${user.id}>`, inline: true }],
    });
  }

  if (sub === 'ban') {
    const user = interaction.options.getUser('user');

    await interaction.guild.members.ban(user.id);
    return replyEmbed(interaction, {
      title: '🔨 Member Banned',
      description: `${user.tag} has been banned.`,
      fields: [{ name: 'User ID', value: user.id, inline: true }],
    });
  }

  if (sub === 'unban') {
    const id = interaction.options.getString('userid');

    await interaction.guild.members.unban(id);
    return replyEmbed(interaction, {
      title: '🔓 User Unbanned',
      description: `User ID **${id}** has been unbanned.`,
    });
  }

  if (sub === 'timeout') {
    const user = interaction.options.getUser('user');
    const time = interaction.options.getInteger('time');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const target = await fetchTarget(interaction, user);
    if (!target) return null;

    await target.timeout(time * 60 * 1000, reason);
    return replyEmbed(interaction, {
      title: '⏳ Member Timed Out',
      description: `${user.tag} has been timed out for **${time} minute(s)**.`,
      fields: [
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: true },
      ],
    });
  }

  if (sub === 'untimeout') {
    const user = interaction.options.getUser('user');
    const target = await fetchTarget(interaction, user);
    if (!target) return null;

    await target.timeout(null);
    return replyEmbed(interaction, {
      title: '✅ Timeout Removed',
      description: `${user.tag} can speak again.`,
    });
  }

  if (sub === 'mute') {
    const user = interaction.options.getUser('user');
    const target = await fetchTarget(interaction, user);
    if (!target) return null;

    await target.timeout(10 * 60 * 1000, 'Quick mute');
    return replyEmbed(interaction, {
      title: '🔇 Member Muted',
      description: `${user.tag} has been muted for **10 minutes**.`,
    });
  }

  if (sub === 'unmute') {
    const user = interaction.options.getUser('user');
    const target = await fetchTarget(interaction, user);
    if (!target) return null;

    await target.timeout(null);
    return replyEmbed(interaction, {
      title: '🔊 Member Unmuted',
      description: `${user.tag} can speak again.`,
    });
  }

  return null;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation tools for this server')
    .addSubcommand((sub) =>
      sub.setName('kick')
        .setDescription('Kick a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member to kick').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('ban')
        .setDescription('Ban a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member to ban').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('unban')
        .setDescription('Unban by user ID')
        .addStringOption((opt) =>
          opt.setName('userid').setDescription('User ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member to timeout').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('time').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('mute')
        .setDescription('Quick mute a member for 10 minutes')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('unmute')
        .setDescription('Remove quick mute from a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Member').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('clear')
        .setDescription('Delete messages by user, ID, amount, or time range')
        .addIntegerOption((opt) =>
          opt.setName('amount')
            .setDescription('Maximum messages to delete; leave empty to delete as many as possible')
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(false))
        .addUserOption((opt) =>
          opt.setName('user')
            .setDescription('Only delete messages from this member')
            .setRequired(false))
        .addStringOption((opt) =>
          opt.setName('userid')
            .setDescription('Only delete messages from this user ID')
            .setRequired(false))
        .addStringOption((opt) =>
          opt.setName('time')
            .setDescription('Only delete messages in this time range')
            .setRequired(false)
            .addChoices(...clearTimeChoices))
    )
    .addSubcommand((sub) =>
      sub.setName('slowmode')
        .setDescription('Set slowmode for the current channel')
        .addIntegerOption((opt) =>
          opt.setName('seconds')
            .setDescription('Slowmode seconds, 0 disables it')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600))
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('lockchannel')
        .setDescription('Lock the current text channel')
    )
    .addSubcommand((sub) =>
      sub.setName('unlockchannel')
        .setDescription('Unlock the current text channel')
    )
    .setDMPermission(false),

  execute: executeModeration,

  _private: {
    buildModerationEmbed: modEmbed,
    clearTimeChoices,
    executeClear,
  },
};
