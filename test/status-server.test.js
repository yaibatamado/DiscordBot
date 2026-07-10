const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const createClient = () => ({
  isReady: () => true,
  ws: { status: 0 },
  user: { tag: 'Moonlight#3517' },
  guilds: {
    cache: new Map([
      ['guild-1', { memberCount: 10 }],
      ['guild-2', { memberCount: 5 }],
    ]),
  },
  slashCommands: new Map([
    ['help', {}],
    ['check', {}],
  ]),
  uptime: 12345,
});

test('status payload exposes live bot counters', () => {
  const { buildStatusPayload } = require('../utils/statusServer');
  const client = createClient();
  const payload = buildStatusPayload(client);

  assert.equal(payload.status, 'online');
  assert.equal(payload.guilds, 2);
  assert.equal(payload.users, 15);
  assert.equal(payload.slashCommands, 2);
  assert.equal(payload.uptimeMs, 12345);
  assert.match(payload.updatedAt, /T/);
});

test('status file writer saves the latest bot counters', () => {
  const { writeStatusFile } = require('../utils/statusServer');
  const client = createClient();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moonlight-status-'));
  const filePath = path.join(directory, 'status.json');

  const payload = writeStatusFile(client, { filePath });
  const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  assert.equal(payload.status, 'online');
  assert.equal(saved.bot, 'Moonlight#3517');
  assert.equal(saved.guilds, 2);
  assert.equal(saved.users, 15);
  assert.equal(saved.slashCommands, 2);
  assert.match(saved.updatedAt, /T/);
});

test('status publisher skips unchanged tracked status file', async () => {
  const { publishStatusFile } = require('../utils/statusServer');
  const calls = [];
  const runCommand = async (args) => {
    calls.push(args);
    return {};
  };

  const result = await publishStatusFile(path.join('repo', 'docs', 'status.json'), {
    cwd: 'repo',
    runCommand,
  });

  assert.deepEqual(result, { published: false, reason: 'unchanged' });
  assert.deepEqual(calls, [
    ['ls-files', '--error-unmatch', 'docs/status.json'],
    ['diff', '--quiet', '--', 'docs/status.json'],
  ]);
});

test('status publisher adds, commits, and pushes changed status file', async () => {
  const { publishStatusFile } = require('../utils/statusServer');
  const calls = [];
  const runCommand = async (args) => {
    calls.push(args);
    if (args[0] === 'diff') {
      const error = new Error('changed');
      error.code = 1;
      throw error;
    }
    return {};
  };

  const result = await publishStatusFile(path.join('repo', 'docs', 'status.json'), {
    cwd: 'repo',
    message: 'Update test status',
    runCommand,
  });

  assert.deepEqual(result, { published: true });
  assert.deepEqual(calls, [
    ['ls-files', '--error-unmatch', 'docs/status.json'],
    ['diff', '--quiet', '--', 'docs/status.json'],
    ['add', 'docs/status.json'],
    ['commit', '-m', 'Update test status', '--', 'docs/status.json'],
    ['push'],
  ]);
});

test('status publisher treats untracked status file as changed', async () => {
  const { publishStatusFile } = require('../utils/statusServer');
  const calls = [];
  const runCommand = async (args) => {
    calls.push(args);
    if (args[0] === 'ls-files') {
      const error = new Error('untracked');
      error.code = 1;
      throw error;
    }
    return {};
  };

  const result = await publishStatusFile(path.join('repo', 'docs', 'status.json'), {
    cwd: 'repo',
    runCommand,
  });

  assert.deepEqual(result, { published: true });
  assert.deepEqual(calls, [
    ['ls-files', '--error-unmatch', 'docs/status.json'],
    ['add', 'docs/status.json'],
    ['commit', '-m', 'Update Moonlight status', '--', 'docs/status.json'],
    ['push'],
  ]);
});
