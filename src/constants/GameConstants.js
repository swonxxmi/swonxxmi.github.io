/**
 * 游戏常量
 */
export default {
  // 行为类型
  ACTIONS: {
    COLLECT: '采集',
    FORGE: '锻造',
    BUILD: '建造',
    INTERACT: '交互',
    EXPLORE: '探索'
  },
  
  // 物品类型
  ITEMS: {
    GLASS_SHARD: '玻璃碎片',
    GLASS_HAMMER: '玻璃锤',
    GLASS_BALL: '敲打玻璃球',
    SCARE_PIGEON: '惊吓鸽者',
    SHAKE_GINKGO: '摘银杏叶'
  },
  
  // 行为时间（秒）
  ACTION_TIMES: {
    COLLECT: 2,
    FORGE: 10,
    SCARE_PIGEON: 4,
    SHAKE_GINKGO: 6
  },
  
  // 物品消耗量
  CONSUMPTION: {
    GLASS_HAMMER: 10 // 制作玻璃锤需要10个玻璃碎片
  }
}; 