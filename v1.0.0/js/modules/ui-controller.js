import { initFileElements, handleFileSelect } from '../modules/file-handler.js';
import { setupRadioEvents } from '../components/radio-handler.js';
import { setupDropAreaEvents } from '../components/drop-area.js';

// 获取DOM元素
export let lyricsTextarea, svpInfoContent, lyricHint, timeError, generateBtn;

// 初始化页面
export function initPage() {
    // 初始化所有DOM元素
    initElements();
    
    // 初始化文件上传元素
    initFileElements();
    
    // 设置单选框事件
    setupRadioEvents();
    
    // 设置拖放区域事件
    setupDropAreaEvents();
    
    // 点击上传区域触发文件选择
    const fileUploadArea = document.getElementById('fileUploadArea');
    const svpFileInput = document.getElementById('svpFile');
    if (fileUploadArea && svpFileInput) {
        fileUploadArea.addEventListener('click', () => {
            svpFileInput.click();
        });
        
        // 原生文件选择事件
        svpFileInput.addEventListener('change', handleFileSelect);
    }

    // 绑定时间输入框的错误隐藏事件
    const timeMmInput = document.getElementById('timeMm');
    const timeSsInput = document.getElementById('timeSs');
    const timeMsInput = document.getElementById('timeMs');
    if (timeMmInput) timeMmInput.addEventListener('input', hideAllErrors);
    if (timeSsInput) timeSsInput.addEventListener('input', hideAllErrors);
    if (timeMsInput) timeMsInput.addEventListener('input', hideAllErrors);

    // 绑定生成按钮事件
    if (generateBtn) {
        import('../modules/lrc-generator.js').then((module) => {
            generateBtn.addEventListener('click', module.generateAndDownloadLrc);
        });
    }
}

// 初始化DOM元素
export function initElements() {
    lyricsTextarea = document.getElementById('lyrics') || null;
    svpInfoContent = document.getElementById('svpInfoContent') || null;
    lyricHint = document.getElementById('lyricHint') || null;
    timeError = document.getElementById('timeError') || null;
    generateBtn = document.getElementById('generateBtn') || null;
}

// 重置上传区域显示
export function resetUploadArea() {
    const uploadHintText = document.getElementById('uploadHintText');
    const uploadFileName = document.getElementById('uploadFileName');
    
    if (uploadHintText) uploadHintText.textContent = '点击选择或拖放SVP文件到此处';
    if (uploadFileName) uploadFileName.textContent = '';
}

// 隐藏所有错误提示
export function hideAllErrors() {
    const fileError = document.getElementById('fileError');
    
    if (fileError) fileError.style.display = 'none';
    if (timeError) timeError.style.display = 'none';
}

// 渲染SVP解析信息（显示变速）
export function renderSvpInfo(info) {
    if (!svpInfoContent) return; // 容错
    
    if (info.error) {
        svpInfoContent.innerHTML = `<div class="info-item" style="color: #f44336;">${info.error}</div>`;
        return;
    }

    svpInfoContent.innerHTML = `
        <div class="info-item">
            <span class="info-label">BPM信息：</span>
            <span class="info-value">${info.bpmInfo}</span>
        </div>
        <div class="info-item">
            <span class="info-label">拍号：</span>
            <span class="info-value">${info.meter}</span>
        </div>
        <div class="info-item">
            <span class="info-label">有效音符数：</span>
            <span class="info-value">${info.noteCount} 个</span>
        </div>
        <div class="info-item">
            <span class="info-label">总时长：</span>
            <span class="info-value">${info.totalDuration}</span>
        </div>
        <div class="info-item">
            <span class="info-label">音色库：</span>
            <span class="info-value">${info.voiceDatabase}</span>
        </div>
        <div class="info-item">
            <span class="info-label">采样率：</span>
            <span class="info-value">${info.sampleRate}</span>
        </div>
    `;
}