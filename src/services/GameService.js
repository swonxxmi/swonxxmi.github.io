/**
 * 游戏服务 - 处理游戏的核心逻辑
 */
import GameConstants from '@/constants/GameConstants';

export default {
  /**
   * 计算采集获得的物品数量
   * @param {Number} level - 当前技能等级
   * @returns {Number} - 实际获得的物品数量
   */
  calculateCollectionAmount(level) {
    const baseAmount = 1.0;
    const additionalAmount = level * 0.02;
    const totalAmount = baseAmount + additionalAmount;

    // 获取整数部分和小数部分
    const integerPart = Math.floor(totalAmount);
    const decimalPart = totalAmount - integerPart;

    // 根据小数部分决定最终获得的数量
    let finalAmount = integerPart; 
    if (Math.random() < decimalPart) {
      finalAmount += 1; // 根据小数部分的概率增加1
    }
    
    return finalAmount;
  },

  /**
   * 计算下一级所需经验
   * @param {Number} level - 当前等级
   * @returns {Number} - 所需经验值
   */
  calculateRequiredExperience(level) {
    return level ** 2;
  },

  /**
   * 生成物品描述
   * @param {Object} item - 物品对象
   * @param {Number} level - 玩家对应技能等级
   * @returns {Object} - 物品描述对象
   */
  generateItemDescription(item, level = 1) {
    if (item.name === GameConstants.ITEMS.GLASS_HAMMER) {
      return {
        title: '物品：玻璃锤',
        type: GameConstants.ACTIONS.FORGE,
        time: `${GameConstants.ACTION_TIMES.FORGE} 秒`,
        cost: '锻造玻璃碎片，铸成玻璃锤。',
        reward: GameConstants.ITEMS.GLASS_HAMMER,
        consumption: `消耗：${GameConstants.ITEMS.GLASS_SHARD}*${GameConstants.CONSUMPTION.GLASS_HAMMER}`
      };
    } else if (item.name === GameConstants.ITEMS.GLASS_BALL) {
      const baseAmount = 1.0;
      const additionalAmount = level * 0.02;
      const totalAmount = baseAmount + additionalAmount;
      
      return {
        title: `行为：${item.name}`,
        type: GameConstants.ACTIONS.COLLECT,
        time: `${GameConstants.ACTION_TIMES.COLLECT} 秒`,
        cost: '敲响玻璃，碎片闪耀！',
        reward: `${GameConstants.ITEMS.GLASS_SHARD}* ${totalAmount.toFixed(1)}`
      };
    } else if (item.name === GameConstants.ITEMS.SCARE_PIGEON) {
      const baseAmount = 1.0;
      const additionalAmount = level * 0.02;
      const totalAmount = baseAmount + additionalAmount;
      
      return {
        title: `行为：${item.name}`,
        type: GameConstants.ACTIONS.COLLECT,
        time: `${GameConstants.ACTION_TIMES.SCARE_PIGEON} 秒`,
        cost: '突袭鸽群，羽毛乱飞！',  
        reward: `羽毛* ${totalAmount.toFixed(1)}`
      };
    } else if (item.name === GameConstants.ITEMS.SHAKE_GINKGO) {
      const baseAmount = 1.0;
      const additionalAmount = level * 0.02;
      const totalAmount = baseAmount + additionalAmount;
      
      return {
        title: `行为：${item.name}`,
        type: GameConstants.ACTIONS.COLLECT,
        time: `${GameConstants.ACTION_TIMES.SHAKE_GINKGO} 秒`,
        cost: '轻摇银杏，金叶飘趣！',
        reward: `银杏叶* ${totalAmount.toFixed(1)}`
      };
    }
    
    return {};
  }
}; 