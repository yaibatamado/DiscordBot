const assert = require('node:assert/strict');
const test = require('node:test');

const createMemoryRepo = () => {
  const users = new Map();
  const profiles = new Map();
  const inventories = new Map();

  const ensureProfile = (userId) => {
    if (!profiles.has(userId)) {
      profiles.set(userId, { user_id: userId, coins: 0, last_daily_at: null });
    }

    return profiles.get(userId);
  };

  const getItems = (userId) => [
    ...(inventories.get(userId) || new Map()).entries(),
  ].map(([item_key, quantity]) => ({ item_key, quantity }));

  return {
    async getUserPet(userId) {
      return users.get(userId) || null;
    },
    async createEgg(userId, hatchReadyAt) {
      const pet = {
        user_id: userId,
        status: 'incubating',
        hatch_ready_at: hatchReadyAt,
      };
      users.set(userId, pet);
      return pet;
    },
    async claimPet(userId, petData) {
      const pet = {
        user_id: userId,
        status: 'active',
        ...petData,
      };
      users.set(userId, pet);
      return pet;
    },
    async renamePet(userId, name) {
      const pet = users.get(userId);
      pet.custom_name = name;
      users.set(userId, pet);
      return pet;
    },
    async updatePetStamina(userId, stamina, staminaUpdatedAt) {
      const pet = users.get(userId);
      pet.stamina = stamina;
      pet.stamina_updated_at = staminaUpdatedAt;
      users.set(userId, pet);
      return pet;
    },
    async getInventory(userId) {
      return {
        profile: ensureProfile(userId),
        items: getItems(userId),
      };
    },
    async claimDaily(userId, claimedAt, rewards) {
      const profile = ensureProfile(userId);
      profile.coins += rewards.coins;
      profile.last_daily_at = claimedAt;

      if (!inventories.has(userId)) inventories.set(userId, new Map());
      const inventory = inventories.get(userId);
      for (const item of rewards.items) {
        inventory.set(item.key, (inventory.get(item.key) || 0) + item.quantity);
      }

      return {
        profile,
        items: getItems(userId),
      };
    },
    async applyAdventure(userId, changes) {
      const pet = users.get(userId);
      Object.assign(pet, changes.pet);

      const profile = ensureProfile(userId);
      profile.coins += changes.rewards.coins;

      if (!inventories.has(userId)) inventories.set(userId, new Map());
      const inventory = inventories.get(userId);
      for (const item of changes.rewards.items) {
        inventory.set(item.key, (inventory.get(item.key) || 0) + item.quantity);
      }

      return {
        pet,
        profile,
        items: getItems(userId),
      };
    },
    async healPet(userId, changes) {
      const pet = users.get(userId);
      Object.assign(pet, changes.pet);

      const inventory = inventories.get(userId) || new Map();
      for (const item of changes.items) {
        inventory.set(item.key, Math.max(0, (inventory.get(item.key) || 0) + item.quantity));
      }
      inventories.set(userId, inventory);

      return {
        pet,
        profile: ensureProfile(userId),
        items: getItems(userId).filter((item) => item.quantity > 0),
      };
    },
    async breakthroughPet(userId, changes) {
      const pet = users.get(userId);
      Object.assign(pet, changes.pet);

      const inventory = inventories.get(userId) || new Map();
      for (const item of changes.items) {
        inventory.set(item.key, Math.max(0, (inventory.get(item.key) || 0) + item.quantity));
      }
      inventories.set(userId, inventory);

      return {
        pet,
        profile: ensureProfile(userId),
        items: getItems(userId).filter((item) => item.quantity > 0),
      };
    },
    async purchaseItem(userId, purchase) {
      const profile = ensureProfile(userId);
      if (profile.coins < purchase.totalPrice) {
        return { success: false, profile, items: getItems(userId) };
      }

      profile.coins -= purchase.totalPrice;
      const inventory = inventories.get(userId) || new Map();
      inventory.set(
        purchase.itemKey,
        (inventory.get(purchase.itemKey) || 0) + purchase.quantity
      );
      inventories.set(userId, inventory);

      return {
        success: true,
        profile,
        items: getItems(userId),
      };
    },
    async getUserParty(userId) {
      return this.parties?.find((party) => party.members.some((member) => member.user_id === userId)) || null;
    },
    async listOpenParties() {
      return this.parties || [];
    },
    async createParty(userId, party) {
      if (!this.parties) this.parties = [];
      const nextParty = {
        party_id: this.parties.length + 1,
        leader_user_id: userId,
        area_key: party.areaKey,
        is_private: party.isPrivate,
        created_at: party.createdAt,
        members: [{
          user_id: userId,
          display_name: party.displayName,
          joined_at: party.createdAt,
        }],
      };
      this.parties.push(nextParty);
      return nextParty;
    },
    async joinParty(userId, partyId, member) {
      const party = (this.parties || []).find((entry) => entry.party_id === partyId);
      party.members.push({
        user_id: userId,
        display_name: member.displayName,
        joined_at: member.joinedAt,
      });
      return party;
    },
    async leaveParty(userId) {
      const party = await this.getUserParty(userId);
      if (!party) return null;

      party.members = party.members.filter((member) => member.user_id !== userId);
      if (party.members.length === 0) {
        this.parties = this.parties.filter((entry) => entry.party_id !== party.party_id);
        return { deleted: true, party: null };
      }

      if (party.leader_user_id === userId) {
        party.leader_user_id = party.members[0].user_id;
      }

      return { deleted: false, party };
    },
  };
};

