/**
 * 游戏常量
 */
import AlumImage from '@/assets/Alum.jpg';
import GlassSwordImage from '@/assets/Glass_Hammer.png';
import PigeonImage from '@/assets/gezhe.jpg';
import GinkgoImage from '@/assets/ginkgo_leaf.png';
import SheepImage from '@/assets/Sheep.png';
import BakaImage from '@/assets/baka.jpg';
import PigeonGunImage from '@/assets/PigeonGun.png';
import FeatherHelmetImage from '@/assets/Feather_Helmet.png';

export default {
  // 行为类型
  ACTIONS: {
    COLLECT: '采集',
    HUNT: '狩猎',
    FORGE: '锻造',
    INTERACT: '交互',
    EXPLORE: '探索',
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
    PIGEON_GUN: '羽毛枪',
    FEATHER_HELMET: '羽毛帽',
    MINE_CRYSTAL: '挖掘水晶',
    CRYSTAL_SHARD: '水晶碎片',
    HARVEST_HERB: '采摘草药',
    MAGIC_HERB: '魔法草药',
    CATCH_BUTTERFLY: '捕捉蝴蝶',
    BUTTERFLY_WING: '蝴蝶之翼',
    BUTTERFLY_CLOAK: '蝴蝶披风',
    RARE_HERB: '稀有草药',
    SING_A_SONG: '把麦开开',
  },
  
  // 行为时间（秒）
  ACTION_TIMES: {
    COLLECT: 2,
    HUNT: 8,
    FORGE: 5,
    INTERACT: 3,
    SCARE_PIGEON: 3,
    SHAKE_GINKGO: 4,
    EXPLORE: 6,
    FORGE_PIGEON_GUN: 12,    // 制作羽毛枪需要更长时间
    FORGE_FEATHER_HELMET: 8,  // 制作羽毛帽的时间
    MINE_CRYSTAL: 5,
    HARVEST_HERB: 3,
    CATCH_BUTTERFLY: 4,
    SING_A_SONG: 8,          // 添加把麦开开的时间
  },
  
  // 新增：动作等级需求
  LEVEL_REQUIREMENTS: {
    DEFAULT: 1, // 默认需求等级
    [Symbol.for('玻璃锤')]: 1,
    [Symbol.for('羽毛帽')]: 2,
    [Symbol.for('羽毛枪')]: 3,
  },
  
  // 物品消耗量 (用于制作等)
  CONSUMPTION: {
    // 制作玻璃锤需要玻璃碎片 x 5
    '玻璃锤': { 
      '玻璃碎片': 5 
    },
    // 使用冰冻装置需要银杏叶 x 1 (作为催化剂消耗)
    '使用冰冻装置': {
      '银杏叶': 1 
    },
    // 制作羽毛枪需要羽毛 x 20 + 玻璃碎片 x 6
    '羽毛枪': {
      '羽毛': 20,
      '玻璃碎片': 6
    },
    // 制作羽毛帽需要羽毛 x 15
    '羽毛帽': {
      '羽毛': 15
    },
    '魔法水晶剑': {
      '水晶碎片': 8,
      '魔法草药': 2
    },
    '蝶翼斗篷': {
      '蝴蝶之翼': 12,
      '银杏叶': 5
    }
  },
  
  ITEM_IMAGES: {
    '敲打玻璃球': AlumImage,
    '恐吓鸽子': PigeonImage,
    '摇晃银杏': GinkgoImage,
    '狩猎绵羊': SheepImage,
    '玻璃锤': GlassSwordImage,
    '使用冰冻装置': BakaImage,
    '羽毛枪': PigeonGunImage,
    '羽毛帽': FeatherHelmetImage,
    '八嘎冰柜': 'baka_freezer.png',
    '挖水晶': 'mine_crystal.png',
    '采草药': 'harvest_herb.png',
    '捉蝴蝶': 'catch_butterfly.png',
    '水晶碎片': 'crystal_shard.png',
    '稀有草药': 'rare_herb.png',
    '蝴蝶翅膀': 'butterfly_wing.png',
    '蝶翼斗篷': 'butterfly_cloak.png',
  },
  
  EQUIPMENT_SLOTS: [
    '武器', '工具', '头部', '身体', '腿部', '脚部'
  ],
  
  // 新增：可装备物品列表
  EQUIPPABLE_ITEMS: [
    '玻璃锤',
    '羽毛枪',
    '羽毛帽'
  ],

  getItemImage(itemName) {
    return this.ITEM_IMAGES[itemName] || `${itemName.toLowerCase().replace(/\s+/g, '_')}.png`;
  }
}; 