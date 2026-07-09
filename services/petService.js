const { petCatalog } = require('../data/petCatalog');
const { getAdventureArea } = require('../data/adventureAreas');
const {
  breakthroughCosts,
  getNextRarity,
  getRarityCap,
  getThemeMaterial,
} = require('../data/petProgression');

const HATCH_DURATION_MS = 10 * 60 * 1000;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STAMINA_REGEN_MS = 5 * 60 * 1000;
const ADVENTURE_STAMINA_COST = 20;
const ADVENTURE_REWARDS = {
  coins: 40,
  exp: 25,
  items: [
    { key: 'common_essence', quantity: 2 },
  ],
};
const ADVENTURE_POTION_DROP_RATE = 0.2;
const ADVENTURE_DAMAGE_RATE = 0.35;
const ADVENTURE_SICKNESS_RATE = 0.1;
const HEALING_POTION_KEY = 'healing_potion';
const HEAL_AMOUNT = 50;
const SHOP_PRICES = {
  healing_potion: 100,
  common_essence: 30,
  theme_material: 150,
};
const SHOP_QUANTITIES = [1, 5, 10];
const MAX_LEVEL = 150;
const PARTY_MAX_MEMBERS = 6;

const DAILY_REWARDS = {
  coins: 150,
  items: [
    { key: 'healing_potion', quantity: 1 },
    { key: 'common_essence', quantity: 5 },
  ],
};

const addMs = (date, ms) => new Date(date.getTime() + ms);

const applyExpProgress = (pet, gainedExp) => {
  const previousLevel = pet.level ?? 1;
  const maxLevel = pet.max_level ?? MAX_LEVEL;
  let level = previousLevel;
  let exp = (pet.exp ?? 0) + gainedExp;

  while (level < maxLevel && exp >= level * 100) {
    exp -= level * 100;
    level += 1;
  }

  const levelsGained = level - previousLevel;
  return {
    previousLevel,
    levelsGained,
    level,
    exp,
    attack: (pet.attack ?? 0) + levelsGained * 3,
    defense: (pet.defense ?? 0) + levelsGained * 2,
    speed: (pet.speed ?? 0) + levelsGained * 2,
  };
};

const getStaminaBaseAt = (pet, fallback) => new Date(
  pet.stamina_updated_at ||
  pet.updated_at ||
  pet.claimed_at ||
  fallback
);

const regenerateStamina = async (repo, pet, currentTime) => {
  if (!pet || pet.status !== 'active') return pet;

  const maxStamina = pet.max_stamina ?? 100;
  const currentStamina = pet.stamina ?? maxStamina;
  if (currentStamina >= maxStamina) return pet;

  const baseAt = getStaminaBaseAt(pet, currentTime);
  const elapsedMs = currentTime.getTime() - baseAt.getTime();
  const gained = Math.floor(elapsedMs / STAMINA_REGEN_MS);
  if (gained <= 0) return pet;

  const nextStamina = Math.min(maxStamina, currentStamina + gained);
  const consumedTicks = nextStamina - currentStamina;
  const staminaUpdatedAt = addMs(baseAt, consumedTicks * STAMINA_REGEN_MS);

  return repo.updatePetStamina(pet.user_id, nextStamina, staminaUpdatedAt);
};

const getPartyBonus = async (repo, userId) => {
  if (typeof repo.getUserParty !== 'function') {
    return { memberCount: 1, extraMaterials: 0 };
  }

  const party = await repo.getUserParty(userId);
  const memberCount = Math.max(1, party?.member_count ?? party?.members?.length ?? 1);
  return {
    memberCount,
    extraMaterials: Math.max(0, memberCount - 1),
  };
};

const pickRandomPet = (catalog, random) => {
  const totalWeight = catalog.reduce((sum, pet) => sum + pet.weight, 0);
  let roll = random() * totalWeight;

  for (const pet of catalog) {
    roll -= pet.weight;
    if (roll <= 0) return pet;
  }

  return catalog[catalog.length - 1];
};

