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
  UserSelectMenuBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const SETUP_PREFIX = 'setup';
const VOICE_ROOM_PREFIX = '🌙・';

const ownerPermissions = (mode) => ([
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  ...(mode === 'voice'
    ? [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.Stream,
    ]
    : [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
    ]),
]);

const guestPermissions = (mode) => (mode === 'voice'
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
  ]);

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

const includesPermission = (permissions, permission) => {
  if (!permissions) return false;
  if (Array.isArray(permissions)) return permissions.includes(permission);
  if (typeof permissions.has === 'function') return permissions.has(permission);
  if (typeof permissions.bitfield !== 'undefined') {
    return (BigInt(permissions.bitfield) & BigInt(permission)) === BigInt(permission);
  }
  return false;
};

const isUserRoom = (channel, mode, userId) => {
  const expectedType = mode === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  const overwrite = channel.permissionOverwrites?.cache?.get?.(userId);

  return channel.type === expectedType
    && Boolean(overwrite)
    && includesPermission(overwrite.allow, PermissionFlagsBits.ManageChannels);
};

const findUserRoom = (guild, mode, userId) => (
  guild.channels.cache.find((channel) => isUserRoom(channel, mode, userId))
);

const getRoomOwnerId = (channel, guild) => {
  const ignoredIds = new Set([
    guild.roles.everyone.id,
    guild.members.me.id,
  ]);

  for (const [id, overwrite] of channel.permissionOverwrites?.cache || []) {
    if (!ignoredIds.has(id) && includesPermission(overwrite.allow, PermissionFlagsBits.ManageChannels)) {
      return id;
    }
  }

  return null;
};

const isPrivateVoiceRoom = (channel, guild) => (
  channel?.type === ChannelType.GuildVoice
  && Boolean(getRoomOwnerId(channel, guild))
);

const buildPanelEmbed = (mode) => {
  const isVoice = mode === 'voice';

  return createEmbed({
    title: isVoice ? '🎙️ TempVoice Interface' : '💬 Private Channel Interface',
    description: isVoice
      ? 'Bảng này dùng để tạo và quản lý voice riêng tạm thời.'
      : 'Bảng này dùng để tạo và quản lý text channel cá nhân.',
    variant: 'system',
    thumbnail: icons.system,
    fields: [
      {
        name: isVoice ? 'Voice riêng' : 'Channel riêng',
        value: isVoice
          ? [
            '• Mỗi thành viên có thể tạo một voice riêng.',
            '• Chủ phòng có thể đổi tên, khóa/mở, giới hạn, mời hoặc chặn người khác.',
            '• Voice riêng tự xóa sau khi trống.',
          ].join('\n')
          : [
            '• Mỗi thành viên có thể tạo một text channel riêng.',
            '• Chủ phòng có thể đổi tên, khóa/mở, mời hoặc chặn người khác.',
            '• Channel sẽ được giữ lại cho đến khi chủ phòng xóa.',
          ].join('\n'),
      },
      {
        name: 'Cách dùng',
        value: 'Bấm các nút bên dưới để thao tác với phòng riêng của bạn.',
      },
    ],
  });
};

const buttonId = (mode, action) => `${SETUP_PREFIX}:${mode}:${action}`;
const modalId = (mode, userId, action) => `${SETUP_PREFIX}:${mode}:${userId}:${action}Modal`;
const selectId = (mode, userId, action) => `${SETUP_PREFIX}:${mode}:${userId}:${action}Select`;

