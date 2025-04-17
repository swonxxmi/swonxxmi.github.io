<template>
  <div class="game-home">
    <GameHeader 
      :current-action="currentAction"
      :remaining-time="remainingTime"
      :progress="progress"
      :is-performing-action="isPerformingAction"
      @stop-action="stopAction"
    />

    <!-- 显示当前 Buff -->
    <div v-if="activeBuff.name" class="active-buff">
      状态: {{ activeBuff.name }} ({{ activeBuff.duration }}秒)
    </div>

    <ActionTypes 
      :levels="gameState.state.levels"
      :experience="gameState.state.experience"
      :actions="actions"
      @switch-action="switchAction"
    />
    
    <ItemList 
      :items="items"
      :show-items="showItems"
      :levels="gameState.state.levels"
      :level-requirements="GameConstants.LEVEL_REQUIREMENTS"
      :get-action-type-from-item="getActionTypeFromItem"
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
    
    <ExploreArea 
      :handle-explore-action="handleExploreAction"
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
import ExploreArea from '@/components/game/ExploreArea.vue';
import GameService from '@/services/GameService';
import GameConstants from '@/constants/GameConstants';
import gameState from '@/store/gameState';
import PozuImage from '@/assets/pozu.png'; // 导入图片

export default {
  name: 'GameHome',
  components: {
    GameHeader,
    ActionTypes,
    ItemList,
    GameDialog,
    Sidebar,
    ExploreArea,
  },
  data() {
    return {
      gameState,
      GameConstants,
      currentAction: "无操作",
      remainingTime: 0,
      actionTimer: null,
      isPerformingAction: false,
      progress: 0,
      actions: Object.values(GameConstants.ACTIONS), // 包含所有 ACTIONS
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
      loopingItem: null,
      performingItem: null,
      activeBuff: { name: null, duration: 0 }, // 添加 buff 状态
      buffTimer: null, // 添加 buff 计时器
    };
  },
  methods: {
    switchAction(action) {
      console.log(`[switchAction] Switching to display items for: ${action}`);
      this.updateItemList(action);
      console.log(`[switchAction] State after updateItemList - currentAction: ${this.currentAction}, progress: ${this.progress}, remainingTime: ${this.remainingTime}, isPerformingAction: ${this.isPerformingAction}`);
    },
    updateItemList(action) {
      this.showItems = true;
      this.items = [];
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
          { image: GameConstants.getItemImage(GameConstants.ITEMS.GLASS_HAMMER), name: GameConstants.ITEMS.GLASS_HAMMER },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.FEATHER_HELMET), name: GameConstants.ITEMS.FEATHER_HELMET },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.PIGEON_GUN), name: GameConstants.ITEMS.PIGEON_GUN }
        ];
      } else if (action === GameConstants.ACTIONS.INTERACT) {
        this.items = [
          { image: GameConstants.getItemImage(GameConstants.ITEMS.BAKA_FREEZER), name: GameConstants.ITEMS.BAKA_FREEZER },
          { image: PozuImage, name: GameConstants.ITEMS.SING_A_SONG }
        ];
      } else {
        console.warn(`[updateItemList] Unknown action type: ${action}`);
        this.showItems = false;
      }
    },
    resetActionState() {
      this.remainingTime = 0;
      this.progress = 0;
      this.currentAction = "无操作";
      console.log("[resetActionState] UI state reset (time, progress, text)");
    },
    startAction(newItem, closeDialog = true) {
      // 检查是否正在执行不同的操作，但先不停止
      const shouldStopPrevious = this.isPerformingAction && this.performingItem && newItem.name !== this.performingItem.name;
      if (shouldStopPrevious) {
          console.log("[startAction] New different action requested. Will stop previous if checks pass.");
      }

      // 清理之前的 newItem 引用问题，确保总是用最新的
      if (this.actionTimer) {
        clearInterval(this.actionTimer);
        this.actionTimer = null;
      }
      
      this.progress = 0;
      this.remainingTime = 0;
      this.loopingItem = null;

      if (closeDialog) {
        this.dialogItem = newItem; 
      }
      
      if (!newItem || !newItem.name) {
          console.error("startAction called with invalid newItem");
          this.performingItem = null; 
          return;
      }
      
      this.performingItem = { ...newItem };

      const itemName = this.performingItem.name;
      let actionType = this.getActionTypeFromItem(itemName);
      let actionTime = 0;

      console.log(`[startAction] Attempting action for item: ${itemName}, detected actionType: ${actionType}`);

      // --- 等级检查 ---
      const requiredLevel = GameConstants.LEVEL_REQUIREMENTS[Symbol.for(itemName)] || GameConstants.LEVEL_REQUIREMENTS.DEFAULT;
      const currentLevel = this.gameState.state.levels[actionType] || 0;
      console.log(`[startAction Level Check] Item: ${itemName}, ActionType: ${actionType}, Required: ${requiredLevel}, Current: ${currentLevel}`);
      if (currentLevel < requiredLevel) {
        this.showTooltipMessage(`等级不足：需要 ${actionType} 等级 ${requiredLevel}`);
        this.performingItem = null;
        return;
      }
      // --- 结束等级检查 ---

      // --- 材料/条件检查（将 return 放在这里，检查失败则不关闭对话框） ---
      let prerequisitesMet = true; // 标记先决条件是否满足
      if (actionType === GameConstants.ACTIONS.FORGE) {
        const recipe = GameConstants.CONSUMPTION[itemName];
        if (!recipe) {
          this.showTooltipMessage(`错误：找不到 ${itemName} 的配方`);
          prerequisitesMet = false; // 条件不满足
        } else {
          let hasMaterials = true;
          let missingMaterial = '';
          for (const [material, amount] of Object.entries(recipe)) {
            if (this.gameState.getItemCount(material) < amount) {
              missingMaterial = `${amount} x ${material}`;
              hasMaterials = false;
              break;
            }
          }
          if (!hasMaterials) {
            console.warn(`[startAction] Forge failed for ${itemName} due to insufficient materials (Missing: ${missingMaterial}).`);
            this.showTooltipMessage(`锻造失败：材料不足 (${missingMaterial})`);
            prerequisitesMet = false; // 条件不满足
          }
        }
      } else if (actionType === GameConstants.ACTIONS.INTERACT) {
        if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
          const catalyst = GameConstants.ITEMS.GINKGO_LEAF;
          const requiredCatalyst = GameConstants.CONSUMPTION[itemName]?.[catalyst] || 0;
          if (this.gameState.getItemCount(catalyst) < requiredCatalyst) {
            this.showTooltipMessage(`材料不足：需要 ${requiredCatalyst} x ${catalyst}`);
            prerequisitesMet = false; // 条件不满足
          }
          const targetFood = GameConstants.ITEMS.RAW_MUTTON;
          if (this.gameState.getItemCount(targetFood) <= 0 && prerequisitesMet) { // 只有在催化剂满足时才检查这个
            this.showTooltipMessage(`没有 ${targetFood} 可供转化`);
            prerequisitesMet = false; // 条件不满足
          }
        } else if (itemName === GameConstants.ITEMS.SING_A_SONG) {
          let canPerform = false;
          for (const invItemName in this.gameState.state.inventory) {
            if (this.gameState.state.inventory[invItemName] > 0 && this.isFood(invItemName)) {
              canPerform = true;
              break;
            }
          }
          if (!canPerform) {
            this.showTooltipMessage(`没有可用的食物来执行 ${GameConstants.ITEMS.SING_A_SONG}`);
            prerequisitesMet = false; // 条件不满足
          }
        }
      }
      // --- 结束材料/条件检查 ---

      // 如果任何检查失败，则清理并退出，保持对话框打开
      if (!prerequisitesMet) {
        this.performingItem = null;
        return;
      }

      // --- 如果所有检查通过，现在准备开始动作 --- 

      // 如果需要，现在停止之前的动作
      if (shouldStopPrevious) {
          console.log("[startAction] Prerequisite checks passed. Stopping previous action now.");
          this.stopAction();
      }

      // 在这里消耗材料（如果适用且还没消耗）
      if (actionType === GameConstants.ACTIONS.FORGE) {
          const recipe = GameConstants.CONSUMPTION[itemName];
          // 再次确认 recipe 存在 (虽然上面检查过，但更安全)
          if (recipe) { 
              for (const [material, amount] of Object.entries(recipe)) {
                  // 此时我们知道材料是足够的
                  this.gameState.removeItemFromInventory(material, amount);
              }
              console.log(`[startAction] Consumed materials for ${itemName}`);
              this.currentAction = `锻造 ${itemName}`;
              actionTime = this.calculateActionTime(this.performingItem);
          } else {
              // 这理论上不应该发生
              console.error(`[startAction] Recipe check inconsistency for ${itemName}.`);
              this.performingItem = null;
              return;
          }
      }
      else if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
          const catalyst = GameConstants.ITEMS.GINKGO_LEAF;
          const requiredCatalyst = GameConstants.CONSUMPTION[itemName]?.[catalyst] || 0;
          // 消耗催化剂
          this.gameState.removeItemFromInventory(catalyst, requiredCatalyst);
          console.log(`[startAction] Consumed catalyst: ${requiredCatalyst}x ${catalyst}`);
          this.currentAction = itemName;
          actionTime = this.calculateActionTime(this.performingItem);
          this.loopingItem = this.performingItem;
      }
      // 其他动作类型逻辑 (采集、狩猎、唱歌等，它们通常在 completeAction 中处理消耗)
      else if (actionType === GameConstants.ACTIONS.COLLECT) {
        this.currentAction = itemName;
        actionTime = this.calculateActionTime(this.performingItem);
        this.loopingItem = this.performingItem;
      }
      else if (actionType === GameConstants.ACTIONS.HUNT) {
        this.currentAction = itemName;
        actionTime = this.calculateActionTime(this.performingItem);
        this.loopingItem = this.performingItem;
      }
      else if (actionType === GameConstants.ACTIONS.INTERACT) {
          this.currentAction = itemName;
          actionTime = this.calculateActionTime(this.performingItem);

          if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
              const catalyst = GameConstants.ITEMS.GINKGO_LEAF;
              const requiredCatalyst = GameConstants.CONSUMPTION[itemName]?.[catalyst] || 0;
              if (this.gameState.getItemCount(catalyst) < requiredCatalyst) {
                  this.showTooltipMessage(`材料不足：需要 ${requiredCatalyst} x ${catalyst}`);
                   this.performingItem = null;
                  return;
              }
              const targetFood = GameConstants.ITEMS.RAW_MUTTON;
              if (this.gameState.getItemCount(targetFood) <= 0) {
                  this.showTooltipMessage(`没有 ${targetFood} 可供转化`);
                   this.performingItem = null;
                  return;
              }
              this.gameState.removeItemFromInventory(catalyst, requiredCatalyst);
              console.log(`[startAction] Consumed catalyst: ${requiredCatalyst}x ${catalyst}`);
              this.loopingItem = this.performingItem;
          }
          else if (itemName === GameConstants.ITEMS.SING_A_SONG) {
            console.log("[startAction] Initiating Sing a Song...");
            // 检查是否有食物，但不消耗也不应用 buff
            let canPerform = false;
            for (const invItemName in this.gameState.state.inventory) {
              if (this.gameState.state.inventory[invItemName] > 0 && this.isFood(invItemName)) {
                canPerform = true;
                break;
              }
            }

            if (!canPerform) {
              this.showTooltipMessage(`没有可用的食物来执行 ${GameConstants.ITEMS.SING_A_SONG}`);
              this.performingItem = null;
              return;
            }

            // 只设置动作名称和时间，效果在 completeAction 处理
            this.currentAction = GameConstants.ITEMS.SING_A_SONG;
            actionTime = this.calculateActionTime(this.performingItem);
            this.loopingItem = null; // 不循环
          }
      }
      else if (actionType === GameConstants.ACTIONS.EXPLORE) {
          this.currentAction = itemName;
          actionTime = this.calculateActionTime(this.performingItem);
          this.loopingItem = this.performingItem;
          console.log(`[startAction] Starting EXPLORE action: ${itemName}, time: ${actionTime}`);
      }
      else {
        console.error("Unknown item started or unhandled action type:", itemName, actionType);
         this.performingItem = null;
        return;
      }

      console.log(`[startAction] Determined actionTime: ${actionTime}, loopingItem set to:`, this.loopingItem ? this.loopingItem.name : null);

      if (actionTime <= 0) {
          console.error("Calculated action time is zero or negative for:", itemName);
           this.performingItem = null;
          return;
      }

      this.remainingTime = actionTime;
      this.progress = 0;
      this.isPerformingAction = true;

      if (closeDialog) {
        this.dialogVisible = false;
      }

      const totalTime = this.remainingTime;
      const updateInterval = 10;
      const timeDecrement = updateInterval / 1000;

      this.actionTimer = setInterval(() => {
          if (!this.isPerformingAction || !this.performingItem) {
              clearInterval(this.actionTimer);
              this.actionTimer = null;
              console.warn("[Loop Interval] Action stopped or performingItem lost during interval.");
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
              
              const itemJustCompleted = { ...this.performingItem }; 
              
              setTimeout(() => {
                  if (!itemJustCompleted || !itemJustCompleted.name) {
                       console.error("[Loop Interval] itemJustCompleted is invalid before completeAction");
                       this.stopAction();
                       return;
                  }
                  
                  const typeForCompletion = this.getActionTypeFromItem(itemJustCompleted.name);
                  if (typeForCompletion) {
                      this.completeAction(itemJustCompleted); 
                  } else {
                      console.error(`[Loop Interval] Cannot determine type for item: ${itemJustCompleted.name}`);
                      this.stopAction();
                  }
              }, 50);
          }
      }, updateInterval);
    },
    completeAction(completedItem) {
      const actionType = this.getActionTypeFromItem(completedItem.name);
      
      if (!completedItem || !completedItem.name || !actionType) { 
          console.error("CompleteAction called with invalid completedItem or could not determine actionType!", completedItem); 
          this.stopAction();
          return; 
      }
      
      if (!this.performingItem || this.performingItem.name !== completedItem.name) {
          console.warn(`[completeAction] Mismatch or missing performingItem. Expected: ${completedItem.name}, Actual performingItem: ${this.performingItem ? this.performingItem.name : 'null'}. Completing based on passed item.`);
          if (this.isPerformingAction) {
              console.error("[completeAction] State inconsistency: isPerformingAction is true, but performingItem mismatch.");
          } else {
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
      let applySingBuff = false;
      let shouldContinueLoop = true; // 新增：控制是否继续循环的标志

      if (!this.gameState || !this.gameState.state || !this.gameState.state.levels) { 
          console.error("CompleteAction called without a valid gameState or levels!"); 
          this.stopAction();
          return; 
      }

      const level = this.gameState.state.levels[actionType] || 0;

      try {
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
              if ([GameConstants.ITEMS.GLASS_HAMMER, 
                   GameConstants.ITEMS.PIGEON_GUN, 
                   GameConstants.ITEMS.FEATHER_HELMET].includes(completedItemName)) {
                  const recipe = GameConstants.CONSUMPTION[completedItemName];
                  if (!recipe) {
                      console.error(`[completeAction] Recipe not found for ${completedItemName} during completion.`);
                      this.showTooltipMessage(`错误：找不到 ${completedItemName} 的配方`);
                      gainedAmount = 0;
                  } else {
                      let hasMaterials = true;
                      let missingMaterial = '';
                      for (const [material, amount] of Object.entries(recipe)) {
                          if (this.gameState.getItemCount(material) < amount) {
                              missingMaterial = `${amount} x ${material}`;
                              hasMaterials = false;
                              break;
                          }
                      }

                      if (hasMaterials) {
                          for (const [material, amount] of Object.entries(recipe)) {
                              this.gameState.removeItemFromInventory(material, amount);
                          }
                          gainedItem = completedItemName;
                          gainedAmount = 1;
                          this.showTooltipMessage(`成功锻造了 ${completedItemName}！`);
                      } else {
                          console.warn(`[completeAction] Forge failed for ${completedItemName} due to insufficient materials (Missing: ${missingMaterial}).`);
                          this.showTooltipMessage(`锻造失败：材料不足 (${missingMaterial})`);
                          gainedAmount = 0;
                          shouldContinueLoop = false; // 材料不足时停止循环
                      }
                  }
              }
          }
          else if (actionType === GameConstants.ACTIONS.INTERACT) {
              if (completedItemName === GameConstants.ITEMS.BAKA_FREEZER) {
                  const targetFood = GameConstants.ITEMS.RAW_MUTTON;
                  const frozenProduct = GameConstants.ITEMS.FROZEN_MUTTON;
                  const foodCount = this.gameState.getItemCount(targetFood);
                  if (foodCount > 0) {
                      if(this.gameState.removeItemFromInventory(targetFood, 1)) {
                          gainedItem = frozenProduct;
                          gainedAmount = 1; 
                          this.showTooltipMessage(`成功将 1 个 ${targetFood} 转化为 1 个 ${frozenProduct}！`);
                      } else {
                          console.error(`[completeAction] Failed to remove ${targetFood} even though count was ${foodCount}`);
                           this.showTooltipMessage(`转化失败，无法移除${targetFood}`);
                           gainedAmount = 0;
                           shouldContinueLoop = false;
                      }
                  } else {
                      this.showTooltipMessage(`没有 ${targetFood} 可以转化了`);
                      gainedAmount = 0; 
                      shouldContinueLoop = false;
                  }
              }
              else if (completedItemName === GameConstants.ITEMS.SING_A_SONG) {
                  console.log("[completeAction] Completing Sing a Song...");
                  let foundFood = null;
                  let foodName = null;
                  for (const invItemName in this.gameState.state.inventory) {
                      if (this.gameState.state.inventory[invItemName] > 0 && this.isFood(invItemName)) {
                          foundFood = invItemName;
                          foodName = invItemName;
                          break;
                      }
                  }

                  if (foundFood) {
                      const quality = this.getFoodQuality(foundFood);
                      if (quality > 0) {
                          if (this.gameState.removeItemFromInventory(foundFood, 1)) {
                              console.log(`[completeAction] Consumed ${foodName} for Sing a Song.`);
                              applySingBuff = true;
                              this.applyBuff(quality);
                              experienceAmount = 2;
                          } else {
                              console.error(`[completeAction] Failed to remove ${foodName}.`);
                              this.showTooltipMessage(`错误：无法消耗 ${foodName}`);
                              shouldContinueLoop = false;
                          }
                      } else {
                          this.showTooltipMessage(`错误：${foodName} 品质为 0，无法获得效果`);
                          shouldContinueLoop = false;
                      }
                  } else {
                      console.log("[completeAction] No food available to consume upon Sing a Song completion.");
                      this.showTooltipMessage(`完成时没有食物可消耗`);
                      shouldContinueLoop = false;
                  }
                  gainedItem = null;
                  gainedAmount = 0;
              }
          }
      } catch (error) {
          console.error("Error in completeAction:", error);
          gainedAmount = 0; 
          gainedItem = null;
          shouldContinueLoop = false;
      }

      // --- Buff 效果：几率双倍产出 ---
      if (this.activeBuff.name === "歌手状态" && gainedAmount > 0 && completedItemName !== GameConstants.ITEMS.SING_A_SONG) {
          const buffChance = 0.15;
          if (Math.random() < buffChance) {
              console.log(`[Buff Effect] Singer Status triggered! Doubling ${gainedItem} amount.`);
              gainedAmount *= 2;
              this.showTooltipMessage(`🎶 歌手状态加成！获得双倍 ${gainedItem}！`);
          }
      }

      if (gainedItem && gainedAmount > 0) {
        console.log(`[completeAction] Attempting to add item: ${gainedAmount}x ${gainedItem}`);
        this.gameState.addItemToInventory(gainedItem, gainedAmount);
      } else {
        console.log(`[completeAction] No item gained (item: ${gainedItem}, amount: ${gainedAmount})`);
      }
      if (experienceType && experienceAmount > 0 && this.gameState.state.experience) {
        console.log(`[completeAction] Attempting to gain XP: ${experienceAmount} for ${experienceType}`);
        // 锻造和交互动作给予5点经验
        if (experienceType === GameConstants.ACTIONS.FORGE || experienceType === GameConstants.ACTIONS.INTERACT) {
          experienceAmount = 5;
        }
        this.gameState.gainExperience(experienceType, experienceAmount);
      } else {
        console.log(`[completeAction] No XP gained (type: ${experienceType}, amount: ${experienceAmount})`);
        if (!this.gameState.state.experience) {
           console.warn("[completeAction] Experience state object not found.");
        }
      }

      console.log(`[completeAction] Checking loop condition: loopingItem=${this.loopingItem ? this.loopingItem.name : null}, actionType=${actionType}, isPerformingAction=${this.isPerformingAction}, shouldContinueLoop=${shouldContinueLoop}`);
      
      if (this.loopingItem && 
          (actionType === GameConstants.ACTIONS.COLLECT || 
           actionType === GameConstants.ACTIONS.HUNT ||
           actionType === GameConstants.ACTIONS.INTERACT) &&
           this.isPerformingAction &&
           shouldContinueLoop) 
      {
         console.log(`[completeAction] Loop condition met for ${actionType}. Calling startLoopingAction.`);
         this.startLoopingAction();
      } else {
        console.log(`[completeAction] Loop condition not met or action is non-looping (${actionType}) or action stopped. Resetting state.`);
        this.isPerformingAction = false;
        this.loopingItem = null;
        this.performingItem = null;
        this.resetActionState();
      }

      this.autoSaveGame();
      this.$forceUpdate();

      if (this.currentAction) {
        // 应用buff效果
        const buffs = this.$store.state.game.buffs;
        for (const buffName in buffs) {
          if (buffs[buffName].effect === 'doubleXP') {
            experienceAmount *= 2;
          }
        }

        this.$store.commit('game/gainExperience', experienceAmount);
        this.currentAction = null;
        this.progress = 0;
      }
    },
    startLoopingAction() {
      if (!this.loopingItem || !this.loopingItem.name) {
          console.warn("[startLoopingAction] Invalid loopingItem. Stopping action.");
          this.stopAction();
          return;
      }
      
      if (!this.isPerformingAction) {
          console.log("[startLoopingAction] Action was stopped before loop could restart.");
          return;
      }

      console.log(`[startLoopingAction] Restarting action for loop: ${this.loopingItem.name}`);
      
      this.startAction(this.loopingItem, false); 
    },
    stopAction() {
      console.log(`[stopAction] Called. Current timer: ${this.actionTimer}, isPerforming: ${this.isPerformingAction}`);
      if (this.actionTimer) {
        clearInterval(this.actionTimer);
        this.actionTimer = null;
      }
      if (this.isPerformingAction) {
        this.isPerformingAction = false;
        this.loopingItem = null;
        this.performingItem = null;
        this.resetActionState();
        console.log("[stopAction] Action stopped by user or logic.");
      } else {
         if (this.performingItem) {
             console.warn("[stopAction] Called while not performing, but performingItem was set. Clearing.");
             this.performingItem = null;
         }
      }
    },
    openDialog(item) {
      this.dialogItem = item;
      this.dialogVisible = true;
      this.dialogDescription = this.getItemDescription(item);
      
      if (this.isFood(item.name)) {
        this.handleItemUse(item);
      }
    },
    closeDialog() {
      this.dialogVisible = false;
    },
    calculateActionTime(item) {
      if (!item || !item.name) return 0;
      let baseTime = 0;
      const itemName = item.name;
      const actionType = this.getActionTypeFromItem(itemName);

      if (actionType === GameConstants.ACTIONS.COLLECT) {
          if (itemName === GameConstants.ITEMS.GLASS_BALL) baseTime = GameConstants.ACTION_TIMES.COLLECT;
          else if (itemName === GameConstants.ITEMS.SCARE_PIGEON) baseTime = GameConstants.ACTION_TIMES.SCARE_PIGEON;
          else if (itemName === GameConstants.ITEMS.SHAKE_GINKGO) baseTime = GameConstants.ACTION_TIMES.SHAKE_GINKGO;
      } else if (actionType === GameConstants.ACTIONS.HUNT) {
          if (itemName === GameConstants.ITEMS.SHEEP) baseTime = GameConstants.ACTION_TIMES.HUNT;
      } else if (actionType === GameConstants.ACTIONS.FORGE) {
          if (itemName === GameConstants.ITEMS.GLASS_HAMMER) baseTime = GameConstants.ACTION_TIMES.FORGE;
          else if (itemName === GameConstants.ITEMS.PIGEON_GUN) baseTime = GameConstants.ACTION_TIMES.FORGE_PIGEON_GUN;
          else if (itemName === GameConstants.ITEMS.FEATHER_HELMET) baseTime = GameConstants.ACTION_TIMES.FORGE_FEATHER_HELMET;
      } else if (actionType === GameConstants.ACTIONS.EXPLORE) {
          baseTime = GameConstants.ACTION_TIMES[itemName] || 3;
      } else if (actionType === GameConstants.ACTIONS.INTERACT) {
          if (itemName === GameConstants.ITEMS.BAKA_FREEZER) baseTime = GameConstants.ACTION_TIMES.INTERACT;
          else if (itemName === GameConstants.ITEMS.SING_A_SONG) baseTime = GameConstants.ACTION_TIMES.SING_A_SONG;
      }
      else {
          console.warn("Calculating time for unknown item/action:", itemName);
          return 0;
      }

      if (this.gameState.isEquipped(GameConstants.ITEMS.FEATHER_HELMET)) {
        baseTime *= 0.96;
      }

      if (this.gameState.isEquipped(GameConstants.ITEMS.PIGEON_GUN)) {
        if (actionType === GameConstants.ACTIONS.COLLECT) {
          baseTime *= 0.9;
        } else if (actionType === GameConstants.ACTIONS.HUNT) {
          baseTime *= 0.8;
        }
      }

      if (actionType === GameConstants.ACTIONS.COLLECT &&
          itemName === GameConstants.ITEMS.GLASS_BALL &&
          this.gameState.isEquipped(GameConstants.ITEMS.GLASS_HAMMER)) {
        baseTime *= 0.9;
      }

      if (this.gameState.isEquipped(GameConstants.ITEMS.BUTTERFLY_CLOAK)) {
        baseTime *= 0.92;
      }

      return Math.max(0.1, baseTime);
    },
    getActionTypeFromItem(itemName) {
        if (itemName === GameConstants.ITEMS.SING_A_SONG) { // 更新为 SING_A_SONG
            return GameConstants.ACTIONS.INTERACT;
        }
        if ([GameConstants.ITEMS.MINE_CRYSTAL,
             GameConstants.ITEMS.HARVEST_HERB,
             GameConstants.ITEMS.CATCH_BUTTERFLY].includes(itemName)) {
            return GameConstants.ACTIONS.EXPLORE;
        }
        if ([GameConstants.ITEMS.GLASS_BALL, GameConstants.ITEMS.SCARE_PIGEON, GameConstants.ITEMS.SHAKE_GINKGO].includes(itemName)) {
            return GameConstants.ACTIONS.COLLECT;
        }
        if ([GameConstants.ITEMS.SHEEP].includes(itemName)) {
            return GameConstants.ACTIONS.HUNT;
        }
        if ([GameConstants.ITEMS.GLASS_HAMMER, 
             GameConstants.ITEMS.PIGEON_GUN, 
             GameConstants.ITEMS.FEATHER_HELMET].includes(itemName)) {
            return GameConstants.ACTIONS.FORGE;
        }
        if ([GameConstants.ITEMS.BAKA_FREEZER].includes(itemName)) {
            return GameConstants.ACTIONS.INTERACT;
        }
        return null;
    },
    handleEquipItem(itemName) {
      if (this.gameState.equipItem(itemName)) {
        this.showTooltipMessage(`已装备 ${itemName}`);
      } else {
        this.showTooltipMessage(`装备 ${itemName} 失败 (可能未拥有或槽位冲突)`);
      }
      this.$forceUpdate();
    },
    _loadGame() {
      try {
        const savedData = localStorage.getItem('gameData');
        if (!savedData) {
          this.gameState.initializeNewSkills();
          console.log("No saved game found, initializing new skills.");
          return false;
        }

        const gameData = JSON.parse(savedData);

        this.gameState.state.levels = { ...this.gameState.state.levels, ...gameData.levels };
        this.gameState.state.experience = { ...this.gameState.state.experience, ...gameData.experience };
        this.gameState.state.inventory = { ...this.gameState.state.inventory, ...gameData.inventory };
        this.gameState.state.equipment = { ...this.gameState.state.equipment, ...gameData.equipment };

        this.gameState.initializeNewSkills();

        console.log('游戏数据已加载');
        return true;
      } catch (error) {
        console.error('加载游戏失败：', error);
        this.gameState.initializeNewSkills();
        return false;
      }
    },
    autoSaveGame() {
      try {
        const gameData = JSON.stringify({
          levels: this.gameState.state.levels,
          experience: this.gameState.state.experience,
          inventory: this.gameState.state.inventory,
          equipment: this.gameState.state.equipment
        });
        localStorage.setItem('gameData', gameData);
      } catch (error) {
        console.error('自动保存游戏失败：', error);
      }
    },
    showTooltipMessage(message) {
      this.tooltipText = message;
      this.tooltipX = window.innerWidth / 2 - 125;
      this.tooltipY = window.innerHeight / 4;
      this.showTooltip = true;
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
      }
      this.tooltipTimer = setTimeout(() => {
        this.showTooltip = false;
      }, 3000);
    },
    handleExploreAction(data) {
      const { action, area } = data;
      const exploreLevel = this.gameState.state.levels[GameConstants.ACTIONS.EXPLORE] || 1;
      
      this.currentAction = action;
      this.performingItem = { name: action };
      
      const baseTime = GameConstants.ACTION_TIMES[action] || 3;
      this.remainingTime = this.calculateActionTime({ name: action });
      
      this.startAction(this.performingItem, false);
    },
    handleItemUse(item) {
      if (!item) return;
      
      if (this.isFood(item.name)) {
        const quality = this.getFoodQuality(item.name);
        if (quality > 0) {
          this.$store.dispatch('activatePozuEffect', quality);
          console.log(`激活破阻反成效果，品质：${quality}`);
        }
      }
    },
    isFood(itemName) {
      // 定义哪些物品是食物
      const foodItems = [
        GameConstants.ITEMS.RAW_MUTTON, // 生羊肉是食物
        GameConstants.ITEMS.FROZEN_MUTTON, // 冰冻羊羹可能也算？
        // GameConstants.ITEMS.SHEEP, // 狩猎绵羊本身不是食物
        // GameConstants.ITEMS.GLASS_BALL, // 敲玻璃球不是食物
      ];
      return foodItems.includes(itemName);
    },
    getFoodQuality(itemName) {
      // 定义食物的品质
      const foodQualities = {
        [GameConstants.ITEMS.RAW_MUTTON]: 2, // 假设生羊肉品质为 2
        [GameConstants.ITEMS.FROZEN_MUTTON]: 3, // 假设冰冻羊羹品质为 3
        // [GameConstants.ITEMS.SHEEP]: 3,
        // [GameConstants.ITEMS.GLASS_BALL]: 1,
      };
      return foodQualities[itemName] || 0; // 默认品质为 0
    },
    applyBuff(quality) {
      // 应用全局 buff
      const buffDuration = quality * 10; // 每点品质持续 10 秒
      this.activeBuff = { name: "歌手状态", duration: buffDuration };
      this.showTooltipMessage(`获得 ${this.activeBuff.name} buff，持续 ${buffDuration} 秒！效果：15%几率获得双倍物品`);
      console.log(`Applied buff: ${this.activeBuff.name}, duration: ${buffDuration}s`);

      // 清除旧的计时器（如果有）
      if (this.buffTimer) {
        clearInterval(this.buffTimer);
      }

      // 启动新的计时器
      this.buffTimer = setInterval(() => {
        if (this.activeBuff.duration > 0) {
          this.activeBuff.duration -= 1;
        } else {
          console.log(`Buff ${this.activeBuff.name} expired.`);
          this.activeBuff = { name: null, duration: 0 };
          clearInterval(this.buffTimer);
          this.buffTimer = null;
        }
      }, 1000); // 每秒更新一次
    },
    getItemDescription(item) {
      const actionType = this.getActionTypeFromItem(item.name);
      const itemName = item.name;
      
      // --- 获取等级需求 ---
      const requiredLevel = GameConstants.LEVEL_REQUIREMENTS[Symbol.for(itemName)] || GameConstants.LEVEL_REQUIREMENTS.DEFAULT;
      const levelReqString = `需要 ${actionType} 等级 ${requiredLevel}`;
      // --- 结束获取等级需求 ---

      if (itemName === GameConstants.ITEMS.SING_A_SONG) {
        // "把麦开开"的特殊描述
        const actualTime = this.calculateActionTime(item);
        console.log(`[getItemDescription] Calculated time for ${itemName}: ${actualTime}`); // 添加日志确认计算的时间
        return {
          name: itemName,
          levelRequirement: levelReqString, // 添加等级需求
          description: "我是个歌手，喜欢唱歌~",
          time: ` ${actualTime.toFixed(1)} 秒`, // 使用计算出的时间
          effect: "消耗一个食物，根据其品质获得 [歌手状态] buff (品质 * 10秒)。",
          buffDescription: "歌手状态: 完成其他动作时有 15% 几率获得双倍物品。", // Buff 具体效果描述
          requires: "需要任意食物 x 1 (完成时消耗)",
        };
      }

      // 原有的通用描述逻辑
      const description = GameService.generateItemDescription(
        item,
        this.gameState.state.levels[actionType] || 0
      );

      const actualTime = this.calculateActionTime(item);
      description.time = ` ${actualTime.toFixed(1)} 秒`;
      description.levelRequirement = levelReqString; // 为其他物品也添加等级需求

      let specialEffects = [];

      if (this.gameState.isEquipped(GameConstants.ITEMS.GLASS_HAMMER) &&
          actionType === GameConstants.ACTIONS.COLLECT && 
          item.name === GameConstants.ITEMS.GLASS_BALL) {
        specialEffects.push("玻璃锤: -10% 时间");
      }
      
      if (this.gameState.isEquipped(GameConstants.ITEMS.PIGEON_GUN)) {
        if (actionType === GameConstants.ACTIONS.COLLECT) {
          specialEffects.push("羽毛枪: 采集 -10% 时间");
        } else if (actionType === GameConstants.ACTIONS.HUNT) {
          specialEffects.push("羽毛枪: 狩猎 -20% 时间");
        }
      }
      
      if (this.gameState.isEquipped(GameConstants.ITEMS.FEATHER_HELMET)) {
        specialEffects.push("羽毛帽: 所有动作 -4% 时间");
      }

      if (specialEffects.length > 0) {
        description.special = "当前加成: " + specialEffects.join(', ');
      }

      return description;
    },
  },
  mounted() {
    this._loadGame();

    this.switchAction(this.actions[0]);

    setInterval(() => {
      this.autoSaveGame();
    }, 5 * 60 * 1000);
  },
  beforeUnmount() { // 组件销毁前清除 buff 计时器
    if (this.buffTimer) {
      clearInterval(this.buffTimer);
    }
  }
};
</script>

<style scoped>
.game-home {
  text-align: center;
  font-family: Arial, sans-serif;
  padding-left: 0;
  padding-right: 0;
  transition: padding 0.3s ease;
}

/* 添加 Buff 显示样式 */
.active-buff {
  margin: 10px auto;
  padding: 5px 10px;
  background-color: #4CAF50; /* 绿色背景 */
  color: white;
  border-radius: 4px;
  font-size: 14px;
  display: inline-block; /* 让背景适应内容宽度 */
}

@media screen and (max-width: 768px) {
  .game-home {
    padding-left: 15px;
    padding-right: 15px;
  }
}

.tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.disabled {
  filter: grayscale(100%);
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none; /* 阻止点击事件 */
}
</style>