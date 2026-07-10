IF OBJECT_ID('dbo.GuildSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GuildSettings (
        guild_id NVARCHAR(32) NOT NULL PRIMARY KEY,
        voice_log_enabled BIT NOT NULL CONSTRAINT DF_GuildSettings_voice_log_enabled DEFAULT (1),
        created_at DATETIME2 NOT NULL CONSTRAINT DF_GuildSettings_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_GuildSettings_updated_at DEFAULT SYSUTCDATETIME()
    );
END;
