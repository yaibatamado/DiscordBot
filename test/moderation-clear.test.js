const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('moderation slash command exposes clear with user id and time choices', () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const json = moderation.data.toJSON();
  const clear = json.options.find((option) => option.name === 'clear');

  assert.ok(clear);
  assert.deepEqual(clear.options.map((option) => option.name), [
    'amount',
    'user',
    'userid',
    'time',
  ]);

  const amount = clear.options.find((option) => option.name === 'amount');
  assert.equal(amount.required, false);

  const time = clear.options.find((option) => option.name === 'time');
  assert.deepEqual(time.choices.map((choice) => choice.value), [
    'all',
    '1h',
    '6h',
    '12h',
    '24h',
    '3d',
    '7d',
  ]);
});

test('moderation clear deletes messages from a selected user in the selected time range', async () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const now = Date.now();
  const deleted = [];
  const messages = new Map([
    ['1', { id: '1', author: { id: 'target' }, createdTimestamp: now - 10 * 60 * 1000 }],
    ['2', { id: '2', author: { id: 'other' }, createdTimestamp: now - 10 * 60 * 1000 }],
    ['3', { id: '3', author: { id: 'target' }, createdTimestamp: now - 2 * 60 * 60 * 1000 }],
  ]);

  const interaction = {
    member: {
      permissions: {
        has: () => true,
      },
    },
    options: {
      getSubcommand: () => 'clear',
      getInteger: () => 50,
      getUser: () => ({ id: 'target', tag: 'Target#0001' }),
      getString: (name) => (name === 'time' ? '1h' : null),
    },
    channel: {
      messages: {
        fetch: async (options) => {
          assert.equal(options.limit, 50);
          return messages;
        },
      },
      bulkDelete: async (items) => {
        deleted.push(...items.map((message) => message.id));
        return { size: items.length };
      },
    },
    reply: async (message) => deleted.push(message.content || message),
  };

  await moderation.execute(interaction);

  assert.deepEqual(deleted, [
    '1',
    '✅ Đã xóa 1 tin nhắn',
  ]);
});

test('moderation clear without amount scans pages until all deletable messages are removed', async () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const now = Date.now();
  const deleted = [];
  const firstPageEntries = [
    ['3', { id: '3', author: { id: 'target' }, createdTimestamp: now - 10 * 60 * 1000 }],
    ['2', { id: '2', author: { id: 'other' }, createdTimestamp: now - 10 * 60 * 1000 }],
  ];
  for (let index = 4; index <= 101; index += 1) {
    firstPageEntries.push([
      String(index),
      { id: String(index), author: { id: 'other' }, createdTimestamp: now - 10 * 60 * 1000 },
    ]);
  }
  const firstPage = new Map(firstPageEntries);
  const secondPage = new Map([
    ['1', { id: '1', author: { id: 'target' }, createdTimestamp: now - 20 * 60 * 1000 }],
  ]);
  const pages = [firstPage, secondPage, new Map()];

  const interaction = {
    member: {
      permissions: {
        has: () => true,
      },
    },
    options: {
      getSubcommand: () => 'clear',
      getInteger: () => null,
      getUser: () => ({ id: 'target', tag: 'Target#0001' }),
      getString: (name) => (name === 'time' ? 'all' : null),
    },
    channel: {
      messages: {
        fetch: async () => pages.shift(),
      },
      bulkDelete: async (items) => {
        deleted.push(...items.map((message) => message.id));
        return { size: items.length };
      },
    },
    deferReply: async () => deleted.push('defer'),
    editReply: async (message) => deleted.push(message.content || message),
    reply: async (message) => deleted.push(message.content || message),
  };

  await moderation.execute(interaction);

  assert.deepEqual(deleted, [
    'defer',
    '3',
    '1',
    '✅ Đã xóa 2 tin nhắn',
  ]);
});