const buildPanelComponents = (mode) => {
  const firstRowButtons = [
    new ButtonBuilder()
      .setCustomId(buttonId(mode, 'create'))
      .setLabel(mode === 'voice' ? 'Create Voice' : 'Create Channel')
      .setEmoji(mode === 'voice' ? '🎙️' : '#️⃣')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buttonId(mode, 'rename'))
      .setLabel('Rename')
      .setEmoji('🏷️')
      .setStyle(ButtonStyle.Secondary),
  ];

  if (mode === 'voice') {
    firstRowButtons.push(
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'limit'))
        .setLabel('Limit')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  firstRowButtons.push(
    new ButtonBuilder()
      .setCustomId(buttonId(mode, 'delete'))
      .setLabel('Delete')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  const rows = [
    new ActionRowBuilder().addComponents(...firstRowButtons),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'lock'))
        .setLabel('Lock')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'unlock'))
        .setLabel('Unlock')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'invite'))
        .setLabel('Invite')
        .setEmoji('📨')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'trust'))
        .setLabel('Trust')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'untrust'))
        .setLabel('Untrust')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'kick'))
        .setLabel(mode === 'voice' ? 'Kick' : 'Remove')
        .setEmoji('👢')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'block'))
        .setLabel('Block')
        .setEmoji('⛔')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'hide'))
        .setLabel('Hide')
        .setEmoji('🙈')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'show'))
        .setLabel('Show')
        .setEmoji('👁️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buttonId(mode, 'transfer'))
        .setLabel('Transfer')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Secondary)
    ),
  ];

  if (mode === 'voice') {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(buttonId(mode, 'claim'))
          .setLabel('Claim')
          .setEmoji('🙋')
          .setStyle(ButtonStyle.Primary)
      )
    );
  }

  return rows;
};

const buildLimitModal = (userId) => (
  new ModalBuilder()
    .setCustomId(modalId('voice', userId, 'limit'))
    .setTitle('Giới hạn người vào voice')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('limit')
          .setLabel('User limit')
          .setPlaceholder('Nhập 0 để bỏ giới hạn, hoặc 1-99')
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(2)
      )
    )
);

const buildRenameModal = (mode, userId) => (
  new ModalBuilder()
    .setCustomId(modalId(mode, userId, 'rename'))
    .setTitle(mode === 'voice' ? 'Đổi tên voice riêng' : 'Đổi tên channel riêng')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('New name')
          .setPlaceholder(mode === 'voice' ? 'Ví dụ: Phòng của Yaiba' : 'Ví dụ: yaiba-room')
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(32)
      )
    )
);

const buildUserSelect = (mode, userId, action) => (
  new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(selectId(mode, userId, action))
      .setPlaceholder('Chọn một thành viên')
      .setMinValues(1)
      .setMaxValues(1)
  )
);

