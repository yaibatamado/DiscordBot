const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const petRepository = require('../../repositories/petRepository');
const { createPetService } = require('../../services/petService');
const { getPetItem } = require('../../data/petItems');
const { adventureAreas, getAdventureArea } = require('../../data/adventureAreas');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const service = createPetService({ repo: petRepository });
const DAY_MS = 24 * 60 * 60 * 1000;
const PET_BUTTON_PREFIX = 'pet';

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes} phút ${seconds} giây`;
};

const formatRelativeTime = (date) => {
  if (!date) return null;

  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>`;
};

const getDisplayName = (pet) => pet.custom_name || pet.name || 'Pet Bí Ẩn';
const getSpeciesName = (pet) => pet.name || 'Chưa rõ';

const statusLabels = {
  active: 'Bình thường',
  sick: 'Bệnh',
  fainted: 'Ngất',
  incubating: 'Đang ấp',
};

const getPetStatusLabel = (status) => statusLabels[status] || 'Bình thường';
const getRequiredExp = (pet) => Math.max(100, (pet.level || 1) * 100);

const getExpPercent = (pet) => {
  const requiredExp = getRequiredExp(pet);
  const currentExp = Math.max(0, pet.exp || 0);
  const percent = Math.min(100, Math.floor((currentExp / requiredExp) * 100));

  return `${pet.level || 1}/${pet.max_level || 150} (${percent}%)`;
};

const petImageUrl = (pet) => (
  pet.image_url ||
  `https://placehold.co/900x500/2b2d31/ffffff/png?text=${encodeURIComponent(getDisplayName(pet))}`
);

const buttonId = (userId, action) => `${PET_BUTTON_PREFIX}:${userId}:${action}`;

const button = (userId, action, label, emoji, style = ButtonStyle.Secondary, disabled = false) => (
  new ButtonBuilder()
    .setCustomId(buttonId(userId, action))
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style)
    .setDisabled(disabled)
);

const buildPetButtons = (userId, pet) => {
  const primaryAction = !pet
    ? button(userId, 'hatch', 'Hatch', '🥚', ButtonStyle.Success)
    : pet.status === 'incubating'
      ? button(userId, 'claim', 'Claim', '🎉', ButtonStyle.Success)
      : button(userId, 'home', 'Pet', '🐾', ButtonStyle.Primary);

  return [
    new ActionRowBuilder().addComponents(
      primaryAction,
      button(userId, 'inventory', 'Inventory', '🎒'),
      button(userId, 'daily', 'Daily', '🎁'),
      button(userId, 'refresh', 'Refresh', '🔄')
    ),
    new ActionRowBuilder().addComponents(
      button(userId, 'adventure', 'Adventure', '🗺️', ButtonStyle.Success),
      button(userId, 'heal', 'Heal', '🧪', ButtonStyle.Success),
      button(userId, 'breakthrough', 'Breakthrough', '⬆️', ButtonStyle.Primary),
      button(userId, 'shop', 'Shop', '🏪', ButtonStyle.Primary),
      button(userId, 'party', 'Party', '👥')
    ),
  ];
};

const buildEggEmbed = ({ title, description, remainingMs, hatchReadyAt }) => createEmbed({
  title,
  description,
  variant: 'pet',
  thumbnail: icons.petEgg,
  fields: [
    { name: 'Trạng thái', value: '🥚 Đang ấp', inline: true },
    {
      name: 'Thời gian',
      value: formatRelativeTime(hatchReadyAt) || (remainingMs === undefined ? '10 phút' : formatDuration(remainingMs)),
      inline: true,
    },
    { name: 'Gợi ý', value: 'Bấm **Claim** khi trứng nở.', inline: true },
  ],
});

