const { createEmbed, icons } = require('./uiEmbed');

const sections = [
  {
    name: 'System',
    commands: [
      ['?help', 'Hiển thị bảng hướng dẫn này'],
      ['/help', 'Hiển thị bảng hướng dẫn bằng slash command'],
      ['?av [@user]', 'Xem avatar của bạn hoặc người được tag'],
      ['/avatar [user]', 'Xem avatar bằng slash command'],
      ['/dbstatus', 'Kiểm tra kết nối SQL Server'],
      ['?server', 'Xem thông tin server hiện tại'],
    ],
  },
  {
    name: 'Game',
    commands: [
      ['?baucua / ?bc', 'Xem hướng dẫn chơi Bầu Cua'],
      ['?noitu / ?nt', 'Xem hướng dẫn chơi Nối Từ'],
      ['?vuatv / ?vtv', 'Xem hướng dẫn chơi Vua Tiếng Việt'],
      ['?xuxi / ?xx', 'Xem hướng dẫn chơi Xù Xì'],
      ['/pet', 'Mở giao diện pet chính để xem pet, túi đồ, phúc lợi và các nút thao tác'],
    ],
  },
  {
    name: 'Music',
    commands: [
      ['?nhac / ?nh', 'Xem hướng dẫn dùng Jookie Music'],
      ['/join', 'Cho bot vào treo trong kênh voice của bạn'],
      ['/leave', 'Cho bot rời kênh voice'],
    ],
  },
  {
    name: 'Moderation',
    commands: [
      ['/mod kick <user>', 'Kick thành viên khỏi server'],
      ['/mod clear [amount] [user/userid] [time]', 'Xóa tối đa tin nhắn có thể xóa theo user hoặc user ID'],
      ['/mod ban <user>', 'Ban thành viên khỏi server'],
      ['/mod unban <userid>', 'Gỡ ban bằng user ID'],
      ['/mod timeout <user> <time> [reason]', 'Timeout thành viên theo số phút kèm lý do'],
      ['/mod untimeout <user>', 'Gỡ timeout cho thành viên'],
      ['/mod mute <user>', 'Mute nhanh bằng timeout 10 phút'],
      ['/mod unmute <user>', 'Gỡ mute cho thành viên'],
      ['/warn <user> <reason>', 'Cảnh cáo tạm thời, không lưu database'],
    ],
  },
];

const formatCommands = (commands) => (
  commands.map(([usage, description]) => `\`${usage}\`: ${description}`).join('\n')
);

const buildHelpEmbed = (user) => {
  const helpEmbed = createEmbed({
    title: '🌙 Moonlight Help!',
    description: 'Danh sách lệnh hiện có của Moonlight.',
    variant: 'system',
    thumbnail: icons.system,
    footer: 'Dùng ? trước lệnh prefix hoặc / cho slash command',
  });

  if (user) {
    helpEmbed.setAuthor({
      name: user.username || user.tag || 'User',
      iconURL: user.displayAvatarURL ? user.displayAvatarURL({ size: 128 }) : undefined,
    });
  }

  sections.forEach((section) => {
    helpEmbed.addFields({
      name: section.name,
      value: formatCommands(section.commands),
    });
  });

  return helpEmbed;
};

const buildMainHelp = (_commands, user) => ({
  embeds: [buildHelpEmbed(user)],
});

module.exports = {
  buildHelpEmbed,
  buildMainHelp,
  sections,
};
