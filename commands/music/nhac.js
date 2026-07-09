const embed = require('../../utils/embed');

module.exports = {
  name: 'nhac',
  aliases: ['nh'],
  cooldown: 5,
  permission: 'everyone',

  category: 'music',
  label: '🎵 Nhạc',

  data: {
    title: 'Hướng dẫn Jookie Music',
    description: [
      '`?nhac` hoặc `?nh`: mở hướng dẫn dùng Jookie Music.',
      '',
      'Lệnh phát nhạc:',
      '`m!play <url/tên>`: phát bài hát',
      '`m!skip`: bỏ qua bài hiện tại',
      '`m!stop`: dừng phát nhạc',
      '',
      'Hàng chờ:',
      '`m!queue`: xem hàng chờ',
      '`m!clear`: xóa hàng chờ',
      '`m!shuffle`: trộn hàng chờ',
      '',
      'Lặp nhạc:',
      '`m!loop`: bật/tắt lặp',
      '`m!repeat queue`: lặp cả hàng chờ',
    ].join('\n'),
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)],
    });
  },
};
