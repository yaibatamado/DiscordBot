const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/uiEmbed');

const formatCount = (value) => new Intl.NumberFormat('en-US').format(value ?? 0);

const buildServerEmbed = async (guild) => {
  const owner = await guild.fetchOwner();
  const totalMembers = guild.memberCount ?? guild.members.cache.size;
  const bots = guild.members.cache.filter((member) => member.user.bot).size;
  const humans = Math.max(totalMembers - bots, 0);
  const textChannels = guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice).size;
  const categories = guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildCategory).size;
  const roles = Math.max((guild.roles.cache.size ?? 1) - 1, 0);
  const emojis = guild.emojis.cache.size;
  const created = Math.floor(guild.createdTimestamp / 1000);
  const icon = guild.iconURL?.({ size: 256, extension: 'png' });

  return createEmbed({
    title: `📊 ${guild.name}`,
    description: 'A quick Moonlight snapshot of this server.',
    variant: 'system',
    thumbnail: icon || undefined,
    fields: [
      { name: 'Server ID', value: guild.id, inline: true },
      { name: 'Owner', value: `${owner.user.tag}\n<@${owner.id}>`, inline: true },
      { name: 'Created', value: `<t:${created}:D>\n<t:${created}:R>`, inline: true },
      { name: 'Members', value: `Total: **${formatCount(totalMembers)}**\nHumans: **${formatCount(humans)}**\nBots: **${formatCount(bots)}**`, inline: true },
      { name: 'Channels', value: `Text: **${formatCount(textChannels)}**\nVoice: **${formatCount(voiceChannels)}**\nCategories: **${formatCount(categories)}**`, inline: true },
      { name: 'Server Assets', value: `Roles: **${formatCount(roles)}**\nEmojis: **${formatCount(emojis)}**`, inline: true },
      { name: 'Boost', value: `Tier: **${guild.premiumTier ?? 0}**\nBoosts: **${formatCount(guild.premiumSubscriptionCount)}**`, inline: true },
      { name: 'Verification', value: `Level: **${guild.verificationLevel ?? 'Unknown'}**`, inline: true },
    ],
    footer: 'Moonlight Server Info',
  });
};

const executeServer = async (context) => {
  const embed = await buildServerEmbed(context.guild);
  return context.reply({ embeds: [embed] });
};

module.exports = {
  name: 'server',
  aliases: ['sv'],
  cooldown: 3,
  permission: 'everyone',
  category: 'system',
  label: '📊 Server Info',

  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Show detailed server information'),

  execute: executeServer,

  _private: {
    buildServerEmbed,
    formatCount,
  },
};
