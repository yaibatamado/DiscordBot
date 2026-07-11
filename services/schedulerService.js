const { runMysteryBoxTick } = require('./mysteryBoxService');
const { runServerWrappedTick } = require('./serverWrappedService');
const { getLocalHourMinute, getMinuteKey } = require('../utils/timeKeys');

let schedulerTimer = null;
let lastMysteryKey = null;
let lastWrappedKey = null;

const shouldRunMysteryBoxNow = (now = new Date()) => {
  const { minute } = getLocalHourMinute(now);
  return minute % 10 === 0;
};

const runSchedulerTick = async (client, now = new Date()) => {
  const minuteKey = getMinuteKey(now);

  if (shouldRunMysteryBoxNow(now) && lastMysteryKey !== minuteKey) {
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
  shouldRunMysteryBoxNow,
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
