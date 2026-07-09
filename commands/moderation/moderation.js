const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const clearTimeChoices = [
  { name: 'Đừng Xóa Bất Cứ Thứ Gì Cả', value: 'all' },
  { name: '1 Giờ Trước', value: '1h' },
  { name: '6 Giờ Trước', value: '6h' },
  { name: '12 Giờ Trước', value: '12h' },
  { name: '24 Giờ Trước', value: '24h' },
  { name: '3 Ngày Trước', value: '3d' },
  { name: '7 Ngày Trước', value: '7d' },
];

const clearTimeMs = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const bulkDeleteLimitMs = 14 * 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Quản lý server')

    .addSubcommand((sub) =>
      sub.setName('kick')
        .setDescription('Kick thành viên')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    .addSubcommand((sub) =>
      sub.setName('ban')
        .setDescription('Ban thành viên')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    .addSubcommand((sub) =>
      sub.setName('unban')
        .setDescription('Unban bằng ID')
        .addStringOption((opt) =>
          opt.setName('userid').setDescription('User ID').setRequired(true))
    )

    .addSubcommand((sub) =>
      sub.setName('timeout')
        .setDescription('Timeout user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('time').setDescription('Thời gian (phút)').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Lý do timeout').setRequired(false))
    )

    .addSubcommand((sub) =>
      sub.setName('untimeout')
        .setDescription('Gỡ timeout')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    .addSubcommand((sub) =>
      sub.setName('mute')
        .setDescription('Mute user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    .addSubcommand((sub) =>
      sub.setName('unmute')
        .setDescription('Unmute user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User').setRequired(true))
    )

    .addSubcommand((sub) =>
      sub.setName('clear')
        .setDescription('Xóa tin nhắn theo user hoặc user ID')
        .addIntegerOption((opt) =>
          opt.setName('amount')
            .setDescription('Giới hạn số tin nhắn cần xóa, bỏ trống để xóa tối đa có thể')
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(false))
        .addUserOption((opt) =>
          opt.setName('user')
            .setDescription('User cần xóa tin nhắn')
            .setRequired(false))
        .addStringOption((opt) =>
          opt.setName('userid')
            .setDescription('ID user cần xóa tin nhắn')
            .setRequired(false))
        .addStringOption((opt) =>
          opt.setName('time')
            .setDescription('Chỉ xóa tin nhắn trong khoảng thời gian này')
            .setRequired(false)
            .addChoices(...clearTimeChoices))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member;

    const fetchTarget = async (user) => {
      try {
        return await interaction.guild.members.fetch(user.id);
      } catch (err) {
        await interaction.reply({
          content: '❌ Không tìm thấy thành viên',
          ephemeral: true,
        });
        return null;
      }
    };

    if (sub === 'clear') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: '❌ Không có quyền xóa tin nhắn', ephemeral: true });
      }

      const amountLimit = interaction.options.getInteger('amount');
      const user = interaction.options.getUser('user');
      const userId = user?.id || interaction.options.getString('userid');
      const time = interaction.options.getString('time') || 'all';
      const now = Date.now();
      const bulkDeleteCutoff = now - bulkDeleteLimitMs;
      const timeCutoff = clearTimeMs[time] ? now - clearTimeMs[time] : null;
      const cutoff = Math.max(timeCutoff || 0, bulkDeleteCutoff);
      let before;
      let deletedCount = 0;
      let shouldContinue = true;

      if (interaction.deferReply) {
        await interaction.deferReply({ ephemeral: true });
      }

      while (shouldContinue) {
        const remaining = amountLimit ? amountLimit - deletedCount : 100;
        if (remaining <= 0) break;

        const fetched = await interaction.channel.messages.fetch({
          limit: Math.min(100, remaining || 100),
          ...(before ? { before } : {}),
        });

        if (fetched.size === 0) break;

        const pageMessages = Array.from(fetched.values());
        before = pageMessages[pageMessages.length - 1].id;

        const messages = pageMessages.filter((message) => {
          const matchesUser = !userId || message.author?.id === userId;
          const matchesTime = message.createdTimestamp >= cutoff;

          return matchesUser && matchesTime;
        });

        const tooOld = pageMessages.some((message) => message.createdTimestamp < cutoff);

        if (messages.length > 0) {
          const deleted = await interaction.channel.bulkDelete(messages, true);
          deletedCount += deleted.size ?? messages.length;
        }

        shouldContinue = !tooOld && fetched.size === 100 && (!amountLimit || deletedCount < amountLimit);
      }

      const response = deletedCount === 0
        ? {
          content: '❌ Không tìm thấy tin nhắn phù hợp để xóa',
          ephemeral: true,
        }
        : {
          content: `✅ Đã xóa ${deletedCount} tin nhắn`,
          ephemeral: true,
        };

      if (interaction.editReply) {
        return interaction.editReply(response);
      }

      return interaction.reply(response);
    }

    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Không có quyền', ephemeral: true });
    }

    if (sub === 'kick') {
      const user = interaction.options.getUser('user');
      const target = await fetchTarget(user);
      if (!target) return;

      await target.kick();
      return interaction.reply(`👢 Đã kick ${user.tag}`);
    }

    if (sub === 'ban') {
      const user = interaction.options.getUser('user');

      await interaction.guild.members.ban(user.id);
      return interaction.reply(`🔨 Đã ban ${user.tag}`);
    }

    if (sub === 'unban') {
      const id = interaction.options.getString('userid');

      await interaction.guild.members.unban(id);
      return interaction.reply(`🔓 Đã unban ID ${id}`);
    }

    if (sub === 'timeout') {
      const user = interaction.options.getUser('user');
      const time = interaction.options.getInteger('time');
      const reason = interaction.options.getString('reason') || 'Không có lý do';
      const target = await fetchTarget(user);
      if (!target) return;

      await target.timeout(time * 60 * 1000, reason);
      return interaction.reply(`⏳ Timeout ${user.tag} ${time} phút\nLý do: ${reason}`);
    }

    if (sub === 'untimeout') {
      const user = interaction.options.getUser('user');
      const target = await fetchTarget(user);
      if (!target) return;

      await target.timeout(null);
      return interaction.reply(`✅ Gỡ timeout ${user.tag}`);
    }

    if (sub === 'mute') {
      const user = interaction.options.getUser('user');
      const target = await fetchTarget(user);
      if (!target) return;

      await target.timeout(10 * 60 * 1000);
      return interaction.reply(`🔇 Mute ${user.tag}`);
    }

    if (sub === 'unmute') {
      const user = interaction.options.getUser('user');
      const target = await fetchTarget(user);
      if (!target) return;

      await target.timeout(null);
      return interaction.reply(`🔊 Unmute ${user.tag}`);
    }
  },
};
