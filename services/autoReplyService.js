const autoReplyRepository = require('../repositories/autoReplyRepository');
const {
  containsToken,
  hasValidTriggerLength,
  normalizeAutoReplyText,
} = require('../utils/autoReplyMatch');

const cache = new Map();
const defaultCacheMs = 30 * 1000;

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
  const text = normalizeAutoReplyText(content);
  const trigger = normalizeAutoReplyText(rule.trigger);
  if (!text || !trigger) return false;

  if (!hasValidTriggerLength(trigger, rule.matchMode)) return false;
  if (rule.matchMode === 'exact') return text === trigger;
  if (rule.matchMode === 'starts_with') return text.startsWith(trigger);
  return containsToken(text, trigger);
};

const isRuleAllowedInChannel = (rule, channelId) => !rule.channelId || rule.channelId === channelId;

const findMatchingAutoReply = (content, rules) => {
  const sorted = [...rules].sort((a, b) => {
    const priority = { exact: 0, starts_with: 1, contains: 2 };
    return (priority[a.matchMode] ?? 9) - (priority[b.matchMode] ?? 9) || a.id - b.id;
  });

  return sorted.find((rule) => matchesRule(content, rule)) || null;
};

const getReplyOptions = (template) => String(template || '')
  .split('||')
  .map((reply) => reply.trim())
  .filter(Boolean);

const pickReplyTemplate = (template, random = Math.random) => {
  const options = getReplyOptions(template);
  if (options.length === 0) return '';
  return options[Math.floor(random() * options.length)] || options[0];
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
    const channelRules = rules.filter((rule) => isRuleAllowedInChannel(rule, message.channelId || message.channel?.id));
    const rule = findMatchingAutoReply(message.content, channelRules);
    if (!rule) return false;

    await message.reply({
      content: renderReply(pickReplyTemplate(rule.reply), message),
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
  getReplyOptions,
  handleAutoReply,
  hasValidTriggerLength,
  isRuleAllowedInChannel,
  matchesRule,
  pickReplyTemplate,
  renderReply,
  _private: {
    getCachedRules,
    normalize: normalizeAutoReplyText,
  },
};
