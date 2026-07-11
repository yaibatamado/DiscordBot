const db = require('../utils/db');

const mapRow = (row) => {
  if (!row) return null;

  return {
    guildId: row.guild_id,
    userId: row.user_id,
    reason: row.reason_text,
    createdAt: row.created_at,
  };
};

const createAfkRepository = (database = db) => {
  let tableReady = false;

  const ensureTable = async () => {
    if (tableReady) return;

    const pool = await database.getPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.MoonlightAfkUsers', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightAfkUsers (
          guild_id NVARCHAR(32) NOT NULL,
          user_id NVARCHAR(32) NOT NULL,
          reason_text NVARCHAR(300) NOT NULL,
          created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightAfkUsers_created_at DEFAULT (SYSUTCDATETIME()),
          CONSTRAINT PK_MoonlightAfkUsers PRIMARY KEY (guild_id, user_id)
        );
      END
    `);

    tableReady = true;
  };

  const set = async ({ guildId, userId, reason }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('userId', userId)
      .input('reason', reason)
      .query(`
        MERGE dbo.MoonlightAfkUsers AS target
        USING (SELECT @guildId AS guild_id, @userId AS user_id) AS source
          ON target.guild_id = source.guild_id AND target.user_id = source.user_id
        WHEN MATCHED THEN
          UPDATE SET reason_text = @reason, created_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (guild_id, user_id, reason_text)
          VALUES (@guildId, @userId, @reason)
        OUTPUT INSERTED.*;
      `);

    return mapRow(result.recordset[0]);
  };

  const find = async ({ guildId, userId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('userId', userId)
      .query(`
        SELECT TOP 1 *
        FROM dbo.MoonlightAfkUsers
        WHERE guild_id = @guildId AND user_id = @userId
      `);

    return mapRow(result.recordset[0]);
  };

  const findMany = async ({ guildId, userIds }) => {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return [];

    await ensureTable();
    const pool = await database.getPool();
    const request = pool.request().input('guildId', guildId);
    const placeholders = ids.map((id, index) => {
      request.input(`userId${index}`, id);
      return `@userId${index}`;
    });

    const result = await request.query(`
      SELECT *
      FROM dbo.MoonlightAfkUsers
      WHERE guild_id = @guildId AND user_id IN (${placeholders.join(', ')})
    `);

    return result.recordset.map(mapRow);
  };

  const remove = async ({ guildId, userId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('userId', userId)
      .query(`
        DELETE FROM dbo.MoonlightAfkUsers
        OUTPUT DELETED.*
        WHERE guild_id = @guildId AND user_id = @userId
      `);

    return mapRow(result.recordset[0]);
  };

  return {
    find,
    findMany,
    remove,
    set,
    _private: {
      ensureTable,
    },
  };
};

module.exports = {
  ...createAfkRepository(),
  createAfkRepository,
};
