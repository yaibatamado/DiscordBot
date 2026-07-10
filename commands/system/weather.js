const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const weatherCodeText = {
  0: 'Troi quang',
  1: 'Gan nhu quang',
  2: 'It may',
  3: 'Nhieu may',
  45: 'Suong mu',
  48: 'Suong mu dong bang',
  51: 'Mua phun nhe',
  53: 'Mua phun vua',
  55: 'Mua phun nang',
  61: 'Mua nhe',
  63: 'Mua vua',
  65: 'Mua nang',
  80: 'Mua rao nhe',
  81: 'Mua rao vua',
  82: 'Mua rao nang',
  95: 'Dong',
  96: 'Dong co mua da nhe',
  99: 'Dong co mua da nang',
};

const formatNumber = (value, unit = '') => (
  Number.isFinite(Number(value)) ? `${Math.round(Number(value))}${unit}` : 'N/A'
);

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
  forecast.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m');
  forecast.searchParams.set('timezone', 'auto');

  const weather = await fetchJson(forecast, fetchImpl);
  return { place, current: weather.current };
};

const buildWeatherEmbed = ({ place, current }) => {
  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
  const code = current?.weather_code;

  return createEmbed({
    title: `Weather - ${placeName}`,
    description: weatherCodeText[code] || 'Khong ro dieu kien thoi tiet',
    variant: 'system',
    thumbnail: icons.system,
    fields: [
      { name: 'Nhiet do', value: formatNumber(current?.temperature_2m, '°C'), inline: true },
      { name: 'Cam giac nhu', value: formatNumber(current?.apparent_temperature, '°C'), inline: true },
      { name: 'Do am', value: formatNumber(current?.relative_humidity_2m, '%'), inline: true },
      { name: 'Gio', value: formatNumber(current?.wind_speed_10m, ' km/h'), inline: true },
      { name: 'Vi tri', value: placeName || 'Unknown', inline: false },
    ],
    footer: 'Data by Open-Meteo',
  });
};

const execute = async (interaction) => {
  const location = interaction.options.getString('location', true);

  await interaction.deferReply();

  try {
    const result = await getWeather(location);
    if (!result) {
      await interaction.editReply(`Khong tim thay dia diem: **${location}**.`);
      return;
    }

    await interaction.editReply({ embeds: [buildWeatherEmbed(result)] });
  } catch (error) {
    await interaction.editReply(`Khong lay duoc thoi tiet luc nay: ${error.message}`);
  }
};

module.exports = {
  category: 'system',
  label: 'Weather',

  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Xem thoi tiet theo dia diem')
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('Dia diem can xem thoi tiet, vi du: Ho Chi Minh, Hanoi, Tokyo')
        .setRequired(true)
        .setMaxLength(100)
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildWeatherEmbed,
    getWeather,
    weatherCodeText,
  },
};
