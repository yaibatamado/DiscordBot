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
          weather_code: 2,
          wind_speed_10m: 11.2,
        },
      }),
    };
  };

  const result = await weather._private.getWeather('Ho Chi Minh', fakeFetch);
  const embed = weather._private.buildWeatherEmbed(result);

  assert.equal(requested.length, 2);
  assert.equal(result.place.name, 'Ho Chi Minh City');
  assert.equal(embed.data.title, 'Weather - Ho Chi Minh City, Ho Chi Minh, Vietnam');
  assert.match(embed.data.fields.map((field) => field.value).join('\n'), /31°C/);
});
