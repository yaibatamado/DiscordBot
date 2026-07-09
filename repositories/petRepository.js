const db = require('../utils/db');

const mapRow = (row) => row || null;
const PARTY_MAX_MEMBERS = 6;

const attachMembers = (parties, members) => parties.map((party) => {
  const partyMembers = members.filter((member) => member.party_id === party.party_id);
  return {
    ...party,
    member_count: party.member_count ?? partyMembers.length,
    members: partyMembers,
  };
});

const getPartyById = async (poolOrTransaction, partyId) => {
  const partyResult = await poolOrTransaction.request()
    .input('partyId', partyId)
    .query(`
      SELECT
        p.*,
        COUNT(m.user_id) AS member_count
      FROM dbo.PetParties p
      LEFT JOIN dbo.PetPartyMembers m ON m.party_id = p.party_id
      WHERE p.party_id = @partyId
      GROUP BY p.party_id, p.leader_user_id, p.area_key, p.is_private, p.created_at, p.updated_at
    `);

  if (!partyResult.recordset[0]) return null;

  const membersResult = await poolOrTransaction.request()
    .input('partyId', partyId)
    .query(`
      SELECT party_id, user_id, display_name, joined_at
      FROM dbo.PetPartyMembers
      WHERE party_id = @partyId
      ORDER BY joined_at, user_id
    `);

  return attachMembers(partyResult.recordset, membersResult.recordset)[0];
};

const ensureUserProfile = async (userId, transaction) => {
  await transaction.request()
    .input('userId', userId)
    .query(`
      MERGE dbo.UserPetProfiles WITH (HOLDLOCK) AS target
      USING (SELECT @userId AS user_id) AS source
      ON target.user_id = source.user_id
      WHEN NOT MATCHED THEN
        INSERT (user_id) VALUES (source.user_id);
    `);

  const result = await transaction.request()
    .input('userId', userId)
    .query(`
      SELECT TOP 1 *
      FROM dbo.UserPetProfiles
      WHERE user_id = @userId
    `);

  return mapRow(result.recordset[0]);
};

const getUserPet = async (userId) => {
  const pool = await db.getPool();
  const result = await pool.request()
    .input('userId', userId)
    .query('SELECT TOP 1 * FROM dbo.UserPets WHERE user_id = @userId');

  return mapRow(result.recordset[0]);
};

const createEgg = async (userId, hatchReadyAt) => {
  const pool = await db.getPool();
  const result = await pool.request()
    .input('userId', userId)
    .input('hatchReadyAt', hatchReadyAt)
    .query(`
      INSERT INTO dbo.UserPets (user_id, status, hatch_ready_at)
      OUTPUT INSERTED.*
      VALUES (@userId, 'incubating', @hatchReadyAt)
    `);

  return mapRow(result.recordset[0]);
};

const claimPet = async (userId, pet) => {
  const pool = await db.getPool();
  const result = await pool.request()
    .input('userId', userId)
    .input('petKey', pet.pet_key)
    .input('name', pet.name)
    .input('customName', pet.custom_name)
    .input('theme', pet.theme)
    .input('rarity', pet.rarity)
    .input('description', pet.description)
    .input('imageUrl', pet.image_url)
    .input('level', pet.level)
    .input('exp', pet.exp)
    .input('maxLevel', pet.max_level)
    .input('hunger', pet.hunger)
    .input('happiness', pet.happiness)
    .input('stamina', pet.stamina)
    .input('maxStamina', pet.max_stamina)
    .input('staminaUpdatedAt', pet.stamina_updated_at)
    .input('health', pet.health)
    .input('attack', pet.attack)
    .input('defense', pet.defense)
    .input('speed', pet.speed)
    .query(`
      UPDATE dbo.UserPets
      SET
        status = 'active',
        pet_key = @petKey,
        name = @name,
        custom_name = @customName,
        theme = @theme,
        rarity = @rarity,
        description = @description,
        image_url = @imageUrl,
        level = @level,
        exp = @exp,
        max_level = @maxLevel,
        hunger = @hunger,
        happiness = @happiness,
        stamina = @stamina,
        max_stamina = @maxStamina,
        stamina_updated_at = @staminaUpdatedAt,
        health = @health,
        attack = @attack,
        defense = @defense,
        speed = @speed,
        claimed_at = SYSUTCDATETIME(),
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE user_id = @userId
    `);

  return mapRow(result.recordset[0]);
};

const renamePet = async (userId, name) => {
  const pool = await db.getPool();
  const result = await pool.request()
    .input('userId', userId)
    .input('name', name)
    .query(`
      UPDATE dbo.UserPets
      SET custom_name = @name, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE user_id = @userId
    `);

  return mapRow(result.recordset[0]);
};

