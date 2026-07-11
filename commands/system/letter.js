const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const letterRepository = require('../../repositories/letterRepository');
const { buildSongChoices, searchSongs } = require('../../utils/musicSearch');

const pageSize = 5;
const sendCooldownMs = 60 * 1000;
const previewTtlMs = 10 * 60 * 1000;
const sessionTtlMs = 15 * 60 * 1000;
const cooldowns = new Map();
const pendingPreviews = new Map();
const pageSessions = new Map();

const tagChoices = [
  { name: 'Love', value: 'love' },
  { name: 'Sad', value: 'sad' },
  { name: 'Miss You', value: 'miss_you' },
  { name: 'Thanks', value: 'thanks' },
  { name: 'Sorry', value: 'sorry' },
  { name: 'Crush', value: 'crush' },
  { name: 'Friendship', value: 'friendship' },
  { name: 'Healing', value: 'healing' },
  { name: 'Hope', value: 'hope' },
  { name: 'Goodbye', value: 'goodbye' },
  { name: 'Memories', value: 'memories' },
  { name: 'Confession', value: 'confession' },
  { name: 'Comfort', value: 'comfort' },
  { name: 'Birthday', value: 'birthday' },
  { name: 'Congrats', value: 'congrats' },
  { name: 'Motivation', value: 'motivation' },
  { name: 'Study', value: 'study' },
  { name: 'Chill', value: 'chill' },
  { name: 'Late Night', value: 'late_night' },
  { name: 'Rainy', value: 'rainy' },
  { name: 'Nostalgia', value: 'nostalgia' },
  { name: 'Happy', value: 'happy' },
  { name: 'Lonely', value: 'lonely' },
  { name: 'Secret', value: 'secret' },
  { name: 'Other', value: 'other' },
];

const tagLabels = new Map(tagChoices.map((choice) => [choice.value, choice.name]));

const createToken = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const cleanupMaps = (now = Date.now()) => {
  for (const [key, value] of pendingPreviews) {
    if (value.expiresAt <= now) pendingPreviews.delete(key);
  }

  for (const [key, value] of pageSessions) {
    if (value.expiresAt <= now) pageSessions.delete(key);
  }
};

const isHttpUrl = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const trimText = (value, maxLength) => {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
};

const formatTag = (tag) => (tag ? tagLabels.get(tag) || tag : 'None');

const formatDate = (date) => {
  if (!date) return 'Unknown time';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(date));
};

const buildLetterEmbed = (letter, { compact = false, preview = false } = {}) => {
  const fromText = letter.anonymous
    ? 'Anonymous'
    : letter.senderName || 'Unknown sender';
  const description = compact
    ? trimText(letter.message, 180)
    : letter.message;

  return createEmbed({
    title: preview ? 'Moonlight Letter Preview' : `Moonlight Letter #${letter.id}`,
    description,
    variant: 'system',
    thumbnail: letter.imageUrl || icons.system,
    fields: [
      { name: 'To', value: letter.recipient, inline: true },
      { name: 'From', value: fromText, inline: true },
      { name: 'Tag', value: formatTag(letter.tag), inline: true },
      { name: 'Song', value: letter.songUrl ? `[${letter.song}](${letter.songUrl})` : letter.song, inline: false },
      { name: 'Sent At', value: preview ? 'Not posted yet' : formatDate(letter.createdAt), inline: true },
    ],
    footer: preview ? 'Moonlight Letters - Preview before posting' : 'Moonlight Letters',
  });
};

const buildBrowseEmbed = ({
  title = 'Moonlight Letters',
  letters,
  page = 0,
  total = letters.length,
  recipient = null,
  tag = null,
  mine = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filters = [
    recipient ? `Recipient: **${recipient}**` : null,
    tag ? `Tag: **${formatTag(tag)}**` : null,
    mine ? 'Scope: **My letters**' : null,
  ].filter(Boolean).join('\n');

  return createEmbed({
    title,
    description: total > 0
      ? [
        `Showing page **${page + 1}/${totalPages}** with **${total}** letter(s).`,
        filters || 'Showing all public letters in this server.',
      ].join('\n')
      : 'No public letters matched this view yet.',
    variant: total > 0 ? 'system' : 'warning',
    thumbnail: icons.system,
    fields: letters.map((letter, index) => ({
      name: `${page * pageSize + index + 1}. #${letter.id} - ${letter.song}`,
      value: [
        `To: **${letter.recipient}**`,
        `Tag: **${formatTag(letter.tag)}**`,
        `Message: ${trimText(letter.message, 110)}`,
      ].join('\n'),
      inline: false,
    })),
    footer: 'Moonlight Letters',
  });
};

const buildLetterButtons = (letter) => {
  const row = new ActionRowBuilder();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`letter:view:${letter.id}`)
      .setLabel('View Detail')
      .setStyle(ButtonStyle.Secondary)
  );

  if (letter.songUrl) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Open Song')
        .setStyle(ButtonStyle.Link)
        .setURL(letter.songUrl)
    );
  }

  return [row];
};

