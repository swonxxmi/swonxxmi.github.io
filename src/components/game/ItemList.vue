<template>
  <div class="item-container" v-if="showItems">
    <div 
      class="item" 
      v-for="(item, index) in items" 
      :key="index" 
      @click="openDialog(item)"
      :class="{ 'disabled': item.isDisabled }"
    >
      <img :src="item.image" :alt="item.name" />
      <p>{{ item.name }}</p>
      <div v-if="item.name === GameConstants.ITEMS.COLLECT_DEW && item.collectionsThisHour !== undefined" class="item-status">
        <span v-if="item.isDisabled">
          {{ item.minutesUntilReset }} 分钟后刷新 ({{ item.collectionsThisHour }}/{{ item.maxCollections }})
        </span>
        <span v-else>
          可采集 ({{ item.collectionsThisHour }}/{{ item.maxCollections }})
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import GameConstants from '@/constants/GameConstants';

export default {
  name: 'ItemList',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    showItems: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
        GameConstants
    };
  },
  methods: {
    openDialog(item) {
      if (item.isDisabled) {
          console.log(`[ItemList] Clicked on disabled item: ${item.name}`);
          return; 
      }
      this.$emit('open-dialog', item);
    }
  }
}
</script>

<style scoped>
.item-container {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
  margin-left: 220px;
  position: fixed;
  top: 160px;
  gap: 10px;
}

.item {
  border: 1px solid #76c7c0;
  margin: 5px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  background-color: #fff;
  border-radius: 4px;
  transition: background-color 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
  min-width: 120px;
}

.item:hover {
    background-color: #e0f2f1;
}

.item img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  display: block;
  margin: 0 auto 5px;
}

.item p {
    margin: 0;
    font-size: 14px;
}

.item-status {
  font-size: 12px;
  color: #555;
  margin-top: 4px;
}

.item.disabled {
  filter: grayscale(90%);
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #eee;
}

.item.disabled:hover {
  background-color: #eee;
}

@media (max-width: 768px) {
    .item-container {
        margin-left: 0;
        justify-content: center;
    }
    .item {
        min-width: 100px;
    }
    .item img {
        width: 60px;
        height: 60px;
    }
}
</style> 