const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { createEmbed, icons } = require('../utils/uiEmbed');
const mysteryBoxRepository = require('../repositories/mysteryBoxRepository');
const { getMinuteKey } = require('../utils/timeKeys');

const makeBoxTemplate = ([type, title, content, rewards]) => ({
  type,
  title,
  content,
  rewards,
});

const boxTemplates = [
  ['fortune', 'Moonlit Fortune Box', 'A soft omen falls out: today is better for starting than waiting.', ['Lucky dust x7', 'A calm omen', 'One gentle reroll of mood']],
  ['fortune', 'Quiet Orbit Box', 'The box hums: a small step taken today will echo farther than expected.', ['Orbit charm x1', 'Steady breath x2', 'Small-step blessing']],
  ['fortune', 'Silver Thread Box', 'A silver thread points toward a conversation you should not dodge.', ['Silver thread x1', 'Honest word x3', 'Brave ping']],
  ['fortune', 'Night Breeze Box', 'The night breeze says: leave one heavy thought outside the door.', ['Breeze token x1', 'Soft reset x2', 'Lighter shoulders']],
  ['fortune', 'Blue Star Box', 'A tiny blue star predicts one lucky mistake that becomes useful.', ['Blue star x1', 'Useful mistake x1', 'Luck spark x5']],
  ['fortune', 'Lantern Path Box', 'A paper lantern inside shows the next good move: ask, then act.', ['Lantern wick x2', 'Clear path x1', 'Focus glow']],
  ['fortune', 'Glass Moon Box', 'The glass moon says your patience is not wasted; it is charging.', ['Glass moon shard x1', 'Patience charge x4', 'Quiet win']],
  ['fortune', 'Soft Eclipse Box', 'A small eclipse passes over the box and leaves a clean restart behind.', ['Eclipse coin x1', 'Fresh start x1', 'Dust of calm x6']],
  ['fortune', 'Lucky Window Box', 'The window opens for a moment: say yes to the simple chance.', ['Window charm x1', 'Yes token x1', 'Chance dust x3']],
  ['fortune', 'Dawn After Midnight Box', 'The box promises that the next bright thing may arrive quietly.', ['Dawn petal x1', 'Quiet hope x2', 'Warm light']],
  ['question', 'Midnight Question Box', 'Question inside: what is one tiny thing that made today less heavy?', ['Conversation spark x1', 'Warm answer token', 'A quiet thought']],
  ['question', 'Mirror Question Box', 'Question inside: what would you tell a friend who felt exactly like you?', ['Mirror chip x1', 'Kind answer x2', 'Self-compassion']],
  ['question', 'Tea Table Box', 'Question inside: which memory would you serve with tea tonight?', ['Tea leaf x3', 'Memory cup x1', 'Cozy pause']],
  ['question', 'Cloud Note Box', 'Question inside: what are you pretending not to want?', ['Cloud note x1', 'Truth nib x1', 'Soft courage']],
  ['question', 'Tiny Door Box', 'Question inside: if one door opened right now, where should it lead?', ['Door key x1', 'Curious step x2', 'Map crumb']],
  ['question', 'Starlamp Box', 'Question inside: who made your week a little brighter?', ['Starlamp wick x1', 'Thank-you spark x3', 'Bright ping']],
  ['question', 'Rainy Window Box', 'Question inside: what sound makes the server feel alive?', ['Rain bead x4', 'Server hum x1', 'Listening token']],
  ['question', 'Pocket Moon Box', 'Question inside: what would your pocket moon protect for you?', ['Pocket moon x1', 'Protected wish x1', 'Gentle guard']],
  ['question', 'Low Battery Box', 'Question inside: what restores you when your social battery is blinking red?', ['Battery spark x2', 'Recharge note x1', 'Rest pass']],
  ['question', 'Mapless Box', 'Question inside: what are you learning without noticing?', ['Mapless badge x1', 'Hidden lesson x2', 'Quiet XP']],
  ['quest', 'Tiny Quest Box', 'Mini task: send someone a kind sentence, no explanation needed.', ['Kindness badge for the moment', 'Soft glow x3', 'Server vibe +1']],
  ['quest', 'Desk Quest Box', 'Mini task: clean one tiny thing near you before anyone claims another box.', ['Desk sparkle x2', 'Tiny order x1', 'Focus point']],
  ['quest', 'Ping Quest Box', 'Mini task: ping a friend with one song, one meme, or one honest hello.', ['Ping token x1', 'Friend spark x2', 'Social courage']],
  ['quest', 'Hydration Quest Box', 'Mini task: drink water. The box is serious about this one.', ['Water crystal x1', 'Hydrated aura x5', 'Responsible sparkle']],
  ['quest', 'Screenshot Quest Box', 'Mini task: share a pretty screenshot from any game or app.', ['Screenshot frame x1', 'Pixel dust x3', 'Show-and-tell badge']],
  ['quest', 'Compliment Quest Box', 'Mini task: compliment the last person who made you laugh.', ['Compliment seal x1', 'Laugh echo x2', 'Good-room energy']],
  ['quest', 'Playlist Quest Box', 'Mini task: add one song to the imaginary server playlist.', ['Playlist note x1', 'Shared headphones', 'Three-minute scene']],
  ['quest', 'Emoji Quest Box', 'Mini task: describe your mood using exactly three emojis.', ['Mood stamp x1', 'Emoji ink x3', 'Readable chaos']],
  ['quest', 'Memory Quest Box', 'Mini task: tell the server one harmless fun fact about your day.', ['Memory pebble x1', 'Daily spark x2', 'Tiny lore']],
  ['quest', 'Quiet Quest Box', 'Mini task: give yourself five quiet breaths before typing again.', ['Breath bead x5', 'Calm meter +1', 'Soft pause']],
  ['quote', 'Starlit Quote Box', 'The box whispers: "Small lights still count in a large dark room."', ['Quote shard x1', 'Night ink x2', 'Tiny courage']],
  ['quote', 'Paper Moon Quote Box', 'The note reads: "Be gentle with the version of you still loading."', ['Paper moon x1', 'Loading grace x2', 'Soft patience']],
  ['quote', 'Lantern Quote Box', 'The lantern says: "You do not need to be loud to be present."', ['Lantern quote x1', 'Presence charm x1', 'Quiet confidence']],
  ['quote', 'Orbit Quote Box', 'The orbit reads: "Some delays are just gravity teaching timing."', ['Orbit quote x1', 'Timing dust x3', 'Patient spin']],
  ['quote', 'Ink Star Quote Box', 'The ink says: "Write the next line before judging the whole story."', ['Ink star x1', 'Next line x2', 'Story courage']],
  ['quote', 'Crescent Quote Box', 'The crescent says: "A partial glow is still a glow."', ['Crescent shard x1', 'Half-light x3', 'Enoughness']],
  ['quote', 'Quiet Signal Quote Box', 'The signal says: "You are allowed to answer life with a small yes."', ['Signal spark x1', 'Small yes x2', 'Clear tone']],
  ['quote', 'Warm Static Quote Box', 'The static says: "Even messy days can carry beautiful proof."', ['Static ribbon x1', 'Proof of trying x1', 'Warm noise']],
  ['quote', 'Old Star Quote Box', 'The old star says: "Rest is not a side quest."', ['Old star x1', 'Rest pass x2', 'No-guilt token']],
  ['quote', 'Blue Hour Quote Box', 'The blue hour says: "You can be unfinished and still worth keeping."', ['Blue hour shard x1', 'Unfinished charm x1', 'Gentle save']],
  ['chaos', 'Chaotic Moon Box', 'The box rattles suspiciously. It contains absolutely nothing, but in a premium way.', ['Fancy nothing x1', 'Questionable sparkle x4', 'Comedy crumbs']],
  ['chaos', 'Wrong Pocket Box', 'This box was supposed to arrive yesterday. It refuses to explain.', ['Expired future x1', 'Late sparkle x2', 'Confused receipt']],
  ['chaos', 'Keyboard Smash Box', 'The box says: "asdfghjkl" with alarming confidence.', ['Keyboard rune x1', 'Confidence without context', 'Noise crystal x6']],
  ['chaos', 'Overdramatic Box', 'The lid opens with the energy of a final boss, then gives you a sticky note.', ['Dramatic note x1', 'Boss music x0', 'Theater dust']],
  ['chaos', 'Soup Moon Box', 'Nobody knows why the moon is soup today. Do not ask the box.', ['Soup moon x1', 'Question ban x1', 'Warm confusion']],
  ['chaos', 'Reverse Luck Box', 'The box grants luck, but only for extremely specific situations.', ['Specific luck x1', 'Door handle blessing', 'Oddly useful charm']],
  ['chaos', 'Tiny Court Box', 'The box declares you innocent of crimes you never committed.', ['Tiny pardon x1', 'Imaginary court seal', 'Legal sparkle']],
  ['chaos', 'Suspiciously Normal Box', 'This box is normal. Too normal. Everyone should remain calm.', ['Normal dust x5', 'Suspicion coupon x1', 'Calm alarm']],
  ['chaos', 'Snack Dimension Box', 'The box opens a portal to snacks, but only emotionally.', ['Snack aura x1', 'Craving spark x3', 'Invisible chip']],
  ['chaos', 'No Context Box', 'A message inside says: "the ceiling knows." That is all.', ['Context missing x1', 'Ceiling lore x1', 'Mystery crumb']],
  ['music', 'Playlist Box', 'Drop one song that matches the current server weather.', ['Playlist note x1', 'Shared headphones', 'A 3-minute main character scene']],
  ['music', 'Low-Fi Box', 'The box asks for one calm song to study, wander, or stare at the ceiling to.', ['Lo-fi loop x1', 'Soft bass x2', 'Study aura']],
  ['music', 'Main Character Box', 'Pick a song for walking at night like the credits are rolling.', ['Credit roll x1', 'Streetlight beat x2', 'Cinematic step']],
  ['music', 'Rain Song Box', 'Share a track that sounds better when rain is involved.', ['Rain track x1', 'Wet window mood', 'Cloud rhythm x3']],
  ['music', 'Old Favorite Box', 'The box wants a song you loved before you knew how to explain why.', ['Old favorite x1', 'Nostalgia dust x4', 'Memory chorus']],
  ['music', 'Hype Button Box', 'Choose the song that would make the server stand up instantly.', ['Hype switch x1', 'Bass spark x5', 'Crowd pulse']],
  ['music', 'Secret Lyric Box', 'Drop a lyric that lives rent free in your head, but keep it short.', ['Lyric slip x1', 'Brain loop x2', 'Tiny chorus']],
  ['music', 'Late Night Radio Box', 'The box tunes into a station that only plays songs for 1 AM thoughts.', ['Radio dial x1', 'Midnight static x3', 'Soft frequency']],
  ['music', 'Boss Theme Box', 'Pick a boss theme for finishing your chores.', ['Boss intro x1', 'Chore damage +2', 'Victory chord']],
  ['music', 'Healing Track Box', 'Share one song that feels like a blanket after a long day.', ['Healing track x1', 'Warm blanket x2', 'Rest note']],
  ['compliment', 'Silver Compliment Box', 'Whoever claims this is legally required to accept that they are doing okay.', ['Compliment seal x1', 'Moon cookie x2', 'Confidence spark']],
  ['compliment', 'Soft Crown Box', 'The box places a soft crown on the claimer for surviving the day.', ['Soft crown x1', 'Survival sparkle x3', 'Quiet applause']],
  ['compliment', 'Good Timing Box', 'The box says your timing is better than you think.', ['Timing ribbon x1', 'Good instinct x2', 'Trust point']],
  ['compliment', 'Kind Mirror Box', 'The mirror inside refuses to show your worst angle.', ['Kind mirror x1', 'Flattering light x3', 'Self-kindness']],
  ['compliment', 'Warm Receipt Box', 'Receipt printed: one person here is glad you exist. No refund.', ['Warm receipt x1', 'Existence proof x1', 'No-refund glow']],
  ['compliment', 'Tiny Trophy Box', 'The box awards you a trophy for doing one thing while tired.', ['Tiny trophy x1', 'Tired victory x2', 'Proud dust']],
  ['compliment', 'Brave Dot Box', 'The box notices a small brave thing you did and refuses to ignore it.', ['Brave dot x1', 'Notice token x2', 'Little courage']],
  ['compliment', 'Cozy Approval Box', 'The box approves of your current level of trying.', ['Approval stamp x1', 'Cozy spark x4', 'Enough token']],
  ['compliment', 'Quiet Fanclub Box', 'A tiny fanclub inside the box cheers politely for you.', ['Fanclub card x1', 'Polite cheer x3', 'Soft applause']],
  ['compliment', 'Moon Cookie Box', 'The cookie says: you are not behind; you are just in your chapter.', ['Moon cookie x1', 'Chapter marker x1', 'Pacing charm']],
  ['game', 'Dice Moon Box', 'Roll an imaginary dice. If you smiled, you won.', ['Imaginary dice x1', 'Smile win x1', 'Luck pip x6']],
  ['game', 'Riddle Box', 'Riddle: I get bigger when shared and lighter when heard. Answer: a story.', ['Riddle slip x1', 'Story spark x2', 'Brain stretch']],
  ['game', 'Choice Box', 'Choose one: moon tea, star bread, or cloud soup. Defend your choice.', ['Choice token x1', 'Debate spice x2', 'Fantasy snack']],
  ['game', 'Would You Rather Box', 'Would you rather have a tiny moon lamp or a pocket thundercloud?', ['Question card x1', 'Pocket weather x1', 'Fun spark']],
  ['game', 'Two Truths Box', 'Post two truths and one tiny lie. Keep it harmless.', ['Truth card x2', 'Tiny lie x1', 'Guess token']],
  ['game', 'Emoji Story Box', 'Tell a five-word story using one emoji as the plot twist.', ['Story die x1', 'Emoji twist x1', 'Micro fiction']],
  ['game', 'Guess Box', 'The claimer must guess what color the box is thinking about.', ['Guess coin x1', 'Color whisper x2', 'Wrong answer sparkle']],
  ['game', 'Name Box', 'Give the box a name. It may or may not accept it.', ['Name tag x1', 'Box approval pending', 'Silly title']],
  ['game', 'Tiny Poll Box', 'Start a tiny poll: cats, moons, snacks, or naps?', ['Poll slip x1', 'Vote sparkle x4', 'Democracy dust']],
  ['game', 'Story Chain Box', 'Start a story with seven words. Someone else must continue it.', ['Chain link x1', 'Opening line x1', 'Lore spark']],
  ['lore', 'Archive Box', 'An archive page says Moonlight keeps small stories safe.', ['Archive page x1', 'Lore dust x3', 'Memory clasp']],
  ['lore', 'Observatory Box', 'The observatory points at a star named after a forgotten joke.', ['Star chart x1', 'Old joke x1', 'Telescope shine']],
  ['lore', 'Library Box', 'A library card inside has no due date and a suspicious moon stamp.', ['Library card x1', 'Moon stamp x2', 'Quiet shelf']],
  ['lore', 'Harbor Box', 'The box smells like a harbor where paper boats carry wishes.', ['Paper boat x1', 'Wish tide x2', 'Salt sparkle']],
  ['lore', 'Clocktower Box', 'A clocktower bell rings once for a minute you almost missed.', ['Clock gear x1', 'Saved minute x1', 'Time dust']],
  ['lore', 'Garden Box', 'A night garden grows one flower for every message that mattered.', ['Night flower x1', 'Message pollen x2', 'Bloom token']],
  ['lore', 'Train Ticket Box', 'The ticket says: destination unknown, seat by the window.', ['Train ticket x1', 'Window seat x1', 'Journey spark']],
  ['lore', 'Mailbox Box', 'A tiny mailbox holds a letter addressed to "whoever needed this."', ['Tiny letter x1', 'Needed words x2', 'Mail flag']],
  ['lore', 'Comet Box', 'A comet scratched a note on the lid: "arrive bright, leave kind."', ['Comet dust x3', 'Kind exit x1', 'Bright trail']],
  ['lore', 'Moon Market Box', 'The moon market sells courage by the spoonful tonight.', ['Market coin x1', 'Spoonful courage x2', 'Night bargain']],
  ['daily', 'Morning Reset Box', 'The box offers one clean restart, even if the day began badly.', ['Reset ribbon x1', 'Fresh page x1', 'Morning spark']],
  ['daily', 'Deadline Box', 'The box does not finish your task, but it does stare at you supportively.', ['Support stare x1', 'Focus crumb x3', 'Deadline shield']],
  ['daily', 'Nap Permit Box', 'The box grants an official permit to rest when possible.', ['Nap permit x1', 'No guilt x2', 'Soft blanket']],
  ['daily', 'Tiny Win Box', 'The box asks you to name one tiny win before the day forgets.', ['Tiny win x1', 'Memory pin x2', 'Pride spark']],
  ['daily', 'Snack Check Box', 'The box checks your snack status with professional concern.', ['Snack check x1', 'Craving map x1', 'Energy crumb']],
  ['daily', 'Focus Lantern Box', 'A lantern lights only the next ten minutes. That is enough.', ['Focus lantern x1', 'Ten-minute glow x1', 'Task courage']],
  ['daily', 'Inbox Box', 'The box contains one imaginary unread message: "you can handle the next thing."', ['Inbox ping x1', 'Handle token x2', 'Next thing badge']],
  ['daily', 'Good Enough Box', 'The box stamps today as good enough to continue.', ['Good-enough stamp x1', 'Continue pass x1', 'Soft approval']],
  ['daily', 'Window Stretch Box', 'The box recommends stretching like a dramatic person by a window.', ['Stretch spark x1', 'Window pose x1', 'Body thanks']],
  ['daily', 'End Scene Box', 'The box saves a quiet end-scene for later: lights low, worries lower.', ['End-scene card x1', 'Low light x2', 'Peace cue']],
].map(makeBoxTemplate);

