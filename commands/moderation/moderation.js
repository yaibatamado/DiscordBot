const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('⚔️ Quản lý server')

    // 🔥 KICK
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Kick thành viên')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    // 🔥 BAN
    .addSubcommand(sub =>
      sub.setName('ban')
        .setDescription('Ban thành viên')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    // 🔥 UNBAN
    .addSubcommand(sub =>
      sub.setName('unban')
        .setDescription('Unban bằng ID')
        .addStringOption(opt =>
          opt.setName('userid').setDescription('User ID').setRequired(true))
    )

    // 🔥 TIMEOUT
    .addSubcommand(sub =>
      sub.setName('timeout')
        .setDescription('Timeout user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('time').setDescription('Thời gian (phút)').setRequired(true))
    )

    // 🔥 UNTIMEOUT
    .addSubcommand(sub =>
      sub.setName('untimeout')
        .setDescription('Gỡ timeout')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    // 🔥 MUTE (role)
    .addSubcommand(sub =>
      sub.setName('mute')
        .setDescription('Mute user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    // 🔥 UNMUTE
    .addSubcommand(sub =>
      sub.setName('unmute')
        .setDescription('Unmute user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
    ),

  async execute(interaction) {

    const sub = interaction.options.getSubcommand();
    const member = interaction.member;

    // 🔒 check quyền
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Không có quyền', ephemeral: true });
    }

    // ===== KICK =====
    if (sub === 'kick') {
      const user = interaction.options.getUser('user');
      const target = interaction.guild.members.cache.get(user.id);

      await target.kick();
      return interaction.reply(`👢 Đã kick ${user.tag}`);
    }

    // ===== BAN =====
    if (sub === 'ban') {
      const user = interaction.options.getUser('user');

      await interaction.guild.members.ban(user.id);
      return interaction.reply(`🔨 Đã ban ${user.tag}`);
    }

    // ===== UNBAN =====
    if (sub === 'unban') {
      const id = interaction.options.getString('userid');

      await interaction.guild.members.unban(id);
      return interaction.reply(`🔓 Đã unban ID ${id}`);
    }

    // ===== TIMEOUT =====
    if (sub === 'timeout') {
      const user = interaction.options.getUser('user');
      const time = interaction.options.getInteger('time');
      const target = interaction.guild.members.cache.get(user.id);

      await target.timeout(time * 60 * 1000);
      return interaction.reply(`⏳ Timeout ${user.tag} ${time} phút`);
    }

    // ===== UNTIMEOUT =====
    if (sub === 'untimeout') {
      const user = interaction.options.getUser('user');
      const target = interaction.guild.members.cache.get(user.id);

      await target.timeout(null);
      return interaction.reply(`✅ Gỡ timeout ${user.tag}`);
    }

    // ===== MUTE =====
    if (sub === 'mute') {
      const user = interaction.options.getUser('user');
      const target = interaction.guild.members.cache.get(user.id);

      await target.timeout(10 * 60 * 1000); // giả mute = timeout
      return interaction.reply(`🔇 Mute ${user.tag}`);
    }

    // ===== UNMUTE =====
    if (sub === 'unmute') {
      const user = interaction.options.getUser('user');
      const target = interaction.guild.members.cache.get(user.id);

      await target.timeout(null);
      return interaction.reply(`🔊 Unmute ${user.tag}`);
    }

  }
};