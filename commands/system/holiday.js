const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const normalizeCountryCode = (value) => String(value || '').trim().toUpperCase();

const formatHolidayDate = (dateText, locale = 'vi-VN') => {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateText;

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const daysUntil = (dateText, now = new Date()) => {
  const target = new Date(`${dateText}T00:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (Number.isNaN(target.getTime())) return null;

  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const getPublicHolidays = async ({ country, year }, fetchImpl = fetch) => {
  const countryCode = normalizeCountryCode(country);
  const targetYear = Number(year) || new Date().getUTCFullYear();
  const url = new URL(`https://date.nager.at/api/v3/PublicHolidays/${targetYear}/${countryCode}`);
  const holidays = await fetchJson(url, fetchImpl);

  return {
    countryCode,
    year: targetYear,
    holidays: Array.isArray(holidays) ? holidays : [],
  };
};

const selectHolidays = (holidays, { upcomingOnly = true, now = new Date(), limit = 10 } = {}) => {
  const sorted = [...holidays].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const filtered = upcomingOnly
    ? sorted.filter((holiday) => {
      const left = daysUntil(holiday.date, now);
      return left === null || left >= 0;
    })
    : sorted;

  return filtered.slice(0, limit);
};

const formatHolidayLine = (holiday, now) => {
  const left = daysUntil(holiday.date, now);
  const countdown = left === null
    ? ''
    : left === 0
      ? ' · **hôm nay**'
      : left > 0
        ? ` · còn **${left} ngày**`
        : ` · đã qua **${Math.abs(left)} ngày**`;

  return [
    `**${formatHolidayDate(holiday.date)}**${countdown}`,
    `${holiday.localName || holiday.name}`,
    holiday.name && holiday.name !== holiday.localName ? `_${holiday.name}_` : null,
  ].filter(Boolean).join('\n');
};

const buildHolidayEmbed = ({ countryCode, year, holidays }, options = {}) => {
  const upcomingOnly = options.upcomingOnly ?? true;
  const now = options.now || new Date();
  const selected = selectHolidays(holidays, { upcomingOnly, now });
  const titlePrefix = upcomingOnly ? 'Ngày lễ sắp tới' : 'Ngày lễ';

  return createEmbed({
    title: `🎌 ${titlePrefix} - ${countryCode} ${year}`,
    description: selected.length > 0
      ? `Hiển thị **${selected.length}** ngày lễ ${upcomingOnly ? 'sắp tới' : 'trong năm'}.`
      : 'Không tìm thấy ngày lễ phù hợp.',
    variant: 'system',
    thumbnail: icons.system,
    fields: selected.map((holiday) => ({
      name: holiday.localName || holiday.name || holiday.date,
      value: formatHolidayLine(holiday, now),
      inline: false,
    })),
    footer: 'Moonlight Holiday · Data by Nager.Date',
  });
};

const execute = async (interaction) => {
  const country = interaction.options.getString('country', true);
  const year = interaction.options.getInteger('year') || new Date().getUTCFullYear();
  const upcomingOnly = interaction.options.getBoolean('upcoming') ?? true;

  await interaction.deferReply();

  try {
    const result = await getPublicHolidays({ country, year });
    await interaction.editReply({
      embeds: [buildHolidayEmbed(result, { upcomingOnly })],
    });
  } catch (error) {
    await interaction.editReply(`Không lấy được ngày lễ lúc này. Hãy thử mã quốc gia dạng ISO-2 như \`VN\`, \`US\`, \`JP\`. (${error.message})`);
  }
};

module.exports = {
  category: 'system',
  label: 'Holiday',

  data: new SlashCommandBuilder()
    .setName('holiday')
    .setDescription('Xem ngày lễ theo quốc gia')
    .addStringOption((option) =>
      option
        .setName('country')
        .setDescription('Mã quốc gia ISO-2, ví dụ: VN, US, JP')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(2)
    )
    .addIntegerOption((option) =>
      option
        .setName('year')
        .setDescription('Năm cần xem, bỏ trống để dùng năm hiện tại')
        .setMinValue(1970)
        .setMaxValue(2100)
    )
    .addBooleanOption((option) =>
      option
        .setName('upcoming')
        .setDescription('Chỉ hiện ngày lễ sắp tới trong năm đã chọn')
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildHolidayEmbed,
    daysUntil,
    formatHolidayDate,
    getPublicHolidays,
    normalizeCountryCode,
    selectHolidays,
  },
};
