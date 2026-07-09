const embed = require('../../utils/embed');

module.exports = {
  name: 'noitu',
  aliases: ['nt'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '🔤 Nối từ',

  data: {
    title: 'Hướng dẫn Nối Từ',
    description: [
      '`?noitu` hoặc `?nt`: mở hướng dẫn Nối Từ.',
      '',
      'Lệnh thường dùng:',
      '`start!`: bắt đầu ván',
      '`stop!`: dừng ván',
      '`nme`: xem điểm của bạn',
      '`nrank`: xem bảng xếp hạng',
    ].join('\n'),
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)],
    });
  },
};
