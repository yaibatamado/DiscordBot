const sql = require('mssql');
const db = require('./db');

const defaultGuildSettings = {
  voiceLogEnabled: true,
};

let ensurePromise;

const ensureTable = async () => {
  if (!ensurePromise) {
    ensurePromise = db.getPool().then((pool) => pool.request().query(`
      IF OBJECT_ID('dbo.GuildSettings', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.GuildSettings (
          guild_id NVARCHAR(32) NOT NULL PRIMARY KEY,
          voice_log_enabled BIT NOT NULL CONSTRAINT DF_GuildSettings_voice_log_enabled DEFAULT (1),
          created_at DATETIME2 NOT NULL CONSTRAINT DF_GuildSettings_created_at DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_GuildSettings_updated_at DEFAULT SYSUTCDATETIME()
        );
      END
    `));
  }

  return ensurePromise;
};

const mapRow = (row) => ({
  voiceLogEnabled: row?.voice_log_enabled === undefined
    ? defaultGuildSettings.voiceLogEnabled
    : Boolean(row.voice_log_enabled),
});

const getGuildSettings = async (guildId) => {
  try {
    await ensureTable();
    const pool = await db.getPool();
    const result = await pool.request()
      .input('guildId', sql.NVarChar(32), guildId)
      .query(`
        SELECT TOP 1 voice_log_enabled
        FROM dbo.GuildSettings
        WHERE guild_id = @guildId
      `);

    return {
      ...defaultGuildSettings,
      ...mapRow(result.recordset[0]),
    };
  } catch (error) {
    return { ...defaultGuildSettings };
  }
};

const updateGuildSettings = async (guildId, changes) => {
  await ensureTable();
  const pool = await db.getPool();
  const voiceLogEnabled = changes.voiceLogEnabled ?? defaultGuildSettings.voiceLogEnabled;

  const result = await pool.request()
    .input('guildId', sql.NVarChar(32), guildId)
    .input('voiceLogEnabled', sql.Bit, voiceLogEnabled)
    .query(`
      MERGE dbo.GuildSettings WITH (HOLDLOCK) AS target
      USING (SELECT @guildId AS guild_id) AS source
      ON target.guild_id = source.guild_id
      WHEN MATCHED THEN
        UPDATE SET
          voice_log_enabled = @voiceLogEnabled,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (guild_id, voice_log_enabled)
        VALUES (@guildId, @voiceLogEnabled)
      OUTPUT inserted.voice_log_enabled;
    `);

  return {
    ...defaultGuildSettings,
    ...mapRow(result.recordset[0]),
  };
};

module.exports = {
  defaultGuildSettings,
  getGuildSettings,
  updateGuildSettings,
  _private: {
    ensureTable,
    mapRow,
  },
};
