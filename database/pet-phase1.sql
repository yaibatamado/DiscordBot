IF DB_ID('DiscordBot') IS NULL
BEGIN
    CREATE DATABASE DiscordBot;
END;
GO

USE DiscordBot;
GO

IF OBJECT_ID('dbo.UserPets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserPets (
        user_id NVARCHAR(32) NOT NULL PRIMARY KEY,
        status NVARCHAR(24) NOT NULL,
        pet_key NVARCHAR(120) NULL,
        name NVARCHAR(100) NULL,
        custom_name NVARCHAR(100) NULL,
        theme NVARCHAR(100) NULL,
        rarity NVARCHAR(24) NULL,
        description NVARCHAR(500) NULL,
        image_url NVARCHAR(1000) NULL,
        level INT NOT NULL CONSTRAINT DF_UserPets_level DEFAULT 1,
        exp INT NOT NULL CONSTRAINT DF_UserPets_exp DEFAULT 0,
        max_level INT NOT NULL CONSTRAINT DF_UserPets_max_level DEFAULT 150,
        hunger INT NOT NULL CONSTRAINT DF_UserPets_hunger DEFAULT 100,
        happiness INT NOT NULL CONSTRAINT DF_UserPets_happiness DEFAULT 100,
        stamina INT NOT NULL CONSTRAINT DF_UserPets_stamina DEFAULT 100,
        max_stamina INT NOT NULL CONSTRAINT DF_UserPets_max_stamina DEFAULT 100,
        health INT NOT NULL CONSTRAINT DF_UserPets_health DEFAULT 100,
        attack INT NOT NULL CONSTRAINT DF_UserPets_attack DEFAULT 0,
        defense INT NOT NULL CONSTRAINT DF_UserPets_defense DEFAULT 0,
        speed INT NOT NULL CONSTRAINT DF_UserPets_speed DEFAULT 0,
        hatch_ready_at DATETIME2 NULL,
        claimed_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_UserPets_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_UserPets_updated_at DEFAULT SYSUTCDATETIME()
    );
END;
GO
