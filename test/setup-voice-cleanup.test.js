const assert = require('node:assert/strict');
const test = require('node:test');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

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

const voiceChannel = (id, sent = [], allowed = true) => ({
  id,
  type: ChannelType.GuildVoice,
  permissionsFor: () => ({
    has: (permission) => allowed
      && [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages].includes(permission),
  }),
  send: async (payload) => sent.push(payload),
});

const guildWithChannels = () => ({
  members: { me: { id: 'bot-1' } },
});

test('voice activity notification reports join, leave, and move', () => {
  const voice = require('../events/voiceStateUpdate');
  const member = { user: { id: 'user-1' } };
  const oldVoice = voiceChannel('old-voice');
  const newVoice = voiceChannel('new-voice');

  assert.match(
    voice._private.buildVoiceActivityMessage(
      { channel: null, channelId: null, member, id: 'user-1' },
      { channel: newVoice, channelId: 'new-voice', member, id: 'user-1' }
    ),
    /đã vào voice <#new-voice>/
  );

  assert.match(
    voice._private.buildVoiceActivityMessage(
      { channel: oldVoice, channelId: 'old-voice', member, id: 'user-1' },
      { channel: null, channelId: null, member, id: 'user-1' }
    ),
    /đã rời voice <#old-voice>/
  );

  assert.match(
    voice._private.buildVoiceActivityMessage(
      { channel: oldVoice, channelId: 'old-voice', member, id: 'user-1' },
      { channel: newVoice, channelId: 'new-voice', member, id: 'user-1' }
    ),
    /<#old-voice> → <#new-voice>/
  );
});

test('voice activity notification sends join to the joined voice channel chat', async () => {
  const voice = require('../events/voiceStateUpdate');
  const sent = [];
  const guild = guildWithChannels();

  await voice._private.notifyVoiceActivity(
    { guild, channel: null, channelId: null, member: { user: { id: 'user-1' } }, id: 'user-1' },
    { guild, channel: voiceChannel('voice-1', sent), channelId: 'voice-1', member: { user: { id: 'user-1' } }, id: 'user-1' }
  );

  assert.equal(sent.length, 1);
  assert.match(sent[0].content, /vào voice <#voice-1>/);
});

test('voice activity notification sends leave to the left voice channel chat', async () => {
  const voice = require('../events/voiceStateUpdate');
  const sent = [];
  const guild = guildWithChannels();

  await voice._private.notifyVoiceActivity(
    { guild, channel: voiceChannel('voice-1', sent), channelId: 'voice-1', member: { user: { id: 'user-1' } }, id: 'user-1' },
    { guild, channel: null, channelId: null, member: { user: { id: 'user-1' } }, id: 'user-1' }
  );

  assert.equal(sent.length, 1);
  assert.match(sent[0].content, /rời voice <#voice-1>/);
});

test('voice activity notification sends move to both voice channel chats', async () => {
  const voice = require('../events/voiceStateUpdate');
  const oldSent = [];
  const newSent = [];
  const guild = guildWithChannels();

  await voice._private.notifyVoiceActivity(
    { guild, channel: voiceChannel('old-voice', oldSent), channelId: 'old-voice', member: { user: { id: 'user-1' } }, id: 'user-1' },
    { guild, channel: voiceChannel('new-voice', newSent), channelId: 'new-voice', member: { user: { id: 'user-1' } }, id: 'user-1' }
  );

  assert.equal(oldSent.length, 1);
  assert.equal(newSent.length, 1);
  assert.match(oldSent[0].content, /rời voice <#old-voice>/);
  assert.match(newSent[0].content, /vào voice <#new-voice>/);
});
