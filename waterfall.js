/* ============================================
   瀑布式滚动动画效果
   ============================================ */

class WaterfallScroll {
  constructor() {
    this.container = document.getElementById('waterfall-container');
    this.boxes = document.querySelectorAll('.waterfall-box');
    this.currentIndex = 0;
    this.totalBoxes = this.boxes.length;
    this.isScrolling = false;
    this.scrollDelay = 600; // 优化滚动延迟时间（毫秒）
    this.lastScrollTime = 0;
    this.scrollThrottle = 400; // 防止快速滚动

    // 初始化
    this.init();
  }

  init() {
    if (this.boxes.length === 0) {
      console.error('未找到瀑布式盒子元素');
      return;
    }

    // 确保容器可见
    if (this.container) {
      this.container.style.visibility = 'visible';
      this.container.style.opacity = '1';
    }

    // 首先确保第一个盒子显示（覆盖CSS的默认状态）
    this.boxes.forEach((box, index) => {
      box.classList.remove('active', 'previous', 'next', 'hidden');
      box.setAttribute('tabindex', '0'); // 添加键盘焦点支持
      if (index === 0) {
        box.classList.add('active');
      } else {
        box.classList.add('hidden');
      }
    });

    // 设置当前索引为0
    this.currentIndex = 0;

    // 添加滚动事件监听 - 使用passive: false以允许preventDefault
    window.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });

    // 添加键盘事件监听（无障碍支持）
    window.addEventListener('keydown', this.handleKeydown.bind(this));

    // 添加触摸事件监听（移动端支持）
    this.setupTouchEvents();

    // 添加resize事件监听
    window.addEventListener('resize', this.handleResize.bind(this));

    // 标记页面无障碍属性
    this.boxes[0].focus(); // 自动聚焦第一个盒子

    console.log('瀑布式滚动初始化完成，共', this.totalBoxes, '个盒子，当前激活盒子:', this.currentIndex);
  }

  // 更新盒子状态
  updateBoxStates() {
    this.boxes.forEach((box, index) => {
      box.classList.remove('active', 'previous', 'next', 'hidden');

      if (index === this.currentIndex) {
        box.classList.add('active');
        box.setAttribute('aria-current', 'true');
      } else {
        box.removeAttribute('aria-current');
        if (index === this.currentIndex - 1) {
          box.classList.add('previous');
        } else if (index === this.currentIndex + 1) {
          box.classList.add('next');
        } else {
          box.classList.add('hidden');
        }
      }
    });
  }

  // 激活指定索引的盒子
  activateBox(index) {
    // 确保索引在有效范围内
    this.currentIndex = Math.max(0, Math.min(index, this.totalBoxes - 1));

    // 更新盒子状态
    this.updateBoxStates();

    // 将焦点设置到当前盒子
    this.boxes[this.currentIndex].focus();

    // 触发自定义事件
    this.dispatchBoxChangeEvent();
  }

  // 滚动到下一个盒子
  nextBox() {
    if (this.currentIndex < this.totalBoxes - 1 && !this.isScrolling) {
      this.isScrolling = true;
      this.activateBox(this.currentIndex + 1);

      // 重置滚动锁定
      setTimeout(() => {
        this.isScrolling = false;
      }, this.scrollDelay);

      return true;
    }
    return false;
  }

  // 滚动到上一个盒子
  previousBox() {
    if (this.currentIndex > 0 && !this.isScrolling) {
      this.isScrolling = true;
      this.activateBox(this.currentIndex - 1);

      // 重置滚动锁定
      setTimeout(() => {
        this.isScrolling = false;
      }, this.scrollDelay);

      return true;
    }
    return false;
  }

  // 检测页面是否有缩放导致内容超出范围
  hasContentOverflow() {
    // 检查容器内是否有超出的内容
    const container = document.getElementById('waterfall-container');
    if (!container) return false;

    // 检查当前活跃盒子是否有溢出
    const activeBox = container.querySelector('.waterfall-box.active');
    if (!activeBox) return false;

    const boxContent = activeBox.querySelector('.box-content');
    if (!boxContent) return false;

    // 检查内容是否超出盒子范围
    return boxContent.scrollHeight > boxContent.clientHeight ||
        boxContent.scrollWidth > boxContent.clientWidth;
  }

  // 检查是否在滚动边界（顶部或底部）
  isAtScrollBoundary() {
    const activeBox = document.querySelector('.waterfall-box.active');
    if (!activeBox) return true;

    const boxContent = activeBox.querySelector('.box-content');
    if (!boxContent) return true;

    // 获取当前滚动位置
    const scrollTop = boxContent.scrollTop;
    const scrollHeight = boxContent.scrollHeight;
    const clientHeight = boxContent.clientHeight;

    // 检查是否在顶部（允许 2px 的容差）
    const isAtTop = scrollTop <= 2;

    // 检查是否在底部（允许 2px 的容差）
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 2;

    return isAtTop || isAtBottom;
  }

  // 处理滚动事件 - 优化版本
  handleScroll(event) {
    const now = Date.now();

    // 防止过于频繁的滚动
    if (now - this.lastScrollTime < this.scrollThrottle || this.isScrolling) {
      event.preventDefault();
      return;
    }

    // 检查是否有内容超出范围
    const hasOverflow = this.hasContentOverflow();

    // 如果有内容超出范围且不在滚动边界，允许正常滚动
    if (hasOverflow && !this.isAtScrollBoundary()) {
      // 有超出内容且不在边界，允许正常滚动，不跳转页面
      // 不调用 preventDefault()，允许默认滚动
      return;
    }

    this.lastScrollTime = now;

    // 判断滚动方向
    const delta = Math.sign(event.deltaY);

    if (delta > 0) {
      // 向下滚动 - 下一个盒子
      event.preventDefault();
      this.nextBox();
    } else if (delta < 0) {
      // 向上滚动 - 上一个盒子
      event.preventDefault();
      this.previousBox();
    }

    return true;
  }

  // 处理键盘事件 - 增强无障碍
  handleKeydown(event) {
    // 如果焦点在输入框中，不处理
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        // 向下滚动 - 下一个盒子
        event.preventDefault();
        this.nextBox();
        break;

      case 'ArrowUp':
      case 'PageUp':
        // 向上滚动 - 上一个盒子
        event.preventDefault();
        this.previousBox();
        break;

      case 'Home':
        // 滚动到第一个盒子
        event.preventDefault();
        this.activateBox(0);
        break;

      case 'End':
        // 滚动到最后一个盒子
        event.preventDefault();
        this.activateBox(this.totalBoxes - 1);
        break;

      case '1':
      case '2':
      case '3':
        // 直接跳转到指定盒子（1-3）
        const index = parseInt(event.key) - 1;
        if (index >= 0 && index < this.totalBoxes) {
          event.preventDefault();
          this.activateBox(index);
        }
        break;
    }
  }

  // 设置触摸事件（移动端支持）
  setupTouchEvents() {
    let touchStartY = 0;
    let touchEndY = 0;
    const threshold = 30; // 降低滑动距离阈值，提高反应灵敏度

    document.addEventListener('touchstart', (event) => {
      touchStartY = event.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      if (this.isScrolling) return;

      touchEndY = event.changedTouches[0].screenY;
      const deltaY = touchStartY - touchEndY;

      // 检查滑动距离和方向
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          // 向上滑动 - 下一个盒子
          this.nextBox();
        } else {
          // 向下滑动 - 上一个盒子
          this.previousBox();
        }
      }
    }, { passive: true });
  }

  // 处理窗口大小变化
  handleResize() {
    // 重新计算布局（如果需要）
    this.updateBoxStates();
  }

  // 分发盒子变化事件
  dispatchBoxChangeEvent() {
    const event = new CustomEvent('waterfallBoxChange', {
      detail: {
        currentIndex: this.currentIndex,
        totalBoxes: this.totalBoxes,
        currentBox: this.boxes[this.currentIndex]
      }
    });
    window.dispatchEvent(event);
  }

