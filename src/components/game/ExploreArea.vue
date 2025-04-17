<template>
  <div class="explore-area">
    
    <div class="areas-container">
      <div v-for="(area, key) in areas" :key="key" class="area-card" @click="selectArea(area)">
        <img :src="area.image" :alt="area.name" class="area-image">
        <div class="area-info">
          <h3>{{ area.name }}</h3>
          <p>{{ area.description }}</p>
          <div class="area-requirements" v-if="!isAreaUnlocked(area)">
            <span class="locked">🔒 需要探索等级 {{ area.requirements.level }}</span>
          </div>
          <div class="area-actions" v-else>
            <span class="action" v-for="action in area.actions" :key="action">
              {{ action }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 区域详情对话框 -->
    <div v-if="selectedArea" class="area-dialog">
      <div class="dialog-content">
        <h3>{{ selectedArea.name }}</h3>
        <p>{{ selectedArea.description }}</p>
        <div class="action-buttons">
          <button 
            v-for="action in selectedArea.actions" 
            :key="action"
            @click="startAction(action)"
            :disabled="!isAreaUnlocked(selectedArea)"
          >
            {{ action }}
          </button>
        </div>
        <button class="close-button" @click="closeDialog">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
import GameConstants from '@/constants/GameConstants';
import gameState from '@/store/gameState';

export default {
  name: 'ExploreArea',
  data() {
    return {
      areas: GameConstants.EXPLORE_AREAS,
      selectedArea: null,
      gameState
    };
  },
  methods: {
    selectArea(area) {
      this.selectedArea = area;
    },
    closeDialog() {
      this.selectedArea = null;
    },
    isAreaUnlocked(area) {
      const exploreLevel = this.gameState.state.levels[GameConstants.ACTIONS.EXPLORE] || 1;
      return exploreLevel >= area.requirements.level;
    },
    startAction(action) {
      if (this.selectedArea) {
        this.$emit('start-explore-action', {
          action,
          area: this.selectedArea
        });
        this.closeDialog();
      }
    }
  }
};
</script>

<style scoped>
.explore-area {
  padding: 20px;
}

.areas-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.area-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.area-card:hover {
  transform: translateY(-2px);
}

.area-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.area-info {
  padding: 15px;
}

.area-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.area-info p {
  margin: 0 0 15px 0;
  color: #666;
}

.area-requirements {
  color: #e74c3c;
}

.area-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action {
  background: #e8f5e9;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #2e7d32;
}

.area-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.action-buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
}

.action-buttons button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.close-button {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: #f44336;
  color: white;
  cursor: pointer;
}

.locked {
  display: inline-block;
  padding: 4px 8px;
  background: #ffebee;
  border-radius: 4px;
  color: #c62828;
}
</style> 