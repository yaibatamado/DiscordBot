const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('slash avatar replies with the selected user avatar', async () => {
  const avatar = freshRequire('../commands/system/slashAvatar');
  const replies = [];
  const target = {
    id: '42',
    username: 'Target',
    displayAvatarURL: () => 'https://example.com/target.png',
  };

  await avatar.execute({
    user: {
      id: 'self',
      username: 'Self',
      displayAvatarURL: () => 'https://example.com/self.png',
    },
    options: {
      getUser: () => target,
    },
    reply: async (payload) => replies.push(payload),
  });

  const embed = replies[0].embeds[0].data;
  assert.equal(embed.title, 'Avatar của Target');
  assert.equal(embed.image.url, 'https://example.com/target.png');
  assert.match(embed.description, /Link avatar/);
});

test('warn command sends a temporary warning message', async () => {
  const warn = freshRequire('../commands/moderation/warn');
  const replies = [];

  await warn.execute({
    member: {
      permissions: {
        has: () => true,
      },
    },
    options: {
      getUser: () => ({ id: 'target', tag: 'Target#0001' }),
      getString: () => 'spam',
    },
    reply: async (payload) => replies.push(payload),
  });

  assert.match(replies[0].embeds[0].data.title, /Cảnh cáo/);
  assert.match(replies[0].embeds[0].data.description, /Target#0001/);
  assert.match(replies[0].embeds[0].data.description, /spam/);
});

test('mod timeout exposes optional reason and includes it in the response', async () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const timeout = moderation.data.toJSON().options.find((option) => option.name === 'timeout');
  const optionNames = timeout.options.map((option) => option.name);

  assert.deepEqual(optionNames, ['user', 'time', 'reason']);
  assert.equal(timeout.options.find((option) => option.name === 'reason').required, false);

  const calls = [];
  const target = {
    timeout: async (duration, reason) => calls.push(`timeout:${duration}:${reason}`),
  };

  await moderation.execute({
    member: {
      permissions: {
        has: () => true,
      },
    },
    options: {
      getSubcommand: () => 'timeout',
      getUser: () => ({ id: 'target', tag: 'Target#0001' }),
      getInteger: () => 10,
      getString: () => 'spam',
    },
    guild: {
      members: {
        fetch: async () => target,
      },
    },
    reply: async (message) => calls.push(message),
  });

  assert.deepEqual(calls, [
    'timeout:600000:spam',
    '⏳ Timeout Target#0001 10 phút\nLý do: spam',
  ]);
});
