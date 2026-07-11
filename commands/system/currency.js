const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');

const normalizeCurrencyCode = (value) => String(value || '').trim().toUpperCase();

const formatNumber = (value, maximumFractionDigits = 4) => (
  new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number(value))
);

const formatCurrencyAmount = (amount, currency) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    return `${formatNumber(amount)} ${currency}`;
  }
};

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const getCurrencyRate = async ({ amount, from, to }, fetchImpl = fetch) => {
  const source = normalizeCurrencyCode(from);
  const target = normalizeCurrencyCode(to);
  const url = new URL(`https://open.er-api.com/v6/latest/${source}`);
  const data = await fetchJson(url, fetchImpl);

  if (data.result && data.result !== 'success') {
    throw new Error(data['error-type'] || data.result);
  }

  const rate = data.rates?.[target];
  if (!Number.isFinite(Number(rate))) return null;

  return {
    amount: Number(amount),
    from: data.base_code || source,
    to: target,
    rate: Number(rate),
    converted: Number(amount) * Number(rate),
    updatedAt: data.time_last_update_utc,
    nextUpdateAt: data.time_next_update_utc,
  };
};

const buildCurrencyEmbed = ({ amount, from, to, rate, converted, updatedAt, nextUpdateAt }) => createEmbed({
  title: `💱 Currency - ${from} → ${to}`,
  description: [
    `**${formatCurrencyAmount(amount, from)}**`,
    `= **${formatCurrencyAmount(converted, to)}**`,
  ].join('\n'),
  variant: 'system',
  thumbnail: icons.system,
  fields: [
    { name: 'Tỉ giá', value: `1 ${from} = **${formatNumber(rate)} ${to}**`, inline: false },
    { name: 'Cập nhật', value: updatedAt || 'Không rõ', inline: false },
    { name: 'Lần cập nhật tiếp theo', value: nextUpdateAt || 'Không rõ', inline: false },
  ],
  footer: 'Moonlight Currency · Data by ExchangeRate-API',
});

const execute = async (interaction) => {
  const amount = interaction.options.getNumber('amount', true);
  const from = interaction.options.getString('from', true);
  const to = interaction.options.getString('to', true);

  await interaction.deferReply();

  try {
    const result = await getCurrencyRate({ amount, from, to });
    if (!result) {
      await interaction.editReply(`Không tìm thấy tỉ giá từ **${from}** sang **${to}**.`);
      return;
    }

    await interaction.editReply({ embeds: [buildCurrencyEmbed(result)] });
  } catch (error) {
    await interaction.editReply(`Không đổi được tiền tệ lúc này: ${error.message}`);
  }
};

module.exports = {
  category: 'system',
  label: 'Currency',

  data: new SlashCommandBuilder()
    .setName('currency')
    .setDescription('Đổi tiền tệ theo tỉ giá mới nhất')
    .addNumberOption((option) =>
      option
        .setName('amount')
        .setDescription('Số tiền cần đổi')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addStringOption((option) =>
      option
        .setName('from')
        .setDescription('Mã tiền nguồn, ví dụ: USD, VND, JPY')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(3)
    )
    .addStringOption((option) =>
      option
        .setName('to')
        .setDescription('Mã tiền đích, ví dụ: VND, USD, EUR')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(3)
    )
    .setDMPermission(false),

  execute,

  _private: {
    buildCurrencyEmbed,
    formatCurrencyAmount,
    getCurrencyRate,
    normalizeCurrencyCode,
  },
};
