import { getOrCreateGame, setGame } from '../repository/game.js';
import { renderGameEntry, renderCharacterStatus, renderChapterSelection } from '../magicbeasts/index.js';
import {
  COMMAND_GAME_ENTER,
  COMMAND_GAME_STATUS,
  COMMAND_GAME_MAP,
  COMMAND_GAME_CHALLENGE,
  COMMAND_GAME_UPGRADE,
} from '../commands/index.js';
import Context from '../context.js';

const MARKS = ['。', '！', '？', '.', '!', '?'];

const stripMark = (text) => {
  const last = text[text.length - 1];
  return MARKS.includes(last) ? text.slice(0, -1) : text;
};

/**
 * Extract chapter id from text like "挑戰 aurora-1。" → "aurora-1"
 * @param {string} trimmedText
 * @param {string} commandText
 * @returns {string}
 */
const extractArg = (trimmedText, commandText) => stripMark(
  trimmedText.slice(commandText.length).trim(),
);

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => (
  context.hasCommand(COMMAND_GAME_UPGRADE)
  || context.hasCommand(COMMAND_GAME_STATUS)
  || context.hasCommand(COMMAND_GAME_MAP)
  || context.hasCommand(COMMAND_GAME_CHALLENGE)
  || context.hasCommand(COMMAND_GAME_ENTER)
);

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = (context) => check(context) && (
  async () => {
    const playerName = context.source.name || '旅者';
    const game = getOrCreateGame(context.userId, playerName);

    try {
      if (context.hasCommand(COMMAND_GAME_UPGRADE)) {
        const newOrb = game.tryUpgradeOrb();
        if (!newOrb) {
          if (!game.player.orb.isCharged()) {
            const bar = game.player.orb.renderEnergyBar();
            context.pushText(`魔法球尚未充滿能量，無法升級。\n目前能量：${bar}`);
          } else {
            context.pushText('你的魔法球已達最高等級，傳說中的道路已向你敞開！');
          }
        } else {
          await setGame(context.userId, game);
          const unlockedMap = game.maps.find((m) => m.orbLevelRequired === newOrb.level);
          const mapLine = unlockedMap ? `\n✨ 新地圖解鎖：${unlockedMap.name}` : '';
          context.pushText(
            `🌟 魔法球升級成功！\n新魔法球：${newOrb.name}（Lv.${newOrb.level}）\n${newOrb.description}${mapLine}`,
            [COMMAND_GAME_MAP],
          );
        }
      } else if (context.hasCommand(COMMAND_GAME_STATUS)) {
        context.pushText(renderCharacterStatus(game.player), [
          COMMAND_GAME_MAP,
          COMMAND_GAME_UPGRADE,
        ]);
      } else if (context.hasCommand(COMMAND_GAME_MAP)) {
        context.pushText(renderChapterSelection(game), [COMMAND_GAME_STATUS]);
      } else if (context.hasCommand(COMMAND_GAME_CHALLENGE)) {
        const chapterId = extractArg(
          context.trimmedText,
          COMMAND_GAME_CHALLENGE.text,
        );

        if (!chapterId) {
          context.pushText('請輸入「挑戰 章節ID」來開始挑戰，例如：挑戰 aurora-1', [COMMAND_GAME_MAP]);
          return context;
        }

        let found = null;
        for (const map of game.maps) {
          const chapter = map.getChapter(chapterId);
          if (chapter && map.isUnlockedBy(game.player.orb.level)) {
            found = { map, chapter };
            break;
          }
        }

        if (!found) {
          context.pushText(`找不到章節「${chapterId}」，或該章節尚未解鎖。`, [COMMAND_GAME_MAP]);
          return context;
        }

        if (game.player.hasCompletedChapter(found.map.id, found.chapter.id)) {
          context.pushText(`章節「${found.chapter.name}」已完成！請挑戰其他章節。`, [COMMAND_GAME_MAP]);
          return context;
        }

        const { chapter, map } = found;
        const result = game.completeChapter(map.id, chapter.id);
        await setGame(context.userId, game);

        const rewardLine = result.rewardBeast
          ? `\n🎉 獲得魔奇獸：${result.rewardBeast.name}（${result.rewardBeast.element}系｜招式：${result.rewardBeast.signatureMove}）`
          : '';

        const orbBar = game.player.orb.renderEnergyBar();
        const charged = game.player.orb.isCharged();
        const chargeLine = charged
          ? '\n⚡ 魔法球已充滿能量！輸入「/game 升級」解鎖新地圖！'
          : `\n魔法球能量：${orbBar}`;

        context.pushText(
          `⚔️ 挑戰「${chapter.name}」成功！\nBOSS：${chapter.boss} 已被馴服${rewardLine}${chargeLine}`,
          charged ? [COMMAND_GAME_UPGRADE, COMMAND_GAME_MAP] : [COMMAND_GAME_MAP, COMMAND_GAME_STATUS],
        );
      } else {
        // COMMAND_GAME_ENTER
        await setGame(context.userId, game);
        context.pushText(renderGameEntry(game), [
          COMMAND_GAME_MAP,
          COMMAND_GAME_STATUS,
        ]);
      }
    } catch (err) {
      context.pushError(err);
    }

    return context;
  }
)();

export default exec;
