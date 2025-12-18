import { handleDrop } from '../modules/file-handler.js';

// 初始化拖放区域事件
export function setupDropAreaEvents() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    
    // 阻止默认拖放行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // 拖入时添加高亮class
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add('drag-over');
        }, false);
    });

    // 拖离/放下时移除高亮class
    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove('drag-over');
        }, false);
    });

    // 处理文件拖放
    fileUploadArea.addEventListener('drop', handleDrop, false);
}

// 阻止默认拖放行为
export function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}