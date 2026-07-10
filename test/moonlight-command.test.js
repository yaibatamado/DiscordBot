const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('moonlight invite uses administrator permission and link button', () => {
  const moonlight = freshRequire('../commands/system/moonlight');
  const inviteUrl = moonlight._private.buildInviteUrl();
  const row = moonlight._private.buildInviteRow().toJSON();
  const embed = moonlight._private.buildMoonlightEmbed({
    user: { tag: 'Moonlight#0001' },
    uptime: 60000,
    guilds: { cache: { size: 1 } },
  });

  assert.match(inviteUrl, /permissions=8/);
  assert.match(inviteUrl, /scope=bot%20applications.commands/);
  assert.equal(row.components.length, 2);
  assert.equal(row.components[0].style, 5);
  assert.equal(row.components[0].url, inviteUrl);
  assert.equal(row.components[1].style, 5);
  assert.equal(row.components[1].url, moonlight._private.supportServerUrl);
  assert.doesNotMatch(JSON.stringify(embed.data), /\/pet|hệ pet/i);
});
