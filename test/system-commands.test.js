const assert = require('node:assert/strict');
const test = require('node:test');

const restoreEnv = (key, value) => {
  if (typeof value === 'undefined') {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
};

test('owner id parser supports comma separated owner ids', () => {
  const ownerOnly = require('../utils/ownerOnly');
  const previous = {
    OWNER_ID: process.env.OWNER_ID,
    BOT_OWNER_ID: process.env.BOT_OWNER_ID,
    OWNER_IDS: process.env.OWNER_IDS,
  };

  delete process.env.OWNER_ID;
  delete process.env.BOT_OWNER_ID;
  process.env.OWNER_IDS = 'user-1, user-2';

  assert.deepEqual(ownerOnly.parseOwnerIds(), ['user-1', 'user-2']);

  restoreEnv('OWNER_ID', previous.OWNER_ID);
  restoreEnv('BOT_OWNER_ID', previous.BOT_OWNER_ID);
  restoreEnv('OWNER_IDS', previous.OWNER_IDS);
});

test('weather helper resolves location and current weather', async () => {
  const weather = require('../commands/system/weather');
  const requested = [];
  const fakeFetch = async (url) => {
    requested.push(String(url));
    if (String(url).includes('geocoding-api')) {
      return {
        ok: true,
        json: async () => ({
          results: [{
            name: 'Ho Chi Minh City',
            admin1: 'Ho Chi Minh',
            country: 'Vietnam',
            latitude: 10.8,
            longitude: 106.6,
          }],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 31.4,
          apparent_temperature: 35.1,
          relative_humidity_2m: 70,
          cloud_cover: 40,
          precipitation: 0,
          surface_pressure: 1008,
          weather_code: 2,
          wind_speed_10m: 11.2,
          time: '2026-07-11T16:30',
        },
      }),
    };
  };

  const result = await weather._private.getWeather('Ho Chi Minh', fakeFetch);
  const embed = weather._private.buildWeatherEmbed(result);

  assert.equal(requested.length, 2);
  assert.equal(result.place.name, 'Ho Chi Minh City');
  assert.equal(embed.data.title, '⛅ Thời tiết - Ho Chi Minh City');
  assert.match(embed.data.description, /31°C/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /Ho Chi Minh City, Ho Chi Minh, Vietnam/);
  assert.match(embed.data.footer.text, /Open-Meteo/);
});

test('time helper resolves timezone by location', async () => {
  const time = require('../commands/system/time');
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      results: [{
        name: 'Hanoi',
        admin1: 'Ha Noi',
        country: 'Vietnam',
        timezone: 'Asia/Bangkok',
      }],
    }),
  });

  const result = await time._private.getTimeLocation(
    'Hanoi',
    fakeFetch,
    new Date('2026-07-11T05:30:00Z')
  );
  const embed = time._private.buildTimeEmbed(result);

  assert.equal(result.timezone, 'Asia/Bangkok');
  assert.match(embed.data.title, /Hanoi/);
  assert.match(embed.data.description, /12:30:00/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /Asia\/Bangkok/);
});

test('currency helper converts amounts with latest rates', async () => {
  const currency = require('../commands/system/currency');
  const fakeFetch = async (url) => ({
    ok: true,
    json: async () => ({
      result: 'success',
      base_code: String(url).endsWith('/USD') ? 'USD' : 'UNKNOWN',
      rates: { VND: 25000 },
      time_last_update_utc: 'Sat, 11 Jul 2026 00:00:01 +0000',
      time_next_update_utc: 'Sun, 12 Jul 2026 00:00:01 +0000',
    }),
  });

  const result = await currency._private.getCurrencyRate({
    amount: 2,
    from: 'usd',
    to: 'vnd',
  }, fakeFetch);
  const embed = currency._private.buildCurrencyEmbed(result);

  assert.equal(result.converted, 50000);
  assert.match(embed.data.title, /USD/);
  assert.match(embed.data.description, /50,000/);
});

test('anonymous embed does not include sender identity', () => {
  const anonymous = require('../commands/system/anonymous');
  const embed = anonymous._private.buildAnonymousEmbed('secret hello');

  assert.match(embed.data.title, /Anonymous/);
  assert.match(embed.data.description, /secret hello/);
  assert.doesNotMatch(JSON.stringify(embed.data), /user-1/);
});

test('letter helper builds public song letter embeds and buttons', () => {
  const letterCommand = require('../commands/system/letter');
  const letter = {
    id: 12,
    recipient: 'An',
    message: 'A small song under the moon.',
    song: '505 - Arctic Monkeys',
    songUrl: 'https://open.spotify.com/track/example',
    imageUrl: 'https://example.com/album.png',
    tag: 'nostalgia',
    likeCount: 3,
    anonymous: true,
    senderId: 'sender-1',
    senderName: 'Sender#0001',
    createdAt: '2026-07-11T10:00:00Z',
  };

  const embed = letterCommand._private.buildLetterEmbed(letter);
  const buttons = letterCommand._private.buildLetterButtons(letter);

  assert.equal(embed.data.title, 'Moonlight Letter #12');
  assert.match(embed.data.description, /small song/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /505 - Arctic Monkeys/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /Nostalgia/);
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /3/);
  assert.equal(embed.data.thumbnail.url, 'https://example.com/album.png');
  assert.equal(buttons[0].components[0].data.custom_id, 'letter:view:12');
  assert.equal(buttons[0].components[1].data.custom_id, 'letter:like:12');
  assert.equal(buttons[0].components[1].data.label, 'Like (3)');
  assert.equal(buttons[0].components[2].data.url, 'https://open.spotify.com/track/example');
});

