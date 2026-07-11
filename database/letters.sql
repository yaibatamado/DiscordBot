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
