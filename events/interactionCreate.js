const embed = require('../utils/embed');
const { commands } = require('../handlers/commandHandler');

const { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

const history = new Map();


// ===== BUILD MAIN MENU AUTO =====
const buildMain = () => {

  const categories = new Set();
  const options = [];

  commands.forEach(cmd => {
    if (cmd.category && !categories.has(cmd.category)) {
      categories.add(cmd.category);

      options.push({
        label: `📂 ${cmd.category.toUpperCase()}`,
        value: cmd.category
      });
    }
  });

  return {
    embed: embed(
      'TRUNG TÂM CHỈ HUY',
      '🔓 Chọn hệ thống để truy cập'
    ),
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('main_menu')
          .addOptions(options)
      )
    ]
  };
};

// ===== BUILD CATEGORY MENU =====
const buildCategoryMenu = (category) => {

  const options = [];
  const used = new Set(); // 🔥 chống trùng

  commands.forEach(cmd => {
    if (
      cmd.category === category &&
      cmd.label &&
      !used.has(cmd.name)
    ) {
      used.add(cmd.name);

      options.push({
        label: cmd.label,
        value: cmd.name
      });
    }
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${category}_menu`)
      .addOptions(options)
  );
};

// ===== BUILD DETAIL =====
const buildDetail = (cmd) => {

  if (!cmd || !cmd.data) {
    return {
      embed: embed('LỖI', '❌ Không tìm thấy command'),
      components: []
    };
  }

  return {
    embed: embed(
      `📘 HƯỚNG DẪN ${cmd.data.title}`,
      cmd.data.description
    ),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('back')
          .setLabel('⬅️ Quay lại')
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
};


// ===== BACK BUTTON =====
const backBtn = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('back')
    .setLabel('⬅️ Quay lại')
    .setStyle(ButtonStyle.Secondary)
);


// ===== MAIN EVENT =====
module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {

    // ===== SLASH COMMAND =====
    if (interaction.isChatInputCommand()) {

      const command = client.slashCommands.get(interaction.commandName);

      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: '❌ Lỗi command',
          ephemeral: true
        });
      }
    }
    // ===== DROPDOWN =====
    if (interaction.isStringSelectMenu()) {

      const msgId = interaction.message.id;

      if (!history.has(msgId)) history.set(msgId, []);
      const stack = history.get(msgId);

      const value = interaction.values[0];

      // ===== MAIN → CATEGORY =====
      if (interaction.customId === 'main_menu') {

        stack.push(buildMain());

        const menu = buildCategoryMenu(value);

        return interaction.update({
          embeds: [
            embed(`📂 ${value.toUpperCase()}`, '📍 Chọn chức năng')
          ],
          components: [menu, backBtn]
        });
      }

      // ===== CATEGORY → DETAIL =====
      if (interaction.customId.endsWith('_menu')) {

        const cmd = commands.get(value);

        stack.push({
          embed: interaction.message.embeds[0],
          components: interaction.message.components
        });

        const ui = buildDetail(cmd);

        return interaction.update({
          embeds: [ui.embed],
          components: ui.components
        });
      }
    }

    // ===== BACK =====
    if (interaction.isButton()) {

      if (interaction.customId === 'back') {

        const msgId = interaction.message.id;
        const stack = history.get(msgId);

        if (!stack || stack.length === 0) {
          const ui = buildMain();

          return interaction.update({
            embeds: [ui.embed],
            components: ui.components
          });
        }

        const prev = stack.pop();

        return interaction.update({
          embeds: [prev.embed],
          components: prev.components
        });
      }
    }
  });
};