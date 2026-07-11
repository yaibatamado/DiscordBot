const db = require('../utils/db');

const mapSettings = (row) => {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    channelId: row.channel_id,
    enabled: Boolean(row.is_enabled),
    lastSentKey: row.last_sent_key,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
};

const createServerWrappedRepository = (database = db) => {
  let tableReady = false;

  const ensureTable = async () => {
    if (tableReady) return;
    const pool = await database.getPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.MoonlightServerWrappedSettings', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightServerWrappedSettings (
          guild_id NVARCHAR(32) NOT NULL PRIMARY KEY,
          channel_id NVARCHAR(32) NOT NULL,
          is_enabled BIT NOT NULL CONSTRAINT DF_MoonlightServerWrappedSettings_is_enabled DEFAULT (1),
          last_sent_key NVARCHAR(20) NULL,
          updated_by NVARCHAR(32) NULL,
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightServerWrappedSettings_updated_at DEFAULT (SYSUTCDATETIME())
        );
      END

      IF OBJECT_ID('dbo.MoonlightMessageStats', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightMessageStats (
          guild_id NVARCHAR(32) NOT NULL,
          channel_id NVARCHAR(32) NOT NULL,
          user_id NVARCHAR(32) NOT NULL,
          date_key NVARCHAR(10) NOT NULL,
          message_count INT NOT NULL CONSTRAINT DF_MoonlightMessageStats_message_count DEFAULT (0),
          CONSTRAINT PK_MoonlightMessageStats PRIMARY KEY (guild_id, channel_id, user_id, date_key)
        );

        CREATE INDEX IX_MoonlightMessageStats_guild_date
          ON dbo.MoonlightMessageStats (guild_id, date_key);
      END
    `);
    tableReady = true;
  };

  const setSettings = async ({ guildId, channelId, enabled, updatedBy }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('enabled', enabled ? 1 : 0)
      .input('updatedBy', updatedBy)
      .query(`
        MERGE dbo.MoonlightServerWrappedSettings AS target
        USING (SELECT @guildId AS guild_id) AS source
          ON target.guild_id = source.guild_id
        WHEN MATCHED THEN
          UPDATE SET channel_id = @channelId, is_enabled = @enabled, updated_by = @updatedBy, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (guild_id, channel_id, is_enabled, updated_by)
          VALUES (@guildId, @channelId, @enabled, @updatedBy)
        OUTPUT INSERTED.*;
      `);
    return mapSettings(result.recordset[0]);
  };

  const getSettings = async (guildId) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .query('SELECT TOP 1 * FROM dbo.MoonlightServerWrappedSettings WHERE guild_id = @guildId');
    return mapSettings(result.recordset[0]);
  };

  const listEnabled = async () => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request().query(`
      SELECT *
      FROM dbo.MoonlightServerWrappedSettings
      WHERE is_enabled = 1
    `);
    return result.recordset.map(mapSettings);
  };

  const markSent = async ({ guildId, sentKey }) => {
    await ensureTable();
    const pool = await database.getPool();
    await pool.request()
      .input('guildId', guildId)
      .input('sentKey', sentKey)
      .query(`
        UPDATE dbo.MoonlightServerWrappedSettings
        SET last_sent_key = @sentKey, updated_at = SYSUTCDATETIME()
        WHERE guild_id = @guildId
      `);
  };

  const recordMessage = async ({ guildId, channelId, userId, dateKey }) => {
    await ensureTable();
    const pool = await database.getPool();
    await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('userId', userId)
      .input('dateKey', dateKey)
      .query(`
        MERGE dbo.MoonlightMessageStats AS target
        USING (
          SELECT @guildId AS guild_id, @channelId AS channel_id, @userId AS user_id, @dateKey AS date_key
        ) AS source
          ON target.guild_id = source.guild_id
          AND target.channel_id = source.channel_id
          AND target.user_id = source.user_id
          AND target.date_key = source.date_key
        WHEN MATCHED THEN
          UPDATE SET message_count = message_count + 1
        WHEN NOT MATCHED THEN
          INSERT (guild_id, channel_id, user_id, date_key, message_count)
          VALUES (@guildId, @channelId, @userId, @dateKey, 1);
      `);
  };

  const getSummary = async ({ guildId, startKey, endKey }) => {
    await ensureTable();
    const pool = await database.getPool();
    const request = pool.request()
      .input('guildId', guildId)
      .input('startKey', startKey)
      .input('endKey', endKey);

    const [total, users, channels, days] = await Promise.all([
      request.query(`
        SELECT COALESCE(SUM(message_count), 0) AS total
        FROM dbo.MoonlightMessageStats
        WHERE guild_id = @guildId AND date_key BETWEEN @startKey AND @endKey
      `),
      pool.request()
        .input('guildId', guildId)
        .input('startKey', startKey)
        .input('endKey', endKey)
        .query(`
          SELECT TOP 5 user_id, SUM(message_count) AS total
          FROM dbo.MoonlightMessageStats
          WHERE guild_id = @guildId AND date_key BETWEEN @startKey AND @endKey
          GROUP BY user_id
          ORDER BY total DESC
        `),
      pool.request()
        .input('guildId', guildId)
        .input('startKey', startKey)
        .input('endKey', endKey)
        .query(`
          SELECT TOP 5 channel_id, SUM(message_count) AS total
          FROM dbo.MoonlightMessageStats
          WHERE guild_id = @guildId AND date_key BETWEEN @startKey AND @endKey
          GROUP BY channel_id
          ORDER BY total DESC
        `),
      pool.request()
        .input('guildId', guildId)
        .input('startKey', startKey)
        .input('endKey', endKey)
        .query(`
          SELECT TOP 1 date_key, SUM(message_count) AS total
          FROM dbo.MoonlightMessageStats
          WHERE guild_id = @guildId AND date_key BETWEEN @startKey AND @endKey
          GROUP BY date_key
          ORDER BY total DESC
        `),
    ]);

    return {
      totalMessages: Number(total.recordset[0]?.total || 0),
      topUsers: users.recordset.map((row) => ({ userId: row.user_id, total: Number(row.total || 0) })),
      topChannels: channels.recordset.map((row) => ({ channelId: row.channel_id, total: Number(row.total || 0) })),
      busiestDay: days.recordset[0]
        ? { dateKey: days.recordset[0].date_key, total: Number(days.recordset[0].total || 0) }
        : null,
    };
  };

  return {
    getSettings,
    getSummary,
    listEnabled,
    markSent,
    recordMessage,
    setSettings,
    _private: { ensureTable },
  };
};

module.exports = {
  ...createServerWrappedRepository(),
  createServerWrappedRepository,
};
