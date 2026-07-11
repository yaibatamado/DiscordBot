const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

const trimChoice = (value, maxLength = 100) => {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
};

const upgradeArtwork = (url) => (
  url ? String(url).replace(/\/\d+x\d+bb\./, '/600x600bb.') : null
);

const mapItunesTrack = (item) => {
  if (!item || item.wrapperType !== 'track' || item.kind !== 'song') return null;

  const title = item.trackName || 'Unknown Song';
  const artist = item.artistName || 'Unknown Artist';
  return {
    id: String(item.trackId || `${title}:${artist}`),
    title,
    artist,
    displayName: `${title} - ${artist}`,
    url: item.trackViewUrl || null,
    imageUrl: upgradeArtwork(item.artworkUrl100 || item.artworkUrl60),
    collection: item.collectionName || null,
  };
};

const searchSongs = async (query, { limit = 5, fetchImpl = fetch } = {}) => {
  const term = String(query || '').trim();
  if (term.length < 2) return [];

  const url = new URL(ITUNES_SEARCH_URL);
  url.searchParams.set('term', term);
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 25)));

  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`iTunes search failed: ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.results)
    ? data.results.map(mapItunesTrack).filter(Boolean)
    : [];
};

const buildSongChoices = (songs) => songs.slice(0, 25).map((song) => {
  const name = trimChoice(song.displayName, 100);
  return {
    name,
    value: name,
  };
});

module.exports = {
  ITUNES_SEARCH_URL,
  buildSongChoices,
  mapItunesTrack,
  searchSongs,
  trimChoice,
  upgradeArtwork,
};
