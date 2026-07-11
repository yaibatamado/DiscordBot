const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { createEmbed, icons } = require('../../utils/uiEmbed');
const confessionRepository = require('../../repositories/confessionRepository');

const buildConfessionEmbed = (confession) => createEmbed({
  title: `Moonlight Confession #${confession.id}`,
  description: confession.content,
  variant: 'system',
  thumbnail: icons.system,
  footer: 'Moonlight Confession - anonymous public wall',
});

const buildResultEmbed = ({ title, description, variant = 'system', fields = [] }) => createEmbed({
  title,
  description,
  variant,
  fields,
  thumbnail: icons.system,
  footer: 'Moonlight Confession',
});

const sendEphemeral = (interaction, payload) => interaction.reply({
  embeds: [buildResultEmbed(payload)],
  flags: MessageFlags.Ephemeral,
});

const executeSend = async (interaction) => {
  const content = interaction.options.getString('message', true);
  const settings = await confessionRepository.getSettings(interaction.guildId);

  if (!settings?.channelId) {
    await sendEphemeral(interaction, {
      title: 'Confession Channel Not Set',
      description: 'Ask a moderator to run `/confession setup channel:#channel` first.',
      variant: 'warning',
    });
    return;
  }

  const targetChannel = await interaction.guild.channels.fetch(settings.channelId).catch(() => null);
  if (!targetChannel?.isTextBased?.()) {
    await sendEphemeral(interaction, {
      title: 'Confession Channel Missing',
      description: 'The configured confession channel no longer exists or cannot receive messages. Run `/confession setup` again.',
      variant: 'error',
    });
    return;
  }

  const confession = await confessionRepository.add({
    guildId: interaction.guildId,
    channelId: targetChannel.id,
    authorId: interaction.user.id,
    content,
  });

  const publicMessage = await targetChannel.send({
    embeds: [buildConfessionEmbed(confession)],
    allowedMentions: { parse: [] },
  });

  await confessionRepository.updateMessage({
    guildId: interaction.guildId,
    id: confession.id,
    channelId: targetChannel.id,
    messageId: publicMessage.id,
  });

  await interaction.reply({
    content: `Sent confession #${confession.id} to ${targetChannel}.`,
    flags: MessageFlags.Ephemeral,
  });
};

const executeSetup = async (interaction) => {
  if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)) {
    await sendEphemeral(interaction, {
      title: 'Cannot Setup Confession',
      description: 'You need Manage Server to set the confession channel.',
      variant: 'error',
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);
  const settings = await confessionRepository.setChannel({
    guildId: interaction.guildId,
    channelId: channel.id,
    updatedBy: interaction.user.id,
  });

  await sendEphemeral(interaction, {
    title: 'Confession Channel Set',
    description: `New confessions will be posted in <#${settings.channelId}> no matter where users run \`/confession send\`.`,
  });
};

const executeView = async (interaction) => {
  const id = interaction.options.getInteger('id', true);
  const confession = await confessionRepository.findById({ guildId: interaction.guildId, id });

  if (!confession) {
    await sendEphemeral(interaction, {
      title: 'Confession Not Found',
      description: 'No confession with that ID exists in this server.',
      variant: 'warning',
    });
    return;
  }

  await interaction.reply({
    embeds: [buildConfessionEmbed(confession)],
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
};

const executeDelete = async (interaction) => {
  const id = interaction.options.getInteger('id', true);
  if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) {
    await sendEphemeral(interaction, {
      title: 'Cannot Delete Confession',
      description: 'You need Manage Messages to delete confessions.',
      variant: 'error',
    });
    return;
  }

  const confession = await confessionRepository.findById({ guildId: interaction.guildId, id });

  if (!confession) {
    await sendEphemeral(interaction, {
      title: 'Confession Not Found',
      description: 'No confession with that ID exists in this server.',
      variant: 'warning',
    });
    return;
  }

  if (confession.channelId && confession.messageId) {
    try {
      const channel = await interaction.guild.channels.fetch(confession.channelId);
      const message = await channel?.messages?.fetch(confession.messageId);
      await message?.delete();
    } catch {
      // The database entry is still removed even if the public Discord message is gone.
    }
  }

  await confessionRepository.remove({ guildId: interaction.guildId, id });
  await sendEphemeral(interaction, {
    title: 'Confession Deleted',
    description: `Deleted confession #${id}.`,
  });
};

const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') return executeSetup(interaction);
  if (subcommand === 'send') return executeSend(interaction);
  if (subcommand === 'view') return executeView(interaction);
  if (subcommand === 'delete') return executeDelete(interaction);

  return sendEphemeral(interaction, {
    title: 'Unknown Confession Action',
    description: 'That confession action is not supported yet.',
    variant: 'error',
  });
};

module.exports = {
  category: 'system',
  label: 'Confession',

  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Send and manage anonymous public confessions')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Set the only channel where confessions will be posted')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Target confession channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('send')
        .setDescription('Send an anonymous confession to the configured channel')
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Confession content')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(1800)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View a confession by ID privately')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('Confession ID')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete a confession by ID')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('Confession ID')
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  execute,

  _private: {
    buildConfessionEmbed,
    buildResultEmbed,
  },
};
