const { SlashCommandBuilder } = require('discord.js');
const { commands } = require('../../handlers/commandHandler');
const { buildMainHelp } = require('../../utils/helpMenu');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị danh sách lệnh của bot'),

  async execute(interaction) {
    return interaction.reply(buildMainHelp(commands, interaction.user));
  },
};
