// 获取DOM元素
const svpFileInput = document.getElementById('svpFile');
const fileUploadArea = document.getElementById('fileUploadArea');
const uploadHintText = document.getElementById('uploadHintText');
const uploadFileName = document.getElementById('uploadFileName');
const timeMmInput = document.getElementById('timeMm');
const timeSsInput = document.getElementById('timeSs');
const timeMsInput = document.getElementById('timeMs');
const lyricsTextarea = document.getElementById('lyrics');
const generateBtn = document.getElementById('generateBtn');
const fileError = document.getElementById('fileError');
const timeError = document.getElementById('timeError');
const svpInfoContent = document.getElementById('svpInfoContent');
const lyricHint = document.getElementById('lyricHint');

// 小数位数选择器
const threeDecimalRadio = document.getElementById('threeDecimal');
const twoDecimalRadio = document.getElementById('twoDecimal');
// 歌词类型选择器
const customLyricRadio = document.getElementById('customLyric');
const svpLyricRadio = document.getElementById('svpLyric');

// 【核心常量】
const UNIT_PER_BEAT = 705600000; // SVP时间单位（每拍的单位数）
const DEFAULT_BPM = 120;         // 默认BPM（无tempo时使用）

// 存储已解析的SVP数据（包含变速信息）
let cachedSvpData = null;

// 初始化页面
function initPage() {
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
    svpLyricRadio.addEventListener('change', () => {
        lyricsTextarea.style.display = 'none';
        lyricHint.textContent = '使用SVP内置歌词按字输出，每一个字一个时间戳';
    });
    customLyricRadio.addEventListener('change', () => {
        lyricsTextarea.style.display = 'block';
        lyricHint.textContent = '自定义歌词按行输出，每行对应若干音符，每行一个时间戳';
    });

    // 3. 文件上传相关事件
    fileUploadArea.addEventListener('click', () => {
        svpFileInput.click();
    });
    svpFileInput.addEventListener('change', handleFileSelect);
    initDropAreaEvents();
}

// 初始化拖放事件
function initDropAreaEvents() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove('drag-over');
        }, false);
    });

    fileUploadArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// 核心文件处理
function handleFiles(files) {
    hideAllErrors();
    const file = files[0];

    if (!validateSvpFile(file)) {
        fileError.style.display = 'block';
        resetUploadArea();
        cachedSvpData = null;
        return;
    }

    // 更新上传区域显示
    uploadHintText.textContent = '已选择文件：';
    uploadFileName.textContent = file.name;

    // 读取并解析文件
    const reader = new FileReader();
    reader.onload = function(e) {
        const svpText = e.target.result;
        const svpInfo = extractSvpInfo(svpText);
        renderSvpInfo(svpInfo);
        const svpData = parseSvpContent(svpText);
        cachedSvpData = svpData;
    };

    reader.readAsText(file, 'UTF-8');
}

function resetUploadArea() {
    uploadHintText.textContent = '点击选择或拖放SVP文件到此处';
    uploadFileName.textContent = '';
}

function hideAllErrors() {
    fileError.style.display = 'none';
    timeError.style.display = 'none';
}

function cleanText(text) {
    text = text.replace(/^\uFEFF/, '');
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return text;
}