const updatePetStamina = async (userId, stamina, staminaUpdatedAt) => {
  const pool = await db.getPool();
  const result = await pool.request()
    .input('userId', userId)
    .input('stamina', stamina)
    .input('staminaUpdatedAt', staminaUpdatedAt)
    .query(`
      UPDATE dbo.UserPets
      SET
        stamina = @stamina,
        stamina_updated_at = @staminaUpdatedAt,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE user_id = @userId
    `);

  return mapRow(result.recordset[0]);
};

const getInventory = async (userId) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const profile = await ensureUserProfile(userId, transaction);
    const itemsResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT item_key, quantity
        FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity > 0
        ORDER BY item_key
      `);

    await transaction.commit();
    return { profile, items: itemsResult.recordset };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const claimDaily = async (userId, claimedAt, rewards) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const profile = await ensureUserProfile(userId, transaction);

    const updatedProfileResult = await transaction.request()
      .input('userId', userId)
      .input('claimedAt', claimedAt)
      .input('coins', rewards.coins)
      .query(`
        UPDATE dbo.UserPetProfiles
        SET
          coins = coins + @coins,
          last_daily_at = @claimedAt,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE user_id = @userId
      `);

    for (const item of rewards.items) {
      await transaction.request()
        .input('userId', userId)
        .input('itemKey', item.key)
        .input('quantity', item.quantity)
        .query(`
          MERGE dbo.UserPetInventoryItems WITH (HOLDLOCK) AS target
          USING (SELECT @userId AS user_id, @itemKey AS item_key) AS source
          ON target.user_id = source.user_id AND target.item_key = source.item_key
          WHEN MATCHED THEN
            UPDATE SET quantity = target.quantity + @quantity, updated_at = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (user_id, item_key, quantity)
            VALUES (@userId, @itemKey, @quantity);
        `);
    }

    const itemsResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT item_key, quantity
        FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity > 0
        ORDER BY item_key
      `);

    await transaction.commit();
    return {
      profile: updatedProfileResult.recordset[0] || profile,
      items: itemsResult.recordset,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const applyAdventure = async (userId, changes) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const profile = await ensureUserProfile(userId, transaction);

    const petResult = await transaction.request()
      .input('userId', userId)
      .input('stamina', changes.pet.stamina)
      .input('staminaUpdatedAt', changes.pet.stamina_updated_at)
      .input('level', changes.pet.level)
      .input('exp', changes.pet.exp)
      .input('attack', changes.pet.attack)
      .input('defense', changes.pet.defense)
      .input('speed', changes.pet.speed)
      .input('health', changes.pet.health)
      .input('status', changes.pet.status)
      .query(`
        UPDATE dbo.UserPets
        SET
          stamina = @stamina,
          stamina_updated_at = @staminaUpdatedAt,
          level = @level,
          exp = @exp,
          attack = @attack,
          defense = @defense,
          speed = @speed,
          health = @health,
          status = @status,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE user_id = @userId
      `);

    const updatedProfileResult = await transaction.request()
      .input('userId', userId)
      .input('coins', changes.rewards.coins)
      .query(`
        UPDATE dbo.UserPetProfiles
        SET
          coins = coins + @coins,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE user_id = @userId
      `);

    for (const item of changes.rewards.items) {
      await transaction.request()
        .input('userId', userId)
        .input('itemKey', item.key)
        .input('quantity', item.quantity)
        .query(`
          MERGE dbo.UserPetInventoryItems WITH (HOLDLOCK) AS target
          USING (SELECT @userId AS user_id, @itemKey AS item_key) AS source
          ON target.user_id = source.user_id AND target.item_key = source.item_key
          WHEN MATCHED THEN
            UPDATE SET quantity = target.quantity + @quantity, updated_at = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (user_id, item_key, quantity)
            VALUES (@userId, @itemKey, @quantity);
        `);
    }

    const itemsResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT item_key, quantity
        FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity > 0
        ORDER BY item_key
      `);

    await transaction.commit();
    return {
      pet: petResult.recordset[0],
      profile: updatedProfileResult.recordset[0] || profile,
      items: itemsResult.recordset,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const healPet = async (userId, changes) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const profile = await ensureUserProfile(userId, transaction);

    const petResult = await transaction.request()
      .input('userId', userId)
      .input('health', changes.pet.health)
      .input('status', changes.pet.status)
      .query(`
        UPDATE dbo.UserPets
        SET
          health = @health,
          status = @status,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE user_id = @userId
      `);

    for (const item of changes.items) {
      await transaction.request()
        .input('userId', userId)
        .input('itemKey', item.key)
        .input('quantity', item.quantity)
        .query(`
          UPDATE dbo.UserPetInventoryItems
          SET
            quantity = quantity + @quantity,
            updated_at = SYSUTCDATETIME()
          WHERE user_id = @userId AND item_key = @itemKey
        `);
    }

    await transaction.request()
      .input('userId', userId)
      .query(`
        DELETE FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity <= 0
      `);

    const itemsResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT item_key, quantity
        FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity > 0
        ORDER BY item_key
      `);

    await transaction.commit();
    return {
      pet: petResult.recordset[0],
      profile,
      items: itemsResult.recordset,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const breakthroughPet = async (userId, changes) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const profile = await ensureUserProfile(userId, transaction);

    const petResult = await transaction.request()
      .input('userId', userId)
      .input('rarity', changes.pet.rarity)
      .input('maxLevel', changes.pet.max_level)
      .query(`
        UPDATE dbo.UserPets
        SET
          rarity = @rarity,
          max_level = @maxLevel,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE user_id = @userId
      `);

    for (const item of changes.items) {
      await transaction.request()
        .input('userId', userId)
        .input('itemKey', item.key)
        .input('quantity', item.quantity)
        .query(`
          UPDATE dbo.UserPetInventoryItems
          SET
            quantity = quantity + @quantity,
            updated_at = SYSUTCDATETIME()
          WHERE user_id = @userId AND item_key = @itemKey
        `);
    }

    await transaction.request()
      .input('userId', userId)
      .query(`
        DELETE FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity <= 0
      `);

    const itemsResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT item_key, quantity
        FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity > 0
        ORDER BY item_key
      `);

    await transaction.commit();
    return {
      pet: petResult.recordset[0],
      profile,
      items: itemsResult.recordset,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const purchaseItem = async (userId, purchase) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const profile = await ensureUserProfile(userId, transaction);
    const profileResult = await transaction.request()
      .input('userId', userId)
      .input('totalPrice', purchase.totalPrice)
      .query(`
        UPDATE dbo.UserPetProfiles
        SET
          coins = coins - @totalPrice,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE user_id = @userId AND coins >= @totalPrice
      `);

    if (!profileResult.recordset[0]) {
      await transaction.commit();
      return { success: false, profile, items: [] };
    }

    await transaction.request()
      .input('userId', userId)
      .input('itemKey', purchase.itemKey)
      .input('quantity', purchase.quantity)
      .query(`
        MERGE dbo.UserPetInventoryItems WITH (HOLDLOCK) AS target
        USING (SELECT @userId AS user_id, @itemKey AS item_key) AS source
        ON target.user_id = source.user_id AND target.item_key = source.item_key
        WHEN MATCHED THEN
          UPDATE SET quantity = target.quantity + @quantity, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (user_id, item_key, quantity)
          VALUES (@userId, @itemKey, @quantity);
      `);

    const itemsResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT item_key, quantity
        FROM dbo.UserPetInventoryItems
        WHERE user_id = @userId AND quantity > 0
        ORDER BY item_key
      `);

    await transaction.commit();
    return {
      success: true,
      profile: profileResult.recordset[0],
      items: itemsResult.recordset,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const getUserParty = async (userId) => {
  const pool = await db.getPool();
  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT TOP 1 party_id
      FROM dbo.PetPartyMembers
      WHERE user_id = @userId
    `);

  const row = result.recordset[0];
  return row ? getPartyById(pool, row.party_id) : null;
};

const listOpenParties = async () => {
  const pool = await db.getPool();
  const partiesResult = await pool.request()
    .input('maxMembers', PARTY_MAX_MEMBERS)
    .query(`
      SELECT TOP 25
        p.*,
        COUNT(m.user_id) AS member_count
      FROM dbo.PetParties p
      LEFT JOIN dbo.PetPartyMembers m ON m.party_id = p.party_id
      WHERE p.is_private = 0
      GROUP BY p.party_id, p.leader_user_id, p.area_key, p.is_private, p.created_at, p.updated_at
      HAVING COUNT(m.user_id) < @maxMembers
      ORDER BY p.updated_at DESC, p.created_at DESC
    `);

  const parties = partiesResult.recordset;
  if (!parties.length) return [];

  const ids = parties.map((party) => Number(party.party_id)).filter(Number.isInteger);
  const membersResult = await pool.request()
    .query(`
      SELECT party_id, user_id, display_name, joined_at
      FROM dbo.PetPartyMembers
      WHERE party_id IN (${ids.join(',')})
      ORDER BY party_id, joined_at, user_id
    `);

  return attachMembers(parties, membersResult.recordset);
};

const createParty = async (userId, party) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const partyResult = await transaction.request()
      .input('leaderUserId', userId)
      .input('areaKey', party.areaKey)
      .input('isPrivate', party.isPrivate ? 1 : 0)
      .input('createdAt', party.createdAt)
      .query(`
        INSERT INTO dbo.PetParties (leader_user_id, area_key, is_private, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@leaderUserId, @areaKey, @isPrivate, @createdAt, @createdAt)
      `);

    const created = partyResult.recordset[0];
    await transaction.request()
      .input('partyId', created.party_id)
      .input('userId', userId)
      .input('displayName', party.displayName)
      .input('joinedAt', party.createdAt)
      .query(`
        INSERT INTO dbo.PetPartyMembers (party_id, user_id, display_name, joined_at)
        VALUES (@partyId, @userId, @displayName, @joinedAt)
      `);

    const hydrated = await getPartyById(transaction, created.party_id);
    await transaction.commit();
    return hydrated;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const joinParty = async (userId, partyId, member) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const status = await transaction.request()
      .input('partyId', partyId)
      .input('maxMembers', PARTY_MAX_MEMBERS)
      .query(`
        SELECT p.party_id, p.is_private, COUNT(m.user_id) AS member_count
        FROM dbo.PetParties p WITH (UPDLOCK, HOLDLOCK)
        LEFT JOIN dbo.PetPartyMembers m ON m.party_id = p.party_id
        WHERE p.party_id = @partyId
        GROUP BY p.party_id, p.is_private
      `);

    const party = status.recordset[0];
    if (!party || party.is_private || Number(party.member_count) >= PARTY_MAX_MEMBERS) {
      await transaction.commit();
      return null;
    }

    await transaction.request()
      .input('partyId', partyId)
      .input('userId', userId)
      .input('displayName', member.displayName)
      .input('joinedAt', member.joinedAt)
      .query(`
        INSERT INTO dbo.PetPartyMembers (party_id, user_id, display_name, joined_at)
        VALUES (@partyId, @userId, @displayName, @joinedAt)

        UPDATE dbo.PetParties
        SET updated_at = SYSUTCDATETIME()
        WHERE party_id = @partyId
      `);

    const hydrated = await getPartyById(transaction, partyId);
    await transaction.commit();
    return hydrated;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const leaveParty = async (userId) => {
  const pool = await db.getPool();
  const transaction = pool.transaction();

  await transaction.begin();
  try {
    const currentResult = await transaction.request()
      .input('userId', userId)
      .query(`
        SELECT TOP 1 party_id
        FROM dbo.PetPartyMembers WITH (UPDLOCK, HOLDLOCK)
        WHERE user_id = @userId
      `);

    const current = currentResult.recordset[0];
    if (!current) {
      await transaction.commit();
      return null;
    }

    await transaction.request()
      .input('userId', userId)
      .input('partyId', current.party_id)
      .query(`
        DELETE FROM dbo.PetPartyMembers
        WHERE user_id = @userId AND party_id = @partyId
      `);

    const remainingResult = await transaction.request()
      .input('partyId', current.party_id)
      .query(`
        SELECT TOP 1 user_id
        FROM dbo.PetPartyMembers
        WHERE party_id = @partyId
        ORDER BY joined_at, user_id
      `);

    const nextLeader = remainingResult.recordset[0];
    if (!nextLeader) {
      await transaction.request()
        .input('partyId', current.party_id)
        .query('DELETE FROM dbo.PetParties WHERE party_id = @partyId');
      await transaction.commit();
      return { deleted: true, party: null };
    }

    await transaction.request()
      .input('partyId', current.party_id)
      .input('leaderUserId', nextLeader.user_id)
      .query(`
        UPDATE dbo.PetParties
        SET leader_user_id = @leaderUserId, updated_at = SYSUTCDATETIME()
        WHERE party_id = @partyId
      `);

    const hydrated = await getPartyById(transaction, current.party_id);
    await transaction.commit();
    return { deleted: false, party: hydrated };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

module.exports = {
  getUserPet,
  createEgg,
  claimPet,
  renamePet,
  updatePetStamina,
  getInventory,
  claimDaily,
  applyAdventure,
  healPet,
  breakthroughPet,
  purchaseItem,
  getUserParty,
  listOpenParties,
  createParty,
  joinParty,
  leaveParty,
};
