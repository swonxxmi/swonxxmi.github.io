<template>
  <div class="action-types">
    <div class="action-buttons">
      <div 
        v-for="action in actions" 
        :key="action" 
        :title="getActionTitle(action)"
        @click="switchAction(action)"
        class="action-button"
        :class="{ 'active': isActive(action) }"
      >
        <span class="action-name">{{ action }}</span>
        <span class="action-level">等级: {{ levels[action] }}</span>
        
        <!-- 经验条显示 -->
        <div class="exp-container">
          <div class="exp-bar-bg">
            <div class="exp-bar" :style="{ width: getExpPercentage(action) + '%' }"></div>
          </div>
          <span class="exp-text">{{ experience[action] }}/{{ calculateXPForNextLevel(levels[action]) }} ({{ getExpPercentage(action) }}%)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// 定义与 gameState.js 中相同的常量
const LEVEL_UP_BASE_XP = 3;
const LEVEL_UP_FACTOR = 1.4;

export default {
  name: 'ActionTypes',
  props: {
    levels: {
      type: Object,
      required: true
    },
    experience: {
      type: Object,
      required: true
    },
    actions: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      activeAction: null
    };
  },
  methods: {
    getActionTitle(action) {
      return `当前经验: ${this.experience[action]} / 下一级经验: ${this.calculateXPForNextLevel(this.levels[action])}`;
    },
    switchAction(action) {
      this.activeAction = action;
      this.$emit('switch-action', action);
    },
    isActive(action) {
      return this.activeAction === action;
    },
    calculateXPForNextLevel(level) {
       // 确保 level 是数字且至少为 1
       const numericLevel = Number(level);
       if (isNaN(numericLevel)) return Infinity; // 或者返回一个很大的数
       const effectiveLevel = Math.max(1, numericLevel);
       // 使用 Math.ceil 或 Math.floor 取决于你希望难度如何
       return Math.floor(LEVEL_UP_BASE_XP * Math.pow(LEVEL_UP_FACTOR, effectiveLevel - 1));
    },
    getExpPercentage(action) {
      const currentLevel = this.levels[action];
      const required = this.calculateXPForNextLevel(currentLevel); // 使用新方法
      const current = this.experience[action];
      // 防止除以 0 或无效值
      if (required <= 0) return 0;
      // 确保百分比在 0-100 之间
      const percentage = Math.min(100, Math.max(0, (current / required) * 100));
      // 返回整数百分比用于显示
      return Math.floor(percentage);
    }
  }
}
</script>

<style scoped>
.action-types {
  position: fixed;
  top: 140px;
  left: 20px;
  text-align: left;
  width: 180px;
  height: calc(100vh - 180px);
  border-right: 1px solid #76c7c0;
  padding-bottom: 20px;
  overflow-y: auto;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 10px;
  background-color: #f9f9f9;
}

.action-button {
  margin: 5px 0;
  padding: 11px;
  border: 2px solid #76c7c0;
  border-radius: 5px;
  background-color: white;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 110px;
  justify-content: center;
}

.action-button:hover {
  background-color: #eaf8f7;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-button.active {
  background-color: #76c7c0;
  color: white;
}

.action-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.action-level {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 10px;
}

/* 经验条样式 */
.exp-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 5px;
}

.exp-bar-bg {
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 5px;
}

.exp-bar {
  height: 100%;
  background-color: #ffcc00;
  border-radius: 5px;
  transition: width 0.3s;
}

.exp-text {
  font-size: 12px;
  color: #555;
}

/* 移除这条规则，让激活状态下的经验条保持原有颜色 */
/*
.action-button.active .exp-bar {
  background-color: #fff;
}
*/

.action-button.active .exp-text {
  color: #fff;
}
</style> 