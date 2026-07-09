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
  if (!channel || typeof channel.send !== 'function') {
    return false;
  }

  const permissions = channel.permissionsFor?.(guild.members.me);
  if (!permissions?.has) return true;

  return permissions.has(PermissionFlagsBits.ViewChannel)
    && permissions.has(PermissionFlagsBits.SendMessages);
};

const mentionVoice = (channel) => `<#${channel.id}>`;

const buildVoiceJoinMessage = (state) => {
  const member = state.member;
  const userLabel = member?.user ? `<@${member.user.id}>` : `<@${state.id}>`;
  return `🎙️ ${userLabel} đã vào voice ${mentionVoice(state.channel)}.`;
};

const buildVoiceLeaveMessage = (state) => {
  const member = state.member;
  const userLabel = member?.user ? `<@${member.user.id}>` : `<@${state.id}>`;
  return `📤 ${userLabel} đã rời voice ${mentionVoice(state.channel)}.`;
};

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

  const guild = newState.guild || oldState.guild;
  const sends = [];

  if (oldState.channel && canSendToChannel(oldState.channel, guild)) {
    sends.push(oldState.channel.send({ content: buildVoiceLeaveMessage(oldState) }));
  }

  if (newState.channel && canSendToChannel(newState.channel, guild)) {
    sends.push(newState.channel.send({ content: buildVoiceJoinMessage(newState) }));
  }

  if (sends.length === 0) return false;

  await Promise.all(sends);
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
  buildVoiceJoinMessage,
  buildVoiceLeaveMessage,
  cleanupPrivateVoice,
  isPrivateVoiceRoom,
  notifyVoiceActivity,
};
