const assert = require('node:assert/strict');
const test = require('node:test');

test('ui embed helper applies shared bot styling', () => {
  const { createEmbed } = require('../utils/uiEmbed');

  const embed = createEmbed({
    title: 'Tiêu đề',
    description: 'Nội dung',
    variant: 'pet',
  });

  assert.equal(embed.data.title, 'Tiêu đề');
  assert.equal(embed.data.description, 'Nội dung');
  assert.equal(embed.data.footer.text, 'Moonlight');
  assert.ok(embed.data.timestamp);
});
