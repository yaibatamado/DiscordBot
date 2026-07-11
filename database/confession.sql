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
