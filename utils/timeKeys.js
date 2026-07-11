const timeZone = 'Asia/Ho_Chi_Minh';

const getLocalParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getDateKey = (date = new Date()) => {
  const parts = getLocalParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getMinuteKey = (date = new Date()) => {
  const parts = getLocalParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

const getLocalDate = (date = new Date()) => {
  const parts = getLocalParts(date);
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
};

const addDaysKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getWeekStartKey = (date = new Date()) => {
  const local = getLocalDate(date);
  const day = local.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  local.setUTCDate(local.getUTCDate() + mondayOffset);
  return local.toISOString().slice(0, 10);
};

const getPreviousWeekRange = (date = new Date()) => {
  const currentWeekStart = getWeekStartKey(date);
  const startKey = addDaysKey(currentWeekStart, -7);
  const endKey = addDaysKey(currentWeekStart, -1);
  return {
    currentWeekStart,
    startKey,
    endKey,
  };
};

const getLocalHourMinute = (date = new Date()) => {
  const parts = getLocalParts(date);
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

module.exports = {
  addDaysKey,
  getDateKey,
  getLocalHourMinute,
  getMinuteKey,
  getPreviousWeekRange,
  getWeekStartKey,
  timeZone,
};
