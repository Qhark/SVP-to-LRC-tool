import { initPage } from './modules/ui-controller.js';

// 初始化页面（等待组件加载完成后执行）
window.onload = async function() {
    try {
        // 先加载所有组件（等待异步完成）
        await loadComponents();
        
        // 组件加载完成后，初始化页面
        initPage();
        
        console.log('页面初始化完成，所有组件已加载');
    } catch (error) {
        console.error('加载组件失败:', error);
        alert('页面加载失败，请刷新重试');
    }
};

// 加载HTML组件
async function loadComponents() {
    try {
        // 加载文件上传组件
        const fileUploadContainer = document.getElementById('fileUploadContainer');
        const fileUploadHtml = await fetch('components/file-upload.html').then(res => res.text());
        fileUploadContainer.innerHTML = fileUploadHtml;
        
        // 加载时间偏移组件
        const timeOffsetContainer = document.getElementById('timeOffsetContainer');
        const timeOffsetHtml = await fetch('components/time-offset.html').then(res => res.text());
        timeOffsetContainer.innerHTML = timeOffsetHtml;
        
        // 加载歌词选择组件
        const lyricSelectionContainer = document.getElementById('lyricSelectionContainer');
        const lyricSelectionHtml = await fetch('components/lyric-selection.html').then(res => res.text());
        lyricSelectionContainer.innerHTML = lyricSelectionHtml;
        
        // 加载SVP信息展示组件
        const svpInfoContainer = document.getElementById('svpInfoContainer');
        const svpInfoHtml = await fetch('components/svp-info-display.html').then(res => res.text());
        svpInfoContainer.innerHTML = svpInfoHtml;
    } catch (error) {
        throw new Error(`组件加载失败: ${error.message}`);
    }
}