const baseOverwrites = (guild, userId, mode) => [
  {
    id: guild.roles.everyone.id,
    deny: mode === 'voice'
      ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
      : [PermissionFlagsBits.ViewChannel],
  },
  {
    id: userId,
    allow: ownerPermissions(mode),
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

const editOverwrite = async (channel, id, options) => {
  if (channel.permissionOverwrites?.edit) {
    await channel.permissionOverwrites.edit(id, options);
    return;
  }

  const current = channel.permissionOverwrites.cache.get(id) || { id };
  const next = { ...current, ...options };
  channel.permissionOverwrites.cache.set(id, next);
};

const deleteOverwrite = async (channel, id) => {
  const overwrite = channel.permissionOverwrites?.cache?.get?.(id);
  if (overwrite?.delete) {
    await overwrite.delete();
    return;
  }
  channel.permissionOverwrites?.cache?.delete?.(id);
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

const requireOwnedRoom = async (interaction, mode, actionText) => {
  const channel = findUserRoom(interaction.guild, mode, interaction.user.id);
  if (channel) return channel;

  await interaction.reply({
    content: `Bạn chưa có phòng riêng để ${actionText}.`,
    flags: MessageFlags.Ephemeral,
  });
  return null;
};

const deleteRoom = async (interaction, mode) => {
  const channel = await requireOwnedRoom(interaction, mode, 'xóa');
  if (!channel) return;

  await channel.delete(`Moonlight private ${mode} room deleted by owner ${interaction.user.id}`);
  await interaction.reply({
    content: 'Đã xóa phòng riêng của bạn.',
    flags: MessageFlags.Ephemeral,
  });
};

const renameRoom = async (interaction, mode, rawName) => {
  const channel = await requireOwnedRoom(interaction, mode, 'đổi tên');
  if (!channel) return;

  const normalized = mode === 'voice'
    ? `${VOICE_ROOM_PREFIX}${rawName.trim().slice(0, 28)}`
    : normalizeName(rawName);

  await channel.setName(normalized, `Moonlight private ${mode} room renamed by ${interaction.user.id}`);
  await interaction.reply({
    content: `Đã đổi tên phòng riêng thành **${normalized}**.`,
    flags: MessageFlags.Ephemeral,
  });
};

const setRoomPrivacy = async (interaction, mode, locked) => {
  const channel = await requireOwnedRoom(interaction, mode, 'chỉnh quyền');
  if (!channel) return;

  const everyoneId = interaction.guild.roles.everyone.id;
  const lockedOptions = mode === 'voice'
    ? {
      Connect: false,
    }
    : {
      SendMessages: false,
    };
  const unlockedOptions = mode === 'voice'
    ? {
      Connect: true,
    }
    : {
      SendMessages: true,
    };

  await editOverwrite(channel, everyoneId, locked ? lockedOptions : unlockedOptions);

  await interaction.reply({
    content: locked ? 'Đã khóa phòng riêng của bạn.' : 'Đã mở phòng riêng của bạn.',
    flags: MessageFlags.Ephemeral,
  });
};

const setRoomVisibility = async (interaction, mode, hidden) => {
  const channel = await requireOwnedRoom(interaction, mode, hidden ? 'hide' : 'show');
  if (!channel) return;

  await editOverwrite(channel, interaction.guild.roles.everyone.id, {
    ViewChannel: !hidden,
  });

  await interaction.reply({
    content: hidden ? 'Da an phong rieng cua ban.' : 'Da hien phong rieng cua ban.',
    flags: MessageFlags.Ephemeral,
  });
};

const setVoiceLimit = async (interaction, limit) => {
  const channel = await requireOwnedRoom(interaction, 'voice', 'đặt giới hạn');
  if (!channel) return;

  await channel.setUserLimit(limit);
  await interaction.reply({
    content: limit === 0
      ? 'Đã bỏ giới hạn người vào voice riêng của bạn.'
      : `Đã đặt giới hạn voice riêng thành ${limit} người.`,
    flags: MessageFlags.Ephemeral,
  });
};

const sendUserPicker = async (interaction, mode, action) => {
  const actionText = {
    invite: 'mời thành viên',
    kick: mode === 'voice' ? 'kick thành viên' : 'gỡ quyền thành viên',
    block: 'chặn thành viên',
    transfer: 'chuyển chủ phòng',
  }[action] || 'thao tác';

  const channel = await requireOwnedRoom(interaction, mode, actionText);
  if (!channel) return;

  await interaction.reply({
    content: `Chọn thành viên để ${actionText} trong <#${channel.id}>.`,
    components: [buildUserSelect(mode, interaction.user.id, action)],
    flags: MessageFlags.Ephemeral,
  });
};

const inviteUser = async (interaction, mode, targetId) => {
  const channel = await requireOwnedRoom(interaction, mode, 'mời thành viên');
  if (!channel) return;

  await editOverwrite(channel, targetId, {
    allow: guestPermissions(mode),
    deny: [],
  });

  await interaction.reply({
    content: `Đã mời <@${targetId}> vào phòng <#${channel.id}>.`,
    flags: MessageFlags.Ephemeral,
  });
};

const trustUser = async (interaction, mode, targetId) => {
  const channel = await requireOwnedRoom(interaction, mode, 'trust');
  if (!channel) return;

  if (targetId === interaction.user.id) {
    await interaction.reply({
      content: 'Ban da la chu phong roi.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await editOverwrite(channel, targetId, {
    allow: guestPermissions(mode),
    deny: [],
  });

  await interaction.reply({
    content: `Da trust <@${targetId}> trong phong <#${channel.id}>.`,
    flags: MessageFlags.Ephemeral,
  });
};

const untrustUser = async (interaction, mode, targetId) => {
  const channel = await requireOwnedRoom(interaction, mode, 'untrust');
  if (!channel) return;

  if (targetId === interaction.user.id) {
    await interaction.reply({
      content: 'Ban khong the untrust chinh minh khi dang la chu phong.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await deleteOverwrite(channel, targetId);
  await interaction.reply({
    content: `Da untrust <@${targetId}> khoi phong <#${channel.id}>.`,
    flags: MessageFlags.Ephemeral,
  });
};

const kickUser = async (interaction, mode, targetId) => {
  const channel = await requireOwnedRoom(interaction, mode, mode === 'voice' ? 'kick thành viên' : 'gỡ quyền thành viên');
  if (!channel) return;

  if (targetId === interaction.user.id) {
    await interaction.reply({
      content: 'Bạn là chủ phòng, không thể tự kick khỏi phòng của mình.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (mode === 'voice') {
    const member = interaction.guild.members.cache?.get?.(targetId);
    if (member?.voice?.channelId === channel.id && member.voice.setChannel) {
      await member.voice.setChannel(null).catch(() => null);
    }
  }

  await deleteOverwrite(channel, targetId);
  await interaction.reply({
    content: mode === 'voice'
      ? `Đã kick <@${targetId}> khỏi voice riêng.`
      : `Đã gỡ quyền của <@${targetId}> khỏi channel riêng.`,
    flags: MessageFlags.Ephemeral,
  });
};

const blockUser = async (interaction, mode, targetId) => {
  const channel = await requireOwnedRoom(interaction, mode, 'chặn thành viên');
  if (!channel) return;

  if (targetId === interaction.user.id) {
    await interaction.reply({
      content: 'Bạn không thể tự chặn chính mình khỏi phòng đang sở hữu.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (mode === 'voice') {
    const member = interaction.guild.members.cache?.get?.(targetId);
    if (member?.voice?.channelId === channel.id && member.voice.setChannel) {
      await member.voice.setChannel(null).catch(() => null);
    }
  }

  await editOverwrite(channel, targetId, {
    deny: mode === 'voice'
      ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
      : [PermissionFlagsBits.ViewChannel],
    allow: [],
  });

  await interaction.reply({
    content: `Đã chặn <@${targetId}> khỏi phòng riêng.`,
    flags: MessageFlags.Ephemeral,
  });
};

const transferRoom = async (interaction, mode, targetId) => {
  const channel = await requireOwnedRoom(interaction, mode, 'chuyển chủ phòng');
  if (!channel) return;

  if (targetId === interaction.user.id) {
    await interaction.reply({
      content: 'Người này đang là chủ phòng rồi.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await editOverwrite(channel, targetId, {
    allow: ownerPermissions(mode),
    deny: [],
  });
  await editOverwrite(channel, interaction.user.id, {
    allow: guestPermissions(mode),
    deny: [],
  });

  await interaction.reply({
    content: `Đã chuyển chủ phòng <#${channel.id}> cho <@${targetId}>.`,
    flags: MessageFlags.Ephemeral,
  });
};

const claimVoiceRoom = async (interaction) => {
  const channel = interaction.member?.voice?.channel;
  if (!isPrivateVoiceRoom(channel, interaction.guild)) {
    await interaction.reply({
      content: 'Ban can o trong mot voice rieng de claim.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ownerId = getRoomOwnerId(channel, interaction.guild);
  if (ownerId === interaction.user.id) {
    await interaction.reply({
      content: 'Ban dang la chu phong nay roi.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ownerStillInside = channel.members?.has?.(ownerId);
  if (ownerStillInside) {
    await interaction.reply({
      content: 'Chu phong van con trong voice, chua the claim.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await editOverwrite(channel, interaction.user.id, {
    allow: ownerPermissions('voice'),
    deny: [],
  });

  if (ownerId) {
    await editOverwrite(channel, ownerId, {
      allow: guestPermissions('voice'),
      deny: [],
    });
  }

  await interaction.reply({
    content: `Da claim voice rieng <#${channel.id}>.`,
    flags: MessageFlags.Ephemeral,
  });
};

const parseSetupButton = (customId) => {
  const parts = customId.split(':');
  const [prefix, mode] = parts;
  if (prefix !== SETUP_PREFIX || !['voice', 'channel'].includes(mode)) return null;

  if (parts.length === 3) {
    return { mode, action: parts[2] };
  }

  if (parts.length === 4) {
    return { mode, userId: parts[2], action: parts[3] };
  }

  return null;
};

const parseSetupModal = (customId) => {
  const [prefix, mode, userId, actionWithSuffix] = customId.split(':');
  const action = actionWithSuffix?.replace(/Modal$/, '');
  if (
    prefix !== SETUP_PREFIX
    || !['voice', 'channel'].includes(mode)
    || !userId
    || !['limit', 'rename'].includes(action)
  ) {
    return null;
  }
  return { mode, userId, action };
};

const parseSetupSelect = (customId) => {
  const [prefix, mode, userId, actionWithSuffix] = customId.split(':');
  const action = actionWithSuffix?.replace(/Select$/, '');
  if (
    prefix !== SETUP_PREFIX
    || !['voice', 'channel'].includes(mode)
    || !userId
    || !['invite', 'trust', 'untrust', 'kick', 'block', 'transfer'].includes(action)
  ) {
    return null;
  }
  return { mode, userId, action };
};

const executeSetup = async (interaction) => {
  const mode = interaction.options.getSubcommand();

  await interaction.reply({
    embeds: [buildPanelEmbed(mode)],
    components: buildPanelComponents(mode),
  });
};

const handleComponent = async (interaction) => {
  const parsed = parseSetupButton(interaction.customId);
  if (!parsed) return false;

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

  if (parsed.action === 'rename') {
    await interaction.showModal(buildRenameModal(parsed.mode, interaction.user.id));
    return true;
  }

  if (parsed.action === 'lock' || parsed.action === 'unlock') {
    await setRoomPrivacy(interaction, parsed.mode, parsed.action === 'lock');
    return true;
  }

  if (parsed.action === 'hide' || parsed.action === 'show') {
    await setRoomVisibility(interaction, parsed.mode, parsed.action === 'hide');
    return true;
  }

  if (parsed.action === 'claim' && parsed.mode === 'voice') {
    await claimVoiceRoom(interaction);
    return true;
  }

  if (['invite', 'trust', 'untrust', 'kick', 'block', 'transfer'].includes(parsed.action)) {
    await sendUserPicker(interaction, parsed.mode, parsed.action);
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

  if (parsed.action === 'limit') {
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
  }

  const rawName = interaction.fields.getTextInputValue('name').trim();
  if (rawName.length < 2 || rawName.length > 32) {
    await interaction.reply({
      content: 'Tên phòng phải từ 2 đến 32 ký tự.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  await renameRoom(interaction, parsed.mode, rawName);
  return true;
};

const handleUserSelect = async (interaction) => {
  const parsed = parseSetupSelect(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({
      content: 'Đây không phải lựa chọn setup của bạn.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const targetId = interaction.values[0];

  if (parsed.action === 'invite') {
    await inviteUser(interaction, parsed.mode, targetId);
    return true;
  }

  if (parsed.action === 'trust') {
    await trustUser(interaction, parsed.mode, targetId);
    return true;
  }

  if (parsed.action === 'untrust') {
    await untrustUser(interaction, parsed.mode, targetId);
    return true;
  }

  if (parsed.action === 'kick') {
    await kickUser(interaction, parsed.mode, targetId);
    return true;
  }

  if (parsed.action === 'block') {
    await blockUser(interaction, parsed.mode, targetId);
    return true;
  }

  if (parsed.action === 'transfer') {
    await transferRoom(interaction, parsed.mode, targetId);
    return true;
  }

  return false;
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
  handleUserSelect,

  _private: {
    VOICE_ROOM_PREFIX,
    buildLimitModal,
    buildPanelEmbed,
    buildPanelComponents,
    buildRenameModal,
    buildUserSelect,
    claimVoiceRoom,
    createRoom,
    deleteRoom,
    findUserRoom,
    getRoomOwnerId,
    handleUserSelect,
    inviteUser,
    isPrivateVoiceRoom,
    isUserRoom,
    kickUser,
    parseSetupButton,
    parseSetupModal,
    parseSetupSelect,
    renameRoom,
    roomName,
    setRoomPrivacy,
    setRoomVisibility,
    setVoiceLimit,
    trustUser,
    transferRoom,
    untrustUser,
  },
};
