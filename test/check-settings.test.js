const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits } = require('discord.js');

test('check command reports missing permissions', () => {
  const check = require('../commands/system/check');
  const member = {
    permissions: {
      has: (permission) => permission === PermissionFlagsBits.ViewChannel,
    },
  };
  const channel = {
    id: 'channel-1',
    permissionsFor: () => ({
      has: (permission) => permission === PermissionFlagsBits.ViewChannel,
    }),
  };

  const report = check._private.buildPermissionReport(member, channel);
  const embed = check._private.buildCheckEmbed({
    guild: { name: 'Test Guild' },
    channel,
    report,
  });

  assert.equal(report.some((item) => !item.ok), true);
  assert.match(embed.data.title, /Permission Check/);
  assert.match(embed.data.fields.at(-1).value, /Administrator/);
});

test('settings embed shows voice log status', () => {
  const settings = require('../commands/system/settings');

  const enabled = settings._private.buildSettingsEmbed({ voiceLogEnabled: true });
  const disabled = settings._private.buildSettingsEmbed({ voiceLogEnabled: false });

  assert.match(enabled.data.fields[0].value, /Đang bật/);
  assert.match(disabled.data.fields[0].value, /Đang tắt/);
});
