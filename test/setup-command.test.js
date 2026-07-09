const assert = require('node:assert/strict');
const test = require('node:test');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const createMockGuild = () => {
  const channels = [];
  const guild = {
    id: 'guild-1',
    roles: { everyone: { id: 'guild-1' } },
    members: { me: { id: 'bot-1' } },
    channels: {
      cache: {
        find: (predicate) => channels.find(predicate),
      },
      create: async (payload) => {
        const channel = {
          id: `channel-${channels.length + 1}`,
          ...payload,
          permissionOverwrites: {
            cache: new Map(payload.permissionOverwrites.map((overwrite) => [
              overwrite.id,
              overwrite,
            ])),
          },
          delete: async () => {
            const index = channels.indexOf(channel);
            if (index >= 0) channels.splice(index, 1);
          },
          setName: async (name) => {
            channel.name = name;
            return channel;
          },
        };
        channels.push(channel);
        return channel;
      },
    },
    _channels: channels,
  };

  return guild;
};

test('setup slash command exposes voice and channel panels', () => {
  const setup = require('../commands/system/setup');
  const json = setup.data.toJSON();

  assert.equal(json.name, 'setup');
  assert.deepEqual(json.options.map((option) => option.name), ['voice', 'channel']);
});

test('setup voice sends an interface embed with owner scoped buttons', async () => {
  const setup = require('../commands/system/setup');
  const replies = [];

  await setup.execute({
    options: { getSubcommand: () => 'voice' },
    user: { id: 'user-1' },
    reply: async (payload) => replies.push(payload),
  });

  assert.match(replies[0].embeds[0].data.title, /Voice/);
  const ids = replies[0].components.flatMap((row) =>
    row.components.map((component) => component.data.custom_id)
  );
  assert.ok(ids.includes('setup:voice:user-1:create'));
  assert.ok(ids.includes('setup:voice:user-1:delete'));
});

test('setup channel create button creates one private text channel per user', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const replies = [];
  const updates = [];
  const interaction = {
    customId: 'setup:channel:user-1:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    reply: async (payload) => replies.push(payload),
    update: async (payload) => updates.push(payload),
  };

  await setup.handleComponent(interaction);
  await setup.handleComponent(interaction);

  assert.equal(guild._channels.length, 1);
  assert.equal(guild._channels[0].type, ChannelType.GuildText);
  assert.match(guild._channels[0].name, /yaiba-room/);
  assert.equal(
    guild._channels[0].permissionOverwrites.cache.get('guild-1').deny[0],
    PermissionFlagsBits.ViewChannel
  );
  assert.match(replies[0].content, /Đã tạo/);
  assert.match(replies[1].content, /đã có/);
});

test('setup voice create button creates a private voice channel and moves the user', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const moves = [];
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:voice:user-1:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    member: { voice: { setChannel: async (channel) => moves.push(channel.id) } },
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(guild._channels.length, 1);
  assert.equal(guild._channels[0].type, ChannelType.GuildVoice);
  assert.equal(moves[0], guild._channels[0].id);
  assert.match(replies[0].content, /Đã tạo/);
});
