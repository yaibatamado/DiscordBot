const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine'];

const rarityCaps = {
  Common: 20,
  Rare: 40,
  Epic: 70,
  Legendary: 100,
  Mythic: 130,
  Divine: 150,
};

const breakthroughCosts = {
  Common: { commonEssence: 20, themeMaterial: 5 },
  Rare: { commonEssence: 50, themeMaterial: 10 },
  Epic: { commonEssence: 100, themeMaterial: 20 },
  Legendary: { commonEssence: 200, themeMaterial: 35 },
  Mythic: { commonEssence: 400, themeMaterial: 60 },
};

const themeMaterials = {
  'Động Vật Dễ Thương': { key: 'theme_cute_animal', name: 'Mầm Tim Muông Thú', icon: '🐾' },
  'Rừng Phép Thuật': { key: 'theme_magic_forest', name: 'Lá Phép Rừng Xanh', icon: '🌿' },
  'Rồng Và Linh Thú': { key: 'theme_dragon_spirit', name: 'Vảy Linh Long', icon: '🐉' },
  'Biển Sâu': { key: 'theme_deep_sea', name: 'Ngọc Biển Sâu', icon: '🌊' },
  'Bầu Trời Và Mây': { key: 'theme_sky_cloud', name: 'Lông Vũ Thiên Không', icon: '☁️' },
  'Băng Tuyết': { key: 'theme_ice_snow', name: 'Tinh Thạch Băng Tuyết', icon: '❄️' },
  'Lửa Và Dung Nham': { key: 'theme_fire_lava', name: 'Lõi Dung Nham', icon: '🔥' },
  'Bóng Đêm': { key: 'theme_darkness', name: 'Mảnh Đêm Sâu', icon: '🌙' },
  'Ánh Sáng': { key: 'theme_light', name: 'Giọt Quang Minh', icon: '☀️' },
  'Đồ Ngọt Và Đồ Chơi': { key: 'theme_sweets_toys', name: 'Kẹo Sao Kỳ Diệu', icon: '🍬' },
  'Cơ Khí Dễ Thương': { key: 'theme_cute_machine', name: 'Lõi Cơ Khí Nhỏ', icon: '⚙️' },
  'Huyền Thoại Đặc Biệt': { key: 'theme_special_legend', name: 'Mảnh Huyền Thoại', icon: '💎' },
};

const getRarityCap = (rarity) => rarityCaps[rarity] || rarityCaps.Common;

const getNextRarity = (rarity) => {
  const index = rarityOrder.indexOf(rarity);
  return index >= 0 && index < rarityOrder.length - 1 ? rarityOrder[index + 1] : null;
};

const getThemeMaterial = (theme) => themeMaterials[theme] || {
  key: 'theme_unknown',
  name: 'Mảnh Chủ Đề Bí Ẩn',
  icon: '🔮',
};

module.exports = {
  rarityOrder,
  rarityCaps,
  breakthroughCosts,
  themeMaterials,
  getRarityCap,
  getNextRarity,
  getThemeMaterial,
};
