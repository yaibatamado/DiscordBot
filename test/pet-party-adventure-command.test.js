const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('pet adventure embed shows party material bonus', () => {
  const pet = freshRequire('../commands/game/pet');
  const embed = pet._private.buildAdventureEmbed({
    rewards: {
      coins: 40,
      exp: 25,
      items: [
        { key: 'common_essence', quantity: 3 },
        { key: 'theme_cute_animal', quantity: 2 },
      ],
    },
    damage: 0,
    becameSick: false,
    previousLevel: 1,
    levelsGained: 0,
    partyBonus: {
      memberCount: 3,
      extraMaterials: 2,
    },
    pet: {
      name: 'Mèo Bông Nhỏ',
      custom_name: 'Bông',
      stamina: 80,
      max_stamina: 100,
      health: 100,
      level: 1,
    },
  });

  const fields = Object.fromEntries(embed.data.fields.map((field) => [field.name, field.value]));

  assert.match(fields['Party Bonus'], /3 thành viên/);
  assert.match(fields['Party Bonus'], /\+2 nguyên liệu/);
});
