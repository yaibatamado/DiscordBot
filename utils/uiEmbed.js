const { EmbedBuilder } = require('discord.js');
const { COLOR } = require('../config');

const colors = {
  default: COLOR,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
  moderation: 0x5865f2,
  system: 0x9b8cff,
};

const moonlightImage = 'https://raw.githubusercontent.com/yaibatamado/DiscordBot/main/assets/moonlight.jpg';

const icons = {
  system: moonlightImage,
  warning: moonlightImage,
};

const createEmbed = ({
  title,
  description,
  variant = 'default',
  thumbnail = icons.system,
  image,
  author,
  fields = [],
  footer = 'Moonlight',
}) => {
  const embed = new EmbedBuilder()
    .setColor(colors[variant] || colors.default)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: footer })
    .setTimestamp();

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);
  if (fields.length > 0) embed.addFields(fields);

  return embed;
};

module.exports = {
  colors,
  icons,
  createEmbed,
};
