import { cachedSvpData } from './file-handler.js';
import { hideAllErrors } from './ui-controller.js';
import { validateTimeInputs } from './validator.js';
import { timeInputsToSeconds, secondsToLrcTime, cleanText } from './utils.js';

// 设置生成按钮事件（备用，主逻辑移到ui-controller）
export function setupGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAndDownloadLrc);
    }
}

// 生成LRC内容（适配变速后的音符时间）
export function generateLrcContent(svpData, customLyricText, decimalCount) {
    const lrcLines = [];
    const { notes, firstNoteOnset, noteCount } = svpData;
    const decimalCountNum = Number(decimalCount);
    const customLyricRadio = document.getElementById('customLyric');

    if (customLyricRadio.checked) {
        const lyricLines = parseCustomLyrics(customLyricText);
        const baseTime = timeInputsToSeconds();
        let currentNoteIndex = 0;

        lyricLines.forEach((line) => {
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
        notes.forEach((note) => {
            const noteOffset = note.realStartTime - firstNoteOnset;
            const lineTime = baseTime + noteOffset;
            const lrcTime = secondsToLrcTime(lineTime, decimalCountNum);
            lrcLines.push(`${lrcTime}${note.lyric}`);
        });
    }

    return lrcLines.join('\n');
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

// 生成并下载LRC文件
export function generateAndDownloadLrc() {
    hideAllErrors();
    
    if (!cachedSvpData) {
        alert('请先上传并解析SVP文件！');
        const fileError = document.getElementById('fileError');
        if (fileError) fileError.style.display = 'block';
        return;
    }

    if (!validateTimeInputs()) {
        const timeError = document.getElementById('timeError');
        if (timeError) timeError.style.display = 'block';
        return;
    }

    const threeDecimalRadio = document.getElementById('threeDecimal');
    const lyricsTextarea = document.getElementById('lyrics');
    const uploadFileName = document.getElementById('uploadFileName');
    
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
        
    } catch (e) {
        alert(`生成LRC失败：${e.message}`);
        console.error('LRC生成错误：', e);
    }
}