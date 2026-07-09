const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/uiEmbed');

const buildMusicEmbed = () => createEmbed({
  title: 'Moonlight Music',
  description: [
    'Moonlight hiện dùng Jookie Music làm trình phát nhạc.',
    '',
    'Dùng các lệnh `m!` trong kênh chat để điều khiển nhạc.',
  ].join('\n'),
  variant: 'system',
  fields: [
    { name: 'Phát nhạc', value: '`m!play <url/tên>`\n`m!skip`\n`m!stop`', inline: true },
    { name: 'Hàng chờ', value: '`m!queue`\n`m!clear`\n`m!shuffle`', inline: true },
    { name: 'Lặp nhạc', value: '`m!loop`\n`m!repeat queue`', inline: true },
  ],
  footer: 'Moonlight Music',
});

module.exports = {
  category: 'music',
  label: 'Music',

  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Xem hướng dẫn dùng Jookie Music'),

  async execute(interaction) {
    return interaction.reply({ embeds: [buildMusicEmbed()] });
  },

  _private: {
    buildMusicEmbed,
  },
};
