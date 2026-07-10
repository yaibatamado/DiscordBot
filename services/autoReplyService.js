const autoReplyRepository = require('../repositories/autoReplyRepository');

const cache = new Map();
const defaultCacheMs = 30 * 1000;

const normalize = (value) => String(value || '').trim().toLowerCase();

const clearAutoReplyCache = (guildId) => {
  if (guildId) {
    cache.delete(guildId);
    return;
  }

  cache.clear();
};

const getCachedRules = async (guildId, repository = autoReplyRepository, ttlMs = defaultCacheMs) => {
  const now = Date.now();
  const cached = cache.get(guildId);

  if (cached && cached.expiresAt > now) return cached.rules;

  const rules = await repository.getActive(guildId);
  cache.set(guildId, {
    rules,
    expiresAt: now + ttlMs,
  });

  return rules;
};

const matchesRule = (content, rule) => {
  const text = normalize(content);
  const trigger = normalize(rule.trigger);
  if (!text || !trigger) return false;

  if (rule.matchMode === 'exact') return text === trigger;
  if (rule.matchMode === 'starts_with') return text.startsWith(trigger);
  return text.includes(trigger);
};

const findMatchingAutoReply = (content, rules) => {
  const sorted = [...rules].sort((a, b) => {
    const priority = { exact: 0, starts_with: 1, contains: 2 };
    return (priority[a.matchMode] ?? 9) - (priority[b.matchMode] ?? 9) || a.id - b.id;
  });

  return sorted.find((rule) => matchesRule(content, rule)) || null;
};

const renderReply = (template, message) => String(template || '')
  .replaceAll('{user}', `<@${message.author.id}>`)
  .replaceAll('{username}', message.author.username || message.author.tag || 'user')
  .replaceAll('{server}', message.guild?.name || 'server')
  .replaceAll('{channel}', message.channel ? `<#${message.channel.id}>` : 'channel');

const handleAutoReply = async (message, repository = autoReplyRepository) => {
  if (!message.guildId || !message.content || message.author?.bot) return false;

  try {
    const rules = await getCachedRules(message.guildId, repository);
    const rule = findMatchingAutoReply(message.content, rules);
    if (!rule) return false;

    await message.reply({
      content: renderReply(rule.reply, message),
      allowedMentions: {
        parse: [],
        users: [message.author.id],
        roles: [],
      },
    });

    return true;
  } catch (error) {
    console.error(`Moonlight autoreply failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  clearAutoReplyCache,
  findMatchingAutoReply,
  handleAutoReply,
  matchesRule,
  renderReply,
  _private: {
    getCachedRules,
  },
};
