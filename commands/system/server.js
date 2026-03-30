const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'server',
  aliases: ['sv'],
  cooldown: 3,
  permission: 'everyone',

  category: 'system',
  label: '📊 Server Info',

  data: {
    title: 'SERVER INFO',
    description: '?server'
  },

  async execute(message) {

    const guild = message.guild;

    // ===== MEMBER =====
    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;

    // ===== CHANNEL =====
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;

    // ===== ROLE =====
    const roles = guild.roles.cache.size;

    // ===== EMOJI =====
    const emojis = guild.emojis.cache.size;

    // ===== OWNER =====
    const owner = await guild.fetchOwner();

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name}`)
      .setColor('#2c2f33')
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '🆔 Server ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: owner.user.tag, inline: true },

        { name: '👥 Members', value: `👤 ${humans} | 🤖 ${bots}`, inline: true },
        { name: '💬 Channels', value: `💬 ${textChannels} | 🔊 ${voiceChannels}`, inline: true },

        { name: '🎭 Roles', value: `${roles}`, inline: true },
        { name: '😀 Emojis', value: `${emojis}`, inline: true },

        { name: '🚀 Boost', value: `Level ${guild.premiumTier}`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};