USE DiscordBot;
GO

IF OBJECT_ID('dbo.UserPetProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserPetProfiles (
        user_id NVARCHAR(32) NOT NULL PRIMARY KEY,
        coins BIGINT NOT NULL CONSTRAINT DF_UserPetProfiles_coins DEFAULT 0,
        last_daily_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_UserPetProfiles_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_UserPetProfiles_updated_at DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID('dbo.UserPetInventoryItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserPetInventoryItems (
        user_id NVARCHAR(32) NOT NULL,
        item_key NVARCHAR(120) NOT NULL,
        quantity BIGINT NOT NULL CONSTRAINT DF_UserPetInventoryItems_quantity DEFAULT 0,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_UserPetInventoryItems_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_UserPetInventoryItems_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserPetInventoryItems PRIMARY KEY (user_id, item_key),
        CONSTRAINT CK_UserPetInventoryItems_quantity_nonnegative CHECK (quantity >= 0)
    );
END;
GO
