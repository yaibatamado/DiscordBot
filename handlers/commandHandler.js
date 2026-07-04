const fs = require('fs');
const path = require('path');

const commands = new Map();
const aliases = new Map();

const loadCommands = () => {
  commands.clear();
  aliases.clear();

  const folders = fs.readdirSync(path.join(__dirname, '../commands'));

  for (const folder of folders) {
    const files = fs.readdirSync(path.join(__dirname, `../commands/${folder}`))
      .filter(file => file.endsWith('.js'));

    for (const file of files) {
      const command = require(`../commands/${folder}/${file}`);

      if (!command.name || !command.execute) {
        continue;
      }

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
