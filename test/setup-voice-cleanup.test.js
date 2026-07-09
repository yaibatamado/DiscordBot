const assert = require('node:assert/strict');
const test = require('node:test');
const { ChannelType } = require('discord.js');

const privateVoice = (membersSize = 0) => {
  const calls = [];
  const channel = {
    id: 'voice-1',
    name: '🌙・yaiba',
    type: ChannelType.GuildVoice,
    members: { size: membersSize },
    permissionOverwrites: { cache: new Map([['user-1', { id: 'user-1' }]]) },
    delete: async (reason) => calls.push(reason),
  };
  channel._calls = calls;
  return channel;
};

test('setup voice cleanup deletes empty private voice rooms', async () => {
  const cleanup = require('../events/voiceStateUpdate');
  const channel = privateVoice(0);

  await cleanup._private.cleanupPrivateVoice(channel);

  assert.equal(channel._calls.length, 1);
  assert.match(channel._calls[0], /empty/);
});

test('setup voice cleanup skips non-empty private voice rooms and text rooms', async () => {
  const cleanup = require('../events/voiceStateUpdate');
  const occupied = privateVoice(1);
  const text = {
    ...privateVoice(0),
    type: ChannelType.GuildText,
  };

  await cleanup._private.cleanupPrivateVoice(occupied);
  await cleanup._private.cleanupPrivateVoice(text);

  assert.equal(occupied._calls.length, 0);
  assert.equal(text._calls.length, 0);
});