// 跳转到指定盒子
  goToBox(index) {
    if (index >= 0 && index < this.totalBoxes) {
      this.activateBox(index);
      return true;
    }
    return false;
  }
}

// 初始化瀑布式滚动 - 改进版本
function initWaterfallScroll() {
  // 检查是否已经存在waterfallScroll实例
  if (window.waterfallScroll) {
    console.log('瀑布式滚动已初始化，跳过重复初始化');
    return;
  }

  // 直接检查DOM元素是否存在
  const container = document.getElementById('waterfall-container');
  const boxes = document.querySelectorAll('.waterfall-box');

  if (!container || boxes.length === 0) {
    console.warn('瀑布式容器或盒子未找到，等待DOM完全加载...');
    // 如果元素不存在，稍后重试
    setTimeout(initWaterfallScroll, 100);
    return;
  }

  try {
    const waterfall = new WaterfallScroll();

    // 将实例暴露到全局，以便其他脚本可以访问
    window.waterfallScroll = waterfall;

    // 添加导航指示器
    createNavigationIndicator(waterfall);

    console.log('瀑布式滚动效果已启用，当前盒子数:', waterfall.totalBoxes);

    // 确保容器可见
    if (container) {
      container.style.visibility = 'visible';
      container.style.opacity = '1';
    }

    // 使用统一的盒子状态管理，不单独处理第一个盒子
    // 让CSS和WaterfallScroll类统一管理所有盒子的状态
    // 不设置内联样式，让CSS规则生效
  } catch (error) {
    console.error('瀑布式滚动初始化失败:', error);
    // 如果初始化失败，稍后重试
    setTimeout(initWaterfallScroll, 500);
  }
}

