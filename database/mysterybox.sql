IF OBJECT_ID('dbo.MoonlightMysteryBoxSettings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MoonlightMysteryBoxSettings (
    guild_id NVARCHAR(32) NOT NULL PRIMARY KEY,
    channel_id NVARCHAR(32) NULL,
    is_enabled BIT NOT NULL CONSTRAINT DF_MoonlightMysteryBoxSettings_is_enabled DEFAULT (1),
    language_code NVARCHAR(8) NOT NULL CONSTRAINT DF_MoonlightMysteryBoxSettings_language_code DEFAULT ('en'),
    updated_by NVARCHAR(32) NULL,
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightMysteryBoxSettings_updated_at DEFAULT (SYSUTCDATETIME())
  );
END

IF OBJECT_ID('dbo.MoonlightMysteryBoxes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MoonlightMysteryBoxes (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    guild_id NVARCHAR(32) NOT NULL,
    channel_id NVARCHAR(32) NOT NULL,
    message_id NVARCHAR(32) NULL,
    box_type NVARCHAR(40) NOT NULL,
    title_text NVARCHAR(120) NOT NULL,
    content_text NVARCHAR(800) NOT NULL,
    reward_text NVARCHAR(300) NOT NULL,
    language_code NVARCHAR(8) NOT NULL CONSTRAINT DF_MoonlightMysteryBoxes_language_code DEFAULT ('en'),
    sent_key NVARCHAR(32) NOT NULL,
    claimed_by NVARCHAR(32) NULL,
    claimed_at DATETIME2 NULL,
    expires_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightMysteryBoxes_expires_at DEFAULT (DATEADD(MINUTE, 5, SYSUTCDATETIME())),
    expired_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightMysteryBoxes_created_at DEFAULT (SYSUTCDATETIME())
  );

  CREATE UNIQUE INDEX UX_MoonlightMysteryBoxes_guild_sent
    ON dbo.MoonlightMysteryBoxes (guild_id, sent_key);
END

IF COL_LENGTH('dbo.MoonlightMysteryBoxSettings', 'language_code') IS NULL
BEGIN
  ALTER TABLE dbo.MoonlightMysteryBoxSettings
    ADD language_code NVARCHAR(8) NOT NULL CONSTRAINT DF_MoonlightMysteryBoxSettings_language_code DEFAULT ('en');
END

IF COL_LENGTH('dbo.MoonlightMysteryBoxes', 'language_code') IS NULL
BEGIN
  ALTER TABLE dbo.MoonlightMysteryBoxes
    ADD language_code NVARCHAR(8) NOT NULL CONSTRAINT DF_MoonlightMysteryBoxes_language_code DEFAULT ('en');
END
