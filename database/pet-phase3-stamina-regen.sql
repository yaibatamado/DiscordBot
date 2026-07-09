USE DiscordBot;
GO

IF COL_LENGTH('dbo.UserPets', 'stamina_updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.UserPets
    ADD stamina_updated_at DATETIME2 NULL;
END;
GO

UPDATE dbo.UserPets
SET stamina_updated_at = COALESCE(stamina_updated_at, updated_at, claimed_at, SYSUTCDATETIME())
WHERE stamina_updated_at IS NULL;
GO
