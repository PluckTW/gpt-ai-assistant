import { WORLD_OVERVIEW } from './data.js';

const divider = (label = '') => {
  const line = '='.repeat(40);
  if (!label) return line;
  const padding = Math.max(0, Math.floor((40 - label.length - 2) / 2));
  const left = '='.repeat(padding);
  const right = '='.repeat(40 - padding - label.length - 2);
  return `${left} ${label} ${right}`;
};

const formatList = (items = []) => items.map((item) => `  • ${item}`).join('\n');

export const renderGameEntry = (game) => {
  const orb = game.player.orb;
  const availableMaps = game.getAvailableMaps();
  const mapLines = availableMaps.map((map, index) => (
    `${index + 1}. ${map.name}｜環境：${map.environment}｜章節：${map.chapters.length}`
  ));

  return [
    divider('魔奇獸：冒險序章'),
    WORLD_OVERVIEW,
    '',
    `馴獸師：${game.player.name}`,
    `當前魔法球：${orb.name}（Lv.${orb.level}）`,
    `能量狀態：${orb.renderEnergyBar()}`,
    '',
    '可探索的冒險地圖：',
    formatList(mapLines),
    divider(),
  ].filter(Boolean).join('\n');
};

export const renderCharacterStatus = (player) => {
  const beastLines = player.beasts.length > 0
    ? player.beasts.map((beast) => `${beast.name}｜元素：${beast.element}｜招式：${beast.signatureMove}`)
    : ['尚未收服任何魔奇獸'];

  return [
    divider('角色狀態'),
    `${player.title} ${player.name}`,
    `等級：${player.level}｜累積經驗：${player.experience}`,
    `魔法球：${player.orb.name}（Lv.${player.orb.level}）`,
    `能量：${player.orb.renderEnergyBar()}`,
    '',
    '魔奇獸收藏：',
    formatList(beastLines),
    divider(),
  ].join('\n');
};

export const renderMagicOrbAndInventory = (player) => {
  const { items, materials } = player.inventory.listEntries();
  const itemLines = items.length > 0
    ? items.map(([name, amount]) => `${name} ×${amount}`)
    : ['尚未獲得任何道具'];
  const materialLines = materials.length > 0
    ? materials.map(([name, amount]) => `${name} ×${amount}`)
    : ['尚未獲得任何材料'];

  return [
    divider('魔法球與背包'),
    `魔法球名稱：${player.orb.name}`,
    `描述：${player.orb.description}`,
    `能量條：${player.orb.renderEnergyBar(20)}`,
    '',
    '魔奇獸收藏數：',
    `  ${player.beasts.length} / ${player.orb.maxEnergy}（以目前能量可安全攜帶的數量）`,
    '',
    '道具欄：',
    formatList(itemLines),
    '',
    '素材欄：',
    formatList(materialLines),
    divider(),
  ].join('\n');
};

export const renderChapterSelection = (game, { focusMapId = null } = {}) => {
  const maps = focusMapId
    ? [game.findMap(focusMapId)].filter(Boolean)
    : game.getAvailableMaps();

  if (maps.length === 0) {
    const nextMap = game.getNextLockedMap();
    return [
      divider('章節選擇'),
      '目前尚未解鎖任何地圖，請先完成現有挑戰以充能魔法球。',
      nextMap ? `下一張解鎖地圖：${nextMap.name}（需求魔法球等級：${nextMap.orbLevelRequired}）` : null,
      divider(),
    ].filter(Boolean).join('\n');
  }

  const mapBlocks = maps.map((map) => {
    const progress = map.getProgressSummary(game.player);
    const chapterLines = map.chapters.map((chapter, index) => {
      const isCompleted = game.player.hasCompletedChapter(map.id, chapter.id);
      const mark = isCompleted ? '✔' : '○';
      const boss = chapter.boss ? `｜BOSS：${chapter.boss}` : '';
      return `${mark} ${index + 1}. ${chapter.name}${boss}\n    任務：${chapter.description}\n    獎勵魔奇獸：${chapter.rewardBeastId}`;
    });

    return [
      divider(map.name),
      `環境：${map.environment}`,
      `摘要：${map.summary}`,
      `章節進度：${progress.completedCount}/${progress.total}（${progress.percentage}%）`,
      '',
      chapterLines.join('\n\n'),
    ].join('\n');
  });

  return [
    divider('章節選擇'),
    mapBlocks.join(`\n${'-'.repeat(40)}\n`),
    divider(),
  ].join('\n');
};
