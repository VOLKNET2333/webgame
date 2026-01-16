// ============================================
// 无障碍网页功能配置
// ============================================

// 调试配置 - 控制是否启用调试功能
let DEBUG_CONFIG = {
    enabled: true,                      // 是否启用调试面板
    disableWebSpeechAPI: false         // 是否禁用Web Speech API（测试微软TTS）
};

// 从 localStorage 恢复调试配置（如果存在）
(function restoreDebugConfig() {
    try {
        const saved = localStorage.getItem('DEBUG_CONFIG');
        if (saved) {
            const config = JSON.parse(saved);
            DEBUG_CONFIG = { ...DEBUG_CONFIG, ...config };
            console.log('[DEBUG] 已从存储恢复调试配置');
        }
    } catch (e) {
        console.warn('[DEBUG] 无法恢复调试配置:', e.message);
    }
})();



// 顶栏功能配置 - 使用const定义
const NAVBAR_FEATURES = [
    {
        id: 'zoom-decrease',
        type: 'single-button',
        label: '缩小页面',
        button: { id: 'zoom-decrease', text: '缩小 −', title: '减小页面显示大小，按Ctrl+-', action: 'decreaseZoom', ariaLabel: '缩小页面' }
    },
    {
        id: 'zoom-reset',
        type: 'single-button',
        label: '重置缩放',
        button: { id: 'zoom-reset', text: '重 置', title: '重置页面缩放到100%', action: 'resetZoom', ariaLabel: '重置页面缩放' }
    },
    {
        id: 'zoom-increase',
        type: 'single-button',
        label: '放大页面',
        button: { id: 'zoom-increase', text: '放大 +', title: '增大页面显示大小，按Ctrl++', action: 'increaseZoom', ariaLabel: '放大页面' }
    },
    {
        id: 'mouse-style',
        type: 'single-button',
        label: '鼠标样式',
        button: { id: 'mouse-style-btn', text: '🖱️ 鼠标样式', title: '打开鼠标样式设置面板', ariaLabel: '打开鼠标样式设置面板' }
    },
    {
        id: 'colorblind-mode',
        type: 'single-button',
        label: '色盲模式',
        button: { id: 'colorblind-btn', text: '👁️ 色盲模式', title: '打开色盲模式设置面板', ariaLabel: '打开色盲模式设置面板' }
    },
    {
        id: 'speech-panel',
        type: 'single-button',
        label: '页面朗读',
        button: { id: 'speech-panel-btn', text: '📖 页面朗读', title: '打开朗读配置面板', ariaLabel: '打开页面朗读配置面板' }
    },
    {
        id: 'speech-recognition',
        type: 'single-button',
        label: '语音识别',
        button: { id: 'speech-recognition-btn', text: '🎤 语音控制', title: '打开语音识别设置面板', ariaLabel: '语音识别' }
    },
    {
        id: 'keyboard-help',
        type: 'single-button',
        label: '快捷键帮助',
        button: { id: 'keyboard-help-btn', text: '⌨️ 快捷键', title: '查看快捷键帮助', action: 'showKeyboardHelp', ariaLabel: '快捷键帮助' }
    },
    {
        id: 'line-reader-prev',
        type: 'single-button',
        label: '上一行',
        button: { id: 'line-reader-prev', text: '⬆️ 上一行', title: '朗读上一行', action: 'readPreviousLine', ariaLabel: '朗读上一行' },
        isLineReader: true
    },
    {
        id: 'line-reader-next',
        type: 'single-button',
        label: '下一行',
        button: { id: 'line-reader-next', text: '⬇️ 下一行', title: '朗读下一行', action: 'readNextLine', ariaLabel: '朗读下一行' },
        isLineReader: true
    }
];

const KEYBOARD_HELP = [
    {
        category: '页面缩放',
        shortcuts: [
            { key: 'Ctrl/Cmd + +', desc: '放大页面' },
            { key: 'Ctrl/Cmd + -', desc: '缩小页面' },
            { key: 'Ctrl/Cmd + 0', desc: '重置缩放' }
        ]
    },
    {
        category: '行阅读',
        shortcuts: [
            { key: 'Alt + ↑', desc: '阅读上一行' },
            { key: 'Alt + ↓', desc: '阅读下一行' }
        ]
    }
];

// ============================================
// 缩放配置
// ============================================

const ZOOM_CONFIG = {
    min: 50,        // 最小缩放 50%
    max: 200,       // 最大缩放 200%
    default: 100,   // 默认 100%
    step: 10,       // 每次改变 10%
    storageKey: 'pageZoomLevel'
};

// 主题配置
const THEME_CONFIG = {
    light: 'light',
    dark: 'dark',
    default: 'light',
    storageKey: 'pageTheme'
};

// 语音配置
const SPEECH_CONFIG = {
    speedMin: 0.5,
    speedMax: 10,
    speedDefault: 1,
    volumeMin: 0,
    volumeMax: 1,
    volumeDefault: 1,
    lang: 'zh-CN',
    storageKey: 'speechSettings',
    enabledKey: 'speechEnabled',
    hoverReadKey: 'hoverReadEnabled'
};

// ============================================
// 语音管理功能实现
// ============================================

class SpeechManager {
    constructor() {
        // 初始化基本属性
        this.synth = null;
        this.SpeechSynthesisUtterance = null;
        this.enabled = false;
        this.hoverReadEnabled = false; // 鼠标悬停自动阅读
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.lastReadElement = null; // 记录最后读过的元素，防止重复读
        this.settings = this.loadSettings();
        this.initialized = false; // 防止重复初始化
        this.useWebSpeechAPI = true; // 标记使用哪种TTS方案
        this.currentAudio = null; // 当前播放的音频

        // 检查浏览器支持
        let SpeechSynthesisUtterance = window.SpeechSynthesisUtterance;
        let speechSynthesis = window.speechSynthesis;

        // 调试模式：禁用Web Speech API用于测试
        if (DEBUG_CONFIG.disableWebSpeechAPI) {
            SpeechSynthesisUtterance = null;
            speechSynthesis = null;
            console.warn('[DEBUG] Web Speech API 已被禁用用于测试');
        }

        if (!speechSynthesis || !SpeechSynthesisUtterance) {
            console.warn('浏览器不支持Web Speech API，将使用微软Edge TTS');
            this.useWebSpeechAPI = false;
        } else {
            this.synth = speechSynthesis;
            this.SpeechSynthesisUtterance = SpeechSynthesisUtterance;
        }

        this.enabled = this.loadEnabledState();
        this.hoverReadEnabled = this.loadHoverReadState();
        console.log('SpeechManager initialized, enabled:', this.enabled, 'hoverReadEnabled:', this.hoverReadEnabled, 'useWebSpeechAPI:', this.useWebSpeechAPI);
        this.init();
    }

    // 加载鼠标悬停阅读状态
    loadHoverReadState() {
        const saved = localStorage.getItem(SPEECH_CONFIG.hoverReadKey);
        return saved ? JSON.parse(saved) : false;
    }

    // 保存鼠标悬停阅读状态
    saveHoverReadState() {
        localStorage.setItem(SPEECH_CONFIG.hoverReadKey, JSON.stringify(this.hoverReadEnabled));
    }

    // 切换鼠标悬停阅读功能
    toggleHoverRead() {
        if (!this.enabled) {
            this.announceChange('请先启用语音功能');
            return;
        }

        this.hoverReadEnabled = !this.hoverReadEnabled;
        this.saveHoverReadState();
        this.updateHoverReadButton();
        const message = this.hoverReadEnabled ? '鼠标悬停阅读已启用' : '鼠标悬停阅读已禁用';
        this.announceChange(message);
        console.log('Hover read toggled, enabled:', this.hoverReadEnabled);
    }

    // 加载启用状态
    loadEnabledState() {
        const saved = localStorage.getItem(SPEECH_CONFIG.enabledKey);
        return saved !== null ? JSON.parse(saved) : false;
    }

    // 保存启用状态
    saveEnabledState() {
        localStorage.setItem(SPEECH_CONFIG.enabledKey, JSON.stringify(this.enabled));
    }

