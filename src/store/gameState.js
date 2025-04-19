/**
 * 游戏状态管理模块
 */
import GameConstants from '@/constants/GameConstants';
import { reactive } from 'vue';

const ACTIONS = GameConstants.ACTIONS;

// 初始状态
const initialState = () => ({
  levels: {
    [ACTIONS.COLLECT]: 1,
    [ACTIONS.FORGE]: 1,
    [ACTIONS.HUNT]: 1,
    [ACTIONS.INTERACT]: 1,
    [ACTIONS.EXPLORE]: 1,
  },
  experience: {
    [ACTIONS.COLLECT]: 0,
    [ACTIONS.FORGE]: 0,
    [ACTIONS.HUNT]: 0,
    [ACTIONS.INTERACT]: 0,
    [ACTIONS.EXPLORE]: 0,
  },
  inventory: {
    [GameConstants.ITEMS.GLASS_SHARD]: 0,
  },
  equipment: {
    ...Object.fromEntries(GameConstants.EQUIPMENT_SLOTS.map(slot => [slot, null])),
  },
  animals: {
    catworm: { cost: 10, production: 1, unlocked: false },
    pigeon: { cost: 20, production: 2, unlocked: false },
    chicken: { cost: 30, production: 3, unlocked: false },
  },
  buffs: {},
  dewCollectionTimestamps: [], // 新增：存储露珠采集时间戳
});

const LEVEL_UP_BASE_XP = 4;
const LEVEL_UP_FACTOR = 1.4;
const MAX_DEW_COLLECTIONS_PER_HOUR = 8; // CORRECT constant is here, outside export