const buildPetEmbed = (pet, owner, inventory) => createEmbed({
  title: `🐾 ${getDisplayName(pet)}`,
  description: pet.description || 'Một người bạn đồng hành dễ thương.',
  variant: 'pet',
  image: petImageUrl(pet),
  footer: 'Pet Phase 2',
  fields: [
    { name: 'Chủ nhân', value: owner.username, inline: true },
    { name: 'Loài', value: getSpeciesName(pet), inline: true },
    { name: 'Rarity', value: pet.rarity || 'Common', inline: true },
    { name: 'Trạng thái', value: getPetStatusLabel(pet.status), inline: true },
    { name: 'Level', value: getExpPercent(pet), inline: true },
    { name: 'Coin', value: `🪙 ${inventory?.profile?.coins ?? 0}`, inline: true },
    { name: 'Chủ đề', value: pet.theme || 'Chưa rõ', inline: true },
    { name: 'Thể lực', value: `⚡ ${pet.stamina ?? 100}/${pet.max_stamina ?? 100}`, inline: true },
    { name: 'Sức khỏe', value: `❤️ ${pet.health ?? 100}/100`, inline: true },
    { name: 'Chỉ số chăm sóc', value: [
      `🍗 Độ no: ${pet.hunger ?? 100}/100`,
      `😊 Vui vẻ: ${pet.happiness ?? 100}/100`,
    ].join('\n') },
    { name: 'Chỉ số chiến đấu', value: [
      `⚔️ Công kích: ${pet.attack ?? 0}`,
      `🛡️ Phòng ngự: ${pet.defense ?? 0}`,
      `💨 Tốc độ: ${pet.speed ?? 0}`,
    ].join('\n') },
  ],
});

const buildNoPetEmbed = (owner, inventory) => createEmbed({
  title: '🐾 Hệ thống pet',
  description: `**${owner.username}** chưa có pet. Bấm **Ấp trứng** để bắt đầu.`,
  variant: 'pet',
  thumbnail: icons.petEgg,
  footer: 'Pet Phase 2',
  fields: [
    { name: 'Coin', value: `🪙 ${inventory?.profile?.coins ?? 0}`, inline: true },
    { name: 'Trạng thái', value: 'Chưa có pet', inline: true },
    { name: 'Gợi ý', value: 'Sau khi ấp, trứng sẽ nở sau 10 phút.' },
  ],
});

const formatItemLine = (item) => {
  const meta = getPetItem(item.item_key || item.key);
  return `${meta.icon} **${meta.name}** x${item.quantity}`;
};

const buildInventoryEmbed = (inventory, owner) => {
  const itemLines = inventory.items.length
    ? inventory.items.map(formatItemLine)
    : ['📦 Kho đồ đang trống. Bấm **Phúc Lợi** để nhận vật phẩm đầu tiên.'];

  return createEmbed({
    title: '🎒 Hành Trang',
    description: `Kho tài nguyên global của **${owner.username}**.`,
    variant: 'pet',
    thumbnail: icons.petEgg,
    footer: 'Pet Phase 2',
    fields: [
      { name: 'Coin', value: `🪙 ${inventory.profile?.coins ?? 0}`, inline: true },
      {
        name: 'Daily tiếp theo',
        value: inventory.profile?.last_daily_at
          ? formatRelativeTime(new Date(new Date(inventory.profile.last_daily_at).getTime() + DAY_MS))
          : 'Có thể nhận ngay',
        inline: true,
      },
      { name: 'Vật phẩm', value: itemLines.join('\n') },
    ],
  });
};

const buildDailyEmbed = (result) => {
  const rewardLines = [
    `🪙 Coin x${result.rewards.coins}`,
    ...result.rewards.items.map(formatItemLine),
  ];

  return createEmbed({
    title: '🎁 Đã nhận phúc lợi',
    description: 'Một ít tài nguyên để chuẩn bị cho phiêu lưu và chữa trị sau này.',
    variant: 'pet',
    thumbnail: icons.petEgg,
    footer: 'Pet Phase 2',
    fields: [
      { name: 'Phần thưởng', value: rewardLines.join('\n') },
      { name: 'Coin hiện có', value: `🪙 ${result.profile?.coins ?? 0}`, inline: true },
      {
        name: 'Phúc lợi tiếp theo',
        value: formatRelativeTime(new Date(new Date(result.profile.last_daily_at).getTime() + DAY_MS)),
        inline: true,
      },
    ],
  });
};

