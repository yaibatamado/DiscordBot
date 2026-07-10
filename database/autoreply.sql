IF OBJECT_ID('dbo.GuildAutoReplies', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.GuildAutoReplies (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    guild_id NVARCHAR(32) NOT NULL,
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
END;