    // 切换启用状态
    toggleEnabled() {
        this.enabled = !this.enabled;
        this.saveEnabledState();

        // 如果启用，需要初始化快捷键和事件监听
        if (this.enabled) {
            this.init();
        }

        this.updateEnabledButton();
        const message = this.enabled ? '语音功能已启用' : '语音功能已禁用';
        this.announceChange(message);
        console.log('Speech toggled, enabled:', this.enabled);
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // 设置暂停和恢复事件
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            }
        });

        // 监听鼠标悬停事件 - 仅添加一次
        document.addEventListener('mouseover', (e) => {
            if (!this.hoverReadEnabled) return;

            const target = e.target.closest('p, h2, h3, li, div.content-section');
            if (!target || target === this.lastReadElement) return;

            this.lastReadElement = target;
            this.cancel();

            const text = target.textContent;
            if (text.trim()) {
                this.speak(text);
            }
        });
    }

    // 加载保存的设置
    loadSettings() {
        const saved = localStorage.getItem(SPEECH_CONFIG.storageKey);
        return saved ? JSON.parse(saved) : {
            speed: SPEECH_CONFIG.speedDefault,
            volume: SPEECH_CONFIG.volumeDefault
        };
    }

    // 保存设置
    saveSettings() {
        localStorage.setItem(SPEECH_CONFIG.storageKey, JSON.stringify(this.settings));
    }

    // 中止正在会话
    cancel() {
        // 停止Web Speech API
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
        }

        // 停止微软TTS音频播放
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        this.isSpeaking = false;
        this.currentUtterance = null;
    }

    // 开始阅读
    toggleSpeech() {
        console.log('toggleSpeech called, enabled:', this.enabled, 'isSpeaking:', this.isSpeaking);

        if (!this.enabled) {
            this.announceChange('请先启用语音功能');
            return;
        }

        if (this.isSpeaking) {
            this.stop();
        } else {
            this.announceChange('请将鼠标悬停在要阅读的内容上');
        }
    }

    // 执行语音阅读
    speak(text) {
        if (!this.enabled) {
            this.announceChange('语音功能不可用');
            return;
        }

        if (this.useWebSpeechAPI) {
            this.speakWithWebSpeechAPI(text);
        } else {
            this.speakWithMicrosoftTTS(text);
        }
    }

    // 使用Web Speech API进行语音阅读
    speakWithWebSpeechAPI(text) {
        if (!this.synth || !this.SpeechSynthesisUtterance) {
            this.announceChange('语音功能不可用');
            return;
        }

        // 检查语音列表
        const voices = this.synth.getVoices();
        if (voices.length === 0) {
            this.synth.onvoiceschanged = () => this.speakWithWebSpeechAPI(text);
            return;
        }

        this.cancel();

        try {
            const utterance = new this.SpeechSynthesisUtterance(text);
            utterance.lang = SPEECH_CONFIG.lang;
            utterance.rate = Math.max(SPEECH_CONFIG.speedMin, Math.min(SPEECH_CONFIG.speedMax, this.settings.speed || SPEECH_CONFIG.speedDefault));
            utterance.volume = Math.max(SPEECH_CONFIG.volumeMin, Math.min(SPEECH_CONFIG.volumeMax, this.settings.volume || SPEECH_CONFIG.volumeDefault));
            utterance.pitch = 1;

            utterance.onstart = () => {
                this.isSpeaking = true;
                this.updateSpeechButton();
                const preview = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                this.announceChange(`开始阅读: ${preview}`);
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this.updateSpeechButton();
            };

            utterance.onerror = (event) => {
                let errorMsg = '阅读出现错误';
                if (event.error === 'network_error') {
                    errorMsg = '网络错误，请检查连接';
                } else if (event.error === 'not_supported') {
                    errorMsg = '浏览器不支持此操作';
                } else if (event.error === 'synthesis_failed') {
                    errorMsg = '语音合成失败';
                }
                this.announceChange(`阅读失败: ${errorMsg}`);
                this.isSpeaking = false;
                this.updateSpeechButton();
            };

            this.currentUtterance = utterance;

            if (this.synth.paused) {
                this.synth.resume();
            }

            this.synth.speak(utterance);
        } catch (error) {
            this.announceChange(`语音错误: ${error.message}`);
        }
    }

    // 使用微软Edge TTS进行语音阅读（备用方案）
    async speakWithMicrosoftTTS(text) {
        try {
            // 显式中断当前语音
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                this.currentUtterance = null;
            }

            this.isSpeaking = true;
            this.updateSpeechButton();
            const preview = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            this.announceChange(`开始阅读: ${preview}`);

            // 获取语速参数
            const rate = Math.max(SPEECH_CONFIG.speedMin, Math.min(SPEECH_CONFIG.speedMax, this.settings.speed || SPEECH_CONFIG.speedDefault));
            const volume = Math.max(SPEECH_CONFIG.volumeMin, Math.min(SPEECH_CONFIG.volumeMax, this.settings.volume || SPEECH_CONFIG.volumeDefault));

            // 构建SSML文本（用于语音合成标记语言）
            const ssml = `<speak version="1.0" xml:lang="zh-CN">
                <voice name="zh-CN-XiaoxiaoNeural">
                    <prosody rate="${(rate - 1) * 50}%" volume="${volume * 100}">
                        ${this.escapeXml(text)}
                    </prosody>
                </voice>
            </speak>`;

            // 使用Web Audio API播放语音
            await this.synthesizeSpeechFromSSML(ssml);

            this.isSpeaking = false;
            this.updateSpeechButton();
        } catch (error) {
            console.error('微软TTS错误:', error);
            this.announceChange(`阅读失败: ${error.message}`);
            this.isSpeaking = false;
            this.updateSpeechButton();
        }
    }

    // 从SSML合成语音（使用浏览器API或模拟）
    async synthesizeSpeechFromSSML(ssml) {
        // 尝试使用Edge浏览器的原生方法
        if (window.speechSynthesis && typeof window.speechSynthesis.speak === 'function') {
            // Edge浏览器可能支持更多的语音选项
            const utterance = new window.SpeechSynthesisUtterance(this.extractTextFromSSML(ssml));
            utterance.lang = 'zh-CN';
            utterance.rate = this.settings.speed || SPEECH_CONFIG.speedDefault;
            utterance.volume = this.settings.volume || SPEECH_CONFIG.volumeDefault;

            return new Promise((resolve, reject) => {
                utterance.onend = () => resolve();
                utterance.onerror = (e) => reject(new Error(`合成失败: ${e.error}`));
                window.speechSynthesis.speak(utterance);
                this.currentUtterance = utterance;
            });
        } else {
            // 备用方案：使用简单的文本转语音
            return this.fallbackTextToSpeech(this.extractTextFromSSML(ssml));
        }
    }

    // 从SSML中提取纯文本
    extractTextFromSSML(ssml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(ssml, 'text/xml');
        return xmlDoc.documentElement.textContent || '';
    }

    // 转义XML特殊字符
    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // 备用文本转语音方案
    async fallbackTextToSpeech(text) {
        return new Promise((resolve, reject) => {
            try {
                // 如果一切都失败了，显示提示信息
                this.announceChange('已读取文本，但无法播放语音。请使用支持语音合成的浏览器。');
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // 设置语速
    setSpeed(speed) {
        speed = Math.max(SPEECH_CONFIG.speedMin, Math.min(SPEECH_CONFIG.speedMax, speed));
        this.settings.speed = speed;
        this.saveSettings();
        this.updateSpeedDisplay();
        this.announceChange(`语速: ${(speed * 100).toFixed(0)}%`);
    }

    // 设置音量
    setVolume(volume) {
        volume = Math.max(SPEECH_CONFIG.volumeMin, Math.min(SPEECH_CONFIG.volumeMax, volume));
        this.settings.volume = volume;
        this.saveSettings();
        this.updateVolumeDisplay();
        this.announceChange(`音量: ${(volume * 100).toFixed(0)}%`);
    }

    // 更新语速显示
    updateSpeedDisplay() {
        const input = document.getElementById('speech-speed');
        const display = document.getElementById('speed-value');
        if (input) input.value = this.settings.speed;
        if (display) display.textContent = (this.settings.speed * 100).toFixed(0) + '%';
    }

    // 更新音量显示
    updateVolumeDisplay() {
        const input = document.getElementById('speech-volume');
        const display = document.getElementById('volume-value');
        if (input) input.value = this.settings.volume;
        if (display) display.textContent = (this.settings.volume * 100).toFixed(0) + '%';
    }

    // 更新抬读按钮
    updateSpeechButton() {
        const btn = document.getElementById('speech-toggle');
        if (btn) {
            if (this.isSpeaking) {
                btn.textContent = '⏸️ 停止阅读';
                btn.classList.add('active');
            } else {
                btn.textContent = '🔊 语音阅读';
                btn.classList.remove('active');
            }
        }
    }

    // 更新启用按钮状态
    updateEnabledButton() {
        const btn = document.getElementById('speech-enable-btn');
        const container = document.getElementById('speech-control-container');

        if (btn) {
            if (this.enabled) {
                btn.textContent = '🎤 语音已启用 ✓';
                btn.classList.add('active');
                btn.classList.remove('inactive');
            } else {
                btn.textContent = '🎤 启用语音';
                btn.classList.remove('active');
                btn.classList.add('inactive');
            }
        }

        // 更新语音控制容器的显示状态
        if (container) {
            if (this.enabled) {
                container.style.display = 'flex';
                container.setAttribute('aria-hidden', 'false');
            } else {
                container.style.display = 'none';
                container.setAttribute('aria-hidden', 'true');
            }
        }

        // 更新行朗读按钮的显示状态
        const lineReaderPrev = document.getElementById('line-reader-prev');
        const lineReaderNext = document.getElementById('line-reader-next');
        const lineReaderTitle = document.querySelector('.line-reader-title');

        if (this.enabled) {
            if (lineReaderPrev) lineReaderPrev.style.display = '';
            if (lineReaderNext) lineReaderNext.style.display = '';
            if (lineReaderTitle) lineReaderTitle.style.display = '';
        } else {
            if (lineReaderPrev) lineReaderPrev.style.display = 'none';
            if (lineReaderNext) lineReaderNext.style.display = 'none';
            if (lineReaderTitle) lineReaderTitle.style.display = 'none';
        }
    }

    // 更新鼠标悬停阅读按钮状态
    updateHoverReadButton() {
        const btn = document.getElementById('hover-read-btn');
        const menuItem = document.querySelector('.hover-read-menu-item');

        if (btn) {
            if (this.hoverReadEnabled) {
                btn.classList.add('active');
                btn.classList.remove('inactive');
                btn.setAttribute('aria-pressed', 'true');
                if (menuItem) {
                    menuItem.textContent = '✓ 已启用悬停阅读';
                }
            } else {
                btn.classList.remove('active');
                btn.classList.add('inactive');
                btn.setAttribute('aria-pressed', 'false');
                if (menuItem) {
                    menuItem.textContent = '👆 启用悬停阅读';
                }
            }
        }
    }

    // 无障碍公告
    announceChange(message) {
        let liveRegion = document.getElementById('aria-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = message;
    }
}

// ============================================
// 行朗读管理
// ============================================

class LineReaderManager {
    constructor(speechManager = null) {
        this.currentLineIndex = -1;
        this.lines = [];
        this.speechManager = speechManager;
        this.isSpeaking = false;
    }

    // 初始化行列表
    initializeLines() {
        // 获取所有p、h1-h6、li等文本元素，按在页面上的顺序
        const mainContent = document.querySelector('main') || document.body;
        const textElements = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div.content-section > *');

        this.lines = Array.from(textElements)
            .filter(el => el.textContent.trim().length > 0)
            .map(el => el.textContent.trim());
    }

    // 读下一行
    readNextLine() {
        if (this.lines.length === 0) {
            this.initializeLines();
        }

        // 如果当前没有正在读的，从第一行开始
        if (this.currentLineIndex === -1) {
            this.currentLineIndex = 0;
        } else {
            this.currentLineIndex++;
        }

        // 超过范围则从头开始
        if (this.currentLineIndex >= this.lines.length) {
            this.currentLineIndex = 0;
        }

        this.readLine(this.currentLineIndex);
    }

    // 读上一行
    readPreviousLine() {
        if (this.lines.length === 0) {
            this.initializeLines();
        }

        // 如果当前没有正在读的，则不操作
        if (this.currentLineIndex === -1) {
            return;
        }

        this.currentLineIndex--;

        // 小于0则到最后一行
        if (this.currentLineIndex < 0) {
            this.currentLineIndex = this.lines.length - 1;
        }

        this.readLine(this.currentLineIndex);
    }

    // 读指定行
    readLine(index) {
        if (index < 0 || index >= this.lines.length) {
            return;
        }

        // 检查是否有SpeechManager
        if (!this.speechManager) {
            console.warn('LineReaderManager: speechManager not available');
            return;
        }

        // 检查语音功能是否启用
        if (!this.speechManager.enabled) {
            this.speechManager.announceChange('请先启用语音功能');
            return;
        }

        const text = this.lines[index];

        // 使用SpeechManager的speak方法，这样就能使用所有的朗读设置
        this.speechManager.speak(text);

        // 更新说话状态
        this.isSpeaking = true;

        // 监听语音结束事件
        const originalOnEnd = this.speechManager.currentUtterance?.onend;
        if (this.speechManager.currentUtterance) {
            this.speechManager.currentUtterance.onend = () => {
                this.isSpeaking = false;
                if (originalOnEnd) {
                    originalOnEnd();
                }
            };
        }
    }

    // 停止朗读
    stop() {
        if (this.speechManager) {
            this.speechManager.cancel();
        }
        this.isSpeaking = false;
    }
}

// ============================================
// 快捷键帮助管理
// ============================================

class KeyboardHelpManager {
    constructor() {
        this.isOpen = false;
        this.modal = null;
    }

    showKeyboardHelp() {
        if (this.isOpen) {
            this.closeModal();
            return;
        }

        this.createAndShowModal();
    }

    createAndShowModal() {
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'keyboard-help-modal';
        modal.className = 'help-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', '快捷键帮助');
        modal.setAttribute('aria-modal', 'true');

        // 背景
        const backdrop = document.createElement('div');
        backdrop.className = 'help-backdrop';
        backdrop.addEventListener('click', () => this.closeModal());
        modal.appendChild(backdrop);

        // 内容
        const content = document.createElement('div');
        content.className = 'help-content';

        // 标题
        const title = document.createElement('h2');
        title.textContent = '快捷键帮助';
        title.className = 'help-title';
        content.appendChild(title);

        // 快捷键列表
        const helpList = document.createElement('div');
        helpList.className = 'help-list';

        KEYBOARD_HELP.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'help-section';

            const sectionTitle = document.createElement('h3');
            sectionTitle.textContent = section.category;
            sectionTitle.className = 'help-section-title';
            sectionDiv.appendChild(sectionTitle);

            const shortcutsList = document.createElement('ul');
            shortcutsList.className = 'shortcuts-list';

            section.shortcuts.forEach(shortcut => {
                const li = document.createElement('li');
                li.className = 'shortcut-item';

                const key = document.createElement('kbd');
                key.className = 'shortcut-key';
                key.textContent = shortcut.key;

                const desc = document.createElement('span');
                desc.className = 'shortcut-desc';
                desc.textContent = shortcut.desc;

                li.appendChild(key);
                li.appendChild(desc);
                shortcutsList.appendChild(li);
            });

            sectionDiv.appendChild(shortcutsList);
            helpList.appendChild(sectionDiv);
        });

        content.appendChild(helpList);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭 (Esc)';
        closeBtn.className = 'btn help-close-btn';
        closeBtn.addEventListener('click', () => this.closeModal());
        content.appendChild(closeBtn);

        modal.appendChild(content);
        document.body.appendChild(modal);

        // 设置键盘事件
        this.setupModalKeyboard();

        this.isOpen = true;
        this.modal = modal;
    }

    setupModalKeyboard() {
        const handleKeydown = (e) => {
            if (e.key === 'Escape' || e.key === 'F12') {
                e.preventDefault();
                this.closeModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    closeModal() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        this.isOpen = false;
    }
}

// ============================================
// 主题管理功能实现
// ============================================

class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        // 应用保存的主题
        this.applyTheme(this.currentTheme);
    }

    // 加载保存的主题
    loadTheme() {
        const saved = localStorage.getItem(THEME_CONFIG.storageKey);
        return saved || THEME_CONFIG.default;
    }

    // 保存主题
    saveTheme(theme) {
        localStorage.setItem(THEME_CONFIG.storageKey, theme);
    }

    // 应用主题
    applyTheme(theme) {
        // 移除所有主题类
        document.documentElement.classList.remove(
            'theme-' + THEME_CONFIG.light,
            'theme-' + THEME_CONFIG.dark
        );

        // 添加新主题类
        document.documentElement.classList.add('theme-' + theme);
        this.currentTheme = theme;
        this.saveTheme(theme);
    }

    // 切换主题
    toggleTheme() {
        const newTheme = this.currentTheme === THEME_CONFIG.light ? THEME_CONFIG.dark : THEME_CONFIG.light;
        this.applyTheme(newTheme);
        const message = newTheme === THEME_CONFIG.dark ? '已切换到深色模式' : '已切换到浅色模式';
        this.announceChange(message);
    }

    // 无障碍公告
    announceChange(message) {
        let liveRegion = document.getElementById('aria-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = message;
    }
}

// ============================================
// 色盲模式管理
// ============================================

class ColorBlindManager {
    constructor() {
        this.currentMode = this.loadMode();
        this.modes = {
            none: { name: '无', filter: 'none' },
            protanopia: { name: '红色色盲', cssFilter: 'url(#protanopia-filter) saturate(1.1) brightness(1)' },
            deuteranopia: { name: '绿色色盲', cssFilter: 'url(#deuteranopia-filter) saturate(1.1) brightness(1)' },
            tritanopia: { name: '蓝黄色盲', cssFilter: 'url(#tritanopia-filter) saturate(1.1) brightness(1)' },
            achromatopsia: { name: '全色盲', cssFilter: 'saturate(0) brightness(1.05) contrast(1.1)' }
        };
        this.storageKey = 'colorblindMode';
        this.init();
    }

    init() {
        // 创建SVG滤镜
        this.createFilters();
        // 应用保存的模式
        this.applyMode(this.currentMode);
    }

    createFilters() {
        // 检查是否已存在
        if (document.getElementById('colorblind-filters-svg')) {
            return;
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'colorblind-filters-svg';
        svg.style.display = 'none';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.position = 'fixed';
        svg.style.pointerEvents = 'none';
        svg.style.visibility = 'hidden';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // 红色色盲滤镜 (Protanopia)
        const protanopiaFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        protanopiaFilter.id = 'protanopia-filter';
        const protanopiaMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        protanopiaMatrix.setAttribute('type', 'matrix');
        protanopiaMatrix.setAttribute('values', '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0');
        protanopiaFilter.appendChild(protanopiaMatrix);
        defs.appendChild(protanopiaFilter);

        // 绿色色盲滤镜 (Deuteranopia)
        const deuteranopiaFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        deuteranopiaFilter.id = 'deuteranopia-filter';
        const deuteranopiaMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        deuteranopiaMatrix.setAttribute('type', 'matrix');
        deuteranopiaMatrix.setAttribute('values', '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0');
        deuteranopiaFilter.appendChild(deuteranopiaMatrix);
        defs.appendChild(deuteranopiaFilter);

        // 蓝黄色盲滤镜 (Tritanopia)
        const tritanopiaFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        tritanopiaFilter.id = 'tritanopia-filter';
        const tritanopiaMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        tritanopiaMatrix.setAttribute('type', 'matrix');
        tritanopiaMatrix.setAttribute('values', '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0');
        tritanopiaFilter.appendChild(tritanopiaMatrix);
        defs.appendChild(tritanopiaFilter);

        // 全色盲滤镜 (Achromatopsia)
        const achromatopsiaFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        achromatopsiaFilter.id = 'achromatopsia-filter';
        const achromatopsiaMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        achromatopsiaMatrix.setAttribute('type', 'saturate');
        achromatopsiaMatrix.setAttribute('values', '0');
        achromatopsiaFilter.appendChild(achromatopsiaMatrix);
        defs.appendChild(achromatopsiaFilter);

        svg.appendChild(defs);
        document.body.appendChild(svg);
    }

    loadMode() {
        const saved = localStorage.getItem(this.storageKey);
        return saved || 'none';
    }

    saveMode(mode) {
        localStorage.setItem(this.storageKey, mode);
    }

    applyMode(mode) {
        const html = document.documentElement;
        const modeConfig = this.modes[mode];

        if (modeConfig) {
            // 应用CSS滤镜到html元素，会级联到所有子元素包括图片
            const filterValue = modeConfig.cssFilter || 'none';
            html.style.filter = filterValue;

            this.currentMode = mode;
            this.saveMode(mode);
        }
    }

    announceChange(message) {
        let liveRegion = document.getElementById('aria-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = message;
    }
}

// ============================================
// 语音识别功能实现
// ============================================

class SpeechRecognitionManager {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('您的浏览器不支持 Web Speech API');
            this.supported = false;
            return;
        }

        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.isListening = false;
        this.enabled = false; // 是否启用语音识别
        this.isContinuous = true; // 持续识别

        // 语言设置
        this.recognition.lang = 'zh-CN';
        this.recognition.continuous = this.isContinuous;
        this.recognition.interimResults = false;

        // 命令映射
        this.commands = {
            '放大': () => {
                if (zoomManager) zoomManager.increaseZoom();
            },
            '缩小': () => {
                if (zoomManager) zoomManager.decreaseZoom();
            },
            '重置': () => {
                if (zoomManager) zoomManager.resetZoom();
            },
            '下滑': () => {
                // 检查是否有全局的 WaterfallScroll 实例
                if (window.waterfallScroll && window.waterfallScroll.scrollNext) {
                    window.waterfallScroll.scrollNext();
                } else {
                    // 标准网页滚动 - 模拟鼠标滚轮，滚动一个视口高度
                    const scrollAmount = window.innerHeight;
                    window.scrollBy({
                        top: scrollAmount,
                        behavior: 'smooth'
                    });
                }
            },
            '上滑': () => {
                // 检查是否有全局的 WaterfallScroll 实例
                if (window.waterfallScroll && window.waterfallScroll.scrollPrev) {
                    window.waterfallScroll.scrollPrev();
                } else {
                    // 标准网页滚动 - 模拟鼠标滚轮，滚动一个视口高度
                    const scrollAmount = window.innerHeight;
                    window.scrollBy({
                        top: -scrollAmount,
                        behavior: 'smooth'
                    });
                }
            },
            '启用朗读': () => {
                if (speechManager && !speechManager.enabled) speechManager.toggleEnabled();
            },
            '关闭朗读': () => {
                if (speechManager && speechManager.enabled) speechManager.toggleEnabled();
            },
            '下一行': () => {
                if (lineReaderManager) lineReaderManager.readNextLine();
            },
            '上一行': () => {
                if (lineReaderManager) lineReaderManager.readPreviousLine();
            }
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        // 识别开始
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('[语音识别] 开始监听');
        };

        // 识别结果
        this.recognition.onresult = (event) => {
            let transcript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const isFinal = event.results[i].isFinal;
                transcript += event.results[i][0].transcript;

                if (isFinal) {
                    this.processCommand(transcript);
                }
            }
        };

        // 识别出错
        this.recognition.onerror = (event) => {
            console.warn('[语音识别] 错误:', event.error);
        };

        // 识别结束
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('[语音识别] 识别结束');

            // 如果启用了持续识别，重新启动
            if (this.isContinuous && this.enabled) {
                this.start();
            }
        };
    }

    processCommand(transcript) {
        // 规范化文本（移除空格、转小写）
        const text = transcript.toLowerCase().trim();

        console.log('[语音识别] 识别文本:', text);

        // 遍历命令进行匹配
        for (const [command, action] of Object.entries(this.commands)) {
            if (text.includes(command)) {
                console.log('[语音识别] 执行命令:', command);
                try {
                    action();

                    // 语音反馈 - 行朗读命令不需要反馈
                    if (speechManager && speechManager.enabled && command !== '下一行' && command !== '上一行') {
                        speechManager.speak(`已执行：${command}`);
                    }
                } catch (error) {
                    console.error('[语音识别] 执行命令失败:', error);
                }
                break;
            }
        }
    }

    start() {
        if (!this.supported) {
            console.warn('浏览器不支持语音识别');
            return;
        }

        try {
            this.enabled = true;
            this.recognition.start();
        } catch (error) {
            console.warn('[语音识别] 启动失败:', error);
        }
    }

    stop() {
        if (!this.supported) return;

        try {
            this.enabled = false;
            this.recognition.stop();
        } catch (error) {
            console.warn('[语音识别] 停止失败:', error);
        }
    }

    toggle() {
        if (!this.supported) {
            console.warn('浏览器不支持语音识别');
            return;
        }

        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }
}