test('hatch creates a 10 minute egg for a user without a pet', async () => {
  const { createPetService } = require('../services/petService');
  const now = new Date('2026-07-05T00:00:00Z');
  const repo = createMemoryRepo();
  const service = createPetService({ repo, now: () => now });

  const result = await service.hatch('user-1');

  assert.equal(result.type, 'egg_created');
  assert.equal(result.pet.status, 'incubating');
  assert.equal(result.pet.hatch_ready_at.toISOString(), '2026-07-05T00:10:00.000Z');
});

test('claim returns wait state before egg is ready', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  const service = createPetService({
    repo,
    now: () => new Date('2026-07-05T00:00:00Z'),
  });

  await service.hatch('user-1');

  const result = await service.claim('user-1');

  assert.equal(result.type, 'egg_not_ready');
  assert.equal(result.remainingMs, 10 * 60 * 1000);
  assert.equal(result.hatchReadyAt.toISOString(), '2026-07-05T00:10:00.000Z');
});

test('claim turns a ready egg into a random pet', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:10:01Z');

  const result = await service.claim('user-1');

  assert.equal(result.type, 'pet_claimed');
  assert.equal(result.pet.status, 'active');
  assert.equal(result.pet.level, 1);
  assert.equal(result.pet.exp, 0);
  assert.equal(result.pet.max_level, 20);
  assert.ok(result.pet.pet_key);
  assert.match(result.pet.name, /./);
});

test('rename changes the active pet display name', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  const result = await service.rename('user-1', 'Bé Mây');

  assert.equal(result.type, 'pet_renamed');
  assert.equal(result.pet.custom_name, 'Bé Mây');
});

test('info regenerates stamina over real time and caps at max stamina', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  const pet = await repo.getUserPet('user-1');
  pet.stamina = 95;
  pet.stamina_updated_at = new Date('2026-07-05T00:00:00Z');
  current = new Date('2026-07-05T00:40:00Z');

  const result = await service.info('user-1');

  assert.equal(result.type, 'found');
  assert.equal(result.pet.stamina, 100);
  assert.equal(result.pet.stamina_updated_at.toISOString(), '2026-07-05T00:25:00.000Z');
});

