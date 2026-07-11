const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const NASA_APOD_URL = 'https://api.nasa.gov/planetary/apod';

const truncate = (text, maxLength = 900) => {
  if (!text) return 'NASA khong gui mo ta cho buc anh nay.';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
};

const formatDate = (value) => {
  if (!value) return 'Khong ro';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`NASA API HTTP ${response.status}`);
  return response.json();
};

const getApod = async ({ mode = 'today' } = {}, fetchImpl = fetch) => {
  const url = new URL(NASA_APOD_URL);
  url.searchParams.set('api_key', process.env.NASA_API_KEY || 'DEMO_KEY');
  url.searchParams.set('thumbs', 'true');
  if (mode === 'random') url.searchParams.set('count', '1');

  const payload = await fetchJson(url, fetchImpl);
  return Array.isArray(payload) ? payload[0] : payload;
};

const buildSpaceEmbed = (apod, mode = 'today') => {
  const isImage = apod.media_type === 'image';
  const imageUrl = isImage ? apod.hdurl || apod.url : apod.thumbnail_url;
  const sourceUrl = apod.url || apod.hdurl;

  return createEmbed({
    title: `Space ${mode === 'random' ? 'Discovery' : 'Today'} - ${apod.title || 'NASA APOD'}`,
    description: truncate(apod.explanation),
    variant: 'system',
    thumbnail: icons.system,
    image: imageUrl,
    fields: [
      {
        name: 'Date',
        value: formatDate(apod.date),
        inline: true,
      },
      {
        name: 'Type',
        value: apod.media_type || 'unknown',
        inline: true,
      },
      {
        name: 'Source',
        value: sourceUrl ? `[Open NASA media](${sourceUrl})` : 'NASA APOD',
        inline: false,
      },
      ...(apod.copyright ? [{
        name: 'Credit',
        value: apod.copyright,
        inline: false,
      }] : []),
    ],
    footer: 'Moonlight Space - Data by NASA APOD',
  });
};

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply();

  try {
    const apod = await getApod({ mode: subcommand });
    await interaction.editReply({ embeds: [buildSpaceEmbed(apod, subcommand)] });
  } catch (error) {
    await interaction.editReply(`Khong lay duoc du lieu vu tru luc nay: ${error.message}`);
  }
};

module.exports = {
  category: 'system',
  label: 'Space',

  data: new SlashCommandBuilder()
    .setName('space')
    .setDescription('Xem anh vu tru tu NASA')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('today')
        .setDescription('Xem anh vu tru hom nay cua NASA')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('random')
        .setDescription('Xem mot anh vu tru ngau nhien cua NASA')
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildSpaceEmbed,
    formatDate,
    getApod,
    truncate,
  },
};
