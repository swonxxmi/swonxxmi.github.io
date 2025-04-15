<template>
  <header class="game-header">
    <h1 class="game-title">玻璃猫猫虫窝</h1>
    <div class="action-box">
      <p>{{ currentAction }}</p>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress" :style="{ width: progress + '%' }"></div>
          <div class="progress-time" v-if="remainingTime > 0">
            {{ remainingTime.toFixed(1) + 's' }}
          </div>
        </div>
        <button class="stop-button" @click="stopAction" v-show="isPerformingAction">停止</button>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'GameHeader',
  props: {
    currentAction: {
      type: String,
      default: '无操作'
    },
    remainingTime: {
      type: Number,
      default: 0
    },
    progress: {
      type: Number,
      default: 0
    },
    isPerformingAction: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    stopAction() {
      this.$emit('stop-action');
    }
  }
}
</script>

<style scoped>
.game-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 10px 20px;
  background-color: #f0f0f0;
  border-bottom: 2px solid #76c7c0;
  height: 80px;
}

.game-title {
  font-size: 28px;
  color: #333;
  margin: 0;
  margin-right: 20px;
  flex-shrink: 0;
}

.action-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 20px;
  margin-bottom: 5px;
}

.action-box p {
  margin: 5px 0;
  font-weight: bold;
  color: #555;
}

.progress-container {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  width: 200px;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress {
  height: 100%;
  background-color: #76c7c0;
  transition: width 0.3s;
}

.progress-time {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.stop-button {
  height: 20px;
  padding: 0 5px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  background-color: #ff4d4d;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.stop-button:hover {
  background-color: #ff3333;
}
</style> 