const buildDailyCooldownEmbed = (result) => createEmbed({
  title: '⏳ Phúc lợi chưa sẵn sàng',
  description: 'Bạn đã nhận phúc lợi hôm nay rồi. Quay lại khi cooldown kết thúc.',
  variant: 'pet',
  thumbnail: icons.petEgg,
  footer: 'Pet Phase 2',
  fields: [
    { name: 'Thời gian còn lại', value: formatRelativeTime(result.nextDailyAt) || formatDuration(result.remainingMs), inline: true },
    { name: 'Coin hiện có', value: `🪙 ${result.profile?.coins ?? 0}`, inline: true },
  ],
});

const buildAdventureEmbed = (result) => {
  const rewardLines = [
    `🪙 Coin +${result.rewards.coins}`,
    `✨ EXP +${result.rewards.exp}`,
    ...result.rewards.items.map(formatItemLine),
  ];
  const riskLines = [
    result.damage > 0
      ? `❤️ Sức khỏe -${result.damage}`
      : '🍀 Không bị thương',
  ];
  if (result.becameSick) riskLines.push('🤒 Bị bệnh');

  return createEmbed({
    title: '🗺️ Phiêu lưu hoàn tất',
    description: `${getDisplayName(result.pet)} đã trở về sau chuyến đi solo.`,
    variant: 'pet',
    image: petImageUrl(result.pet),
    footer: 'Pet Phase 3',
    fields: [
      { name: 'Khu vực', value: `${result.area?.icon || '🗺️'} ${result.area?.name || 'Đồng Cỏ Bình Yên'}` },
      { name: 'Phần thưởng', value: rewardLines.join('\n') },
      ...(result.partyBonus?.extraMaterials > 0 ? [{
        name: 'Party Bonus',
        value: [
          `👥 ${result.partyBonus.memberCount} thành viên`,
          `🎒 +${result.partyBonus.extraMaterials} nguyên liệu cho mỗi loại chính`,
        ].join('\n'),
        inline: true,
      }] : []),
      ...(result.levelsGained > 0 ? [{
        name: '⬆️ Level Up!',
        value: [
          `Level ${result.previousLevel} → ${result.pet.level}`,
          `⚔️ Công kích +${result.levelsGained * 3}`,
          `🛡️ Phòng ngự +${result.levelsGained * 2}`,
          `💨 Tốc độ +${result.levelsGained * 2}`,
        ].join('\n'),
      }] : []),
      { name: 'Rủi ro', value: riskLines.join('\n'), inline: true },
      { name: 'Thể lực còn lại', value: `⚡ ${result.pet.stamina}/${result.pet.max_stamina ?? 100}`, inline: true },
      { name: 'Sức khỏe', value: `❤️ ${result.pet.health}/100`, inline: true },
    ],
  });
};

const buildAdventureBlockedEmbed = (result) => {
  if (result.type === 'adventure_level_required') {
    return createEmbed({
      title: '📈 Chưa đủ level',
      description: `Khu vực **${result.area.name}** yêu cầu level **${result.requiredLevel}**.`,
      variant: 'pet',
      thumbnail: icons.petEgg,
      fields: [
        { name: 'Level hiện tại', value: `${result.pet?.level ?? 1}`, inline: true },
      ],
    });
  }

  if (result.type === 'not_enough_stamina') {
    return createEmbed({
      title: '⚡ Chưa đủ thể lực',
      description: `Cần **${result.requiredStamina}** thể lực để phiêu lưu.`,
      variant: 'pet',
      thumbnail: icons.petEgg,
      fields: [
        { name: 'Thể lực hiện tại', value: `⚡ ${result.pet?.stamina ?? 0}/${result.pet?.max_stamina ?? 100}`, inline: true },
        { name: 'Gợi ý', value: 'Chờ thể lực hồi theo thời gian rồi bấm **Làm Mới**.' },
      ],
    });
  }

  return createEmbed({
    title: '🚫 Chưa thể phiêu lưu',
    description: result.type === 'not_active'
      ? 'Pet chưa sẵn sàng hoặc đang không ở trạng thái bình thường.'
      : 'Bạn chưa có pet. Hãy ấp trứng trước.',
    variant: 'pet',
    thumbnail: icons.petEgg,
  });
};

