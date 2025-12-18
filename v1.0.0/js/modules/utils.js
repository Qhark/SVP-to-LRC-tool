// 【核心常量】SVP时间转换
export const UNIT_PER_BEAT = 705600000;
export const DEFAULT_BPM = 120;

// 清洗文本
export function cleanText(text) {
    text = text.replace(/^\uFEFF/, '');
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return text;
}

// 【核心新增】解析BPM区间（处理变速）
// 输入：tempo数组（[{position:0, bpm:120}, {position:2822400000, bpm:240}]）
// 输出：排序后的BPM区间列表（[{start:0, end:2822400000, bpm:120}, {start:2822400000, end:Infinity, bpm:240}]）
export function parseBpmIntervals(tempoArray) {
    if (!Array.isArray(tempoArray) || tempoArray.length === 0) {
        // 无BPM信息，返回默认区间
        return [{ start: 0, end: Infinity, bpm: DEFAULT_BPM }];
    }

    // 1. 按position升序排序
    const sortedTempo = [...tempoArray].sort((a, b) => a.position - b.position);
    // 2. 生成区间列表
    const intervals = [];
    for (let i = 0; i < sortedTempo.length; i++) {
        const current = sortedTempo[i];
        const next = sortedTempo[i + 1];
        intervals.push({
            start: current.position,
            end: next ? next.position : Infinity, // 最后一个区间到无限大
            bpm: current.bpm || DEFAULT_BPM
        });
    }
    return intervals;
}

// 【核心修改】计算变速场景下的真实时间（秒）
// 参数：
// - onset: 音符的起始位置（SVP单位）
// - bpmIntervals: 解析后的BPM区间列表
// 返回：该位置对应的真实时间（秒）
export function calculateRealTime(onset, bpmIntervals) {
    let remainingOnset = onset;
    let totalSeconds = 0;

    // 遍历每个BPM区间，分段计算时间
    for (const interval of bpmIntervals) {
        if (remainingOnset <= 0) break;

        // 计算当前区间内的有效长度
        const intervalLength = interval.end - interval.start;
        const currentOnsetInInterval = Math.min(remainingOnset, intervalLength);

        if (currentOnsetInInterval > 0) {
            // 计算当前区间的时间：(位置 / 每拍单位数) * (60秒 / BPM)
            const beats = currentOnsetInInterval / UNIT_PER_BEAT;
            const seconds = beats * (60 / interval.bpm);
            totalSeconds += seconds;
        }

        // 剩余未计算的位置
        remainingOnset -= currentOnsetInInterval;
    }

    return parseFloat(totalSeconds.toFixed(6)); // 保留6位小数，避免精度问题
}

// 将mm/ss/ms转换为总秒数
export function timeInputsToSeconds() {
    const timeMmInput = document.getElementById('timeMm');
    const timeSsInput = document.getElementById('timeSs');
    const timeMsInput = document.getElementById('timeMs');
    const threeDecimalRadio = document.getElementById('threeDecimal');
    
    const mm = Number(timeMmInput.value || 0);
    const ss = Number(timeSsInput.value || 0);
    const ms = Number(timeMsInput.value || 0);
    const decimalCount = threeDecimalRadio.checked ? 3 : 2;
    
    const msDivisor = decimalCount === 3 ? 1000 : 100;
    return mm * 60 + ss + ms / msDivisor;
}

// 时间转换为LRC格式
export function secondsToLrcTime(seconds, decimalCount) {
    const totalSeconds = Math.max(0, seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds - minutes * 60;
    
    const mm = String(minutes).padStart(2, '0');
    const ssInt = Math.floor(secs);
    const ssIntStr = String(ssInt).padStart(2, '0');

    if (decimalCount === 3) {
        const ssDec = Math.round((secs - ssInt) * 1000);
        const ssDecStr = String(ssDec).padStart(3, '0').slice(0, 3);
        return `[${mm}:${ssIntStr}.${ssDecStr}]`;
    } else {
        const ssDec = Math.round((secs - ssInt) * 100);
        const ssDecStr = String(ssDec).padStart(2, '0').slice(0, 2);
        return `[${mm}:${ssIntStr}.${ssDecStr}]`;
    }
}

// 筛选有效音符
export function filterValidNotes(notes) {
    return notes
        .filter(note => note.musicalType === 'singing' && note.lyrics?.trim())
        .filter(note => !['br', '-', '+'].includes(note.lyrics.trim().toLowerCase()));
}