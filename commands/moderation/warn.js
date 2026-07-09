const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Cảnh cáo tạm thời một thành viên')
    .addUserOption((option) =>
      option.setName('user')
        .setDescription('User cần cảnh cáo')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason')
        .setDescription('Lý do cảnh cáo')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: '❌ Không có quyền cảnh cáo thành viên',
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const embed = createEmbed({
      title: '⚠️ Cảnh cáo tạm thời',
      description: `${user.tag} đã bị cảnh cáo.\nLý do: ${reason}`,
      variant: 'warning',
      thumbnail: icons.warning,
      footer: 'Cảnh cáo này không được lưu vào database',
    });

    return interaction.reply({ embeds: [embed] });
  },
};
