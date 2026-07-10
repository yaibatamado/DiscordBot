const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const readyTimestamp = Date.now();

const getWsStatus = (client) => {
  if (!client?.isReady?.()) return 'starting';
  if (client.ws?.status === 0) return 'online';
  return 'connecting';
};

const getTotalMembers = (client) => (
  [...(client.guilds?.cache?.values?.() || [])]
    .reduce((total, guild) => total + (guild.memberCount || 0), 0)
);

const buildStatusPayload = (client) => ({
  bot: client.user?.tag || 'Moonlight',
  status: getWsStatus(client),
  guilds: client.guilds?.cache?.size || 0,
  users: getTotalMembers(client),
  slashCommands: client.slashCommands?.size || 0,
  version: packageJson.version || '1.0.0',
  uptimeMs: client.uptime || 0,
  startedAt: new Date(Date.now() - (client.uptime || 0)).toISOString(),
  processStartedAt: new Date(readyTimestamp).toISOString(),
  updatedAt: new Date().toISOString(),
});

const writeStatusFile = (client, options = {}) => {
  const filePath = options.filePath || process.env.STATUS_FILE_PATH || path.join(__dirname, '..', 'docs', 'status.json');
  const currentPayload = buildStatusPayload(client);
  const payload = {
    ...currentPayload,
    status: options.status || currentPayload.status,
  };
  const body = `${JSON.stringify(payload, null, 2)}\n`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body, 'utf8');

  return payload;
};

const runGit = (args, options = {}) => new Promise((resolve, reject) => {
  execFile('git', args, { cwd: options.cwd }, (error, stdout, stderr) => {
    if (error) {
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
      return;
    }

    resolve({ stdout, stderr });
  });
});

const hasGitChanges = async (filePath, options = {}) => {
  const cwd = options.cwd || path.join(__dirname, '..');
  const relativePath = path.relative(cwd, filePath).replace(/\\/g, '/');
  const runner = options.runCommand || runGit;

  try {
    await runner(['ls-files', '--error-unmatch', relativePath], { cwd });
  } catch (error) {
    if (error.code === 1) return true;
    throw error;
  }

  try {
    await runner(['diff', '--quiet', '--', relativePath], { cwd });
    return false;
  } catch (error) {
    if (error.code === 1) return true;
    throw error;
  }
};

const publishStatusFile = async (filePath, options = {}) => {
  const cwd = options.cwd || path.join(__dirname, '..');
  const relativePath = path.relative(cwd, filePath).replace(/\\/g, '/');
  const runner = options.runCommand || runGit;
  const message = options.message || 'Update Moonlight status';

  if (!await hasGitChanges(filePath, { cwd, runCommand: runner })) {
    return { published: false, reason: 'unchanged' };
  }

  await runner(['add', relativePath], { cwd });

  try {
    await runner(['commit', '-m', message, '--', relativePath], { cwd });
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    if (output.includes('nothing to commit')) {
      return { published: false, reason: 'unchanged' };
    }
    throw error;
  }

  await runner(['push'], { cwd });
  return { published: true };
};

const startStatusFileWriter = (client, options = {}) => {
  const enabled = process.env.STATUS_FILE_ENABLED !== 'false';
  if (!enabled) return null;

  const intervalMs = Number(options.intervalMs || process.env.STATUS_FILE_INTERVAL_MS || 60000);
  const filePath = options.filePath || process.env.STATUS_FILE_PATH || path.join(__dirname, '..', 'docs', 'status.json');
  const publishEnabled = process.env.STATUS_GIT_PUSH_ENABLED === 'true';
  const publishIntervalMs = Number(options.publishIntervalMs || process.env.STATUS_GIT_PUSH_INTERVAL_MS || 300000);
  const publishMessage = options.publishMessage || process.env.STATUS_GIT_COMMIT_MESSAGE || 'Update Moonlight status';
  let lastPublishAt = 0;
  let publishing = false;

  const maybePublish = async () => {
    if (!publishEnabled || publishing) return;
    if (Date.now() - lastPublishAt < publishIntervalMs) return;

    publishing = true;
    try {
      const result = await publishStatusFile(filePath, { message: publishMessage });
      lastPublishAt = Date.now();
      if (result.published) console.log('Moonlight status file pushed to GitHub');
    } catch (error) {
      console.error(`Moonlight status git push failed: ${error.message}`);
    } finally {
      publishing = false;
    }
  };

  const write = () => {
    try {
      writeStatusFile(client, { filePath });
      maybePublish();
    } catch (error) {
      console.error(`Moonlight status file update failed: ${error.message}`);
    }
  };

  write();
  const timer = setInterval(write, intervalMs);
  timer.unref?.();

  return {
    filePath,
    stop: () => clearInterval(timer),
    write,
  };
};

const sendJson = (response, statusCode, payload) => {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(body);
};

const startStatusServer = (client, options = {}) => {
  const enabled = process.env.STATUS_API_ENABLED !== 'false';
  if (!enabled) return null;

  const port = Number(options.port || process.env.STATUS_PORT || 3001);
  const host = options.host || process.env.STATUS_HOST || '0.0.0.0';

  const server = http.createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }

    if (request.method !== 'GET' || !['/', '/status.json'].includes(request.url)) {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    sendJson(response, 200, buildStatusPayload(client));
  });

  server.on('error', (error) => {
    console.error(`Moonlight status API failed: ${error.message}`);
  });

  server.listen(port, host, () => {
    console.log(`Moonlight status API listening on http://${host}:${port}/status.json`);
  });

  return server;
};

module.exports = {
  buildStatusPayload,
  hasGitChanges,
  publishStatusFile,
  startStatusFileWriter,
  startStatusServer,
  writeStatusFile,
  _private: {
    getTotalMembers,
    getWsStatus,
  },
};
