const embed = require('../../utils/embed');

module.exports = {
  name: 'nhac',
  aliases: ['nh'],
  cooldown: 5,
  permission: 'everyone',

  category: 'music',
  label: '🎵 Nhạc',

  data: {
    title: 'HƯỚNG DẪN SỬ DỤNG JOOKIE MUSIC',
    description: '▶️ m!play <url/tên>\n⏭️ m!skip\n⏹️ m!stop\n\n🔁 m!loop\n🔁 m!repeat queue\n🔀 m!shuffle\n\n📜 m!queue\n🗑️ m!clear'
  },

  execute(message) {
    message.reply({
      embeds: [embed(this.data.title, this.data.description)]
    });
  }
};
