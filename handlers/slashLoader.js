const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.slashCommands = new Map();

  const folders = fs.readdirSync('./commands');

  for (const folder of folders) {
    const files = fs.readdirSync(`./commands/${folder}`).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const command = require(`../commands/${folder}/${file}`);

      if (command.data && command.data.toJSON && command.execute) {
        client.slashCommands.set(command.data.name, command);
        console.log(`✅ Loaded slash: ${command.data.name}`);
      }
    }
  }
};
