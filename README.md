# 北魏老弱病残扶持计划

一个功能完整的无障碍网页应用，提供多项辅助功能和交互能力，让所有用户都能便捷地访问和使用网站内容。

## 功能特性

### 视觉辅助功能

#### 1. 页面缩放 (ZoomManager)
- **缩放范围**：50% - 200%
- **默认级别**：100%
- **调整步长**：10% 递进
- **快捷键**：
  - `Ctrl + +` / `Cmd + +` - 放大页面
  - `Ctrl + -` / `Cmd + -` - 缩小页面
  - `Ctrl + 0` / `Cmd + 0` - 重置缩放到100%
- **数据持久化**：使用 localStorage 保存用户设置

#### 2. 深色模式 (ThemeManager)
- **支持模式**：浅色模式、深色模式
- **实现方案**：CSS 自定义属性 (CSS Variables)
- **Web Component**：`<theme-button>` 日夜切换按钮
- **尺寸配置**：`size="3"`，固定位置在页面右下角
- **自动持久化**：主题选择自动保存到 localStorage
- **颜色配适**：所有 UI 组件自动适配浅色/深色主题

#### 3. 色盲模式 (ColorBlindManager)
支持 5 种色盲滤镜类型，帮助色盲用户更好地感知色彩：
- **红色色盲 (Protanopia)**：通过 SVG feColorMatrix 转换红绿色
- **绿色色盲 (Deuteranopia)**：转换绿色通道
- **蓝黄色盲 (Tritanopia)**：转换蓝黄色通道
- **全色盲 (Achromatopsia)**：灰度显示，增加亮度和对比度
- **无滤镜 (None)**：正常色彩显示

**实现细节**：
- 使用 SVG `<filter>` 和 `<feColorMatrix>` 处理色彩转换
- 配合饱和度和亮度调整提高可视性
- 支持动态切换，即时反映在页面上

#### 4. 鼠标样式 (toggleBigMouse / toggleCrosshair)
- **大鼠标**：自定义放大的鼠标光标，便于视觉障碍用户
- **十字线**：页面中央显示红色十字线，帮助追踪鼠标位置

### 语音和音频功能

#### 5. 页面朗读 (SpeechManager)
智能语音朗读引擎，支持多种配置：

**核心特性**：
- **双 TTS 方案**：
  - Web Speech API（主方案）
  - 微软 Edge TTS（备用方案）
- **语速调整**：0.5x - 10x（超细粒度调控）
- **音量控制**：0 - 100%
- **悬停自动朗读**：鼠标悬停在文本上自动朗读
- **语言设置**：默认中文 (zh-CN)

**配置面板**：
- 启用/禁用朗读功能
- 实时调整语速和音量
- 开启/关闭悬停自动朗读
- 所有设置实时保存到 localStorage

#### 6. 行朗读 (LineReaderManager)
逐行阅读页面内容，适合需要精确控制阅读进度的用户：

**功能**：
- 按行朗读：自动识别页面中的 `<p>`, `<h1-h6>`, `<li>` 等文本元素
- **快捷键导航**：
  - `Alt + ↑` - 朗读上一行
  - `Alt + ↓` - 朗读下一行
- **集成侧边栏**：⬆️ 上一行、⬇️ 下一行按钮集成到功能栏

#### 7. 语音识别与控制 (SpeechRecognitionManager)
使用麦克风进行语音命令控制，支持汉语普通话：

**支持的命令**：
- **缩放控制**：
  - "放大" - 放大页面（最大 200%）
  - "缩小" - 缩小页面（最小 50%）
  - "重置" - 重置为 100%
- **滚动控制**：
  - "下滑" - 向下滚动页面
  - "上滑" - 向上滚动页面
- **朗读控制**：
  - "启用朗读" - 开启语音朗读
  - "关闭朗读" - 关闭语音朗读
  - "下一行" - 朗读下一行
  - "上一行" - 朗读上一行

**工作模式**：
- 连续识别，实时响应语音输入
- 中文识别准确度高，环境安静时效果最佳
- 需要浏览器授权麦克风使用

### 导航与交互

#### 8. 左侧功能栏 (Sidebar)
```html
<aside id="sidebar" class="sidebar" role="complementary" aria-label="功能控制栏">
    <nav id="navbar" class="sidebar-nav" role="navigation" aria-label="功能菜单"></nav>
</aside>
```

**功能**：
- 动态生成的功能按钮导航
- 支持响应式设计（移动设备自动隐藏）
- 包含所有 8 项辅助功能的入口
- 集成行朗读按钮（仅在朗读启用时显示）

