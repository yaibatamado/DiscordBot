const embed = require('../../utils/embed');

module.exports = {
  name: 'xuxi',
  aliases: ['xx'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '✊ Xù xì',

  data: {
    title: 'Hướng dẫn Xù Xì',
    description: [
      '`?xuxi` hoặc `?xx`: mở hướng dẫn Xù Xì.',
      '',
      'Luật cơ bản:',
      'Kéo thắng Bao, Bao thắng Búa, Búa thắng Kéo.',
      'Có thể nâng cấp sau thành game chọn nút trực tiếp trong Discord.',
    ].join('\n'),
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)],
    });
  },
};
