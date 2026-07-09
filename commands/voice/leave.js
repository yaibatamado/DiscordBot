const { getVoiceConnection } = require('@discordjs/voice');
const { MessageFlags, SlashCommandBuilder } = require('discord.js');

const executeLeave = async (interaction, deps = { getVoiceConnection }) => {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'Lệnh này chỉ dùng được trong server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const connection = deps.getVoiceConnection(interaction.guildId);

  if (!connection) {
    return interaction.reply({
      content: 'Bot hiện không ở trong kênh voice nào.',
      flags: MessageFlags.Ephemeral,
    });
  }

  connection.destroy();

  return interaction.reply({
    content: '👋 Bot đã rời kênh voice.',
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Cho bot rời kênh voice')
    .setDMPermission(false),

  execute: executeLeave,

  _private: {
    executeLeave,
  },
};
