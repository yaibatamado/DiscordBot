const embed = require('../../utils/embed');

module.exports = {
  name: 'noitu',
  aliases: ['nt'],
  cooldown: 5,
  permission: 'everyone',

  category: 'game', // 🔥 QUAN TRỌNG
  label: '🔤 Nối từ', // 🔥 hiển thị menu
  
  data: {
    title: 'HƯỚNG DẪN CHƠI NỐI TỪ',
    description: '🔤 start!\n🛑 stop!\n\n📊 nme\n📊 nrank'
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)]
    });
  }
};