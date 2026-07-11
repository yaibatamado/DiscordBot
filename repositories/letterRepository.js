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
    tag: row.tag_text,
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
          tag_text NVARCHAR(40) NULL,
          is_anonymous BIT NOT NULL CONSTRAINT DF_MoonlightLetters_is_anonymous DEFAULT (1),
          created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightLetters_created_at DEFAULT (SYSUTCDATETIME())
        );

        CREATE INDEX IX_MoonlightLetters_guild_recipient
          ON dbo.MoonlightLetters (guild_id, recipient_name, id DESC);
      END

      IF COL_LENGTH('dbo.MoonlightLetters', 'tag_text') IS NULL
      BEGIN
        ALTER TABLE dbo.MoonlightLetters
          ADD tag_text NVARCHAR(40) NULL;

        CREATE INDEX IX_MoonlightLetters_guild_tag
          ON dbo.MoonlightLetters (guild_id, tag_text, id DESC);
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
    tag = null,
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
      .input('tag', tag)
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
          tag_text,
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
          @tag,
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

  const list = async ({
    guildId,
    recipient = null,
    tag = null,
    senderId = null,
    limit = 5,
    offset = 0,
  }) => {
    await ensureTable();
    const cleanRecipient = normalizeRecipient(recipient);
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('recipient', cleanRecipient ? `%${cleanRecipient}%` : null)
      .input('tag', tag || null)
      .input('senderId', senderId || null)
      .input('limit', limit)
      .input('offset', offset)
      .query(`
        SELECT *
        FROM dbo.MoonlightLetters
        WHERE guild_id = @guildId
          AND (@recipient IS NULL OR recipient_name LIKE @recipient)
          AND (@tag IS NULL OR tag_text = @tag)
          AND (@senderId IS NULL OR sender_id = @senderId)
        ORDER BY id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return result.recordset.map(mapRow);
  };

  const count = async ({
    guildId,
    recipient = null,
    tag = null,
    senderId = null,
  }) => {
    await ensureTable();
    const cleanRecipient = normalizeRecipient(recipient);
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('recipient', cleanRecipient ? `%${cleanRecipient}%` : null)
      .input('tag', tag || null)
      .input('senderId', senderId || null)
      .query(`
        SELECT COUNT(1) AS total
        FROM dbo.MoonlightLetters
        WHERE guild_id = @guildId
          AND (@recipient IS NULL OR recipient_name LIKE @recipient)
          AND (@tag IS NULL OR tag_text = @tag)
          AND (@senderId IS NULL OR sender_id = @senderId)
      `);

    return Number(result.recordset[0]?.total || 0);
  };

  const browse = async ({ guildId, recipient = null, tag = null, limit = 5, offset = 0 }) => list({
    guildId,
    recipient,
    tag,
    limit,
    offset,
  });

  const mine = async ({ guildId, senderId, tag = null, limit = 5, offset = 0 }) => list({
    guildId,
    senderId,
    tag,
    limit,
    offset,
  });

  const updateContent = async ({
    guildId,
    id,
    message = null,
    song = null,
    songUrl = null,
    imageUrl = null,
    tag = null,
    anonymous = null,
  }) => {
    await ensureTable();
    const pool = await database.getPool();
    const result = await pool.request()
      .input('guildId', guildId)
      .input('id', id)
      .input('message', message)
      .input('song', song)
      .input('songUrl', songUrl)
      .input('imageUrl', imageUrl)
      .input('tag', tag)
      .input('anonymous', typeof anonymous === 'boolean' ? (anonymous ? 1 : 0) : null)
      .query(`
        UPDATE dbo.MoonlightLetters
        SET
          message_text = COALESCE(@message, message_text),
          song_title = COALESCE(@song, song_title),
          song_url = CASE WHEN @songUrl IS NULL THEN song_url ELSE @songUrl END,
          song_image_url = CASE WHEN @imageUrl IS NULL THEN song_image_url ELSE @imageUrl END,
          tag_text = CASE WHEN @tag IS NULL THEN tag_text ELSE @tag END,
          is_anonymous = CASE WHEN @anonymous IS NULL THEN is_anonymous ELSE @anonymous END
        OUTPUT INSERTED.*
        WHERE guild_id = @guildId AND id = @id
      `);

    return mapRow(result.recordset[0]);
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
    count,
    findById,
    list,
    mine,
    random,
    remove,
    updateContent,
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