test('adventure spends stamina and grants rewards', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const rolls = [0, 0.9];
  const service = createPetService({
    repo,
    now: () => current,
    random: () => rolls.shift() ?? 0.9,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  const result = await service.adventure('user-1');

  assert.equal(result.type, 'adventure_completed');
  assert.equal(result.pet.stamina, 80);
  assert.equal(result.pet.exp, 25);
  assert.equal(result.pet.health, 100);
  assert.equal(result.profile.coins, 40);
  assert.deepEqual(result.rewards.items, [
    { key: 'common_essence', quantity: 2 },
    { key: 'theme_cute_animal', quantity: 1 },
  ]);
});

test('adventure levels up a pet and carries remaining exp', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const rolls = [0, 0.9, 0.9];
  const service = createPetService({
    repo,
    now: () => current,
    random: () => rolls.shift() ?? 0.9,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  const pet = await repo.getUserPet('user-1');
  pet.exp = 90;
  const originalAttack = pet.attack;
  const originalDefense = pet.defense;
  const originalSpeed = pet.speed;

  const result = await service.adventure('user-1');

  assert.equal(result.pet.level, 2);
  assert.equal(result.pet.exp, 15);
  assert.equal(result.pet.attack, originalAttack + 3);
  assert.equal(result.pet.defense, originalDefense + 2);
  assert.equal(result.pet.speed, originalSpeed + 2);
  assert.equal(result.levelsGained, 1);
  assert.equal(result.previousLevel, 1);
});

test('adventure can injure a pet and make it faint at zero health', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const rolls = [0, 0.9, 0.1, 0.99];
  const service = createPetService({
    repo,
    now: () => current,
    random: () => rolls.shift() ?? 0.5,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  const pet = await repo.getUserPet('user-1');
  pet.health = 5;

  const result = await service.adventure('user-1');

  assert.equal(result.type, 'adventure_completed');
  assert.equal(result.pet.health, 0);
  assert.equal(result.pet.status, 'fainted');
  assert.equal(result.damage, 15);
});

test('adventure can make a pet sick', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const rolls = [0, 0.9, 0.9, 0.05];
  const service = createPetService({
    repo,
    now: () => current,
    random: () => rolls.shift() ?? 0.9,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  const result = await service.adventure('user-1');

  assert.equal(result.type, 'adventure_completed');
  assert.equal(result.pet.status, 'sick');
  assert.equal(result.becameSick, true);
  assert.equal((await service.adventure('user-1')).type, 'not_active');
});

test('adventure requires an active pet with enough stamina', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  assert.equal((await service.adventure('user-1')).type, 'not_found');

  await service.hatch('user-1');
  assert.equal((await service.adventure('user-1')).type, 'not_active');

  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  const pet = await repo.getUserPet('user-1');
  pet.stamina = 10;
  pet.stamina_updated_at = current;

  const result = await service.adventure('user-1');

  assert.equal(result.type, 'not_enough_stamina');
  assert.equal(result.requiredStamina, 20);
});

test('adventure area requires its minimum pet level', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  const result = await service.adventure('user-1', 'magic_forest');

  assert.equal(result.type, 'adventure_level_required');
  assert.equal(result.requiredLevel, 20);
  assert.equal(result.pet.stamina, 100);
});

test('higher adventure areas cost more stamina and grant better rewards', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const rolls = [0, 0.9, 0.9, 0.9];
  const service = createPetService({
    repo,
    now: () => current,
    random: () => rolls.shift() ?? 0.9,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  const pet = await repo.getUserPet('user-1');
  pet.level = 20;
  pet.max_level = 40;

  const result = await service.adventure('user-1', 'magic_forest');

  assert.equal(result.type, 'adventure_completed');
  assert.equal(result.area.key, 'magic_forest');
  assert.equal(result.pet.stamina, 70);
  assert.equal(result.rewards.coins, 70);
  assert.equal(result.rewards.exp, 45);
  assert.deepEqual(result.rewards.items, [
    { key: 'common_essence', quantity: 3 },
    { key: 'theme_cute_animal', quantity: 2 },
  ]);
});

test('heal uses a potion to restore health', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  await repo.claimDaily('user-1', current, { coins: 0, items: [{ key: 'healing_potion', quantity: 1 }] });
  const pet = await repo.getUserPet('user-1');
  pet.health = 40;

  const result = await service.heal('user-1');

  assert.equal(result.type, 'heal_completed');
  assert.equal(result.pet.health, 90);
  assert.equal(result.pet.status, 'active');
  assert.equal(result.healedAmount, 50);
  assert.deepEqual(result.items, []);
});

test('heal revives a fainted pet to half health', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  await repo.claimDaily('user-1', current, { coins: 0, items: [{ key: 'healing_potion', quantity: 1 }] });
  const pet = await repo.getUserPet('user-1');
  pet.health = 0;
  pet.status = 'fainted';

  const result = await service.heal('user-1');

  assert.equal(result.type, 'heal_completed');
  assert.equal(result.pet.health, 50);
  assert.equal(result.pet.status, 'active');
});

test('heal cures a sick pet even when health is full', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  await repo.claimDaily('user-1', current, { coins: 0, items: [{ key: 'healing_potion', quantity: 1 }] });
  const pet = await repo.getUserPet('user-1');
  pet.status = 'sick';

  const result = await service.heal('user-1');

  assert.equal(result.type, 'heal_completed');
  assert.equal(result.pet.health, 100);
  assert.equal(result.pet.status, 'active');
  assert.equal(result.curedSickness, true);
});

