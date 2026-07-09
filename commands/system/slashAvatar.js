const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const buildAvatarEmbed = (user) => {
  const avatar = user.displayAvatarURL({
    size: 1024,
    extension: 'png',
  });

  return new EmbedBuilder()
    .setTitle(`Avatar của ${user.username}`)
    .setColor('#2c2f33')
    .setImage(avatar)
    .setDescription(`[Link avatar](${avatar})`)
    .setFooter({ text: `ID: ${user.id}` });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Xem avatar của bạn hoặc người khác')
    .addUserOption((option) =>
      option.setName('user')
        .setDescription('User cần xem avatar')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    return interaction.reply({
      embeds: [buildAvatarEmbed(user)],
    });
  },
};