#### 9. 顶部导航栏 (Nav Topbar)
```html
<header id="nav-topbar" class="nav-topbar" role="region" aria-label="网页导航栏">
    <div class="nav-topbar-container">
        <div class="site-branding">
            <h1 class="site-name">北魏老弱病残扶持计划</h1>
        </div>
    </div>
</header>
```

**功能**：
- 网站标题和品牌信息
- 顶部固定导航栏（不随页面滚动）
- 语义化 HTML 结构，支持屏幕阅读器

#### 10. 日夜切换按钮 (Web Component)
```html
<theme-button value="dark" id="theme-btn" size="3"></theme-button>
```

**特点**：
- 采用 Web Components 技术实现的原生 HTML 组件
- 紧凑的声明方式，集成到 HTML 中
- 所有逻辑和样式内置于 script.js
- 与 ThemeManager 自动同步主题状态
- 支持流畅的动画过渡

#### 11. 快捷键帮助 (KeyboardHelpManager)
- **打开方式**：点击"⌨️ 快捷键"按钮或按 `Ctrl + Shift + H`
- **显示内容**：所有支持的快捷键和功能说明
- **模态对话框**：独立窗口显示，点击外部或按 ESC 关闭

### 调试与开发功能

#### 12. 调试面板 (DebugManager)
- **快捷键**：`Ctrl + Shift + D` 打开/关闭
- **显示信息**：
  - 浏览器信息（User Agent、语言、平台等）
  - 支持的 APIs（Web Speech、LocalStorage、WebAudio等）
  - 当前功能状态（缩放、主题、语音开启状态）
  - LocalStorage 存储内容
  - 性能指标
  - 设备信息（分辨率、DPI、是否移动设备）

### 无障碍功能

#### ARIA 和语义化
- **跳过链接 (Skip Link)**：`<a href="#main-content" class="skip-link">跳到主要内容</a>`
- **ARIA 标签**：所有交互元素都有 `aria-label`、`aria-haspopup`、`aria-expanded` 等属性
- **角色定义**：`role="navigation"`、`role="dialog"`、`role="group"` 等
- **Live Region**：`aria-live="polite"` 用于动态内容公告

#### 键盘导航
- 所有功能都可通过键盘访问
- Tab 键遍历所有可交互元素
- 焦点指示器清晰可见
- 支持多种快捷键组合

#### 屏幕阅读器支持
- 完整的 ARIA 标签和描述
- 隐藏装饰性元素（`aria-hidden="true"`）
- 实时更新区域（`aria-live` 属性）
- 语义化 HTML 结构

## HTML 结构说明

### 必需的 HTML 元素

在 `<body>` 中需要添加以下核心元素：

```html
<!-- 顶部导航栏 -->
<header id="nav-topbar" class="nav-topbar" role="region" aria-label="网页导航栏">
    <div class="nav-topbar-container">
        <div class="site-branding">
            <h1 class="site-name">北魏老弱病残扶持计划</h1>
        </div>
    </div>
</header>

<!-- 左侧功能栏 -->
<aside id="sidebar" class="sidebar" role="complementary" aria-label="功能控制栏">
    <nav id="navbar" class="sidebar-nav" role="navigation" aria-label="功能菜单"></nav>
</aside>

<!-- 日夜切换按钮 Web Component -->
<theme-button value="dark" id="theme-btn" size="3"></theme-button>

<!-- 主页面内容 -->
<main id="main-content">
    <!-- 网页内容放在这里 -->
</main>

<!-- 样式表 -->
<link rel="stylesheet" href="styles.css">

<!-- 脚本文件（放在 body 末尾） -->
<script src="script.js"></script>
```

## 项目结构

```
webgame/
├── index.html          # 主 HTML 文件（包含所有 HTML 元素）
├── styles.css          # 完整的样式表（2041 行）
├── script.js           # 核心 JavaScript（3129 行，包含所有功能和 Web Component）
├── index.css           # 自定义补充样式（可选）
├── LICENSE             # 许可证信息
└── README.md           # 本文件
```

## 技术架构

### 类设计

script.js 采用 OOP 设计，由以下 8 个管理类组成：

| 类名 | 职责 | 关键方法 |
|------|------|--------|
| `ZoomManager` | 页面缩放 | `increaseZoom()`, `decreaseZoom()`, `resetZoom()` |
| `ThemeManager` | 主题切换 | `toggleTheme()`, `applyTheme()` |
| `SpeechManager` | 语音朗读 | `speak()`, `toggleSpeech()`, `setSpeed()`, `setVolume()` |
| `LineReaderManager` | 行朗读 | `readNextLine()`, `readPreviousLine()` |
| `ColorBlindManager` | 色盲滤镜 | `applyMode()` |
| `SpeechRecognitionManager` | 语音识别 | `start()`, `stop()`, `processCommand()` |
| `KeyboardHelpManager` | 快捷键帮助 | `showKeyboardHelp()` |
| `DebugManager` | 调试功能 | `showDebugPanel()`, `collectDebugInfo()` |