test('heal requires a pet that needs healing and a potion', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  assert.equal((await service.heal('user-1')).type, 'not_found');

  await service.hatch('user-1');
  assert.equal((await service.heal('user-1')).type, 'not_active');

  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  assert.equal((await service.heal('user-1')).type, 'already_healthy');

  const pet = await repo.getUserPet('user-1');
  pet.health = 50;
  assert.equal((await service.heal('user-1')).type, 'missing_healing_potion');
});

test('breakthrough upgrades rarity at its level cap and consumes materials', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  const pet = await repo.getUserPet('user-1');
  pet.level = 20;
  await repo.claimDaily('user-1', current, {
    coins: 0,
    items: [
      { key: 'common_essence', quantity: 20 },
      { key: 'theme_cute_animal', quantity: 5 },
    ],
  });

  const result = await service.breakthrough('user-1');

  assert.equal(result.type, 'breakthrough_completed');
  assert.equal(result.previousRarity, 'Common');
  assert.equal(result.pet.rarity, 'Rare');
  assert.equal(result.pet.max_level, 40);
  assert.deepEqual(result.items, []);
});

test('shop shows standard items and the pet theme material', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  const result = await service.shop('user-1');

  assert.equal(result.type, 'shop');
  assert.deepEqual(result.catalog.map((item) => [item.key, item.price]), [
    ['healing_potion', 100],
    ['common_essence', 30],
    ['theme_cute_animal', 150],
  ]);
});

test('shop purchase spends coins and adds the selected quantity', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');
  await repo.claimDaily('user-1', current, { coins: 500, items: [] });

  const result = await service.purchase('user-1', 'healing_potion', 5);

  assert.equal(result.type, 'purchase_completed');
  assert.equal(result.totalPrice, 500);
  assert.equal(result.profile.coins, 0);
  assert.deepEqual(result.items, [{ item_key: 'healing_potion', quantity: 5 }]);
});

test('shop purchase rejects invalid quantities and insufficient coins', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('user-1');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('user-1');

  assert.equal((await service.purchase('user-1', 'healing_potion', 2)).type, 'invalid_quantity');
  const result = await service.purchase('user-1', 'healing_potion', 1);
  assert.equal(result.type, 'not_enough_coins');
  assert.equal(result.requiredCoins, 100);
});

test('party can be created globally and joined by another active pet owner', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('leader');
  await service.hatch('member');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('leader');
  await service.claim('member');

  const created = await service.createParty('leader', 'Truong nhom', 'meadow');
  const joined = await service.joinParty('member', 'Dong doi', created.party.party_id);
  const listed = await service.listParties();

  assert.equal(created.type, 'party_created');
  assert.equal(joined.type, 'party_joined');
  assert.equal(joined.party.members.length, 2);
  assert.equal(listed.parties[0].member_count, 2);
  assert.equal(listed.parties[0].leader_user_id, 'leader');
});

