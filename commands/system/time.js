const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const getTimeLocation = async (location, fetchImpl = fetch, now = new Date()) => {
  const search = new URL('https://geocoding-api.open-meteo.com/v1/search');
  search.searchParams.set('name', location);
  search.searchParams.set('count', '1');
  search.searchParams.set('language', 'vi');
  search.searchParams.set('format', 'json');

  const geocoding = await fetchJson(search, fetchImpl);
  const place = geocoding.results?.[0];
  if (!place?.timezone) return null;

  return { place, now, timezone: place.timezone };
};

const formatInTimezone = (date, timezone, options, locale = 'vi-VN') => (
  new Intl.DateTimeFormat(locale, { timeZone: timezone, ...options }).format(date)
);

const getUtcOffset = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);

  return parts.find((part) => part.type === 'timeZoneName')?.value || timezone;
};

const buildTimeEmbed = ({ place, now, timezone }) => {
  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
  const time = formatInTimezone(now, timezone, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const date = formatInTimezone(now, timezone, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return createEmbed({
    title: `🕒 Giờ địa phương - ${place.name}`,
    description: `**${time}**\n${date}`,
    variant: 'system',
    thumbnail: icons.system,
    fields: [
      { name: '📍 Vị trí', value: placeName || place.name, inline: false },
      { name: '🌐 Timezone', value: `\`${timezone}\``, inline: true },
      { name: 'UTC Offset', value: `\`${getUtcOffset(now, timezone)}\``, inline: true },
    ],
    footer: 'Moonlight Time · Location by Open-Meteo',
  });
};

const execute = async (interaction) => {
  const location = interaction.options.getString('location', true);

  await interaction.deferReply();

  try {
    const result = await getTimeLocation(location);
    if (!result) {
      await interaction.editReply(`Không tìm thấy timezone cho địa điểm: **${location}**.`);
      return;
    }

    await interaction.editReply({ embeds: [buildTimeEmbed(result)] });
  } catch (error) {
    await interaction.editReply(`Không lấy được giờ địa phương lúc này: ${error.message}`);
  }
};

module.exports = {
  category: 'system',
  label: 'Time',

  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('Xem giờ hiện tại theo địa điểm')
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('Địa điểm cần xem giờ, ví dụ: Hanoi, Tokyo, New York')
        .setRequired(true)
        .setMaxLength(100)
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildTimeEmbed,
    formatInTimezone,
    getTimeLocation,
    getUtcOffset,
  },
};
