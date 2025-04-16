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
  height: calc(100vh - 160px);
  overflow-y: auto;
  box-shadow: -2px 0 5px rgba(0,0,0,0.05);
}

.section-title {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1em;
  color: #333;
  text-align: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 8px;
}

.equipment-section,
.inventory-section {
  margin-bottom: 20px;
}

.equipment-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.equip-slot {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: left;
  background-color: white;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
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

.inventory-item.equippable:hover {
  background-color: #e7f3ff;
}

.inventory-item.equipped {
  border-left: 3px solid #28a745;
  background-color: #eaf7ea;
}

.inventory-item.equipped .equip-hint {
  color: #28a745;
}
</style> 