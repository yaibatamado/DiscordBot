const db = require('../utils/db');

const validMatchModes = new Set(['contains', 'exact', 'starts_with']);

const normalizeTrigger = (trigger) => String(trigger || '').trim().replace(/\s+/g, ' ');

const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    guildId: row.guild_id,
    trigger: row.trigger_text,
    reply: row.reply_text,
    channelId: row.channel_id,
    matchMode: row.match_mode,
    enabled: Boolean(row.is_enabled),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createAutoReplyRepository = (database = db) => {
  let tableReady = false;

  const ensureTable = async () => {
    if (tableReady) return;

    const pool = await database.getPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.GuildAutoReplies', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.GuildAutoReplies (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          guild_id NVARCHAR(32) NOT NULL,
          channel_id NVARCHAR(32) NULL,
          trigger_text NVARCHAR(120) NOT NULL,
          reply_text NVARCHAR(1800) NOT NULL,
          match_mode NVARCHAR(20) NOT NULL CONSTRAINT DF_GuildAutoReplies_match_mode DEFAULT ('contains'),
          is_enabled BIT NOT NULL CONSTRAINT DF_GuildAutoReplies_is_enabled DEFAULT (1),
          created_by NVARCHAR(32) NULL,
          created_at DATETIME2 NOT NULL CONSTRAINT DF_GuildAutoReplies_created_at DEFAULT (SYSUTCDATETIME()),
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_GuildAutoReplies_updated_at DEFAULT (SYSUTCDATETIME())
        );

        CREATE UNIQUE INDEX UX_GuildAutoReplies_guild_trigger
          ON dbo.GuildAutoReplies (guild_id, trigger_text);
      END

      IF COL_LENGTH('dbo.GuildAutoReplies', 'channel_id') IS NULL
      BEGIN
        ALTER TABLE dbo.GuildAutoReplies
          ADD channel_id NVARCHAR(32) NULL;
      END
    `);

    tableReady = true;
  };

  const add = async ({ guildId, trigger, reply, matchMode = 'contains', channelId = null, createdBy }) => {
    const cleanTrigger = normalizeTrigger(trigger);
    if (!validMatchModes.has(matchMode)) throw new Error('Invalid autoreply match mode');

    await ensureTable();
    const pool = await database.getPool();
    const existing = await pool.request()
      .input('guildId', guildId)
      .input('trigger', cleanTrigger)
      .query(`
        SELECT TOP 1 id
        FROM dbo.GuildAutoReplies
        WHERE guild_id = @guildId AND LOWER(trigger_text) = LOWER(@trigger)
      `);

    if (existing.recordset[0]) {
      const error = new Error('Auto reply trigger already exists');
      error.code = 'DUPLICATE_AUTOREPLY';
      throw error;
    }

    const result = await pool.request()
      .input('guildId', guildId)
      .input('trigger', cleanTrigger)
      .input('reply', reply)
      .input('matchMode', matchMode)
      .input('channelId', channelId)
      .input('createdBy', createdBy)
      .query(`
        INSERT INTO dbo.GuildAutoReplies (guild_id, channel_id, trigger_text, reply_text, match_mode, created_by)
        OUTPUT INSERTED.*
        VALUES (@guildId, @channelId, @trigger, @reply, @matchMode, @createdBy)
      `);

    return mapRow(result.recordset[0]);
  };

  const list = async (guildId, { includeDisabled = true } = {}) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('includeDisabled', includeDisabled ? 1 : 0)
      .query(`
        SELECT TOP 50 *
        FROM dbo.GuildAutoReplies
        WHERE guild_id = @guildId AND (@includeDisabled = 1 OR is_enabled = 1)
        ORDER BY id ASC
      `);

    return result.recordset.map(mapRow);
  };

  const updateReply = async ({ guildId, trigger, reply }) => {
    const cleanTrigger = normalizeTrigger(trigger);
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('trigger', cleanTrigger)
      .input('reply', reply)
      .query(`
        UPDATE dbo.GuildAutoReplies
        SET reply_text = @reply, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId AND LOWER(trigger_text) = LOWER(@trigger)
      `);

    return mapRow(result.recordset[0]);
  };

  const remove = async ({ guildId, trigger }) => {
    const cleanTrigger = normalizeTrigger(trigger);
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('trigger', cleanTrigger)
      .query(`
        DELETE FROM dbo.GuildAutoReplies
        OUTPUT DELETED.*
        WHERE guild_id = @guildId AND LOWER(trigger_text) = LOWER(@trigger)
      `);

    return mapRow(result.recordset[0]);
  };

  const setEnabled = async ({ guildId, trigger, enabled }) => {
    const cleanTrigger = normalizeTrigger(trigger);
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('trigger', cleanTrigger)
      .input('enabled', enabled ? 1 : 0)
      .query(`
        UPDATE dbo.GuildAutoReplies
        SET is_enabled = @enabled, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId AND LOWER(trigger_text) = LOWER(@trigger)
      `);

    return mapRow(result.recordset[0]);
  };

  const setChannel = async ({ guildId, trigger, channelId = null }) => {
    const cleanTrigger = normalizeTrigger(trigger);
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('trigger', cleanTrigger)
      .input('channelId', channelId)
      .query(`
        UPDATE dbo.GuildAutoReplies
        SET channel_id = @channelId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId AND LOWER(trigger_text) = LOWER(@trigger)
      `);

    return mapRow(result.recordset[0]);
  };

  const getActive = async (guildId) => list(guildId, { includeDisabled: false });

  return {
    add,
    getActive,
    list,
    remove,
    setChannel,
    setEnabled,
    updateReply,
    _private: {
      ensureTable,
    },
  };
};

module.exports = {
  ...createAutoReplyRepository(),
  createAutoReplyRepository,
  normalizeTrigger,
  validMatchModes,
};