// 【核心新增】解析BPM区间（处理变速）
// 输入：tempo数组（[{position:0, bpm:120}, {position:2822400000, bpm:240}]）
// 输出：排序后的BPM区间列表（[{start:0, end:2822400000, bpm:120}, {start:2822400000, end:Infinity, bpm:240}]）
function parseBpmIntervals(tempoArray) {
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
function calculateRealTime(onset, bpmIntervals) {
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

// 提取SVP基础信息（含变速提示）
function extractSvpInfo(svpText) {
    const cleanedText = cleanText(svpText);
    const info = {
        bpmInfo: '未知', // 显示变速信息
        meter: '未知',
        noteCount: 0,
        totalDuration: 0,
        voiceDatabase: '未知',
        sampleRate: '未知',
        error: ''
    };

    try {
        const svpJson = JSON.parse(cleanedText);
        const timeData = svpJson.time || {};

        // 1. 解析BPM信息（显示变速提示）
        const tempoArray = timeData.tempo || [];
        const bpmIntervals = parseBpmIntervals(tempoArray);
        if (bpmIntervals.length === 1) {
            info.bpmInfo = `${bpmIntervals[0].bpm} BPM（匀速）`;
        } else {
            // 显示变速节点
            const bpmNodes = bpmIntervals.map(interval => 
                `${interval.bpm} BPM（位置：${interval.start}）`
            ).join(' → ');
            info.bpmInfo = `变速：${bpmNodes}`;
        }

        // 2. 解析拍号
        if (timeData.meter && timeData.meter.length > 0) {
            const meter = timeData.meter[0];
            info.meter = `${meter.numerator}/${meter.denominator}`;
        }

        // 3. 解析音符信息
        if (svpJson.tracks && svpJson.tracks.length > 0) {
            const firstTrack = svpJson.tracks[0];
            const notes = firstTrack.mainGroup?.notes || [];
            
            if (Array.isArray(notes) && notes.length > 0) {
                const validNotes = filterValidNotes(notes);
                info.noteCount = validNotes.length;

                // 计算总时长（取最后一个音符的时间）
                if (validNotes.length > 0) {
                    const lastNote = validNotes[validNotes.length - 1];
                    const lastNoteOnset = lastNote.onset || 0;
                    const lastNoteDuration = lastNote.duration || 0;
                    const totalOnset = lastNoteOnset + lastNoteDuration;
                    const totalSeconds = calculateRealTime(totalOnset, bpmIntervals);
                    
                    // 格式化总时长
                    const decimalCount = threeDecimalRadio.checked ? 3 : 2;
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = (totalSeconds % 60).toFixed(decimalCount);
                    info.totalDuration = `${minutes}分${seconds}秒`;
                }
            } else {
                info.error = '未在mainGroup下找到notes数组';
            }
        } else {
            info.error = '未找到tracks数组';
        }

        // 4. 提取音色库和采样率
        if (svpJson.tracks?.[0]?.mainRef?.database?.name) {
            info.voiceDatabase = svpJson.tracks[0].mainRef.database.name;
        }
        if (svpJson.renderConfig?.sampleRate) {
            info.sampleRate = `${svpJson.renderConfig.sampleRate} Hz`;
        }

    } catch (e) {
        console.error('提取SVP信息失败：', e);
        info.error = `解析失败：${e.message}`;
    }

    return info;
}

// 渲染SVP解析信息（显示变速）
function renderSvpInfo(info) {
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

// 验证文件格式
function validateSvpFile(file) {
    if (!file) return false;
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    return fileExt === '.svp';
}

// 解析SVP文件（核心：处理变速的音符时间）
function parseSvpContent(svpText) {
    const cleanedText = cleanText(svpText);
    try {
        const svpJson = JSON.parse(cleanedText);
        const timeData = svpJson.time || {};

        // 1. 解析BPM区间（处理变速）
        const tempoArray = timeData.tempo || [];
        const bpmIntervals = parseBpmIntervals(tempoArray);

        // 2. 解析拍号
        let meter = '4/4';
        if (timeData.meter && timeData.meter.length > 0) {
            const meterData = timeData.meter[0];
            meter = `${meterData.numerator}/${meterData.denominator}`;
        }

        // 3. 解析音符
        if (!svpJson.tracks || svpJson.tracks.length === 0) {
            throw new Error('未找到音轨（tracks）数据');
        }
        const firstTrack = svpJson.tracks[0];
        const rawNotes = firstTrack.mainGroup?.notes || [];
        
        if (rawNotes.length === 0) {
            throw new Error('音轨的mainGroup中未找到音符（notes）数据');
        }

        const validNotes = filterValidNotes(rawNotes);
        if (validNotes.length === 0) {
            throw new Error('未找到有效音符（已过滤br/-/+）');
        }

        // 4. 为每个音符计算正确的时间（适配变速）
        const notesWithRealTime = validNotes.map(note => {
            const onset = note.onset || 0;
            // 关键：使用对应区间的BPM计算时间
            const realStartTime = calculateRealTime(onset, bpmIntervals);
            return {
                onsetUnit: onset,
                realStartTime: realStartTime,
                lyric: note.lyrics.trim(),
                duration: note.duration || 0
            };
        });

        return {
            bpmIntervals: bpmIntervals, // 保存BPM区间，备用
            meter: meter,
            notes: notesWithRealTime,
            firstNoteOnset: notesWithRealTime[0].realStartTime,
            noteCount: notesWithRealTime.length
        };

    } catch (e) {
        let errorMsg = `解析SVP失败：${e.message}`;
        if (e.message.includes('position')) {
            const posMatch = e.message.match(/position (\d+)/);
            if (posMatch) {
                const pos = Number(posMatch[1]);
                const contextStart = Math.max(0, pos - 50);
                const contextEnd = Math.min(cleanedText.length, pos + 50);
                const errorContext = cleanedText.substring(contextStart, contextEnd);
                errorMsg += `\n错误位置：第${pos}个字符\n上下文：${errorContext}`;
            }
        }
        alert(errorMsg);
        console.error('SVP解析错误：', e);
        return null;
    }
}

// 筛选有效音符
function filterValidNotes(notes) {
    return notes
        .filter(note => note.musicalType === 'singing' && note.lyrics?.trim())
        .filter(note => !['br', '-', '+'].includes(note.lyrics.trim().toLowerCase()));
}

// 验证时间输入
function validateTimeInputs() {
    const mm = Number(timeMmInput.value || 0);
    const ss = Number(timeSsInput.value || 0);
    const ms = Number(timeMsInput.value || 0);
    const decimalCount = threeDecimalRadio.checked ? 3 : 2;

    if (mm < 0 || mm > 59 || ss < 0 || ss > 59) return false;
    if (decimalCount === 3 && (ms < 0 || ms > 999)) return false;
    if (decimalCount === 2 && (ms < 0 || ms > 99)) return false;

    return true;
}

// 转换时间为秒
function timeInputsToSeconds() {
    const mm = Number(timeMmInput.value || 0);
    const ss = Number(timeSsInput.value || 0);
    const ms = Number(timeMsInput.value || 0);
    const decimalCount = threeDecimalRadio.checked ? 3 : 2;
    
    const msDivisor = decimalCount === 3 ? 1000 : 100;
    return mm * 60 + ss + ms / msDivisor;
}

// 转换为LRC时间格式
function secondsToLrcTime(seconds, decimalCount) {
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

// 解析自定义歌词
function parseCustomLyrics(lyricText) {
    const cleanedText = cleanText(lyricText);
    const lineList = cleanedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lineList.length === 0) {
        throw new Error('自定义歌词不能为空，请输入有效歌词');
    }
    return lineList;
}

// 生成LRC内容（适配变速后的音符时间）
function generateLrcContent(svpData, customLyricText, decimalCount) {
    const lrcLines = [];
    const { notes, firstNoteOnset, noteCount } = svpData;
    const decimalCountNum = Number(decimalCount);

    if (customLyricRadio.checked) {
        const lyricLines = parseCustomLyrics(customLyricText);
        const baseTime = timeInputsToSeconds();
        let currentNoteIndex = 0;

        lyricLines.forEach((line, lineIndex) => {
            const lineCharCount = Array.from(line).length;
            const lineStartNoteIndex = Math.min(currentNoteIndex, noteCount - 1);
            const currentNote = notes[lineStartNoteIndex];
            
            // 关键：使用变速后计算的真实时间
            const noteOffset = currentNote.realStartTime - firstNoteOnset;
            const lineTime = baseTime + noteOffset;

            const lrcTime = secondsToLrcTime(lineTime, decimalCountNum);
            lrcLines.push(`${lrcTime}${line}`);
            currentNoteIndex += lineCharCount;
        });

    } else {
        const baseTime = timeInputsToSeconds();
        notes.forEach((note, noteIndex) => {
            const noteOffset = note.realStartTime - firstNoteOnset;
            const lineTime = baseTime + noteOffset;
            const lrcTime = secondsToLrcTime(lineTime, decimalCountNum);
            lrcLines.push(`${lrcTime}${note.lyric}`);
        });
    }

    return lrcLines.join('\n');
}

// 生成并下载LRC
function generateAndDownloadLrc() {
    hideAllErrors();
    
    if (!cachedSvpData) {
        alert('请先上传并解析SVP文件！');
        fileError.style.display = 'block';
        return;
    }

    if (!validateTimeInputs()) {
        timeError.style.display = 'block';
        return;
    }

    const decimalCount = threeDecimalRadio.checked ? 3 : 2;
    const customLyricText = lyricsTextarea.value || '';

    try {
        const lrcContent = generateLrcContent(cachedSvpData, customLyricText, decimalCount);
        const originalFileName = uploadFileName.textContent || 'output';
        const lrcFileName = originalFileName.replace(/\.svp$/i, '.lrc');

        const lrcBlob = new Blob([lrcContent], { type: 'text/plain; charset=utf-8' });
        const downloadLink = document.createElement('a');
        downloadLink.download = lrcFileName;
        downloadLink.href = URL.createObjectURL(lrcBlob);
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
        
        //alert('LRC文件生成并下载成功！');
    } catch (e) {
        alert(`生成LRC失败：${e.message}`);
        console.error('LRC生成错误：', e);
    }
}

// 初始化
window.onload = function() {
    initPage();
    generateBtn.addEventListener('click', generateAndDownloadLrc);
    timeMmInput.addEventListener('input', hideAllErrors);
    timeSsInput.addEventListener('input', hideAllErrors);
    timeMsInput.addEventListener('input', hideAllErrors);
};