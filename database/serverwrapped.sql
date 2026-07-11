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