const buildAdventureAreasEmbed = (pet) => createEmbed({
  title: '🗺️ Chọn khu vực phiêu lưu',
  description: 'Khu vực khó hơn tốn nhiều thể lực và có rủi ro cao hơn, nhưng phần thưởng tốt hơn.',
  variant: 'pet',
  thumbnail: icons.petEgg,
  footer: 'Pet Phase 5',
  fields: [
    { name: 'Level', value: `${pet.level ?? 1}`, inline: true },
    { name: 'Thể lực', value: `⚡ ${pet.stamina ?? 0}/${pet.max_stamina ?? 100}`, inline: true },
    {
      name: 'Khu vực',
      value: Object.values(adventureAreas)
        .map((area) => `${area.icon} **${area.name}** · Level ${area.minLevel} · ${area.staminaCost} thể lực`)
        .join('\n'),
    },
  ],
});

const buildAdventureAreaComponents = (userId) => [
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`petadventure:${userId}`)
      .setPlaceholder('Chọn khu vực muốn khám phá')
      .addOptions(Object.values(adventureAreas).map((area) => ({
        label: area.name,
        value: area.key,
        emoji: area.icon,
        description: `Level ${area.minLevel} · ${area.staminaCost} thể lực`,
      })))
  ),
  new ActionRowBuilder().addComponents(
    button(userId, 'home', 'Back', '⬅️')
  ),
];

const buildHealEmbed = (result) => createEmbed({
  title: '🧪 Chữa trị thành công',
  description: `${getDisplayName(result.pet)} đã được hồi phục.`,
  variant: 'pet',
  image: petImageUrl(result.pet),
  footer: 'Pet Phase 3',
  fields: [
    { name: 'Thuốc đã dùng', value: '🧪 Thuốc Hồi Phục x1', inline: true },
    { name: 'Hồi phục', value: `❤️ +${result.healedAmount}`, inline: true },
    { name: 'Sức khỏe', value: `❤️ ${result.pet.health}/100`, inline: true },
    { name: 'Trạng thái', value: getPetStatusLabel(result.pet.status), inline: true },
    ...(result.curedSickness ? [
      { name: 'Bệnh', value: 'Đã chữa khỏi', inline: true },
    ] : []),
  ],
});

const buildHealBlockedEmbed = (result) => {
  const messages = {
    missing_healing_potion: 'Bạn không có Thuốc Hồi Phục. Có thể kiếm thuốc từ daily hoặc adventure.',
    already_healthy: 'Pet đang khỏe mạnh, chưa cần dùng thuốc.',
    not_active: 'Pet chưa sẵn sàng để chữa trị.',
    not_found: 'Bạn chưa có pet. Hãy ấp trứng trước.',
  };

  return createEmbed({
    title: '🧪 Chưa thể chữa trị',
    description: messages[result.type] || 'Không thể chữa trị lúc này.',
    variant: 'pet',
    thumbnail: icons.petEgg,
    fields: result.pet ? [
      { name: 'Sức khỏe', value: `❤️ ${result.pet.health ?? 0}/100`, inline: true },
      { name: 'Trạng thái', value: getPetStatusLabel(result.pet.status), inline: true },
    ] : [],
  });
};

const buildBreakthroughEmbed = (result) => createEmbed({
  title: '⬆️ Đột phá thành công',
  description: `${getDisplayName(result.pet)} đã bước sang rarity mới.`,
  variant: 'pet',
  image: petImageUrl(result.pet),
  footer: 'Pet Phase 4',
  fields: [
    { name: 'Rarity', value: `${result.previousRarity} → ${result.nextRarity}`, inline: true },
    { name: 'Giới hạn level mới', value: `${result.pet.max_level}`, inline: true },
    { name: 'Level hiện tại', value: `${result.pet.level}`, inline: true },
  ],
});

const buildBreakthroughBlockedEmbed = (result) => {
  let description = 'Pet chưa thể đột phá lúc này.';
  const fields = [];

  if (result.type === 'breakthrough_level_required') {
    description = `Pet cần đạt **level ${result.requiredLevel}** trước khi đột phá.`;
    fields.push({
      name: 'Tiến độ',
      value: `${result.pet.level}/${result.requiredLevel}`,
      inline: true,
    });
  }

  if (result.type === 'breakthrough_materials_required') {
    description = `Đã đủ level để lên **${result.nextRarity}**, nhưng còn thiếu vật liệu.`;
    fields.push({
      name: 'Vật liệu cần',
      value: result.requirements
        .map((item) => {
          const meta = getPetItem(item.key);
          return `${meta.icon} ${meta.name} x${item.quantity}`;
        })
        .join('\n'),
    });
  }

  if (result.type === 'max_rarity') {
    description = 'Pet đã đạt Divine, không còn rarity cao hơn.';
  }

  return createEmbed({
    title: '⬆️ Chưa thể đột phá',
    description,
    variant: 'pet',
    thumbnail: icons.petEgg,
    fields,
  });
};

