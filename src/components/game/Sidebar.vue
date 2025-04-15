<template>
  <div class="sidebar">
    <div class="equipment-section">
      <h3 class="section-title">装备栏</h3>
      <div class="equipment-grid">
        <div class="equip-slot" v-for="(equip, index) in equipment" :key="index">
          {{ equip }}
        </div>
      </div>
    </div>
    <div class="inventory-section">
      <h3 class="section-title">物品栏</h3>
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
      type: Array,
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
      return Object.entries(this.inventory).filter(([item, quantity]) => quantity > 0);
    }
  },
  methods: {
    isEquippable(item) {
      return this.gameState.isEquippable(item);
    },
    isEquipped(item) {
      return this.gameState.isEquipped(item);
    },
    equipItem(item) {
      if (this.isEquippable(item) && !this.isEquipped(item)) {
        this.$emit('equip-item', item);
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
  width: 180px;
  background-color: #f9f9f9;
  border-left: 1px solid #76c7c0;
  padding: 10px;
  height: calc(100vh - 190px);
  padding-bottom: 20px;
  overflow-y: auto;
}

.section-title {
  margin: 0 0 10px;
  font-size: 18px;
  color: #333;
  text-align: center;
  border-bottom: 1px solid #76c7c0;
  padding-bottom: 5px;
}

.equipment-section, .inventory-section {
  margin-bottom: 20px;
  background-color: #f9f9f9;
}

.equipment-grid {
  display: flex;
  flex-wrap: wrap;
}

.equip-slot {
  flex: 1 0 30%;
  border: 1px solid #76c7c0;
  margin: 5px;
  padding: 10px;
  text-align: center;
  background-color: white;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inventory-items {
  display: flex;
  flex-direction: column;
}

.inventory-item {
  padding: 10px;
  border: 2px solid #76c7c0;
  margin-bottom: 8px;
  border-radius: 5px;
  background-color: white;
  display: flex;
  flex-direction: column;
  position: relative;
}

.item-name {
  font-weight: bold;
}

.item-quantity {
  font-size: 14px;
  color: #666;
  margin-top: 2px;
}

.inventory-item.equippable {
  cursor: pointer;
  background-color: #f0f8ff;
  transition: all 0.3s;
}

.inventory-item.equippable:hover {
  background-color: #e6f2ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.inventory-item.equipped {
  background-color: #e0ffe0;
  border-color: #4caf50;
}

.equip-hint {
  font-size: 12px;
  color: #4caf50;
  margin-top: 5px;
  text-align: right;
}
</style> 