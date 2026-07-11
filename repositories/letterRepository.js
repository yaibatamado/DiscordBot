const db = require('../utils/db');

const normalizeRecipient = (recipient) => String(recipient || '').trim().replace(/\s+/g, ' ');

const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    recipient: row.recipient_name,
    message: row.message_text,
    song: row.song_title,
    songUrl: row.song_url,
    imageUrl: row.song_image_url,
    anonymous: Boolean(row.is_anonymous),
    createdAt: row.created_at,
  };
};

const createLetterRepository = (database = db) => {
  let tableReady = false;

  const ensureTable = async () => {
    if (tableReady) return;

    const pool = await database.getPool();
    await pool.request().query(`
      IF OBJECT_ID('dbo.MoonlightLetters', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MoonlightLetters (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          guild_id NVARCHAR(32) NOT NULL,
          channel_id NVARCHAR(32) NULL,
          message_id NVARCHAR(32) NULL,
          sender_id NVARCHAR(32) NOT NULL,
          sender_name NVARCHAR(80) NULL,
          recipient_name NVARCHAR(80) NOT NULL,
          message_text NVARCHAR(1800) NOT NULL,
          song_title NVARCHAR(160) NOT NULL,
          song_url NVARCHAR(500) NULL,
          song_image_url NVARCHAR(500) NULL,
          is_anonymous BIT NOT NULL CONSTRAINT DF_MoonlightLetters_is_anonymous DEFAULT (1),
          created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightLetters_created_at DEFAULT (SYSUTCDATETIME())
        );

        CREATE INDEX IX_MoonlightLetters_guild_recipient
          ON dbo.MoonlightLetters (guild_id, recipient_name, id DESC);
      END
    `);

    tableReady = true;
  };

  const add = async ({
    guildId,
    channelId = null,
    senderId,
    senderName = null,
    recipient,
    message,
    song,
    songUrl = null,
    imageUrl = null,
    anonymous = true,
  }) => {
    const cleanRecipient = normalizeRecipient(recipient);
    if (!cleanRecipient) throw new Error('Recipient is required');

    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('senderId', senderId)
      .input('senderName', senderName)
      .input('recipient', cleanRecipient)
      .input('message', message)
      .input('song', song)
      .input('songUrl', songUrl)
      .input('imageUrl', imageUrl)
      .input('anonymous', anonymous ? 1 : 0)
      .query(`
        INSERT INTO dbo.MoonlightLetters (
          guild_id,
          channel_id,
          sender_id,
          sender_name,
          recipient_name,
          message_text,
          song_title,
          song_url,
          song_image_url,
          is_anonymous
        )
        OUTPUT INSERTED.*
        VALUES (
          @guildId,
          @channelId,
          @senderId,
          @senderName,
          @recipient,
          @message,
          @song,
          @songUrl,
          @imageUrl,
          @anonymous
        )
      `);

    return mapRow(result.recordset[0]);
  };

  const updateMessage = async ({ id, guildId, channelId, messageId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('id', id)
      .input('guildId', guildId)
      .input('channelId', channelId)
      .input('messageId', messageId)
      .query(`
        UPDATE dbo.MoonlightLetters
        SET channel_id = @channelId, message_id = @messageId
        OUTPUT INSERTED.*
        WHERE id = @id AND guild_id = @guildId
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
        FROM dbo.MoonlightLetters
        WHERE guild_id = @guildId AND id = @id
      `);

    return mapRow(result.recordset[0]);
  };

  const browse = async ({ guildId, recipient, limit = 5 }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('recipient', `%${normalizeRecipient(recipient)}%`)
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit) *
        FROM dbo.MoonlightLetters
        WHERE guild_id = @guildId AND recipient_name LIKE @recipient
        ORDER BY id DESC
      `);

    return result.recordset.map(mapRow);
  };

  const random = async ({ guildId }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .query(`
        SELECT TOP 1 *
        FROM dbo.MoonlightLetters
        WHERE guild_id = @guildId
        ORDER BY NEWID()
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
        DELETE FROM dbo.MoonlightLetters
        OUTPUT DELETED.*
        WHERE guild_id = @guildId AND id = @id
      `);

    return mapRow(result.recordset[0]);
  };

  return {
    add,
    browse,
    findById,
    random,
    remove,
    updateMessage,
    _private: {
      ensureTable,
    },
  };
};

module.exports = {
  ...createLetterRepository(),
  createLetterRepository,
  normalizeRecipient,
};
