<template>
  <div class="game-home">
    <GameHeader 
      :current-action="currentAction"
      :remaining-time="remainingTime"
      :progress="progress"
      :is-performing-action="isPerformingAction"
      @stop-action="stopAction"
    />

    <ActionTypes 
      :levels="gameState.state.levels"
      :experience="gameState.state.experience"
      :actions="actions"
      @switch-action="switchAction"
    />
    
    <ItemList 
      :items="items"
      :show-items="showItems"
      @open-dialog="openDialog"
    />

    <GameDialog 
      :visible="dialogVisible"
      :description="dialogDescription"
      :item="dialogItem"
      @close-dialog="closeDialog"
      @start-action="startAction"
    />

    <Sidebar 
      :equipment="gameState.state.equipment"
      :inventory="gameState.state.inventory"
      :gameState="gameState"
      @equip-item="handleEquipItem"
    />
    
    <!-- 悬浮提示 -->
    <div v-if="showTooltip" class="tooltip" :style="{top: tooltipY + 'px', left: tooltipX + 'px'}">
      {{ tooltipText }}
    </div>
  </div>
</template>

<script>
import GameHeader from '@/components/game/GameHeader.vue';
import ActionTypes from '@/components/game/ActionTypes.vue';
import ItemList from '@/components/game/ItemList.vue';
import GameDialog from '@/components/game/GameDialog.vue';
import Sidebar from '@/components/game/Sidebar.vue';
import GameService from '@/services/GameService';
import GameConstants from '@/constants/GameConstants';
import gameState from '@/store/gameState';

import AlumImage from '@/assets/Alum.jpg';
import GlassSwordImage from '@/assets/Glass_Hammer.png';
import PigeonImage from '@/assets/gezhe.jpg';
import GinkgoImage from '@/assets/ginkgo_leaf.png';

