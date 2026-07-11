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

const activityPools = {
  story: [
    'Start a 3-message story chain. The first line must include: moon, window, and secret.',
    'Write the first 7 words of a tiny story. The next person continues with exactly 7 words.',
    'Create a micro story where the last object you touched becomes magical.',
    'Start a story with: "At 3 AM, the moon sent a notification..."',
    'Write one sentence about a door that only opens when someone laughs.',
    'Create a tiny legend about the current channel name.',
    'Start a cozy mystery. The first clue is something blue.',
    'Write a one-line fairy tale where the villain is a calendar reminder.',
    'Begin a story from the point of view of the mystery box.',
    'Create a dramatic final line. The next person must write what happened before it.',
  ],
  riddle: [
    'Riddle round: I get bigger when shared and lighter when heard. Answer: a story.',
    'Riddle round: I speak without a mouth and disappear when ignored. What am I?',
    'Riddle round: The more you take from me, the bigger I become. What am I?',
    'Riddle round: I can be cracked, made, told, and played. What am I?',
    'Riddle round: I follow you in light but vanish when things get too dark. What am I?',
    'Riddle round: I have keys but open no doors. What am I?',
    'Riddle round: I fly without wings and cry without eyes. What am I?',
    'Riddle round: I am full of holes but still hold water. What am I?',
    'Riddle round: I become yours when you share me. What am I?',
    'Riddle round: I am not alive, but I can grow in chat. What am I?',
  ],
  compliment: [
    'Compliment chain: the claimer tags or names one person and says one kind sentence.',
    'Warm pass: everyone can drop one short compliment for someone in chat.',
    'Soft spotlight: say one good thing about the claimer or the server today.',
    'Kind mirror: describe one strength you noticed in someone here.',
    'Tiny applause: give someone credit for a small thing they did recently.',
    'Moon pass: the claimer gives a compliment, then that person passes one forward.',
    'No-dodging rule: the claimer must accept one nice sentence from the room.',
    'Comfort note: send one sentence someone tired might need to hear.',
    'Appreciation ping: mention one person who made chat better this week.',
    'Quiet trophy: award an imaginary trophy to someone and explain why.',
  ],
  music: [
    'Mini playlist: everyone drops one song for the current mood. The claimer chooses the title of the playlist.',
    'Soundtrack round: share one track that would play during tonight\'s credits.',
    'One-song note: send a song and one sentence about why it fits this moment.',
    'Rainy radio: share a song that sounds better at night.',
    'Boss theme: pick a track for finishing boring tasks.',
    'Healing queue: drop one song that feels like rest.',
    'Memory track: share a song tied to a harmless memory.',
    'Server intro: choose a theme song for this channel.',
    'Lyric spark: post a very short lyric vibe without quoting too much.',
    'Album cover mood: describe today as if it were an album cover.',
  ],
  question: [
    'Question round: what tiny thing made today easier?',
    'Question round: what is one comfort item, song, or place you would keep in your pocket?',
    'Question round: what are you looking forward to, even a little?',
    'Question round: what is a small habit that genuinely helps you?',
    'Question round: what fictional place would you visit for one evening?',
    'Question round: what is something you liked before it became popular?',
    'Question round: what snack fits your current mood?',
    'Question round: what would your younger self be surprised you can do now?',
    'Question round: what is one thing you want to learn casually?',
    'Question round: what makes a server feel welcoming to you?',
  ],
  quest: [
    'Mini quest: send one kind sentence to the room before the next box appears.',
    'Mini quest: describe your mood using exactly three emojis.',
    'Mini quest: share one harmless fun fact from your day.',
    'Mini quest: drink water, then report back with "hydrated".',
    'Mini quest: clean one tiny thing near you in under one minute.',
    'Mini quest: recommend one useful app, site, or tool.',
    'Mini quest: send a screenshot or description of something pretty you saw recently.',
    'Mini quest: ask the room one low-pressure question.',
    'Mini quest: name one task you will do after this message.',
    'Mini quest: write a 5-word weather report for your mood.',
  ],
  quote: [
    'Quote spark: write one short sentence that feels like a loading screen tip for life.',
    'Quote spark: turn your current mood into a fake inspirational quote.',
    'Quote spark: share one line that sounds calm, brave, or beautifully dramatic.',
    'Quote spark: write a tiny fortune cookie message for the server.',
    'Quote spark: make a fake ancient proverb about Discord.',
    'Quote spark: write one sentence that would fit under a moon photo.',
    'Quote spark: invent a motto for sleepy people doing their best.',
    'Quote spark: make a dramatic quote about opening mystery boxes.',
    'Quote spark: write one gentle reminder in 12 words or fewer.',
    'Quote spark: create a quote that starts with "Even now..."',
  ],
  chaos: [
    'Chaos round: everyone describes the box using one suspicious adjective.',
    'Chaos round: invent a fake law the server must obey for the next 60 seconds.',
    'Chaos round: name an imaginary item that should never exist.',
    'Chaos round: rename the moon badly for one message.',
    'Chaos round: describe your day as a fake patch note.',
    'Chaos round: invent a useless superpower and its side effect.',
    'Chaos round: write a warning label for this channel.',
    'Chaos round: everyone posts one harmless conspiracy about snacks.',
    'Chaos round: explain a normal object like it is forbidden magic.',
    'Chaos round: create a fake achievement unlocked by the claimer.',
  ],
  game: [
    'Mini game: the claimer asks a Would You Rather question. Everyone answers A or B.',
    'Mini game: start Two Truths and One Tiny Lie. Keep it harmless.',
    'Mini game: choose moon tea, star bread, or cloud soup. Defend your choice.',
    'Mini game: first person to reply with a 5-letter word sets the theme.',
    'Mini game: describe a movie badly and let others guess it.',
    'Mini game: make a chain where each reply starts with the last letter of the previous reply.',
    'Mini game: the claimer gives three emojis; others guess the story.',
    'Mini game: rate the current vibe from 1 to 10 and explain with one word.',
    'Mini game: invent a fake item shop and pick one item.',
    'Mini game: name a color. Others reply with something that color.',
  ],
  lore: [
    'Lore drop: add one sentence to the imaginary history of this server.',
    'Lore drop: name a fictional place inside Moonlight\'s world and describe it in 5 words.',
    'Lore drop: create a title for the current chat scene.',
    'Lore drop: invent a server legend that starts with "Long before the pins..."',
    'Lore drop: name the guardian of this channel.',
    'Lore drop: describe a hidden room behind the chat.',
    'Lore drop: create a festival celebrated by Moonlight users.',
    'Lore drop: write one line from a lost server prophecy.',
    'Lore drop: invent a harmless curse caused by missing sleep.',
    'Lore drop: create a name for the next chapter of this server.',
  ],
  daily: [
    'Daily reset: name one tiny win from today.',
    'Daily reset: pick one small thing you can finish in the next 10 minutes.',
    'Daily reset: send a quick reminder your future self needs.',
    'Daily reset: write one thing you are allowed to stop overthinking.',
    'Daily reset: choose one word for the rest of your day.',
    'Daily reset: share one comfort food, drink, or sound.',
    'Daily reset: set a tiny intention for the next hour.',
    'Daily reset: say one thing you survived this week.',
    'Daily reset: list one thing that deserves less stress.',
    'Daily reset: send one sentence to close the day gently.',
  ],
};

