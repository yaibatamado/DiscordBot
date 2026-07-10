IF OBJECT_ID('dbo.PetPartyMembers', 'U') IS NOT NULL
  DROP TABLE dbo.PetPartyMembers;

IF OBJECT_ID('dbo.PetParties', 'U') IS NOT NULL
  DROP TABLE dbo.PetParties;

IF OBJECT_ID('dbo.UserPetInventoryItems', 'U') IS NOT NULL
  DROP TABLE dbo.UserPetInventoryItems;

IF OBJECT_ID('dbo.UserPetProfiles', 'U') IS NOT NULL
  DROP TABLE dbo.UserPetProfiles;

IF OBJECT_ID('dbo.UserPets', 'U') IS NOT NULL
  DROP TABLE dbo.UserPets;