test('party adventure adds material drops based on party size', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const rolls = [0, 0, 0.9, 0.9, 0.9];
  const service = createPetService({
    repo,
    now: () => current,
    random: () => rolls.shift() ?? 0.9,
  });

  await service.hatch('leader');
  await service.hatch('member');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('leader');
  await service.claim('member');

  const created = await service.createParty('leader', 'Leader');
  await service.joinParty('member', 'Member', created.party.party_id);

  const result = await service.adventure('leader', 'meadow');

  assert.equal(result.type, 'adventure_completed');
  assert.deepEqual(result.partyBonus, {
    memberCount: 2,
    extraMaterials: 1,
  });
  assert.deepEqual(result.rewards.items, [
    { key: 'common_essence', quantity: 3 },
    { key: 'theme_cute_animal', quantity: 2 },
  ]);
});

test('party rejects inactive users, duplicate membership, and full rooms', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  assert.equal((await service.createParty('no-pet', 'No pet')).type, 'not_found');

  for (const userId of ['leader', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']) {
    await service.hatch(userId);
  }
  current = new Date('2026-07-05T00:11:00Z');
  for (const userId of ['leader', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']) {
    await service.claim(userId);
  }

  const created = await service.createParty('leader', 'Leader');
  assert.equal((await service.createParty('leader', 'Leader')).type, 'already_in_party');

  for (const userId of ['u2', 'u3', 'u4', 'u5', 'u6']) {
    assert.equal((await service.joinParty(userId, userId, created.party.party_id)).type, 'party_joined');
  }

  assert.equal((await service.joinParty('u7', 'u7', created.party.party_id)).type, 'party_full');
});

test('party leave transfers leader and deletes empty rooms', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
    random: () => 0,
  });

  await service.hatch('leader');
  await service.hatch('member');
  current = new Date('2026-07-05T00:11:00Z');
  await service.claim('leader');
  await service.claim('member');

  const created = await service.createParty('leader', 'Leader');
  await service.joinParty('member', 'Member', created.party.party_id);

  const transferred = await service.leaveParty('leader');
  const deleted = await service.leaveParty('member');

  assert.equal(transferred.type, 'party_left');
  assert.equal(transferred.party.leader_user_id, 'member');
  assert.equal(deleted.type, 'party_disbanded');
  assert.deepEqual((await service.listParties()).parties, []);
});

test('inventory creates an empty profile for a new user', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  const service = createPetService({ repo });

  const result = await service.inventory('user-1');

  assert.equal(result.type, 'inventory');
  assert.equal(result.profile.coins, 0);
  assert.deepEqual(result.items, []);
});

test('daily grants coins and starter items once per cooldown', async () => {
  const { createPetService } = require('../services/petService');
  const repo = createMemoryRepo();
  let current = new Date('2026-07-05T00:00:00Z');
  const service = createPetService({
    repo,
    now: () => current,
  });

  const claimed = await service.daily('user-1');

  assert.equal(claimed.type, 'daily_claimed');
  assert.equal(claimed.profile.coins, 150);
  assert.deepEqual(claimed.items, [
    { item_key: 'healing_potion', quantity: 1 },
    { item_key: 'common_essence', quantity: 5 },
  ]);

  current = new Date('2026-07-05T12:00:00Z');
  const cooldown = await service.daily('user-1');

  assert.equal(cooldown.type, 'daily_cooldown');
  assert.equal(cooldown.nextDailyAt.toISOString(), '2026-07-06T00:00:00.000Z');
});

test('daily stays on cooldown when repository returns an existing profile', async () => {
  const { createPetService } = require('../services/petService');
  const repo = {
    async getInventory() {
      return {
        profile: {
          user_id: 'user-1',
          coins: 150,
          last_daily_at: new Date('2026-07-05T00:00:00Z'),
        },
        items: [],
      };
    },
    async claimDaily() {
      throw new Error('daily should not be claimed during cooldown');
    },
  };
  const service = createPetService({
    repo,
    now: () => new Date('2026-07-05T12:00:00Z'),
  });

  const result = await service.daily('user-1');

  assert.equal(result.type, 'daily_cooldown');
  assert.equal(result.nextDailyAt.toISOString(), '2026-07-06T00:00:00.000Z');
});
