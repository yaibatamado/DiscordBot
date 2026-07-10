const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const { getGuildSettings, updateGuildSettings } = require('../../utils/guildSettings');

const buildSettingsEmbed = (settings) => createEmbed({
  title: '⚙️ Moonlight Settings',
  description: 'Cấu hình nhanh cho server này.',
  variant: 'system',
  thumbnail: icons.system,
  fields: [
    {
      name: 'Voice Log',
      value: settings.voiceLogEnabled
        ? 'Đang bật. Moonlight sẽ báo join/leave trong chat của kênh voice.'
        : 'Đang tắt. Moonlight sẽ không gửi thông báo join/leave voice.',
      inline: false,
    },
  ],
  footer: 'Moonlight Settings',
});

const executeSettings = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'view') {
    const settings = await getGuildSettings(interaction.guildId);
    return interaction.reply({
      embeds: [buildSettingsEmbed(settings)],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (subcommand === 'voice-log') {
    const enabled = interaction.options.getBoolean('enabled', true);
    const settings = await updateGuildSettings(interaction.guildId, {
      voiceLogEnabled: enabled,
    });

    return interaction.reply({
      embeds: [buildSettingsEmbed(settings)],
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: 'Thiết lập này chưa được hỗ trợ.',
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  category: 'system',
  label: 'Settings',

  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Xem hoặc chỉnh thiết lập Moonlight cho server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('Xem thiết lập hiện tại')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('voice-log')
        .setDescription('Bật hoặc tắt thông báo join/leave voice')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('Bật hoặc tắt voice log')
            .setRequired(true)
        )
    ),

  execute: executeSettings,

  _private: {
    buildSettingsEmbed,
  },
};
