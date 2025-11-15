import {
  describe,
  expect,
  test,
} from '@jest/globals';
import {
  Game,
  MAGIC_ORB_TIERS,
  ADVENTURE_MAPS,
  MAGICAL_BEASTS,
  renderGameEntry,
  renderCharacterStatus,
  renderMagicOrbAndInventory,
  renderChapterSelection,
} from '../app/magicbeasts/index.js';

describe('魔奇獸世界資料定義', () => {
  test('應該擁有三個魔法球等級與三張地圖', () => {
    expect(MAGIC_ORB_TIERS).toHaveLength(3);
    expect(ADVENTURE_MAPS).toHaveLength(3);
  });

  test('總共有十五隻可馴化的魔奇獸', () => {
    expect(MAGICAL_BEASTS).toHaveLength(15);
  });
});

describe('魔奇獸遊戲框架', () => {
  test('建立新遊戲時應符合設定的世界觀', () => {
    const game = new Game({ playerName: '測試旅者' });
    expect(game.player.name).toBe('測試旅者');
    expect(game.player.orb.level).toBe(1);
    expect(game.maps).toHaveLength(3);
    expect(game.getAvailableMaps().map((map) => map.id)).toEqual(['aurora-wilds']);
  });

  test('完成整張地圖後魔法球會充能並解鎖下一張地圖', () => {
    const game = new Game();
    const firstMap = game.findMap('aurora-wilds');
    firstMap.chapters.forEach((chapter) => {
      game.completeChapter(firstMap.id, chapter.id);
    });

    expect(game.player.beasts).toHaveLength(firstMap.chapters.length);
    expect(game.player.orb.isCharged()).toBe(true);

    const upgraded = game.tryUpgradeOrb();
    expect(upgraded).not.toBeNull();
    expect(upgraded.level).toBe(2);
    expect(game.getAvailableMaps().map((map) => map.id)).toEqual(['aurora-wilds', 'tempest-archipelago']);
  });
});

describe('魔奇獸介面渲染', () => {
  test('遊戲進入畫面顯示玩家資訊與世界觀', () => {
    const game = new Game({ playerName: '星語' });
    const entryScreen = renderGameEntry(game);
    expect(entryScreen).toContain('魔奇獸');
    expect(entryScreen).toContain('星語');
    expect(entryScreen).toContain('初始魔法球');
  });

  test('角色狀態畫面顯示收藏與等級資訊', () => {
    const game = new Game({ playerName: '星語' });
    const status = renderCharacterStatus(game.player);
    expect(status).toContain('角色狀態');
    expect(status).toContain('尚未收服任何魔奇獸');
  });

  test('魔法球與背包畫面顯示能量條與空背包狀態', () => {
    const game = new Game();
    const inventoryView = renderMagicOrbAndInventory(game.player);
    expect(inventoryView).toContain('魔法球與背包');
    expect(inventoryView).toContain('尚未獲得任何道具');
    expect(inventoryView).toContain('尚未獲得任何材料');
  });

  test('章節地圖畫面會顯示章節進度與boss', () => {
    const game = new Game();
    const chapterScreen = renderChapterSelection(game);
    expect(chapterScreen).toContain('章節選擇');
    expect(chapterScreen).toContain('晨曦原野');
    expect(chapterScreen).toContain('雷鳴終章');
    expect(chapterScreen).toContain('雷角鹿');
  });
});