const buildBrowseButtons = ({ letters, token, page, total }) => {
  if (letters.length === 0) return [];

  const viewRow = new ActionRowBuilder();
  letters.slice(0, pageSize).forEach((letter, index) => {
    viewRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`letter:view:${letter.id}`)
        .setLabel(`View ${index + 1}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`letter:page:${token}:${Math.max(0, page - 1)}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`letter:page:${token}:${Math.min(totalPages - 1, page + 1)}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  return [viewRow, navRow];
};

const buildPreviewButtons = (token) => [
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`letter:post:${token}`)
      .setLabel('Post')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`letter:cancel:${token}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  ),
];

const canManageLetter = (interaction, letter) => {
  if (letter.senderId === interaction.user.id) return true;
  return Boolean(interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages));
};

const getCooldownLeft = (guildId, userId, now = Date.now()) => {
  const key = `${guildId}:${userId}`;
  return Math.max(0, (cooldowns.get(key) || 0) - now);
};

const setCooldown = (guildId, userId, now = Date.now()) => {
  cooldowns.set(`${guildId}:${userId}`, now + sendCooldownMs);
};

const sendError = (interaction, title, description) => interaction.reply({
  embeds: [createEmbed({
    title,
    description,
    variant: 'error',
    thumbnail: icons.system,
    footer: 'Moonlight Letters',
  })],
  flags: MessageFlags.Ephemeral,
});

const resolveSong = async ({ songInput, songUrl = null, imageUrl = null }) => {
  let song = songInput;
  let finalSongUrl = songUrl;
  let finalImageUrl = imageUrl;

  if (!finalSongUrl || !finalImageUrl) {
    try {
      const [songResult] = await searchSongs(songInput, { limit: 1 });
      if (songResult) {
        song = songResult.displayName;
        finalSongUrl = finalSongUrl || songResult.url;
        finalImageUrl = finalImageUrl || songResult.imageUrl;
      }
    } catch {
      // Manual song text still works when the music search provider is unavailable.
    }
  }

  return { song, songUrl: finalSongUrl, imageUrl: finalImageUrl };
};

const createBrowseSession = async ({
  interaction,
  title,
  recipient = null,
  tag = null,
  senderId = null,
  mine = false,
  page = 0,
}) => {
  cleanupMaps();
  const total = await letterRepository.count({
    guildId: interaction.guildId,
    recipient,
    tag,
    senderId,
  });
  const letters = await letterRepository.list({
    guildId: interaction.guildId,
    recipient,
    tag,
    senderId,
    limit: pageSize,
    offset: page * pageSize,
  });
  const token = createToken();
  pageSessions.set(token, {
    ownerId: interaction.user.id,
    guildId: interaction.guildId,
    title,
    recipient,
    tag,
    senderId,
    mine,
    total,
    expiresAt: Date.now() + sessionTtlMs,
  });

  return {
    embeds: [buildBrowseEmbed({ title, letters, page, total, recipient, tag, mine })],
    components: buildBrowseButtons({ letters, token, page, total }),
    flags: MessageFlags.Ephemeral,
  };
};

