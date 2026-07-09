const { themeMaterials } = require('./petProgression');

const petItems = {
  healing_potion: {
    key: 'healing_potion',
    name: 'Thuốc Hồi Phục',
    icon: '🧪',
    description: 'Dùng để hồi phục sức khỏe pet trong các phase sau.',
  },
  common_essence: {
    key: 'common_essence',
    name: 'Tinh Hoa Thường',
    icon: '✨',
    description: 'Nguyên liệu cơ bản dùng cho đột phá và chế tạo.',
  },
};

Object.values(themeMaterials).forEach((material) => {
  petItems[material.key] = {
    ...material,
    description: 'Nguyên liệu chủ đề dùng để đột phá rarity pet.',
  };
});

const getPetItem = (key) => petItems[key] || {
  key,
  name: key,
  icon: '📦',
  description: 'Vật phẩm chưa rõ công dụng.',
};

module.exports = {
  petItems,
  getPetItem,
};
