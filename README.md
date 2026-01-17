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

#### 8. 快捷键帮助 (KeyboardHelpManager)
- **打开方式**：点击"⌨️ 快捷键"按钮或按 `Ctrl + Shift + H`
- **显示内容**：所有支持的快捷键和功能说明
- **模态对话框**：独立窗口显示，点击外部或按 ESC 关闭

### 调试与开发功能

#### 9. 调试面板 (DebugManager)
- **快捷键**：`Ctrl + Shift + D` 打开/关闭
- **显示信息**：
  - 浏览器信息（User Agent、语言、平台等）
  - 支持的 APIs（Web Speech、LocalStorage、WebAudio等）
  - 当前功能状态（缩放、主题、语音开启状态）
  - LocalStorage 存储内容
  - 性能指标
  - 设备信息（分辨率、DPI、是否移动设备）

### 无障碍功能

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
<link rel="stylesheet" href="project/styles.css">

<!-- 脚本文件（放在 body 末尾） -->
<script src="project/script.js"></script>
```

### 让您的网页适配深浅色模式

本项目使用 CSS 自定义属性（CSS Variables）实现深浅色模式切换。要让您的网页内容正确适配深浅色模式，请遵循以下指南：

#### 1. 使用 CSS 自定义属性定义颜色

在您的 CSS 中，使用项目定义的 CSS 自定义属性，而不是硬编码颜色值：

```css
/* ✅ 正确：使用 CSS 自定义属性 */
.my-element {
  color: var(--text-color);
  background-color: var(--background-color);
  border-color: var(--border-color);
}

/* ❌ 错误：硬编码颜色值 */
.my-element {
  color: #202124; /* 浅色模式颜色 */
  background-color: #ffffff;
}
```

#### 2. 可用的 CSS 自定义属性

项目定义了以下 CSS 自定义属性，这些属性会根据当前主题自动切换：

| 变量名 | 浅色模式值 | 深色模式值 | 描述 |
|--------|------------|------------|------|
| `--primary-color` | `#1a73e8` | `#6ba3ff` | 主要颜色（按钮、链接等） |
| `--text-color` | `#202124` | `#ffffff` | 主要文本颜色 |
| `--background-color` | `#ffffff` | `#121212` | 页面背景颜色 |
| `--border-color` | `#dadce0` | `#4a4a4a` | 边框颜色 |
| `--hover-background` | `#f8f9fa` | `#1e1e1e` | 悬停背景颜色 |

#### 3. 为自定义组件添加主题适配

如果您添加了自定义的 UI 组件，请确保它们支持深浅色模式：

```css
/* 自定义按钮示例 */
.custom-button {
  padding: 12px 24px;
  border: 2px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.custom-button:hover {
  background-color: var(--hover-background);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* 自定义卡片示例 */
.custom-card {
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

html.theme-dark .custom-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

#### 4. 图片和媒体内容适配

对于图片和媒体内容，可以使用 CSS 滤镜或提供不同版本的资源：

```css
/* 方法1：使用 CSS 滤镜调整图片亮度 */
.theme-adaptive-image {
  filter: brightness(1);
}

html.theme-dark .theme-adaptive-image {
  filter: brightness(0.8);
}

/* 方法2：使用不同图片源（需要准备两套资源） */
.theme-adaptive-img {
  content: url('light-image.jpg');
}

html.theme-dark .theme-adaptive-img {
  content: url('dark-image.jpg');
}
```

#### 5. 使用主题类名进行精确控制

HTML 元素会根据当前主题添加相应的类名：
- 浅色模式：`<html class="theme-light">`
- 深色模式：`<html class="theme-dark">`

您可以使用这些类名进行精确的样式控制：

```css
/* 仅在深色模式下应用的样式 */
html.theme-dark .dark-mode-only {
  display: block;
}

html.theme-light .dark-mode-only {
  display: none;
}

/* 仅在浅色模式下应用的样式 */
html.theme-light .light-mode-only {
  display: block;
}

html.theme-dark .light-mode-only {
  display: none;
}
```

#### 6. JavaScript 中的主题检测

在 JavaScript 中，您可以检测当前主题并做出相应调整：

```javascript
// 检测当前主题
const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';

// 监听主题变化
const themeBtn = document.getElementById('theme-btn');
if (themeBtn) {
  themeBtn.addEventListener('change', function(e) {
    const newTheme = e.detail; // 'light' 或 'dark'
    console.log('主题已切换为:', newTheme);
    // 在这里执行主题相关的逻辑
  });
}

// 或者监听 DOM 类名变化
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.attributeName === 'class') {
      const isDark = document.documentElement.classList.contains('theme-dark');
      console.log('主题变化:', isDark ? '深色模式' : '浅色模式');
    }
  });
});

observer.observe(document.documentElement, { attributes: true });
```


## 项目结构

```
webgame
├── project\styles.css          # 完整的样式表（2041 行）
├── project\script.js           # 核心 JavaScript（3129 行，包含所有功能和 Web Component）
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

## 使用指南

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

## 许可证

MIT License - 详见 LICENSE 文件

