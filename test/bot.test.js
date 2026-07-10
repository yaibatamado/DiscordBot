const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('prefix command loader only registers active prefix commands', () => {
  const handler = freshRequire('../handlers/commandHandler');

  handler.loadCommands();

  assert.equal(handler.commands.has(undefined), false);
  assert.deepEqual([...handler.commands.keys()].sort(), [
    'av',
    'help',
    'server',
  ]);
});

test('aliases are unique and avatar resolves to av', () => {
  const handler = freshRequire('../handlers/commandHandler');

  handler.loadCommands();

  assert.equal(handler.aliases.get('avatar'), 'av');
});

test('slash loader registers the public slash command set', () => {
  const client = {};
  const loadSlash = freshRequire('../handlers/slashLoader');

  loadSlash(client);

  assert.deepEqual([...client.slashCommands.keys()].sort(), [
    'autoreply',
    'avatar',
    'check',
    'dbstatus',
    'help',
    'join',
    'leave',
    'mod',
    'moonlight',
    'music',
    'server',
    'settings',
    'setup',
    'warn',
  ]);
});

test('prefix help replies with a command list embed', () => {
  const handler = freshRequire('../handlers/commandHandler');
  const help = freshRequire('../commands/system/help');
  const replies = [];

  handler.loadCommands();
  help.execute({
    author: {
      username: 'Tester',
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
    reply: (payload) => replies.push(payload),
  });

  assert.equal(replies[0].components, undefined);
  const embed = replies[0].embeds[0];
  const fieldNames = embed.data.fields.map((field) => field.name).join('\n');
  const fieldValues = embed.data.fields.map((field) => field.value).join('\n');

  assert.equal(embed.data.title, 'Moonlight Help!');
  assert.match(fieldNames, /System/);
  assert.match(fieldNames, /Music/);
  assert.match(fieldNames, /Moderation/);
  assert.match(fieldNames, /Setup/);
  assert.match(fieldValues, /\?help/);
  assert.match(fieldValues, /\/help/);
  assert.match(fieldValues, /\/moonlight/);
  assert.match(fieldValues, /\/check/);
  assert.match(fieldValues, /\/settings voice-log/);
  assert.match(fieldValues, /\?server/);
  assert.match(fieldValues, /\/music/);
  assert.match(fieldValues, /\/setup voice/);
  assert.match(fieldValues, /\/mod kick/);
  assert.doesNotMatch(fieldValues, /\/pet/);
  assert.doesNotMatch(fieldValues, /\?baucua/);
  assert.doesNotMatch(fieldValues, /\?nhac/);
});

test('slash help replies with a command list embed', async () => {
  const handler = freshRequire('../handlers/commandHandler');
  const slashHelp = freshRequire('../commands/system/slashHelp');
  const replies = [];

  handler.loadCommands();
  await slashHelp.execute({
    user: {
      username: 'SlashTester',
      displayAvatarURL: () => 'https://example.com/slash-avatar.png',
    },
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(replies[0].components, undefined);
  const embed = replies[0].embeds[0];
  const fieldValues = embed.data.fields.map((field) => field.value).join('\n');

  assert.equal(embed.data.author.name, 'SlashTester');
  assert.match(fieldValues, /\/music/);
  assert.match(fieldValues, /\/moonlight/);
  assert.doesNotMatch(fieldValues, /\/pet/);
});

test('moderation kick fetches the target member before acting', async () => {
  const moderation = freshRequire('../commands/moderation/moderation');
  const calls = [];
  const target = {
    kick: async () => calls.push('kick'),
  };

  const interaction = {
    member: {
      permissions: {
        has: () => true,
      },
    },
    options: {
      getSubcommand: () => 'kick',
      getUser: () => ({ id: '123', tag: 'TestUser#0001' }),
    },
    guild: {
      members: {
        fetch: async (id) => {
          calls.push(`fetch:${id}`);
          return target;
        },
      },
    },
    reply: async (message) => calls.push(message),
  };

  await moderation.execute(interaction);

  assert.equal(calls[0], 'fetch:123');
  assert.equal(calls[1], 'kick');
  assert.match(calls[2].embeds[0].data.title, /Member Kicked/);
  assert.match(calls[2].embeds[0].data.description, /TestUser#0001/);
});
