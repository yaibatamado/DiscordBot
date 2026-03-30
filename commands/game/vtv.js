const embed = require('../../utils/embed');

module.exports = {
  name: 'vuatv',
  aliases: ['vtv'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game',
  label: '🧠 Vua TV',
  
  data: {
    title: 'HƯỚNG DẪN CHƠI VUA TIẾNG VIỆT',
    description: '🧠 start!'
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)]
    });
  }
};