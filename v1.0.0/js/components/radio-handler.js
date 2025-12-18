// 设置单选框事件
export function setupRadioEvents() {
    // 获取DOM元素
    const threeDecimalRadio = document.getElementById('threeDecimal');
    const twoDecimalRadio = document.getElementById('twoDecimal');
    const timeMsInput = document.getElementById('timeMs');
    const svpLyricRadio = document.getElementById('svpLyric');
    const customLyricRadio = document.getElementById('customLyric');
    const lyricsTextarea = document.getElementById('lyrics');
    const lyricHint = document.getElementById('lyricHint');

    // 容错：关键元素不存在则终止
    if (!threeDecimalRadio || !twoDecimalRadio || !timeMsInput) return;

    // 1. 小数位数选择事件
    threeDecimalRadio.addEventListener('change', () => {
        timeMsInput.placeholder = '毫秒 (xxx)';
        timeMsInput.max = 999;
        if (timeMsInput.value === '00') timeMsInput.value = '000';
    });
    
    twoDecimalRadio.addEventListener('change', () => {
        timeMsInput.placeholder = '毫秒 (xx)';
        timeMsInput.max = 99;
        if (timeMsInput.value === '000') timeMsInput.value = '00';
    });

    // 2. 歌词类型选择事件
    if (svpLyricRadio && customLyricRadio && lyricsTextarea && lyricHint) {
        svpLyricRadio.addEventListener('change', () => {
            lyricsTextarea.style.display = 'none';
            lyricHint.textContent = '使用SVP内置歌词按字输出，每一个字一个时间戳';
        });
        
        customLyricRadio.addEventListener('change', () => {
            lyricsTextarea.style.display = 'block';
            lyricHint.textContent = '自定义歌词按行输出，每行对应若干音符，每行一个时间戳';
        });
    }
}

// 设置时间输入框事件（主逻辑移到ui-controller，保留导出兼容）
export function setupTimeInputEvents() {
    const timeMmInput = document.getElementById('timeMm');
    const timeSsInput = document.getElementById('timeSs');
    const timeMsInput = document.getElementById('timeMs');
    const { hideAllErrors } = require('../modules/ui-controller.js');
    
    // 容错：元素不存在则不绑定
    if (timeMmInput) timeMmInput.addEventListener('input', hideAllErrors);
    if (timeSsInput) timeSsInput.addEventListener('input', hideAllErrors);
    if (timeMsInput) timeMsInput.addEventListener('input', hideAllErrors);
}