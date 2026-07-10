const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { assertOwner } = require('../../utils/ownerOnly');

const scheduleRestart = (delayMs = 750) => {
  setTimeout(() => {
    process.exit(0);
  }, delayMs).unref?.();
};

const execute = async (interaction) => {
  if (!(await assertOwner(interaction))) return;

  await interaction.reply({
    content: 'Moonlight dang restart. Neu bot dang chay bang PM2, PM2 se tu bat lai bot.',
    flags: MessageFlags.Ephemeral,
  });

  scheduleRestart();
};

module.exports = {
  category: 'system',
  label: 'Restart',

  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Owner-only restart bot through PM2')
    .setDMPermission(false),

  execute,

  _private: {
    scheduleRestart,
  },
};