// 使用更可靠的初始化方式，确保在script.js之后运行
(function () {
  console.log('瀑布式滚动脚本开始加载...');

  // 直接初始化，不等待script.js
  function initializeWaterfall() {
    // 如果DOM已经加载完成，直接初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      console.log('文档已准备就绪，开始初始化瀑布式滚动');
      // 立即初始化，不等待script.js
      setTimeout(initWaterfallScroll, 100);
    } else {
      // 监听DOMContentLoaded事件
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded事件触发，开始初始化瀑布式滚动');
        // 立即初始化，不等待script.js
        setTimeout(initWaterfallScroll, 200);
      });

      // 同时监听load事件作为备用
      window.addEventListener('load', () => {
        console.log('window.load事件触发，开始初始化瀑布式滚动');
        // 立即初始化，不等待script.js
        setTimeout(initWaterfallScroll, 300);
      });
    }
  }

  // 立即开始初始化
  initializeWaterfall();
})();

// 创建导航指示器
function createNavigationIndicator(waterfall) {
  const indicator = document.createElement('div');
  indicator.className = 'waterfall-indicator';
  indicator.setAttribute('role', 'navigation');
  indicator.setAttribute('aria-label', '瀑布式内容导航');
  indicator.style.cssText = `
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(255, 255, 255, 0.92);
        padding: 15px 10px;
        border-radius: 20px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(26, 115, 232, 0.1);
    `;

  // 深色模式支持
  const darkModeStyle = `
        html.theme-dark .waterfall-indicator {
            background: rgba(25, 25, 25, 0.92);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            border-color: rgba(107, 163, 255, 0.1);
        }
        
        html.theme-dark .waterfall-indicator-dot {
            background: rgba(255, 255, 255, 0.2);
        }
        
        html.theme-dark .waterfall-indicator-dot.active {
            background: #6ba3ff;
            box-shadow: 0 0 12px rgba(107, 163, 255, 0.5);
        }
        
        html.theme-dark .waterfall-indicator-dot:hover {
            background: rgba(107, 163, 255, 0.4);
        }
    `;

  // 添加样式
  const style = document.createElement('style');
  style.textContent = darkModeStyle;
  document.head.appendChild(style);

  // 创建指示点
  for (let i = 0; i < waterfall.totalBoxes; i++) {
    const dot = document.createElement('button');
    dot.className = 'waterfall-indicator-dot';
    dot.dataset.index = i;
    dot.setAttribute('aria-label', `跳转到第 ${i + 1} 页`);
    dot.type = 'button';
    dot.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(26, 115, 232, 0.2);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
            border: none;
            padding: 0;
            display: block;
        `;

    // 点击跳转
    dot.addEventListener('click', () => {
      waterfall.goToBox(i);
    });

    // 悬停效果
    dot.addEventListener('mouseenter', () => {
      if (i !== waterfall.currentIndex) {
        dot.style.background = 'rgba(26, 115, 232, 0.3)';
        dot.style.transform = 'scale(1.2)';
      }
    });

    dot.addEventListener('mouseleave', () => {
      if (i !== waterfall.currentIndex) {
        dot.style.background = 'rgba(26, 115, 232, 0.2)';
        dot.style.transform = 'scale(1)';
      }
    });

    indicator.appendChild(dot);
  }

  document.body.appendChild(indicator);

  // 更新指示器状态
  function updateIndicator() {
    const dots = indicator.querySelectorAll('.waterfall-indicator-dot');
    dots.forEach((dot, index) => {
      if (index === waterfall.currentIndex) {
        dot.classList.add('active');
        dot.style.background = '#1a73e8';
        dot.style.transform = 'scale(1.4)';
        dot.style.boxShadow = '0 0 12px rgba(26, 115, 232, 0.5)';
      } else {
        dot.classList.remove('active');
        dot.style.background = 'rgba(26, 115, 232, 0.2)';
        dot.style.transform = 'scale(1)';
        dot.style.boxShadow = 'none';
      }
    });
  }

  // 监听盒子变化事件
  window.addEventListener('waterfallBoxChange', updateIndicator);

  // 初始更新
  updateIndicator();
}

// 为语音识别提供公共方法
WaterfallScroll.prototype.scrollNext = function () {
  return this.nextBox();
};

WaterfallScroll.prototype.scrollPrev = function () {
  return this.previousBox();
};

// 导出类（如果使用模块）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaterfallScroll;
}
