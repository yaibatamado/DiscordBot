USE DiscordBot;
GO

IF OBJECT_ID('dbo.PetParties', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PetParties (
        party_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        leader_user_id NVARCHAR(32) NOT NULL,
        area_key NVARCHAR(64) NOT NULL CONSTRAINT DF_PetParties_area_key DEFAULT ('meadow'),
        is_private BIT NOT NULL CONSTRAINT DF_PetParties_is_private DEFAULT (0),
        created_at DATETIME2 NOT NULL CONSTRAINT DF_PetParties_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_PetParties_updated_at DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID('dbo.PetPartyMembers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PetPartyMembers (
        party_id INT NOT NULL,
        user_id NVARCHAR(32) NOT NULL,
        display_name NVARCHAR(100) NOT NULL,
        joined_at DATETIME2 NOT NULL CONSTRAINT DF_PetPartyMembers_joined_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PetPartyMembers PRIMARY KEY (party_id, user_id),
        CONSTRAINT FK_PetPartyMembers_PetParties FOREIGN KEY (party_id)
            REFERENCES dbo.PetParties(party_id)
            ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_PetPartyMembers_user_id'
      AND object_id = OBJECT_ID('dbo.PetPartyMembers')
)
BEGIN
    CREATE UNIQUE INDEX UX_PetPartyMembers_user_id
    ON dbo.PetPartyMembers(user_id);
END;
GO
