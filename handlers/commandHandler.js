const fs = require('fs');
const path = require('path');

const commands = new Map();
const aliases = new Map();

const loadCommands = () => {

  const folders = fs.readdirSync(path.join(__dirname, '../commands'));

  for (const folder of folders) {
    const files = fs.readdirSync(path.join(__dirname, `../commands/${folder}`));

    for (const file of files) {
      const command = require(`../commands/${folder}/${file}`);

      // ===== COMMAND =====
      commands.set(command.name, command);

      // ===== ALIAS =====
      if (command.aliases) {
        for (const alias of command.aliases) {
          aliases.set(alias, command.name);
        }
      }

      console.log(`✅ Loaded command: ${command.name}`);
    }
  }
};

module.exports = {
  commands,
  aliases,
  loadCommands
};