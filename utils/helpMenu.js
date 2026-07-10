const { createEmbed, icons } = require('./uiEmbed');

const sections = [
  {
    name: 'System',
    commands: [
      ['?help', 'Hiển thị bảng hướng dẫn này'],
      ['/help', 'Hiển thị bảng hướng dẫn bằng slash command'],
      ['/moonlight', 'Xem thông tin giới thiệu Moonlight'],
      ['/check', 'Kiểm tra quyền cần thiết của bot trong server'],
      ['/settings view', 'Xem thiết lập Moonlight của server'],
      ['/settings voice-log <enabled>', 'Bật hoặc tắt thông báo join/leave voice'],
      ['?av [@user]', 'Xem avatar của bạn hoặc người được tag'],
      ['/avatar [user]', 'Xem avatar bằng slash command'],
      ['?server', 'Xem thông tin server hiện tại'],
      ['/server', 'Xem thông tin server bằng slash command'],
      ['/dbstatus', 'Kiểm tra kết nối SQL Server'],
    ],
  },
  {
    name: 'Music',
    commands: [
      ['/music', 'Xem hướng dẫn dùng Jookie Music'],
      ['/join', 'Cho bot vào treo trong kênh voice của bạn'],
      ['/leave', 'Cho bot rời kênh voice'],
    ],
  },
  {
    name: 'Moderation',
    commands: [
      ['/mod kick <user>', 'Kick thành viên khỏi server'],
      ['/mod clear [amount] [user/userid] [time]', 'Xóa tối đa tin nhắn có thể xóa theo user hoặc user ID'],
      ['/mod slowmode <seconds>', 'Đặt slowmode cho kênh hiện tại'],
      ['/mod lockchannel', 'Khóa chat kênh hiện tại'],
      ['/mod unlockchannel', 'Mở khóa chat kênh hiện tại'],
      ['/mod ban <user>', 'Ban thành viên khỏi server'],
      ['/mod unban <userid>', 'Gỡ ban bằng user ID'],
      ['/mod timeout <user> <time> [reason]', 'Timeout thành viên theo số phút kèm lý do'],
      ['/mod untimeout <user>', 'Gỡ timeout cho thành viên'],
      ['/warn <user> <reason>', 'Cảnh cáo tạm thời, không lưu database'],
    ],
  },
  {
    name: 'Setup',
    commands: [
      ['/setup voice', 'Gửi panel quản lý phòng voice riêng'],
      ['/setup channel', 'Gửi panel tạo kênh text riêng'],
    ],
  },
];

const formatCommands = (commands) => (
  commands.map(([usage, description]) => `\`${usage}\`: ${description}`).join('\n')
);

const buildHelpEmbed = (user) => {
  const helpEmbed = createEmbed({
    title: 'Moonlight Help!',
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
