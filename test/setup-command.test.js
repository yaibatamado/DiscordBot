const assert = require('node:assert/strict');
const test = require('node:test');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const createMockGuild = () => {
  const channels = [];
  const guild = {
    id: 'guild-1',
    roles: { everyone: { id: 'guild-1' } },
    members: {
      me: { id: 'bot-1' },
      cache: new Map(),
    },
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
            edit: async (id, options) => {
              const current = channel.permissionOverwrites.cache.get(id) || { id };
              channel.permissionOverwrites.cache.set(id, { ...current, ...options });
            },
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

test('setup voice limit button opens a modal and applies the user limit', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const modals = [];
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:voice:user-1:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    member: { voice: { setChannel: async () => {} } },
    reply: async (payload) => replies.push(payload),
  });

  await setup.handleComponent({
    customId: 'setup:voice:user-1:limit',
    user: { id: 'user-1', username: 'Yaiba' },
    showModal: async (modal) => modals.push(modal),
  });

  guild._channels[0].setUserLimit = async (limit) => {
    guild._channels[0].userLimit = limit;
  };

  await setup.handleModal({
    customId: 'setup:voice:user-1:limitModal',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    fields: { getTextInputValue: () => '4' },
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(modals[0].data.custom_id, 'setup:voice:user-1:limitModal');
  assert.equal(guild._channels[0].userLimit, 4);
  assert.match(replies[1].content, /4/);
});

test('setup voice sends an interface embed with public room controls', async () => {
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
  assert.ok(ids.includes('setup:voice:create'));
  assert.ok(ids.includes('setup:voice:rename'));
  assert.ok(ids.includes('setup:voice:limit'));
  assert.ok(ids.includes('setup:voice:invite'));
  assert.ok(ids.includes('setup:voice:trust'));
  assert.ok(ids.includes('setup:voice:untrust'));
  assert.ok(ids.includes('setup:voice:hide'));
  assert.ok(ids.includes('setup:voice:show'));
  assert.ok(ids.includes('setup:voice:transfer'));
  assert.ok(ids.includes('setup:voice:claim'));
  assert.ok(ids.includes('setup:voice:delete'));
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
test('setup rename button opens a modal and renames the private room', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const modals = [];
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:channel:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    reply: async (payload) => replies.push(payload),
  });

  await setup.handleComponent({
    customId: 'setup:channel:rename',
    user: { id: 'user-1', username: 'Yaiba' },
    showModal: async (modal) => modals.push(modal),
  });

  await setup.handleModal({
    customId: 'setup:channel:user-1:renameModal',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    fields: { getTextInputValue: () => 'Phong Rieng Moi' },
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(modals[0].data.custom_id, 'setup:channel:user-1:renameModal');
  assert.equal(guild._channels[0].name, 'phong-rieng-moi');
});

test('setup invite user select grants access to a private room', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:channel:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    reply: async (payload) => replies.push(payload),
  });

  await setup.handleUserSelect({
    customId: 'setup:channel:user-1:inviteSelect',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    values: ['user-2'],
    reply: async (payload) => replies.push(payload),
  });

  assert.ok(
    guild._channels[0].permissionOverwrites.cache
      .get('user-2')
      .allow
      .includes(PermissionFlagsBits.ViewChannel)
  );
});

test('setup transfer user select moves room ownership', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:voice:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    member: { voice: { setChannel: async () => {} } },
    reply: async (payload) => replies.push(payload),
  });

  await setup.handleUserSelect({
    customId: 'setup:voice:user-1:transferSelect',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    values: ['user-2'],
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(setup._private.findUserRoom(guild, 'voice', 'user-1'), undefined);
  assert.equal(setup._private.findUserRoom(guild, 'voice', 'user-2'), guild._channels[0]);
});

test('setup trust and untrust update member room access', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:channel:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    reply: async (payload) => replies.push(payload),
  });

  await setup.handleUserSelect({
    customId: 'setup:channel:user-1:trustSelect',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    values: ['user-2'],
    reply: async (payload) => replies.push(payload),
  });

  assert.ok(guild._channels[0].permissionOverwrites.cache.has('user-2'));

  await setup.handleUserSelect({
    customId: 'setup:channel:user-1:untrustSelect',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    values: ['user-2'],
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(guild._channels[0].permissionOverwrites.cache.has('user-2'), false);
});

test('setup hide and show update room visibility', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:channel:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    reply: async (payload) => replies.push(payload),
  });

  await setup.handleComponent({
    customId: 'setup:channel:hide',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(guild._channels[0].permissionOverwrites.cache.get('guild-1').ViewChannel, false);

  await setup.handleComponent({
    customId: 'setup:channel:show',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(guild._channels[0].permissionOverwrites.cache.get('guild-1').ViewChannel, true);
});

test('setup claim transfers an abandoned voice room to the claimant', async () => {
  const setup = require('../commands/system/setup');
  const guild = createMockGuild();
  const replies = [];

  await setup.handleComponent({
    customId: 'setup:voice:create',
    user: { id: 'user-1', username: 'Yaiba' },
    guild,
    channel: { parentId: 'category-1' },
    member: { voice: { setChannel: async () => {} } },
    reply: async (payload) => replies.push(payload),
  });

  const voiceRoom = guild._channels[0];
  voiceRoom.members = new Map([['user-2', {}]]);

  await setup.handleComponent({
    customId: 'setup:voice:claim',
    user: { id: 'user-2', username: 'Claimant' },
    guild,
    member: { voice: { channel: voiceRoom } },
    reply: async (payload) => replies.push(payload),
  });

  assert.equal(setup._private.findUserRoom(guild, 'voice', 'user-1'), undefined);
  assert.equal(setup._private.findUserRoom(guild, 'voice', 'user-2'), voiceRoom);
});
