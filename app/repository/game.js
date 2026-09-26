import storage from '../../storage/index.js';
import {
  Game, MagicOrb, Inventory,
} from '../magicbeasts/index.js';

const FIELD_KEY = 'games';

const getGames = () => storage.getItem(FIELD_KEY) || {};

const setGames = (games) => storage.setItem(FIELD_KEY, games);

const serializeGame = (game) => {
  const { player } = game;
  const completedChapters = {};
  for (const [mapId, chapters] of player.completedChapters) {
    completedChapters[mapId] = Array.from(chapters);
  }
  return {
    playerName: player.name,
    orbLevel: player.orb.level,
    orbEnergy: player.orb.energy,
    completedChapters,
    beastIds: player.beasts.map((b) => b.id),
    level: player.level,
    title: player.title,
    experience: player.experience,
    items: Array.from(player.inventory.items.entries()),
    materials: Array.from(player.inventory.materials.entries()),
  };
};

const deserializeGame = (data) => {
  const game = new Game({ playerName: data.playerName });

  const orbTier = game.orbTiers.find((t) => t.level === data.orbLevel);
  if (orbTier) {
    game.player.orb = new MagicOrb(orbTier);
    game.player.orb.energy = data.orbEnergy;
  }

  for (const [mapId, chapterIds] of Object.entries(data.completedChapters || {})) {
    game.player.completedChapters.set(mapId, new Set(chapterIds));
  }

  for (const beastId of data.beastIds || []) {
    const beast = game.findBeast(beastId);
    if (beast) game.player.addBeast(beast);
  }

  game.player.level = data.level;
  game.player.title = data.title;
  game.player.experience = data.experience;

  game.player.inventory = new Inventory();
  for (const [name, amount] of data.items || []) {
    game.player.inventory.addItem(name, amount);
  }
  for (const [name, amount] of data.materials || []) {
    game.player.inventory.addMaterial(name, amount);
  }

  return game;
};

const getGame = (userId) => {
  const data = getGames()[userId];
  return data ? deserializeGame(data) : null;
};

const setGame = async (userId, game) => {
  const games = getGames();
  games[userId] = serializeGame(game);
  await setGames(games);
};

const getOrCreateGame = (userId, playerName) => {
  const game = getGame(userId);
  if (game) return game;
  return new Game({ playerName });
};

export {
  getGame,
  setGame,
  getOrCreateGame,
};

export default null;
