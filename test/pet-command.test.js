const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('pet slash command opens the main dashboard without subcommands', () => {
  const pet = freshRequire('../commands/game/pet');
  const json = pet.data.toJSON();

  assert.equal(json.name, 'pet');
  assert.equal(json.description, 'Mở giao diện chính của hệ pet');
  assert.deepEqual(json.options, []);
});

test('pet info embed shows status, level exp percent, and species', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildPetEmbed({
    name: 'Hồ Ly Tuyết',
    custom_name: 'Ancuc',
    theme: 'Băng Tuyết',
    rarity: 'Epic',
    status: 'active',
    level: 2,
    max_level: 150,
    exp: 50,
  }, { username: 'yaibatamado' }, { profile: { coins: 150 } });

  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));

  assert.equal(fields['Trạng thái'], 'Bình thường');
  assert.equal(fields.Level, '2/150 (25%)');
  assert.equal(fields['Loài'], 'Hồ Ly Tuyết');
  assert.equal(fields.Coin, '🪙 150');
  assert.equal(fields.EXP, undefined);
});

test('pet inventory embed shows coins and item names', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildInventoryEmbed({
    profile: { coins: 150, last_daily_at: null },
    items: [{ item_key: 'healing_potion', quantity: 2 }],
  }, { username: 'yaibatamado' });

  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));

  assert.equal(fields.Coin, '🪙 150');
  assert.match(fields['Vật phẩm'], /Thuốc Hồi Phục/);
});

test('pet dashboard buttons include owner-scoped actions', () => {
  const pet = freshRequire('../commands/game/pet');
  const rows = pet._private.buildPetButtons('user-1', { status: 'active' });
  const components = rows.flatMap((row) => row.components);
  const ids = components.map((component) => component.data.custom_id);
  const adventure = components.find((component) => component.data.custom_id === 'pet:user-1:adventure');
  const heal = components.find((component) => component.data.custom_id === 'pet:user-1:heal');
  const breakthrough = components.find((component) => component.data.custom_id === 'pet:user-1:breakthrough');
  const party = components.find((component) => component.data.custom_id === 'pet:user-1:party');

  assert.ok(ids.includes('pet:user-1:home'));
  assert.ok(ids.includes('pet:user-1:inventory'));
  assert.ok(ids.includes('pet:user-1:daily'));
  assert.equal(adventure.data.disabled, false);
  assert.equal(heal.data.disabled, false);
  assert.equal(breakthrough.data.disabled, false);
  assert.equal(party.data.disabled, false);
  assert.deepEqual(pet._private.parsePetButton('pet:user-1:daily'), {
    userId: 'user-1',
    action: 'daily',
  });
});

test('pet breakthrough embed shows rarity upgrade and new cap', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildBreakthroughEmbed({
    previousRarity: 'Common',
    nextRarity: 'Rare',
    pet: {
      name: 'Mèo Bông Nhỏ',
      custom_name: 'Bông',
      rarity: 'Rare',
      max_level: 40,
    },
  });
  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));

  assert.equal(fields['Rarity'], 'Common → Rare');
  assert.equal(fields['Giới hạn level mới'], '40');
});

test('pet shop shows products and quantity buttons', () => {
  const pet = freshRequire('../commands/game/pet');
  const shop = {
    profile: { coins: 500 },
    catalog: [
      { key: 'healing_potion', price: 100 },
      { key: 'common_essence', price: 30 },
    ],
  };
  const embed = pet._private.buildShopEmbed(shop, 'healing_potion');
  const rows = pet._private.buildShopComponents('user-1', shop.catalog, 'healing_potion');
  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));
  const ids = rows.flatMap((row) => row.components.map((component) => component.data.custom_id));

  assert.equal(fields.Coin, '🪙 500');
  assert.match(fields['Đang chọn'], /Thuốc Hồi Phục/);
  assert.ok(ids.includes('petshop:user-1'));
  assert.ok(ids.includes('petbuy:user-1:healing_potion:1'));
  assert.ok(ids.includes('petbuy:user-1:healing_potion:5'));
  assert.ok(ids.includes('petbuy:user-1:healing_potion:10'));
});

test('pet heal embed shows potion usage and health', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildHealEmbed({
    healedAmount: 50,
    curedSickness: true,
    pet: {
      name: 'Hồ Ly Tuyết',
      custom_name: 'Ancuc',
      health: 50,
      status: 'active',
    },
  });
  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));

  assert.equal(fields['Thuốc đã dùng'], '🧪 Thuốc Hồi Phục x1');
  assert.equal(fields['Hồi phục'], '❤️ +50');
  assert.equal(fields['Sức khỏe'], '❤️ 50/100');
  assert.equal(fields['Trạng thái'], 'Bình thường');
  assert.equal(fields['Bệnh'], 'Đã chữa khỏi');
});

test('pet adventure embed shows rewards and remaining stats', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildAdventureEmbed({
    rewards: {
      coins: 40,
      exp: 25,
      items: [{ key: 'common_essence', quantity: 2 }],
    },
    damage: 7,
    becameSick: true,
    previousLevel: 1,
    levelsGained: 1,
    partyBonus: {
      memberCount: 3,
      extraMaterials: 2,
    },
    pet: {
      name: 'Hồ Ly Tuyết',
      custom_name: 'Ancuc',
      stamina: 80,
      max_stamina: 100,
      health: 93,
      level: 2,
    },
  });
  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));

  assert.match(fields['Phần thưởng'], /Coin \+40/);
  assert.match(fields['Phần thưởng'], /EXP \+25/);
  assert.match(fields['Phần thưởng'], /Tinh Hoa Thường/);
  assert.match(fields['Rủi ro'], /Sức khỏe -7/);
  assert.match(fields['Rủi ro'], /Bị bệnh/);
  assert.equal(fields['Thể lực còn lại'], '⚡ 80/100');
  assert.match(fields['⬆️ Level Up!'], /Level 1 → 2/);
  assert.match(fields['⬆️ Level Up!'], /Công kích \+3/);
});

test('pet adventure area menu lists level and stamina requirements', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildAdventureAreasEmbed({
    level: 20,
    stamina: 70,
    max_stamina: 100,
  });
  const rows = pet._private.buildAdventureAreaComponents('user-1');
  const select = rows[0].toJSON().components[0];

  assert.equal(embed.data.title, '🗺️ Chọn khu vực phiêu lưu');
  assert.equal(select.custom_id, 'petadventure:user-1');
  assert.deepEqual(select.options.map((option) => option.value), [
    'meadow',
    'magic_forest',
    'dragon_canyon',
  ]);
  assert.match(select.options[1].description, /Level 20/);
  assert.match(select.options[1].description, /30 thể lực/);
});
