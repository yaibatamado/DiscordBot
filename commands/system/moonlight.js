const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const { clientId } = require('../../config/app');
const packageJson = require('../../package.json');

const formatUptime = (uptimeMs = 0) => {
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    `${minutes}m`,
  ].filter(Boolean).join(' ');
};

const buildInviteUrl = () => {
  const permissions = '8';
  const scopes = encodeURIComponent('bot applications.commands');
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
};

const buildMoonlightEmbed = (client) => createEmbed({
  title: 'Moonlight',
  description: [
    'Một bot nhỏ đi cùng server dưới ánh trăng: gọn, rõ, có quản trị, voice tools và hệ pet đang lớn dần.',
    '',
    'Dùng `/help` để mở toàn bộ lệnh hiện có.',
  ].join('\n'),
  variant: 'system',
  thumbnail: icons.system,
  fields: [
    { name: 'Bot', value: client.user?.tag || 'Moonlight', inline: true },
    { name: 'Version', value: packageJson.version || '1.0.0', inline: true },
    { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
    { name: 'Servers', value: String(client.guilds?.cache?.size ?? 0), inline: true },
    { name: 'Main Commands', value: '`/help` `/pet` `/setup` `/mod` `/server`', inline: false },
    { name: 'Invite', value: `[Invite Moonlight](${buildInviteUrl()})`, inline: false },
  ],
  footer: 'Moonlight System',
});

module.exports = {
  category: 'system',
  label: 'Moonlight',

  data: new SlashCommandBuilder()
    .setName('moonlight')
    .setDescription('Xem thông tin giới thiệu Moonlight'),

  async execute(interaction) {
    return interaction.reply({
      embeds: [buildMoonlightEmbed(interaction.client)],
    });
  },

  _private: {
    buildInviteUrl,
    buildMoonlightEmbed,
    formatUptime,
  },
};
