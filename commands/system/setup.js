const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const SETUP_PREFIX = 'setup';
const VOICE_ROOM_PREFIX = '🌙・';

const normalizeName = (name) => (
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'moonlight'
);

const roomName = (mode, user) => {
  const base = normalizeName(user.username || user.globalName || 'user');
  return mode === 'voice' ? `${VOICE_ROOM_PREFIX}${base}` : `${base}-room`;
};

const isUserRoom = (channel, mode, userId) => {
  const expectedType = mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  const overwrite = channel.permissionOverwrites?.cache?.get?.(userId);

  return channel.type === expectedType && Boolean(overwrite);
};

const findUserRoom = (guild, mode, userId) => (
  guild.channels.cache.find((channel) => isUserRoom(channel, mode, userId))
);

const buildPanelEmbed = (mode) => {
  const isVoice = mode === 'voice';

  return createEmbed({
    title: isVoice ? 'TempVoice Interface' : 'Private Channel Interface',
    description: isVoice
      ? 'Dùng bảng này để tạo và quản lý voice riêng tạm thời của bạn.'
      : 'Dùng bảng này để tạo và quản lý text channel cá nhân của bạn.',
    variant: 'system',
    thumbnail: icons.system,
    fields: [
      {
        name: isVoice ? '🎙️ Voice riêng' : '💬 Channel riêng',
        value: isVoice
          ? [
            '• Mỗi thành viên có một voice riêng.',
            '• Có thể khóa/mở quyền vào phòng và đặt giới hạn người vào.',
            '• Bot sẽ chuyển bạn vào phòng sau khi tạo.',
            '• Voice riêng sẽ tự xóa khi trống.',
          ].join('\n')
          : [
            '• Mỗi thành viên có một text channel riêng.',
            '• Chỉ bạn và staff/admin có thể xem.',
            '• Phòng có thể giữ vĩnh viễn nếu bạn không xóa.',
          ].join('\n'),
      },
      {
        name: 'Cách dùng',
        value: 'Bấm các nút bên dưới để dùng giao diện.',
      },
    ],
  });
};

const buttonId = (mode, userId, action) => `${SETUP_PREFIX}:${mode}:${userId}:${action}`;
const modalId = (mode, userId, action) => `${SETUP_PREFIX}:${mode}:${userId}:${action}Modal`;

const buildPanelComponents = (mode, userId) => {
  const buttons = [
    new ButtonBuilder()
      .setCustomId(buttonId(mode, userId, 'create'))
      .setLabel(mode === 'voice' ? 'Tạo Voice' : 'Tạo Channel')
      .setEmoji(mode === 'voice' ? '🎙️' : '#️⃣')
      .setStyle(ButtonStyle.Success),
  ];

  if (mode === 'voice') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(buttonId(mode, userId, 'limit'))
        .setLabel('Giới Hạn')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(buttonId(mode, userId, 'lock'))
      .setLabel('Khóa')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buttonId(mode, userId, 'unlock'))
      .setLabel('Mở')
      .setEmoji('🔓')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buttonId(mode, userId, 'delete'))
      .setLabel('Xóa')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  return [new ActionRowBuilder().addComponents(...buttons)];
};

const buildLimitModal = (userId) => (
  new ModalBuilder()
    .setCustomId(modalId('voice', userId, 'limit'))
    .setTitle('Giới hạn người vào voice')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('limit')
          .setLabel('Số người tối đa')
          .setPlaceholder('Nhập 0 để bỏ giới hạn, hoặc 1-99')
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(2)
      )
    )
);

const baseOverwrites = (guild, userId, mode) => {
  const allow = mode === 'voice'
    ? [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.Stream,
    ]
    : [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
    ];

  return [
    {
      id: guild.roles.everyone.id,
      deny: mode === 'voice'
        ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        : [PermissionFlagsBits.ViewChannel],
    },
    {
      id: userId,
      allow,
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
      ],
    },
  ];
};