const buildShopEmbed = (shop, selectedItemKey) => {
  const selected = shop.catalog.find((item) => item.key === selectedItemKey);
  const selectedMeta = selected ? getPetItem(selected.key) : null;

  return createEmbed({
    title: '🏪 Cửa Hàng Pet',
    description: 'Chọn vật phẩm bên dưới, sau đó chọn số lượng muốn mua.',
    variant: 'pet',
    thumbnail: icons.petEgg,
    footer: 'Pet Phase 4',
    fields: [
      { name: 'Coin', value: `🪙 ${shop.profile?.coins ?? 0}`, inline: true },
      {
        name: 'Đang chọn',
        value: selected
          ? `${selectedMeta.icon} **${selectedMeta.name}**\nGiá: 🪙 ${selected.price}/vật phẩm`
          : 'Chưa chọn vật phẩm',
        inline: true,
      },
      {
        name: 'Danh mục',
        value: shop.catalog
          .map((item) => {
            const meta = getPetItem(item.key);
            return `${meta.icon} ${meta.name}: 🪙 ${item.price}`;
          })
          .join('\n'),
      },
    ],
  });
};

const buildShopComponents = (userId, catalog, selectedItemKey) => {
  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`petshop:${userId}`)
      .setPlaceholder('Chọn vật phẩm muốn mua')
      .addOptions(catalog.map((item) => {
        const meta = getPetItem(item.key);
        return {
          label: meta.name,
          value: item.key,
          description: `${item.price} coin mỗi vật phẩm`,
          emoji: meta.icon,
          default: item.key === selectedItemKey,
        };
      }))
  );

  if (!selectedItemKey) {
    return [
      selectRow,
      new ActionRowBuilder().addComponents(
        button(userId, 'home', 'Back', '⬅️')
      ),
    ];
  }

  return [
    selectRow,
    new ActionRowBuilder().addComponents(
      ...[1, 5, 10].map((quantity) =>
        new ButtonBuilder()
          .setCustomId(`petbuy:${userId}:${selectedItemKey}:${quantity}`)
          .setLabel(`Buy x${quantity}`)
          .setStyle(ButtonStyle.Success)
      ),
      button(userId, 'home', 'Back', '⬅️')
    ),
  ];
};

const buildPurchaseEmbed = (result) => {
  const meta = getPetItem(result.item.key);

  if (result.type === 'not_enough_coins') {
    return createEmbed({
      title: '🪙 Không đủ coin',
      description: `Cần **${result.totalPrice} coin** để mua ${meta.name} x${result.quantity}.`,
      variant: 'pet',
      thumbnail: icons.petEgg,
      fields: [
        { name: 'Coin hiện có', value: `🪙 ${result.profile?.coins ?? 0}`, inline: true },
      ],
    });
  }

  return createEmbed({
    title: '✅ Mua hàng thành công',
    description: `${meta.icon} Đã mua **${meta.name} x${result.quantity}**.`,
    variant: 'pet',
    thumbnail: icons.petEgg,
    fields: [
      { name: 'Đã trả', value: `🪙 ${result.totalPrice}`, inline: true },
      { name: 'Coin còn lại', value: `🪙 ${result.profile?.coins ?? 0}`, inline: true },
    ],
  });
};

const formatPartyLine = (party) => {
  const area = getAdventureArea(party.area_key) || adventureAreas.meadow;
  const memberCount = party.member_count ?? party.members?.length ?? 0;
  const members = party.members?.length
    ? party.members.map((member) => member.display_name || member.user_id).join(', ')
    : 'Chưa rõ';

  return [
    `**#${party.party_id} · ${area.icon} ${area.name}**`,
    `Trưởng nhóm: <@${party.leader_user_id}> · Thành viên: **${memberCount}/6**`,
    `Đội hình: ${members}`,
  ].join('\n');
};

