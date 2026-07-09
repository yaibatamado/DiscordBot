const { EmbedBuilder } = require('discord.js');
const { COLOR } = require('../config');

module.exports = (title, desc) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(COLOR)
    .setFooter({ text: 'Moonlight' });
};
