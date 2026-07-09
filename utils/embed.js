const { EmbedBuilder } = require('discord.js');
const { COLOR } = require('../config');
const { icons } = require('./uiEmbed');

module.exports = (title, desc) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(COLOR)
    .setThumbnail(icons.system)
    .setFooter({ text: 'Moonlight' });
};
