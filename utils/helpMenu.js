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
      ['/autoreply', 'Tạo phản hồi tự động theo trigger, channel và nhiều câu trả lời random'],
      ['/anonymous <message>', 'Gửi tin nhắn anonymous tại kênh hiện tại'],
      ['/confession setup <channel>', 'Đặt kênh duy nhất nhận confession của server'],
      ['/confession send <message>', 'Gửi confession ẩn danh về kênh đã setup, có ID để mod xóa'],
      ['/afk set [reason]', 'Đặt trạng thái AFK, tự tắt khi bạn nhắn lại'],
      ['/letter', 'Public song letter: preview, like, search, browse phân trang, mine/edit/tag'],
      ['?av [@user]', 'Xem avatar của bạn hoặc người được tag'],
      ['/avatar [user]', 'Xem avatar bằng slash command'],
      ['?server', 'Xem thông tin server hiện tại'],
      ['/server', 'Xem thông tin server bằng slash command'],
      ['/dbstatus', 'Kiểm tra kết nối SQL Server'],
      ['/weather <location>', 'Xem thời tiết theo địa điểm'],
      ['/time <location>', 'Xem giờ hiện tại theo địa điểm'],
      ['/currency <amount> <from> <to>', 'Đổi tiền tệ theo tỉ giá mới nhất'],
      ['/holiday <country>', 'Xem ngày lễ theo quốc gia'],
      ['/space today/random', 'Xem ảnh vũ trụ hôm nay hoặc random từ NASA'],
      ['/mysterybox setup <channel> <enabled> [language]', 'Bật/tắt hộp bí ẩn và chọn ngôn ngữ hoạt động Anh/Việt'],
      ['/serverwrapped setup <channel> <enabled>', 'Bật/tắt tổng kết server tự gửi 0h thứ 2'],
      ['/reload command', 'Owner-only reload command không cần restart bot'],
      ['/reload settings', 'Owner-only reload .env và settings cache'],
      ['/restart', 'Owner-only restart bot qua PM2'],
      ['/shutdown', 'Owner-only tắt bot'],
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

const chunkCommands = (commands, maxLength = 1000) => {
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const command of commands) {
    const line = `\`${command[0]}\`: ${command[1]}`;
    const nextLength = currentLength + line.length + (current.length > 0 ? 1 : 0);

    if (current.length > 0 && nextLength > maxLength) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }

    current.push(command);
    currentLength += line.length + (current.length > 1 ? 1 : 0);
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};

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
    const chunks = chunkCommands(section.commands);
    chunks.forEach((commands, index) => {
      helpEmbed.addFields({
        name: chunks.length > 1 ? `${section.name} ${index + 1}/${chunks.length}` : section.name,
        value: formatCommands(commands),
      });
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
  chunkCommands,
  sections,
};
