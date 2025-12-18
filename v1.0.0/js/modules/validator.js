// 验证时间输入框
export function validateTimeInputs() {
    const timeMmInput = document.getElementById('timeMm');
    const timeSsInput = document.getElementById('timeSs');
    const timeMsInput = document.getElementById('timeMs');
    const threeDecimalRadio = document.getElementById('threeDecimal');
    const twoDecimalRadio = document.getElementById('twoDecimal');
    
    const mm = Number(timeMmInput.value || 0);
    const ss = Number(timeSsInput.value || 0);
    const ms = Number(timeMsInput.value || 0);
    const decimalCount = threeDecimalRadio.checked ? 3 : 2;

    if (mm < 0 || mm > 59 || ss < 0 || ss > 59) return false;
    if (decimalCount === 3 && (ms < 0 || ms > 999)) return false;
    if (decimalCount === 2 && (ms < 0 || ms > 99)) return false;

    return true;
}

// 解析自定义歌词
export function parseCustomLyrics(lyricText) {
    import('./utils.js').then((module) => {
        const cleanedText = module.cleanText(lyricText);
        const lineList = cleanedText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lineList.length === 0) {
            throw new Error('自定义歌词不能为空，请输入有效歌词');
        }
        return lineList;
    });
}