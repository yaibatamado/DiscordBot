module.exports = (message) => {

  const content = message.content.trim().toLowerCase();

  // 🔥 trigger "?"
  if (content === '?') {
    return message.reply('ĂN CỨT');
  }

  // 🔥 trigger chào
  const greetings = ['hi', 'hello', 'xin chào', 'chào', 'helo', 'hí', 'bello', 'hế lô', 'halo'];

  if (greetings.includes(content)) {
    return message.reply(`👋 Nà ná na na hế lô ${message.author} nhóo!`);
  }

  const botngu = ['bot ngu', 'ngu'];

  if (botngu.includes(content)) {
    return message.reply(`${message.author} biết cái tró gì mà nói? 🤬`);
  }
};