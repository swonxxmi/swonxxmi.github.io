/**
 * 游戏状态管理模块
 */
import GameConstants from '@/constants/GameConstants';
import { reactive } from 'vue';

const ACTIONS = GameConstants.ACTIONS;

export default {
  state: reactive({
    // 技能等级
    levels: {
      [ACTIONS.COLLECT]: 11,
      [ACTIONS.FORGE]: 1,
      [ACTIONS.BUILD]: 1,
      [ACTIONS.INTERACT]: 1,
      [ACTIONS.EXPLORE]: 1,
    },
    
    // 技能经验
    experience: {
      [ACTIONS.COLLECT]: 0,
      [ACTIONS.FORGE]: 0,
      [ACTIONS.BUILD]: 0,
      [ACTIONS.INTERACT]: 0,
      [ACTIONS.EXPLORE]: 0,
    },
    
    // 物品库存
    inventory: {
      [GameConstants.ITEMS.GLASS_SHARD]: 0,
    },
    
    // 装备栏
    equipment: ['无', '无', '无', '无', '无', '无'],
    
    // 动物
    animals: {
      catworm: { cost: 10, production: 1, unlocked: false },
      pigeon: { cost: 20, production: 2, unlocked: false },
      chicken: { cost: 30, production: 3, unlocked: false },
    },
  }),
  
  /**
   * 增加物品到库存
   * @param {String} itemName - 物品名称
   * @param {Number} amount - 数量
   */
  addItemToInventory(itemName, amount) {
    if (!this.state.inventory[itemName]) {
      this.state.inventory[itemName] = 0;
    }
    this.state.inventory[itemName] += amount;
  },
  
  /**
   * 从库存中移除物品
   * @param {String} itemName - 物品名称
   * @param {Number} amount - 数量
   * @returns {Boolean} - 是否成功移除
   */
  removeItemFromInventory(itemName, amount) {
    if (!this.state.inventory[itemName] || this.state.inventory[itemName] < amount) {
      return false;
    }
    this.state.inventory[itemName] -= amount;
    return true;
  },
  
  /**
   * 增加技能经验并升级
   * @param {String} actionType - 技能类型
   * @param {Number} expAmount - 经验量
   */
  gainExperience(actionType, expAmount = 1) {
    if (!(actionType in this.state.experience)) return;
    
    // 使用Vue 3的响应式方式直接修改
    this.state.experience[actionType] += expAmount;
    
    const requiredExp = this.state.levels[actionType] ** 2;
    
    if (this.state.experience[actionType] >= requiredExp) {
      // 直接修改响应式对象
      this.state.levels[actionType] += 1;
      this.state.experience[actionType] -= requiredExp;
    }
  },
  
  /**
   * 装备物品
   * @param {String} itemName - 物品名称
   * @param {Number} slot - 装备槽位
   * @returns {Boolean} - 是否成功装备
   */
  equipItem(itemName, slot = 0) {
    if (slot < 0 || slot >= this.state.equipment.length) return false;
    
    // 检查是否有该物品
    if (!this.state.inventory[itemName] || this.state.inventory[itemName] <= 0) {
      return false;
    }
    
    // 只有第一个槽位可以装备
    if (slot !== 0) return false;
    
    // 装备物品，使用Vue 3的响应式方式
    this.state.equipment[slot] = itemName;
    this.removeItemFromInventory(itemName, 1);
    return true;
  },

  /**
   * 检查物品是否可装备
   * @param {String} itemName - 物品名称
   * @returns {Boolean} - 物品是否可装备
   */
  isEquippable(itemName) {
    // 目前只有玻璃锤可以装备
    return itemName === '玻璃锤';
  },

  /**
   * 检查装备是否已装备
   * @param {String} itemName - 物品名称
   * @returns {Boolean} - 物品是否已装备
   */
  isEquipped(itemName) {
    return this.state.equipment.includes(itemName);
  }
}; 