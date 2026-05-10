document.addEventListener('DOMContentLoaded', async () => {
    // DOM要素の取得
    const timerTab = document.getElementById('timerTab');
    const scoreTab = document.getElementById('scoreTab');
    const historyTab = document.getElementById('historyTab');
    const timerSection = document.getElementById('timer-section');
    const scoreSection = document.getElementById('score-section');
    const historySection = document.getElementById('history-section');

    const startStopButton = document.getElementById('startStopButton');
    const exchangeButton = document.getElementById('exchangeButton');
    const resetButton = document.getElementById('resetButton');
    const scoreResetButton = document.getElementById('scoreResetButton');
    const saveScoreButton = document.getElementById('saveScoreButton');
    const downloadButton = document.getElementById('downloadButton');

    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const timeText = document.getElementById('time-text');
    const canvas = document.getElementById('timer-circle');
    const ctx = canvas.getContext('2d');
    const lapTimesList = document.getElementById('lap-times');

    const totalRunTimeDisplay = document.getElementById('total-run-time');
    const totalExchangeTimeDisplay = document.getElementById('total-exchange-time');
    const centisecondsDisplay = document.getElementById('centiseconds-display');

    const totalScoreDisplay = document.getElementById('total-score-value');
    const scoreHistoryList = document.getElementById('score-history-list');

    const missionsContainer = document.getElementById('missions-container');

    let missions = [];
    let savedScores = [];
    let isRunning = false;
    let timerInterval;
    let totalTime = 15000;
    let timeLeft = totalTime;
    let runCount = 0;
    let exchangeCount = 0;
    let lastLapTime = totalTime;
    let totalRunTime = 0;
    let totalExchangeTime = 0;
    let timerStartStamp = null;
    let timerLeftAtStart = null;

    // --- ミッションデータの読み込みとパース ---
    async function loadMissions() {
        try {
            const response = await fetch('missions.md');
            const text = await response.text();
            const parsedMissions = [];
            let currentMission = null;
            let currentOption = null;

            const lines = text.split('\n');
            lines.forEach((line, index) => {
                const h1Match = line.match(/^#\s+\[(.*?)\]\s+(.*)/);
                if (h1Match) {
                    currentMission = {
                        id: `m${parsedMissions.length}`,
                        ribbon: h1Match[1],
                        title: h1Match[2],
                        description: '',
                        options: []
                    };
                    parsedMissions.push(currentMission);
                    currentOption = null;
                    return;
                }

                const optionMatch = line.match(/^\-\s+option:\s*(.*)/);
                if (optionMatch) {
                    currentOption = {
                        label: optionMatch[1].trim(),
                        values: [],
                        defaultValue: null
                    };
                    currentMission.options.push(currentOption);
                    return;
                }

                const valueMatch = line.match(/^\s+\-\s+(.*?):\s*(.*)/);
                if (valueMatch && currentOption) {
                    const key = valueMatch[1].trim();
                    const val = valueMatch[2].trim();
                    if (key === 'default') {
                        currentOption.defaultValue = val;
                    } else {
                        currentOption.values.push({ label: key, points: parseInt(val, 10) });
                    }
                    return;
                }

                if (currentMission && !currentOption && line.trim() && !line.startsWith('#') && !line.startsWith('-')) {
                    currentMission.description += line.trim() + ' ';
                }
            });
            return parsedMissions;
        } catch (error) {
            console.error('Failed to load missions:', error);
            return [];
        }
    }

    // --- ミッションの描画 ---
    function renderMissions() {
        missionsContainer.innerHTML = '';
        missions.forEach((mission, mIndex) => {
            const missionEl = document.createElement('div');
            missionEl.className = 'score-item';
            missionEl.innerHTML = `
                <h3 class="mission-header">
                    <span class="ribbon">${mission.ribbon}</span>
                    <span class="mission-title">${mission.title}</span>
                </h3>
                ${mission.description ? `<p>${mission.description}</p>` : ''}
                <div class="mission-options"></div>
                <p>${mission.ribbon} 合計得点: <span id="${mission.id}-score" class="mission-total-score">0</span>点</p>
            `;

            const optionsContainer = missionEl.querySelector('.mission-options');
            mission.options.forEach((option, oIndex) => {
                const optionEl = document.createElement('div');
                optionEl.className = 'score-option';
                if (option.label) {
                    const labelEl = document.createElement('p');
                    labelEl.textContent = option.label;
                    optionEl.appendChild(labelEl);
                }

                const buttonGroup = document.createElement('div');
                buttonGroup.className = 'button-group';
                buttonGroup.dataset.missionId = mission.id;
                buttonGroup.dataset.optionIndex = oIndex;

                option.values.forEach(val => {
                    const btn = document.createElement('button');
                    btn.className = 'score-btn';
                    btn.dataset.value = val.points;
                    btn.dataset.label = val.label;
                    btn.textContent = val.label.includes('点') ? val.label : `${val.label}`;
                    
                    // Set default if specified
                    if (option.defaultValue === val.label || (!option.defaultValue && val.points === 0 && option.values.length > 1 && oIndex > 0)) {
                        // Special case: if no default and points 0, but usually we want the first or specific one.
                        // Actually, let's trust the 'default' key or just first one.
                    }
                    
                    buttonGroup.appendChild(btn);
                });

                optionEl.appendChild(buttonGroup);
                optionsContainer.appendChild(optionEl);
            });

            missionsContainer.appendChild(missionEl);
        });

        // Add event listeners to newly created buttons
        document.querySelectorAll('.score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const group = btn.closest('.button-group');
                group.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                calculateScore();
            });
        });
    }

    function resetScoreButtons() {
        missions.forEach(mission => {
            mission.options.forEach((option, oIndex) => {
                const group = document.querySelector(`.button-group[data-mission-id="${mission.id}"][data-option-index="${oIndex}"]`);
                if (!group) return;
                
                const buttons = group.querySelectorAll('.score-btn');
                buttons.forEach(b => b.classList.remove('selected'));
                
                let defaultBtn = null;
                if (option.defaultValue) {
                    defaultBtn = Array.from(buttons).find(b => b.dataset.label === option.defaultValue);
                }
                
                if (!defaultBtn) {
                    // Fallback: first button with 0 points, or just the first button
                    defaultBtn = Array.from(buttons).find(b => parseInt(b.dataset.value) === 0) || buttons[0];
                }
                
                if (defaultBtn) defaultBtn.classList.add('selected');
            });
        });
        calculateScore();
    }

    function calculateScore() {
        let totalScore = 0;
        missions.forEach(mission => {
            let missionScore = 0;
            mission.options.forEach((option, oIndex) => {
                const selectedBtn = document.querySelector(`.button-group[data-mission-id="${mission.id}"][data-option-index="${oIndex}"] .score-btn.selected`);
                if (selectedBtn) {
                    missionScore += parseInt(selectedBtn.dataset.value, 10);
                }
            });
            const scoreDisplay = document.getElementById(`${mission.id}-score`);
            if (scoreDisplay) scoreDisplay.textContent = missionScore;
            totalScore += missionScore;
        });
        totalScoreDisplay.textContent = totalScore;
    }

    // --- 初期化 ---
    missions = await loadMissions();
    renderMissions();
    resetScoreButtons();

    // --- タブ切り替え機能 ---
    timerTab.addEventListener('click', () => {
        timerTab.classList.add('active');
        scoreTab.classList.remove('active');
        historyTab.classList.remove('active');
        timerSection.classList.add('active');
        scoreSection.classList.remove('active');
        historySection.classList.remove('active');
    });

    scoreTab.addEventListener('click', () => {
        scoreTab.classList.add('active');
        timerTab.classList.remove('active');
        historyTab.classList.remove('active');
        scoreSection.classList.add('active');
        timerSection.classList.remove('active');
        historySection.classList.remove('active');
        calculateScore();
    });
    
    historyTab.addEventListener('click', () => {
        historyTab.classList.add('active');
        timerTab.classList.remove('active');
        scoreTab.classList.remove('active');
        historySection.classList.add('active');
        scoreSection.classList.remove('active');
        timerSection.classList.remove('active');
        updateHistoryList();
    });

    // --- タイマー機能 ---
    function updateInputs(cs) {
        const totalSec = Math.floor(cs / 100);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const centi = cs % 100;
        minutesInput.value = String(mins).padStart(2, '0');
        secondsInput.value = String(secs).padStart(2, '0');
        centisecondsDisplay.textContent = String(centi).padStart(2, '0');
    }

    function drawTimerCircle(progress) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 20;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentColor = '#3b82f6';
        if (progress > 0 && timeLeft <= 3000 && timeLeft > 0) {
            const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
            currentColor = blinkOn ? '#ef4444' : '#fca5a5';
        }
        timeText.style.color = currentColor;
        minutesInput.style.color = currentColor;
        secondsInput.style.color = currentColor;
        centisecondsDisplay.style.color = currentColor;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 18;
        ctx.stroke();

        if (progress > 0) {
            ctx.beginPath();
            const endAngle = -0.5 * Math.PI + (2 * Math.PI * progress);
            ctx.arc(centerX, centerY, radius, -0.5 * Math.PI, endAngle);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 18;
            ctx.lineCap = 'butt';
            ctx.shadowBlur = 15;
            ctx.shadowColor = currentColor;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    function updateTimer() {
        const elapsed = Date.now() - timerStartStamp;
        const elapsedCs = Math.floor(elapsed / 10);
        timeLeft = timerLeftAtStart - elapsedCs;
        if (timeLeft <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            isRunning = false;
            updateInputs(0);
            drawTimerCircle(0);
            alert('時間切れです！');
            startStopButton.textContent = 'スタート';
            startStopButton.disabled = false;
            exchangeButton.disabled = true;
            return;
        }
        const progress = timeLeft / totalTime;
        updateInputs(timeLeft);
        drawTimerCircle(progress);
    }

    function addLapTime(label, timeCs, isRun) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${label}</span><span>${(timeCs / 100).toFixed(2)}秒</span>`;
        if (isRun) li.classList.add('lap-run');
        else li.classList.add('lap-exchange');
        lapTimesList.prepend(li);
    }

    startStopButton.addEventListener('click', () => {
        if (!isRunning) {
            if (timeLeft === totalTime) {
                const minutes = parseInt(minutesInput.value, 10) || 0;
                const seconds = parseInt(secondsInput.value, 10) || 0;
                totalTime = (minutes * 60 + seconds) * 100;
                timeLeft = totalTime;
                lastLapTime = totalTime;
            }

            if (timeLeft > 0) {
                timerStartStamp = Date.now();
                timerLeftAtStart = timeLeft;
                timerInterval = setInterval(updateTimer, 10);
                isRunning = true;
                startStopButton.textContent = 'ストップ';
                exchangeButton.disabled = false;
            } else {
                alert('有効な時間を設定してください。');
            }
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            startStopButton.textContent = 'スタート';
        }
    });

    exchangeButton.addEventListener('click', () => {
        if (isRunning) {
            const timeDiff = lastLapTime - timeLeft;
            lastLapTime = timeLeft;
            
            if (exchangeButton.textContent === '交換') {
                runCount++;
                addLapTime(`${runCount} Run`, timeDiff, true);
                totalRunTime += timeDiff;
                totalRunTimeDisplay.textContent = (totalRunTime / 100).toFixed(2);
                exchangeButton.textContent = '走行';
            } else {
                exchangeCount++;
                addLapTime(`交換 ${exchangeCount}回目`, timeDiff, false);
                totalExchangeTime += timeDiff;
                totalExchangeTimeDisplay.textContent = (totalExchangeTime / 100).toFixed(2);
                exchangeButton.textContent = '交換';
            }
        }
    });

    resetButton.addEventListener('click', () => {
        clearInterval(timerInterval);
        isRunning = false;
        totalTime = 15000;
        timeLeft = totalTime;
        runCount = 0;
        exchangeCount = 0;
        lastLapTime = 15000;
        totalRunTime = 0;
        totalExchangeTime = 0;
        updateInputs(timeLeft);
        drawTimerCircle(1);
        startStopButton.textContent = 'スタート';
        startStopButton.disabled = false;
        exchangeButton.disabled = true;
        exchangeButton.textContent = '交換';
        lapTimesList.innerHTML = '';
        totalRunTimeDisplay.textContent = '0.00';
        totalExchangeTimeDisplay.textContent = '0.00';
        resetScoreButtons();
    });

    scoreResetButton.addEventListener('click', () => {
        resetScoreButtons();
    });

    saveScoreButton.addEventListener('click', () => {
        const scoreData = {
            '保存日時': new Date().toLocaleString(),
            '合計得点': totalScoreDisplay.textContent
        };
        missions.forEach(mission => {
            const label = `${mission.ribbon} ${mission.title}`;
            const scoreSpan = document.getElementById(`${mission.id}-score`);
            scoreData[label] = scoreSpan ? scoreSpan.textContent : '0';
        });

        savedScores.push(scoreData);
        updateHistoryList();
    });
    
    downloadButton.addEventListener('click', () => {
        if (savedScores.length === 0) {
            alert('ダウンロードする履歴がありません。');
            return;
        }

        let csvContent = '\uFEFF';
        const headers = ['ミッション名'].concat(savedScores.map((_, index) => `記録 ${index + 1}`));
        csvContent += headers.join(',') + '\n';
        
        const missionLabels = missions.map(m => `${m.ribbon} ${m.title}`);
        const allLabels = ['合計得点', '保存日時'].concat(missionLabels);
        allLabels.forEach(label => {
            const row = savedScores.map(score => score[label] ? `"${score[label]}"` : '0');
            csvContent += `"${label}",` + row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `FLL_scores_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    });

    function updateHistoryList() {
        scoreHistoryList.innerHTML = '';
        if (savedScores.length === 0) return;

        const missionLabels = missions.map(m => `${m.ribbon} ${m.title}`);
        const missionHeaders = ['合計得点', '保存日時'].concat(missionLabels);
        
        const headerRow = document.createElement('li');
        headerRow.classList.add('history-table-row', 'history-table-header');
        
        let headerHtml = `<div class="history-table-cell">ミッション名</div>`;
        savedScores.forEach((_, index) => {
            headerHtml += `<div class="history-table-cell">記録 ${index + 1}</div>`;
        });
        headerRow.innerHTML = headerHtml;
        scoreHistoryList.appendChild(headerRow);

        missionHeaders.forEach(mission => {
            const row = document.createElement('li');
            row.classList.add('history-table-row');
            
            let rowHtml = `<div class="history-table-cell">${mission}</div>`;
            savedScores.forEach(score => {
                const value = score[mission] || '0';
                rowHtml += `<div class="history-table-cell">${value}</div>`;
            });
            row.innerHTML = rowHtml;
            scoreHistoryList.appendChild(row);
        });
    }

    updateInputs(timeLeft);
    drawTimerCircle(1);
});