const createRoom = async (interaction, mode) => {
  const existing = findUserRoom(interaction.guild, mode, interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `Bạn đã có phòng riêng: <#${existing.id}>`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = await interaction.guild.channels.create({
    name: roomName(mode, interaction.user),
    type: mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
    parent: interaction.channel?.parentId || undefined,
    permissionOverwrites: baseOverwrites(interaction.guild, interaction.user.id, mode),
    reason: `Moonlight private ${mode} room for ${interaction.user.id}`,
  });

  if (mode === 'voice' && interaction.member?.voice?.setChannel) {
    await interaction.member.voice.setChannel(channel).catch(() => null);
  }

  return interaction.reply({
    content: `Đã tạo phòng riêng cho bạn: <#${channel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
};

const deleteRoom = async (interaction, mode) => {
  const channel = findUserRoom(interaction.guild, mode, interaction.user.id);
  if (!channel) {
    return interaction.reply({
      content: 'Bạn chưa có phòng riêng để xóa.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await channel.delete(`Moonlight private ${mode} room deleted by owner ${interaction.user.id}`);
  return interaction.reply({
    content: 'Đã xóa phòng riêng của bạn.',
    flags: MessageFlags.Ephemeral,
  });
};

const setRoomPrivacy = async (interaction, mode, locked) => {
  const channel = findUserRoom(interaction.guild, mode, interaction.user.id);
  if (!channel) {
    return interaction.reply({
      content: 'Bạn chưa có phòng riêng để chỉnh quyền.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const deny = locked
    ? [PermissionFlagsBits.ViewChannel, ...(mode === 'voice' ? [PermissionFlagsBits.Connect] : [])]
    : [];

  if (channel.permissionOverwrites?.edit) {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { deny });
  } else {
    const overwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
    if (overwrite) overwrite.deny = deny;
  }

  return interaction.reply({
    content: locked ? 'Đã khóa phòng riêng của bạn.' : 'Đã mở phòng riêng của bạn.',
    flags: MessageFlags.Ephemeral,
  });
};

const setVoiceLimit = async (interaction, limit) => {
  const channel = findUserRoom(interaction.guild, 'voice', interaction.user.id);
  if (!channel) {
    return interaction.reply({
      content: 'Bạn chưa có voice riêng để đặt giới hạn.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await channel.setUserLimit(limit);
  return interaction.reply({
    content: limit === 0
      ? 'Đã bỏ giới hạn người vào voice riêng của bạn.'
      : `Đã đặt giới hạn voice riêng thành ${limit} người.`,
    flags: MessageFlags.Ephemeral,
  });
};

const parseSetupButton = (customId) => {
  const [prefix, mode, userId, action] = customId.split(':');
  if (prefix !== SETUP_PREFIX || !['voice', 'channel'].includes(mode) || !userId || !action) {
    return null;
  }
  return { mode, userId, action };
};

const parseSetupModal = (customId) => {
  const [prefix, mode, userId, actionWithSuffix] = customId.split(':');
  const action = actionWithSuffix?.replace(/Modal$/, '');
  if (prefix !== SETUP_PREFIX || mode !== 'voice' || !userId || action !== 'limit') {
    return null;
  }
  return { mode, userId, action };
};

const executeSetup = async (interaction) => {
  const mode = interaction.options.getSubcommand();

  return interaction.reply({
    embeds: [buildPanelEmbed(mode)],
    components: buildPanelComponents(mode, interaction.user.id),
  });
};

const handleComponent = async (interaction) => {
  const parsed = parseSetupButton(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({
      content: 'Đây không phải giao diện setup của bạn.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (parsed.action === 'create') {
    await createRoom(interaction, parsed.mode);
    return true;
  }

  if (parsed.action === 'delete') {
    await deleteRoom(interaction, parsed.mode);
    return true;
  }

  if (parsed.action === 'limit' && parsed.mode === 'voice') {
    await interaction.showModal(buildLimitModal(interaction.user.id));
    return true;
  }

  if (parsed.action === 'lock' || parsed.action === 'unlock') {
    await setRoomPrivacy(interaction, parsed.mode, parsed.action === 'lock');
    return true;
  }

  await interaction.reply({
    content: 'Nút này chưa được hỗ trợ.',
    flags: MessageFlags.Ephemeral,
  });
  return true;
};

const handleModal = async (interaction) => {
  const parsed = parseSetupModal(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({
      content: 'Đây không phải modal setup của bạn.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const rawLimit = interaction.fields.getTextInputValue('limit').trim();
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
    await interaction.reply({
      content: 'Giới hạn phải là số từ 0 đến 99.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  await setVoiceLimit(interaction, limit);
  return true;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Tạo bảng setup voice hoặc channel riêng')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('voice')
        .setDescription('Gửi bảng tạo và quản lý voice riêng')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Gửi bảng tạo và quản lý text channel riêng')
    ),

  execute: executeSetup,
  handleComponent,
  handleModal,

  _private: {
    VOICE_ROOM_PREFIX,
    buildLimitModal,
    buildPanelEmbed,
    buildPanelComponents,
    createRoom,
    deleteRoom,
    findUserRoom,
    isUserRoom,
    parseSetupButton,
    parseSetupModal,
    roomName,
    setRoomPrivacy,
    setVoiceLimit,
  },
};
