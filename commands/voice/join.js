const { joinVoiceChannel } = require('@discordjs/voice');
const { MessageFlags, SlashCommandBuilder } = require('discord.js');

const executeJoin = async (interaction, deps = { joinVoiceChannel }) => {
  const channel = interaction.member?.voice?.channel;

  if (!interaction.guildId || !channel) {
    return interaction.reply({
      content: 'Bạn cần vào một kênh voice trước khi dùng `/join`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  deps.joinVoiceChannel({
    channelId: channel.id,
    guildId: interaction.guildId,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });

  return interaction.reply({
    content: `🔊 Đã vào kênh voice **${channel.name}** và bắt đầu treo.`,
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Cho bot vào treo trong kênh voice của bạn')
    .setDMPermission(false),

  execute: executeJoin,

  _private: {
    executeJoin,
  },
};
