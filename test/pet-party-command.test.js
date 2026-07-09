const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('pet party menu shows global rooms and owner-scoped controls', () => {
  const pet = freshRequire('../commands/game/pet');
  const party = {
    party_id: 42,
    leader_user_id: 'leader',
    area_key: 'meadow',
    member_count: 2,
    members: [
      { user_id: 'leader', display_name: 'Leader' },
      { user_id: 'friend', display_name: 'Friend' },
    ],
  };

  const embed = pet._private.buildPartyEmbed({
    currentParty: null,
    parties: [party],
  });
  const rows = pet._private.buildPartyComponents('user-1', [party], null);
  const controls = rows.flatMap((row) => row.components.map((component) => component.data));

  assert.equal(embed.data.title, '👥 Party Phiêu Lưu');
  assert.match(embed.data.description, /global/);
  assert.ok(embed.data.fields[0].value.includes('#42'));
  assert.ok(controls.some((control) => control.custom_id === 'petparty:user-1:create'));
  assert.ok(controls.some((control) => control.custom_id === 'petpartyjoin:user-1'));
});