const buildPartyEmbed = ({ currentParty, parties }) => {
  const visibleParties = parties.length
    ? parties.map(formatPartyLine).join('\n\n')
    : 'Chưa có party công khai nào. Bấm **Tạo Party** để mở phòng global.';

  return createEmbed({
    title: '👥 Party Phiêu Lưu',
    description: 'Phòng party global, có thể gặp người chơi ở mọi server.',
    variant: 'pet',
    thumbnail: icons.petEgg,
    footer: 'Pet Phase 5',
    fields: [
      { name: 'Danh sách phòng', value: visibleParties },
      {
        name: 'Party của bạn',
        value: currentParty ? formatPartyLine(currentParty) : 'Chưa tham gia party nào.',
      },
      {
        name: 'Ghi chú',
        value: 'Bản này mới là sảnh party. Phase sau sẽ cho adventure theo party để tăng rơi nguyên liệu.',
      },
    ],
  });
};

const buildPartyComponents = (userId, parties, currentParty) => {
  const rows = [];
  const joinableParties = parties
    .filter((party) => Number(party.member_count ?? party.members?.length ?? 0) < 6)
    .slice(0, 25);

  if (!currentParty && joinableParties.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`petpartyjoin:${userId}`)
        .setPlaceholder('Chọn party muốn tham gia')
        .addOptions(joinableParties.map((party) => {
          const area = getAdventureArea(party.area_key) || adventureAreas.meadow;
          const memberCount = party.member_count ?? party.members?.length ?? 0;
          return {
            label: `Party #${party.party_id}`,
            value: String(party.party_id),
            emoji: area.icon,
            description: `${area.name} · ${memberCount}/6 thành viên`,
          };
        }))
    ));
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`petparty:${userId}:create`)
      .setLabel('Create Party')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(currentParty)),
    new ButtonBuilder()
      .setCustomId(`petparty:${userId}:leave`)
      .setLabel('Leave Party')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!currentParty),
    new ButtonBuilder()
      .setCustomId(`petparty:${userId}:refresh`)
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
    button(userId, 'home', 'Back', '⬅️')
  ));

  return rows;
};

const partyPayload = async (interaction) => {
  const [currentParty, list] = await Promise.all([
    petRepository.getUserParty(interaction.user.id),
    service.listParties(),
  ]);

  return {
    embeds: [buildPartyEmbed({ currentParty, parties: list.parties })],
    components: buildPartyComponents(interaction.user.id, list.parties, currentParty),
  };
};

const makePayload = (userId, embed, pet) => ({
  embeds: [embed],
  components: buildPetButtons(userId, pet),
});

const dashboardPayload = async (interaction) => {
  const userId = interaction.user.id;
  const [petResult, inventory] = await Promise.all([
    service.info(userId),
    service.inventory(userId),
  ]);

  if (petResult.type === 'found' && petResult.pet.status === 'incubating') {
    return makePayload(
      userId,
      buildEggEmbed({
        title: '🥚 Trứng đang được ấp',
        description: 'Trứng vẫn còn ấm. Hãy đợi thêm một chút trước khi claim.',
        hatchReadyAt: petResult.pet.hatch_ready_at,
      }),
      petResult.pet
    );
  }

  if (petResult.type === 'found') {
    return makePayload(userId, buildPetEmbed(petResult.pet, interaction.user, inventory), petResult.pet);
  }

  return makePayload(userId, buildNoPetEmbed(interaction.user, inventory), null);
};

const sendOrUpdate = async (interaction, payload) => {
  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
    return interaction.update(payload);
  }

  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
};

