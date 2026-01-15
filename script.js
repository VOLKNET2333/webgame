// ============================================
// 无障碍网页功能配置
// ============================================

// 调试配置 - 控制是否启用调试功能
let DEBUG_CONFIG = {
    enabled: true,                      // 是否启用调试面板
    disableWebSpeechAPI: false,        // 是否禁用Web Speech API（测试微软TTS）
    disableCSSVariables: false,        // 是否禁用CSS变量支持
    logLevel: 'info'                    // 日志级别：'debug'|'info'|'warn'|'error'
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

// 保存调试配置到 localStorage
function saveDebugConfig() {
    try {
        localStorage.setItem('DEBUG_CONFIG', JSON.stringify(DEBUG_CONFIG));
    } catch (e) {
        console.warn('[DEBUG] 无法保存调试配置:', e.message);
    }
}

// 顶栏功能配置 - 使用const定义
const NAVBAR_FEATURES = [
    {
        id: 'zoom-controls',
        type: 'button-group',
        label: '页面缩放',
        buttons: [
            { id: 'zoom-decrease', text: '缩小（−）', title: '减小页面显示大小，按Ctrl+-', action: 'decreaseZoom', ariaLabel: '缩小页面' },
            { id: 'zoom-reset', text: '重置', title: '重置页面缩放到100%', action: 'resetZoom', ariaLabel: '重置页面缩放' },
            { id: 'zoom-increase', text: '放大（+）', title: '增大页面显示大小，按Ctrl++', action: 'increaseZoom', ariaLabel: '放大页面' }
        ]
    },
    {
        id: 'mouse-style',
        type: 'mouse-style-panel',
        label: '鼠标样式',
        button: { id: 'mouse-style-btn', text: '🖱️ 鼠标样式', title: '打开鼠标样式设置面板', ariaLabel: '打开鼠标样式设置面板' }
    },
    {
        id: 'speech-panel',
        type: 'speech-panel',
        label: '页面朗读',
        button: { id: 'speech-panel-btn', text: '📖 页面朗读', title: '打开朗读配置面板', ariaLabel: '打开页面朗读配置面板' }
    },
    {
        id: 'theme-control',
        type: 'single-button',
        label: '深色模式',
        button: { id: 'theme-toggle', text: '🌙 深色模式', title: '切换浅色/深色模式', action: 'toggleTheme', ariaLabel: '切换深色模式' }
    },
    {
        id: 'keyboard-help',
        type: 'single-button',
        label: '快捷键帮助',
        button: { id: 'keyboard-help-btn', text: '⌨️ 快捷键', title: '查看快捷键帮助', action: 'showKeyboardHelp', ariaLabel: '快捷键帮助' }
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
        this.hoveredElement = null;
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
        return saved !== null ? JSON.parse(saved) : true;
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
            this.readHoveredLine();
        }
    }

    // 停止阅读
    stop() {
        this.cancel();
        this.updateSpeechButton();
        this.announceChange('已停止阅读');
    }

    // 阅读鼠标指向的文本
    readHoveredLine() {
        console.log('readHoveredLine called, hoveredElement:', this.hoveredElement);
        
        if (!this.enabled) {
            this.announceChange('语音功能已禁用');
            return;
        }

        if (!this.hoveredElement) {
            console.log('No hovered element, showing instructions');
            this.announceChange('请将鼠标悬停在要阅读的内容上');
            return;
        }

        const text = this.hoveredElement.textContent;
        console.log('Text to read:', text);
        
        if (text.trim()) {
            this.speak(text);
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
        this.updateThemeButton();
    }

    // 切换主题
    toggleTheme() {
        const newTheme = this.currentTheme === THEME_CONFIG.light ? THEME_CONFIG.dark : THEME_CONFIG.light;
        this.applyTheme(newTheme);
        const message = newTheme === THEME_CONFIG.dark ? '已切换到深色模式' : '已切换到浅色模式';
        this.announceChange(message);
    }

    // 更新按钮状态
    updateThemeButton() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            if (this.currentTheme === THEME_CONFIG.dark) {
                btn.textContent = '🌙 深色模式';
                btn.classList.add('active');
            } else {
                btn.textContent = '☀️ 浅色模式';
                btn.classList.remove('active');
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
    }

    render() {
        NAVBAR_FEATURES.forEach(feature => {
            if (feature.type === 'button-group') {
                this.renderButtonGroup(feature);
            } else if (feature.type === 'single-button') {
                this.renderSingleButton(feature);
            } else if (feature.type === 'dropdown-menu') {
                this.renderDropdownMenu(feature);
            } else if (feature.type === 'speech-panel') {
                this.renderSpeechPanel(feature);
            } else if (feature.type === 'speech-control') {
                this.renderSpeechControl(feature);
            } else if (feature.type === 'mouse-style-panel') {
                this.renderMouseStylePanel(feature);
            }
        });
    }

    renderSingleButton(feature) {
        const btn = document.createElement('button');
        btn.id = feature.button.id;
        btn.className = 'btn';
        btn.textContent = feature.button.text;
        btn.title = feature.button.title;
        btn.setAttribute('aria-label', feature.button.ariaLabel);
        
        // 为启用语音按钮添加初始样式
        if (feature.id === 'speech-enable') {
            btn.classList.add('inactive');
        }
        
        // 绑定点击事件
        btn.addEventListener('click', () => {
            // 快捷键帮助按钮
            if (feature.id === 'keyboard-help' && keyboardHelpManager) {
                keyboardHelpManager.showKeyboardHelp();
            }
            // 语音启用按钮
            else if (feature.id === 'speech-enable' && speechManager) {
                speechManager.toggleEnabled();
            }
            // 鼠标悬停阅读按钮
            else if (feature.id === 'hover-read' && speechManager) {
                speechManager.toggleHoverRead();
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
        // 创建面板按钮
        const btn = document.createElement('button');
        btn.id = feature.button.id;
        btn.className = 'btn speech-panel-btn inactive';
        btn.textContent = feature.button.text;
        btn.title = feature.button.title;
        btn.setAttribute('aria-label', feature.button.ariaLabel);
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');
        
        // 创建配置面板
        const panelOverlay = document.createElement('div');
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
        
        // 按钮点击事件
        btn.addEventListener('click', () => {
            const isOpen = panelOverlay.style.display !== 'none';
            panelOverlay.style.display = isOpen ? 'none' : 'flex';
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });
        
        // 添加到导航栏和body
        this.navbar.appendChild(btn);
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
        // 创建面板按钮
        const btn = document.createElement('button');
        btn.id = feature.button.id;
        btn.className = 'btn mouse-style-btn inactive';
        btn.textContent = feature.button.text;
        btn.title = feature.button.title;
        btn.setAttribute('aria-label', feature.button.ariaLabel);
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');
        
        // 创建配置面板
        const panelOverlay = document.createElement('div');
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
        
        // 按钮点击事件
        btn.addEventListener('click', () => {
            const isOpen = panelOverlay.style.display !== 'none';
            panelOverlay.style.display = isOpen ? 'none' : 'flex';
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });
        
        // 添加到导航栏和body
        this.navbar.appendChild(btn);
        document.body.appendChild(panelOverlay);
    }

    renderButtonGroup(feature) {
        const group = document.createElement('div');
        group.className = 'button-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', feature.label);

        // 为缩放功能添加指示器
        if (feature.id === 'zoom-controls') {
            const indicator = document.createElement('span');
            indicator.id = 'zoom-indicator';
            indicator.className = 'zoom-indicator';
            indicator.textContent = '100%';
            indicator.setAttribute('aria-label', '当前缩放级别');
            group.appendChild(indicator);
        }

        feature.buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.id = button.id;
            btn.className = 'btn';
            btn.textContent = button.text;
            btn.title = button.title;
            btn.setAttribute('aria-label', button.ariaLabel);
            
            // 绑定点击事件
            btn.addEventListener('click', () => {
                if (zoomManager && zoomManager[button.action]) {
                    zoomManager[button.action]();
                }
            });

            group.appendChild(btn);
        });

        this.navbar.appendChild(group);
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

document.addEventListener('DOMContentLoaded', () => {
    // 初始化主题管理器
    themeManager = new ThemeManager();

    // 初始化缩放管理器
    zoomManager = new ZoomManager();

    // 初始化语音管理器
    speechManager = new SpeechManager();

    // 初始化行朗读管理器，传递speechManager以便使用朗读设置
    lineReaderManager = new LineReaderManager(speechManager);

    // 初始化快捷键帮助管理器
    keyboardHelpManager = new KeyboardHelpManager();

    // 渲染导航栏
    const navbarRenderer = new NavbarRenderer();
    navbarRenderer.render();

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
// 创建行朗读面板
// ============================================

function createLineReaderPanel() {
    // 创建浮动面板
    const floatingPanel = document.createElement('div');
    floatingPanel.id = 'line-reader-panel';
    floatingPanel.className = 'line-reader-panel';
    floatingPanel.style.display = 'none';
    
    const title = document.createElement('div');
    title.className = 'line-reader-title';
    title.textContent = '行朗读';
    floatingPanel.appendChild(title);
    
    // 上一行按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn line-reader-btn';
    prevBtn.textContent = '⬆️ 上一行';
    prevBtn.title = '朗读上一行';
    prevBtn.addEventListener('click', () => {
        if (lineReaderManager) {
            lineReaderManager.readPreviousLine();
        }
    });
    floatingPanel.appendChild(prevBtn);
    
    // 下一行按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn line-reader-btn';
    nextBtn.textContent = '⬇️ 下一行';
    nextBtn.title = '朗读下一行';
    nextBtn.addEventListener('click', () => {
        if (lineReaderManager) {
            lineReaderManager.readNextLine();
        }
    });
    floatingPanel.appendChild(nextBtn);
    
    document.body.appendChild(floatingPanel);
    
    // 保存面板引用到全局变量，方便其他函数访问
    window.lineReaderPanel = floatingPanel;
    
    // 监听语音启用/禁用事件，自动显示/隐藏面板
    if (speechManager && speechManager.toggleEnabled) {
        // 保存原始toggleEnabled方法
        const originalToggleEnabled = speechManager.toggleEnabled;
        
        // 重写toggleEnabled来同步面板显示
        speechManager.toggleEnabled = function() {
            originalToggleEnabled.call(this);
            // 语音启用时显示面板，禁用时隐藏
            if (window.lineReaderPanel) {
                window.lineReaderPanel.style.display = this.enabled ? 'flex' : 'none';
            }
        };
    }
    
    // 添加一个函数来手动切换面板显示
    window.toggleLineReaderPanel = function() {
        if (window.lineReaderPanel) {
            const isVisible = window.lineReaderPanel.style.display !== 'none';
            window.lineReaderPanel.style.display = isVisible ? 'none' : 'flex';
            return !isVisible;
        }
        return false;
    };
    
    // 初始显示检查：如果语音已启用，显示面板
    if (speechManager && speechManager.enabled && window.lineReaderPanel) {
        window.lineReaderPanel.style.display = 'flex';
    }
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

function toggleBigMouse(enabled) {
    bigMouseEnabled = enabled;
    
    if (enabled) {
        // 保存原始鼠标样式
        originalCursorStyle = document.body.style.cursor;
        
        // 设置大鼠标光标 - 使用更大的箭头形状SVG（64x64像素）
        document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'64\' height=\'64\' viewBox=\'0 0 64 64\'><path d=\'M4,4 L56,28 L32,32 L28,56 Z\' fill=\'%23000\' stroke=\'%23fff\' stroke-width=\'2\'/></svg>") 4 4, auto';
        
        console.log('大鼠标功能已启用');
    } else {
        // 恢复原始鼠标样式
        document.body.style.cursor = originalCursorStyle;
        
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
        
        // CSS 变量切换
        const cssVarChecked = DEBUG_CONFIG.disableCSSVariables ? '' : 'checked';
        html += `<label style="display: block; margin: 8px 0; cursor: pointer;">
            <input type="checkbox" id="debug-toggle-cssvars" ${cssVarChecked} />
            启用 CSS 变量（关闭后使用内联样式值）
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
            saveDebugConfig();
            console.log('[DEBUG] Web Speech API:', e.target.checked ? '已启用' : '已禁用');
        });
        
        document.getElementById('debug-toggle-cssvars').addEventListener('change', (e) => {
            DEBUG_CONFIG.disableCSSVariables = !e.target.checked;
            saveDebugConfig();
            console.log('[DEBUG] CSS 变量:', e.target.checked ? '已启用' : '已禁用');
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

