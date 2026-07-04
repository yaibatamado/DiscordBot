const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('prefix command loader only registers named prefix commands', () => {
  const handler = freshRequire('../handlers/commandHandler');

  handler.loadCommands();

  assert.equal(handler.commands.has(undefined), false);
  assert.deepEqual([...handler.commands.keys()].sort(), [
    'av',
    'baucua',
    'help',
    'nhac',
    'noitu',
    'server',
    'vuatv',
    'xuxi',
  ]);
});

test('aliases are unique and nt resolves to noitu', () => {
  const handler = freshRequire('../handlers/commandHandler');

  handler.loadCommands();

  assert.equal(handler.aliases.get('nt'), 'noitu');
  assert.equal(handler.aliases.get('nh'), 'nhac');
});

test('slash loader only registers slash commands with slash metadata', () => {
  const client = {};
  const loadSlash = freshRequire('../handlers/slashLoader');

  loadSlash(client);

  assert.deepEqual([...client.slashCommands.keys()].sort(), ['help', 'mod']);
});

test('prefix help menu shows every command category automatically', () => {
  const handler = freshRequire('../handlers/commandHandler');
  const help = freshRequire('../commands/system/help');
  const replies = [];

  handler.loadCommands();
  help.execute({
    reply: (payload) => replies.push(payload),
  });

  const options = replies[0].components[0].components[0].options;
  assert.deepEqual(options.map((option) => option.data.value).sort(), [
    'game',
    'music',
    'system',
  ]);
});

test('slash help replies with every command category', async () => {
  const handler = freshRequire('../handlers/commandHandler');
  const slashHelp = freshRequire('../commands/system/slashHelp');
  const replies = [];

  handler.loadCommands();
  await slashHelp.execute({
    reply: async (payload) => replies.push(payload),
  });

  const options = replies[0].components[0].components[0].options;
  assert.deepEqual(options.map((option) => option.data.value).sort(), [
    'game',
    'music',
    'system',
  ]);
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

  assert.deepEqual(calls, [
    'fetch:123',
    'kick',
    '👢 Đã kick TestUser#0001',
  ]);
});
