const { MessageFlags } = require('discord.js');

const parseOwnerIds = () => [
  process.env.OWNER_ID,
  process.env.BOT_OWNER_ID,
  process.env.OWNER_IDS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(','))
  .map((value) => value.trim())
  .filter(Boolean);

const getApplicationOwnerIds = async (client) => {
  const application = client?.application;
  if (!application) return [];

  if (!application.owner && typeof application.fetch === 'function') {
    await application.fetch().catch(() => null);
  }

  const owner = application.owner;
  if (!owner) return [];

  if (owner.user?.id) return [owner.user.id];
  if (owner.id && !owner.members) return [owner.id];
  if (owner.members?.map) {
    return owner.members.map((member) => member.user?.id || member.id).filter(Boolean);
  }
  if (owner.members?.values) {
    return [...owner.members.values()].map((member) => member.user?.id || member.id).filter(Boolean);
  }

  return [];
};

const isOwner = async (interaction) => {
  const configuredOwnerIds = parseOwnerIds();
  if (configuredOwnerIds.length > 0) return configuredOwnerIds.includes(interaction.user.id);

  const applicationOwnerIds = await getApplicationOwnerIds(interaction.client);
  return applicationOwnerIds.includes(interaction.user.id);
};

const assertOwner = async (interaction) => {
  if (await isOwner(interaction)) return true;

  await interaction.reply({
    content: 'Lenh nay chi danh cho owner cua Moonlight.',
    flags: MessageFlags.Ephemeral,
  });
  return false;
};

module.exports = {
  assertOwner,
  getApplicationOwnerIds,
  isOwner,
  parseOwnerIds,
};
