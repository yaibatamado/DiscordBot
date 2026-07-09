const embed = require('../../utils/embed');

module.exports = {
  name: 'vuatv',
  aliases: ['vtv'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '🧠 Vua TV',

  data: {
    title: 'Hướng dẫn Vua Tiếng Việt',
    description: [
      '`?vuatv` hoặc `?vtv`: mở hướng dẫn Vua Tiếng Việt.',
      '',
      'Lệnh thường dùng:',
      '`start!`: bắt đầu chơi',
    ].join('\n'),
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)],
    });
  },
};
