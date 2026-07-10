const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { assertOwner } = require('../../utils/ownerOnly');

const execFileAsync = promisify(execFile);

const getPm2ProcessName = () => process.env.pm_id || process.env.name || 'discord-bot';
const getPm2Binary = () => (process.platform === 'win32' ? 'pm2.cmd' : 'pm2');

const stopPm2 = async () => {
  await execFileAsync(getPm2Binary(), ['stop', getPm2ProcessName()], {
    windowsHide: true,
  });
};

const scheduleShutdown = (client, delayMs = 750, stopProcess = stopPm2) => {
  setTimeout(async () => {
    client?.destroy?.();

    try {
      await stopProcess();
    } catch (error) {
      process.exit(0);
    }
  }, delayMs).unref?.();
};

const execute = async (interaction) => {
  if (!(await assertOwner(interaction))) return;

  await interaction.reply({
    content: 'Moonlight dang shutdown. Neu bot chay bang PM2, minh se stop PM2 process de bot khong tu bat lai.',
    flags: MessageFlags.Ephemeral,
  });

  scheduleShutdown(interaction.client);
};

module.exports = {
  category: 'system',
  label: 'Shutdown',

  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('Owner-only shutdown bot')
    .setDMPermission(false),

  execute,

  _private: {
    getPm2Binary,
    getPm2ProcessName,
    scheduleShutdown,
    stopPm2,
  },
};
