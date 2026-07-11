const { createEmbed, icons } = require('../utils/uiEmbed');
const serverWrappedRepository = require('../repositories/serverWrappedRepository');
const {
  getDateKey,
  getLocalHourMinute,
  getPreviousWeekRange,
} = require('../utils/timeKeys');

const recordMessageStats = async (message) => {
  if (!message.guild || message.author.bot) return;
  await serverWrappedRepository.recordMessage({
    guildId: message.guild.id,
    channelId: message.channelId,
    userId: message.author.id,
    dateKey: getDateKey(),
  });
};

const formatLeaderboard = (items, formatter) => (
  items.length > 0
    ? items.map((item, index) => `${index + 1}. ${formatter(item)} - **${item.total}**`).join('\n')
    : 'No data yet.'
);

const buildWrappedEmbed = ({ guild, summary, startKey, endKey }) => createEmbed({
  title: 'Server Wrapped',
  description: `Weekly Moonlight recap for **${guild.name}**\n${startKey} -> ${endKey}`,
  variant: summary.totalMessages > 0 ? 'system' : 'warning',
  thumbnail: guild.iconURL?.({ size: 128 }) || icons.system,
  fields: [
    { name: 'Total Messages', value: String(summary.totalMessages), inline: true },
    {
      name: 'Busiest Day',
      value: summary.busiestDay ? `${summary.busiestDay.dateKey} - **${summary.busiestDay.total}** messages` : 'No data yet.',
      inline: true,
    },
    {
      name: 'Top Members',
      value: formatLeaderboard(summary.topUsers, (item) => `<@${item.userId}>`),
      inline: false,
    },
    {
      name: 'Top Channels',
      value: formatLeaderboard(summary.topChannels, (item) => `<#${item.channelId}>`),
      inline: false,
    },
  ],
  footer: 'Moonlight Server Wrapped - every Monday 00:00',
});

const shouldRunWrappedNow = (now = new Date()) => {
  const { hour, minute } = getLocalHourMinute(now);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
  }).format(now);
  return day === 'Mon' && hour === 0 && minute === 0;
};

const sendServerWrapped = async (client, settings, now = new Date()) => {
  const guild = client.guilds.cache.get(settings.guildId);
  if (!guild) return null;

  const { currentWeekStart, startKey, endKey } = getPreviousWeekRange(now);
  if (settings.lastSentKey === currentWeekStart) return null;

  const channel = guild.channels.cache.get(settings.channelId)
    || await guild.channels.fetch(settings.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return null;

  const summary = await serverWrappedRepository.getSummary({
    guildId: guild.id,
    startKey,
    endKey,
  });

  await channel.send({
    embeds: [buildWrappedEmbed({ guild, summary, startKey, endKey })],
    allowedMentions: { parse: [] },
  });
  await serverWrappedRepository.markSent({ guildId: guild.id, sentKey: currentWeekStart });
  return summary;
};

const runServerWrappedTick = async (client, now = new Date()) => {
  if (!shouldRunWrappedNow(now)) return [];

  const settings = await serverWrappedRepository.listEnabled();
  const results = [];
  for (const setting of settings) {
    try {
      const result = await sendServerWrapped(client, setting, now);
      if (result) results.push(result);
    } catch (error) {
      console.error('Server wrapped send failed:', error);
    }
  }
  return results;
};

module.exports = {
  buildWrappedEmbed,
  recordMessageStats,
  runServerWrappedTick,
  sendServerWrapped,
  shouldRunWrappedNow,
};
