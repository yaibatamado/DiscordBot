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

const formatDate = (date) => {
  if (!date) return 'Unknown time';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(date));
};

const buildLetterEmbed = (letter, { compact = false } = {}) => {
  const fromText = letter.anonymous
    ? 'Anonymous'
    : letter.senderName || 'Unknown sender';
  const description = compact
    ? trimText(letter.message, 180)
    : letter.message;

  return createEmbed({
    title: `Moonlight Letter #${letter.id}`,
    description,
    variant: 'system',
    thumbnail: letter.imageUrl || icons.system,
    fields: [
      { name: 'To', value: letter.recipient, inline: true },
      { name: 'From', value: fromText, inline: true },
      { name: 'Song', value: letter.songUrl ? `[${letter.song}](${letter.songUrl})` : letter.song, inline: false },
      { name: 'Sent At', value: formatDate(letter.createdAt), inline: true },
    ],
    footer: 'Moonlight Letters',
  });
};

const buildBrowseEmbed = ({ recipient, letters }) => createEmbed({
  title: `Letters for ${recipient}`,
  description: letters.length > 0
    ? `Found **${letters.length}** public letter(s). Pick a button below to view one.`
    : 'No public letters matched that recipient yet.',
  variant: letters.length > 0 ? 'system' : 'warning',
  thumbnail: icons.system,
  fields: letters.map((letter, index) => ({
    name: `${index + 1}. #${letter.id} - ${letter.song}`,
    value: [
      `To: **${letter.recipient}**`,
      `Message: ${trimText(letter.message, 120)}`,
    ].join('\n'),
    inline: false,
  })),
  footer: 'Moonlight Letters',
});

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

const buildBrowseButtons = (letters) => {
  if (letters.length === 0) return [];

  const row = new ActionRowBuilder();
  letters.slice(0, 5).forEach((letter, index) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`letter:view:${letter.id}`)
        .setLabel(`View ${index + 1}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  return [row];
};

const canDeleteLetter = (interaction, letter) => {
  if (letter.senderId === interaction.user.id) return true;
  return Boolean(interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages));
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

const executeSend = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const recipient = interaction.options.getString('recipient', true);
  const message = interaction.options.getString('message', true);
  const songInput = interaction.options.getString('song', true);
  let song = songInput;
  let songUrl = interaction.options.getString('url') || null;
  let imageUrl = interaction.options.getString('image') || null;
  const anonymous = interaction.options.getBoolean('anonymous') ?? true;

  if (songUrl && !isHttpUrl(songUrl)) {
    await interaction.editReply('Song URL must start with http:// or https://.');
    return;
  }

  if (imageUrl && !isHttpUrl(imageUrl)) {
    await interaction.editReply('Image URL must start with http:// or https://.');
    return;
  }

  if (!songUrl || !imageUrl) {
    try {
      const [songResult] = await searchSongs(songInput, { limit: 1 });
      if (songResult) {
        song = songResult.displayName;
        songUrl = songUrl || songResult.url;
        imageUrl = imageUrl || songResult.imageUrl;
      }
    } catch {
      // Manual song text still works when the music search provider is unavailable.
    }
  }

  const letter = await letterRepository.add({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    senderId: interaction.user.id,
    senderName: interaction.user.tag || interaction.user.username,
    recipient,
    message,
    song,
    songUrl,
    imageUrl,
    anonymous,
  });

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

  await interaction.editReply(`Sent Moonlight Letter #${letter.id} in this channel.`);
};

const executeBrowse = async (interaction) => {
  const recipient = interaction.options.getString('recipient', true);
  const letters = await letterRepository.browse({
    guildId: interaction.guildId,
    recipient,
    limit: 5,
  });

  await interaction.reply({
    embeds: [buildBrowseEmbed({ recipient, letters })],
    components: buildBrowseButtons(letters),
    flags: MessageFlags.Ephemeral,
  });
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

const executeDelete = async (interaction) => {
  const id = interaction.options.getInteger('id', true);
  const letter = await letterRepository.findById({ guildId: interaction.guildId, id });

  if (!letter) {
    await sendError(interaction, 'Letter Not Found', 'No public letter with that ID exists in this server.');
    return;
  }

  if (!canDeleteLetter(interaction, letter)) {
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
  if (subcommand === 'view') return executeView(interaction);
  if (subcommand === 'random') return executeRandom(interaction);
  if (subcommand === 'delete') return executeDelete(interaction);

  return sendError(interaction, 'Unknown Letter Action', 'That letter action is not supported yet.');
};

const handleComponent = async (interaction) => {
  const [, action, idText] = interaction.customId.split(':');
  if (action !== 'view') return false;

  const id = Number(idText);
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
};

const handleAutocomplete = async (interaction) => {
  const subcommand = interaction.options.getSubcommand(false);
  const focused = interaction.options.getFocused(true);

  if (subcommand !== 'send' || focused.name !== 'song') {
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

module.exports = {
  category: 'system',
  label: 'Letter',

  data: new SlashCommandBuilder()
    .setName('letter')
    .setDescription('Send and browse public song letters')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('send')
        .setDescription('Send a public letter with a song in this channel')
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
        )
        .addStringOption((option) =>
          option
            .setName('song')
            .setDescription('Song title and artist')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(160)
            .setAutocomplete(true)
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
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('browse')
        .setDescription('Find public letters by recipient name')
        .addStringOption((option) =>
          option
            .setName('recipient')
            .setDescription('Recipient name to search')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(80)
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
    buildSongChoices,
    canDeleteLetter,
    formatDate,
    isHttpUrl,
    trimText,
  },
};
