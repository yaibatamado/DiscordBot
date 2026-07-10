const minimumTriggerLength = {
  contains: 3,
  starts_with: 2,
};

const normalizeAutoReplyText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const hasValidTriggerLength = (trigger, matchMode) => {
  const minimum = minimumTriggerLength[matchMode] || 1;
  return normalizeAutoReplyText(trigger).length >= minimum;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsToken = (text, trigger) => {
  if (trigger.includes(' ')) return text.includes(trigger);

  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(trigger)}($|[^\\p{L}\\p{N}_])`, 'u');
  return pattern.test(text);
};

module.exports = {
  containsToken,
  hasValidTriggerLength,
  minimumTriggerLength,
  normalizeAutoReplyText,
};
