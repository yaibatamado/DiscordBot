const { EmbedBuilder } = require('discord.js');
const { COLOR } = require('../config');

module.exports = (title, desc) => {
  return new EmbedBuilder()
    .setTitle(`${title}`)
    .setDescription(`🛰️ Đang truy xuất dữ liệu...\n\n${desc}`)
    .setColor(COLOR)
    .setFooter({ text: '⚙️ TACTICAL SYSTEM ACTIVE' });
};