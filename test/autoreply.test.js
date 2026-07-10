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
    'mode',
    'channel',
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

test('autoreply contains mode avoids tiny and embedded triggers', () => {
  const { findMatchingAutoReply } = freshRequire('../services/autoReplyService');
  const rules = [
    { id: 1, trigger: 't', reply: 'too-short', matchMode: 'contains' },
    { id: 2, trigger: 'hi', reply: 'embedded', matchMode: 'contains' },
    { id: 3, trigger: 'moe', reply: 'token', matchMode: 'contains' },
  ];

  assert.equal(findMatchingAutoReply('t trét mắm tôm', rules), null);
  assert.equal(findMatchingAutoReply('this is fine', rules), null);
  assert.equal(findMatchingAutoReply('hello moe', rules).reply, 'token');
  assert.equal(findMatchingAutoReply('moe cái dái', rules).reply, 'token');
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

test('autoreply random replies use || separated options', () => {
  const { getReplyOptions, pickReplyTemplate } = freshRequire('../services/autoReplyService');

  assert.deepEqual(getReplyOptions('Hi || Hello ||  Chao  '), ['Hi', 'Hello', 'Chao']);
  assert.equal(pickReplyTemplate('Hi || Hello || Chao', () => 0.5), 'Hello');
});

test('autoreply channel scope filters rules by channel id', () => {
  const { isRuleAllowedInChannel } = freshRequire('../services/autoReplyService');

  assert.equal(isRuleAllowedInChannel({ channelId: null }, 'channel-1'), true);
  assert.equal(isRuleAllowedInChannel({ channelId: 'channel-1' }, 'channel-1'), true);
  assert.equal(isRuleAllowedInChannel({ channelId: 'channel-2' }, 'channel-1'), false);
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
        channelId: 'channel-1',
      },
    ],
  };

  const handled = await handleAutoReply({
    guildId: 'guild-1',
    content: 'well hi moon',
    author: { id: 'user-1', username: 'Yaiba', bot: false },
    guild: { name: 'Moon Guild' },
    channel: { id: 'channel-1' },
    channelId: 'channel-1',
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

test('autoreply handler ignores channel-scoped rules in other channels', async () => {
  const { clearAutoReplyCache, handleAutoReply } = freshRequire('../services/autoReplyService');
  clearAutoReplyCache();
  const replies = [];
  const repository = {
    getActive: async () => [
      {
        id: 1,
        trigger: 'hi moon',
        reply: 'Hello',
        matchMode: 'contains',
        channelId: 'channel-2',
      },
    ],
  };

  const handled = await handleAutoReply({
    guildId: 'guild-1',
    content: 'hi moon',
    author: { id: 'user-1', username: 'Yaiba', bot: false },
    guild: { name: 'Moon Guild' },
    channel: { id: 'channel-1' },
    channelId: 'channel-1',
    reply: async (payload) => replies.push(payload),
  }, repository);

  assert.equal(handled, false);
  assert.equal(replies.length, 0);
});