### Web Component

**ThemeButton Web Component** 嵌入在 script.js 中：
- 自定义元素名：`<theme-button>`
- 属性：`value`（初始主题），`id`（DOM 标识），`size`（按钮大小）
- 事件：`change` 事件与 ThemeManager 同步

### 数据持久化

所有用户设置都存储在 localStorage 中：

```javascript
// 存储键名
'pageZoomLevel'        // 缩放级别 (50-200)
'pageTheme'            // 当前主题 ('light' / 'dark')
'speechSettings'       // 语音速度和音量
'speechEnabled'        // 朗读功能启用状态
'hoverReadEnabled'     // 悬停阅读启用状态
'colorblindMode'       // 色盲滤镜模式
```

## 使用指南

### 快速开始

1. **在浏览器中打开 `index.html`**
   - 自动初始化所有管理器
   - 自动加载用户保存的设置
   - 左侧功能栏自动渲染

2. **使用功能**
   - 点击左侧按钮打开各功能面板
   - 使用快捷键快速操作
   - 所有设置自动保存

3. **屏幕阅读器用户**
   - 首先按 Tab 键到"跳到主要内容"链接
   - 然后开启语音朗读功能
   - 使用 Alt + ↑/↓ 逐行阅读

### 快捷键参考表

#### 缩放控制
| 操作 | 快捷键 |
|------|--------|
| 放大页面 | `Ctrl + +` |
| 缩小页面 | `Ctrl + -` |
| 重置缩放 | `Ctrl + 0` |

#### 行朗读
| 操作 | 快捷键 |
|------|--------|
| 上一行 | `Alt + ↑` |
| 下一行 | `Alt + ↓` |

#### 系统
| 操作 | 快捷键 |
|------|--------|
| 快捷键帮助 | `Ctrl + Shift + H` |
| 调试面板 | `Ctrl + Shift + D` |

## 浏览器兼容性

| 浏览器 | 最低版本 | 备注 |
|--------|---------|------|
| Chrome | 90+ | 完全支持 Web Speech API |
| Edge | 90+ | 支持微软 TTS 备用方案 |
| Firefox | 88+ | 需要启用 Web Speech API |
| Safari | 14+ | 部分 API 支持有限 |

## 技术栈

- **HTML5**：语义化结构，ARIA 无障碍标准
- **CSS3**：自定义属性、Grid、Flexbox、动画
- **JavaScript ES6+**：类、箭头函数、async/await、解构赋值
- **Web APIs**：
  - Web Speech API - 语音合成和识别
  - LocalStorage API - 本地数据持久化
  - Web Components - 自定义 HTML 元素
  - DOM API - 动态 DOM 操作
  - SVG API - 色盲滤镜实现

## 开发说明

### 添加新功能

1. **创建管理类**：继承基本模式，实现 `init()` 和状态管理
2. **注册到初始化流程**：在 `DOMContentLoaded` 中创建实例
3. **添加 HTML 元素**（如需要）：更新 `NavbarRenderer.render()`
4. **添加样式**：在 styles.css 中添加对应的 CSS
5. **添加快捷键**（如需要）：在相应管理类中实现

### 调试技巧

打开浏览器控制台，可使用全局调试对象：

```javascript
// 页面缩放
debugPageZoom.getCurrentZoom()      // 获取当前缩放
debugPageZoom.setZoom(150)          // 设置为 150%

// 主题
debugPageZoom.getCurrentTheme()     // 获取当前主题
debugPageZoom.toggleTheme()         // 切换主题

// 语音
debugPageZoom.isSpeaking()          // 是否正在朗读
debugPageZoom.readText('测试')      // 朗读文本

// 打开调试面板
window.showDebug()                  // 显示调试信息
window.logDebug()                   // 在控制台输出
```

## 许可证

MIT License - 详见 LICENSE 文件

## 更新日志

### v2.0（最新）
- ✅ 完整重写代码架构，采用类设计
- ✅ 新增色盲模式（5 种滤镜类型）
- ✅ 新增语音识别和控制
- ✅ 新增行朗读功能
- ✅ 优化 CSS，移除重复选择器
- ✅ 增强无障碍支持
- ✅ 完善调试面板

### v1.0
- 基础功能：缩放、主题、朗读