// ============================================
// 页面缩放功能实现
// ============================================

class ZoomManager {
    constructor() {
        this.currentZoom = this.loadZoomLevel();
        this.init();
    }

    init() {
        // 应用保存的缩放级别
        this.applyZoom(this.currentZoom);
        // 监听键盘快捷键
        this.setupKeyboardShortcuts();
        // 更新显示
        this.updateZoomDisplay();
    }

    // 加载保存的缩放级别
    loadZoomLevel() {
        const saved = localStorage.getItem(ZOOM_CONFIG.storageKey);
        return saved ? parseInt(saved) : ZOOM_CONFIG.default;
    }

    // 保存缩放级别
    saveZoomLevel(level) {
        localStorage.setItem(ZOOM_CONFIG.storageKey, level);
    }

    // 应用缩放
    applyZoom(level) {
        // 限制在有效范围内
        level = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, level));
        document.documentElement.style.fontSize = (level / 100) * 16 + 'px';
        this.currentZoom = level;
        this.saveZoomLevel(level);
    }

    // 增大页面
    increaseZoom() {
        const newZoom = this.currentZoom + ZOOM_CONFIG.step;
        if (newZoom <= ZOOM_CONFIG.max) {
            this.applyZoom(newZoom);
            this.updateZoomDisplay();
            this.announceChange(`页面已放大到 ${newZoom}%`);
        } else {
            this.announceChange(`已达到最大缩放级别 ${ZOOM_CONFIG.max}%`);
        }
    }

    // 减小页面
    decreaseZoom() {
        const newZoom = this.currentZoom - ZOOM_CONFIG.step;
        if (newZoom >= ZOOM_CONFIG.min) {
            this.applyZoom(newZoom);
            this.updateZoomDisplay();
            this.announceChange(`页面已缩小到 ${newZoom}%`);
        } else {
            this.announceChange(`已达到最小缩放级别 ${ZOOM_CONFIG.min}%`);
        }
    }

    // 重置缩放
    resetZoom() {
        this.applyZoom(ZOOM_CONFIG.default);
        this.updateZoomDisplay();
        this.announceChange(`页面缩放已重置为 ${ZOOM_CONFIG.default}%`);
    }

    // 更新缩放显示
    updateZoomDisplay() {
        const indicator = document.getElementById('zoom-indicator');
        if (indicator) {
            indicator.textContent = `${this.currentZoom}%`;
            // 更新按钮状态
            const decreaseBtn = document.getElementById('zoom-decrease');
            const increaseBtn = document.getElementById('zoom-increase');
            if (decreaseBtn) {
                decreaseBtn.disabled = this.currentZoom <= ZOOM_CONFIG.min;
            }
            if (increaseBtn) {
                increaseBtn.disabled = this.currentZoom >= ZOOM_CONFIG.max;
            }
        }
    }

    // 设置键盘快捷键
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + 加号
            if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                this.increaseZoom();
            }
            // Ctrl/Cmd + 减号
            else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                this.decreaseZoom();
            }
            // Ctrl/Cmd + 0 重置
            else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                this.resetZoom();
            }
        });
    }

    // 无障碍公告
    announceChange(message) {
        // 创建隐藏的aria-live区域来通知屏幕阅读器
        let liveRegion = document.getElementById('aria-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = message;
    }
}

// ============================================
// 导航栏渲染
// ============================================

