const assert = require('node:assert/strict');
const test = require('node:test');
const { ChannelType } = require('discord.js');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

const collection = (entries) => {
  const map = new Map(entries);
  map.filter = (predicate) => collection([...map].filter(([, value]) => predicate(value)));
  return map;
};

test('server command builds a detailed server info embed', async () => {
  const server = freshRequire('../commands/system/server');
  const embed = await server._private.buildServerEmbed({
    id: 'guild-id',
    name: 'Moon Guild',
    memberCount: 5,
    createdTimestamp: 1700000000000,
    premiumTier: 1,
    premiumSubscriptionCount: 2,
    verificationLevel: 'Medium',
    iconURL: () => 'https://example.com/icon.png',
    fetchOwner: async () => ({ id: 'owner-id', user: { tag: 'Owner#0001' } }),
    members: {
      cache: collection([
        ['1', { user: { bot: false } }],
        ['2', { user: { bot: true } }],
      ]),
    },
    channels: {
      cache: collection([
        ['text', { type: ChannelType.GuildText }],
        ['voice', { type: ChannelType.GuildVoice }],
        ['category', { type: ChannelType.GuildCategory }],
      ]),
    },
    roles: { cache: { size: 4 } },
    emojis: { cache: { size: 3 } },
  });

  assert.match(embed.data.title, /Moon Guild/);
  assert.equal(embed.data.thumbnail.url, 'https://example.com/icon.png');
  assert.match(embed.data.fields.find((field) => field.name === 'Members').value, /Total: \*\*5\*\*/);
  assert.match(embed.data.fields.find((field) => field.name === 'Channels').value, /Voice: \*\*1\*\*/);
  assert.match(embed.data.fields.find((field) => field.name === 'Server Assets').value, /Roles: \*\*3\*\*/);
});

test('moderation command exposes slowmode and channel lock tools', () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const names = moderation.data.toJSON().options.map((option) => option.name);

  assert.ok(names.includes('slowmode'));
  assert.ok(names.includes('lockchannel'));
  assert.ok(names.includes('unlockchannel'));
});

test('mod slowmode updates the current channel rate limit', async () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const calls = [];

  await moderation.execute({
    user: { tag: 'Mod#0001' },
    member: { permissions: { has: () => true } },
    options: {
      getSubcommand: () => 'slowmode',
      getInteger: () => 30,
      getString: () => 'calm down',
    },
    channel: {
      id: 'channel-id',
      setRateLimitPerUser: async (seconds, reason) => calls.push({ seconds, reason }),
    },
    reply: async (payload) => calls.push(payload),
  });

  assert.deepEqual(calls[0], { seconds: 30, reason: 'calm down' });
  assert.match(calls[1].embeds[0].data.title, /Slowmode Updated/);
});

test('mod lockchannel and unlockchannel update everyone send permission', async () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const calls = [];
  const baseInteraction = (subcommand) => ({
    member: { permissions: { has: () => true } },
    options: { getSubcommand: () => subcommand },
    guild: { roles: { everyone: { id: 'everyone-id' } } },
    channel: {
      id: 'channel-id',
      permissionOverwrites: {
        edit: async (id, permissions) => calls.push({ id, permissions }),
      },
    },
    reply: async (payload) => calls.push(payload),
  });

  await moderation.execute(baseInteraction('lockchannel'));
  await moderation.execute(baseInteraction('unlockchannel'));

  assert.deepEqual(calls[0], { id: 'everyone-id', permissions: { SendMessages: false } });
  assert.match(calls[1].embeds[0].data.title, /Channel Locked/);
  assert.deepEqual(calls[2], { id: 'everyone-id', permissions: { SendMessages: null } });
  assert.match(calls[3].embeds[0].data.title, /Channel Unlocked/);
});
