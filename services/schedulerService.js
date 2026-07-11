const { runMysteryBoxTick } = require('./mysteryBoxService');
const { runServerWrappedTick } = require('./serverWrappedService');
const { getLocalHourMinute, getMinuteKey } = require('../utils/timeKeys');

let schedulerTimer = null;
let lastMysteryKey = null;
let lastWrappedKey = null;

const runSchedulerTick = async (client, now = new Date()) => {
  const minuteKey = getMinuteKey(now);
  const { minute } = getLocalHourMinute(now);

  if ((minute === 0 || minute === 30) && lastMysteryKey !== minuteKey) {
    lastMysteryKey = minuteKey;
    await runMysteryBoxTick(client, now);
  }

  if (lastWrappedKey !== minuteKey) {
    lastWrappedKey = minuteKey;
    await runServerWrappedTick(client, now);
  }
};

const startAutomationScheduler = (client) => {
  if (schedulerTimer) return schedulerTimer;

  schedulerTimer = setInterval(() => {
    runSchedulerTick(client).catch((error) => {
      console.error('Automation scheduler failed:', error);
    });
  }, 60 * 1000);

  runSchedulerTick(client).catch((error) => {
    console.error('Automation scheduler failed:', error);
  });

  return schedulerTimer;
};

module.exports = {
  runSchedulerTick,
  startAutomationScheduler,
  _private: {
    get lastMysteryKey() {
      return lastMysteryKey;
    },
    get lastWrappedKey() {
      return lastWrappedKey;
    },
  },
};
