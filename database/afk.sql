IF OBJECT_ID('dbo.MoonlightAfkUsers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MoonlightAfkUsers (
    guild_id NVARCHAR(32) NOT NULL,
    user_id NVARCHAR(32) NOT NULL,
    reason_text NVARCHAR(300) NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_MoonlightAfkUsers_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_MoonlightAfkUsers PRIMARY KEY (guild_id, user_id)
  );
END
