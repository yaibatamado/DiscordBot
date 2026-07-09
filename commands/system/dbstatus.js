const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { createEmbed, icons } = require('../../utils/uiEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dbstatus')
    .setDescription('Kiểm tra kết nối SQL Server'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await db.testConnection();

      const embed = createEmbed({
        title: '🗄️ SQL Server',
        description: '✅ Kết nối SQL Server thành công.',
        variant: 'success',
        thumbnail: icons.system,
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const embed = createEmbed({
        title: '🗄️ SQL Server',
        description: `❌ Không kết nối được SQL Server.\n\`${err.message}\``,
        variant: 'error',
        thumbnail: icons.warning,
      });

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
