<template>
  <div class="game-home" :class="{ 'sidebar-open': isMobileSidebarOpen }">
    <GameHeader 
      :current-action="currentAction"
      :remaining-time="remainingTime"
      :progress="progress"
      :is-performing-action="isPerformingAction"
      @stop-action="stopAction"
    />

    <!-- 移动端切换按钮 -->
    <button class="mobile-toggle mobile-only" @click="toggleMobileSidebar">☰</button>

    <!-- 显示当前 Buff -->
    <div v-if="activeBuff.name" class="active-buff">
      {{ activeBuff.name }} ({{ activeBuff.effectDescription }}) :{{ Math.floor(activeBuff.duration) }}秒
    </div>

    <!-- 桌面端：左侧操作类型 -->
    <div class="desktop-only">
      <ActionTypes 
        :levels="this.gameState.state.levels"
        :experience="this.gameState.state.experience"
        :actions="actions"
        @switch-action="switchAction"
      />
    </div>
    
    <ItemList 
      :items="items"
      :show-items="showItems"
      :levels="this.gameState.state.levels"
      :level-requirements="GameConstants.LEVEL_REQUIREMENTS"
      :get-action-type-from-item="getActionTypeFromItem"
      @open-dialog="openDialog"
      @start-action="startAction"
    />

    <!-- 桌面端：右侧侧边栏 -->
    <div class="desktop-only">
      <Sidebar 
        :equipment="this.gameState.state.equipment"
        :inventory="this.gameState.state.inventory"
        :gameState="this.gameState"
        @equip-item="handleEquipItem"
      />
    </div>
    
    <ExploreArea 
      :handle-explore-action="handleExploreAction"
    />
    
    <!-- 悬浮提示 -->
    <div v-if="showTooltip" class="tooltip" :style="{top: tooltipY + 'px', left: tooltipX + 'px'}">
      {{ tooltipText }}
    </div>

    <!-- 移动端侧边栏 -->
    <div class="mobile-sidebar mobile-only" :class="{ open: isMobileSidebarOpen }">
      <div class="sidebar-content">
        <button class="close-sidebar-btn" @click="closeMobileSidebar">&times;</button>

        <!-- 视图切换按钮 -->
        <div class="mobile-sidebar-view-toggle">
          <button @click="setMobileSidebarView('actions')" :class="{ active: mobileSidebarView === 'actions' }">操作</button>
          <button @click="setMobileSidebarView('inventory')" :class="{ active: mobileSidebarView === 'inventory' }">背包</button>
        </div>

        <!-- 条件渲染视图 -->
        <div v-if="mobileSidebarView === 'actions'">
          <h3>操作类型</h3>
          <ActionTypes
            :levels="this.gameState.state.levels"
            :experience="this.gameState.state.experience"
            :actions="actions"
            @switch-action="handleMobileSwitchAction"
          />
        </div>

        <div v-if="mobileSidebarView === 'inventory'">
          <h3>状态与物品</h3>
          <Sidebar
            :equipment="this.gameState.state.equipment"
            :inventory="this.gameState.state.inventory"
            :gameState="this.gameState"
            @equip-item="handleMobileEquipItem"
          />
        </div>
      </div>
    </div>
    <!-- 遮罩层 -->
    <div class="overlay mobile-only" :class="{ open: isMobileSidebarOpen }" @click="closeMobileSidebar"></div>
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
      activeBuff: { name: null, duration: 0, effectDescription: null }, // 添加 buff 状态 (添加 effectDescription)
      isMobileSidebarOpen: false,
      mobileSidebarView: 'actions', // 新增：控制移动端侧边栏显示 'actions' 或 'inventory'
    };
  },
  methods: {
    toggleMobileSidebar() {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
      if (!this.isMobileSidebarOpen) {
        // 关闭时重置视图
        this.mobileSidebarView = 'actions'; 
      }
    },
    closeMobileSidebar() {
      this.isMobileSidebarOpen = false;
      // 关闭时重置视图
      this.mobileSidebarView = 'actions'; 
    },
    setMobileSidebarView(view) {
      this.mobileSidebarView = view;
    },
    handleMobileSwitchAction(action) {
      this.switchAction(action);
      this.closeMobileSidebar(); // 选择操作后自动关闭侧边栏
      // 关闭时会自动重置 mobileSidebarView
    },
    handleMobileEquipItem(itemName) {
      this.handleEquipItem(itemName);
    },
    switchAction(action) {
      console.log(`[switchAction] Switching to display items for: ${action}`);
      this.updateItemList(action);
      console.log(`[switchAction] State after updateItemList (isPerformingAction may not reflect immediate change) - currentAction: ${this.currentAction}, progress: ${this.progress}, remainingTime: ${this.remainingTime}, isPerformingAction: ${this.isPerformingAction}`);
    },
    updateItemList(action) {
      this.showItems = true;
      this.items = [];
      console.log(`[updateItemList] Updating item list for: ${action}`);

      if (action === GameConstants.ACTIONS.COLLECT) {
        // --- 重新获取露珠状态，确保传递给 ItemList ---
        const canCollectDew = this.gameState.canCollectDew();
        const collectionsThisHour = this.gameState.getDewCollectionsThisHour();
        const maxCollections = this.gameState.getMaxDewCollectionsPerHour();
        const minutesUntilReset = canCollectDew ? 0 : this.gameState.getMinutesUntilNextDewCollectionAllowed();
        console.log(`[updateItemList] Dew status: canCollect=${canCollectDew}, count=${collectionsThisHour}, max=${maxCollections}`); // 添加日志
        // --- 结束获取露珠状态 ---

        this.items = [
          { image: GameConstants.getItemImage(GameConstants.ITEMS.GLASS_BALL), name: GameConstants.ITEMS.GLASS_BALL },
          {
            image: GameConstants.getItemImage(GameConstants.ITEMS.COLLECT_DEW),
            name: GameConstants.ITEMS.COLLECT_DEW,
            // 确保这些属性被传递
            canCollect: canCollectDew,
            collectionsThisHour: collectionsThisHour,
            maxCollections: maxCollections,
            minutesUntilReset: minutesUntilReset,
            isDisabled: !canCollectDew // 关键：设置 isDisabled
          },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.SCARE_PIGEON), name: GameConstants.ITEMS.SCARE_PIGEON },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.SHAKE_GINKGO), name: GameConstants.ITEMS.SHAKE_GINKGO },
          { image: GameConstants.getItemImage(GameConstants.ITEMS.COLLECT_SPIDER_SILK), name: GameConstants.ITEMS.COLLECT_SPIDER_SILK },
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
      console.log(`[startAction] Received request for:`, newItem ? newItem.name : 'invalid item', `Close dialog: ${closeDialog}`);
      
      if (!newItem || !newItem.name) {
          console.error("startAction called with invalid newItem");
          return;
      }

      // 1. 检查是否需要停止旧动作
      const shouldStopPrevious = this.isPerformingAction && this.performingItem && newItem.name !== this.performingItem.name;
      if (shouldStopPrevious) {
          console.log("[startAction] New different action requested. Will stop previous if checks pass.");
      }

      // 暂存新动作信息
      const tempPerformingItem = { ...newItem };
      const itemName = tempPerformingItem.name;
      const actionType = this.getActionTypeFromItem(itemName);
      console.log(`[startAction] Temp Item: ${itemName}, ActionType: ${actionType}`);

      // 2. 等级检查 (使用暂存信息)
      const requiredLevel = GameConstants.LEVEL_REQUIREMENTS[Symbol.for(itemName)] || GameConstants.LEVEL_REQUIREMENTS.DEFAULT;
      const currentLevel = this.gameState.state.levels[actionType] || 0;
      console.log(`[startAction Level Check] Item: ${itemName}, ActionType: ${actionType}, Required: ${requiredLevel}, Current: ${currentLevel}`);
      if (currentLevel < requiredLevel) {
        this.showTooltipMessage(`等级不足：需要 ${actionType} 等级 ${requiredLevel}`);
        return; // 直接退出
      }

      // 3. 先决条件检查 (使用暂存信息)
      let prerequisitesMet = true;
      console.log(`[startAction] Before prerequisite checks. Item: ${itemName}`);
      if (itemName === GameConstants.ITEMS.COLLECT_DEW) {
          if (!this.gameState.canCollectDew()) {
              const remainingMinutes = this.gameState.getMinutesUntilNextDewCollectionAllowed();
              this.showTooltipMessage(`露珠采集次数已达上限，请等待 ${remainingMinutes} 分钟后再试`);
              prerequisitesMet = false;
          }
      } else if (actionType === GameConstants.ACTIONS.FORGE) {
          const recipe = GameConstants.CONSUMPTION[itemName];
          if (!recipe) {
              this.showTooltipMessage(`错误：找不到 ${itemName} 的配方`);
              prerequisitesMet = false;
          } else {
              // 只检查材料是否足够，不消耗
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
                  console.warn(`[startAction PreCheck] Forge failed for ${itemName} due to insufficient materials (Missing: ${missingMaterial}).`);
                  this.showTooltipMessage(`锻造失败：材料不足 (${missingMaterial})`);
                  prerequisitesMet = false;
              }
          }
      } else if (actionType === GameConstants.ACTIONS.INTERACT) {
           if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
              const catalyst = GameConstants.ITEMS.GINKGO_LEAF;
              const requiredCatalyst = GameConstants.CONSUMPTION[itemName]?.[catalyst] || 0;
              if (this.gameState.getItemCount(catalyst) < requiredCatalyst) {
                  this.showTooltipMessage(`材料不足：需要 ${requiredCatalyst} x ${catalyst}`);
                  prerequisitesMet = false;
              }
              const targetFood = GameConstants.ITEMS.RAW_MUTTON;
              if (this.gameState.getItemCount(targetFood) <= 0 && prerequisitesMet) {
                  this.showTooltipMessage(`没有 ${targetFood} 可供转化`);
                  prerequisitesMet = false;
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
                  prerequisitesMet = false;
               }
           }
      }

      // 4. 如果先决条件失败，则退出
      if (!prerequisitesMet) {
        console.log(`[startAction] Prerequisites failed for ${itemName}.`);
        return; // 直接退出，不修改当前状态
      }
      console.log(`[startAction] Prerequisites passed for ${itemName}.`);

      // 5. 计算新动作时间 (使用暂存信息)
      const calculatedActionTime = this.calculateActionTime(tempPerformingItem);
      console.log(`[startAction] Calculated actionTime for ${itemName}: ${calculatedActionTime}`);
      if (calculatedActionTime <= 0) {
          console.error(`[startAction] Calculated action time is zero or negative for: ${itemName}. Calculated value was: ${calculatedActionTime}`);
          return; // 退出
      }

      // --- 所有检查通过，准备切换状态 --- 

      // 6. 如果需要，停止之前的动作
      if (shouldStopPrevious) {
          console.log("[startAction] Stopping previous action now.");
          this.stopAction(); // stopAction 会清理 timer, isPerforming, performingItem, loopingItem, UI state
      } else if (this.actionTimer) {
          // 如果不需要停止，但仍然有计时器在运行（理论上不应发生，除非 stopAction 失败），也清理一下
          console.warn("[startAction] Action timer existed without shouldStopPrevious being true. Clearing timer.");
          clearInterval(this.actionTimer);
          this.actionTimer = null;
      }

      // 7. 设置新动作的状态
      this.performingItem = tempPerformingItem; // 正式设置 performingItem
      this.currentAction = itemName; // 设置显示的动作名称
      this.remainingTime = calculatedActionTime;
      this.progress = 0;
      this.isPerformingAction = true;
      console.log(`[startAction] Set isPerformingAction=true for ${itemName}.`);

      // 设置循环项 (根据类型判断)
      if (actionType === GameConstants.ACTIONS.COLLECT || 
          actionType === GameConstants.ACTIONS.HUNT ||
          (actionType === GameConstants.ACTIONS.INTERACT && itemName === GameConstants.ITEMS.BAKA_FREEZER) ||
          actionType === GameConstants.ACTIONS.EXPLORE) {
          this.loopingItem = this.performingItem;
      } else {
          this.loopingItem = null;
      }
      console.log(`[startAction] LoopingItem set to:`, this.loopingItem ? this.loopingItem.name : null);

      // 8. 消耗材料（只在启动时消耗一次）
      if (actionType === GameConstants.ACTIONS.FORGE) {
          const recipe = GameConstants.CONSUMPTION[itemName];
          if (recipe) { // 之前已检查过 recipe 存在且材料足够
              for (const [material, amount] of Object.entries(recipe)) {
                  this.gameState.removeItemFromInventory(material, amount);
              }
              console.log(`[startAction] Consumed materials for FORGE: ${itemName}`);
          } else {
               console.error(`[startAction] Recipe consistency error during material consumption for ${itemName}`); 
               this.stopAction(); // 如果出错则停止
               return;
          }
      } else if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
          const catalyst = GameConstants.ITEMS.GINKGO_LEAF;
          const requiredCatalyst = GameConstants.CONSUMPTION[itemName]?.[catalyst] || 0;
          if(this.gameState.removeItemFromInventory(catalyst, requiredCatalyst)) { // 之前已检查过材料足够
             console.log(`[startAction] Consumed catalyst for BAKA_FREEZER: ${requiredCatalyst}x ${catalyst}`);
          } else {
              console.error(`[startAction] Catalyst consistency error during material consumption for ${itemName}`);
              this.stopAction(); // 如果出错则停止
              return;
          }
      } // 其他类型（采集、狩猎、唱歌）在 completeAction 中处理产出/消耗

      // 9. 关闭对话框（如果需要）
      if (closeDialog) {
        this.dialogVisible = false;
        this.dialogItem = null; // 清理对话框物品
      }

      // 10. 启动计时器
      console.log(`[startAction] Starting timer for ${itemName} with duration ${this.remainingTime.toFixed(1)}s.`);
      const totalTime = this.remainingTime;
      const updateInterval = 10;
      const timeDecrement = updateInterval / 1000;
      let intervalCounter = 0;

      this.actionTimer = setInterval(() => {
          if (intervalCounter % 100 === 0) {
              console.log(`[Interval-${itemName}] Tick ${intervalCounter}. isPerforming: ${this.isPerformingAction}, remaining: ${this.remainingTime.toFixed(1)}`);
          }
          intervalCounter++;
          
          // --- Interval logic remains largely the same --- 
          if (!this.isPerformingAction || !this.performingItem || this.performingItem.name !== itemName) { // 更严格的检查
              clearInterval(this.actionTimer);
              this.actionTimer = null;
              console.warn(`[Interval-${itemName}] Action stopped or changed externally. Clearing interval.`);
              return;
          }

          if (this.remainingTime > 0) {
              this.remainingTime = Math.max(0, this.remainingTime - timeDecrement);
              this.progress = ((totalTime - this.remainingTime) / totalTime) * 100;
          } else { 
              this.remainingTime = 0; 
              this.progress = 100; 
              console.log(`[Interval-${itemName}] Time reached 0. Clearing interval.`);
              clearInterval(this.actionTimer);
              this.actionTimer = null;
              
              // 使用完成时的 item 状态，防止闭包问题
              const itemJustCompleted = { ...this.performingItem }; 
              
              this.$nextTick(() => { 
                   console.log(`[Interval-${itemName}] nextTick callback. isPerforming: ${this.isPerformingAction}, performingItem: ${this.performingItem?.name}`);
                   if (!itemJustCompleted || !itemJustCompleted.name) {
                       console.error("[Interval] itemJustCompleted is invalid before completeAction");
                       // Don't call stopAction here, state might be inconsistent
                       return;
                   }
                   // 再次检查状态，确保在 completeAction 前没有被停止或切换
                   if (!this.isPerformingAction || !this.performingItem || this.performingItem.name !== itemJustCompleted.name) {
                        console.warn(`[Interval] Action stopped or changed before completeAction could be called for ${itemJustCompleted.name}. Aborting completion.`);
                        return; 
                   }
                  
                  const typeForCompletion = this.getActionTypeFromItem(itemJustCompleted.name);
                  if (typeForCompletion) {
                      console.log(`[Interval-${itemJustCompleted.name}] Calling completeAction.`);
                      this.completeAction(itemJustCompleted); 
                  } else {
                      console.error(`[Interval] Cannot determine type for item: ${itemJustCompleted.name}. Stopping action.`);
                      this.stopAction(); // 如果类型无法确定，尝试停止
                  }
              });
          }

          // --- Buff 持续时间扣除 --- 
          if (this.activeBuff.name === "谐波共鸣" && this.activeBuff.duration > 0) {
            this.activeBuff.duration = Math.max(0, this.activeBuff.duration - timeDecrement);
            this.activeBuff.duration = parseFloat(this.activeBuff.duration.toFixed(3));
            if (this.activeBuff.duration <= 0) {
              console.log(`Buff ${this.activeBuff.name} expired during action.`);
              this.activeBuff = { name: null, duration: 0, effectDescription: null };
            }
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
      let shouldContinueLoop = true;

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
              else if (completedItemName === GameConstants.ITEMS.COLLECT_SPIDER_SILK) gainedItem = GameConstants.ITEMS.SPIDER_SILK;
              else if (completedItemName === GameConstants.ITEMS.COLLECT_DEW) {
                  this.gameState.recordDewCollection();
                  if (Math.random() < GameConstants.DEW_COLLECTION.ESSENCE_CHANCE) {
                      gainedItem = GameConstants.ITEMS.ESSENCE_DEW;
                      this.showTooltipMessage(`运气真好！采集到了 ${GameConstants.ITEMS.ESSENCE_DEW}！`);
                  } else {
                      gainedItem = GameConstants.ITEMS.DEW;
                  }
              }

              if (gainedItem) {
                  gainedAmount = GameService.calculateCollectionAmount(level);
                  console.log(`[completeAction - ${actionType}] Determined drop: ${gainedAmount}x ${gainedItem}`);
              } else {
                  if ([GameConstants.ITEMS.GLASS_BALL, GameConstants.ITEMS.SCARE_PIGEON, GameConstants.ITEMS.SHAKE_GINKGO, GameConstants.ITEMS.COLLECT_SPIDER_SILK, GameConstants.ITEMS.COLLECT_DEW].includes(completedItemName)) {
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
                      // Forge items consume materials at the start in startAction, just gain item here
                      gainedItem = completedItemName;
                      gainedAmount = 1;
                      this.showTooltipMessage(`成功锻造了 ${completedItemName}！`);
                      shouldContinueLoop = false; // Forge actions don't loop by default
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
                          }
                      } else {
                          this.showTooltipMessage(`错误：${foodName} 品质为 0，无法获得效果`);
                      }
                  } else {
                      console.log("[completeAction] No food available to consume upon Sing a Song completion.");
                      this.showTooltipMessage(`完成时没有食物可消耗`);
                  }
                  gainedItem = null;
                  gainedAmount = 0;
                  shouldContinueLoop = false; // Sing doesn't loop
              }
          }
      } catch (error) {
          console.error("Error in completeAction:", error);
          gainedAmount = 0;
          gainedItem = null;
          shouldContinueLoop = false;
      }

      if (this.activeBuff.name === "谐波共鸣" && experienceType && experienceAmount > 0) {
          console.log(`[Buff Effect] Singer Status active! Doubling XP for ${experienceType}. Original: ${experienceAmount}`);
          experienceAmount *= 2;
          console.log(`[Buff Effect] New XP: ${experienceAmount}`);
      }

      if (gainedItem && gainedAmount > 0) {
        console.log(`[completeAction] Attempting to add item: ${gainedAmount}x ${gainedItem}`);
        this.gameState.addItemToInventory(gainedItem, gainedAmount);
      } else {
        console.log(`[completeAction] No item gained (item: ${gainedItem}, amount: ${gainedAmount})`);
      }
      if (experienceType && experienceAmount > 0 && this.gameState.state.experience) {
        console.log(`[completeAction] Attempting to gain XP: ${experienceAmount} for ${experienceType}`);
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
      
      // --- 强制刷新采集列表状态（如果完成的是露珠）---
      let shouldForceRefreshCollectList = false;
      if (completedItemName === GameConstants.ITEMS.COLLECT_DEW) {
        shouldForceRefreshCollectList = true;
        console.log("[completeAction] Dew collection completed, preparing to refresh list state.");
      }
      // --- 结束强制刷新检查 ---
      
      // --- 重构循环判断逻辑 ---
      let attemptLoop = false; // Flag to indicate if we should start the next loop iteration
      if (this.loopingItem && this.loopingItem.name === completedItemName) {
          // Base condition: A looping item exists and matches the completed one.
          console.log(`[completeAction] Loop check: Looping item (${this.loopingItem.name}) matches completed item.`);
          
          if (!this.isPerformingAction) {
              console.log(`[completeAction] Loop check failed: isPerformingAction is false.`);
          } else if (!shouldContinueLoop) {
              console.log(`[completeAction] Loop check failed: shouldContinueLoop is false (e.g., material issue).`);
          } else if (completedItemName === GameConstants.ITEMS.COLLECT_DEW && !this.gameState.canCollectDew()) {
              // Specific check for Dew collection limit
              console.log(`[completeAction] Loop check failed: Dew collection limit reached.`);
              // Force refresh list here as well, because loop is stopping due to limit
              shouldForceRefreshCollectList = true; 
          } else {
              // All conditions met for looping
              attemptLoop = true;
              console.log(`[completeAction] Loop check passed. Proceeding to startLoopingAction.`);
          }
      } else {
           // No looping item set, or it doesn't match the completed item.
           console.log(`[completeAction] Loop check failed: No matching looping item for ${completedItemName}.`);
           if(this.loopingItem) console.log(`[completeAction] Current looping item was: ${this.loopingItem.name}`);
      }

      // 根据判断结果执行循环或重置
      if (attemptLoop) {
         // Don't reset state, just start the next loop
         this.startLoopingAction();
      } else {
        console.log(`[completeAction] Resetting state as loop is not proceeding for ${completedItemName}.`);
        // Reset state fully if not looping
        this.isPerformingAction = false;
        this.loopingItem = null;
        this.performingItem = null;
        this.resetActionState(); // Resets progress, time, text
      }
      // --- 结束重构循环判断逻辑 ---

      // --- 执行列表刷新（如果需要）---
      // Moved this after loop decision, ensures list reflects state AFTER potential loop stop
      if (shouldForceRefreshCollectList) {
          this.switchAction(GameConstants.ACTIONS.COLLECT);
          console.log("[completeAction] Collect list state refresh triggered.");
      }

      this.autoSaveGame();
      this.$forceUpdate(); // Might still cause momentary full progress bar, harder to avoid without more complex state management
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
      console.log(`[calculateActionTime] Item: ${itemName}, Detected ActionType: ${actionType}`); // Log detected type

      if (actionType === GameConstants.ACTIONS.COLLECT) {
          console.log(`[calculateActionTime] Entered COLLECT branch for ${itemName}`); // Log branch entry
          if (itemName === GameConstants.ITEMS.GLASS_BALL) {
              baseTime = GameConstants.ACTION_TIMES.COLLECT;
              console.log(`[calculateActionTime] Matched GLASS_BALL, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.SCARE_PIGEON) {
              baseTime = GameConstants.ACTION_TIMES.SCARE_PIGEON;
              console.log(`[calculateActionTime] Matched SCARE_PIGEON, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.SHAKE_GINKGO) {
              baseTime = GameConstants.ACTION_TIMES.SHAKE_GINKGO;
              console.log(`[calculateActionTime] Matched SHAKE_GINKGO, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.COLLECT_SPIDER_SILK) {
              baseTime = GameConstants.ACTION_TIMES.COLLECT_SPIDER_SILK;
              console.log(`[calculateActionTime] Matched COLLECT_SPIDER_SILK, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.COLLECT_DEW) {
              baseTime = GameConstants.ACTION_TIMES.COLLECT_DEW;
              console.log(`[calculateActionTime] Matched COLLECT_DEW, baseTime: ${baseTime}`);
          } else {
              console.warn(`[calculateActionTime] COLLECT item ${itemName} not matched for base time.`); // Log no match
          }
      } else if (actionType === GameConstants.ACTIONS.HUNT) {
          console.log(`[calculateActionTime] Entered HUNT branch for ${itemName}`);
          if (itemName === GameConstants.ITEMS.SHEEP) {
              baseTime = GameConstants.ACTION_TIMES.HUNT;
              console.log(`[calculateActionTime] Matched SHEEP, baseTime: ${baseTime}`);
          } else {
              console.warn(`[calculateActionTime] HUNT item ${itemName} not matched for base time.`);
          }
      } else if (actionType === GameConstants.ACTIONS.FORGE) {
          console.log(`[calculateActionTime] Entered FORGE branch for ${itemName}`);
          if (itemName === GameConstants.ITEMS.GLASS_HAMMER) {
              baseTime = GameConstants.ACTION_TIMES.FORGE;
              console.log(`[calculateActionTime] Matched GLASS_HAMMER, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.PIGEON_GUN) {
              baseTime = GameConstants.ACTION_TIMES.FORGE_PIGEON_GUN;
              console.log(`[calculateActionTime] Matched PIGEON_GUN, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.FEATHER_HELMET) {
              baseTime = GameConstants.ACTION_TIMES.FORGE_FEATHER_HELMET;
              console.log(`[calculateActionTime] Matched FEATHER_HELMET, baseTime: ${baseTime}`);
          } else {
              console.warn(`[calculateActionTime] FORGE item ${itemName} not matched for base time.`);
          }
      } else if (actionType === GameConstants.ACTIONS.EXPLORE) {
          console.log(`[calculateActionTime] Entered EXPLORE branch for ${itemName}`);
          baseTime = GameConstants.ACTION_TIMES[itemName] || 3; // Assumes ACTION_TIMES has keys matching explore item names
          console.log(`[calculateActionTime] Matched ${itemName} (or default 3), baseTime: ${baseTime}`);
      } else if (actionType === GameConstants.ACTIONS.INTERACT) {
          console.log(`[calculateActionTime] Entered INTERACT branch for ${itemName}`);
          if (itemName === GameConstants.ITEMS.BAKA_FREEZER) {
              baseTime = GameConstants.ACTION_TIMES.INTERACT;
              console.log(`[calculateActionTime] Matched BAKA_FREEZER, baseTime: ${baseTime}`);
          } else if (itemName === GameConstants.ITEMS.SING_A_SONG) {
              baseTime = GameConstants.ACTION_TIMES.SING_A_SONG;
              console.log(`[calculateActionTime] Matched SING_A_SONG, baseTime: ${baseTime}`);
          } else {
              console.warn(`[calculateActionTime] INTERACT item ${itemName} not matched for base time.`);
          }
      }
      else {
          console.warn("[calculateActionTime] Calculating time for unknown item/action type:", itemName, actionType);
          // return 0; // Removed early return, calculate modifiers anyway?
      }
      
      const initialBaseTime = baseTime; // Log time before modifiers

      // Apply modifiers
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
      
      const finalTime = Math.max(0.1, baseTime);
      console.log(`[calculateActionTime] Item: ${itemName}, InitialBase: ${initialBaseTime}, FinalTime: ${finalTime}`); // Log final time

      return finalTime;
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
        if ([GameConstants.ITEMS.GLASS_BALL, GameConstants.ITEMS.SCARE_PIGEON, GameConstants.ITEMS.SHAKE_GINKGO, GameConstants.ITEMS.COLLECT_SPIDER_SILK, GameConstants.ITEMS.COLLECT_DEW].includes(itemName)) {
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
      this.gameState.cleanupDewTimestamps();
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

        if (gameData.activeBuff && gameData.activeBuff.name && gameData.activeBuff.duration > 0) {
          this.activeBuff = { ...gameData.activeBuff };
          console.log('加载 Buff:', this.activeBuff.name, '剩余时间:', this.activeBuff.duration);
        } else {
          this.activeBuff = { name: null, duration: 0, effectDescription: null };
          console.log('未找到有效 Buff 或 Buff 已过期');
        }

        if (gameData.dewCollectionTimestamps && Array.isArray(gameData.dewCollectionTimestamps)) {
            console.log('[Load Game] Found saved dew timestamps:', gameData.dewCollectionTimestamps.length, 'items');
            this.gameState.state.dewCollectionTimestamps = [...gameData.dewCollectionTimestamps];
            console.log('[Load Game] State assigned, length before cleanup:', this.gameState.state.dewCollectionTimestamps.length);
            this.gameState.cleanupDewTimestamps();
            console.log('[Load Game] State after cleanup, length:', this.gameState.state.dewCollectionTimestamps.length);
        } else {
            this.gameState.state.dewCollectionTimestamps = [];
            console.log('未找到有效的露珠采集时间戳，已重置');
        }
        this.gameState.initializeNewSkills();
        console.log('游戏数据已加载');
        return true;
      } catch (error) {
        console.error('加载游戏失败：', error);
        this.gameState.initializeNewSkills();
        this.gameState.state.dewCollectionTimestamps = [];
        return false;
      }
    },
    autoSaveGame() {
      try {
        const timestampsBeforeSave = this.gameState.state.dewCollectionTimestamps.length;
        console.log(`[Auto Save] Saving dew timestamps. Current count: ${timestampsBeforeSave}`);
        const gameData = JSON.stringify({
          levels: this.gameState.state.levels,
          experience: this.gameState.state.experience,
          inventory: this.gameState.state.inventory,
          equipment: this.gameState.state.equipment,
          activeBuff: this.activeBuff,
          dewCollectionTimestamps: this.gameState.state.dewCollectionTimestamps
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
          console.log(`激活破阻反成效果，品质：${quality} (假装调用了 store)`);
        }
      }
    },
    isFood(itemName) {
        const foodItems = [
            GameConstants.ITEMS.RAW_MUTTON,
            GameConstants.ITEMS.FROZEN_MUTTON,
        ];
        return foodItems.includes(itemName);
    },
    getFoodQuality(itemName) {
        const foodQualities = {
            [GameConstants.ITEMS.RAW_MUTTON]: 2,
            [GameConstants.ITEMS.FROZEN_MUTTON]: 3,
        };
        return foodQualities[itemName] || 0;
    },
    applyBuff(quality) {
      const buffDuration = quality * 100;
      this.activeBuff = {
        name: "谐波共鸣",
        duration: buffDuration,
        effectDescription: "所有行为经验翻倍"
      };
      console.log(`Applied buff: ${this.activeBuff.name}, duration: ${buffDuration}s, effect: ${this.activeBuff.effectDescription}`);
    },
    getItemDescription(item) {
      const actionType = this.getActionTypeFromItem(item.name);
      const itemName = item.name;
      const currentLevel = this.gameState.state.levels[actionType] || 0;

      const requiredLevel = GameConstants.LEVEL_REQUIREMENTS[Symbol.for(itemName)] || GameConstants.LEVEL_REQUIREMENTS.DEFAULT;
      const levelReqString = requiredLevel > 1 ? `需要 ${actionType} 等级 ${requiredLevel}` : `无等级要求`;

      let description = {
          name: itemName,
          description: "这是一个神秘的物品。",
          levelRequirement: levelReqString,
          time: ` ${this.calculateActionTime(item).toFixed(1)} 秒`,
          yield: null,
          status: null,
          special: null
      };

      if (itemName === GameConstants.ITEMS.SING_A_SONG) {
        description = {
          ...description,
          description: "我是个歌手，我欢唱歌~",
          effect: "消耗食物，根据其品质获得buff",
          buffDescription: "谐波共鸣: 所有行为获得的经验值翻倍。",
          requires: "需要任意食物 x 1 (完成时消耗)",
        };
      }
      else if (itemName === GameConstants.ITEMS.COLLECT_DEW) {
          const potentialYield = GameService.calculatePotentialYield(currentLevel);
          const baseProduct = GameConstants.ITEMS.DEW;
          description = {
              ...description,
              description: "植物叶片上凝结的纯净水珠，蕴含着自然能量。",
              yield: `预计产出: ${potentialYield.toFixed(1)} x ${baseProduct} `,
          };
          const canCollect = this.gameState.canCollectDew();
          const collectionsThisHour = this.gameState.getDewCollectionsThisHour();
          const maxCollections = this.gameState.getMaxDewCollectionsPerHour();
          if (canCollect) {
              description.status = `本小时可采集 (${collectionsThisHour}/${maxCollections})`;
          } else {
              const minutesUntilReset = this.gameState.getMinutesUntilNextDewCollectionAllowed();
              description.status = `已达上限 (${collectionsThisHour}/${maxCollections})，${minutesUntilReset} 分钟后刷新`;
          }
      }
      else if (itemName === GameConstants.ITEMS.COLLECT_SPIDER_SILK) {
          const potentialYield = GameService.calculatePotentialYield(currentLevel);
          const productItem = GameConstants.ITEMS.SPIDER_SILK;
          description = {
              ...description,
              description: "从蜘蛛网上收集到的坚韧丝线。",
              yield: `预计产出: ${potentialYield.toFixed(1)} x ${productItem}`,
          };
      }
      else {
          const serviceDesc = GameService.generateItemDescription(item, currentLevel);
          description = {
              ...description,
              description: serviceDesc.description || description.description,
              effect: serviceDesc.effect,
              recipe: serviceDesc.recipe,
              note: serviceDesc.note,
              type: serviceDesc.type,
              yield: serviceDesc.yield,
          };
      }

      const actualTime = this.calculateActionTime(item);
      description.time = ` ${actualTime.toFixed(1)} 秒`;

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
       if (this.gameState.isEquipped(GameConstants.ITEMS.BUTTERFLY_CLOAK)) {
        specialEffects.push("蝴蝶披风: 所有动作 -8% 时间");
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
};
</script>

<style scoped>
/* Add this rule to potentially reset default body margin */
:global(body) {
  margin: 0;
}

.game-home {
  display: grid; /* 改为 grid 布局 */
  grid-template-columns: 200px 1fr 250px; /* 左侧、中间、右侧 */
  grid-template-rows: auto 1fr; /* 头部、主体 */
  grid-template-areas:
    "header header header"
    "action-types item-list sidebar";
  gap: 15px; /* 网格间距 */
  padding: 15px;
  min-height: 100vh;
  box-sizing: border-box;
  position: relative; /* 为了子元素的绝对/固定定位 */
}

/* 分配区域 */
.game-header { grid-area: header; }
/* .action-types-container { grid-area: action-types; } */ /* 用 div 包裹后不需要这个了 */
.item-list-container { grid-area: item-list; }
/* .sidebar-container { grid-area: sidebar; } */ /* 用 div 包裹后不需要这个了 */
.explore-area-container { grid-area: item-list; margin-top: 20px; } /* 探索区域放在中间下方 */
.active-buff { grid-area: header; justify-self: center; margin-top: 5px; } /* Buff 放在 Header 下方居中 */

/* Tooltip 保持 fixed 定位 */
.tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8); /* 加深一点背景 */
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2); /* 添加阴影 */
}

/* 桌面端容器 */
.desktop-only {
  display: block; /* 默认显示 */
}
.desktop-only > .action-types { grid-area: action-types; } /* 分配网格区域给子元素 */
.desktop-only > .sidebar { grid-area: sidebar; } /* 分配网格区域给子元素 */

/* 移动端特定样式 */
.mobile-only {
  display: none; /* 默认隐藏 */
}

/* 媒体查询：竖屏设备 (替代之前的 max-width) */
@media screen and (orientation: portrait) {
  .game-home {
    grid-template-columns: 1fr; /* 单列布局 */
    grid-template-areas:
      "header"
      "item-list"; /* 主内容区域 */
    padding: 10px; /* 调整内边距 */
  }

  /* 隐藏桌面端元素 */
  .desktop-only {
    display: none;
  }

  /* 显示移动端元素 */
  .mobile-only {
    display: block; /* 在移动端显示 */
  }

  .mobile-toggle {
    position: fixed; /* 固定位置 */
    top: 10px;
    left: 10px;
    z-index: 1050; /* 比遮罩层和侧边栏高 */
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 18px;
  }

  .mobile-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px; /* 侧边栏宽度 */
    height: 100%;
    background-color: #f8f9fa; /* 浅灰色背景 */
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
    transform: translateX(-100%); /* 默认移出屏幕外 */
    transition: transform 0.3s ease;
    z-index: 1000;
    overflow-y: auto; /* 内容过多时可滚动 */
  }

  .mobile-sidebar.open {
    transform: translateX(0); /* 滑入屏幕 */
  }

  .sidebar-content {
    padding: 20px;
    padding-top: 50px; /* 为关闭按钮留出空间 */
  }

  .close-sidebar-btn {
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
  }
  
  .sidebar-content h3 {
    margin-top: 15px;
    margin-bottom: 10px;
    color: #495057;
    font-size: 16px;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 5px;
  }
  
  .sidebar-content hr { /* 这个 hr 现在不用了，但可以保留样式以备将来使用 */
      border: 0;
      height: 1px;
      background-color: #dee2e6;
      margin: 20px 0;
  }

  .mobile-sidebar-view-toggle {
    display: flex;
    justify-content: space-around; /* 或者 center */
    margin-bottom: 20px;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 10px;
  }

  .mobile-sidebar-view-toggle button {
    padding: 8px 15px;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    flex-grow: 1; /* 让按钮平分空间 */
    margin: 0 5px; /* 按钮间加点间距 */
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .mobile-sidebar-view-toggle button.active {
    background-color: #007bff;
    color: white;
    border-color: #007bff;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
    z-index: 999; /* 低于侧边栏，高于内容 */
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .overlay.open {
    opacity: 1;
    visibility: visible;
  }

  /* 调整主要组件在移动端的样式 */
  .game-header {
    padding: 5px 10px; /* 调整内边距 */
  }
  .item-list-container, .explore-area-container {
     margin: 10px 0; /* 调整外边距 */
  }
  .active-buff {
    margin: 5px auto;
    padding: 4px 8px;
    font-size: 12px;
  }
}


/* 通用样式调整（如果需要） */
.game-header {
  padding: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
}

.item-list-container {
  /* 可以添加一些通用样式 */
}

.explore-area-container {
   /* 可以添加一些通用样式 */
}

.disabled {
  filter: grayscale(100%);
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none; /* 阻止点击事件 */
}
</style>