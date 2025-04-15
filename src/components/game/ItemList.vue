<template>
  <div class="item-container" v-if="showItems">
    <div class="item" v-for="(item, index) in items" :key="index" @click="openDialog(item)">
      <img :src="item.image" :alt="item.name" />
      <p>{{ item.name }}</p>
    </div>
  </div>
</template>

<script>
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
  methods: {
    openDialog(item) {
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
}

.item {
  border: 1px solid #76c7c0;
  margin: 5px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
}

.item img {
  width: 100px;
  height: 100px;
  object-fit: cover;
}
</style> 