test('letter management permission allows sender or manage messages moderator', () => {
  const letterCommand = require('../commands/system/letter');
  const letter = { senderId: 'sender-1' };

  assert.equal(letterCommand._private.canManageLetter({
    user: { id: 'sender-1' },
    member: { permissions: { has: () => false } },
  }, letter), true);

  assert.equal(letterCommand._private.canManageLetter({
    user: { id: 'other-user' },
    member: { permissions: { has: () => true } },
  }, letter), true);

  assert.equal(letterCommand._private.canManageLetter({
    user: { id: 'other-user' },
    member: { permissions: { has: () => false } },
  }, letter), false);
});

test('letter browse helper builds pagination controls', () => {
  const letterCommand = require('../commands/system/letter');
  const letters = [
    { id: 1, recipient: 'An', message: 'hello', song: 'Song 1', tag: 'love', likeCount: 2 },
    { id: 2, recipient: 'Bao', message: 'hi', song: 'Song 2', tag: 'sad', likeCount: 0 },
  ];

  const embed = letterCommand._private.buildBrowseEmbed({
    title: 'All Moonlight Letters',
    letters,
    page: 1,
    total: 12,
    tag: 'love',
  });
  const rows = letterCommand._private.buildBrowseButtons({
    letters,
    token: 'abc123',
    page: 1,
    total: 12,
  });

  assert.match(embed.data.description, /2\/3/);
  assert.match(embed.data.description, /Love/);
  assert.match(embed.data.fields[0].value, /Likes: \*\*2\*\*/);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].components[0].data.custom_id, 'letter:page:abc123:0');
  assert.equal(rows[1].components[1].data.custom_id, 'letter:page:abc123:2');
});

test('letter command exposes mine edit and tag choices', () => {
  const letterCommand = require('../commands/system/letter');
  const command = letterCommand.data.toJSON();
  const names = command.options.map((option) => option.name);
  const send = command.options.find((option) => option.name === 'send');
  const browse = command.options.find((option) => option.name === 'browse');
  const tag = send.options.find((option) => option.name === 'tag');

  assert.ok(names.includes('mine'));
  assert.ok(names.includes('edit'));
  assert.ok(names.includes('search'));
  assert.equal(send.options.find((option) => option.name === 'song').autocomplete, true);
  assert.equal(browse.options.find((option) => option.name === 'recipient').required, false);
  assert.equal(command.options.find((option) => option.name === 'search').options.find((option) => option.name === 'keyword').required, true);
  assert.ok(tag.choices.length >= 20);
});

test('letter cooldown helper tracks send cooldowns', () => {
  const letterCommand = require('../commands/system/letter');
  letterCommand._private.cooldowns.clear();

  assert.equal(letterCommand._private.getCooldownLeft('guild', 'user', 1000), 0);
  letterCommand._private.setCooldown('guild', 'user', 1000);
  assert.equal(letterCommand._private.getCooldownLeft('guild', 'user', 1000), 60000);
});

test('letter song option supports music autocomplete', () => {
  const letterCommand = require('../commands/system/letter');
  const command = letterCommand.data.toJSON();
  const send = command.options.find((option) => option.name === 'send');
  const song = send.options.find((option) => option.name === 'song');

  assert.equal(song.autocomplete, true);
});

test('music search maps iTunes songs into autocomplete choices', async () => {
  const musicSearch = require('../utils/musicSearch');
  const fakeFetch = async (url) => {
    assert.match(String(url), /itunes\.apple\.com\/search/);
    assert.match(String(url), /entity=song/);
    return {
      ok: true,
      json: async () => ({
        results: [{
          wrapperType: 'track',
          kind: 'song',
          trackId: 123,
          trackName: '505',
          artistName: 'Arctic Monkeys',
          trackViewUrl: 'https://music.apple.com/song/505',
          artworkUrl100: 'https://example.com/100x100bb.jpg',
          collectionName: 'Favourite Worst Nightmare',
        }],
      }),
    };
  };

  const songs = await musicSearch.searchSongs('505 arctic monkeys', { fetchImpl: fakeFetch });
  const choices = musicSearch.buildSongChoices(songs);

  assert.equal(songs[0].displayName, '505 - Arctic Monkeys');
  assert.equal(songs[0].imageUrl, 'https://example.com/600x600bb.jpg');
  assert.deepEqual(choices, [{ name: '505 - Arctic Monkeys', value: '505 - Arctic Monkeys' }]);
});

test('holiday helper returns upcoming holidays', async () => {
  const holiday = require('../commands/system/holiday');
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ([
      { date: '2026-01-01', localName: 'Tết Dương lịch', name: "New Year's Day" },
      { date: '2026-09-02', localName: 'Quốc khánh', name: 'National Day' },
    ]),
  });

  const result = await holiday._private.getPublicHolidays({
    country: 'vn',
    year: 2026,
  }, fakeFetch);
  const selected = holiday._private.selectHolidays(result.holidays, {
    now: new Date('2026-07-11T00:00:00Z'),
  });
  const embed = holiday._private.buildHolidayEmbed(result, {
    now: new Date('2026-07-11T00:00:00Z'),
  });

  assert.equal(result.countryCode, 'VN');
  assert.deepEqual(selected.map((item) => item.date), ['2026-09-02']);
  assert.match(embed.data.fields[0].value, /Quốc khánh/);
});

test('holiday country input accepts common country names', () => {
  const holiday = require('../commands/system/holiday');

  assert.equal(holiday._private.normalizeCountryCode('Viet Nam'), 'VN');
  assert.equal(holiday._private.normalizeCountryCode('Việt Nam'), 'VN');
  assert.equal(holiday._private.normalizeCountryCode('Japan'), 'JP');
  assert.equal(holiday._private.normalizeCountryCode('United States'), 'US');
  assert.equal(holiday._private.normalizeCountryCode('gb'), 'GB');
});