const getActivityKey = (box = {}) => {
  const title = String(box.title || '').toLowerCase();
  const content = String(box.content || '').toLowerCase();
  const text = `${title} ${content}`;

  if (text.includes('story') || text.includes('chain')) return 'story';
  if (text.includes('riddle')) return 'riddle';
  if (text.includes('compliment') || text.includes('approval') || text.includes('fanclub')) return 'compliment';
  if (text.includes('playlist') || text.includes('song') || text.includes('track') || text.includes('lyric') || text.includes('radio')) return 'music';
  if (text.includes('question card') || text.includes('answer') || box.boxType === 'question') return 'question';

  return activityPools[box.boxType] ? box.boxType : 'daily';
};

const getClaimActivity = (box = {}) => {
  const key = getActivityKey(box);
  return {
    key,
    title: {
      story: 'Story Spark Activity',
      riddle: 'Riddle Activity',
      compliment: 'Compliment Activity',
      music: 'Playlist Activity',
      question: 'Question Activity',
      quest: 'Mini Quest Activity',
      quote: 'Quote Spark Activity',
      chaos: 'Chaos Activity',
      game: 'Mini Game Activity',
      lore: 'Lore Activity',
      daily: 'Daily Reset Activity',
    }[key],
    prompt: randomItem(activityPools[key]),
  };
};

const getClaimEvent = (boxType) => getClaimActivity({ boxType }).prompt;

const buildClaimActivityEmbed = (box, activity = getClaimActivity(box)) => createEmbed({
  title: activity.title,
  description: activity.prompt,
  variant: 'system',
  thumbnail: icons.system,
  fields: [
    { name: 'Opened By', value: `<@${box.claimedBy}>`, inline: true },
    { name: 'From Box', value: `${box.title} #${box.id}`, inline: true },
    { name: 'How to play', value: 'Reply in this channel. No inventory needed, this is a live chat activity.', inline: false },
  ],
  footer: 'Moonlight Mystery Activity',
});

const buildMysteryBoxEmbed = (box) => createEmbed({
  title: box.title,
  description: box.content,
  variant: box.claimedBy ? 'success' : box.expiredAt ? 'warning' : 'system',
  thumbnail: icons.system,
  fields: [
    { name: 'Box ID', value: `#${box.id}`, inline: true },
    { name: 'Type', value: box.boxType, inline: true },
    {
      name: box.claimedBy ? 'Claimed By' : box.expiredAt ? 'Expired' : 'Mystery Activity',
      value: box.claimedBy
        ? `<@${box.claimedBy}>\n\n**Event:** A live activity opened in chat.`
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

  const activity = getClaimActivity(claimed);

  await interaction.update({
    embeds: [buildMysteryBoxEmbed(claimed)],
    components: buildClaimRow(claimed),
    allowedMentions: { parse: [] },
  });

  await interaction.followUp({
    embeds: [buildClaimActivityEmbed(claimed, activity)],
    allowedMentions: { users: [interaction.user.id] },
  }).catch((error) => {
    console.error('Mystery box activity send failed:', error);
  });
  return true;
};

module.exports = {
  activityPools,
  boxTemplates,
  buildClaimRow,
  buildClaimActivityEmbed,
  buildMysteryBoxEmbed,
  boxTtlMs,
  canSendInChannel,
  createBoxPayload,
  getClaimActivity,
  getClaimEvent,
  handleMysteryBoxClaim,
  pickRandomTextChannel,
  runMysteryBoxTick,
  sendMysteryBox,
};
