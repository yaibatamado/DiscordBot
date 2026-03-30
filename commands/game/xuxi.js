const embed = require('../../utils/embed');

module.exports = {
  name: 'xuxi',
  aliases: ['xx'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '✊ Xù xì',

  data: {
    title: 'HƯỚNG DẪN CHƠI XÙ XÌ',
    description: '✊ /xu-xi\nKéo - Búa - Bao'
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)]
    });
  }
};