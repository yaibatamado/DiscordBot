const { ChannelType } = require('discord.js');
const { VOICE_ROOM_PREFIX } = require('../commands/system/setup')._private;

const isPrivateVoiceRoom = (channel) => (
  channel?.type === ChannelType.GuildVoice &&
  channel?.name?.startsWith(VOICE_ROOM_PREFIX)
);

const cleanupPrivateVoice = async (channel) => {
  if (!isPrivateVoiceRoom(channel)) return false;
  if ((channel.members?.size ?? 0) > 0) return false;

  await channel.delete('Moonlight private voice room is empty');
  return true;
};

module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channel || oldState.channelId === newState.channelId) return;

    setTimeout(() => {
      cleanupPrivateVoice(oldState.channel).catch(console.error);
    }, 30_000);
  });
};

module.exports._private = {
  cleanupPrivateVoice,
  isPrivateVoiceRoom,
};