const refreshBrowseSession = async (interaction, token, page) => {
  cleanupMaps();
  const session = pageSessions.get(token);
  if (!session) {
    await interaction.reply({
      content: 'This letter list expired. Please run `/letter browse` again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (session.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: 'This letter list belongs to another user.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const total = await letterRepository.count({
    guildId: interaction.guildId,
    recipient: session.recipient,
    tag: session.tag,
    senderId: session.senderId,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
  const letters = await letterRepository.list({
    guildId: interaction.guildId,
    recipient: session.recipient,
    tag: session.tag,
    senderId: session.senderId,
    limit: pageSize,
    offset: safePage * pageSize,
  });

  session.total = total;
  session.expiresAt = Date.now() + sessionTtlMs;

  await interaction.update({
    embeds: [buildBrowseEmbed({
      title: session.title,
      letters,
      page: safePage,
      total,
      recipient: session.recipient,
      tag: session.tag,
      mine: session.mine,
    })],
    components: buildBrowseButtons({ letters, token, page: safePage, total }),
  });
};

const postPendingLetter = async (interaction, token) => {
  cleanupMaps();
  const pending = pendingPreviews.get(token);
  if (!pending) {
    await interaction.reply({
      content: 'This preview expired. Please run `/letter send` again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (pending.userId !== interaction.user.id) {
    await interaction.reply({
      content: 'This preview belongs to another user.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const cooldownLeft = getCooldownLeft(interaction.guildId, interaction.user.id);
  if (cooldownLeft > 0) {
    await interaction.reply({
      content: `Please wait ${(cooldownLeft / 1000).toFixed(1)}s before posting another letter.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const letter = await letterRepository.add(pending.payload);
  const publicMessage = await interaction.channel.send({
    embeds: [buildLetterEmbed(letter)],
    components: buildLetterButtons(letter),
    allowedMentions: { parse: [] },
  });

  await letterRepository.updateMessage({
    id: letter.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: publicMessage.id,
  });

  pendingPreviews.delete(token);
  setCooldown(interaction.guildId, interaction.user.id);

  await interaction.update({
    content: `Posted Moonlight Letter #${letter.id} in this channel.`,
    embeds: [],
    components: [],
  });
};

const updateOriginalMessage = async (interaction, letter) => {
  if (!letter.channelId || !letter.messageId) return;

  try {
    const channel = await interaction.guild.channels.fetch(letter.channelId);
    const message = await channel?.messages?.fetch(letter.messageId);
    await message?.edit({
      embeds: [buildLetterEmbed(letter)],
      components: buildLetterButtons(letter),
      allowedMentions: { parse: [] },
    });
  } catch {
    // The database update is still valid when the original Discord message is gone.
  }
};

const executeSend = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const cooldownLeft = getCooldownLeft(interaction.guildId, interaction.user.id);
  if (cooldownLeft > 0) {
    await interaction.editReply(`Please wait ${(cooldownLeft / 1000).toFixed(1)}s before creating another letter.`);
    return;
  }

  const recipient = interaction.options.getString('recipient', true);
  const message = interaction.options.getString('message', true);
  const songInput = interaction.options.getString('song', true);
  const inputSongUrl = interaction.options.getString('url') || null;
  const inputImageUrl = interaction.options.getString('image') || null;
  const anonymous = interaction.options.getBoolean('anonymous') ?? true;
  const tag = interaction.options.getString('tag') || null;

  if (inputSongUrl && !isHttpUrl(inputSongUrl)) {
    await interaction.editReply('Song URL must start with http:// or https://.');
    return;
  }

  if (inputImageUrl && !isHttpUrl(inputImageUrl)) {
    await interaction.editReply('Image URL must start with http:// or https://.');
    return;
  }

  const { song, songUrl, imageUrl } = await resolveSong({
    songInput,
    songUrl: inputSongUrl,
    imageUrl: inputImageUrl,
  });

  const previewLetter = {
    id: 'preview',
    recipient,
    message,
    song,
    songUrl,
    imageUrl,
    tag,
    anonymous,
    senderId: interaction.user.id,
    senderName: interaction.user.tag || interaction.user.username,
    createdAt: null,
  };
  const token = createToken();
  pendingPreviews.set(token, {
    userId: interaction.user.id,
    payload: {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      senderId: interaction.user.id,
      senderName: interaction.user.tag || interaction.user.username,
      recipient,
      message,
      song,
      songUrl,
      imageUrl,
      tag,
      anonymous,
    },
    expiresAt: Date.now() + previewTtlMs,
  });

  await interaction.editReply({
    content: 'Preview your letter before posting it publicly.',
    embeds: [buildLetterEmbed(previewLetter, { preview: true })],
    components: buildPreviewButtons(token),
  });
};

const executeBrowse = async (interaction) => {
  const recipient = interaction.options.getString('recipient') || null;
  const tag = interaction.options.getString('tag') || null;
  const payload = await createBrowseSession({
    interaction,
    title: recipient ? `Letters for ${recipient}` : 'All Moonlight Letters',
    recipient,
    tag,
  });

  await interaction.reply(payload);
};

const executeMine = async (interaction) => {
  const tag = interaction.options.getString('tag') || null;
  const payload = await createBrowseSession({
    interaction,
    title: 'My Moonlight Letters',
    tag,
    senderId: interaction.user.id,
    mine: true,
  });

  await interaction.reply(payload);
};

const executeView = async (interaction) => {
  const id = interaction.options.getInteger('id', true);
  const letter = await letterRepository.findById({ guildId: interaction.guildId, id });

  if (!letter) {
    await sendError(interaction, 'Letter Not Found', 'No public letter with that ID exists in this server.');
    return;
  }

  await interaction.reply({
    embeds: [buildLetterEmbed(letter)],
    components: buildLetterButtons(letter),
    allowedMentions: { parse: [] },
  });
};

const executeRandom = async (interaction) => {
  const letter = await letterRepository.random({ guildId: interaction.guildId });

  if (!letter) {
    await sendError(interaction, 'No Letters Yet', 'Send the first one with `/letter send`.');
    return;
  }

  await interaction.reply({
    embeds: [buildLetterEmbed(letter)],
    components: buildLetterButtons(letter),
    allowedMentions: { parse: [] },
  });
};

const executeEdit = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const id = interaction.options.getInteger('id', true);
  const existing = await letterRepository.findById({ guildId: interaction.guildId, id });
  if (!existing) {
    await interaction.editReply('No public letter with that ID exists in this server.');
    return;
  }

  if (!canManageLetter(interaction, existing)) {
    await interaction.editReply('Only the sender or a moderator with Manage Messages can edit it.');
    return;
  }

  const newMessage = interaction.options.getString('message') || null;
  const songInput = interaction.options.getString('song') || null;
  const inputSongUrl = interaction.options.getString('url');
  const inputImageUrl = interaction.options.getString('image');
  const tag = interaction.options.getString('tag');
  const anonymous = interaction.options.getBoolean('anonymous');

  if (!newMessage && !songInput && inputSongUrl === null && inputImageUrl === null && tag === null && anonymous === null) {
    await interaction.editReply('Nothing to edit. Add at least one field to update.');
    return;
  }

  if (inputSongUrl && !isHttpUrl(inputSongUrl)) {
    await interaction.editReply('Song URL must start with http:// or https://.');
    return;
  }

  if (inputImageUrl && !isHttpUrl(inputImageUrl)) {
    await interaction.editReply('Image URL must start with http:// or https://.');
    return;
  }

  let song = null;
  let songUrl = inputSongUrl;
  let imageUrl = inputImageUrl;
  if (songInput) {
    const resolved = await resolveSong({
      songInput,
      songUrl: inputSongUrl || null,
      imageUrl: inputImageUrl || null,
    });
    song = resolved.song;
    songUrl = resolved.songUrl;
    imageUrl = resolved.imageUrl;
  }

  const updated = await letterRepository.updateContent({
    guildId: interaction.guildId,
    id,
    message: newMessage,
    song,
    songUrl,
    imageUrl,
    tag,
    anonymous,
  });

  await updateOriginalMessage(interaction, updated);
  await interaction.editReply({
    embeds: [buildLetterEmbed(updated)],
    components: buildLetterButtons(updated),
  });
};

const executeDelete = async (interaction) => {
  const id = interaction.options.getInteger('id', true);
  const letter = await letterRepository.findById({ guildId: interaction.guildId, id });

  if (!letter) {
    await sendError(interaction, 'Letter Not Found', 'No public letter with that ID exists in this server.');
    return;
  }

  if (!canManageLetter(interaction, letter)) {
    await sendError(interaction, 'Cannot Delete Letter', 'Only the sender or a moderator with Manage Messages can delete it.');
    return;
  }

  await letterRepository.remove({ guildId: interaction.guildId, id });

  if (letter.channelId && letter.messageId) {
    try {
      const channel = await interaction.guild.channels.fetch(letter.channelId);
      const message = await channel?.messages?.fetch(letter.messageId);
      await message?.delete();
    } catch {
      // The database entry is still removed even if the original Discord message is gone.
    }
  }

  await interaction.reply({
    content: `Deleted Moonlight Letter #${id}.`,
    flags: MessageFlags.Ephemeral,
  });
};

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'send') return executeSend(interaction);
  if (subcommand === 'browse') return executeBrowse(interaction);
  if (subcommand === 'mine') return executeMine(interaction);
  if (subcommand === 'view') return executeView(interaction);
  if (subcommand === 'random') return executeRandom(interaction);
  if (subcommand === 'edit') return executeEdit(interaction);
  if (subcommand === 'delete') return executeDelete(interaction);

  return sendError(interaction, 'Unknown Letter Action', 'That letter action is not supported yet.');
};

const handleComponent = async (interaction) => {
  const [, action, first, second] = interaction.customId.split(':');

  if (action === 'view') {
    const id = Number(first);
    if (!Number.isInteger(id)) return false;

    const letter = await letterRepository.findById({ guildId: interaction.guildId, id });
    if (!letter) {
      await interaction.reply({
        content: 'Letter not found anymore.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await interaction.reply({
      embeds: [buildLetterEmbed(letter)],
      components: buildLetterButtons(letter),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (action === 'page') {
    await refreshBrowseSession(interaction, first, Number(second));
    return true;
  }

  if (action === 'post') {
    await postPendingLetter(interaction, first);
    return true;
  }

  if (action === 'cancel') {
    pendingPreviews.delete(first);
    await interaction.update({
      content: 'Letter preview cancelled.',
      embeds: [],
      components: [],
    });
    return true;
  }

  return false;
};

const handleAutocomplete = async (interaction) => {
  const subcommand = interaction.options.getSubcommand(false);
  const focused = interaction.options.getFocused(true);

  if (!['send', 'edit'].includes(subcommand) || focused.name !== 'song') {
    await interaction.respond([]);
    return true;
  }

  try {
    const songs = await searchSongs(focused.value, { limit: 8 });
    await interaction.respond(buildSongChoices(songs));
  } catch {
    await interaction.respond([]);
  }

  return true;
};

const addTagOption = (subcommand) => subcommand.addStringOption((option) =>
  option
    .setName('tag')
    .setDescription('Letter mood/tag')
    .addChoices(...tagChoices)
);

const addSongOption = (subcommand, required = false) => subcommand.addStringOption((option) =>
  option
    .setName('song')
    .setDescription('Song title and artist')
    .setRequired(required)
    .setMinLength(1)
    .setMaxLength(160)
    .setAutocomplete(true)
);

module.exports = {
  category: 'system',
  label: 'Letter',

  data: new SlashCommandBuilder()
    .setName('letter')
    .setDescription('Send and browse public song letters')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      addTagOption(addSongOption(
        subcommand
          .setName('send')
          .setDescription('Preview and send a public letter with a song in this channel')
          .addStringOption((option) =>
            option
              .setName('recipient')
              .setDescription('Recipient name')
              .setRequired(true)
              .setMinLength(1)
              .setMaxLength(80)
          )
          .addStringOption((option) =>
            option
              .setName('message')
              .setDescription('Letter message')
              .setRequired(true)
              .setMinLength(1)
              .setMaxLength(1800)
          ),
        true
      )
        .addStringOption((option) =>
          option
            .setName('url')
            .setDescription('Spotify, YouTube, or music link')
            .setMaxLength(500)
        )
        .addStringOption((option) =>
          option
            .setName('image')
            .setDescription('Optional album image URL')
            .setMaxLength(500)
        )
        .addBooleanOption((option) =>
          option
            .setName('anonymous')
            .setDescription('Hide your name. Default: true')
        ))
    )
    .addSubcommand((subcommand) =>
      addTagOption(
        subcommand
          .setName('browse')
          .setDescription('Browse all public letters, optionally filtered')
          .addStringOption((option) =>
            option
              .setName('recipient')
              .setDescription('Optional recipient name to search')
              .setMinLength(1)
              .setMaxLength(80)
          )
      )
    )
    .addSubcommand((subcommand) =>
      addTagOption(
        subcommand
          .setName('mine')
          .setDescription('Browse letters you posted')
      )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View a public letter by ID')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('Letter ID')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('random')
        .setDescription('Show a random public letter')
    )
    .addSubcommand((subcommand) =>
      addTagOption(addSongOption(
        subcommand
          .setName('edit')
          .setDescription('Edit your letter, or edit any letter as a moderator')
          .addIntegerOption((option) =>
            option
              .setName('id')
              .setDescription('Letter ID')
              .setRequired(true)
              .setMinValue(1)
          )
          .addStringOption((option) =>
            option
              .setName('message')
              .setDescription('New letter message')
              .setMinLength(1)
              .setMaxLength(1800)
          ),
        false
      )
        .addStringOption((option) =>
          option
            .setName('url')
            .setDescription('New Spotify, YouTube, or music link')
            .setMaxLength(500)
        )
        .addStringOption((option) =>
          option
            .setName('image')
            .setDescription('New album image URL')
            .setMaxLength(500)
        )
        .addBooleanOption((option) =>
          option
            .setName('anonymous')
            .setDescription('Hide your name')
        ))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete your letter, or delete any letter as a moderator')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('Letter ID')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  execute,
  handleAutocomplete,
  handleComponent,

  _private: {
    buildBrowseButtons,
    buildBrowseEmbed,
    buildLetterButtons,
    buildLetterEmbed,
    buildPreviewButtons,
    buildSongChoices,
    canManageLetter,
    cooldowns,
    formatDate,
    formatTag,
    getCooldownLeft,
    isHttpUrl,
    pageSessions,
    pendingPreviews,
    setCooldown,
    tagChoices,
    trimText,
  },
};
