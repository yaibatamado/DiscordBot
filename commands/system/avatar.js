const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'av',
  aliases: ['avatar'],
  cooldown: 3,
  permission: 'everyone',

  category: 'system',
  label: '🖼️ Avatar',

  data: {
    title: 'AVATAR',
    description: '?av @user'
  },

  async execute(message) {

    // ===== LẤY USER =====
    const user =
      message.mentions.users.first() || message.author;

    // ===== AVATAR URL =====
    const avatar = user.displayAvatarURL({
      size: 1024,
      dynamic: true
    });

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Avatar của ${user.username}`)
      .setColor('#2c2f33')
      .setImage(avatar)
      .setDescription(`[🔗 Link avatar](${avatar})`)
      .setFooter({ text: `ID: ${user.id}` });

    message.reply({ embeds: [embed] });
  }
};