const { commands } = require('../../handlers/commandHandler');
const { buildMainHelp } = require('../../utils/helpMenu');

module.exports = {
  name: 'help',
  aliases: ['h'],
  cooldown: 3,
  permission: 'everyone',

  execute(message) {
    message.reply(buildMainHelp(commands));
  },
};
