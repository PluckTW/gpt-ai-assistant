import {
  describe,
  expect,
  test,
} from '@jest/globals';
import { Game, MagicOrb, Inventory } from '../app/magicbeasts/index.js';

// Inline serialize/deserialize to test round-trip without storage I/O
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

describe('遊戲狀態序列化與還原', () => {
  test('新遊戲序列化後可以完整還原', () => {
    const game = new Game({ playerName: '測試旅者' });
    const data = serializeGame(game);
    const restored = deserializeGame(data);

    expect(restored.player.name).toBe('測試旅者');
    expect(restored.player.orb.level).toBe(1);
    expect(restored.player.orb.energy).toBe(0);
    expect(restored.player.beasts).toHaveLength(0);
    expect(restored.getAvailableMaps().map((m) => m.id)).toEqual(['aurora-wilds']);
  });

  test('完成章節後序列化與還原可正確保留進度', () => {
    const game = new Game({ playerName: '測試旅者' });
    game.completeChapter('aurora-wilds', 'aurora-1');
    game.completeChapter('aurora-wilds', 'aurora-2');

    const data = serializeGame(game);
    const restored = deserializeGame(data);

    expect(restored.player.hasCompletedChapter('aurora-wilds', 'aurora-1')).toBe(true);
    expect(restored.player.hasCompletedChapter('aurora-wilds', 'aurora-2')).toBe(true);
    expect(restored.player.hasCompletedChapter('aurora-wilds', 'aurora-3')).toBe(false);
    expect(restored.player.beasts).toHaveLength(2);
    expect(restored.player.orb.energy).toBe(2);
  });

  test('魔法球升級後序列化與還原可保留新等級', () => {
    const game = new Game({ playerName: '測試旅者' });
    const firstMap = game.findMap('aurora-wilds');
    firstMap.chapters.forEach((chapter) => {
      game.completeChapter(firstMap.id, chapter.id);
    });
    game.tryUpgradeOrb();

    const data = serializeGame(game);
    const restored = deserializeGame(data);

    expect(restored.player.orb.level).toBe(2);
    expect(restored.player.orb.energy).toBe(0);
    expect(restored.getAvailableMaps()).toHaveLength(2);
  });
});

describe('闖關遊戲玩法邏輯', () => {
  test('挑戰章節後魔奇獸加入收藏', () => {
    const game = new Game({ playerName: '旅者' });
    const result = game.completeChapter('aurora-wilds', 'aurora-1');

    expect(result.rewardBeast).not.toBeNull();
    expect(result.rewardBeast.id).toBe('glimmer-fox');
    expect(game.player.hasBeast('glimmer-fox')).toBe(true);
  });

  test('重複挑戰同一章節不會增加重複魔奇獸', () => {
    const game = new Game({ playerName: '旅者' });
    game.completeChapter('aurora-wilds', 'aurora-1');
    game.player.completeChapter('aurora-wilds', 'aurora-1'); // force duplicate
    game.completeChapter('aurora-wilds', 'aurora-1');

    const foxCount = game.player.beasts.filter((b) => b.id === 'glimmer-fox').length;
    expect(foxCount).toBe(1);
  });

  test('完成地圖所有章節後魔法球充滿能量', () => {
    const game = new Game({ playerName: '旅者' });
    const map = game.findMap('aurora-wilds');
    map.chapters.forEach((ch) => game.completeChapter(map.id, ch.id));

    expect(game.player.orb.isCharged()).toBe(true);
  });

  test('魔法球未充滿時 tryUpgradeOrb 回傳 null', () => {
    const game = new Game({ playerName: '旅者' });
    game.completeChapter('aurora-wilds', 'aurora-1'); // partial charge

    const result = game.tryUpgradeOrb();
    expect(result).toBeNull();
    expect(game.player.orb.level).toBe(1);
  });

  test('升級魔法球後解鎖第二張地圖', () => {
    const game = new Game({ playerName: '旅者' });
    const map = game.findMap('aurora-wilds');
    map.chapters.forEach((ch) => game.completeChapter(map.id, ch.id));

    const newOrb = game.tryUpgradeOrb();
    expect(newOrb.level).toBe(2);
    expect(newOrb.name).toBe('星巡魔法球');

    const available = game.getAvailableMaps().map((m) => m.id);
    expect(available).toContain('tempest-archipelago');
  });

  test('已達最高魔法球等級時 tryUpgradeOrb 回傳 null', () => {
    const game = new Game({ playerName: '旅者' });

    // Complete all 3 maps to reach level 3
    ['aurora-wilds', 'tempest-archipelago', 'celestial-sanctum'].forEach((mapId) => {
      // Manually set orb level to unlock maps
      const mapObj = game.findMap(mapId);
      mapObj.chapters.forEach((ch) => {
        game.player.completeChapter(mapId, ch.id);
        const beast = game.findBeast(ch.rewardBeastId);
        if (beast) game.player.addBeast(beast);
      });
    });

    // Manually set to max level
    game.player.orb = new MagicOrb(game.orbTiers[2]);
    game.player.orb.fill();

    const result = game.tryUpgradeOrb();
    expect(result).toBeNull();
  });
});

describe('章節引數解析', () => {
  const stripMark = (text) => {
    const marks = ['。', '！', '？', '.', '!', '?'];
    const last = text[text.length - 1];
    return marks.includes(last) ? text.slice(0, -1) : text;
  };

  const extractArg = (trimmedText, commandText) => stripMark(
    trimmedText.slice(commandText.length).trim(),
  );

  test('從 trimmedText 中解析出章節 ID', () => {
    expect(extractArg('挑戰 aurora-1。', '挑戰')).toBe('aurora-1');
    expect(extractArg('挑戰 tempest-3。', '挑戰')).toBe('tempest-3');
    expect(extractArg('challenge aurora-1.', 'challenge')).toBe('aurora-1');
  });

  test('無引數時回傳空字串', () => {
    expect(extractArg('挑戰。', '挑戰')).toBe('');
    expect(extractArg('挑戰', '挑戰')).toBe('');
  });
});
