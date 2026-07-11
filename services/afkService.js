const { createEmbed, icons } = require('../utils/uiEmbed');
const afkRepository = require('../repositories/afkRepository');
const { _private: afkPrivate } = require('../commands/system/afk');

const buildMentionNoticeEmbed = (entries, guild) => createEmbed({
  title: 'AFK Notice',
  description: entries.length === 1
    ? 'This user is currently AFK.'
    : 'Some mentioned users are currently AFK.',
  variant: 'warning',
  thumbnail: icons.system,
  fields: entries.slice(0, 5).map((entry) => {
    const member = guild.members.cache.get(entry.userId);
    const name = member?.displayName || `User ${entry.userId}`;
    return {
      name,
      value: [
        entry.reason,
        `Since: **${afkPrivate.formatAfkTime(entry.createdAt)}**`,
      ].join('\n'),
      inline: false,
    };
  }),
  footer: 'Moonlight AFK',
});

const buildWelcomeBackEmbed = (afk) => createEmbed({
  title: 'Welcome Back',
  description: `Your AFK status has been cleared.\nReason was: ${afk.reason}`,
  variant: 'success',
  thumbnail: icons.system,
  footer: 'Moonlight AFK',
});

const handleAfkMessage = async (message) => {
  if (!message.guild || message.author.bot) return false;

  let sentNotice = false;
  const ownAfk = await afkRepository.remove({
    guildId: message.guild.id,
    userId: message.author.id,
  });

  if (ownAfk) {
    await message.reply({
      embeds: [buildWelcomeBackEmbed(ownAfk)],
      allowedMentions: { repliedUser: false },
    });
  }

  const mentionedIds = [...message.mentions.users.keys()]
    .filter((userId) => userId !== message.author.id);

  if (mentionedIds.length > 0) {
    const afkUsers = await afkRepository.findMany({
      guildId: message.guild.id,
      userIds: mentionedIds,
    });

    if (afkUsers.length > 0) {
      await message.reply({
        embeds: [buildMentionNoticeEmbed(afkUsers, message.guild)],
        allowedMentions: { repliedUser: false, parse: [] },
      });
      sentNotice = true;
    }
  }

  return sentNotice;
};

module.exports = {
  buildMentionNoticeEmbed,
  buildWelcomeBackEmbed,
  handleAfkMessage,
};
