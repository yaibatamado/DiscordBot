const assert = require('node:assert/strict');
const test = require('node:test');

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('db config requires SQL Server env values', () => {
  const previous = {
    DB_SERVER: process.env.DB_SERVER,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  delete process.env.DB_SERVER;
  delete process.env.DB_NAME;
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;

  const db = freshRequire('../utils/db');

  assert.throws(() => db.getConfig(), /Missing SQL Server env/);

  Object.entries(previous).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});

test('dbstatus is registered as a slash command', () => {
  const command = freshRequire('../commands/system/dbstatus');

  assert.equal(command.data.name, 'dbstatus');
});

test('db config supports Windows Authentication', () => {
  const previous = {
    DB_AUTH: process.env.DB_AUTH,
    DB_SERVER: process.env.DB_SERVER,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  process.env.DB_AUTH = 'windows';
  process.env.DB_SERVER = 'YAIBA_TAMADO\\SQLEXPRESS';
  process.env.DB_NAME = 'DiscordBot';
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;

  const db = freshRequire('../utils/db');
  const config = db.getConfig();

  assert.equal(config.server, 'YAIBA_TAMADO\\SQLEXPRESS');
  assert.equal(config.database, 'DiscordBot');
  assert.equal(config.options.trustedConnection, true);
  assert.match(config.connectionString, /Driver=\{ODBC Driver 17 for SQL Server\}/);
  assert.match(config.connectionString, /Trusted_Connection=yes/);

  Object.entries(previous).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});
