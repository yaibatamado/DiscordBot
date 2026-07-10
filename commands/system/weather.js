const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const weatherCodeText = {
  0: 'Trời quang',
  1: 'Gần như quang',
  2: 'Ít mây',
  3: 'Nhiều mây',
  45: 'Sương mù',
  48: 'Sương mù đóng băng',
  51: 'Mưa phùn nhẹ',
  53: 'Mưa phùn vừa',
  55: 'Mưa phùn nặng',
  61: 'Mưa nhẹ',
  63: 'Mưa vừa',
  65: 'Mưa nặng',
  80: 'Mưa rào nhẹ',
  81: 'Mưa rào vừa',
  82: 'Mưa rào nặng',
  95: 'Dông',
  96: 'Dông có mưa đá nhẹ',
  99: 'Dông có mưa đá nặng',
};

const weatherCodeIcon = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌧️',
  61: '🌦️',
  63: '🌧️',
  65: '🌧️',
  80: '🌦️',
  81: '🌧️',
  82: '⛈️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

const formatNumber = (value, unit = '') => (
  Number.isFinite(Number(value)) ? `${Math.round(Number(value))}${unit}` : 'N/A'
);

const formatTime = (isoTime) => {
  if (!isoTime) return 'Không rõ';
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return isoTime;

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const getWeather = async (location, fetchImpl = fetch) => {
  const search = new URL('https://geocoding-api.open-meteo.com/v1/search');
  search.searchParams.set('name', location);
  search.searchParams.set('count', '1');
  search.searchParams.set('language', 'vi');
  search.searchParams.set('format', 'json');

  const geocoding = await fetchJson(search, fetchImpl);
  const place = geocoding.results?.[0];
  if (!place) return null;

  const forecast = new URL('https://api.open-meteo.com/v1/forecast');
  forecast.searchParams.set('latitude', place.latitude);
  forecast.searchParams.set('longitude', place.longitude);
  forecast.searchParams.set(
    'current',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
    ].join(',')
  );
  forecast.searchParams.set('timezone', 'auto');

  const weather = await fetchJson(forecast, fetchImpl);
  return { place, current: weather.current };
};

const buildWeatherEmbed = ({ place, current }) => {
  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
  const code = current?.weather_code;
  const condition = weatherCodeText[code] || 'Không rõ điều kiện thời tiết';
  const icon = weatherCodeIcon[code] || (current?.is_day ? '🌤️' : '🌙');
  const temperature = formatNumber(current?.temperature_2m, '°C');
  const feelsLike = formatNumber(current?.apparent_temperature, '°C');

  return createEmbed({
    title: `${icon} Thời tiết - ${place.name}`,
    description: [
      `**${temperature}** · ${condition}`,
      `Cảm giác như **${feelsLike}** tại **${placeName}**.`,
    ].join('\n'),
    variant: 'system',
    thumbnail: icons.system,
    fields: [
      {
        name: '🌡️ Nhiệt độ',
        value: [
          `Hiện tại: **${temperature}**`,
          `Cảm giác: **${feelsLike}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '💧 Không khí',
        value: [
          `Độ ẩm: **${formatNumber(current?.relative_humidity_2m, '%')}**`,
          `Mây: **${formatNumber(current?.cloud_cover, '%')}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '🌬️ Gió & mưa',
        value: [
          `Gió: **${formatNumber(current?.wind_speed_10m, ' km/h')}**`,
          `Mưa: **${formatNumber(current?.precipitation, ' mm')}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: '📍 Vị trí',
        value: placeName || 'Unknown',
        inline: false,
      },
      {
        name: '🕒 Cập nhật',
        value: [
          formatTime(current?.time),
          `Áp suất: **${formatNumber(current?.surface_pressure, ' hPa')}**`,
        ].join('\n'),
        inline: false,
      },
    ],
    footer: 'Moonlight Weather · Data by Open-Meteo',
  });
};

const execute = async (interaction) => {
  const location = interaction.options.getString('location', true);

  await interaction.deferReply();

  try {
    const result = await getWeather(location);
    if (!result) {
      await interaction.editReply(`Không tìm thấy địa điểm: **${location}**.`);
      return;
    }

    await interaction.editReply({ embeds: [buildWeatherEmbed(result)] });
  } catch (error) {
    await interaction.editReply(`Không lấy được thời tiết lúc này: ${error.message}`);
  }
};

module.exports = {
  category: 'system',
  label: 'Weather',

  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Xem thời tiết theo địa điểm')
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('Địa điểm cần xem thời tiết, ví dụ: Ho Chi Minh, Hanoi, Tokyo')
        .setRequired(true)
        .setMaxLength(100)
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildWeatherEmbed,
    formatTime,
    getWeather,
    weatherCodeIcon,
    weatherCodeText,
  },
};
