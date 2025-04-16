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
    <!-- <div v-if="showTooltip" class="tooltip" :style="{top: tooltipY + 'px', left: tooltipX + 'px'}">
      {{ tooltipText }}
    </div> -->
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
// import Tooltip from '@/components/common/Tooltip.vue'; // 注释掉导入

// import AlumImage from '@/assets/Alum.jpg'; // 使用 GameConstants.getItemImage 替代
// import GlassSwordImage from '@/assets/Glass_Hammer.png';
// import PigeonImage from '@/assets/gezhe.jpg';
// import GinkgoImage from '@/assets/ginkgo_leaf.png';
// import SheepImage from '@/assets/Sheep.png'; // 不再需要单独导入
// import BakaImage from '@/assets/baka.jpg'; // 不再需要单独导入

export default {
  name: 'GameHome',
  components: {
    GameHeader,
    ActionTypes,
    ItemList,
    GameDialog,
    Sidebar,
    // Tooltip, // 注释掉组件注册
  },
  data() {
    return {
      gameState,
      currentAction: "无操作",
      remainingTime: 0,
      actionTimer: null,
      isPerformingAction: false,
      progress: 0,
      // 从 GameConstants 获取 actions 并保证顺序
      actions: Object.values(GameConstants.ACTIONS),
      showItems: false,
      items: [],
      dialogVisible: false,
      dialogItem: null,
      dialogDescription: {},
      showTooltip: false,
      tooltipText: '',
      tooltipX: 0,
      tooltipY: 0,
      tooltipTimer: null,
      loopingItem: null, // 用于重复执行的动作项
      performingItem: null, // 用于保存正在执行的 item
    };
  },
  methods: {
    // --- Action Switching Logic ---
    switchAction(action) {
      // 点击技能按钮时，只更新下方显示的物品列表，不改变当前执行的动作
      console.log(`[switchAction] Switching to display items for: ${action}`);
      this.updateItemList(action); // 调用新的方法来更新列表
      // <<< 添加日志：检查动作状态是否改变 >>>
      console.log(`[switchAction] State after updateItemList - currentAction: ${this.currentAction}, progress: ${this.progress}, remainingTime: ${this.remainingTime}, isPerformingAction: ${this.isPerformingAction}`);
    },
    // (原 performAction) 更新动作类型对应的物品列表
    updateItemList(action) {
      this.showItems = true;
      this.items = []; // 清空之前的项目
      console.log(`[updateItemList] Updating item list for: ${action}`);

      if (action === GameConstants.ACTIONS.COLLECT) {
        this.items = [
          { image: GameConstants.getItemImage(GameConstants.ITEMS.GLASS_BALL), name: GameConstants.ITEMS.GLASS_BALL },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.SCARE_PIGEON), name: GameConstants.ITEMS.SCARE_PIGEON },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.SHAKE_GINKGO), name: GameConstants.ITEMS.SHAKE_GINKGO }
        ];
      } else if (action === GameConstants.ACTIONS.HUNT) {
        this.items = [
          { image: GameConstants.getItemImage(GameConstants.ITEMS.SHEEP), name: GameConstants.ITEMS.SHEEP }
        ];
      } else if (action === GameConstants.ACTIONS.FORGE) {
        this.items = [
          { image: GameConstants.getItemImage(GameConstants.ITEMS.GLASS_HAMMER), name: GameConstants.ITEMS.GLASS_HAMMER }
        ];
      } else if (action === GameConstants.ACTIONS.INTERACT) {
        this.items = [
          { image: GameConstants.getItemImage(GameConstants.ITEMS.BAKA_FREEZER), name: GameConstants.ITEMS.BAKA_FREEZER }
        ];
      } else {
        console.warn(`[updateItemList] Unknown action type: ${action}`);
        this.showItems = false; // 对于未知或无项目的动作，隐藏列表
      }
    },

    // --- Action Execution Logic ---
    resetActionState() {
      // 只重置与当前动作进度相关的状态
      this.remainingTime = 0;
      this.progress = 0;
      this.currentAction = "无操作";
      // 注意：不应在此处清除 loopingItem 或 actionTimer，它们由 stopAction 或 completeAction 控制
      // <<< 重置 performingItem >>>
      // this.performingItem = null; // 通常由 stopAction/completeAction 处理，此处不必需
      console.log("[resetActionState] UI state reset (time, progress, text)");
    },
    startAction(newItem, closeDialog = true) {
      // <<< 修改启动检查逻辑 >>>
      // 如果当前有动作正在执行，并且新请求的动作与当前执行的不同，则停止之前的动作
      if (this.isPerformingAction && this.performingItem && newItem.name !== this.performingItem.name) {
        console.log("[startAction] Stopping previous different action to start a new one.");
        this.stopAction();
      }

      // 总是清除旧计时器（如果有的话），为新动作或循环做准备
      if (this.actionTimer) {
        clearInterval(this.actionTimer);
        this.actionTimer = null;
      }
      
      // 总是重置进度、时间和循环标记，后续逻辑会重新设置
      this.progress = 0;
      this.remainingTime = 0; // 会被重新计算
      this.loopingItem = null; // 如果是可循环动作，后面会设置
      // <<< 不再需要之前的 return 逻辑 >>>

      // <<< 仅在从对话框启动时更新 dialogItem >>>
      if (closeDialog) {
        // 这个 newItem 来自对话框的 'start-action' 事件
        this.dialogItem = newItem; 
      }
      
      // 验证传入的 newItem (无论是来自对话框还是循环)
      if (!newItem || !newItem.name) {
          console.error("startAction called with invalid newItem");
          // 如果之前的检查没有 stopAction，确保清理 performingItem
          this.performingItem = null; 
          return;
      }
      
      // <<< 使用传入的 newItem 设置 performingItem >>>
      // this.dialogItem = newItem; // 移动到上面 if(closeDialog) 块中
      this.performingItem = { ...newItem }; // 创建副本

      // let actionType = this.getActionTypeFromItem(this.dialogItem.name);
      // <<< 后续逻辑应基于 performingItem >>>
      let actionType = this.getActionTypeFromItem(this.performingItem.name);
      let actionTime = 0;

      console.log(`[startAction] Starting action for item: ${this.performingItem.name}, detected actionType: ${actionType}`);

      if (!actionType) {
          console.warn("Unknown action type for item:", this.performingItem.name);
          this.performingItem = null; // 清理无效的 performingItem
          return;
      }

      const itemName = this.performingItem.name;

      // --- 锻造逻辑 ---
      if (itemName === GameConstants.ITEMS.GLASS_HAMMER) {
        const recipe = GameConstants.CONSUMPTION[itemName];
        const requiredItem = Object.keys(recipe)[0];
        const requiredAmount = recipe[requiredItem];

        if (this.gameState.state.inventory[requiredItem] < requiredAmount) {
          this.showTooltipMessage(`材料不足：需要 ${requiredAmount} 个 ${requiredItem}`);
          this.performingItem = null; // 清理
          return;
        }
        this.currentAction = `锻造 ${itemName}`;
        // actionType = GameConstants.ACTIONS.FORGE; // 已在上面获取
        actionTime = GameConstants.ACTION_TIMES.FORGE;
        this.gameState.removeItemFromInventory(requiredItem, requiredAmount);
      }
      // --- 采集逻辑 ---
      else if (
        itemName === GameConstants.ITEMS.GLASS_BALL ||
        itemName === GameConstants.ITEMS.SCARE_PIGEON ||
        itemName === GameConstants.ITEMS.SHAKE_GINKGO
      ) {
        this.currentAction = itemName;
        // actionType = GameConstants.ACTIONS.COLLECT; // 已在上面获取
        actionTime = this.calculateActionTime(this.performingItem);
        this.loopingItem = this.performingItem; // 采集可循环
      }
      // --- 狩猎逻辑 ---
      else if (itemName === GameConstants.ITEMS.SHEEP) {
        this.currentAction = itemName;
        // actionType = GameConstants.ACTIONS.HUNT; // 已在上面获取
        actionTime = this.calculateActionTime(this.performingItem);
        this.loopingItem = this.performingItem; // 狩猎也循环
      }
      // --- 交互逻辑 ---
      else if (actionType === GameConstants.ACTIONS.INTERACT) {
          this.currentAction = itemName;
          actionTime = this.calculateActionTime(this.performingItem);

          if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
              const catalyst = GameConstants.ITEMS.GINKGO_LEAF;
              const requiredCatalyst = GameConstants.CONSUMPTION[itemName]?.[catalyst] || 0;
              if (this.gameState.getItemCount(catalyst) < requiredCatalyst) {
                  this.showTooltipMessage(`材料不足：需要 ${requiredCatalyst} x ${catalyst}`);
                   this.performingItem = null; // 清理
                  return;
              }
              const targetFood = GameConstants.ITEMS.RAW_MUTTON;
              if (this.gameState.getItemCount(targetFood) <= 0) {
                  this.showTooltipMessage(`没有 ${targetFood} 可供转化`);
                   this.performingItem = null; // 清理
                  return;
              }
              this.gameState.removeItemFromInventory(catalyst, requiredCatalyst);
              console.log(`[startAction] Consumed catalyst: ${requiredCatalyst}x ${catalyst}`);
              this.loopingItem = this.performingItem; // 交互可循环
          }
      }
      // --- 未知物品处理 ---
      else {
        console.error("Unknown item started:", itemName);
         this.performingItem = null; // 清理
        return;
      }

      console.log(`[startAction] Determined actionTime: ${actionTime}, loopingItem set to:`, this.loopingItem ? this.loopingItem.name : null);

      if (actionTime <= 0) {
          console.error("Calculated action time is zero or negative for:", itemName);
           this.performingItem = null; // 清理
          return;
      }

      this.remainingTime = actionTime;
      this.progress = 0;
      this.isPerformingAction = true;

      if (closeDialog) {
        this.dialogVisible = false;
      }

      const totalTime = this.remainingTime;
      // 清除旧计时器 (以防万一) - 已经在函数开头处理过
      // if (this.actionTimer) clearInterval(this.actionTimer);

      const updateInterval = 10; // 更新间隔 (毫秒)
      const timeDecrement = updateInterval / 1000; // 每次减少的时间 (秒)

      this.actionTimer = setInterval(() => {
          // <<< 增加检查：确保仍在执行动作且 performingItem 有效 >>>
          if (!this.isPerformingAction || !this.performingItem) {
              clearInterval(this.actionTimer);
              this.actionTimer = null;
              console.warn("[Loop Interval] Action stopped or performingItem lost during interval.");
              // 如果 performingItem 丢失但仍在执行，调用 stopAction 清理
              if (this.isPerformingAction) {
                  this.stopAction();
              }
              return;
          }

          if (this.remainingTime > 0) {
              this.remainingTime = Math.max(0, this.remainingTime - timeDecrement);
              this.progress = ((totalTime - this.remainingTime) / totalTime) * 100;
          }

          if (this.remainingTime <= 0) {
              clearInterval(this.actionTimer);
              this.actionTimer = null;
              this.progress = 100;
              
              // <<< 保留对当前完成动作的引用，以防 completeAction 是异步的 >>>
              const itemJustCompleted = { ...this.performingItem }; 
              
              setTimeout(() => {
                  // <<< 使用 itemJustCompleted 来完成动作 >>>
                  if (!itemJustCompleted || !itemJustCompleted.name) {
                       console.error("[Loop Interval] itemJustCompleted is invalid before completeAction");
                       this.stopAction(); // 停止以防万一
                       return;
                  }
                  
                  const typeForCompletion = this.getActionTypeFromItem(itemJustCompleted.name);
                  if (typeForCompletion) {
                      // <<< 传递完成的 item 对象给 completeAction >>>
                      this.completeAction(itemJustCompleted); 
                  } else {
                      console.error(`[Loop Interval] Cannot determine type for item: ${itemJustCompleted.name}`);
                      this.stopAction(); // 停止未知类型的动作
                  }
              }, 50);
          }
      }, updateInterval);
    },
    completeAction(completedItem) { 
      // <<< 不再需要 actionType 参数，可以从 completedItem 获取 >>>
      const actionType = this.getActionTypeFromItem(completedItem.name);
      
      // <<< 使用传入的 completedItem，而不是 this.performingItem >>>
      // 因为循环时 completeAction -> startLoopingAction -> startAction 会覆盖 this.performingItem
      // 或者在 completeAction 开始时就检查 this.performingItem 是否与 completedItem 匹配？
      // 暂时信任传入的 completedItem 是正确的
      
      if (!completedItem || !completedItem.name || !actionType) { 
          console.error("CompleteAction called with invalid completedItem or could not determine actionType!", completedItem); 
          this.stopAction(); // 停止并清理状态
          return; 
      }
      
      // <<< 验证：确保传入的 completedItem 与当前认为正在执行的 item 一致 >>>
      // 这有助于捕获潜在的异步问题
      if (!this.performingItem || this.performingItem.name !== completedItem.name) {
          console.warn(`[completeAction] Mismatch or missing performingItem. Expected: ${completedItem.name}, Actual performingItem: ${this.performingItem ? this.performingItem.name : 'null'}. Completing based on passed item.`);
          // 如果不匹配，可能意味着动作已被 stopAction 中断，或者出现其他状态问题
          // 如果 this.isPerformingAction 仍然为 true，这指示一个潜在的逻辑错误
          if (this.isPerformingAction) {
              console.error("[completeAction] State inconsistency: isPerformingAction is true, but performingItem mismatch.");
              // 决定是信任 completedItem 继续，还是直接停止？
              // 暂时信任 completedItem，但需要警惕
          } else {
              // 如果 isPerformingAction 是 false，说明动作已被停止，不应再执行完成逻辑
              console.log("[completeAction] Action was already stopped. Ignoring completion.");
              return;
          }
      }

      const completedItemName = completedItem.name;
      console.log(`[completeAction] Entered for completedItem: ${completedItemName} (Type: ${actionType}), current loopingItem:`, this.loopingItem ? this.loopingItem.name : null);

      let gainedItem = null;
      let gainedAmount = 0;
      let experienceType = actionType;
      let experienceAmount = 1;

      // <<< 不再需要检查 this.dialogItem >>>
      // if (!completedItemName) { ... } // 已在函数开始处检查 completedItem

      if (!this.gameState || !this.gameState.state || !this.gameState.state.levels) { 
          console.error("CompleteAction called without a valid gameState or levels!"); 
          this.stopAction(); // 停止并清理
          return; 
      }

      const level = this.gameState.state.levels[actionType] || 0;

      try {
          // --- 完成逻辑 (使用 completedItemName) --- 
          if (actionType === GameConstants.ACTIONS.COLLECT) {
              gainedItem = null; 
              if (completedItemName === GameConstants.ITEMS.GLASS_BALL) gainedItem = GameConstants.ITEMS.GLASS_SHARD;
              else if (completedItemName === GameConstants.ITEMS.SCARE_PIGEON) gainedItem = GameConstants.ITEMS.FEATHER;
              else if (completedItemName === GameConstants.ITEMS.SHAKE_GINKGO) gainedItem = GameConstants.ITEMS.GINKGO_LEAF; 
              
              if (gainedItem) {
                  gainedAmount = GameService.calculateCollectionAmount(level);
                  console.log(`[completeAction - ${actionType}] Determined drop: ${gainedAmount}x ${gainedItem}`);
              } else {
                  if ([GameConstants.ITEMS.GLASS_BALL, GameConstants.ITEMS.SCARE_PIGEON, GameConstants.ITEMS.SHAKE_GINKGO].includes(completedItemName)) {
                      console.warn(`[completeAction - ${actionType}] No gainedItem determined for known action: ${completedItemName}`);
                  } else {
                       console.log(`[completeAction - ${actionType}] Unknown collect action or no item to gain for: ${completedItemName}`);
                  }
                  gainedAmount = 0;
              }
          }
          else if (actionType === GameConstants.ACTIONS.HUNT) {
              if (completedItemName === GameConstants.ITEMS.SHEEP) {
                  gainedItem = GameConstants.ITEMS.RAW_MUTTON;
                  gainedAmount = GameService.calculateCollectionAmount(level);
              }
          }
          else if (actionType === GameConstants.ACTIONS.FORGE) {
              if (completedItemName === GameConstants.ITEMS.GLASS_HAMMER) {
                  gainedItem = GameConstants.ITEMS.GLASS_HAMMER;
                  gainedAmount = 1; 
                  this.showTooltipMessage(`成功锻造了 ${completedItemName}！`);
              }
          }
          else if (actionType === GameConstants.ACTIONS.INTERACT) {
              if (completedItemName === GameConstants.ITEMS.BAKA_FREEZER) {
                  const targetFood = GameConstants.ITEMS.RAW_MUTTON;
                  const frozenProduct = GameConstants.ITEMS.FROZEN_MUTTON;
                  const foodCount = this.gameState.getItemCount(targetFood);
                  if (foodCount > 0) {
                      // <<< 确保消耗和产出基于完成的这个动作实例 >>>
                      // (这里的逻辑看起来没问题，因为它不直接依赖 this.performingItem)
                      if(this.gameState.removeItemFromInventory(targetFood, 1)) {
                          gainedItem = frozenProduct;
                          gainedAmount = 1; 
                          this.showTooltipMessage(`成功将 1 个 ${targetFood} 转化为 1 个 ${frozenProduct}！`);
                      } else {
                          console.error(`[completeAction] Failed to remove ${targetFood} even though count was ${foodCount}`);
                           this.showTooltipMessage(`转化失败，无法移除${targetFood}`);
                           gainedAmount = 0;
                      }
                  } else {
                      this.showTooltipMessage(`没有 ${targetFood} 可以转化了`);
                      gainedAmount = 0; 
                      // 如果没有东西可转化了，应该停止循环
                      this.loopingItem = null; 
                      console.log("[completeAction] No more food to interact with, stopping loop.");
                  }
              }
          }
      } catch (error) {
          console.error("Error in completeAction yield/product logic:", error);
          gainedAmount = 0; 
          gainedItem = null;
      }

      // --- 处理获得物品和经验 ---
      if (gainedItem && gainedAmount > 0) {
        console.log(`[completeAction] Attempting to add item: ${gainedAmount}x ${gainedItem}`);
        this.gameState.addItemToInventory(gainedItem, gainedAmount);
      } else {
        console.log(`[completeAction] No item gained (item: ${gainedItem}, amount: ${gainedAmount})`);
      }
      if (experienceType && experienceAmount > 0 && this.gameState.state.experience) {
        console.log(`[completeAction] Attempting to gain XP: ${experienceAmount} for ${experienceType}`);
        this.gameState.gainExperience(experienceType, experienceAmount);
      } else {
        console.log(`[completeAction] No XP gained (type: ${experienceType}, amount: ${experienceAmount})`);
        if (!this.gameState.state.experience) {
           console.warn("[completeAction] Experience state object not found.");
        }
      }

      // --- 处理循环 ---
      console.log(`[completeAction] Checking loop condition: loopingItem=${this.loopingItem ? this.loopingItem.name : null}, actionType=${actionType}, isPerformingAction=${this.isPerformingAction}`);
      
      // <<< 确保循环检查也使用正确的 item 信息 (loopingItem 来自 startAction) >>>
      if (this.loopingItem && 
          (actionType === GameConstants.ACTIONS.COLLECT || 
           actionType === GameConstants.ACTIONS.HUNT ||
           actionType === GameConstants.ACTIONS.INTERACT) &&
           this.isPerformingAction // 确保动作没有在中途被停止
         ) 
      {
         console.log(`[completeAction] Loop condition met for ${actionType}. Calling startLoopingAction.`);
         // 如果是因为没有转化目标而停止 (见上面 INTERACT 逻辑，已将 loopingItem 设为 null)
         if (!this.loopingItem) { 
             console.log("[completeAction] Loop was stopped internally (e.g., no more items). Resetting state.");
             this.isPerformingAction = false;
             this.performingItem = null; // <<< 清理 performingItem >>>
             this.resetActionState(); // 重置进度条等
         } else {
            // 准备开始下一次循环
            // 注意：startLoopingAction -> startAction 会重新设置 performingItem
            this.startLoopingAction(); 
         }
      } else {
        // 动作不循环，或循环条件不满足，或动作已被停止
        console.log(`[completeAction] Loop condition not met or action is non-looping (${actionType}) or action stopped. Resetting state.`);
        this.isPerformingAction = false;
        this.loopingItem = null;
        this.performingItem = null; // <<< 清理 performingItem >>>
        this.resetActionState(); // 重置进度条等
      }

      this.autoSaveGame();
      this.$forceUpdate(); // 确保UI更新
    },
    // 通用循环启动方法
    startLoopingAction() {
      // 这个方法本质上是重新调用 startAction，但需要确保 item 信息正确
      // 它依赖 this.loopingItem，这个值是在上一次 startAction 中设置的
      
      // <<< 再次检查并修正 startLoopingAction 逻辑 >>>
      if (!this.loopingItem || !this.loopingItem.name) {
          console.warn("[startLoopingAction] Invalid loopingItem. Stopping action.");
          this.stopAction(); // 调用 stopAction 来清理状态
          return;
      }
      
      // 确保仍在执行状态，否则不开始新的循环
      // (completeAction 已经检查过 isPerformingAction)
      if (!this.isPerformingAction) {
          console.log("[startLoopingAction] Action was stopped before loop could restart.");
          // stopAction 应该已经清理了状态，这里不需要额外操作
          return;
      }

      console.log(`[startLoopingAction] Restarting action for loop: ${this.loopingItem.name}`);
      
      // <<< 直接调用 startAction 来处理循环启动 >>>
      // false 参数表示不要关闭对话框（如果它意外打开了）
      // 注意：startAction 会覆盖 performingItem 和 loopingItem (如果适用)
      this.startAction(this.loopingItem, false); 
    },
    // 停止动作
    stopAction() {
      console.log(`[stopAction] Called. Current timer: ${this.actionTimer}, isPerforming: ${this.isPerformingAction}`);
      if (this.actionTimer) {
        clearInterval(this.actionTimer);
        this.actionTimer = null;
      }
      // 只有当确实在执行动作时才重置状态
      if (this.isPerformingAction) {
        this.isPerformingAction = false;
        this.loopingItem = null; // 停止时清除循环目标
        this.performingItem = null; // <<< 清理 performingItem >>>
        this.resetActionState(); // 重置UI状态 (进度条等)
        console.log("[stopAction] Action stopped by user or logic.");
      } else {
        // 如果调用 stopAction 时并未在执行动作，确保 performingItem 也被清理
         if (this.performingItem) {
             console.warn("[stopAction] Called while not performing, but performingItem was set. Clearing.");
             this.performingItem = null;
         }
      }
    },
    // 打开对话框
    openDialog(item) {
      this.dialogItem = item;
      this.dialogVisible = true;

      const actionType = this.getActionTypeFromItem(item.name);
      const description = GameService.generateItemDescription(
        item,
        this.gameState.state.levels[actionType] || 0 // 处理新技能等级可能不存在的情况
      );

      // 计算并显示实际动作时间 (考虑加成等)
      const actualTime = this.calculateActionTime(item);
      description.time = `${actualTime.toFixed(1)} 秒`;

      // 添加特定物品的特殊描述 (例如装备效果)
      if (this.gameState.isEquipped(GameConstants.ITEMS.GLASS_HAMMER) &&
          item.name === GameConstants.ITEMS.GLASS_BALL) {
        description.special = "装备效果: 玻璃锤减少10%的敲打玻璃球时间";
      }
      // 可以为狩猎、交互等添加类似效果描述

      this.dialogDescription = description;
    },
    closeDialog() {
      this.dialogVisible = false;
    },
    // *** 通用计算动作时间的方法 ***
    calculateActionTime(item) {
      if (!item || !item.name) return 0;
      let baseTime = 0;
      const itemName = item.name;

      // 根据物品名称确定基础时间
      if (itemName === GameConstants.ITEMS.GLASS_BALL) baseTime = GameConstants.ACTION_TIMES.COLLECT;
      else if (itemName === GameConstants.ITEMS.SCARE_PIGEON) baseTime = GameConstants.ACTION_TIMES.SCARE_PIGEON;
      else if (itemName === GameConstants.ITEMS.SHAKE_GINKGO) baseTime = GameConstants.ACTION_TIMES.SHAKE_GINKGO;
      else if (itemName === GameConstants.ITEMS.SHEEP) baseTime = GameConstants.ACTION_TIMES.HUNT;
      else if (itemName === GameConstants.ITEMS.GLASS_HAMMER) baseTime = GameConstants.ACTION_TIMES.FORGE;
      else if (itemName === GameConstants.ITEMS.BAKA_FREEZER) baseTime = GameConstants.ACTION_TIMES.INTERACT;
      else {
          console.warn("Calculating time for unknown item:", itemName);
          return 0;
      }

      // --- 应用各种时间修正 (例如装备效果) ---
      // 采集 - 玻璃锤效果
      if (this.getActionTypeFromItem(itemName) === GameConstants.ACTIONS.COLLECT &&
          itemName === GameConstants.ITEMS.GLASS_BALL &&
          this.gameState.isEquipped(GameConstants.ITEMS.GLASS_HAMMER)) {
        baseTime *= 0.9; // 减少10%时间
      }

      // --- 可以添加狩猎、交互等的时间修正 ---
      // if (this.getActionTypeFromItem(itemName) === GameConstants.ACTIONS.HUNT && ... ) {
      //    baseTime *= ...
      // }

      return Math.max(0.1, baseTime); // 确保时间不为0或负数，至少0.1秒
    },
    // *** 辅助函数：根据物品名称获取对应的动作类型 ***
    getActionTypeFromItem(itemName) {
        if ([GameConstants.ITEMS.GLASS_BALL, GameConstants.ITEMS.SCARE_PIGEON, GameConstants.ITEMS.SHAKE_GINKGO].includes(itemName)) {
            return GameConstants.ACTIONS.COLLECT;
        }
        if ([GameConstants.ITEMS.SHEEP].includes(itemName)) {
            return GameConstants.ACTIONS.HUNT;
        }
        if ([GameConstants.ITEMS.GLASS_HAMMER].includes(itemName)) {
            return GameConstants.ACTIONS.FORGE;
        }
        if ([GameConstants.ITEMS.BAKA_FREEZER].includes(itemName)) {
            return GameConstants.ACTIONS.INTERACT;
        }
        return null; // 未知物品或非动作目标物品
    },
    // <<< 重新添加 handleEquipItem 方法 >>>
    handleEquipItem(itemName) {
      if (this.gameState.equipItem(itemName)) {
        this.showTooltipMessage(`已装备 ${itemName}`);
        // 可以在此添加逻辑，例如重新计算当前动作时间
      } else {
        this.showTooltipMessage(`装备 ${itemName} 失败 (可能未拥有或槽位冲突)`);
      }
      this.$forceUpdate(); // 确保侧边栏状态更新
    },
    // <<< 重新添加 _loadGame 方法 >>>
    _loadGame() {
      try {
        const savedData = localStorage.getItem('gameData');
        if (!savedData) {
          this.gameState.initializeNewSkills(); // 确保新技能被初始化
          console.log("No saved game found, initializing new skills.");
          return false;
        }

        const gameData = JSON.parse(savedData);

        // 合并加载的数据
        this.gameState.state.levels = { ...this.gameState.state.levels, ...gameData.levels };
        this.gameState.state.experience = { ...this.gameState.state.experience, ...gameData.experience };
        this.gameState.state.inventory = { ...this.gameState.state.inventory, ...gameData.inventory };
        this.gameState.state.equipment = { ...this.gameState.state.equipment, ...gameData.equipment };

        // 再次调用以确保任何在常量中新增但在存档中没有的技能也被初始化
        this.gameState.initializeNewSkills();

        console.log('游戏数据已加载');
        return true;
      } catch (error) {
        console.error('加载游戏失败：', error);
        this.gameState.initializeNewSkills(); // 加载失败也尝试初始化
        // 可以考虑重置游戏状态或给出提示
        // this.gameState.resetState();
        return false;
      }
    },
    // <<< 重新添加 autoSaveGame 方法 (确保存在) >>>
    autoSaveGame() {
      try {
        const gameData = JSON.stringify({
          levels: this.gameState.state.levels,
          experience: this.gameState.state.experience,
          inventory: this.gameState.state.inventory,
          equipment: this.gameState.state.equipment
        });
        localStorage.setItem('gameData', gameData);
        // console.log('游戏已自动保存'); // 可以取消注释以进行调试
      } catch (error) {
        console.error('自动保存游戏失败：', error);
      }
    },
     // <<< 重新添加 showTooltipMessage 方法 (确保存在) >>>
    showTooltipMessage(message) {
      this.tooltipText = message;
      this.tooltipX = window.innerWidth / 2 - 125; // Center horizontally
      this.tooltipY = window.innerHeight / 4; // Position towards top-center
      this.showTooltip = true;
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
      }
      this.tooltipTimer = setTimeout(() => {
        this.showTooltip = false;
      }, 3000);
    }
  },
  mounted() {
    // 尝试自动加载游戏数据，并初始化新技能（如果需要）
    this._loadGame();

    // 默认显示第一个动作（采集）的项目
    this.switchAction(this.actions[0]);

    // 设置定时自动保存
    setInterval(() => {
      this.autoSaveGame();
    }, 5 * 60 * 1000); // 5 minutes
  }
};
</script>

<style scoped>
.game-home {
  text-align: center;
  font-family: Arial, sans-serif;
}

/* .tooltip { ... } // 可以暂时注释掉样式 */
</style>