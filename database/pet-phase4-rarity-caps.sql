USE DiscordBot;
GO

UPDATE dbo.UserPets
SET max_level = CASE rarity
    WHEN 'Common' THEN 20
    WHEN 'Rare' THEN 40
    WHEN 'Epic' THEN 70
    WHEN 'Legendary' THEN 100
    WHEN 'Mythic' THEN 130
    WHEN 'Divine' THEN 150
    ELSE max_level
END,
updated_at = SYSUTCDATETIME()
WHERE status <> 'incubating';
GO