export default {
  state: initialState(),
  
  /**
   * 重置状态为初始状态
   */
  resetState() {
    this.state = initialState();
    // 确保重置时也清空时间戳
    this.state.dewCollectionTimestamps = []; 
    console.log("Game state reset to initial values.");
  },
  
  /**
   * 确保所有在 GameConstants.ACTIONS 中定义的技能都在 state 中初始化
   */
  initializeNewSkills() {
    const actions = Object.values(ACTIONS);
    let updated = false;
    actions.forEach(action => {
        if (!(action in this.state.levels)) {
            this.state.levels[action] = 1;
            updated = true;
        }
        if (!(action in this.state.experience)) {
            this.state.experience[action] = 0;
            updated = true;
        }
    });
    if (updated) {
        console.log("Initialized new skills in gameState.");
    }
    // 初始化或加载后，清理过期的露珠时间戳
    this.cleanupDewTimestamps(); 
  },
  
  /**
   * 向物品栏添加物品
   * @param {String} itemName - 物品名称
   * @param {Number} amount - 数量
   */
  addItemToInventory(itemName, amount) {
    if (!itemName || amount <= 0) return;
    if (this.state.inventory[itemName]) {
      this.state.inventory[itemName] += amount;
    } else {
      this.state.inventory[itemName] = amount;
    }
    console.log(`Added ${amount} ${itemName} to inventory. New total: ${this.state.inventory[itemName]}`);
  },
  
  /**
   * 从物品栏移除物品
   * @param {String} itemName - 物品名称
   * @param {Number} amount - 数量
   * @returns {Boolean} - 是否成功移除
   */
  removeItemFromInventory(itemName, amount) {
    if (!itemName || amount <= 0 || !this.state.inventory[itemName]) return false;
    if (this.state.inventory[itemName] >= amount) {
      this.state.inventory[itemName] -= amount;
      if (this.state.inventory[itemName] === 0) {
        delete this.state.inventory[itemName];
      }
      console.log(`Removed ${amount} ${itemName} from inventory. Remaining: ${this.state.inventory[itemName] || 0}`);
      return true;
    } else {
      console.warn(`Failed to remove ${amount} ${itemName}, only have ${this.state.inventory[itemName]}`);
      return false;
    }
  },
  
  /**
   * 获取物品数量
   * @param {String} itemName - 物品名称
   * @returns {Number} - 物品数量
   */
  getItemCount(itemName) {
    return this.state.inventory[itemName] || 0;
  },
  
  /**
   * 获得经验值并处理升级
   * @param {String} actionType - 技能类型
   * @param {Number} amount - 经验量
   */
  gainExperience(actionType, amount) {
    // 添加更严格的检查
    if (!actionType || typeof actionType !== 'string' || amount <= 0) {
      console.warn(`[gainExperience] Invalid parameters: actionType=${actionType}, amount=${amount}`);
      return;
    }
    // 确保经验和等级状态已初始化 (防御性编程)
    if (typeof this.state.experience[actionType] === 'undefined') {
      console.warn(`[gainExperience] Experience for ${actionType} was undefined. Initializing to 0.`);
      this.state.experience[actionType] = 0;
    }
    if (typeof this.state.levels[actionType] === 'undefined') {
      console.warn(`[gainExperience] Level for ${actionType} was undefined. Initializing to 1.`);
      this.state.levels[actionType] = 1;
    }

    this.state.experience[actionType] += amount;
    console.log(`[gainExperience] Gained ${amount} XP for ${actionType}. Total XP: ${this.state.experience[actionType]}`);

    this.checkLevelUp(actionType);
  },
  
  /**
   * 计算升级所需的经验值
   * @param {Number} level - 当前等级
   * @returns {Number} - 升级所需的经验值
   */
  calculateXPForNextLevel(level) {
    // Ensure level is at least 1 for calculation
    const effectiveLevel = Math.max(1, level);
    return Math.floor(LEVEL_UP_BASE_XP * Math.pow(LEVEL_UP_FACTOR, effectiveLevel - 1));
  },
  
  /**
   * 检查并处理升级
   * @param {String} actionType - 技能类型
   */
  checkLevelUp(actionType) {
    // 确保技能和状态存在
    if (!(actionType in this.state.levels) || !(actionType in this.state.experience)) {
        console.error(`[checkLevelUp] Missing level or experience state for ${actionType}`);
        return;
    }

    const currentLevel = this.state.levels[actionType];
    const currentXP = this.state.experience[actionType];
    const xpForNextLevel = this.calculateXPForNextLevel(currentLevel);

    // 添加日志，显示检查时的状态
    console.log(`[checkLevelUp] Checking ${actionType}: Level ${currentLevel}, XP ${currentXP} / ${xpForNextLevel}`);

    if (currentXP >= xpForNextLevel) {
      this.state.levels[actionType]++;
      // 保留溢出经验值
      this.state.experience[actionType] -= xpForNextLevel;
      // 确保经验不会变成负数 (虽然理论上不应该)
      if(this.state.experience[actionType] < 0) {
          console.warn(`[checkLevelUp] Negative XP detected after level up for ${actionType}. Resetting to 0.`);
          this.state.experience[actionType] = 0;
      }

      // 使用 %c 添加醒目的升级日志
      console.log(`%c[checkLevelUp] ${actionType} leveled up to level ${this.state.levels[actionType]}! Remaining XP: ${this.state.experience[actionType]}`, 'color: green; font-weight: bold;');
      
      // 触发 Vue 更新 (如果需要，虽然直接修改 state 应该能触发)
      // import { nextTick } from 'vue'; nextTick(() => { /* force update? */ });

      // 递归检查，防止一次性升多级漏掉
      this.checkLevelUp(actionType);
    }
  },
  
  /**
   * 装备物品
   * @param {String} itemName - 物品名称
   * @returns {Boolean} - 是否成功装备
   */
  equipItem(itemName) {
    let targetSlot = null;

    // 根据物品确定装备槽位
    if (itemName === GameConstants.ITEMS.PIGEON_GUN) {
      targetSlot = '武器';
    } else if (itemName === GameConstants.ITEMS.GLASS_HAMMER) {
      targetSlot = '工具';
    } else if (itemName === GameConstants.ITEMS.FEATHER_HELMET) {
      targetSlot = '头部';
    }

    if (!targetSlot || !this.state.equipment.hasOwnProperty(targetSlot)) {
      console.warn(`Cannot equip ${itemName}, invalid slot ${targetSlot}.`);
      return false;
    }

    if (this.getItemCount(itemName) <= 0) {
      console.warn(`Cannot equip ${itemName}, not found in inventory.`);
      return false;
    }

    const currentItem = this.state.equipment[targetSlot];
    if (currentItem) {
      this.unequipItem(targetSlot);
    }

    if (this.removeItemFromInventory(itemName, 1)) {
      this.state.equipment[targetSlot] = itemName;
      console.log(`Equipped ${itemName} to ${targetSlot}.`);
      return true;
    } else {
      console.error(`Failed to remove ${itemName} from inventory during equip.`);
      return false;
    }
  },
  
  /**
   * 卸下指定槽位的物品
   * @param {String} slotName - 槽位名称
   * @returns {Boolean} - 是否成功卸下
   */
  unequipItem(slotName) {
    if (!this.state.equipment.hasOwnProperty(slotName)) return false;

    const equippedItem = this.state.equipment[slotName];
    if (equippedItem) {
      this.addItemToInventory(equippedItem, 1);
      this.state.equipment[slotName] = null;
      console.log(`Unequipped ${equippedItem} from ${slotName}.`);
      return true;
    }
    return false;
  },
  
  /**
   * 检查物品是否已装备
   * @param {String} itemName - 物品名称
   * @returns {Boolean} - 物品是否已装备
   */
  isEquipped(itemName) {
    return Object.values(this.state.equipment).includes(itemName);
  },

  // <<< 新增/修改：判断物品是否可装备 >>>
  isEquippable(itemName) {
      // 检查 GameConstants 是否定义了可装备列表，并且 itemName 在列表中
      return GameConstants.EQUIPPABLE_ITEMS && GameConstants.EQUIPPABLE_ITEMS.includes(itemName);
  },

  addBuff(buffName, buffEffect) {
    if (!this.state.buffs[buffName]) {
      this.state.buffs[buffName] = {
        effect: buffEffect,
        permanent: true  // 设置为永久buff
      };
      console.log(`[GameState] Added buff: ${buffName} with effect: ${buffEffect}`);
    }
  },

  // --- 新增：露珠采集限制相关方法 ---
  
  /**
   * 清理过期的露珠采集时间戳（不在当前小时内的）
   */
  cleanupDewTimestamps() {
    const now = new Date();
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const currentHourStartTime = currentHourStart.getTime();
    
    // 确保 state.dewCollectionTimestamps 是数组
    if (!Array.isArray(this.state.dewCollectionTimestamps)) {
        console.warn("[cleanupDewTimestamps] state.dewCollectionTimestamps was not an array, resetting.");
        this.state.dewCollectionTimestamps = [];
    }
    
    const initialTimestamps = [...this.state.dewCollectionTimestamps]; // Log initial state
    const initialLength = initialTimestamps.length;

    this.state.dewCollectionTimestamps = this.state.dewCollectionTimestamps.filter(timestamp => {
      const isValid = typeof timestamp === 'number' && timestamp >= currentHourStartTime;
      // Log timestamps being filtered out
      // if (!isValid) { 
      //   console.log(`[cleanupDewTimestamps] Filtering out timestamp: ${new Date(timestamp).toLocaleString()} (Before ${currentHourStart.toLocaleString()})`);
      // }
      return isValid;
    });

    // Log if changes were made
    if (initialLength !== this.state.dewCollectionTimestamps.length) {
        console.log(`[cleanupDewTimestamps] Before: ${initialLength} timestamps. After: ${this.state.dewCollectionTimestamps.length} timestamps.`);
        // console.log("[cleanupDewTimestamps] Current timestamps:", this.state.dewCollectionTimestamps.map(ts => new Date(ts).toLocaleTimeString()));
    }
  },

  /**
   * 检查当前是否可以采集露珠
   * @returns {Boolean}
   */
  canCollectDew() {
    this.cleanupDewTimestamps(); // 确保检查前数据是最新的
    const currentCount = this.state.dewCollectionTimestamps.length;
    const limit = MAX_DEW_COLLECTIONS_PER_HOUR;
    const canCollect = currentCount < limit;
    console.log(`[canCollectDew] Check: Count=${currentCount}, Limit=${limit}, CanCollect=${canCollect}`);
    return canCollect;
  },

  /**
   * 记录一次露珠采集
   */
  recordDewCollection() {
    const canCollect = this.canCollectDew(); // Call canCollectDew first (it includes cleanup)
    console.log(`[recordDewCollection] Attempting to record. canCollectDew returned: ${canCollect}`);
    if (canCollect) {
        const beforeTimestamps = [...this.state.dewCollectionTimestamps];
        this.state.dewCollectionTimestamps.push(Date.now());
        console.log(`[recordDewCollection] Success. Count before: ${beforeTimestamps.length}, Count after: ${this.state.dewCollectionTimestamps.length}/${MAX_DEW_COLLECTIONS_PER_HOUR}`);
        // console.log("[recordDewCollection] Current timestamps:", this.state.dewCollectionTimestamps.map(ts => new Date(ts).toLocaleTimeString()));
    } else {
      console.warn(`[recordDewCollection] Failed. Limit reached. Current count: ${this.state.dewCollectionTimestamps.length}`);
    }
  },

  /**
   * 获取当前小时内已采集的次数
   * @returns {Number}
   */
  getDewCollectionsThisHour() {
    this.cleanupDewTimestamps(); // 获取前清理确保准确
    return this.state.dewCollectionTimestamps.length;
  },

  /**
   * 获取每小时最大采集次数
   * @returns {Number}
   */
  getMaxDewCollectionsPerHour() {
    // 直接从常量返回
    return MAX_DEW_COLLECTIONS_PER_HOUR; // Use constant directly
  },

  /**
   * 获取距离下一个整点（露珠采集次数刷新）还有多少分钟
   * @returns {Number} 分钟数
   */
  getMinutesUntilNextDewCollectionAllowed() {
    // 不需要 this
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); // 设置为下一个小时的 0 分 0 秒
    const diffMs = nextHour.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60)); // 向上取整分钟数
  },

  // --- 结束：露珠采集限制相关方法 ---
}; 