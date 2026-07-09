const { EmbedBuilder } = require('discord.js');
const { COLOR } = require('../config');

const colors = {
  default: COLOR,
  pet: 0xf7c948,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
  moderation: 0x5865f2,
  system: 0x9b8cff,
};

const icons = {
  petEgg: 'https://placehold.co/256x256/f7d774/2b2d31/png?text=%F0%9F%A5%9A',
  pet: 'https://placehold.co/900x500/3b2f4a/f7d774/png?text=Pet',
  system: 'https://placehold.co/256x256/9b8cff/ffffff/png?text=Moonlight',
  warning: 'https://placehold.co/256x256/fec84b/2b2d31/png?text=!',
};

const createEmbed = ({
  title,
  description,
  variant = 'default',
  thumbnail,
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
