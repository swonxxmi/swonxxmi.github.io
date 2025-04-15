# 玻璃猫猫虫窝

一个基于Vue.js的简单模拟经营游戏，玩家可以通过采集、锻造等活动来获取资源、制作物品。

## 项目结构

```
/src
  /assets            - 游戏图片资源
  /components
    /game            - 游戏组件
      GameHeader.vue - 游戏头部组件
      ActionTypes.vue - 动作选择组件
      ItemList.vue   - 物品列表组件
      GameDialog.vue - 对话框组件
      Sidebar.vue    - 侧边栏组件
  /constants
    GameConstants.js - 游戏常量定义
  /services
    GameService.js   - 游戏逻辑服务
  /store
    gameState.js     - 游戏状态管理
  /views
    GameHome.vue     - 游戏主页面
```

## 主要功能

- 采集资源（玻璃碎片）
- 锻造工具（玻璃锤）
- 技能升级系统
- 物品装备系统
- 游戏存档与读取

## 开发技术

- Vue.js - 前端框架
- LocalStorage - 存储游戏数据

## 后续开发计划

- 增加更多的物品和资源
- 完善建造系统
- 实现更复杂的合成配方
- 添加成就系统
- 优化游戏界面

## 如何开始

1. 克隆项目
2. 安装依赖
   ```
   npm install
   ```
3. 启动开发服务器
   ```
   npm run serve
   ```
4. 打开浏览器访问 http://localhost:8080/

## 游戏玩法

- 点击"采集"按钮，然后选择"敲打玻璃球"来获取玻璃碎片
- 当收集到足够的玻璃碎片后，点击"锻造"按钮，制作玻璃锤
- 使用物品提升角色能力
- 随着等级提升，采集效率会提高
