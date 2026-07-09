const embed = require('../../utils/embed');

module.exports = {
  name: 'baucua',
  aliases: ['bc'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '🎲 Bầu cua',

  data: {
    title: 'Hướng dẫn Bầu Cua',
    description: [
      '`?baucua` hoặc `?bc`: mở hướng dẫn Bầu Cua.',
      '',
      'Chức năng hiện tại: hiển thị hướng dẫn game.',
      'Có thể nâng cấp sau thành mini game đặt cược bằng coin.',
    ].join('\n'),
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)],
    });
  },
};
