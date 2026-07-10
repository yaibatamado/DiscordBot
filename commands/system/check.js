const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const permissionChecks = [
  ['ViewChannel', PermissionFlagsBits.ViewChannel, 'Xem kênh'],
  ['SendMessages', PermissionFlagsBits.SendMessages, 'Gửi tin nhắn'],
  ['EmbedLinks', PermissionFlagsBits.EmbedLinks, 'Gửi embed'],
  ['ManageChannels', PermissionFlagsBits.ManageChannels, 'Quản lý kênh'],
  ['ManageMessages', PermissionFlagsBits.ManageMessages, 'Quản lý tin nhắn'],
  ['ManageRoles', PermissionFlagsBits.ManageRoles, 'Quản lý role/quyền phòng riêng'],
  ['MoveMembers', PermissionFlagsBits.MoveMembers, 'Di chuyển thành viên voice'],
  ['Connect', PermissionFlagsBits.Connect, 'Kết nối voice'],
  ['Speak', PermissionFlagsBits.Speak, 'Nói trong voice'],
];

const hasPermission = (permissions, bit) => {
  if (!permissions) return false;
  if (typeof permissions.has === 'function') return permissions.has(bit);
  if (Array.isArray(permissions)) return permissions.includes(bit);
  return false;
};

const buildPermissionReport = (member, channel) => {
  const guildPermissions = member?.permissions;
  const channelPermissions = channel?.permissionsFor?.(member) || guildPermissions;

  return permissionChecks.map(([key, bit, label]) => {
    const ok = hasPermission(channelPermissions, bit) || hasPermission(guildPermissions, bit);
    return {
      key,
      bit,
      label,
      ok,
    };
  });
};

const buildCheckEmbed = ({ guild, channel, report }) => {
  const missing = report.filter((item) => !item.ok);
  const ok = missing.length === 0;

  return createEmbed({
    title: ok ? '✅ Moonlight Permission Check' : '⚠️ Moonlight Permission Check',
    description: ok
      ? 'Bot có đủ các quyền quan trọng để chạy ổn trong server này.'
      : 'Bot đang thiếu một vài quyền. Hãy kiểm tra role của bot và quyền trong kênh.',
    variant: ok ? 'success' : 'warning',
    thumbnail: icons.system,
    fields: [
      {
        name: 'Server',
        value: guild?.name || 'Unknown server',
        inline: true,
      },
      {
        name: 'Channel',
        value: channel ? `<#${channel.id}>` : 'Unknown channel',
        inline: true,
      },
      {
        name: 'Kết quả',
        value: report.map((item) => `${item.ok ? '✅' : '❌'} ${item.label}`).join('\n'),
        inline: false,
      },
      {
        name: 'Gợi ý',
        value: ok
          ? 'Mọi thứ nhìn ổn. Nếu vẫn lỗi, hãy kiểm tra role hierarchy của bot.'
          : 'Mời bot bằng quyền Administrator hoặc cấp các quyền bị ❌ cho role của Moonlight.',
        inline: false,
      },
    ],
    footer: 'Moonlight Permission Check',
  });
};

const executeCheck = async (interaction) => {
  const member = interaction.guild?.members?.me;
  const report = buildPermissionReport(member, interaction.channel);

  return interaction.reply({
    embeds: [buildCheckEmbed({
      guild: interaction.guild,
      channel: interaction.channel,
      report,
    })],
  });
};

module.exports = {
  category: 'system',
  label: 'Check Permissions',

  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Kiểm tra quyền cần thiết của Moonlight trong server')
    .setDMPermission(false),

  execute: executeCheck,

  _private: {
    buildCheckEmbed,
    buildPermissionReport,
    hasPermission,
    permissionChecks,
  },
};
