/**
 * 游戏常量
 */
import AlumImage from '@/assets/Alum.jpg';
import GlassSwordImage from '@/assets/Glass_Hammer.png';
import PigeonImage from '@/assets/gezhe.jpg';
import GinkgoImage from '@/assets/ginkgo_leaf.png';
import SheepImage from '@/assets/Sheep.png';
import BakaImage from '@/assets/baka.jpg';

export default {
  // 行为类型
  ACTIONS: {
    COLLECT: '采集',
    HUNT: '狩猎',
    FORGE: '锻造',
    INTERACT: '交互',
    EXPLORE: '探索'
  },
  
  // 物品类型
  ITEMS: {
    GLASS_BALL: '敲打玻璃球',
    SCARE_PIGEON: '恐吓鸽子',
    SHAKE_GINKGO: '摇晃银杏',
    GLASS_SHARD: '玻璃碎片',
    FEATHER: '羽毛',
    GINKGO_LEAF: '银杏叶',
    SHEEP: '狩猎绵羊',
    RAW_MUTTON: '生羊肉',
    GLASS_HAMMER: '玻璃锤',
    BAKA_FREEZER: '使用冰冻装置',
    FROZEN_FOOD: '冰冻食物',
    FROZEN_MUTTON: '冰冻羊羹',
  },
  
  // 行为时间（秒）
  ACTION_TIMES: {
    COLLECT: 2,
    HUNT: 8,
    FORGE: 5,
    INTERACT: 3,
    SCARE_PIGEON: 3,
    SHAKE_GINKGO: 4,
    EXPLORE: 6
  },
  
  // 物品消耗量 (用于制作等)
  CONSUMPTION: {
    // 制作玻璃锤需要 5 个玻璃碎片
    '玻璃锤': { 
      '玻璃碎片': 5 
    },
    // 使用冰冻装置需要 1 个银杏叶 (作为催化剂消耗)
    '使用冰冻装置': {
      '银杏叶': 1 
    },
    // 可以添加其他配方，例如：
    // [GameConstants.ITEMS.烤羊排]: {
    //   [GameConstants.ITEMS.RAW_MUTTON]: 1,
    //   [GameConstants.ITEMS.香料]: 1
    // }
    // 移除之前的错误结构
    // GLASS_HAMMER: 5,
    // GLASS_SHARD: 10
  },
  
  ITEM_IMAGES: {
    '敲打玻璃球': AlumImage,
    '恐吓鸽子': PigeonImage,
    '摇晃银杏': GinkgoImage,
    '狩猎绵羊': SheepImage,
    '玻璃锤': GlassSwordImage,
    '使用冰冻装置': BakaImage,
  },
  
  EQUIPMENT_SLOTS: [
    '武器', '工具', '头部', '身体', '腿部', '脚部'
  ],
  getItemImage(itemName) {
    return this.ITEM_IMAGES[itemName] || null;
  },
  // 新增：可装备物品列表
  EQUIPPABLE_ITEMS: [
      '玻璃锤', // 使用字符串名称
      // 未来可以添加其他装备，例如 '铁镐', '狩猎手套' 等
  ],
}; 