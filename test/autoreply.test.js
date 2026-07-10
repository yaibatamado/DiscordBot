const assert = require('node:assert/strict');
const test = require('node:test');

const freshRequire = (modulePath) => {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
};

test('/autoreply exposes management subcommands', () => {
  const autoreply = freshRequire('../commands/system/autoreply');
  const json = autoreply.data.toJSON();

  assert.equal(json.name, 'autoreply');
  assert.deepEqual(json.options.map((option) => option.name), [
    'add',
    'list',
    'edit',
    'remove',
    'toggle',
  ]);
});

test('autoreply matching supports exact, starts_with, and contains priority', () => {
  const { findMatchingAutoReply } = freshRequire('../services/autoReplyService');
  const rules = [
    { id: 3, trigger: 'moon', reply: 'contains', matchMode: 'contains' },
    { id: 2, trigger: 'hello', reply: 'starts', matchMode: 'starts_with' },
    { id: 1, trigger: 'hello moon', reply: 'exact', matchMode: 'exact' },
  ];

  assert.equal(findMatchingAutoReply('hello moon', rules).reply, 'exact');
  assert.equal(findMatchingAutoReply('hello moonlight', rules).reply, 'starts');
  assert.equal(findMatchingAutoReply('good moon', rules).reply, 'contains');
  assert.equal(findMatchingAutoReply('sunlight', rules), null);
});

test('autoreply renders simple placeholders', () => {
  const { renderReply } = freshRequire('../services/autoReplyService');
  const output = renderReply('Hi {user} / {username} in {server} at {channel}', {
    author: { id: 'user-1', username: 'Yaiba' },
    guild: { name: 'Moon Guild' },
    channel: { id: 'channel-1' },
  });

  assert.equal(output, 'Hi <@user-1> / Yaiba in Moon Guild at <#channel-1>');
});

test('autoreply handler replies to a matching message', async () => {
  const { clearAutoReplyCache, handleAutoReply } = freshRequire('../services/autoReplyService');
  clearAutoReplyCache();
  const replies = [];
  const repository = {
    getActive: async () => [
      {
        id: 1,
        trigger: 'hi moon',
        reply: 'Hello {username}',
        matchMode: 'contains',
      },
    ],
  };

  const handled = await handleAutoReply({
    guildId: 'guild-1',
    content: 'well hi moon',
    author: { id: 'user-1', username: 'Yaiba', bot: false },
    guild: { name: 'Moon Guild' },
    channel: { id: 'channel-1' },
    reply: async (payload) => replies.push(payload),
  }, repository);

  assert.equal(handled, true);
  assert.equal(replies[0].content, 'Hello Yaiba');
  assert.deepEqual(replies[0].allowedMentions, {
    parse: [],
    users: ['user-1'],
    roles: [],
  });
});