const boxTtlMs = 5 * 60 * 1000;

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const claimEvents = {
  fortune: [
    'A silver spark circles the room. Your next message carries a little extra luck.',
    'The box opens into a soft omen: choose the brave option once today.',
    'Moonlight marks this claim as a lucky turn. Small chances feel slightly warmer.',
  ],
  question: [
    'A question floats out and waits for an answer in chat.',
    'The box asks everyone nearby to share one tiny honest thought.',
    'A quiet prompt appears. The claimer gets to start the next conversation.',
  ],
  quest: [
    'A mini quest begins. Complete the prompt and claim moral victory.',
    'The box assigns a harmless side quest to the claimer.',
    'A task marker appears above the chat. The reward is good room energy.',
  ],
  quote: [
    'The quote glows brighter after being claimed.',
    'The box pins this sentence to the night for a moment.',
    'A small line of wisdom escapes and politely refuses to be forgotten.',
  ],
  chaos: [
    'The lid pops open dramatically. Nothing explodes, which is honestly suspicious.',
    'A harmless chaos pulse shakes the box and improves the room by 1 nonsense.',
    'The box briefly becomes too powerful, then calms down.',
  ],
  music: [
    'A tiny playlist note drops out. The claimer should share a song if they want.',
    'The box tunes the room to a late-night frequency.',
    'A melody fragment appears. Someone owes the chat one good track.',
  ],
  compliment: [
    'The box stamps the claimer with a soft little confidence buff.',
    'A warm receipt prints itself: this person is appreciated.',
    'The claim releases one compliment into the room. Accept it. No dodging.',
  ],
  game: [
    'A tiny mini-game starts in spirit. The claimer gets first move.',
    'The box rolls an invisible die and declares the claim valid.',
    'A playful challenge appears. The room may now argue about the correct answer.',
  ],
  lore: [
    'A page of Moonlight lore unlocks for a few seconds.',
    'The box adds this claim to the server archive.',
    'A tiny story thread appears and vanishes into the moonlight.',
  ],
  daily: [
    'The box grants a small daily reset. Nothing huge, just enough.',
    'A practical blessing drops out for the rest of the day.',
    'The claim restores one invisible point of motivation.',
  ],
};

