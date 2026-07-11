const { PREFIX } = require('../config');
const { commands, aliases } = require('../handlers/commandHandler');
const logger = require('../utils/logger');
const triggerHandler = require('../handlers/triggerHandler');
const { handleAutoReply } = require('../services/autoReplyService');
const { handleAfkMessage } = require('../services/afkService');
const { recordMessageStats } = require('../services/serverWrappedService');

const cooldowns = new Map();

module.exports = (client) => {
  client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    recordMessageStats(message).catch((error) => {
      console.error('Message stats record failed:', error);
    });

    const handledAfk = await handleAfkMessage(message);
    if (handledAfk) return;
    
    // 🔥 fix riêng dấu "?"
    if (message.content.trim() === '?') {
      triggerHandler(message);
      return;
    }

    // 🔥 troll mention bằng "?"
    if (message.content.startsWith('? ') && message.mentions.users.size > 0) {

      const user = message.mentions.users.first();

      const replies = [
        `tró ${user} 🐶`,
        `${user} ăn cứt 💩`
      ];

      const random = replies[Math.floor(Math.random() * replies.length)];

      return message.reply(random);
    }

    // 🔥 trigger cho tin nhắn thường
    if (!message.content.startsWith(PREFIX)) {
      const handledAutoReply = await handleAutoReply(message);
      if (handledAutoReply) return;

      triggerHandler(message);
      return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    let cmd = args.shift().toLowerCase();

    // ===== ALIAS RESOLVE =====
    if (aliases.has(cmd)) {
      cmd = aliases.get(cmd);
    }

    const command = commands.get(cmd);
    if (!command) return;

    logger.log(`${message.author.tag} dùng lệnh: ${cmd}`);

    // ===== PERMISSION =====
    if (command.permission === 'admin') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Không có quyền');
      }
    }

    // ===== COOLDOWN =====
    if (!cooldowns.has(cmd)) cooldowns.set(cmd, new Map());

    const now = Date.now();
    const timestamps = cooldowns.get(cmd);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expiration = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expiration) {
        return message.reply(`⏳ Đợi ${((expiration - now)/1000).toFixed(1)}s`);
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      command.execute(message, args);
    } catch (err) {
      console.error(err);
      message.reply('❌ Lỗi hệ thống');
    }

  });
};
