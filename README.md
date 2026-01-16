# 北魏老弱病残扶持计划

一个具有无障碍功能的现代化网页应用。

## 功能特性

### 核心功能
- **页面缩放** - 支持 50% - 200% 的灵活缩放
- **深色模式** - 基于 Day-night-toggle-button 4.0 的 Web Component 日夜切换
- **语音朗读** - 支持多种语言的页面朗读功能
- **行朗读** - 按行阅读页面内容
- **鼠标样式** - 大鼠标和十字线功能
- **键盘快捷键** - 丰富的快捷键支持

### 无障碍支持
- ARIA标签和角色
- 键盘导航
- 屏幕阅读器兼容
- 高对比度支持
- 焦点指示器

## 项目结构

```
webgame/
├── index.html          # 主HTML文件
├── styles.css          # 主样式表
├── index.css           # 自定义样式
├── script.js           # 主JavaScript文件（包含所有功能）
├── LICENSE             # 许可证信息
└── README.md           # 本文件
```

## 快速开始

1. 在浏览器中打开 `index.html`
2. 使用导航栏中的按钮访问各项功能
3. 使用快捷键快速操作

## 键盘快捷键

| 操作 | 快捷键 |
|------|--------|
| 放大页面 | `Ctrl + +` |
| 缩小页面 | `Ctrl + -` |
| 重置缩放 | `Ctrl + 0` |
| 打开/关闭调试面板 | `Ctrl + Shift + D` |
| 阅读上一行 | `Alt + ↑` |
| 阅读下一行 | `Alt + ↓` |

## 日夜切换按钮

集成了 Day-night-toggle-button 4.0 版本，采用 Web Component 技术：
- 紧凑的 HTML 标签：`<theme-button value="light" id="theme-btn" size="3"></theme-button>`
- 所有样式和逻辑整合到 script.js
- 支持系统主题偏好自动检测
- 支持流畅的动画过渡

## 许可证

ISC License - 详见 LICENSE 文件

## 技术栈

- HTML5
- CSS3（含变量和Grid/Flexbox）
- JavaScript ES6+
- Web Components
- Web Speech API
- LocalStorage
- ARIA 无障碍标准

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 其他现代浏览器

## 开发说明

所有代码集中在三个文件中，便于维护：
- `script.js` - 包含所有JavaScript逻辑和Web Component实现
- `styles.css` - 包含所有样式定义
- `index.html` - 简洁的HTML结构

无需额外的构建工具或打包流程，直接在浏览器中运行。
