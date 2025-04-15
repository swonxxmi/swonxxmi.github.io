<template>
  <div v-if="visible" class="dialog-overlay" @click="closeDialog">
    <div class="dialog" @click.stop>
      <div class="dialog-content">
        <h3>{{ description.title }}</h3>
        <p>种类：{{ description.type }}</p>
        <p>描述：{{ description.cost }}</p>
        <p>时间：{{ description.time }}</p>
        <p v-if="description.consumption">{{ description.consumption }}</p>
        <p>获得：{{ description.reward }}</p>
        <p v-if="description.special" class="special-effect">{{ description.special }}</p>
      </div>
      <button class="start-button" @click="startAction">开始</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    description: {
      type: Object,
      default: () => ({})
    },
    item: {
      type: Object,
      required: true
    }
  },
  methods: {
    closeDialog() {
      this.$emit('close-dialog');
    },
    startAction() {
      this.$emit('start-action', this.item);
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border: 1px solid #76c7c0;
  padding: 20px;
  z-index: 1000;
}

.dialog-content {
  text-align: left;
}

.dialog button {
  width: 100%;
  margin-top: 10px;
  background-color: #5ba8a0;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dialog button:hover {
  background-color: #4a8a8a;
}

.special-effect {
  color: #ff6600;
  font-weight: bold;
}
</style> 