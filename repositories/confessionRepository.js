const db = require('../utils/db');

const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    authorId: row.author_id,
    content: row.content_text,
    createdAt: row.created_at,
  };
};

const mapSettingsRow = (row) => {
  if (!row) return null;

  return {
    guildId: row.guild_id,
    channelId: row.channel_id,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
};

const createConfessionRepository = (database = db) => {
  let tableReady = false;

  const ensureTable = async () => {
    if (tableReady) return;

    const pool = await database.getPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.MoonlightConfessions', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightConfessions (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          guild_id NVARCHAR(32) NOT NULL,
          channel_id NVARCHAR(32) NOT NULL,
          message_id NVARCHAR(32) NULL,
          author_id NVARCHAR(32) NOT NULL,
          content_text NVARCHAR(1800) NOT NULL,
          created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightConfessions_created_at DEFAULT (SYSUTCDATETIME())
        );

        CREATE INDEX IX_MoonlightConfessions_guild_id
          ON dbo.MoonlightConfessions (guild_id, id DESC);
      END

      IF OBJECT_ID('dbo.MoonlightConfessionSettings', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightConfessionSettings (
          guild_id NVARCHAR(32) NOT NULL PRIMARY KEY,
          channel_id NVARCHAR(32) NOT NULL,
          updated_by NVARCHAR(32) NULL,
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightConfessionSettings_updated_at DEFAULT (SYSUTCDATETIME())
        );
      END
    `);

    tableReady = true;
  };

  const add = async ({ guildId, channelId, authorId, content }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('authorId', authorId)
      .input('content', content)
      .query(`
        INSERT INTO dbo.MoonlightConfessions (guild_id, channel_id, author_id, content_text)
        OUTPUT INSERTED.*
        VALUES (@guildId, @channelId, @authorId, @content)
      `);

    return mapRow(result.recordset[0]);
  };

  const getSettings = async (guildId) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .query(`
        SELECT TOP 1 *
        FROM dbo.MoonlightConfessionSettings
        WHERE guild_id = @guildId
      `);

    return mapSettingsRow(result.recordset[0]);
  };

  const setChannel = async ({ guildId, channelId, updatedBy }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('updatedBy', updatedBy)
      .query(`
        MERGE dbo.MoonlightConfessionSettings AS target
        USING (SELECT @guildId AS guild_id) AS source
          ON target.guild_id = source.guild_id
        WHEN MATCHED THEN
          UPDATE SET channel_id = @channelId, updated_by = @updatedBy, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (guild_id, channel_id, updated_by)
          VALUES (@guildId, @channelId, @updatedBy)
        OUTPUT INSERTED.*;
      `);

    return mapSettingsRow(result.recordset[0]);
  };

  const updateMessage = async ({ guildId, id, channelId, messageId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .input('channelId', channelId)
      .input('messageId', messageId)
      .query(`
        UPDATE dbo.MoonlightConfessions
        SET channel_id = @channelId, message_id = @messageId
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId AND id = @id
      `);

    return mapRow(result.recordset[0]);
  };

  const findById = async ({ guildId, id }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .query(`
        SELECT TOP 1 *
        FROM dbo.MoonlightConfessions
        WHERE guild_id = @guildId AND id = @id
      `);

    return mapRow(result.recordset[0]);
  };

  const remove = async ({ guildId, id }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .query(`
        DELETE FROM dbo.MoonlightConfessions
        OUTPUT DELETED.*
        WHERE guild_id = @guildId AND id = @id
      `);

    return mapRow(result.recordset[0]);
  };

  return {
    add,
    findById,
    getSettings,
    remove,
    setChannel,
    updateMessage,
    _private: {
      ensureTable,
    },
  };
};

module.exports = {
  ...createConfessionRepository(),
  createConfessionRepository,
};