export default {
  components: {
    GameHeader,
    ActionTypes,
    ItemList,
    GameDialog,
    Sidebar
  },
  data() {
    return {
      gameState,
      currentAction: "无操作",
      remainingTime: 0,
      actionTimer: null,
      isPerformingAction: false,
      progress: 0,
      actions: Object.values(GameConstants.ACTIONS),
      showItems: false,
      items: [],
      dialogVisible: false,
      dialogItem: {},
      dialogDescription: {},
      showTooltip: false,
      tooltipText: '',
      tooltipX: 0,
      tooltipY: 0,
      tooltipTimer: null,
      loopingItem: null,
    };
  },
  methods: {
    switchAction(action) {
      if (action === GameConstants.ACTIONS.COLLECT || action === GameConstants.ACTIONS.FORGE) {
        this.performAction(action);
      } else {
        this.showItems = false;
      }
    },
    performAction(action) {
      this.showItems = true;
      if (action === GameConstants.ACTIONS.COLLECT) {
        this.items = [
          { image: AlumImage, name: GameConstants.ITEMS.GLASS_BALL },
          { image: PigeonImage, name: GameConstants.ITEMS.SCARE_PIGEON },
          { image: GinkgoImage, name: GameConstants.ITEMS.SHAKE_GINKGO }
        ];
      } else if (action === GameConstants.ACTIONS.FORGE) {
        // 不再检查材料，直接显示可锻造的物品
        this.items = [{ image: GlassSwordImage, name: GameConstants.ITEMS.GLASS_HAMMER }];
      }
    },
    resetActionState() {
      this.remainingTime = 0;
      this.progress = 0; // 设置为0，不是100
      this.currentAction = "无操作";
    },
    startAction(newItem, closeDialog = true) {
      // 如果当前正在循环操作中，先停止它
      if (this.isPerformingAction) {
        this.stopAction();
      }

      // 如果之前有计时器，清除它并重置状态（以防万一）
      if (this.actionTimer) {
          clearInterval(this.actionTimer);
          this.resetActionState(); 
      }

      // *** 使用传入的 newItem 来设置 dialogItem ***
      this.dialogItem = newItem; 

      if (!this.dialogItem || !this.dialogItem.name) return; // 检查 newItem 是否有效

      const glassShardItem = GameConstants.ITEMS.GLASS_SHARD;
      const glassHammerItem = GameConstants.ITEMS.GLASS_HAMMER;
      const glassBallItem = GameConstants.ITEMS.GLASS_BALL;
      const scarePigeonItem = GameConstants.ITEMS.SCARE_PIGEON;
      const shakeGinkgoItem = GameConstants.ITEMS.SHAKE_GINKGO;
      
      let actionType = '';
      let actionTime = 2;
      
      // 清空循环项，除非是采集
      this.loopingItem = null;

      if (this.dialogItem.name === glassHammerItem) {
        const requiredAmount = GameConstants.CONSUMPTION.GLASS_HAMMER;
        if (this.gameState.state.inventory[glassShardItem] < requiredAmount) {
          // 显示悬浮提示，不指定位置，会在屏幕中央显示
          this.showTooltipMessage(`材料不足：需要${requiredAmount}个玻璃碎片`);
          return; // 材料不足，直接返回
        }
        
        this.currentAction = "锻造玻璃锤";
        actionType = GameConstants.ACTIONS.FORGE;
        actionTime = GameConstants.ACTION_TIMES.FORGE;
        
        // 锻造开始时才消耗材料
        this.gameState.removeItemFromInventory(glassShardItem, requiredAmount);
      } else if (
        this.dialogItem.name === glassBallItem || 
        this.dialogItem.name === scarePigeonItem || 
        this.dialogItem.name === shakeGinkgoItem
      ) {
        this.currentAction = this.dialogItem.name;
        actionType = GameConstants.ACTIONS.COLLECT;
        actionTime = this.calculateCollectTime(this.dialogItem); // 传递 item
        // *** 记录当前循环的操作项 ***
        this.loopingItem = this.dialogItem; 
      }

      this.remainingTime = actionTime; 
      this.progress = 0;
      this.isPerformingAction = true;
      
      if (closeDialog) {
        this.dialogVisible = false;
      }

      const totalTime = this.remainingTime;
      if (this.actionTimer) {
        clearInterval(this.actionTimer);
      }
      
      this.actionTimer = setInterval(() => {
        if (this.remainingTime > 0) {
          this.remainingTime -= 0.1;
          this.progress = ((totalTime - this.remainingTime) / totalTime) * 100;
        } else {
          clearInterval(this.actionTimer);
          this.currentAction = "无操作";
          this.progress = 0; // 设置为0，不显示进度
          this.remainingTime = 0;
          this.completeAction(actionType);
          
          // 如果不是采集行为，则重置isPerformingAction
          if (actionType !== GameConstants.ACTIONS.COLLECT) {
            this.isPerformingAction = false;
          }
        }
      }, 100);
    },
    completeAction(actionType) {
      if (actionType === GameConstants.ACTIONS.COLLECT) {
        const amount = GameService.calculateCollectionAmount(this.gameState.state.levels[GameConstants.ACTIONS.COLLECT]);
        
        // 根据不同的采集行为给予不同的物品
        if (this.dialogItem) {
          if (this.dialogItem.name === GameConstants.ITEMS.GLASS_BALL) {
            this.gameState.addItemToInventory(GameConstants.ITEMS.GLASS_SHARD, amount);
          } else if (this.dialogItem.name === GameConstants.ITEMS.SCARE_PIGEON) {
            this.gameState.addItemToInventory('羽毛', amount);
          } else if (this.dialogItem.name === GameConstants.ITEMS.SHAKE_GINKGO) {
            this.gameState.addItemToInventory('银杏叶', amount);
          }
          
          // 确保每次采集操作都增加采集经验
          this.gameState.gainExperience(GameConstants.ACTIONS.COLLECT, 1);
          console.log(`增加${GameConstants.ACTIONS.COLLECT}经验，当前经验:`, this.gameState.state.experience[GameConstants.ACTIONS.COLLECT]);
          
          // 强制刷新视图
          this.$forceUpdate();
        }
        
        // 自动开始下一次采集行为，直接开始不使用setTimeout
        if (this.dialogItem && 
            (this.dialogItem.name === GameConstants.ITEMS.GLASS_BALL ||
             this.dialogItem.name === GameConstants.ITEMS.SCARE_PIGEON ||
             this.dialogItem.name === GameConstants.ITEMS.SHAKE_GINKGO)
        ) {
          // 保持isPerformingAction为true，确保停止按钮不会消失
          this.isPerformingAction = true;
          this.startCollectAction();
        }
      } else if (actionType === GameConstants.ACTIONS.FORGE) {
        // 锻造操作增加锻造经验
        this.gameState.gainExperience(GameConstants.ACTIONS.FORGE, 1);
        console.log(`增加${GameConstants.ACTIONS.FORGE}经验，当前经验:`, this.gameState.state.experience[GameConstants.ACTIONS.FORGE]);
        
        this.gameState.addItemToInventory(GameConstants.ITEMS.GLASS_HAMMER, 1);
        // 不再自动装备
        
        // 显示提示
        this.showTooltipMessage("成功锻造了玻璃锤！");
        
        // 强制刷新视图
        this.$forceUpdate();
      }
      
      // 每次行为完成后自动保存游戏
      this.autoSaveGame();
    },
    // 修改采集行为方法
    startCollectAction() {
      const actionType = GameConstants.ACTIONS.COLLECT;
      
      // *** 检查 loopingItem 是否存在 ***
      if (!this.loopingItem) {
        console.warn("startCollectAction called but no loopingItem set.");
        this.stopAction(); // 停止任何可能残留的计时器
        return;
      }

      // *** 使用 loopingItem 设置名称和计算时间 ***
      this.currentAction = this.loopingItem.name;
      const actionTime = this.calculateCollectTime(this.loopingItem); 
      
      this.remainingTime = actionTime;
      this.progress = 0;
      this.isPerformingAction = true; // 确保设置为true
      
      const totalTime = this.remainingTime;
      if (this.actionTimer) {
        clearInterval(this.actionTimer); // 清除之前的计时器
      }
      
      this.actionTimer = setInterval(() => {
        if (this.remainingTime > 0) {
          this.remainingTime -= 0.1;
          this.progress = ((totalTime - this.remainingTime) / totalTime) * 100;
        } else {
          clearInterval(this.actionTimer);
          this.currentAction = "无操作";
          this.progress = 0; // 设置为0，不是100
          this.remainingTime = 0;
          this.completeAction(actionType);
          // 不设置isPerformingAction = false，由completeAction来控制
        }
      }, 100);
    },
    stopAction() {
      if (this.remainingTime > 0 || this.isPerformingAction) { // 检查条件更鲁棒
        clearInterval(this.actionTimer);
        this.resetActionState();
        this.isPerformingAction = false;
        this.loopingItem = null; // *** 重置 loopingItem ***
      }
    },
    openDialog(item) {
      // 保存当前正在进行的操作状态
      // const currentPerformingItem = this.dialogItem; // 不再需要保存旧item
      const wasPerforming = this.isPerformingAction;
      
      // 直接将 this.dialogItem 设置为新点击的 item
      this.dialogItem = item;
      this.dialogVisible = true;
      
      let actionType = GameConstants.ACTIONS.COLLECT;
      
      if (item.name === GameConstants.ITEMS.GLASS_HAMMER) {
        actionType = GameConstants.ACTIONS.FORGE;
      }
      
      // 获取描述对象
      const description = GameService.generateItemDescription(
        item, 
        this.gameState.state.levels[actionType]
      );
      
      // 如果是采集行为，考虑装备加成
      if (item.name === GameConstants.ITEMS.GLASS_BALL ||
          item.name === GameConstants.ITEMS.SCARE_PIGEON ||
          item.name === GameConstants.ITEMS.SHAKE_GINKGO) {
        // 临时设置dialogItem用于计算时间 - 不再需要，直接传参
        // const tempItem = this.dialogItem;
        // this.dialogItem = item;
        const actualTime = this.calculateCollectTime(item); // *** 传递 item 参数 ***
        // this.dialogItem = tempItem; // 恢复原来的dialogItem
        
        description.time = `${actualTime.toFixed(1)} 秒`;
        
        // 只有敲打玻璃球才显示玻璃锤的加成效果
        if (this.gameState.isEquipped(GameConstants.ITEMS.GLASS_HAMMER) && 
            item.name === GameConstants.ITEMS.GLASS_BALL) {
          description.special = "装备效果: 玻璃锤减少10%的敲打玻璃球时间";
        }
      }
      
      this.dialogDescription = description;
      
      // 不再需要恢复旧状态，因为我们要切换到新动作
      // if (wasPerforming) {
      //   this.dialogItem = currentPerformingItem;
      // }
    },
    closeDialog() {
      this.dialogVisible = false;
    },
    // 添加自动保存方法
    autoSaveGame() {
      try {
        const gameData = JSON.stringify({
          levels: this.gameState.state.levels,
          experience: this.gameState.state.experience,
          inventory: this.gameState.state.inventory,
          equipment: this.gameState.state.equipment
        });
        localStorage.setItem('gameData', gameData);
        console.log('游戏已自动保存');
      } catch (error) {
        console.error('自动保存游戏失败：', error);
      }
    },
    // ... 保留 loadGame 方法，但修改为私有方法用于自动加载
    _loadGame() {
      try {
        const savedData = localStorage.getItem('gameData');
        if (!savedData) {
          return false;
        }
        
        const gameData = JSON.parse(savedData);
        
        // 更新游戏状态
        this.gameState.state.levels = gameData.levels;
        this.gameState.state.experience = gameData.experience;
        this.gameState.state.inventory = gameData.inventory;
        this.gameState.state.equipment = gameData.equipment;
        
        console.log('游戏数据已自动加载');
        return true;
      } catch (error) {
        console.error('自动加载游戏失败：', error);
        return false;
      }
    },
    // 添加悬浮提示方法
    showTooltipMessage(message) {
      this.tooltipText = message;
      
      // 如果没有指定位置，则在屏幕中央显示
      this.tooltipX = window.innerWidth / 2 - 125; // 提示框宽度的一半
      this.tooltipY = window.innerHeight / 4 - 50; // 大致估计高度的一半
      
      this.showTooltip = true;
      
      // 3秒后自动关闭提示
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
      }
      this.tooltipTimer = setTimeout(() => {
        this.showTooltip = false;
      }, 3000);
    },
    // 处理物品栏装备事件
    handleEquipItem(itemName) {
      if (this.gameState.equipItem(itemName)) {
        this.showTooltipMessage(`已装备 ${itemName}`);
      } else {
        this.showTooltipMessage("装备失败");
      }
    },
    // 计算采集时间，考虑装备加成
    calculateCollectTime(item) {
      let baseTime = GameConstants.ACTION_TIMES.COLLECT;
      
      // 根据不同的行为获取不同的基础时间
      if (item) {
        if (item.name === GameConstants.ITEMS.SCARE_PIGEON) {
          baseTime = GameConstants.ACTION_TIMES.SCARE_PIGEON;
        } else if (item.name === GameConstants.ITEMS.SHAKE_GINKGO) {
          baseTime = GameConstants.ACTION_TIMES.SHAKE_GINKGO;
        }
      }
      
      // 检查是否装备了玻璃锤，且当前行为是敲打玻璃球
      if (this.gameState.isEquipped(GameConstants.ITEMS.GLASS_HAMMER) && 
          item && 
          item.name === GameConstants.ITEMS.GLASS_BALL) {
        baseTime = baseTime * 0.9; // 只有敲打玻璃球时减少10%的时间
      }
      return baseTime;
    },
  },
  mounted() {
    this.showItems = true;
    this.items = [
      { image: AlumImage, name: GameConstants.ITEMS.GLASS_BALL },
      { image: PigeonImage, name: GameConstants.ITEMS.SCARE_PIGEON },
      { image: GinkgoImage, name: GameConstants.ITEMS.SHAKE_GINKGO }
    ];
    
    // 尝试自动加载游戏
    this._loadGame();
    
    // 设置定时自动保存（每5分钟）
    setInterval(() => {
      this.autoSaveGame();
    }, 5 * 60 * 1000);
  }
};
</script>

<style scoped>
.game-home {
  text-align: center;
  font-family: Arial, sans-serif;
}

.tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  z-index: 1100;
  max-width: 250px;
  text-align: center;
}
</style>