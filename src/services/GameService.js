/**
 * 游戏服务 - 处理游戏的核心逻辑
 */
import GameConstants from '@/constants/GameConstants';

export default {
  /**
   * 计算基于等级的潜在产出（包含小数）
   * @param {Number} level - 当前技能等级
   * @returns {Number} - 潜在产出数量 (例如 1.2)
   */
  calculatePotentialYield(level) {
    // 确保等级至少为 1
    const effectiveLevel = Math.max(1, level);
    return 1.0 + effectiveLevel * 0.02;
  },

  /**
   * 计算实际获得的物品数量 (执行概率判定)
   * @param {Number} level - 当前技能等级
   * @returns {Number} - 实际获得的整数数量
   */
  calculateCollectionAmount(level) {
    const potentialYield = this.calculatePotentialYield(level);
    const integerPart = Math.floor(potentialYield);
    const decimalPart = potentialYield - integerPart;

    let finalAmount = integerPart;
    if (Math.random() < decimalPart) {
      finalAmount += 1;
    }
    console.log(`[calculateCollectionAmount] Level: ${level}, Potential: ${potentialYield.toFixed(2)}, Final Amount: ${finalAmount}`);
    return finalAmount;
  },

  /**
   * 生成物品或动作的描述文本
   * @param {Object} item - 物品对象
   * @param {Number} level - 玩家对应技能等级
   * @returns {Object} - 物品描述对象
   */
  generateItemDescription(item, level = 1) {
    if (!item || !item.name) {
        return { name: '未知物品', description: '没有找到该物品的信息。' };
    }

    const itemName = item.name;
    let productItem = null; // 产物名称
    let potentialYield = 0; // 潜在产出 (带小数)

    // --- 确定产物和潜在产出 ---
    const actionType = this.getActionTypeFromItemName(itemName); // 需要一个辅助函数
    if (actionType === GameConstants.ACTIONS.COLLECT || actionType === GameConstants.ACTIONS.HUNT) {
        potentialYield = this.calculatePotentialYield(level);
        if (itemName === GameConstants.ITEMS.GLASS_BALL) productItem = GameConstants.ITEMS.GLASS_SHARD;
        else if (itemName === GameConstants.ITEMS.SCARE_PIGEON) productItem = GameConstants.ITEMS.FEATHER;
        else if (itemName === GameConstants.ITEMS.SHAKE_GINKGO) productItem = GameConstants.ITEMS.GINKGO_LEAF;
        else if (itemName === GameConstants.ITEMS.SHEEP) productItem = GameConstants.ITEMS.RAW_MUTTON;
    }

    // --- 定义所有物品的基础描述 --- 
    const descriptions = {
        // --- 采集类 Action Targets ---
        [GameConstants.ITEMS.GLASS_BALL]: {
            name: itemName,
            description: "敲击发光的玻璃球，似乎能获得一些碎片。",
        },
        [GameConstants.ITEMS.SCARE_PIGEON]: {
            name: itemName,
            description: "恐吓这只鸽子，也许会掉下什么。",
        },
        [GameConstants.ITEMS.SHAKE_GINKGO]: {
            name: itemName,
            description: "用力摇晃这棵古老的银杏树。",
        },
        // --- 狩猎类 Action Targets ---
        [GameConstants.ITEMS.SHEEP]: {
            name: itemName,
            description: "追踪并狩猎温顺的绵羊以获取生肉。",
        },
        // --- 锻造类 Action Targets ---
        [GameConstants.ITEMS.GLASS_HAMMER]: {
            name: itemName,
            description: "用玻璃碎片锻造一个简易的锤子。",
            recipe: `需要: ${GameConstants.CONSUMPTION[GameConstants.ITEMS.GLASS_HAMMER]?.[GameConstants.ITEMS.GLASS_SHARD] || '?'} x ${GameConstants.ITEMS.GLASS_SHARD}`,
            effect: "效果: 装备后可减少敲打玻璃球 10% 的时间。",
        },
        // --- 交互类 Action Targets ---
        [GameConstants.ITEMS.BAKA_FREEZER]: {
            name: itemName,
            description: "发出奇怪寒气的装置，需要银杏叶作为某种催化剂。",
            recipe: `需要: ${GameConstants.CONSUMPTION[GameConstants.ITEMS.BAKA_FREEZER]?.[GameConstants.ITEMS.GINKGO_LEAF] || '?'} x ${GameConstants.ITEMS.GINKGO_LEAF}`,
            effect: `效果: 将 1 个 食物转化为 1 个 冰冻食物。`,
            note: "(当前仅支持转化生羊肉)",
        },
        // --- 产物类 Items --- 
        [GameConstants.ITEMS.GLASS_SHARD]: { name: itemName, description: "闪亮的玻璃碎片，可以用于锻造。", type: "材料" },
        [GameConstants.ITEMS.RAW_MUTTON]: { name: itemName, description: "一块新鲜的生羊肉，散发着些微膻味。可以用于烹饪或...冷冻？", type: "材料/食物" },
        [GameConstants.ITEMS.FROZEN_FOOD]: { name: itemName, description: "被神秘装置冰冻的食物，硬邦邦的。也许有什么特殊用途？", type: "食物/特殊物品" },
        [GameConstants.ITEMS.FROZEN_MUTTON]: { name: itemName, description: "被冰冻的羊肉，变成了奇特的胶状。这还能吃吗？", type: "食物/特殊物品" },
        [GameConstants.ITEMS.FEATHER]: { name: itemName, description: "一根轻飘飘的羽毛。", type: "材料" },
        [GameConstants.ITEMS.GINKGO_LEAF]: { name: itemName, description: "一片金黄色的银杏叶，边缘有些卷曲。", type: "材料" },
    };

    // --- 获取基础描述并添加动态信息 --- 
    const baseDescription = { ...(descriptions[itemName] || { name: itemName, description: '这个物品还没有描述信息。' }) }; // 使用扩展语法创建副本

    // 添加简化后的获得信息 (显示一位小数)
    if (productItem && potentialYield > 0) {
        baseDescription.yieldInfo = `${productItem} x${potentialYield.toFixed(1)}`; // 使用 potentialYield 并保留一位小数
    }

    // 确保name字段存在
    baseDescription.name = baseDescription.name || itemName;

    return baseDescription;
  },

  // *** 添加辅助函数：根据物品名判断动作类型 ***
  // (这个逻辑可能已在 GameHome.vue 中存在，但在 Service 中也可能有用来避免重复代码)
  getActionTypeFromItemName(itemName) {
      if ([GameConstants.ITEMS.GLASS_BALL, GameConstants.ITEMS.SCARE_PIGEON, GameConstants.ITEMS.SHAKE_GINKGO].includes(itemName)) {
          return GameConstants.ACTIONS.COLLECT;
      }
      if ([GameConstants.ITEMS.SHEEP].includes(itemName)) {
          return GameConstants.ACTIONS.HUNT;
      }
      if ([GameConstants.ITEMS.GLASS_HAMMER].includes(itemName)) {
          return GameConstants.ACTIONS.FORGE;
      }
      if ([GameConstants.ITEMS.BAKA_FREEZER].includes(itemName)) {
          return GameConstants.ACTIONS.INTERACT;
      }
      return null;
  },
}; 