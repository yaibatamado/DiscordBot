const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const embed = require('./embed');

const categoryLabels = {
  game: '🎮 Trò chơi',
  music: '🎵 Âm nhạc',
  system: '⚙️ Hệ thống',
};

const buildCategoryOptions = (commands) => {
  const categories = new Set();

  commands.forEach((cmd) => {
    if (cmd.category) {
      categories.add(cmd.category);
    }
  });

  return [...categories].sort().map((category) => ({
    label: categoryLabels[category] || `📂 ${category.toUpperCase()}`,
    value: category,
  }));
};

const buildMainHelp = (commands) => ({
  embeds: [
    embed(
      'TRUNG TÂM CHỈ HUY',
      '✅ KẾT NỐI HỆ THỐNG THÀNH CÔNG\n\n📍 Chọn module để truy cập'
    ),
  ],
  components: [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('main_menu')
        .setPlaceholder('📍 Chọn hệ thống...')
        .addOptions(buildCategoryOptions(commands))
    ),
  ],
});

module.exports = {
  buildCategoryOptions,
  buildMainHelp,
};
