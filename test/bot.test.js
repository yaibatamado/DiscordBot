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

  assert.deepEqual([...client.slashCommands.keys()].sort(), [
    'avatar',
    'dbstatus',
    'help',
    'join',
    'leave',
    'mod',
    'pet',
    'server',
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
  assert.equal(embed.data.title, '🌙 Moonlight Help!');
  assert.match(embed.data.fields.map((field) => field.name).join('\n'), /System/);
  assert.match(embed.data.fields.map((field) => field.name).join('\n'), /Game/);
  assert.match(embed.data.fields.map((field) => field.name).join('\n'), /Music/);
  assert.match(embed.data.fields.map((field) => field.name).join('\n'), /Moderation/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /\?help/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /\/help/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /\?server/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /\/mod kick/);
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
  assert.equal(embed.data.author.name, 'SlashTester');
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /\?nhac/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /\?baucua/);
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

