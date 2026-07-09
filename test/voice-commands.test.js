const assert = require('node:assert/strict');
const test = require('node:test');

test('join command joins the caller voice channel', async () => {
  const join = require('../commands/voice/join');
  const calls = [];
  const channel = {
    id: 'voice-1',
    name: 'Phòng Chung',
    guild: {
      id: 'guild-1',
      voiceAdapterCreator: {},
    },
  };
  const interaction = {
    guildId: 'guild-1',
    member: { voice: { channel } },
    reply: async (payload) => calls.push(payload),
  };

  await join._private.executeJoin(interaction, {
    joinVoiceChannel: (options) => calls.push(options),
  });

  assert.deepEqual(calls[0], {
    channelId: 'voice-1',
    guildId: 'guild-1',
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });
  assert.match(calls[1].content, /Phòng Chung/);
});

test('join command requires the caller to be in voice', async () => {
  const join = require('../commands/voice/join');
  const replies = [];

  await join._private.executeJoin({
    guildId: 'guild-1',
    member: { voice: { channel: null } },
    reply: async (payload) => replies.push(payload),
  }, {
    joinVoiceChannel: () => assert.fail('should not join without a channel'),
  });

  assert.match(replies[0].content, /kênh voice/);
});

test('leave command destroys the guild voice connection', async () => {
  const leave = require('../commands/voice/leave');
  const calls = [];
  const connection = { destroy: () => calls.push('destroy') };

  await leave._private.executeLeave({
    guildId: 'guild-1',
    reply: async (payload) => calls.push(payload),
  }, {
    getVoiceConnection: () => connection,
  });

  assert.equal(calls[0], 'destroy');
  assert.match(calls[1].content, /rời kênh voice/);
});