const replyResult = async (interaction, result) => {
  const userId = interaction.user.id;

  if (result.type === 'egg_created') {
    return sendOrUpdate(interaction, makePayload(
      userId,
      buildEggEmbed({
        title: '🥚 Trứng pet đã bắt đầu ấp',
        description: 'Một sinh linh nhỏ đang ngủ trong quả trứng. Hãy quay lại khi trứng nở.',
        hatchReadyAt: result.pet.hatch_ready_at,
      }),
      result.pet
    ));
  }

  if (result.type === 'egg_already_incubating' || result.type === 'egg_not_ready') {
    return sendOrUpdate(interaction, makePayload(
      userId,
      buildEggEmbed({
        title: '🥚 Trứng đang được ấp',
        description: 'Trứng vẫn còn ấm. Hãy đợi thêm một chút trước khi claim.',
        remainingMs: result.remainingMs,
        hatchReadyAt: result.hatchReadyAt || result.pet?.hatch_ready_at,
      }),
      result.pet || { status: 'incubating' }
    ));
  }

  if (result.type === 'already_has_pet' || result.type === 'already_claimed' || result.type === 'pet_claimed') {
    return sendOrUpdate(interaction, await dashboardPayload(interaction));
  }

  if (result.type === 'inventory') {
    return sendOrUpdate(interaction, makePayload(userId, buildInventoryEmbed(result, interaction.user), null));
  }

  if (result.type === 'daily_claimed') {
    return sendOrUpdate(interaction, makePayload(userId, buildDailyEmbed(result), null));
  }

  if (result.type === 'daily_cooldown') {
    return sendOrUpdate(interaction, makePayload(userId, buildDailyCooldownEmbed(result), null));
  }

  if (result.type === 'adventure_completed') {
    return sendOrUpdate(interaction, makePayload(userId, buildAdventureEmbed(result), result.pet));
  }

  if (
    result.type === 'not_enough_stamina' ||
    result.type === 'adventure_level_required' ||
    result.type === 'not_active'
  ) {
    return sendOrUpdate(interaction, makePayload(userId, buildAdventureBlockedEmbed(result), result.pet));
  }

  if (result.type === 'heal_completed') {
    return sendOrUpdate(interaction, makePayload(userId, buildHealEmbed(result), result.pet));
  }

  if (result.type === 'missing_healing_potion' || result.type === 'already_healthy') {
    return sendOrUpdate(interaction, makePayload(userId, buildHealBlockedEmbed(result), result.pet));
  }

  if (result.type === 'breakthrough_completed') {
    return sendOrUpdate(interaction, makePayload(userId, buildBreakthroughEmbed(result), result.pet));
  }

  if (
    result.type === 'breakthrough_level_required' ||
    result.type === 'breakthrough_materials_required' ||
    result.type === 'max_rarity'
  ) {
    return sendOrUpdate(interaction, makePayload(userId, buildBreakthroughBlockedEmbed(result), result.pet));
  }

  return sendOrUpdate(interaction, await dashboardPayload(interaction));
};

const parsePetButton = (customId) => {
  const [prefix, userId, action] = customId.split(':');
  if (prefix !== PET_BUTTON_PREFIX || !userId || !action) return null;
  return { userId, action };
};

const parseShopComponent = (customId) => {
  const [prefix, userId, itemKey, quantity] = customId.split(':');
  if (prefix === 'petshop' && userId) {
    return { type: 'shop_select', userId };
  }
  if (prefix === 'petadventure' && userId) {
    return { type: 'adventure_select', userId };
  }
  if (prefix === 'petbuy' && userId && itemKey && quantity) {
    return {
      type: 'shop_buy',
      userId,
      itemKey,
      quantity: Number(quantity),
    };
  }
  return null;
};

