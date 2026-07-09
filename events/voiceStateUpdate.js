const { ChannelType, PermissionFlagsBits } = require('discord.js');
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

const canSendToChannel = (channel, guild) => {
  if (channel?.type !== ChannelType.GuildText || typeof channel.send !== 'function') {
    return false;
  }

  const permissions = channel.permissionsFor?.(guild.members.me);
  if (!permissions?.has) return true;

  return permissions.has(PermissionFlagsBits.ViewChannel)
    && permissions.has(PermissionFlagsBits.SendMessages);
};

const findVoiceNotifyChannel = (guild) => {
  if (canSendToChannel(guild.systemChannel, guild)) {
    return guild.systemChannel;
  }

  return guild.channels.cache.find((channel) => canSendToChannel(channel, guild));
};

const mentionVoice = (channel) => `<#${channel.id}>`;

const buildVoiceActivityMessage = (oldState, newState) => {
  const member = newState.member || oldState.member;
  const userLabel = member?.user ? `<@${member.user.id}>` : `<@${newState.id || oldState.id}>`;

  if (!oldState.channel && newState.channel) {
    return `🎙️ ${userLabel} đã vào voice ${mentionVoice(newState.channel)}.`;
  }

  if (oldState.channel && !newState.channel) {
    return `📤 ${userLabel} đã rời voice ${mentionVoice(oldState.channel)}.`;
  }

  if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
    return `🔁 ${userLabel} đã chuyển voice ${mentionVoice(oldState.channel)} → ${mentionVoice(newState.channel)}.`;
  }

  return null;
};

const notifyVoiceActivity = async (oldState, newState) => {
  if (oldState.channelId === newState.channelId) return false;

  const message = buildVoiceActivityMessage(oldState, newState);
  if (!message) return false;

  const channel = findVoiceNotifyChannel(newState.guild || oldState.guild);
  if (!channel) return false;

  await channel.send({ content: message });
  return true;
};

module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    await notifyVoiceActivity(oldState, newState).catch(console.error);

    if (!oldState.channel || oldState.channelId === newState.channelId) return;

    setTimeout(() => {
      cleanupPrivateVoice(oldState.channel).catch(console.error);
    }, 30_000);
  });
};

module.exports._private = {
  buildVoiceActivityMessage,
  cleanupPrivateVoice,
  findVoiceNotifyChannel,
  isPrivateVoiceRoom,
  notifyVoiceActivity,
};
