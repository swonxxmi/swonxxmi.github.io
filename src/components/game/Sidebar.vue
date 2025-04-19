<template>
  <div class="sidebar">
    <div class="equipment-section">
      <h3 class="section-title">装备栏</h3>
      <div class="equipment-grid">
        <div class="equip-slot" v-for="(item, slotName) in equipment" :key="slotName">
          <span class="slot-name">{{ slotName }}:</span>
          <span class="equipped-item">{{ item || '无' }}</span>
        </div>
      </div>
    </div>
    <div class="inventory-section">
      <h3 class="section-title inventory-title">物品栏</h3>
      <div class="inventory-items">
        <div 
          v-for="[item, quantity] in filteredInventory" 
          :key="item" 
          @click="equipItem(item)"
          class="inventory-item"
          :class="{ 'equippable': isEquippable(item), 'equipped': isEquipped(item) }"
        >
          <span class="item-name">{{ item }}</span>
          <span class="item-quantity">x{{ quantity }}</span>
          <span v-if="isEquippable(item)" class="equip-hint">
            {{ isEquipped(item) ? '[已装备]' : '[点击装备]' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    equipment: {
      type: Object,
      required: true
    },
    inventory: {
      type: Object,
      required: true
    },
    gameState: {
      type: Object,
      required: true
    }
  },
  computed: {
    filteredInventory() {
      return Object.entries(this.inventory).filter(([itemName, quantity]) => quantity > 0);
    },
    equipmentDebug() {
        console.log("[Sidebar Computed] Equipment prop received:", JSON.stringify(this.equipment));
        return this.equipment;
    }
  },
  mounted() {
      console.log("[Sidebar Mounted] Initial equipment prop:", JSON.stringify(this.equipment));
  },
  methods: {
    isEquippable(item) {
      return this.gameState && typeof this.gameState.isEquippable === 'function' 
             ? this.gameState.isEquippable(item) 
             : false;
    },
    isEquipped(item) {
      return this.gameState && typeof this.gameState.isEquipped === 'function' 
             ? this.gameState.isEquipped(item) 
             : false;
    },
    equipItem(item) {
      if (this.isEquippable(item) && !this.isEquipped(item)) {
        this.$emit('equip-item', item);
      } else if (this.isEquipped(item)){
        // console.log(`${item} is already equipped.`);
        // this.$emit('unequip-item', item);
      }
    }
  }
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 140px;
  right: 20px;
  width: 200px;
  background-color: #f0f0f0;
  border: 1px solid #dcdcdc;
  border-radius: 5px;
  padding: 15px;
  height: calc(100vh - 180px);
  overflow-y: auto;
  box-shadow: -2px 0 5px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  box-sizing: border-box;
}

/* 装备区域与物品区域之间的分隔线 */
.equipment-section {
  position: relative;
  padding-bottom: 15px;
  margin-bottom: 15px;
  border-bottom: 1px dashed #ccc;
}

/* 移动设备适配 */
@media screen and (max-width: 768px), screen and (orientation: portrait) {
  .sidebar {
    position: static; /* 移动设备上不使用固定定位 */
    top: auto;
    bottom: auto;
    right: auto;
    left: auto;
    width: 100%;
    height: auto; /* 自动高度 */
    max-height: calc(100vh - 60px); /* 限制最大高度 */
    border-radius: 5px;
    padding: 10px;
    z-index: 10;
    box-shadow: none;
    margin-bottom: 0;
  }

  /* 加强移动端下装备区域与物品区域的分隔 */
  .equipment-section {
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 2px solid #e0e0e0;
  }

  /* 隐藏物品栏标题（在移动端侧边栏中） */
  .inventory-title {
    display: none;
  }

  /* 为移动设备优化装备栏布局 */
  .section-title {
    font-size: 0.9em;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom-width: 1px;
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 移动设备上两列显示 */
    gap: 4px;
    width: 100%;
  }

  .equip-slot {
    padding: 4px 6px;
    font-size: 0.8em;
    display: flex;
    flex-direction: column; /* 在移动设备上垂直排列 */
    align-items: flex-start;
  }

  .slot-name {
    margin-right: 0;
    margin-bottom: 2px;
  }

  .inventory-items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    width: 100%;
  }

  .inventory-item {
    padding: 6px 8px;
    font-size: 0.9em;
    flex-direction: column;
    align-items: flex-start;
  }

  .item-quantity {
    font-size: 0.8em;
    margin-top: 2px;
    margin-right: 0;
  }

  .equip-hint {
    font-size: 0.7em;
    margin-top: 2px;
  }
}

/* 超小屏幕设备适配 */
@media screen and (max-width: 320px) {
  .sidebar {
    padding: 8px;
  }

  .equipment-grid {
    grid-template-columns: repeat(2, 1fr); /* 超小屏也保持两列 */
  }

  .inventory-items {
    grid-template-columns: 1fr; /* 超小屏单列显示 */
  }
  
  .equip-slot, .inventory-item {
    font-size: 0.75em;
    padding: 3px 5px;
  }
}

.section-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #333;
  text-align: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 6px;
}

.equipment-section,
.inventory-section {
  width: 100%;
}

.inventory-section {
  margin-bottom: 15px;
}

.equipment-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  width: 100%;
}

.equip-slot {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: left;
  background-color: white;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  width: 100%;
  box-sizing: border-box;
}

.slot-name {
  color: #666;
  margin-right: 5px;
}

.equipped-item {
  font-weight: bold;
  color: #333;
}

.inventory-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.inventory-item {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  transition: background-color 0.2s, border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.item-name {
  font-weight: bold;
  flex-grow: 1;
  margin-right: 10px;
}

.item-quantity {
  font-size: 0.9em;
  color: #888;
  margin-right: 10px;
}

.equip-hint {
  font-size: 0.8em;
  color: #007bff;
}

.inventory-item.equippable {
  cursor: pointer;
  border-left: 3px solid #007bff;
}

.inventory-item.equipped {
  background-color: #e7f3ff;
}

.inventory-item:hover {
  background-color: #f5f5f5;
}

.inventory-item.equippable:hover {
  background-color: #ebf5ff;
}
</style> 