import { 
    cleanText, 
    parseBpmIntervals, 
    calculateRealTime, 
    DEFAULT_BPM, 
    filterValidNotes 
} from './utils.js';
import { renderSvpInfo, resetUploadArea, hideAllErrors } from './ui-controller.js';

// 获取DOM元素
export let svpFileInput, fileUploadArea, uploadHintText, uploadFileName, fileError;

// 存储已解析的SVP数据（包含变速信息）
export let cachedSvpData = null;

// 初始化文件上传元素
export function initFileElements() {
    svpFileInput = document.getElementById('svpFile');
    fileUploadArea = document.getElementById('fileUploadArea');
    uploadHintText = document.getElementById('uploadHintText');
    uploadFileName = document.getElementById('uploadFileName');
    fileError = document.getElementById('fileError');
}

// 处理文件选择（点击/拖放）
export function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// 处理拖放文件
export function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// 核心文件处理逻辑
export function handleFiles(files) {
    hideAllErrors();
    const file = files[0];

    // 验证文件格式
    if (!validateSvpFile(file)) {
        fileError.style.display = 'block';
        resetUploadArea(); // 重置上传区域显示
        cachedSvpData = null;
        return;
    }

    // 更新上传区域显示文件名
    uploadHintText.textContent = '已选择文件：';
    uploadFileName.textContent = file.name;

    // 读取文件并立即解析
    const reader = new FileReader();
    reader.onload = function(e) {
        const svpText = e.target.result;
        
        // 提取并展示解析信息（含变速BPM）
        const svpInfo = extractSvpInfo(svpText);
        renderSvpInfo(svpInfo);

        // 解析音符数据并缓存（含变速信息）
        const svpData = parseSvpContent(svpText);
        cachedSvpData = svpData;
    };

    reader.readAsText(file, 'UTF-8');
}

// 提取SVP基础信息（含变速提示）
export function extractSvpInfo(svpText) {
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
                    const threeDecimalRadio = document.getElementById('threeDecimal');
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

// 解析SVP文件（核心：处理变速的音符时间）
export function parseSvpContent(svpText) {
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

// 验证文件是否为.svp格式
export function validateSvpFile(file) {
    if (!file) return false;
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    return fileExt === '.svp';
}