const createPetService = ({
  repo,
  catalog = petCatalog,
  now = () => new Date(),
  random = Math.random,
}) => ({
  async hatch(userId) {
    const existing = await repo.getUserPet(userId);

    if (existing?.status === 'active') {
      return { type: 'already_has_pet', pet: existing };
    }

    if (existing?.status === 'incubating') {
      const hatchReadyAt = new Date(existing.hatch_ready_at);
      return {
        type: 'egg_already_incubating',
        pet: existing,
        hatchReadyAt,
        remainingMs: Math.max(0, hatchReadyAt.getTime() - now().getTime()),
      };
    }

    const pet = await repo.createEgg(userId, addMs(now(), HATCH_DURATION_MS));
    return { type: 'egg_created', pet };
  },

  async claim(userId) {
    const existing = await repo.getUserPet(userId);

    if (!existing) {
      return { type: 'no_egg' };
    }

    if (existing.status === 'active') {
      return { type: 'already_claimed', pet: existing };
    }

    const hatchReadyAt = new Date(existing.hatch_ready_at);
    const remainingMs = hatchReadyAt.getTime() - now().getTime();
    if (remainingMs > 0) {
      return { type: 'egg_not_ready', remainingMs, hatchReadyAt };
    }

    const catalogPet = pickRandomPet(catalog, random);
    const pet = await repo.claimPet(userId, {
      pet_key: catalogPet.pet_key,
      name: catalogPet.name,
      custom_name: catalogPet.name,
      theme: catalogPet.theme,
      rarity: catalogPet.rarity,
      description: catalogPet.description,
      image_url: catalogPet.image_url,
      level: 1,
      exp: 0,
      max_level: getRarityCap(catalogPet.rarity),
      hunger: 100,
      happiness: 100,
      stamina: 100,
      max_stamina: 100,
      stamina_updated_at: now(),
      health: 100,
      attack: catalogPet.base_attack,
      defense: catalogPet.base_defense,
      speed: catalogPet.base_speed,
    });

    return { type: 'pet_claimed', pet };
  },

  async info(userId) {
    const pet = await repo.getUserPet(userId);
    return pet ? { type: 'found', pet: await regenerateStamina(repo, pet, now()) } : { type: 'not_found' };
  },

  async rename(userId, name) {
    const cleanName = name.trim();

    if (cleanName.length < 2 || cleanName.length > 24) {
      return { type: 'invalid_name' };
    }

    const existing = await repo.getUserPet(userId);

    if (!existing) return { type: 'not_found' };
    if (existing.status !== 'active') return { type: 'not_active', pet: existing };

    const pet = await repo.renamePet(userId, cleanName);
    return { type: 'pet_renamed', pet };
  },

  async inventory(userId) {
    const inventory = await repo.getInventory(userId);
    return { type: 'inventory', ...inventory };
  },

  async daily(userId) {
    const inventory = await repo.getInventory(userId);
    const lastDailyAt = inventory.profile?.last_daily_at
      ? new Date(inventory.profile.last_daily_at)
      : null;
    const nextDailyAt = lastDailyAt ? addMs(lastDailyAt, DAILY_COOLDOWN_MS) : null;

    if (nextDailyAt && nextDailyAt > now()) {
      return {
        type: 'daily_cooldown',
        profile: inventory.profile,
        items: inventory.items,
        nextDailyAt,
        remainingMs: nextDailyAt.getTime() - now().getTime(),
      };
    }

    const claimed = await repo.claimDaily(userId, now(), DAILY_REWARDS);
    return {
      type: 'daily_claimed',
      rewards: DAILY_REWARDS,
      ...claimed,
    };
  },

  async adventure(userId, areaKey = 'meadow') {
    const area = getAdventureArea(areaKey);
    if (!area) return { type: 'invalid_adventure_area' };

    const existing = await repo.getUserPet(userId);
    if (!existing) return { type: 'not_found' };
    if (existing.status !== 'active') return { type: 'not_active', pet: existing };

    const pet = await regenerateStamina(repo, existing, now());
    if ((pet.level ?? 1) < area.minLevel) {
      return {
        type: 'adventure_level_required',
        pet,
        area,
        requiredLevel: area.minLevel,
      };
    }

    if ((pet.stamina ?? 0) < area.staminaCost) {
      return {
        type: 'not_enough_stamina',
        pet,
        area,
        requiredStamina: area.staminaCost,
      };
    }

    const partyBonus = await getPartyBonus(repo, userId);
    const rewards = {
      coins: area.coins,
      exp: area.exp,
      items: [
        { key: 'common_essence', quantity: area.commonEssence + partyBonus.extraMaterials },
        { key: getThemeMaterial(pet.theme).key, quantity: area.themeMaterial + partyBonus.extraMaterials },
      ],
    };

    if (random() < area.potionDropRate) {
      rewards.items.push({ key: 'healing_potion', quantity: 1 });
    }

    const shouldTakeDamage = random() < area.damageRate;
    const damageRange = area.damageMax - area.damageMin + 1;
    const damage = shouldTakeDamage
      ? area.damageMin + Math.floor(random() * damageRange)
      : 0;
    const nextHealth = Math.max(0, (pet.health ?? 100) - damage);
    const becameSick = nextHealth > 0 && random() < area.sicknessRate;
    const progress = applyExpProgress(pet, rewards.exp);

    const applied = await repo.applyAdventure(userId, {
      pet: {
        stamina: pet.stamina - area.staminaCost,
        stamina_updated_at: now(),
        level: progress.level,
        exp: progress.exp,
        attack: progress.attack,
        defense: progress.defense,
        speed: progress.speed,
        health: nextHealth,
        status: nextHealth <= 0 ? 'fainted' : becameSick ? 'sick' : pet.status,
      },
      rewards,
    });

    return {
      type: 'adventure_completed',
      area,
      rewards,
      partyBonus,
      damage,
      becameSick,
      previousLevel: progress.previousLevel,
      levelsGained: progress.levelsGained,
      ...applied,
    };
  },

  async heal(userId) {
    const existing = await repo.getUserPet(userId);
    if (!existing) return { type: 'not_found' };
    if (existing.status !== 'active' && existing.status !== 'fainted' && existing.status !== 'sick') {
      return { type: 'not_active', pet: existing };
    }

    const currentHealth = existing.health ?? 100;
    if (existing.status === 'active' && currentHealth >= 100) {
      return { type: 'already_healthy', pet: existing };
    }

    const inventory = await repo.getInventory(userId);
    const potion = inventory.items.find((item) => item.item_key === HEALING_POTION_KEY);
    if (!potion || Number(potion.quantity) <= 0) {
      return { type: 'missing_healing_potion', pet: existing, inventory };
    }

    const curedSickness = existing.status === 'sick';
    const nextHealth = existing.status === 'fainted'
      ? HEAL_AMOUNT
      : Math.min(100, currentHealth + HEAL_AMOUNT);

    const applied = await repo.healPet(userId, {
      pet: {
        health: nextHealth,
        status: 'active',
      },
      items: [
        { key: HEALING_POTION_KEY, quantity: -1 },
      ],
    });

    return {
      type: 'heal_completed',
      healedAmount: nextHealth - currentHealth,
      curedSickness,
      ...applied,
    };
  },

  async breakthrough(userId) {
    const pet = await repo.getUserPet(userId);
    if (!pet) return { type: 'not_found' };
    if (pet.status !== 'active') return { type: 'not_active', pet };

    const previousRarity = pet.rarity;
    const nextRarity = getNextRarity(previousRarity);
    if (!nextRarity) return { type: 'max_rarity', pet };

    const requiredLevel = getRarityCap(pet.rarity);
    if ((pet.level ?? 1) < requiredLevel) {
      return { type: 'breakthrough_level_required', pet, requiredLevel };
    }

    const cost = breakthroughCosts[pet.rarity];
    const themeMaterial = getThemeMaterial(pet.theme);
    const inventory = await repo.getInventory(userId);
    const quantities = new Map(
      inventory.items.map((item) => [item.item_key, Number(item.quantity)])
    );
    const requirements = [
      { key: 'common_essence', quantity: cost.commonEssence },
      { key: themeMaterial.key, quantity: cost.themeMaterial },
    ];
    const missing = requirements.filter(
      (item) => (quantities.get(item.key) || 0) < item.quantity
    );

    if (missing.length) {
      return {
        type: 'breakthrough_materials_required',
        pet,
        inventory,
        requirements,
        missing,
        nextRarity,
      };
    }

    const applied = await repo.breakthroughPet(userId, {
      pet: {
        rarity: nextRarity,
        max_level: getRarityCap(nextRarity),
      },
      items: requirements.map((item) => ({ key: item.key, quantity: -item.quantity })),
    });

    return {
      type: 'breakthrough_completed',
      previousRarity,
      nextRarity,
      requirements,
      ...applied,
    };
  },

  async shop(userId) {
    const pet = await repo.getUserPet(userId);
    if (!pet) return { type: 'not_found' };

    const inventory = await repo.getInventory(userId);
    const themeMaterial = getThemeMaterial(pet.theme);
    return {
      type: 'shop',
      pet,
      ...inventory,
      catalog: [
        { key: HEALING_POTION_KEY, price: SHOP_PRICES.healing_potion },
        { key: 'common_essence', price: SHOP_PRICES.common_essence },
        { key: themeMaterial.key, price: SHOP_PRICES.theme_material },
      ],
    };
  },

  async purchase(userId, itemKey, quantity) {
    if (!SHOP_QUANTITIES.includes(quantity)) {
      return { type: 'invalid_quantity' };
    }

    const shop = await this.shop(userId);
    if (shop.type !== 'shop') return shop;

    const item = shop.catalog.find((entry) => entry.key === itemKey);
    if (!item) return { type: 'invalid_shop_item', shop };

    const totalPrice = item.price * quantity;
    if (Number(shop.profile.coins) < totalPrice) {
      return {
        ...shop,
        type: 'not_enough_coins',
        item,
        quantity,
        totalPrice,
        requiredCoins: totalPrice,
      };
    }

    const purchased = await repo.purchaseItem(userId, {
      itemKey,
      quantity,
      totalPrice,
    });

    if (!purchased.success) {
      return {
        type: 'not_enough_coins',
        item,
        quantity,
        totalPrice,
        requiredCoins: totalPrice,
        ...purchased,
      };
    }

    return {
      type: 'purchase_completed',
      item,
      quantity,
      totalPrice,
      pet: shop.pet,
      ...purchased,
    };
  },

  async listParties() {
    const parties = await repo.listOpenParties();
    return {
      type: 'party_list',
      parties: parties.map((party) => ({
        ...party,
        member_count: party.member_count ?? party.members?.length ?? 0,
      })),
    };
  },

  async createParty(userId, displayName, areaKey = 'meadow', isPrivate = false) {
    const existingPet = await repo.getUserPet(userId);
    if (!existingPet) return { type: 'not_found' };
    if (existingPet.status !== 'active') return { type: 'not_active', pet: existingPet };

    const currentParty = await repo.getUserParty(userId);
    if (currentParty) return { type: 'already_in_party', party: currentParty, pet: existingPet };

    const party = await repo.createParty(userId, {
      displayName,
      areaKey,
      isPrivate,
      createdAt: now(),
    });

    return { type: 'party_created', party, pet: existingPet };
  },

  async joinParty(userId, displayName, partyId) {
    const existingPet = await repo.getUserPet(userId);
    if (!existingPet) return { type: 'not_found' };
    if (existingPet.status !== 'active') return { type: 'not_active', pet: existingPet };

    const currentParty = await repo.getUserParty(userId);
    if (currentParty) return { type: 'already_in_party', party: currentParty, pet: existingPet };

    const parties = await repo.listOpenParties();
    const party = parties.find((entry) => Number(entry.party_id) === Number(partyId));
    if (!party) return { type: 'party_not_found', pet: existingPet };

    const memberCount = party.member_count ?? party.members?.length ?? 0;
    if (memberCount >= PARTY_MAX_MEMBERS) {
      return { type: 'party_full', party, pet: existingPet };
    }

    const joinedParty = await repo.joinParty(userId, Number(partyId), {
      displayName,
      joinedAt: now(),
    });
    if (!joinedParty) return { type: 'party_full', party, pet: existingPet };

    return { type: 'party_joined', party: joinedParty, pet: existingPet };
  },

  async leaveParty(userId) {
    const currentParty = await repo.getUserParty(userId);
    if (!currentParty) return { type: 'not_in_party' };

    const result = await repo.leaveParty(userId);
    if (result?.deleted) return { type: 'party_disbanded' };

    return { type: 'party_left', party: result?.party || null };
  },
});

module.exports = {
  HATCH_DURATION_MS,
  DAILY_COOLDOWN_MS,
  DAILY_REWARDS,
  STAMINA_REGEN_MS,
  ADVENTURE_STAMINA_COST,
  ADVENTURE_REWARDS,
  ADVENTURE_SICKNESS_RATE,
  HEALING_POTION_KEY,
  HEAL_AMOUNT,
  SHOP_PRICES,
  SHOP_QUANTITIES,
  MAX_LEVEL,
  PARTY_MAX_MEMBERS,
  createPetService,
  pickRandomPet,
  regenerateStamina,
  applyExpProgress,
};
