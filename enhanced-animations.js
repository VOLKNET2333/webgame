// ============================================
// 页面增强动画效果
// ============================================

(function () {
  'use strict';

  // 页面加载动画
  window.addEventListener('load', function () {
    document.body.classList.add('page-loaded');

    // 添加页面加载完成的淡入效果
    const pageWrapper = document.querySelector('.content-wrapper, .waterfall-container');
    if (pageWrapper) {
      pageWrapper.style.opacity = '0';
      pageWrapper.style.transform = 'translateY(20px)';
      setTimeout(() => {
        pageWrapper.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        pageWrapper.style.opacity = '1';
        pageWrapper.style.transform = 'translateY(0)';
      }, 100);
    }
  });

  // 元素进入视口动画观察器
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');

        // 为子元素添加延迟动画
        const children = entry.target.querySelectorAll('[data-animate]');
        children.forEach((child, index) => {
          setTimeout(() => {
            child.classList.add('animate-in');
          }, index * 100);
        });
      }
    });
  }, observerOptions);

  // 观察所有需要动画的元素
  document.addEventListener('DOMContentLoaded', function () {
    const animatedElements = document.querySelectorAll('.stat-card, .feature-card, .tech-card, .benefit-item, .challenge-item, .need-item, .solution-card, .roadmap-phase');
    animatedElements.forEach(el => observer.observe(el));
  });

  // 鼠标跟随光效
  function createMouseGlow() {
    const glow = document.createElement('div');
    glow.className = 'mouse-glow';
    glow.style.cssText = `
      position: fixed;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(26, 115, 232, 0.15) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.3s ease;
      opacity: 0;
    `;
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
      glow.style.left = (e.clientX - 100) + 'px';
      glow.style.top = (e.clientY - 100) + 'px';
      glow.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });
  }

  // 平滑滚动增强
  function smoothScrollEnhancement() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          // 添加高亮动画
          target.classList.add('highlight-flash');
          setTimeout(() => {
            target.classList.remove('highlight-flash');
          }, 1500);
        }
      });
    });
  }

  // 卡片悬浮视差效果
  function cardParallaxEffect() {
    const cards = document.querySelectorAll('.hover-lift, .stat-card, .feature-card');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // 文字打字机效果
  function typewriterEffect(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }

    type();
  }

  // 数字滚动动画
  function animateNumber(element, start, end, duration = 2000, originalText = '') {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    let lastUpdateTime = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastUpdateTime;

      // 确保按正确的时间间隔更新
      if (elapsed >= 16) {
        current += increment;
        lastUpdateTime = now;

        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
          current = end;
          clearInterval(timer);

          // 动画完成后恢复原始文本
          if (originalText) {
            element.textContent = originalText;
          } else {
            element.textContent = Math.round(current);
          }
          return;
        }

        // 如果原始文本包含非数字字符，在动画期间显示数字+字符
        if (originalText && originalText.match(/[^0-9]/)) {
          // 提取非数字部分
          const nonNumericPart = originalText.replace(/[0-9]/g, '');
          // 显示当前数字 + 非数字部分
          element.textContent = Math.round(current) + nonNumericPart;
        } else {
          element.textContent = Math.round(current);
        }
      }
    }, 16);
  }

  // 统计数字动画
  function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
          entry.target.classList.add('animated');
          const originalText = entry.target.textContent;

          // 提取数字部分
          const numberMatch = originalText.match(/\d+/);
          if (numberMatch) {
            const number = parseInt(numberMatch[0]);

            // 保存原始文本到数据属性，以便在动画完成后恢复
            entry.target.dataset.originalText = originalText;

            // 开始动画，传入原始文本以便在动画期间和完成后都能正确显示
            animateNumber(entry.target, 0, number, 2000, originalText);
          }
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => statsObserver.observe(el));
  }

  // 进度条动画
  function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar');

    const progressObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
          entry.target.classList.add('animated');
          const targetWidth = entry.target.style.width;
          entry.target.style.width = '0%';

          setTimeout(() => {
            entry.target.style.transition = 'width 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            entry.target.style.width = targetWidth;
          }, 200);
        }
      });
    }, { threshold: 0.5 });

    progressBars.forEach(bar => progressObserver.observe(bar));
  }

  // 添加涟漪效果
  function addRippleEffect() {
    const rippleElements = document.querySelectorAll('.btn, .highlight-card, .stat-card');

    rippleElements.forEach(element => {
      element.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          left: ${x}px;
          top: ${y}px;
          pointer-events: none;
          animation: ripple 0.6s ease-out;
        `;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  // 添加粒子效果
  function createParticles(container, count = 20) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 2}px;
        height: ${Math.random() * 4 + 2}px;
        background: rgba(26, 115, 232, ${Math.random() * 0.5 + 0.3});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float ${Math.random() * 10 + 5}s ease-in-out infinite;
        animation-delay: ${Math.random() * 5}s;
      `;
      container.appendChild(particle);
    }
  }

  // 主题切换动画增强
  function enhanceThemeTransition() {
    const themeBtn = document.getElementById('theme-btn');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', function () {
      document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';

      // 添加切换动画效果
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(26, 115, 232, 0.1) 0%, transparent 70%);
        pointer-events: none;
        z-index: 10000;
        animation: fadeOut 0.5s ease forwards;
      `;
      document.body.appendChild(overlay);

      setTimeout(() => overlay.remove(), 500);
    });
  }

  // 滚动进度指示器
  function createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #1a73e8, #4a90e2, #6ba3ff);
      z-index: 10001;
      transition: width 0.1s ease;
      width: 0%;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / scrollHeight) * 100;
      progressBar.style.width = scrolled + '%';
    });
  }

  // 初始化所有增强效果
  document.addEventListener('DOMContentLoaded', function () {
    // 等待script.js加载完成后再初始化
    setTimeout(() => {
      // 基础增强
      smoothScrollEnhancement();
      animateStats();
      animateProgressBars();
      enhanceThemeTransition();

      // 鼠标辉光效果（在所有页面启用）
      createMouseGlow();

      // 视觉增强（可选，不影响性能）
      if (window.innerWidth > 768) {
        createScrollProgress();
      }

      console.log('[Enhanced Animations] 增强动画已初始化');
    }, 1000); // 增加延迟到1000ms确保script.js完全加载
  });

  // 添加必要的CSS动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    @keyframes fadeOut {
      to {
        opacity: 0;
      }
    }

    .highlight-flash {
      animation: highlightFlash 1.5s ease;
    }

    @keyframes highlightFlash {
      0%, 100% {
        background-color: transparent;
      }
      50% {
        background-color: rgba(26, 115, 232, 0.1);
      }
    }

    .is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    .page-loaded body {
      overflow-y: auto;
    }
  `;
  document.head.appendChild(style);

})();
