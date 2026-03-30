const embed = require('../../utils/embed');

module.exports = {
  name: 'baucua',
  aliases: ['bc'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '🎲 Bầu cua',

  data: {
    title: 'HƯỚNG DẪN CHƠI BẦU CUA',
    description: '🎲 /baucua\nGame may mắn'
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)]
    });
  }
};