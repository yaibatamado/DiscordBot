const db = require('../utils/db');

const mapSettings = (row) => {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    channelId: row.channel_id,
    enabled: Boolean(row.is_enabled),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
};

const mapBox = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    boxType: row.box_type,
    title: row.title_text,
    content: row.content_text,
    reward: row.reward_text,
    sentKey: row.sent_key,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    expiresAt: row.expires_at,
    expiredAt: row.expired_at,
    createdAt: row.created_at,
  };
};

const createMysteryBoxRepository = (database = db) => {
  let tableReady = false;

  const ensureTable = async () => {
    if (tableReady) return;
    const pool = await database.getPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.MoonlightMysteryBoxSettings', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightMysteryBoxSettings (
          guild_id NVARCHAR(32) NOT NULL PRIMARY KEY,
          channel_id NVARCHAR(32) NULL,
          is_enabled BIT NOT NULL CONSTRAINT DF_MoonlightMysteryBoxSettings_is_enabled DEFAULT (1),
          updated_by NVARCHAR(32) NULL,
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightMysteryBoxSettings_updated_at DEFAULT (SYSUTCDATETIME())
        );
      END

      IF OBJECT_ID('dbo.MoonlightMysteryBoxes', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightMysteryBoxes (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          guild_id NVARCHAR(32) NOT NULL,
          channel_id NVARCHAR(32) NOT NULL,
          message_id NVARCHAR(32) NULL,
          box_type NVARCHAR(40) NOT NULL,
          title_text NVARCHAR(120) NOT NULL,
          content_text NVARCHAR(800) NOT NULL,
          reward_text NVARCHAR(300) NOT NULL,
          sent_key NVARCHAR(32) NOT NULL,
          claimed_by NVARCHAR(32) NULL,
          claimed_at DATETIME2 NULL,
          expires_at DATETIME2 NOT NULL,
          expired_at DATETIME2 NULL,
          created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightMysteryBoxes_created_at DEFAULT (SYSUTCDATETIME())
        );

        CREATE UNIQUE INDEX UX_MoonlightMysteryBoxes_guild_sent
          ON dbo.MoonlightMysteryBoxes (guild_id, sent_key);
      END

      IF COL_LENGTH('dbo.MoonlightMysteryBoxSettings', 'channel_id') IS NULL
      BEGIN
        ALTER TABLE dbo.MoonlightMysteryBoxSettings
          ADD channel_id NVARCHAR(32) NULL;
      END

      IF COL_LENGTH('dbo.MoonlightMysteryBoxes', 'expires_at') IS NULL
      BEGIN
        ALTER TABLE dbo.MoonlightMysteryBoxes
          ADD expires_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightMysteryBoxes_expires_at DEFAULT (DATEADD(MINUTE, 5, SYSUTCDATETIME()));
      END

      IF COL_LENGTH('dbo.MoonlightMysteryBoxes', 'expired_at') IS NULL
      BEGIN
        ALTER TABLE dbo.MoonlightMysteryBoxes
          ADD expired_at DATETIME2 NULL;
      END
    `);
    tableReady = true;
  };

  const setSettings = async ({ guildId, channelId = null, enabled, updatedBy }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('enabled', enabled ? 1 : 0)
      .input('updatedBy', updatedBy)
      .query(`
        MERGE dbo.MoonlightMysteryBoxSettings AS target
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
      .query('SELECT TOP 1 * FROM dbo.MoonlightMysteryBoxSettings WHERE guild_id = @guildId');
    return mapSettings(result.recordset[0]);
  };

  const listEnabled = async () => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request().query(`
      SELECT *
      FROM dbo.MoonlightMysteryBoxSettings
      WHERE is_enabled = 1
    `);
    return result.recordset.map(mapSettings);
  };

  const addBox = async ({ guildId, channelId, boxType, title, content, reward, sentKey, expiresAt }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('boxType', boxType)
      .input('title', title)
      .input('content', content)
      .input('reward', reward)
      .input('sentKey', sentKey)
      .input('expiresAt', expiresAt)
      .query(`
        INSERT INTO dbo.MoonlightMysteryBoxes (
          guild_id, channel_id, box_type, title_text, content_text, reward_text, sent_key, expires_at
        )
        OUTPUT INSERTED.*
        VALUES (@guildId, @channelId, @boxType, @title, @content, @reward, @sentKey, @expiresAt)
      `);
    return mapBox(result.recordset[0]);
  };

  const updateMessage = async ({ guildId, id, messageId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .input('messageId', messageId)
      .query(`
        UPDATE dbo.MoonlightMysteryBoxes
        SET message_id = @messageId
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId AND id = @id
      `);
    return mapBox(result.recordset[0]);
  };

  const findBox = async ({ guildId, id }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .query('SELECT TOP 1 * FROM dbo.MoonlightMysteryBoxes WHERE guild_id = @guildId AND id = @id');
    return mapBox(result.recordset[0]);
  };

  const claimBox = async ({ guildId, id, userId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .input('userId', userId)
      .query(`
        UPDATE dbo.MoonlightMysteryBoxes
        SET claimed_by = @userId, claimed_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId
          AND id = @id
          AND claimed_by IS NULL
          AND expired_at IS NULL
          AND expires_at > SYSUTCDATETIME()
      `);
    return mapBox(result.recordset[0]);
  };

  const expireBox = async ({ guildId, id }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .query(`
        UPDATE dbo.MoonlightMysteryBoxes
        SET expired_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId
          AND id = @id
          AND claimed_by IS NULL
          AND expired_at IS NULL
      `);
    return mapBox(result.recordset[0]);
  };

  return {
    addBox,
    claimBox,
    expireBox,
    findBox,
    getSettings,
    listEnabled,
    setSettings,
    updateMessage,
    _private: { ensureTable },
  };
};

module.exports = {
  ...createMysteryBoxRepository(),
  createMysteryBoxRepository,
};