const getClaimEvent = (boxType) => randomItem(claimEvents[boxType] || claimEvents.daily);

const buildMysteryBoxEmbed = (box) => createEmbed({
  title: box.title,
  description: box.content,
  variant: box.claimedBy ? 'success' : box.expiredAt ? 'warning' : 'system',
  thumbnail: icons.system,
  fields: [
    { name: 'Box ID', value: `#${box.id}`, inline: true },
    { name: 'Type', value: box.boxType, inline: true },
    {
      name: box.claimedBy ? 'Claimed By' : box.expiredAt ? 'Expired' : 'Hidden Reward',
      value: box.claimedBy
        ? `<@${box.claimedBy}>\n${box.reward}\n\n**Event:** ${getClaimEvent(box.boxType)}`
        : box.expiredAt
          ? 'Nobody claimed this box within 5 minutes.'
          : 'Press **Claim** to open it first. Expires in **5 minutes**.',
      inline: false,
    },
  ],
  footer: 'Moonlight Mystery Box - appears every 10 minutes when enabled',
});

const buildClaimRow = (box) => [
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mysterybox:claim:${box.id}`)
      .setLabel(box.claimedBy ? 'Claimed' : box.expiredAt ? 'Expired' : 'Claim')
      .setStyle(box.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(Boolean(box.claimedBy || box.expiredAt))
  ),
];

const canSendInChannel = (guild, channel) => {
  if (!channel?.isTextBased?.()) return false;
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return false;
  const me = guild.members.me;
  const permissions = me ? channel.permissionsFor(me) : null;
  return Boolean(permissions?.has(PermissionFlagsBits.ViewChannel)
    && permissions?.has(PermissionFlagsBits.SendMessages)
    && permissions?.has(PermissionFlagsBits.EmbedLinks));
};

const pickRandomTextChannel = (guild) => {
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => canSendInChannel(guild, channel));
  if (channels.length === 0) return null;
  return randomItem(channels);
};

const createBoxPayload = () => {
  const template = randomItem(boxTemplates);
  return {
    boxType: template.type,
    title: template.title,
    content: template.content,
    reward: randomItem(template.rewards),
  };
};

const sendMysteryBox = async (client, settings, now = new Date()) => {
  const guild = client.guilds.cache.get(settings.guildId);
  if (!guild) return null;

  if (!settings.channelId) return null;

  const channel = guild.channels.cache.get(settings.channelId)
    || await guild.channels.fetch(settings.channelId).catch(() => null);
  if (!canSendInChannel(guild, channel)) return null;

  const sentKey = getMinuteKey(now).replace(/[: ]/g, '-');
  const expiresAt = new Date(now.getTime() + boxTtlMs);
  const payload = createBoxPayload();
  let box;
  try {
    box = await mysteryBoxRepository.addBox({
      guildId: guild.id,
      channelId: channel.id,
      sentKey,
      expiresAt,
      ...payload,
    });
  } catch {
    return null;
  }

  const message = await channel.send({
    embeds: [buildMysteryBoxEmbed(box)],
    components: buildClaimRow(box),
    allowedMentions: { parse: [] },
  });
  await mysteryBoxRepository.updateMessage({ guildId: guild.id, id: box.id, messageId: message.id });
  scheduleBoxExpiry(client, { ...box, messageId: message.id, expiresAt });
  return box;
};

const scheduleBoxExpiry = (client, box) => {
  const delay = Math.max(0, new Date(box.expiresAt).getTime() - Date.now());
  setTimeout(async () => {
    try {
      const expired = await mysteryBoxRepository.expireBox({ guildId: box.guildId, id: box.id });
      if (!expired) return;

      const guild = client.guilds.cache.get(expired.guildId);
      const channel = guild?.channels.cache.get(expired.channelId) || await guild?.channels.fetch(expired.channelId).catch(() => null);
      const message = await channel?.messages?.fetch(expired.messageId).catch(() => null);
      await message?.edit({
        embeds: [buildMysteryBoxEmbed(expired)],
        components: buildClaimRow(expired),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.error('Mystery box expiry failed:', error);
    }
  }, delay);
};

const runMysteryBoxTick = async (client, now = new Date()) => {
  const settings = await mysteryBoxRepository.listEnabled();
  const results = [];
  for (const setting of settings) {
    try {
      const result = await sendMysteryBox(client, setting, now);
      if (result) results.push(result);
    } catch (error) {
      console.error('Mystery box send failed:', error);
    }
  }
  return results;
};

const handleMysteryBoxClaim = async (interaction) => {
  const [, action, idText] = interaction.customId.split(':');
  if (action !== 'claim') return false;

  const id = Number(idText);
  if (!Number.isInteger(id)) return false;

  const claimed = await mysteryBoxRepository.claimBox({
    guildId: interaction.guildId,
    id,
    userId: interaction.user.id,
  });

  if (!claimed) {
    const existing = await mysteryBoxRepository.findBox({ guildId: interaction.guildId, id });
    await interaction.reply({
      content: existing?.expiredAt
        ? 'This mystery box expired after 5 minutes.'
        : existing?.claimedBy
        ? `This box was already claimed by <@${existing.claimedBy}>.`
        : 'This mystery box is no longer available.',
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
    return true;
  }

  await interaction.update({
    embeds: [buildMysteryBoxEmbed(claimed)],
    components: buildClaimRow(claimed),
    allowedMentions: { parse: [] },
  });
  return true;
};

module.exports = {
  boxTemplates,
  buildClaimRow,
  buildMysteryBoxEmbed,
  boxTtlMs,
  canSendInChannel,
  createBoxPayload,
  getClaimEvent,
  handleMysteryBoxClaim,
  pickRandomTextChannel,
  runMysteryBoxTick,
  sendMysteryBox,
};
