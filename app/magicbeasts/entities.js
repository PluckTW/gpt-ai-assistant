import { MAGIC_ORB_TIERS, MAGICAL_BEASTS, ADVENTURE_MAPS } from './data.js';

export class MagicalBeast {
  constructor({ id, name, element, habitat, description, signatureMove }) {
    this.id = id;
    this.name = name;
    this.element = element;
    this.habitat = habitat;
    this.description = description;
    this.signatureMove = signatureMove;
  }
}

export class Chapter {
  constructor({ id, name, description, boss, rewardBeastId }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.boss = boss;
    this.rewardBeastId = rewardBeastId;
  }
}

export class AdventureMap {
  constructor({ id, name, orbLevelRequired, environment, summary, chapters = [] }) {
    this.id = id;
    this.name = name;
    this.orbLevelRequired = orbLevelRequired;
    this.environment = environment;
    this.summary = summary;
    this.chapters = chapters.map((chapter) => new Chapter(chapter));
  }

  isUnlockedBy(orbLevel) {
    return orbLevel >= this.orbLevelRequired;
  }

  getChapter(chapterId) {
    return this.chapters.find((chapter) => chapter.id === chapterId) || null;
  }

  isCompletedBy(player) {
    const completed = player.completedChapters.get(this.id);
    return Boolean(completed) && completed.size >= this.chapters.length;
  }

  getProgressSummary(player) {
    const completed = player.completedChapters.get(this.id);
    const completedCount = completed ? completed.size : 0;
    return {
      completedCount,
      total: this.chapters.length,
      percentage: Math.round((completedCount / this.chapters.length) * 100),
    };
  }
}

export class MagicOrb {
  constructor({ level, name, maxEnergy, description }) {
    this.level = level;
    this.name = name;
    this.maxEnergy = maxEnergy;
    this.description = description;
    this.energy = 0;
  }

  get energyRatio() {
    if (this.maxEnergy === 0) return 0;
    return this.energy / this.maxEnergy;
  }

  isCharged() {
    return this.energy >= this.maxEnergy;
  }

  charge(amount = 1) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    return this;
  }

  fill() {
    this.energy = this.maxEnergy;
    return this;
  }

  spendEnergy(amount = 1) {
    this.energy = Math.max(0, this.energy - amount);
    return this;
  }

  renderEnergyBar(width = 10) {
    const filledUnits = Math.round(this.energyRatio * width);
    const filled = '■'.repeat(filledUnits);
    const empty = '□'.repeat(Math.max(0, width - filledUnits));
    const percentage = Math.round(this.energyRatio * 100);
    return `[${filled}${empty}] ${percentage}% (${this.energy}/${this.maxEnergy})`;
  }
}

export class Inventory {
  constructor({ items = new Map(), materials = new Map() } = {}) {
    this.items = new Map(items);
    this.materials = new Map(materials);
  }

  addItem(name, amount = 1) {
    const current = this.items.get(name) || 0;
    this.items.set(name, current + amount);
    return this;
  }

  addMaterial(name, amount = 1) {
    const current = this.materials.get(name) || 0;
    this.materials.set(name, current + amount);
    return this;
  }

  listEntries() {
    return {
      items: Array.from(this.items.entries()),
      materials: Array.from(this.materials.entries()),
    };
  }
}

export class Player {
  constructor({
    name,
    orb,
    beasts = [],
    inventory = new Inventory(),
    level = 1,
    title = '新手馴獸師',
    experience = 0,
  }) {
    this.name = name;
    this.orb = orb;
    this.beasts = beasts;
    this.inventory = inventory;
    this.level = level;
    this.title = title;
    this.experience = experience;
    this.completedChapters = new Map();
  }

  addBeast(beast) {
    if (!this.hasBeast(beast.id)) {
      this.beasts = [...this.beasts, beast];
    }
    return this;
  }

  hasBeast(beastId) {
    return this.beasts.some((beast) => beast.id === beastId);
  }

  completeChapter(mapId, chapterId) {
    if (!this.completedChapters.has(mapId)) {
      this.completedChapters.set(mapId, new Set());
    }
    this.completedChapters.get(mapId).add(chapterId);
    return this;
  }

  hasCompletedChapter(mapId, chapterId) {
    return this.completedChapters.has(mapId)
      && this.completedChapters.get(mapId).has(chapterId);
  }

  hasCompletedMap(mapId, totalChapters) {
    const completed = this.completedChapters.get(mapId);
    return completed ? completed.size >= totalChapters : false;
  }

  gainExperience(amount) {
    this.experience += amount;
    return this;
  }
}

export class Game {
  constructor({ playerName = '旅者' } = {}) {
    this.orbTiers = MAGIC_ORB_TIERS.map((tier) => ({ ...tier }));
    this.beastCatalog = new Map(
      MAGICAL_BEASTS.map((beast) => [beast.id, new MagicalBeast(beast)]),
    );
    this.maps = ADVENTURE_MAPS.map((map) => new AdventureMap(map));

    this.player = new Player({
      name: playerName,
      orb: new MagicOrb(this.orbTiers[0]),
    });
  }

  getAvailableMaps() {
    return this.maps.filter((map) => map.isUnlockedBy(this.player.orb.level));
  }

  findMap(mapId) {
    return this.maps.find((map) => map.id === mapId) || null;
  }

  findBeast(beastId) {
    return this.beastCatalog.get(beastId) || null;
  }

  completeChapter(mapId, chapterId) {
    const map = this.findMap(mapId);
    if (!map) {
      throw new Error(`找不到地圖 ${mapId}`);
    }

    const chapter = map.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`找不到章節 ${chapterId}`);
    }

    this.player.completeChapter(mapId, chapterId);

    const rewardBeast = this.findBeast(chapter.rewardBeastId);
    if (rewardBeast) {
      this.player.addBeast(rewardBeast);
    }

    if (map.isCompletedBy(this.player)) {
      this.player.orb.fill();
    } else {
      this.player.orb.charge();
    }

    return {
      map,
      chapter,
      rewardBeast,
    };
  }

  tryUpgradeOrb() {
    const currentIndex = this.orbTiers.findIndex(
      (tier) => tier.level === this.player.orb.level,
    );

    if (currentIndex === -1) {
      throw new Error('玩家的魔法球等級無效');
    }

    const nextTier = this.orbTiers[currentIndex + 1];
    if (!nextTier) {
      return null;
    }

    if (!this.player.orb.isCharged()) {
      return null;
    }

    this.player.orb = new MagicOrb(nextTier);
    return this.player.orb;
  }

  getNextLockedMap() {
    return this.maps.find((map) => map.orbLevelRequired === this.player.orb.level + 1) || null;
  }

  getBeastCollection() {
    return this.player.beasts.map((beast) => ({
      id: beast.id,
      name: beast.name,
      element: beast.element,
      signatureMove: beast.signatureMove,
    }));
  }
}
