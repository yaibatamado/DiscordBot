const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { createEmbed, icons } = require('../utils/uiEmbed');
const mysteryBoxRepository = require('../repositories/mysteryBoxRepository');
const { getMinuteKey } = require('../utils/timeKeys');

const boxTemplates = [
  {
    type: 'fortune',
    title: 'Moonlit Fortune Box',
    content: 'A soft little omen fell out of the box: today is better for starting than waiting.',
    rewards: ['Lucky dust x7', 'A calm omen', 'One gentle reroll of mood'],
  },
  {
    type: 'question',
    title: 'Midnight Question Box',
    content: 'Question inside: what is one tiny thing that made today less heavy?',
    rewards: ['Conversation spark x1', 'Warm answer token', 'A quiet thought'],
  },
  {
    type: 'quest',
    title: 'Tiny Quest Box',
    content: 'Mini task: send someone a kind sentence, no explanation needed.',
    rewards: ['Kindness badge for the moment', 'Soft glow x3', 'Server vibe +1'],
  },
  {
    type: 'quote',
    title: 'Starlit Quote Box',
    content: 'The box whispers: "Small lights still count in a large dark room."',
    rewards: ['Quote shard x1', 'Night ink x2', 'Tiny courage'],
  },
  {
    type: 'chaos',
    title: 'Chaotic Moon Box',
    content: 'The box rattles suspiciously. It contains absolutely nothing, but in a premium way.',
    rewards: ['Fancy nothing x1', 'Questionable sparkle x4', 'Comedy crumbs'],
  },
  {
    type: 'music',
    title: 'Playlist Box',
    content: 'Drop one song that matches the current server weather.',
    rewards: ['Playlist note x1', 'Shared headphones', 'A 3-minute main character scene'],
  },
  {
    type: 'compliment',
    title: 'Silver Compliment Box',
    content: 'Whoever claims this is legally required to accept that they are doing okay.',
    rewards: ['Compliment seal x1', 'Moon cookie x2', 'Confidence spark'],
  },
];

const boxTtlMs = 5 * 60 * 1000;

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const buildMysteryBoxEmbed = (box) => createEmbed({
  title: box.title,
  description: box.content,
  variant: box.claimedBy ? 'success' : box.expiredAt ? 'warning' : 'system',
  thumbnail: icons.system,
  fields: [
    { name: 'Box ID', value: `#${box.id}`, inline: true },
    { name: 'Type', value: box.boxType, inline: true },
    {
      name: box.claimedBy ? 'Claimed By' : box.expiredAt ? 'Expired' : 'Hidden Reward',
      value: box.claimedBy
        ? `<@${box.claimedBy}>\n${box.reward}`
        : box.expiredAt
          ? 'Nobody claimed this box within 5 minutes.'
          : 'Press **Claim** to open it first. Expires in **5 minutes**.',
      inline: false,
    },
  ],
  footer: 'Moonlight Mystery Box - appears every 30 minutes when enabled',
});

const buildClaimRow = (box) => [
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mysterybox:claim:${box.id}`)
      .setLabel(box.claimedBy ? 'Claimed' : box.expiredAt ? 'Expired' : 'Claim')
      .setStyle(box.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(Boolean(box.claimedBy || box.expiredAt))
  ),
];

const canSendInChannel = (guild, channel) => {
  if (!channel?.isTextBased?.()) return false;
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return false;
  const me = guild.members.me;
  const permissions = me ? channel.permissionsFor(me) : null;
  return Boolean(permissions?.has(PermissionFlagsBits.ViewChannel)
    && permissions?.has(PermissionFlagsBits.SendMessages)
    && permissions?.has(PermissionFlagsBits.EmbedLinks));
};

const pickRandomTextChannel = (guild) => {
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => canSendInChannel(guild, channel));
  if (channels.length === 0) return null;
  return randomItem(channels);
};

const createBoxPayload = () => {
  const template = randomItem(boxTemplates);
  return {
    boxType: template.type,
    title: template.title,
    content: template.content,
    reward: randomItem(template.rewards),
  };
};

const sendMysteryBox = async (client, settings, now = new Date()) => {
  const guild = client.guilds.cache.get(settings.guildId);
  if (!guild) return null;

  const channel = pickRandomTextChannel(guild);
  if (!channel) return null;

  const sentKey = getMinuteKey(now).replace(/[: ]/g, '-');
  const expiresAt = new Date(now.getTime() + boxTtlMs);
  const payload = createBoxPayload();
  let box;
  try {
    box = await mysteryBoxRepository.addBox({
      guildId: guild.id,
      channelId: channel.id,
      sentKey,
      expiresAt,
      ...payload,
    });
  } catch {
    return null;
  }

  const message = await channel.send({
    embeds: [buildMysteryBoxEmbed(box)],
    components: buildClaimRow(box),
    allowedMentions: { parse: [] },
  });
  await mysteryBoxRepository.updateMessage({ guildId: guild.id, id: box.id, messageId: message.id });
  scheduleBoxExpiry(client, { ...box, messageId: message.id, expiresAt });
  return box;
};

const scheduleBoxExpiry = (client, box) => {
  const delay = Math.max(0, new Date(box.expiresAt).getTime() - Date.now());
  setTimeout(async () => {
    try {
      const expired = await mysteryBoxRepository.expireBox({ guildId: box.guildId, id: box.id });
      if (!expired) return;

      const guild = client.guilds.cache.get(expired.guildId);
      const channel = guild?.channels.cache.get(expired.channelId) || await guild?.channels.fetch(expired.channelId).catch(() => null);
      const message = await channel?.messages?.fetch(expired.messageId).catch(() => null);
      await message?.edit({
        embeds: [buildMysteryBoxEmbed(expired)],
        components: buildClaimRow(expired),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.error('Mystery box expiry failed:', error);
    }
  }, delay);
};

const runMysteryBoxTick = async (client, now = new Date()) => {
  const settings = await mysteryBoxRepository.listEnabled();
  const results = [];
  for (const setting of settings) {
    try {
      const result = await sendMysteryBox(client, setting, now);
      if (result) results.push(result);
    } catch (error) {
      console.error('Mystery box send failed:', error);
    }
  }
  return results;
};

const handleMysteryBoxClaim = async (interaction) => {
  const [, action, idText] = interaction.customId.split(':');
  if (action !== 'claim') return false;

  const id = Number(idText);
  if (!Number.isInteger(id)) return false;

  const claimed = await mysteryBoxRepository.claimBox({
    guildId: interaction.guildId,
    id,
    userId: interaction.user.id,
  });

  if (!claimed) {
    const existing = await mysteryBoxRepository.findBox({ guildId: interaction.guildId, id });
    await interaction.reply({
      content: existing?.expiredAt
        ? 'This mystery box expired after 5 minutes.'
        : existing?.claimedBy
        ? `This box was already claimed by <@${existing.claimedBy}>.`
        : 'This mystery box is no longer available.',
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
    return true;
  }

  await interaction.update({
    embeds: [buildMysteryBoxEmbed(claimed)],
    components: buildClaimRow(claimed),
    allowedMentions: { parse: [] },
  });
  return true;
};

module.exports = {
  boxTemplates,
  buildClaimRow,
  buildMysteryBoxEmbed,
  boxTtlMs,
  createBoxPayload,
  handleMysteryBoxClaim,
  pickRandomTextChannel,
  runMysteryBoxTick,
  sendMysteryBox,
};
