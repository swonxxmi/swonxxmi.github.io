<template>
  <div v-if="visible" class="dialog-overlay" @click="closeDialog">
    <div class="dialog" @click.stop>
      <div class="dialog-content">
        <h3>{{ description.name || '详情' }}</h3>
        <p v-if="description.levelRequirement" class="level-requirement">{{ description.levelRequirement }}</p>
        <p v-if="description.description">描述：{{ description.description }}</p>
        <p v-if="description.time">时间：{{ description.time }}</p>
        <p v-if="description.yield">{{ description.yield }}</p>
        <p v-if="description.recipe" class="recipe">{{ description.recipe }}</p>
        <p v-if="description.effect" class="effect">{{ description.effect }}</p>
        <p v-if="description.buffDescription" class="buff-description">{{ description.buffDescription }}</p>
        <p v-if="description.requires" class="requires">{{ description.requires }}</p>
        <p v-if="description.special" class="special-effect">{{ description.special }}</p>
        <p v-if="description.note" class="note">{{ description.note }}</p>
      </div>
      <button v-if="item && item.name" class="start-button" @click="startAction">开始</button>
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
      if (this.item && this.item.name) {
        this.$emit('start-action', this.item);
      } else {
        console.error("Attempted to start action with invalid item:", this.item);
        this.closeDialog();
      }
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
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.dialog {
  background-color: #f8f8f8;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  padding: 25px;
  width: 90%;
  max-width: 400px;
  z-index: 1000;
  text-align: center;
}

.dialog-content {
  text-align: left;
  margin-bottom: 20px;
}

.dialog-content h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.dialog-content p {
  margin: 8px 0;
  color: #555;
  line-height: 1.5;
}

.level-requirement {
  color: #e74c3c;
  font-weight: bold;
}

.dialog .start-button {
  padding: 10px 20px;
  margin-top: 10px;
  background-color: #5ba8a0;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-size: 1em;
}

.dialog .start-button:hover {
  background-color: #4a8a8a;
  transform: scale(1.02);
}

.recipe,
.effect,
.craft-time {
  color: #3a7ca5;
  font-style: italic;
}

.buff-description {
  color: #8e44ad;
  font-style: italic;
}

.requires {
  color: #d35400;
}

.special-effect {
  color: #e67e22;
  font-weight: bold;
}

.note {
  color: #777;
  font-size: 0.9em;
}
</style> 