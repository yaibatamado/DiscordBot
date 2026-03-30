const embed = require('../../utils/embed');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['h'],
  cooldown: 3,
  permission: 'everyone',

  execute(message) {

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('main_menu')
        .setPlaceholder('📍 Chọn hệ thống...')
        .addOptions([
          {
            label: '🎮 Trò chơi',
            value: 'game'
          },
          {
            label: '🎵 Âm thanh',
            value: 'music'
          }
        ])
    );

    message.reply({
      embeds: [
        embed(
          'TRUNG TÂM CHỈ HUY',
          '✅ KẾT NỐI HỆ THỐNG THÀNH CÔNG\n\n📍 Chọn module để truy cập'
        )
      ],
      components: [menu]
    });
  }
};