const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const cooldownMs = 30 * 1000;
const cooldowns = new Map();

const buildAnonymousEmbed = (message) => createEmbed({
  title: '🌙 Anonymous Message',
  description: message,
  variant: 'system',
  thumbnail: icons.system,
  footer: 'Moonlight Anonymous',
});

const getCooldownLeft = (guildId, userId, now = Date.now()) => {
  const key = `${guildId}:${userId}`;
  const expiresAt = cooldowns.get(key) || 0;
  return Math.max(0, expiresAt - now);
};

const setCooldown = (guildId, userId, now = Date.now()) => {
  cooldowns.set(`${guildId}:${userId}`, now + cooldownMs);
};

const execute = async (interaction) => {
  const cooldownLeft = getCooldownLeft(interaction.guildId, interaction.user.id);
  if (cooldownLeft > 0) {
    await interaction.reply({
      content: `Bạn gửi anonymous hơi nhanh. Thử lại sau ${(cooldownLeft / 1000).toFixed(1)}s.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const message = interaction.options.getString('message', true);
  await interaction.channel.send({
    embeds: [buildAnonymousEmbed(message)],
    allowedMentions: { parse: [] },
  });
  setCooldown(interaction.guildId, interaction.user.id);

  await interaction.reply({
    content: 'Đã gửi anonymous message tại kênh này.',
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = {
  category: 'system',
  label: 'Anonymous',

  data: new SlashCommandBuilder()
    .setName('anonymous')
    .setDescription('Gửi tin nhắn anonymous tại kênh hiện tại')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Nội dung muốn gửi ẩn danh')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1800)
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildAnonymousEmbed,
    cooldowns,
    getCooldownLeft,
    setCooldown,
  },
};