const parsePartyComponent = (customId) => {
  const [prefix, userId, action] = customId.split(':');
  if (prefix === 'petparty' && userId && action) {
    return { type: 'party_button', userId, action };
  }
  if (prefix === 'petpartyjoin' && userId) {
    return { type: 'party_join_select', userId };
  }
  return null;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Mở giao diện chính của hệ pet'),

  async execute(interaction) {
    try {
      return sendOrUpdate(interaction, await dashboardPayload(interaction));
    } catch (err) {
      return interaction.reply({
        content: `❌ Chưa kết nối được SQL Server cho hệ pet.\n\`${err.message}\``,
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  async handleComponent(interaction) {
    const parsed = parsePetButton(interaction.customId) || parseShopComponent(interaction.customId) || parsePartyComponent(interaction.customId);
    if (!parsed) return false;

    if (parsed.userId !== interaction.user.id) {
      await interaction.reply({
        content: 'Đây không phải menu pet của bạn.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    try {
      if (parsed.type === 'adventure_select') {
        await replyResult(
          interaction,
          await service.adventure(interaction.user.id, interaction.values[0])
        );
        return true;
      }

      if (parsed.type === 'party_join_select') {
        await service.joinParty(
          interaction.user.id,
          interaction.user.username,
          Number(interaction.values[0])
        );
        await sendOrUpdate(interaction, await partyPayload(interaction));
        return true;
      }

      if (parsed.type === 'party_button') {
        if (parsed.action === 'create') {
          await service.createParty(interaction.user.id, interaction.user.username);
        }

        if (parsed.action === 'leave') {
          await service.leaveParty(interaction.user.id);
        }

        await sendOrUpdate(interaction, await partyPayload(interaction));
        return true;
      }

      if (parsed.type === 'shop_select') {
        const shop = await service.shop(interaction.user.id);
        const selectedItemKey = interaction.values[0];
        await sendOrUpdate(interaction, {
          embeds: [buildShopEmbed(shop, selectedItemKey)],
          components: buildShopComponents(interaction.user.id, shop.catalog, selectedItemKey),
        });
        return true;
      }

      if (parsed.type === 'shop_buy') {
        const result = await service.purchase(
          interaction.user.id,
          parsed.itemKey,
          parsed.quantity
        );
        const shop = await service.shop(interaction.user.id);
        await sendOrUpdate(interaction, {
          embeds: [buildPurchaseEmbed(result)],
          components: buildShopComponents(interaction.user.id, shop.catalog, parsed.itemKey),
        });
        return true;
      }

      if (parsed.action === 'home' || parsed.action === 'refresh') {
        await sendOrUpdate(interaction, await dashboardPayload(interaction));
        return true;
      }

      if (parsed.action === 'hatch') {
        await replyResult(interaction, await service.hatch(interaction.user.id));
        return true;
      }

      if (parsed.action === 'claim') {
        await replyResult(interaction, await service.claim(interaction.user.id));
        return true;
      }

      if (parsed.action === 'inventory') {
        await replyResult(interaction, await service.inventory(interaction.user.id));
        return true;
      }

      if (parsed.action === 'daily') {
        await replyResult(interaction, await service.daily(interaction.user.id));
        return true;
      }

      if (parsed.action === 'adventure') {
        const petResult = await service.info(interaction.user.id);
        if (petResult.type !== 'found' || petResult.pet.status !== 'active') {
          await replyResult(interaction, {
            type: petResult.type === 'found' ? 'not_active' : 'not_found',
            pet: petResult.pet,
          });
          return true;
        }
        await sendOrUpdate(interaction, {
          embeds: [buildAdventureAreasEmbed(petResult.pet)],
          components: buildAdventureAreaComponents(interaction.user.id),
        });
        return true;
      }

      if (parsed.action === 'heal') {
        await replyResult(interaction, await service.heal(interaction.user.id));
        return true;
      }

      if (parsed.action === 'breakthrough') {
        await replyResult(interaction, await service.breakthrough(interaction.user.id));
        return true;
      }

      if (parsed.action === 'shop') {
        const shop = await service.shop(interaction.user.id);
        await sendOrUpdate(interaction, {
          embeds: [buildShopEmbed(shop)],
          components: buildShopComponents(interaction.user.id, shop.catalog),
        });
        return true;
      }

      if (parsed.action === 'party') {
        await sendOrUpdate(interaction, await partyPayload(interaction));
        return true;
      }
    } catch (err) {
      await interaction.reply({
        content: `❌ Chưa xử lý được thao tác pet.\n\`${err.message}\``,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await interaction.reply({
      content: 'Chức năng này sẽ được mở ở phase sau.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  },

  _private: {
    buildPetEmbed,
    buildInventoryEmbed,
    buildDailyEmbed,
    buildAdventureEmbed,
    buildAdventureAreasEmbed,
    buildAdventureAreaComponents,
    buildHealEmbed,
    buildBreakthroughEmbed,
    buildShopEmbed,
    buildShopComponents,
    buildPartyEmbed,
    buildPartyComponents,
    buildPetButtons,
    getExpPercent,
    getPetStatusLabel,
    parsePetButton,
    parseShopComponent,
    parsePartyComponent,
  },
};