class NavbarRenderer {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        window.navbarRendererInstance = this;
        this.setupSidebarToggle();
    }

    setupSidebarToggle() {
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-open');
                const isOpen = document.body.classList.contains('sidebar-open');
                this.sidebarToggle.setAttribute('aria-expanded', isOpen);
            });
        }
    }

    render() {
        // 清空导航栏
        this.navbar.innerHTML = '';

        // 添加缩放指示器
        const indicator = document.createElement('span');
        indicator.id = 'zoom-indicator';
        indicator.className = 'zoom-indicator';
        indicator.textContent = '100%';
        indicator.setAttribute('aria-label', '当前缩放级别');
        this.navbar.appendChild(indicator);

        NAVBAR_FEATURES.forEach(feature => {
            if (feature.type === 'single-button') {
                this.renderSingleButton(feature);
            } else if (feature.type === 'dropdown-menu') {
                this.renderDropdownMenu(feature);
            } else if (feature.type === 'speech-control') {
                this.renderSpeechControl(feature);
            }
        });

        // 添加 GitHub 链接到导航栏右边
        this.renderGitHubLink();
    }

    renderGitHubLink() {
        // 获取导航栏容器
        const container = document.querySelector('.nav-topbar-container');
        if (!container) return;

        // 创建 GitHub 链接
        const githubLink = document.createElement('a');
        githubLink.href = 'https://github.com/VOLKNET2333/webgame.git';
        githubLink.className = 'github-link';
        githubLink.target = '_blank';
        githubLink.rel = 'noopener noreferrer';
        githubLink.setAttribute('aria-label', '访问 GitHub 仓库');
        githubLink.title = '在 GitHub 上查看项目';

        // 创建 GitHub 图标 (SVG)
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'github-icon');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z');
        svg.appendChild(path);

        // 创建文字标签
        const text = document.createElement('span');
        text.className = 'github-text';
        text.textContent = 'GitHub';

        // 组装链接
        githubLink.appendChild(svg);
        githubLink.appendChild(text);

        // 添加到容器
        container.appendChild(githubLink);
    }

    renderSingleButton(feature) {
        // 为行朗读按钮添加标题（仅首个按钮）
        if (feature.isLineReader && feature.id === 'line-reader-prev') {
            const title = document.createElement('div');
            title.className = 'line-reader-title';
            title.textContent = '按行朗读';
            // 只在朗读功能启用时显示标题
            if (!speechManager || !speechManager.enabled) {
                title.style.display = 'none';
            }
            this.navbar.appendChild(title);
        }

        const btn = document.createElement('button');
        btn.id = feature.button.id;
        btn.className = 'btn sidebar-btn';
        btn.textContent = feature.button.text;
        btn.title = feature.button.title;
        btn.setAttribute('aria-label', feature.button.ariaLabel);

        // 行朗读按钮只在朗读功能启用时显示
        if (feature.isLineReader && (!speechManager || !speechManager.enabled)) {
            btn.style.display = 'none';
        }

        // 为启用语音按钮添加初始样式
        if (feature.id === 'speech-enable') {
            btn.classList.add('inactive');
        }

        // 绑定点击事件
        btn.addEventListener('click', () => {
            // 缩放按钮
            if ((feature.id === 'zoom-decrease' || feature.id === 'zoom-reset' || feature.id === 'zoom-increase') && zoomManager && zoomManager[feature.button.action]) {
                zoomManager[feature.button.action]();
            }
            // 鼠标样式按钮
            else if (feature.id === 'mouse-style') {
                const navbarRenderer = window.navbarRendererInstance;
                if (navbarRenderer) {
                    navbarRenderer.renderMouseStylePanel(feature);
                }
            }
            // 色盲模式按钮
            else if (feature.id === 'colorblind-mode') {
                const navbarRenderer = window.navbarRendererInstance;
                if (navbarRenderer) {
                    navbarRenderer.renderColorBlindPanel(feature);
                }
            }
            // 页面朗读按钮
            else if (feature.id === 'speech-panel') {
                const navbarRenderer = window.navbarRendererInstance;
                if (navbarRenderer) {
                    navbarRenderer.renderSpeechPanel(feature);
                }
            }
            // 快捷键帮助按钮
            else if (feature.id === 'keyboard-help' && keyboardHelpManager) {
                keyboardHelpManager.showKeyboardHelp();
            }
            // 行朗读按钮
            else if ((feature.id === 'line-reader-prev' || feature.id === 'line-reader-next') && lineReaderManager) {
                if (feature.id === 'line-reader-prev') {
                    lineReaderManager.readPreviousLine();
                } else {
                    lineReaderManager.readNextLine();
                }
            }
            // 语音启用按钮
            else if (feature.id === 'speech-enable' && speechManager) {
                speechManager.toggleEnabled();
            }
            // 鼠标悬停阅读按钮
            else if (feature.id === 'hover-read' && speechManager) {
                speechManager.toggleHoverRead();
            }
            // 语音识别面板按钮
            else if (feature.id === 'speech-recognition') {
                const navbarRenderer = window.navbarRendererInstance;
                if (navbarRenderer) {
                    navbarRenderer.renderSpeechRecognitionPanel(feature);
                }
            }
            // 主题切换按钮
            else if (themeManager && themeManager[feature.button.action]) {
                themeManager[feature.button.action]();
            }
        });

        this.navbar.appendChild(btn);
    }

    renderDropdownMenu(feature) {
        // 创建菜单容器
        const menuContainer = document.createElement('div');
        menuContainer.className = 'dropdown-menu-container';
        menuContainer.id = feature.button.id + '-container';

        // 创建菜单按钮
        const btn = document.createElement('button');
        btn.id = feature.button.id;
        btn.className = 'btn dropdown-menu-btn';
        btn.textContent = feature.button.text;
        btn.title = feature.button.title;
        btn.setAttribute('aria-label', feature.button.ariaLabel);
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');

        // 为语音功能菜单按钮添加初始样式
        if (feature.id === 'speech-enable') {
            btn.classList.add('inactive');
        }

        // 创建下拉菜单
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.setAttribute('role', 'menu');
        menu.style.display = 'none';

        // 添加菜单项
        feature.menuItems.forEach(item => {
            const menuItem = document.createElement('button');
            menuItem.className = 'dropdown-menu-item';
            menuItem.id = item.id;
            menuItem.setAttribute('role', 'menuitem');
            menuItem.setAttribute('aria-label', item.ariaLabel);

            // 初始化菜单项文本
            if (item.action === 'toggleEnabled') {
                menuItem.textContent = speechManager && speechManager.enabled ? '✓ 启用朗读' : '启用朗读';
            } else {
                menuItem.textContent = item.text;
            }

            menuItem.addEventListener('click', () => {
                // 处理菜单项点击
                if (item.action === 'toggleEnabled' && speechManager) {
                    speechManager.toggleEnabled();
                    // 更新菜单项文本
                    if (speechManager.enabled) {
                        menuItem.textContent = '✓ 启用朗读';
                        btn.classList.add('active');
                        btn.classList.remove('inactive');
                    } else {
                        menuItem.textContent = '启用朗读';
                        btn.classList.remove('active');
                        btn.classList.add('inactive');
                    }
                } else if (item.action === 'toggleHoverRead' && speechManager) {
                    speechManager.toggleHoverRead();
                }

                // 立即关闭菜单
                menu.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            });

            menu.appendChild(menuItem);
        });

        // 菜单按钮点击事件
        btn.addEventListener('click', () => {
            const isOpen = menu.style.display !== 'none';
            menu.style.display = isOpen ? 'none' : 'block';
            btn.setAttribute('aria-expanded', !isOpen);
        });

        // 点击菜单外关闭菜单
        document.addEventListener('click', (e) => {
            if (!menuContainer.contains(e.target)) {
                menu.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        menuContainer.appendChild(btn);
        menuContainer.appendChild(menu);
        this.navbar.appendChild(menuContainer);
    }

    renderSpeechPanel(feature) {
        // 获取导航栏中的按钮（由 renderSingleButton 创建）
        const btn = document.getElementById(feature.button.id);
        if (!btn) return;

        // 检查面板是否已存在
        let panelOverlay = document.getElementById('speech-panel-overlay');

        if (panelOverlay) {
            // 面板已存在，直接切换显示状态
            const isOpen = panelOverlay.style.display !== 'none';
            panelOverlay.style.display = isOpen ? 'none' : 'flex';
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            return;
        }

        // 面板不存在，创建它
        // 设置按钮属性
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');

        // 创建配置面板
        panelOverlay = document.createElement('div');
        panelOverlay.id = 'speech-panel-overlay';
        panelOverlay.className = 'speech-panel-overlay';
        panelOverlay.style.display = 'none';
        panelOverlay.setAttribute('role', 'dialog');
        panelOverlay.setAttribute('aria-labelledby', 'speech-panel-title');
        panelOverlay.setAttribute('aria-modal', 'true');

        const panel = document.createElement('div');
        panel.className = 'speech-panel';

        // 标题
        const title = document.createElement('h2');
        title.id = 'speech-panel-title';
        title.textContent = '朗读设置';
        panel.appendChild(title);

        // 启用/禁用开关
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'panel-control-group';

        const toggleLabel = document.createElement('label');
        toggleLabel.htmlFor = 'speech-enable-toggle';
        toggleLabel.className = 'control-label';
        toggleLabel.textContent = '启用朗读';
        toggleWrapper.appendChild(toggleLabel);

        const toggleCheckbox = document.createElement('input');
        toggleCheckbox.type = 'checkbox';
        toggleCheckbox.id = 'speech-enable-toggle';
        toggleCheckbox.className = 'toggle-checkbox';
        toggleCheckbox.checked = speechManager ? speechManager.enabled : false;
        toggleCheckbox.addEventListener('change', () => {
            if (speechManager) {
                speechManager.toggleEnabled();
                if (speechManager.enabled) {
                    btn.classList.add('active');
                    btn.classList.remove('inactive');
                } else {
                    btn.classList.remove('active');
                    btn.classList.add('inactive');
                }
            }
        });
        toggleWrapper.appendChild(toggleCheckbox);
        panel.appendChild(toggleWrapper);

        // 语速控制
        const speedWrapper = document.createElement('div');
        speedWrapper.className = 'panel-control-group';

        const speedLabel = document.createElement('label');
        speedLabel.textContent = '语速 (0.5x - 10x)';
        speedLabel.htmlFor = 'panel-speech-speed';
        speedLabel.className = 'control-label';
        speedWrapper.appendChild(speedLabel);

        const speedContainer = document.createElement('div');
        speedContainer.className = 'slider-container';

        const speedInput = document.createElement('input');
        speedInput.type = 'range';
        speedInput.id = 'panel-speech-speed';
        speedInput.min = 0.5;
        speedInput.max = 10;
        speedInput.step = 0.25;
        speedInput.value = speechManager ? speechManager.rate : 1;
        speedInput.className = 'slider';
        speedInput.addEventListener('input', (e) => {
            if (speechManager) {
                const rate = parseFloat(e.target.value);
                speechManager.setSpeed(rate);
                speedValue.textContent = (rate * 100).toFixed(0) + '%';
            }
        });
        speedContainer.appendChild(speedInput);

        const speedValue = document.createElement('span');
        speedValue.className = 'slider-value';
        speedValue.textContent = (speechManager ? speechManager.rate * 100 : 100).toFixed(0) + '%';
        speedContainer.appendChild(speedValue);
        speedWrapper.appendChild(speedContainer);
        panel.appendChild(speedWrapper);

        // 音量控制
        const volumeWrapper = document.createElement('div');
        volumeWrapper.className = 'panel-control-group';

        const volumeLabel = document.createElement('label');
        volumeLabel.textContent = '音量 (0 - 100)';
        volumeLabel.htmlFor = 'panel-speech-volume';
        volumeLabel.className = 'control-label';
        volumeWrapper.appendChild(volumeLabel);

        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'slider-container';

        const volumeInput = document.createElement('input');
        volumeInput.type = 'range';
        volumeInput.id = 'panel-speech-volume';
        volumeInput.min = 0;
        volumeInput.max = 1;
        volumeInput.step = 0.1;
        volumeInput.value = speechManager ? speechManager.volume : 1;
        volumeInput.className = 'slider';
        volumeInput.addEventListener('input', (e) => {
            if (speechManager) {
                const vol = parseFloat(e.target.value);
                speechManager.setVolume(vol);
                volumeValue.textContent = (vol * 100).toFixed(0);
            }
        });
        volumeContainer.appendChild(volumeInput);

        const volumeValue = document.createElement('span');
        volumeValue.className = 'slider-value';
        volumeValue.textContent = (speechManager ? speechManager.volume * 100 : 100).toFixed(0);
        volumeContainer.appendChild(volumeValue);
        volumeWrapper.appendChild(volumeContainer);
        panel.appendChild(volumeWrapper);

        // 悬停阅读开关
        const hoverReadWrapper = document.createElement('div');
        hoverReadWrapper.className = 'panel-control-group';

        const hoverReadLabel = document.createElement('label');
        hoverReadLabel.htmlFor = 'speech-hover-toggle';
        hoverReadLabel.className = 'control-label';
        hoverReadLabel.textContent = '悬停自动朗读';
        hoverReadWrapper.appendChild(hoverReadLabel);

        const hoverReadCheckbox = document.createElement('input');
        hoverReadCheckbox.type = 'checkbox';
        hoverReadCheckbox.id = 'speech-hover-toggle';
        hoverReadCheckbox.className = 'toggle-checkbox';
        hoverReadCheckbox.checked = speechManager ? speechManager.hoverReadEnabled : false;
        hoverReadCheckbox.addEventListener('change', () => {
            if (speechManager) {
                speechManager.toggleHoverRead();
            }
        });
        hoverReadWrapper.appendChild(hoverReadCheckbox);
        panel.appendChild(hoverReadWrapper);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn panel-close-btn';
        closeBtn.textContent = '关闭';
        closeBtn.addEventListener('click', () => {
            panelOverlay.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
        });
        panel.appendChild(closeBtn);

        panelOverlay.appendChild(panel);

        // 点击面板外部关闭
        panelOverlay.addEventListener('click', (e) => {
            if (e.target === panelOverlay) {
                panelOverlay.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // 初始化显示状态
        panelOverlay.style.display = 'flex';
        btn.setAttribute('aria-expanded', 'true');

        // 只添加面板到body（按钮已由 renderSingleButton 创建）
        document.body.appendChild(panelOverlay);
    }

    renderSpeechControl(feature) {
        const container = document.createElement('div');
        container.id = 'speech-control-container';
        container.className = 'speech-control-container';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', feature.label);

        // 初始隐藏（如果语音未启用）
        if (speechManager && !speechManager.enabled) {
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
        }

        // 语音开关按钮
        const btn = document.createElement('button');
        btn.id = feature.controls.speechToggle.id;
        btn.className = 'btn';
        btn.textContent = feature.controls.speechToggle.text;
        btn.title = feature.controls.speechToggle.title;
        btn.setAttribute('aria-label', feature.controls.speechToggle.ariaLabel);

        btn.addEventListener('click', () => {
            if (speechManager && speechManager[feature.controls.speechToggle.action]) {
                speechManager[feature.controls.speechToggle.action]();
            }
        });
        container.appendChild(btn);

        // 语速控制
        const speedWrapper = document.createElement('div');
        speedWrapper.className = 'control-wrapper';

        const speedLabel = document.createElement('label');
        speedLabel.textContent = feature.controls.speedLabel;
        speedLabel.htmlFor = 'speech-speed';
        speedLabel.className = 'control-label';
        speedWrapper.appendChild(speedLabel);

        const speedInput = document.createElement('input');
        speedInput.type = 'range';
        speedInput.id = 'speech-speed';
        speedInput.min = feature.controls.speedMin;
        speedInput.max = feature.controls.speedMax;
        speedInput.step = feature.controls.speedStep;
        speedInput.value = feature.controls.speedDefault;
        speedInput.className = 'slider';
        speedInput.title = '调整语速';
        speedInput.addEventListener('input', (e) => {
            if (speechManager) {
                speechManager.setSpeed(parseFloat(e.target.value));
            }
        });
        speedWrapper.appendChild(speedInput);

        const speedValue = document.createElement('span');
        speedValue.id = 'speed-value';
        speedValue.className = 'value-display';
        speedValue.textContent = '100%';
        speedValue.setAttribute('aria-live', 'polite');
        speedWrapper.appendChild(speedValue);

        container.appendChild(speedWrapper);

        // 音量控制
        const volumeWrapper = document.createElement('div');
        volumeWrapper.className = 'control-wrapper';

        const volumeLabel = document.createElement('label');
        volumeLabel.textContent = feature.controls.volumeLabel;
        volumeLabel.htmlFor = 'speech-volume';
        volumeLabel.className = 'control-label';
        volumeWrapper.appendChild(volumeLabel);

        const volumeInput = document.createElement('input');
        volumeInput.type = 'range';
        volumeInput.id = 'speech-volume';
        volumeInput.min = feature.controls.volumeMin;
        volumeInput.max = feature.controls.volumeMax;
        volumeInput.step = feature.controls.volumeStep;
        volumeInput.value = feature.controls.volumeDefault;
        volumeInput.className = 'slider';
        volumeInput.title = '调整音量';
        volumeInput.addEventListener('input', (e) => {
            if (speechManager) {
                speechManager.setVolume(parseFloat(e.target.value));
            }
        });
        volumeWrapper.appendChild(volumeInput);

        const volumeValue = document.createElement('span');
        volumeValue.id = 'volume-value';
        volumeValue.className = 'value-display';
        volumeValue.textContent = '100%';
        volumeValue.setAttribute('aria-live', 'polite');
        volumeWrapper.appendChild(volumeValue);

        container.appendChild(volumeWrapper);

        // 悬停阅读按钮
        if (feature.controls.hoverReadMenu) {
            const hoverReadBtn = document.createElement('button');
            hoverReadBtn.id = feature.controls.hoverReadMenu.id;
            hoverReadBtn.className = 'btn hover-read-btn inactive';
            hoverReadBtn.textContent = feature.controls.hoverReadMenu.text;
            hoverReadBtn.title = feature.controls.hoverReadMenu.title;
            hoverReadBtn.setAttribute('aria-label', feature.controls.hoverReadMenu.ariaLabel);

            hoverReadBtn.addEventListener('click', () => {
                if (speechManager) {
                    speechManager.toggleHoverRead();
                }
            });

            container.appendChild(hoverReadBtn);
        }

        // 快捷键提示
        const helpText = document.createElement('small');
        helpText.className = 'shortcut-help';
        helpText.textContent = '快捷键: Alt+Shift+R(启停) Alt+Shift+S(阅读) Alt+Shift+M(帮助)';
        helpText.setAttribute('aria-label', '语音快捷键');
        container.appendChild(helpText);

        this.navbar.appendChild(container);
    }

    renderMouseStylePanel(feature) {
        // 获取导航栏中的按钮（由 renderSingleButton 创建）
        const btn = document.getElementById(feature.button.id);
        if (!btn) return;

        // 检查面板是否已存在
        let panelOverlay = document.getElementById('mouse-style-panel-overlay');

        if (panelOverlay) {
            // 面板已存在，直接切换显示状态
            const isOpen = panelOverlay.style.display !== 'none';
            panelOverlay.style.display = isOpen ? 'none' : 'flex';
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            return;
        }

        // 面板不存在，创建它
        // 设置按钮属性
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');

        // 创建配置面板
        panelOverlay = document.createElement('div');
        panelOverlay.id = 'mouse-style-panel-overlay';
        panelOverlay.className = 'mouse-style-panel-overlay';
        panelOverlay.style.display = 'none';
        panelOverlay.setAttribute('role', 'dialog');
        panelOverlay.setAttribute('aria-labelledby', 'mouse-style-panel-title');
        panelOverlay.setAttribute('aria-modal', 'true');

        const panel = document.createElement('div');
        panel.className = 'mouse-style-panel';

        // 标题
        const title = document.createElement('h2');
        title.id = 'mouse-style-panel-title';
        title.textContent = '鼠标样式设置';
        panel.appendChild(title);

        // 大鼠标功能开关
        const bigMouseWrapper = document.createElement('div');
        bigMouseWrapper.className = 'panel-control-group';

        const bigMouseLabel = document.createElement('label');
        bigMouseLabel.htmlFor = 'big-mouse-toggle';
        bigMouseLabel.className = 'control-label';
        bigMouseLabel.textContent = '大鼠标';
        bigMouseWrapper.appendChild(bigMouseLabel);

        const bigMouseCheckbox = document.createElement('input');
        bigMouseCheckbox.type = 'checkbox';
        bigMouseCheckbox.id = 'big-mouse-toggle';
        bigMouseCheckbox.className = 'toggle-checkbox';
        bigMouseCheckbox.checked = false;
        bigMouseCheckbox.addEventListener('change', () => {
            toggleBigMouse(bigMouseCheckbox.checked);
            if (bigMouseCheckbox.checked) {
                btn.classList.add('active');
                btn.classList.remove('inactive');
            } else {
                btn.classList.remove('active');
                btn.classList.add('inactive');
            }
        });
        bigMouseWrapper.appendChild(bigMouseCheckbox);
        panel.appendChild(bigMouseWrapper);

        // 十字线功能开关
        const crosshairWrapper = document.createElement('div');
        crosshairWrapper.className = 'panel-control-group';

        const crosshairLabel = document.createElement('label');
        crosshairLabel.htmlFor = 'crosshair-toggle';
        crosshairLabel.className = 'control-label';
        crosshairLabel.textContent = '十字线';
        crosshairWrapper.appendChild(crosshairLabel);

        const crosshairCheckbox = document.createElement('input');
        crosshairCheckbox.type = 'checkbox';
        crosshairCheckbox.id = 'crosshair-toggle';
        crosshairCheckbox.className = 'toggle-checkbox';
        crosshairCheckbox.checked = false;
        crosshairCheckbox.addEventListener('change', () => {
            toggleCrosshair(crosshairCheckbox.checked);
            if (crosshairCheckbox.checked) {
                btn.classList.add('active');
                btn.classList.remove('inactive');
            } else {
                btn.classList.remove('active');
                btn.classList.add('inactive');
            }
        });
        crosshairWrapper.appendChild(crosshairCheckbox);
        panel.appendChild(crosshairWrapper);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn panel-close-btn';
        closeBtn.textContent = '关闭';
        closeBtn.addEventListener('click', () => {
            panelOverlay.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
        });
        panel.appendChild(closeBtn);

        panelOverlay.appendChild(panel);

        // 点击面板外部关闭
        panelOverlay.addEventListener('click', (e) => {
            if (e.target === panelOverlay) {
                panelOverlay.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // 初始化显示状态
        panelOverlay.style.display = 'flex';
        btn.setAttribute('aria-expanded', 'true');

        // 只添加面板到body（按钮已由 renderSingleButton 创建）
        document.body.appendChild(panelOverlay);
    }

    renderColorBlindPanel(feature) {
        // 获取导航栏中的按钮（由 renderSingleButton 创建）
        const btn = document.getElementById(feature.button.id);
        if (!btn) return;

        // 检查面板是否已存在
        let panelOverlay = document.getElementById('colorblind-panel-overlay');

        if (panelOverlay) {
            // 面板已存在，直接切换显示状态
            const isOpen = panelOverlay.style.display !== 'none';
            panelOverlay.style.display = isOpen ? 'none' : 'flex';
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            return;
        }

        // 面板不存在，创建它
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');

        // 创建配置面板
        panelOverlay = document.createElement('div');
        panelOverlay.id = 'colorblind-panel-overlay';
        panelOverlay.className = 'colorblind-panel-overlay';
        panelOverlay.style.display = 'none';
        panelOverlay.setAttribute('role', 'dialog');
        panelOverlay.setAttribute('aria-labelledby', 'colorblind-panel-title');
        panelOverlay.setAttribute('aria-modal', 'true');

        const panel = document.createElement('div');
        panel.className = 'colorblind-panel';

        // 标题
        const title = document.createElement('h2');
        title.id = 'colorblind-panel-title';
        title.textContent = '色盲模式设置';
        panel.appendChild(title);

        // 色盲模式选项
        const modeWrapper = document.createElement('div');
        modeWrapper.className = 'panel-control-group';

        const modeLabel = document.createElement('label');
        modeLabel.className = 'control-label';
        modeLabel.textContent = '选择色盲类型：';
        modeWrapper.appendChild(modeLabel);

        const modeOptions = document.createElement('div');
        modeOptions.className = 'colorblind-options';

        Object.entries(colorblindManager.modes).forEach(([key, mode]) => {
            const optionLabel = document.createElement('label');
            optionLabel.className = 'colorblind-option';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'colorblind-mode';
            radio.value = key;
            radio.checked = colorblindManager.currentMode === key;
            radio.addEventListener('change', () => {
                colorblindManager.applyMode(key);
                colorblindManager.announceChange(`已切换到${mode.name}`);
            });

            optionLabel.appendChild(radio);
            optionLabel.appendChild(document.createTextNode(mode.name));
            modeOptions.appendChild(optionLabel);
        });

        modeWrapper.appendChild(modeOptions);
        panel.appendChild(modeWrapper);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn panel-close-btn';
        closeBtn.textContent = '关闭';
        closeBtn.addEventListener('click', () => {
            panelOverlay.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
        });
        panel.appendChild(closeBtn);

        panelOverlay.appendChild(panel);

        // 点击面板外部关闭
        panelOverlay.addEventListener('click', (e) => {
            if (e.target === panelOverlay) {
                panelOverlay.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // 初始化显示状态
        panelOverlay.style.display = 'flex';
        btn.setAttribute('aria-expanded', 'true');

        // 添加面板到body
        document.body.appendChild(panelOverlay);
    }

    renderSpeechRecognitionPanel(feature) {
        // 获取导航栏中的按钮（由 renderSingleButton 创建）
        const btn = document.getElementById(feature.button.id);
        if (!btn) return;

        // 检查面板是否已存在
        let panelOverlay = document.getElementById('speech-recognition-panel-overlay');

        if (panelOverlay) {
            // 面板已存在，直接切换显示状态
            const isOpen = panelOverlay.style.display !== 'none';
            panelOverlay.style.display = isOpen ? 'none' : 'flex';
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            return;
        }

        // 面板不存在，创建它
        // 设置按钮属性
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');

        // 创建配置面板
        panelOverlay = document.createElement('div');
        panelOverlay.id = 'speech-recognition-panel-overlay';
        panelOverlay.className = 'speech-recognition-panel-overlay';
        panelOverlay.style.display = 'none';
        panelOverlay.setAttribute('role', 'dialog');
        panelOverlay.setAttribute('aria-labelledby', 'speech-recognition-panel-title');
        panelOverlay.setAttribute('aria-modal', 'true');

        const panel = document.createElement('div');
        panel.className = 'speech-recognition-panel';

        // 标题
        const title = document.createElement('h2');
        title.id = 'speech-recognition-panel-title';
        title.textContent = '语音识别设置';
        panel.appendChild(title);

        // 启动按钮
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'panel-control-group button-group';

        const startBtn = document.createElement('button');
        startBtn.className = 'control-button start-button';
        startBtn.textContent = '🎤 开始语音控制';
        startBtn.addEventListener('click', () => {
            if (speechRecognitionManager) {
                speechRecognitionManager.start();
                startBtn.style.display = 'none';
                stopBtn.style.display = 'block';
                statusText.textContent = '状态：正在监听...';
                statusText.className = 'status-text listening';
                // 更新按钮样式
                btn.classList.add('active');
                btn.classList.remove('inactive');
            }
        });

        const stopBtn = document.createElement('button');
        stopBtn.className = 'control-button stop-button';
        stopBtn.textContent = '⏹️ 停止语音控制';
        stopBtn.style.display = speechRecognitionManager && speechRecognitionManager.isListening ? 'block' : 'none';
        stopBtn.addEventListener('click', () => {
            if (speechRecognitionManager) {
                speechRecognitionManager.stop();
                startBtn.style.display = 'block';
                stopBtn.style.display = 'none';
                statusText.textContent = '状态：已停止';
                statusText.className = 'status-text stopped';
                // 更新按钮样式
                btn.classList.remove('active');
                btn.classList.add('inactive');
            }
        });

        buttonGroup.appendChild(startBtn);
        buttonGroup.appendChild(stopBtn);
        panel.appendChild(buttonGroup);

        // 状态显示
        const statusText = document.createElement('div');
        statusText.className = 'status-text ' + (speechRecognitionManager && speechRecognitionManager.isListening ? 'listening' : 'stopped');
        statusText.textContent = speechRecognitionManager && speechRecognitionManager.isListening ? '状态：正在监听...' : '状态：已停止';
        panel.appendChild(statusText);

        // 命令提示
        const commandsTitle = document.createElement('h3');
        commandsTitle.textContent = '支持的语音命令';
        commandsTitle.className = 'commands-title';
        panel.appendChild(commandsTitle);

        const commandsList = document.createElement('div');
        commandsList.className = 'commands-list';

        const commands = [
            { name: '放大', description: '放大页面（最大 200%）' },
            { name: '缩小', description: '缩小页面（最小 50%）' },
            { name: '重置', description: '重置页面缩放到 100%' },
            { name: '下滑', description: '向下滚动页面' },
            { name: '上滑', description: '向上滚动页面' },
            { name: '启用朗读', description: '启用页面朗读功能' },
            { name: '关闭朗读', description: '关闭页面朗读功能' },
            { name: '下一行', description: '朗读下一行内容' },
            { name: '上一行', description: '朗读上一行内容' }
        ];

        commands.forEach(cmd => {
            const cmdItem = document.createElement('div');
            cmdItem.className = 'command-item';

            const cmdName = document.createElement('span');
            cmdName.className = 'command-name';
            cmdName.textContent = cmd.name;

            const cmdDesc = document.createElement('span');
            cmdDesc.className = 'command-description';
            cmdDesc.textContent = cmd.description;

            cmdItem.appendChild(cmdName);
            cmdItem.appendChild(cmdDesc);
            commandsList.appendChild(cmdItem);
        });

        panel.appendChild(commandsList);

        // 说明文字
        const tips = document.createElement('div');
        tips.className = 'panel-tips';
        tips.innerHTML = `
            <p><strong>使用提示：</strong></p>
            <ul>
                <li>点击"开始语音控制"启用语音识别</li>
                <li>按照支持的命令清单说出相应的语音命令</li>
                <li>语音识别支持汉语普通话</li>
                <li>在安静的环境中使用效果最佳</li>
                <li>如浏览器要求授权麦克风权限，请点击允许</li>
            </ul>
        `;
        panel.appendChild(tips);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-button';
        closeBtn.textContent = '×';
        closeBtn.title = '关闭面板';
        closeBtn.addEventListener('click', () => {
            panelOverlay.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
        });
        panel.appendChild(closeBtn);

        panelOverlay.appendChild(panel);

        // 点击遮罩关闭面板
        panelOverlay.addEventListener('click', (e) => {
            if (e.target === panelOverlay) {
                panelOverlay.style.display = 'none';
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // 初始化显示状态
        panelOverlay.style.display = 'flex';
        btn.setAttribute('aria-expanded', 'true');

        // 只添加面板到body（按钮已由 renderSingleButton 创建）
        document.body.appendChild(panelOverlay);
    }

}

// ============================================
// 页面初始化
// ============================================

// 创建全局管理器实例
let zoomManager;
let themeManager;
let speechManager;
let lineReaderManager;
let keyboardHelpManager;
let speechRecognitionManager;
let colorblindManager;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化主题管理器
    themeManager = new ThemeManager();

    // 初始化缩放管理器
    zoomManager = new ZoomManager();

    // 初始化色盲模式管理器
    colorblindManager = new ColorBlindManager();

    // 初始化语音管理器
    speechManager = new SpeechManager();

    // 初始化行朗读管理器，传递speechManager以便使用朗读设置
    lineReaderManager = new LineReaderManager(speechManager);

    // 初始化快捷键帮助管理器
    keyboardHelpManager = new KeyboardHelpManager();

    // 初始化语音识别管理器
    speechRecognitionManager = new SpeechRecognitionManager();

    // 渲染导航栏
    const navbarRenderer = new NavbarRenderer();
    navbarRenderer.render();

    // 初始化时打开左侧栏（在桌面上）
    if (window.innerWidth > 768) {
        document.body.classList.add('sidebar-open');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.setAttribute('aria-expanded', 'true');
        }
    }

    // 创建行朗读浮动面板
    createLineReaderPanel();

    // 更新显示
    if (zoomManager) zoomManager.updateZoomDisplay();
    if (speechManager) {
        speechManager.updateSpeedDisplay();
        speechManager.updateVolumeDisplay();
        speechManager.updateEnabledButton();
        speechManager.updateHoverReadButton();
    }

    // 设置无障碍跳过链接
    setupAccessibility();

    // 设置行阅读键盘快捷键
    setupLineReaderShortcuts();

    console.log('✓ 无障碍网页已初始化');
});

// ============================================
// 行阅读键盘快捷键
// ============================================

function setupLineReaderShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Alt + ↑ : 阅读上一行
        if (e.altKey && e.key === 'ArrowUp') {
            e.preventDefault();
            if (lineReaderManager) {
                lineReaderManager.readPreviousLine();
            }
        }

        // Alt + ↓ : 阅读下一行
        if (e.altKey && e.key === 'ArrowDown') {
            e.preventDefault();
            if (lineReaderManager) {
                lineReaderManager.readNextLine();
            }
        }
    });
}

// ============================================
// 创建行朗读面板（已集成到侧边栏中）
// ============================================

function createLineReaderPanel() {
    // 此函数现已集成到 NavbarRenderer.renderSingleButton() 中处理行朗读
    // 以下代码保留用于监听语音启用/禁用事件，自动显示/隐藏行朗读按钮

    // 监听语音启用/禁用事件，自动显示/隐藏行朗读按钮
    if (speechManager && speechManager.toggleEnabled) {
        // 保存原始toggleEnabled方法
        const originalToggleEnabled = speechManager.toggleEnabled;

        // 重写toggleEnabled来同步行朗读按钮显示
        speechManager.toggleEnabled = function () {
            originalToggleEnabled.call(this);
            // 语音启用时显示行朗读按钮，禁用时隐藏
            const titleElement = document.querySelector('.line-reader-title');
            const prevBtn = document.getElementById('line-reader-prev');
            const nextBtn = document.getElementById('line-reader-next');

            if (titleElement || prevBtn || nextBtn) {
                const display = this.enabled ? 'block' : 'none';
                if (titleElement) titleElement.style.display = display;
                if (prevBtn) prevBtn.style.display = display;
                if (nextBtn) nextBtn.style.display = display;
            }
        };
    }

    // 添加一个函数来手动切换行朗读按钮显示
    window.toggleLineReaderPanel = function () {
        const titleElement = document.querySelector('.line-reader-title');
        const prevBtn = document.getElementById('line-reader-prev');
        const nextBtn = document.getElementById('line-reader-next');

        if (titleElement || prevBtn || nextBtn) {
            const isVisible = (titleElement && titleElement.style.display !== 'none') ||
                (prevBtn && prevBtn.style.display !== 'none') ||
                (nextBtn && nextBtn.style.display !== 'none');
            const display = isVisible ? 'none' : 'block';
            if (titleElement) titleElement.style.display = display;
            if (prevBtn) prevBtn.style.display = display;
            if (nextBtn) nextBtn.style.display = display;
            return !isVisible;
        }
        return false;
    };

    // 初始显示检查：如果语音已启用，显示行朗读按钮
    setTimeout(() => {
        if (speechManager && speechManager.enabled) {
            const titleElement = document.querySelector('.line-reader-title');
            const prevBtn = document.getElementById('line-reader-prev');
            const nextBtn = document.getElementById('line-reader-next');

            if (titleElement || prevBtn || nextBtn) {
                if (titleElement) titleElement.style.display = 'block';
                if (prevBtn) prevBtn.style.display = 'block';
                if (nextBtn) nextBtn.style.display = 'block';
            }
        }
    }, 100);
}

// ============================================
// 无障碍功能
// ============================================

function setupAccessibility() {
    // 添加跳过链接
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = '跳到主要内容';
    document.body.insertBefore(skipLink, document.body.firstChild);

    // 为主内容区域添加ID
    const mainContent = document.querySelector('main');
    if (mainContent && !mainContent.id) {
        mainContent.id = 'main-content';
    }

    // 确保所有交互元素都可以用键盘访问
    document.addEventListener('keydown', (e) => {
        // 按Tab键时显示焦点指示器
        if (e.key === 'Tab') {
            document.body.classList.add('using-keyboard');
        }
    });

    // 鼠标点击时隐藏焦点指示器
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('using-keyboard');
    });
}

// ============================================
// 鼠标样式功能
// ============================================

// 大鼠标功能
let bigMouseEnabled = false;
let originalCursorStyle = '';
let bigMouseStyleElement = null;
let bigMouseMoveListener = null;

function toggleBigMouse(enabled) {
    bigMouseEnabled = enabled;

    if (enabled) {
        // 保存原始鼠标样式
        originalCursorStyle = document.body.style.cursor;

        // 大鼠标光标 SVG 数据 URI
        const bigMouseCursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'64\' height=\'64\' viewBox=\'0 0 64 64\'><path d=\'M4,4 L56,28 L32,32 L28,56 Z\' fill=\'%23000\' stroke=\'%23fff\' stroke-width=\'2\'/></svg>") 4 4, auto';

        // 设置 body 的光标
        document.body.style.cursor = bigMouseCursor;

        // 创建样式表，强制所有可交互元素使用大鼠标样式
        if (!bigMouseStyleElement) {
            bigMouseStyleElement = document.createElement('style');
            bigMouseStyleElement.id = 'big-mouse-style';
            bigMouseStyleElement.textContent = `
                /* 大鼠标模式：强制所有元素使用大鼠标光标 */
                body.big-mouse-mode {
                    cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><path d='M4,4 L56,28 L32,32 L28,56 Z' fill='%23000' stroke='%23fff' stroke-width='2'/></svg>") 4 4, auto !important;
                }
                
                body.big-mouse-mode * {
                    cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><path d='M4,4 L56,28 L32,32 L28,56 Z' fill='%23000' stroke='%23fff' stroke-width='2'/></svg>") 4 4, auto !important;
                }
            `;
            document.head.appendChild(bigMouseStyleElement);
        }

        // 添加标志类到 body
        document.body.classList.add('big-mouse-mode');

        // 添加鼠标移动监听器，实时强制替换光标
        if (!bigMouseMoveListener) {
            bigMouseMoveListener = (e) => {
                // 强制设置当前悬停元素的光标
                const element = document.elementFromPoint(e.clientX, e.clientY);
                if (element) {
                    element.style.cursor = bigMouseCursor;
                }
                // 确保 body 光标始终是大鼠标
                document.body.style.cursor = bigMouseCursor;
            };
            document.addEventListener('mousemove', bigMouseMoveListener, true);
        }

        console.log('大鼠标功能已启用');
    } else {
        // 恢复原始鼠标样式
        document.body.style.cursor = originalCursorStyle;

        // 移除标志类
        document.body.classList.remove('big-mouse-mode');

        // 移除样式表（可选）
        if (bigMouseStyleElement) {
            bigMouseStyleElement.remove();
            bigMouseStyleElement = null;
        }

        // 移除鼠标移动监听器
        if (bigMouseMoveListener) {
            document.removeEventListener('mousemove', bigMouseMoveListener, true);
            bigMouseMoveListener = null;
        }

        console.log('大鼠标功能已禁用');
    }
}

// 十字线功能
let crosshairEnabled = false;
let crosshairElement = null;

function toggleCrosshair(enabled) {
    crosshairEnabled = enabled;

    if (enabled) {
        // 创建十字线元素
        crosshairElement = document.createElement('div');
        crosshairElement.id = 'crosshair-cursor';
        crosshairElement.className = 'crosshair-cursor';

        // 创建水平线
        const horizontalLine = document.createElement('div');
        horizontalLine.className = 'crosshair-horizontal';
        crosshairElement.appendChild(horizontalLine);

        // 创建垂直线
        const verticalLine = document.createElement('div');
        verticalLine.className = 'crosshair-vertical';
        crosshairElement.appendChild(verticalLine);

        document.body.appendChild(crosshairElement);

        // 监听鼠标移动
        document.addEventListener('mousemove', updateCrosshairPosition);

        // 更新初始位置
        updateCrosshairPosition({ clientX: 0, clientY: 0 });

        console.log('十字线功能已启用');
    } else {
        // 移除十字线元素
        if (crosshairElement && crosshairElement.parentNode) {
            crosshairElement.parentNode.removeChild(crosshairElement);
            crosshairElement = null;
        }

        // 移除事件监听
        document.removeEventListener('mousemove', updateCrosshairPosition);

        console.log('十字线功能已禁用');
    }
}

function updateCrosshairPosition(e) {
    if (!crosshairElement || !crosshairEnabled) return;

    const x = e.clientX;
    const y = e.clientY;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 更新十字线位置
    crosshairElement.style.left = x + 'px';
    crosshairElement.style.top = y + 'px';

    // 更新水平线
    const horizontalLine = crosshairElement.querySelector('.crosshair-horizontal');
    if (horizontalLine) {
        horizontalLine.style.width = windowWidth + 'px';
        horizontalLine.style.left = (-x) + 'px';
    }

    // 更新垂直线
    const verticalLine = crosshairElement.querySelector('.crosshair-vertical');
    if (verticalLine) {
        verticalLine.style.height = windowHeight + 'px';
        verticalLine.style.top = (-y) + 'px';
    }
}

// ============================================
// 调试信息
// ============================================

if (typeof window !== 'undefined') {
    window.debugPageZoom = {
        getCurrentZoom: () => zoomManager?.currentZoom,
        setZoom: (level) => zoomManager?.applyZoom(level),
        getConfig: () => ZOOM_CONFIG,
        getCurrentTheme: () => themeManager?.currentTheme,
        toggleTheme: () => themeManager?.toggleTheme(),
        getThemeConfig: () => THEME_CONFIG,
        isSpeaking: () => speechManager?.isSpeaking,
        readText: (text) => speechManager?.speak(text),
        getHoveredElement: () => speechManager?.hoveredElement,
        getSpeechSettings: () => speechManager?.settings,
        getSpeechConfig: () => SPEECH_CONFIG,
        getFeatures: () => NAVBAR_FEATURES
    };
}

// ============================================
// 调试管理器
// ============================================

class DebugManager {
    constructor() {
        this.debugPanelOpen = false;
    }

    // 显示调试面板
    showDebugPanel() {
        // 检查调试功能是否启用
        if (!DEBUG_CONFIG.enabled) {
            console.warn('调试功能已禁用。设置 DEBUG_CONFIG.enabled = true 来启用。');
            return;
        }

        if (this.debugPanelOpen) {
            this.closeDebugPanel();
            return;
        }

        this.debugPanelOpen = true;
        const debugInfo = this.collectDebugInfo();
        this.renderDebugPanel(debugInfo);
    }

    // 收集调试信息
    collectDebugInfo() {
        return {
            // 浏览器信息
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            // 支持的API
            supportedAPIs: {
                webSpeechAPI: !!window.SpeechSynthesisUtterance && !!window.speechSynthesis,
                localStorage: !!window.localStorage,
                sessionStorage: !!window.sessionStorage,
                webAudio: !!window.AudioContext || !!window.webkitAudioContext,
                fetch: !!window.fetch,
                serviceWorker: !!navigator.serviceWorker,
                notification: !!window.Notification,
                geolocation: !!navigator.geolocation,
                cssVariables: this.supportsCSSVariables(),
                flexbox: this.supportsFlexbox(),
                grid: this.supportsGrid()
            },
            // 当前功能状态
            features: {
                speechEnabled: speechManager?.enabled || false,
                speechUsing: speechManager?.useWebSpeechAPI ? 'Web Speech API' : '微软 Edge TTS',
                hoverReadEnabled: speechManager?.hoverReadEnabled || false,
                zoomLevel: zoomManager?.currentZoom || '100%',
                currentTheme: themeManager?.currentTheme || 'light',
                bigMouseEnabled: bigMouseEnabled || false,
                crosshairEnabled: window.crosshairEnabled || false
            },
            // localStorage 信息
            storage: this.collectStorageInfo(),
            // 页面性能
            performance: this.collectPerformanceInfo(),
            // 设备信息
            device: {
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
                isMobile: /mobile/i.test(navigator.userAgent)
            }
        };
    }

    // 收集存储信息
    collectStorageInfo() {
        const storage = {};
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    storage[key] = localStorage.getItem(key);
                }
            }
        } catch (e) {
            storage.error = '无法访问 localStorage';
        }
        return storage;
    }

    // 收集性能信息
    collectPerformanceInfo() {
        if (!window.performance) return { error: '不支持 Performance API' };

        const perf = window.performance.timing;
        return {
            pageLoadTime: perf.loadEventEnd - perf.navigationStart + 'ms',
            domReady: perf.domContentLoadedEventEnd - perf.navigationStart + 'ms',
            connectTime: perf.responseEnd - perf.requestStart + 'ms'
        };
    }

    // 检查CSS变量支持
    supportsCSSVariables() {
        const div = document.createElement('div');
        div.style.setProperty('--test', '1px');
        return div.style.getPropertyValue('--test') === '1px';
    }

    // 检查Flexbox支持
    supportsFlexbox() {
        const div = document.createElement('div');
        div.style.display = 'flex';
        return div.style.display === 'flex';
    }

    // 检查Grid支持
    supportsGrid() {
        const div = document.createElement('div');
        div.style.display = 'grid';
        return div.style.display === 'grid';
    }

    // 渲染调试面板
    renderDebugPanel(debugInfo) {
        let existingPanel = document.getElementById('debug-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 90%;
            max-width: 550px;
            max-height: 80vh;
            background: #1a1a1a;
            color: #e0e0e0;
            border: 2px solid #0084ff;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 132, 255, 0.3);
        `;

        let html = '<h3 style="color: #0084ff; margin-top: 0;">🔧 调试信息</h3>';

        // 功能模拟选项
        html += '<h4 style="color: #ffb74d;">🎭 功能模拟</h4>';
        html += '<div style="background: #262626; padding: 10px; border-radius: 4px; margin-bottom: 10px;">';

        // Web Speech API 切换
        const webSpeechChecked = DEBUG_CONFIG.disableWebSpeechAPI ? '' : 'checked';
        html += `<label style="display: block; margin: 8px 0; cursor: pointer;">
            <input type="checkbox" id="debug-toggle-webspeech" ${webSpeechChecked} />
            启用 Web Speech API（关闭后将使用 Microsoft TTS 降级方案）
        </label>`;

        html += '</div>';

        // 浏览器信息
        html += '<h4 style="color: #90caf9;">浏览器信息</h4>';
        html += '<details><summary>点击展开</summary>';
        html += `<pre>${JSON.stringify(debugInfo.browser, null, 2)}</pre></details>`;

        // API支持情况
        html += '<h4 style="color: #90caf9;">API 支持</h4>';
        html += '<details><summary>点击展开</summary>';
        const apiStatus = Object.entries(debugInfo.supportedAPIs)
            .map(([key, value]) => `${key}: ${value ? '✓' : '✗'}`)
            .join('\n');
        html += `<pre>${apiStatus}</pre></details>`;

        // 功能状态
        html += '<h4 style="color: #90caf9;">功能状态</h4>';
        html += '<details><summary>点击展开</summary>';
        const featureStatus = Object.entries(debugInfo.features)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        html += `<pre>${featureStatus}</pre></details>`;

        // 存储信息
        html += '<h4 style="color: #90caf9;">LocalStorage</h4>';
        html += '<details><summary>点击展开</summary>';
        html += `<pre>${JSON.stringify(debugInfo.storage, null, 2)}</pre></details>`;

        // 性能信息
        html += '<h4 style="color: #90caf9;">性能</h4>';
        html += '<details><summary>点击展开</summary>';
        html += `<pre>${JSON.stringify(debugInfo.performance, null, 2)}</pre></details>`;

        // 设备信息
        html += '<h4 style="color: #90caf9;">设备</h4>';
        html += '<details><summary>点击展开</summary>';
        html += `<pre>${JSON.stringify(debugInfo.device, null, 2)}</pre></details>`;

        // 按钮
        html += '<div style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">';
        html += '<button id="debug-refresh" style="flex: 1; padding: 8px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 100px;">刷新页面</button>';
        html += '<button id="debug-clear-storage" style="flex: 1; padding: 8px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 100px;">清除存储</button>';
        html += '<button id="debug-close" style="flex: 1; padding: 8px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 100px;">关闭</button>';
        html += '</div>';

        panel.innerHTML = html;
        document.body.appendChild(panel);

        // 绑定事件 - 功能模拟切换
        document.getElementById('debug-toggle-webspeech').addEventListener('change', (e) => {
            DEBUG_CONFIG.disableWebSpeechAPI = !e.target.checked;
            console.log('[DEBUG] Web Speech API:', e.target.checked ? '已启用' : '已禁用');
        });

        document.getElementById('debug-refresh').addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('debug-clear-storage').addEventListener('click', () => {
            if (confirm('确定要清除所有本地存储数据吗？')) {
                localStorage.clear();
                sessionStorage.clear();
                alert('存储已清除');
                this.closeDebugPanel();
            }
        });

        document.getElementById('debug-close').addEventListener('click', () => {
            this.closeDebugPanel();
        });
    }

    // 关闭调试面板
    closeDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.remove();
        }
        this.debugPanelOpen = false;
    }

    // 在控制台输出调试信息
    logDebugInfo() {
        const info = this.collectDebugInfo();
        console.group('🔧 调试信息');
        console.table(info.browser);
        console.table(info.supportedAPIs);
        console.table(info.features);
        console.table(info.device);
        console.groupEnd();
    }
}

// 初始化调试管理器
const debugManager = new DebugManager();

// 按 Ctrl+Shift+D 打开/关闭调试面板
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        debugManager.showDebugPanel();
    }
});

// 全局快捷方式
window.showDebug = () => debugManager.showDebugPanel();
window.logDebug = () => debugManager.logDebugInfo();

/* ============================================
   日夜切换按钮 4.0 Web Component
   基于 Day-night-toggle-button 项目
   https://github.com/Xiumuzaidiao/Day-night-toggle-button
   LICENSE: ISC License
   Copyright(c)2024, Xiumuzaidiao
   ============================================ */

(() => {
    const func = (root, initTheme, changeTheme) => {
        const $ = (s) => {
            let dom = root.querySelectorAll(s);
            return dom.length == 1 ? dom[0] : dom;
        };
        let mainButton = $(".main-button");
        let daytimeBackground = $(".daytime-background");
        let cloud = $(".cloud");
        let cloudList = $(".cloud-son");
        let cloudLight = $(".cloud-light");
        let components = $(".components");
        let moon = $(".moon");
        let stars = $(".stars");
        let star = $(".star");
        let isMoved = false;
        let isClicked = false;

        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            toggleThemeBasedOnSystem();
        });

        const toggleThemeBasedOnSystem = () => {
            if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                if (!isMoved) {
                    components.onclick();
                }
            } else {
                if (isMoved) {
                    components.onclick();
                }
            }
        };

        components.onclick = () => {
            if (isMoved) {
                mainButton.style.transform = "translateX(0)";
                mainButton.style.backgroundColor = "rgba(255, 195, 35,1)";
                mainButton.style.boxShadow = "3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 230, 80,1)";
                daytimeBackground[0].style.transform = "translateX(0)";
                daytimeBackground[1].style.transform = "translateX(0)";
                daytimeBackground[2].style.transform = "translateX(0)";
                cloud.style.transform = "translateY(10em)";
                cloudLight.style.transform = "translateY(10em)";
                components.style.backgroundColor = "rgba(70, 133, 192,1)";
                moon[0].style.opacity = "0";
                moon[1].style.opacity = "0";
                moon[2].style.opacity = "0";
                stars.style.transform = "translateY(-125em)";
                stars.style.opacity = "0";
                changeTheme("light");
            } else {
                mainButton.style.transform = "translateX(110em)";
                mainButton.style.backgroundColor = "rgba(195, 200,210,1)";
                mainButton.style.boxShadow = "3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 255, 210,1)";
                daytimeBackground[0].style.transform = "translateX(110em)";
                daytimeBackground[1].style.transform = "translateX(80em)";
                daytimeBackground[2].style.transform = "translateX(50em)";
                cloud.style.transform = "translateY(80em)";
                cloudLight.style.transform = "translateY(80em)";
                components.style.backgroundColor = "rgba(25,30,50,1)";
                moon[0].style.opacity = "1";
                moon[1].style.opacity = "1";
                moon[2].style.opacity = "1";
                stars.style.transform = "translateY(-62.5em)";
                stars.style.opacity = "1";
                changeTheme("dark");
            }
            isClicked = true;
            setTimeout(function () {
                isClicked = false;
            }, 500);
            isMoved = !isMoved;
        };

        mainButton.addEventListener("mousemove", function () {
            if (isClicked) return;
            if (isMoved) {
                mainButton.style.transform = "translateX(100em)";
                daytimeBackground[0].style.transform = "translateX(100em)";
                daytimeBackground[1].style.transform = "translateX(73em)";
                daytimeBackground[2].style.transform = "translateX(46em)";
                star[0].style.top = "10em";
                star[0].style.left = "36em";
                star[1].style.top = "40em";
                star[1].style.left = "87em";
                star[2].style.top = "26em";
                star[2].style.left = "16em";
                star[3].style.top = "38em";
                star[3].style.left = "63em";
                star[4].style.top = "20.5em";
                star[4].style.left = "72em";
                star[5].style.top = "51.5em";
                star[5].style.left = "35em";
            } else {
                mainButton.style.transform = "translateX(10em)";
                daytimeBackground[0].style.transform = "translateX(10em)";
                daytimeBackground[1].style.transform = "translateX(7em)";
                daytimeBackground[2].style.transform = "translateX(4em)";
                cloudList[0].style.right = "-24em";
                cloudList[0].style.bottom = "10em";
                cloudList[1].style.right = "-12em";
                cloudList[1].style.bottom = "-27em";
                cloudList[2].style.right = "17em";
                cloudList[2].style.bottom = "-43em";
                cloudList[3].style.right = "46em";
                cloudList[3].style.bottom = "-39em";
                cloudList[4].style.right = "70em";
                cloudList[4].style.bottom = "-65em";
                cloudList[5].style.right = "109em";
                cloudList[5].style.bottom = "-54em";
                cloudList[6].style.right = "-23em";
                cloudList[6].style.bottom = "10em";
                cloudList[7].style.right = "-11em";
                cloudList[7].style.bottom = "-26em";
                cloudList[8].style.right = "18em";
                cloudList[8].style.bottom = "-42em";
                cloudList[9].style.right = "47em";
                cloudList[9].style.bottom = "-38em";
                cloudList[10].style.right = "74em";
                cloudList[10].style.bottom = "-64em";
                cloudList[11].style.right = "110em";
                cloudList[11].style.bottom = "-55em";
            }
        });

        mainButton.addEventListener("mouseout", function () {
            if (isClicked) return;
            if (isMoved) {
                mainButton.style.transform = "translateX(110em)";
                daytimeBackground[0].style.transform = "translateX(110em)";
                daytimeBackground[1].style.transform = "translateX(80em)";
                daytimeBackground[2].style.transform = "translateX(50em)";
                star[0].style.top = "11em";
                star[0].style.left = "39em";
                star[1].style.top = "39em";
                star[1].style.left = "91em";
                star[2].style.top = "26em";
                star[2].style.left = "19em";
                star[3].style.top = "37em";
                star[3].style.left = "66em";
                star[4].style.top = "21em";
                star[4].style.left = "75em";
                star[5].style.top = "51em";
                star[5].style.left = "38em";
            } else {
                mainButton.style.transform = "translateX(0em)";
                daytimeBackground[0].style.transform = "translateX(0em)";
                daytimeBackground[1].style.transform = "translateX(0em)";
                daytimeBackground[2].style.transform = "translateX(0em)";
                cloudList[0].style.right = "-20em";
                cloudList[0].style.bottom = "10em";
                cloudList[1].style.right = "-10em";
                cloudList[1].style.bottom = "-25em";
                cloudList[2].style.right = "20em";
                cloudList[2].style.bottom = "-40em";
                cloudList[3].style.right = "50em";
                cloudList[3].style.bottom = "-35em";
                cloudList[4].style.right = "75em";
                cloudList[4].style.bottom = "-60em";
                cloudList[5].style.right = "110em";
                cloudList[5].style.bottom = "-50em";
                cloudList[6].style.right = "-20em";
                cloudList[6].style.bottom = "10em";
                cloudList[7].style.right = "-10em";
                cloudList[7].style.bottom = "-25em";
                cloudList[8].style.right = "20em";
                cloudList[8].style.bottom = "-40em";
                cloudList[9].style.right = "50em";
                cloudList[9].style.bottom = "-35em";
                cloudList[10].style.right = "75em";
                cloudList[10].style.bottom = "-60em";
                cloudList[11].style.right = "110em";
                cloudList[11].style.bottom = "-50em";
            }
        });

        const getRandomDirection = () => {
            const directions = ["2em", "-2em"];
            return directions[Math.floor(Math.random() * directions.length)];
        };

        const moveElementRandomly = (element) => {
            const randomDirectionX = getRandomDirection();
            const randomDirectionY = getRandomDirection();
            element.style.transform = `translate(${randomDirectionX}, ${randomDirectionY})`;
        };

        const cloudSons = root.querySelectorAll(".cloud-son");
        setInterval(() => {
            cloudSons.forEach(moveElementRandomly);
        }, 1000);

        if (initTheme === "dark") {
            components.onclick();
        }
    };

    class ThemeButton extends HTMLElement {
        constructor() {
            super();
        }
        connectedCallback() {
            const initTheme = this.getAttribute("value") || "light";
            const size = +this.getAttribute("size") || 3;
            const shadow = this.attachShadow({ mode: "closed" });
            const container = document.createElement("div");
            container.setAttribute("class", "container");
            container.setAttribute("style", `font-size: ${(size / 3).toFixed(2)}px`);
            container.innerHTML =
                '<div class="components"><div class="main-button"><div class="moon"></div><div class="moon"></div><div class="moon"></div></div><div class="daytime-background"></div><div class="daytime-background"></div><div class="daytime-background"></div><div class="cloud"><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div></div><div class="cloud-light"><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div></div><div class="stars"><div class="star big"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star big"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star medium"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star medium"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star small"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star small"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div></div></div>';
            const style = document.createElement("style");
            style.textContent =
                "* { margin: 0; padding: 0; transition: 0.7s; -webkit-tap-highlight-color:rgba(0,0,0,0); } .container { position: absolute;top: 50%;left: 50%;margin-top: -35em;margin-left: -90em;width: 180em; height: 70em; display: inline-block; vertical-align: bottom; transform: translate3d(0, 0, 0); } .components{ position:fixed; width: 180em; height: 70em; background-color: rgba(70, 133, 192,1); border-radius: 100em; box-shadow: inset 0 0 5em 3em rgba(0, 0, 0, 0.5); overflow: hidden; transition: 0.7s; transition-timing-function: cubic-bezier( 0,0.5, 1,1); cursor: pointer; } .main-button{ margin: 7.5em 0 0 7.5em; width: 55em; height:55em; background-color: rgba(255, 195, 35,1); border-radius: 50%; box-shadow:3em 3em 5em rgba(0, 0, 0, 0.5), inset -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset 4em 5em 2em -2em rgba(255, 230, 80,1); transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .moon{ position: absolute; background-color: rgba(150, 160, 180, 1); box-shadow:inset 0em 0em 1em 1em rgba(0, 0, 0, 0.3) ; border-radius: 50%; transition: 0.5s; opacity: 0; } .moon:nth-child(1){ top: 7.5em; left: 25em; width: 12.5em; height: 12.5em; } .moon:nth-child(2){ top: 20em; left: 7.5em; width: 20em; height: 20em; } .moon:nth-child(3){ top: 32.5em; left: 32.5em; width: 12.5em; height: 12.5em; } .daytime-background { position: absolute; border-radius: 50%; transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .daytime-background:nth-child(2){ top: -20em; left: -20em; width: 110em; height:110em; background-color: rgba(255, 255, 255,0.2); z-index: -2; } .daytime-background:nth-child(3){ top: -32.5em; left: -17.5em; width: 135em; height:135em; background-color: rgba(255, 255, 255,0.1); z-index: -3; } .daytime-background:nth-child(4){ top: -45em; left: -15em; width: 160em; height:160em; background-color: rgba(255, 255, 255,0.05); z-index: -4; } .cloud,.cloud-light{ transform: translateY(10em); transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .cloud-son{ position: absolute; background-color: #fff; border-radius: 50%; z-index: -1; transition: transform 6s,right 1s,bottom 1s; } .cloud-son:nth-child(6n+1){ right: -20em; bottom: 10em; width: 50em; height: 50em; } .cloud-son:nth-child(6n+2) { right: -10em; bottom: -25em; width: 60em; height: 60em; } .cloud-son:nth-child(6n+3) { right: 20em; bottom: -40em; width: 60em; height: 60em; } .cloud-son:nth-child(6n+4) { right: 50em; bottom: -35em; width: 60em; height: 60em; } .cloud-son:nth-child(6n+5) { right: 75em; bottom: -60em; width: 75em; height: 75em; } .cloud-son:nth-child(6n+6) { right: 110em; bottom: -50em; width: 60em; height: 60em; } .cloud{ z-index: -2; } .cloud-light{ position: absolute; right: 0em; bottom: 25em; opacity: 0.5; z-index: -3; } .stars{ transform: translateY(-125em); z-index: -2; transition: 1.0s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .big { --size: 7.5em; } .medium { --size: 5em; } .small { --size: 3em; } .star { position: absolute; width: calc(2*var(--size)); height: calc(2*var(--size)); } .star:nth-child(1){ top: 11em; left: 39em; animation-name: star; animation-duration: 3.5s; } .star:nth-child(2){ top: 39em; left: 91em; animation-name: star; animation-duration: 4.1s; } .star:nth-child(3){ top: 26em; left: 19em; animation-name: star; animation-duration: 4.9s; } .star:nth-child(4){ top: 37em; left: 66em; animation-name: star; animation-duration: 5.3s; } .star:nth-child(5){ top: 21em; left: 75em; animation-name: star; animation-duration: 3s; } .star:nth-child(6){ top: 51em; left: 38em; animation-name: star; animation-duration: 2.2s; } @keyframes star { 0%,20%{ transform: scale(0); } 20%,100% { transform: scale(1); } } .star-son{ float: left; } .star-son:nth-child(1) { --pos: left 0; } .star-son:nth-child(2) { --pos: right 0; } .star-son:nth-child(3) { --pos: 0 bottom; } .star-son:nth-child(4) { --pos: right bottom; } .star-son { width: var(--size); height: var(--size); background-image: radial-gradient(circle var(--size) at var(--pos), transparent var(--size), #fff); } .star{ transform: scale(1); transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); transition: 1s; animation-iteration-count:infinite; animation-direction: alternate; animation-timing-function: linear; }";
            const changeTheme = (detail) => {
                this.dispatchEvent(new CustomEvent("change", { detail }));
            };
            func(container, initTheme, changeTheme);
            shadow.appendChild(style);
            shadow.appendChild(container);
        }
    }

    customElements.define("theme-button", ThemeButton);
})();

// 监听日夜按钮的change事件，与主题管理器同步
document.addEventListener('DOMContentLoaded', function () {
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('change', function (e) {
            if (themeManager) {
                const newTheme = e.detail === 'dark' ? 'dark' : 'light';
                if (themeManager.currentTheme !== newTheme) {
                    themeManager.applyTheme(newTheme);
                }
            }
        });
    }
});

