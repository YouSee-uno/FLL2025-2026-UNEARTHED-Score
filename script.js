document.addEventListener('DOMContentLoaded', async () => {
    // DOM要素の取得
    const timerTab = document.getElementById('timerTab');
    const cameraTab = document.getElementById('cameraTab');
    const scoreTab = document.getElementById('scoreTab');
    const historyTab = document.getElementById('historyTab');
    const timerSection = document.getElementById('timer-section');
    const cameraSection = document.getElementById('camera-section');
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
    let stopwatchSegments = [];
    let timerStartStamp = null;
    let timerLeftAtStart = null;

    // ======================================
    // ヘッダー アコーディオン切り替え
    // ======================================
    const headerElement    = document.querySelector('header');
    const mainElement      = document.querySelector('main');
    const headerToggleBtn  = document.getElementById('headerToggleBtn');

    // 動的にヘッダーの高さをCSS変数にセットする関数
    function updateHeaderHeightProperty() {
        if (headerElement) {
            const h = headerElement.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${h}px`);
        }
    }
    
    // 初期セットおよびリサイズ時の追従
    updateHeaderHeightProperty();
    window.addEventListener('resize', updateHeaderHeightProperty);

    headerToggleBtn.addEventListener('click', () => {
        const isCollapsed = headerElement.classList.contains('collapsed');
        if (isCollapsed) {
            // ヘッダーを展開
            headerElement.classList.remove('collapsed');
            mainElement.style.marginTop = '0px';
            document.body.classList.remove('header-collapsed-mode');
        } else {
            // ヘッダーを折りたたみ (GPUアクセラレーションのtranslateYを使用)
            const h = headerElement.offsetHeight;
            headerElement.classList.add('collapsed');
            mainElement.style.marginTop = `-${h}px`;
            document.body.classList.add('header-collapsed-mode');
        }
        
        // 高さが切り替わったため、カメラセクションが表示中の場合は向き検知等を再確認
        if (typeof checkOrientation === 'function') {
            setTimeout(checkOrientation, 350);
        }
    });

    // --- ミッションデータの読み込みとパース ---
    async function loadMissions() {
        let text = '';
        try {
            // サーバー実行時は missions.md を直接読み込む（キャッシュ回避のためタイムスタンプを付与）
            const response = await fetch('missions.md?t=' + Date.now());
            if (response.ok) {
                text = await response.text();
                console.log('Loaded missions from missions.md');
            } else {
                throw new Error('Fetch failed');
            }
        } catch (error) {
            console.warn('Falling back to embedded mission data:', error);
            // ローカル（file://）実行時のCORSエラーを回避するため、データを直接埋め込みます
            text = `# [ボーナス] 大きさ点検ボーナス
全てのロボットと装備が30.5cm以内に収まった
- option:
  - Yes: 20
  - No: 0
  - default: Yes

# [トークン] 精密トークン
個数:
- option:
  - 6: 50
  - 5: 50
  - 4: 35
  - 3: 25
  - 2: 15
  - 1: 10
  - 0: 0
  - default: 6

# [M01] 表面清掃 ★
- option: 土層が完全に取り除かれ、マットに接触している
  - 0点: 0
  - 10点: 10
  - 20点: 20
- option: 考古学者の発掘ブラシが発掘現場に接触していない
  - 0点: 0
  - 10点: 10

# [M02] 地図の露出
表土のセクションが完全に取り除かれている:
- option:
  - 0点: 0
  - 10点: 10
  - 20点: 20
  - 30点: 30

# [M03] 鉱抗の探査
- option: 自チームのトロッコが相手チームのフィールド上にある:
  - 0点: 0
  - 30点: 30
- option: 相手チームのトロッコが自チームのフィールド上にある:
  - 0点: 0
  - 10点: 10

# [M04] 慎重な回収 ★
- option: 貴重な鉱物が鉱山に接触していない:
  - 0点: 0
  - 30点: 30
- option: 両方の支柱が立っている:
  - 0点: 0
  - 10点: 10

# [M05] 誰が住んでいた？ ★
床がまっすぐ上を向いている:
- option:
  - 0点: 0
  - 30点: 30

# [M06] 鍛治場
鉱石が鍛治場に接触していない:
- option:
  - 0点: 0
  - 10点: 10
  - 20点: 20
  - 30点: 30

# [M07] 力仕事
石臼が台座に接触していない:
- option:
  - 0点: 0
  - 30点: 30

# [M08] サイロ
保存食がサイロの外にある:
- option:
  - 0点: 0
  - 10点: 10
  - 20点: 20
  - 30点: 30

# [M09] 何を売っていた？ ★
- option: 屋根が完全に持ち上がっている:
  - 0点: 0
  - 20点: 20
- option: 市場の交易品が持ち上がっている:
  - 0点: 0
  - 10点: 10

# [M10] はかり
- option: はかりが傾き、マットに接触している:
  - 0点: 0
  - 20点: 20
- option: はかりの皿が完全に取り除かれている:
  - 0点: 0
  - 10点: 10

# [M11] 港の遺物 ★
- option: 遺物が地表の上に持ち上がっている:
  - 0点: 0
  - 20点: 20
- option: クレーンの旗が少しでも下がっている:
  - 0点: 0
  - 10点: 10

# [M12] 船の救出 ★
- option: 砂が完全に取り除かれている:
  - 0点: 0
  - 20点: 20
- option: 船が完全に持ち上がっている:
  - 0点: 0
  - 10点: 10

# [M13] 像の復元 ★
像が完全に持ち上がっている:
- option:
  - 0点: 0
  - 30点: 30

# [M14] フォーラム ★
- option: ブラシ:
  - 0点: 0
  - 5点: 5
- option: トロッコ:
  - 0点: 0
  - 5点: 5
- option: はかりの皿:
  - 0点: 0
  - 5点: 5
- option: 表土:
  - 0点: 0
  - 5点: 5
- option: 貴重な遺物:
  - 0点: 0
  - 5点: 5
- option: 化石化した遺物を含む鉱石:
  - 0点: 0
  - 5点: 5
- option: 石臼:
  - 0点: 0
  - 5点: 5

# [M15] 発見現場のマーキング
旗が少しでも発掘現場内に入り、マットに接触している:
- option:
  - 0点: 0
  - 10点: 10
  - 20点: 20
  - 30点: 30
`;
        }

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

    // ======================================
    // カメラタブ — 変数定義
    // ======================================
    const videoElement    = document.getElementById('camera-stream');
    const cameraSelect    = document.getElementById('camera-select');
    const camRecordBtn    = document.getElementById('camRecordButton');
    const camStartStopBtn = document.getElementById('camStartStopButton');
    const camExchangeBtn  = document.getElementById('camExchangeButton');
    const camResetBtn     = document.getElementById('camResetButton');
    const camStartLabel   = document.getElementById('camStartLabel');
    const camExchangeLbl  = document.getElementById('camExchangeLabel');
    const camTimerOverlay = document.getElementById('camTimerOverlay');
    const camRecIndicator = document.getElementById('camRecIndicator');
    const camTimelineTrack= document.getElementById('camTimelineTrack');
    const camTimelineTopLabels = document.getElementById('camTimelineTopLabels');
    const camRemaining    = document.getElementById('camTimelineRemaining');
    const camTimelineRunTotal = document.getElementById('camTimelineRunTotal');
    const camTimelineExchangeTotal = document.getElementById('camTimelineExchangeTotal');
    const camOrientWarn   = document.getElementById('camOrientationWarning');
    const camTabList       = document.querySelector('.cam-tab-list');
    const camTabOn         = document.getElementById('camTabOn');
    const camTabOff        = document.getElementById('camTabOff');
    const camTimelineWrapper = document.getElementById('camTimelineWrapper');

    let cameraStream   = null;
    let mediaRecorder  = null;
    let recordedChunks = [];
    let recordCanvas   = null;
    let recordCanvasCtx = null;
    let recordAnimationId = null;

    // カメラ専用タイマー (2:30 = 15000 cs)
    const CAM_TOTAL_CS = 15000; // 2分30秒 = 15000 centiseconds
    let camTimeLeft    = CAM_TOTAL_CS;
    let camIsRunning   = false;
    let camTimerInterval = null;
    let camStartStamp  = null;
    let camLeftAtStart = null;
    let camRunCount    = 0;
    let camExchangeCount = 0;
    let camLastLapTime = CAM_TOTAL_CS;
    let camIsExchange  = false; // false = Run, true = Exchange

    // タイムラインセグメント: [{type:'run'|'exchange', startCs, endCs}]
    let camSegments = [];
    let camCurrentSegmentStart = CAM_TOTAL_CS; // 現在のセグメント開始時点のタイマー値

    // ======================================
    // タブ切り替え
    // ======================================
    function stopCameraStream() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
            videoElement.srcObject = null;
        }
        // 録画中なら停止
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        // 録画キャンバスループの停止
        if (recordAnimationId) {
            cancelAnimationFrame(recordAnimationId);
            recordAnimationId = null;
        }
        recordCanvas = null;
        recordCanvasCtx = null;

        // カメラタイマーも停止
        if (camTimerInterval) {
            clearInterval(camTimerInterval);
            camTimerInterval = null;
        }
    }

    timerTab.addEventListener('click', () => {
        stopCameraStream();
        timerTab.classList.add('active');
        cameraTab.classList.remove('active');
        scoreTab.classList.remove('active');
        historyTab.classList.remove('active');
        timerSection.classList.add('active');
        cameraSection.classList.remove('active');
        scoreSection.classList.remove('active');
        historySection.classList.remove('active');
    });

    cameraTab.addEventListener('click', () => {
        cameraTab.classList.add('active');
        timerTab.classList.remove('active');
        scoreTab.classList.remove('active');
        historyTab.classList.remove('active');
        cameraSection.classList.add('active');
        timerSection.classList.remove('active');
        scoreSection.classList.remove('active');
        historySection.classList.remove('active');
        // カメラタブを開いたら自動でカメラ起動
        initCameraAndDevices();
        // 向きをチェック
        checkOrientation();
    });

    scoreTab.addEventListener('click', () => {
        stopCameraStream();
        scoreTab.classList.add('active');
        timerTab.classList.remove('active');
        cameraTab.classList.remove('active');
        historyTab.classList.remove('active');
        scoreSection.classList.add('active');
        timerSection.classList.remove('active');
        cameraSection.classList.remove('active');
        historySection.classList.remove('active');
        calculateScore();
    });

    historyTab.addEventListener('click', () => {
        stopCameraStream();
        historyTab.classList.add('active');
        timerTab.classList.remove('active');
        cameraTab.classList.remove('active');
        scoreTab.classList.remove('active');
        historySection.classList.add('active');
        scoreSection.classList.remove('active');
        timerSection.classList.remove('active');
        cameraSection.classList.remove('active');
        updateHistoryList();
    });

    // ======================================
    // カメラ起動 & デバイス一覧
    // ======================================
    async function initCameraAndDevices() {
        try {
            // 権限取得のために先にストリームを開く
            const constraints = buildConstraints();
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop());
            }
            cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = cameraStream;

            // 権限取得後にデバイス一覧を取得（ラベルが取れる）
            await populateCameraDevices();

            // 実際に使われているデバイスを選択状態にする
            if (cameraStream.getVideoTracks().length > 0) {
                const settings = cameraStream.getVideoTracks()[0].getSettings();
                if (settings.deviceId) cameraSelect.value = settings.deviceId;
            }
        } catch (err) {
            console.error('Camera access error:', err);
            camTimerOverlay.textContent = 'カメラ権限なし';
        }
    }

    function buildConstraints() {
        const deviceId = cameraSelect.value;
        return {
            video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
            audio: true
        };
    }

    async function populateCameraDevices() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        cameraSelect.innerHTML = '';
        videoDevices.forEach((d, i) => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `カメラ ${i + 1}`;
            cameraSelect.appendChild(opt);
        });
    }

    cameraSelect.addEventListener('change', () => {
        if (cameraStream) initCameraAndDevices();
    });

    // ======================================
    // 横画面チェック
    // ======================================
    function checkOrientation() {
        // カメラセクションが表示されていない場合は何もしない
        if (!cameraSection.classList.contains('active')) return;

        let isPortrait;
        if (window.screen && window.screen.orientation && window.screen.orientation.type) {
            isPortrait = window.screen.orientation.type.startsWith('portrait');
        } else {
            // iOS Safari などのフォールバック
            isPortrait = window.innerHeight > window.innerWidth;
        }

        if (isPortrait) {
            camOrientWarn.classList.add('visible');
        } else {
            camOrientWarn.classList.remove('visible');
        }
    }

    // 向き変更・リサイズ時に再チェック
    window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 100));
    window.addEventListener('resize', checkOrientation);

    // ======================================
    // タイムライン トグルタブ (Radix/shadcn)
    // ======================================
    camTabOn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') return;
        camTabOn.setAttribute('data-state', 'active');
        camTabOn.classList.add('active');
        camTabOff.setAttribute('data-state', 'inactive');
        camTabOff.classList.remove('active');
        camTimelineWrapper.classList.remove('hidden');
    });

    camTabOff.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') return;
        camTabOff.setAttribute('data-state', 'active');
        camTabOff.classList.add('active');
        camTabOn.setAttribute('data-state', 'inactive');
        camTabOn.classList.remove('active');
        camTimelineWrapper.classList.add('hidden');
    });

    // ======================================
    // 録画用キャンバス描画ループ (タイムラインバーの重ね合わせ)
    // ======================================
    function drawRecordFrame() {
        if (!recordCanvas || !recordCanvasCtx) return;
        const w = recordCanvas.width;
        const h = recordCanvas.height;

        // 1. カメラ映像をキャンバスに描画
        recordCanvasCtx.drawImage(videoElement, 0, 0, w, h);

        // 2. 「バーあり」のときのみ、タイムラインバーを動画内に重ねて描画
        const showBar = camTabOn.getAttribute('data-state') === 'active';
        if (showBar) {
            // 解像度に応じたスケール係数の計算 (基準となる高さを 360px とする)
            const scale = h / 360;

            // 最下部の黒背景帯を描画 (少し高さを高くして合計秒数と上部秒数を収める)
            const containerH = 80 * scale;
            recordCanvasCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            recordCanvasCtx.fillRect(0, h - containerH, w, containerH);

            // タイムラインのサイズ設定
            const trackX = 30 * scale;
            const trackW = w - 60 * scale;
            const trackH = 16 * scale; // 太さ200% (元は8px)
            const trackY = h - 38 * scale; // 配置位置の調整

            // タイムラインの背景トラックを描画
            recordCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            recordCanvasCtx.beginPath();
            if (recordCanvasCtx.roundRect) {
                recordCanvasCtx.roundRect(trackX, trackY, trackW, trackH, 6 * scale);
            } else {
                recordCanvasCtx.rect(trackX, trackY, trackW, trackH);
            }
            recordCanvasCtx.fill();

            let canvasRunCs = 0;
            let canvasExchangeCs = 0;

            // 完了済みセグメントを描画
            camSegments.forEach(seg => {
                const durationCs = seg.startCs - seg.endCs;
                const startPct = (CAM_TOTAL_CS - seg.startCs) / CAM_TOTAL_CS;
                const endPct = (CAM_TOTAL_CS - seg.endCs) / CAM_TOTAL_CS;
                const x1 = trackX + startPct * trackW;
                const sw = (endPct - startPct) * trackW;

                if (seg.type === 'run') canvasRunCs += durationCs;
                else canvasExchangeCs += durationCs;

                recordCanvasCtx.fillStyle = seg.type === 'run' ? '#f97316' : '#22c55e';
                recordCanvasCtx.beginPath();
                if (recordCanvasCtx.roundRect) {
                    recordCanvasCtx.roundRect(x1, trackY, sw, trackH, 4 * scale);
                } else {
                    recordCanvasCtx.rect(x1, trackY, sw, trackH);
                }
                recordCanvasCtx.fill();

                // 各区間の秒数をバーの上に描画 (十分な幅がある場合のみ。条件もスケールに合わせる)
                if (sw > 14 * scale) {
                    recordCanvasCtx.font = 'bold ' + Math.max(8, Math.round(10 * scale)) + 'px sans-serif';
                    recordCanvasCtx.fillStyle = seg.type === 'run' ? '#ffd8a8' : '#b2f2bb';
                    recordCanvasCtx.textAlign = 'center';
                    recordCanvasCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                    recordCanvasCtx.shadowBlur = 4 * scale;
                    recordCanvasCtx.fillText((durationCs / 100).toFixed(1) + '秒', x1 + sw / 2, trackY - 6 * scale);
                    recordCanvasCtx.shadowBlur = 0;
                }
            });

            // 現在進行中のセグメントを描画
            if (camIsRunning) {
                const durationCs = camCurrentSegmentStart - camTimeLeft;
                const startPct = (CAM_TOTAL_CS - camCurrentSegmentStart) / CAM_TOTAL_CS;
                const endPct = (CAM_TOTAL_CS - camTimeLeft) / CAM_TOTAL_CS;
                const x1 = trackX + startPct * trackW;
                const sw = (endPct - startPct) * trackW;
                const type = camIsExchange ? 'exchange' : 'run';

                if (type === 'run') canvasRunCs += durationCs;
                else canvasExchangeCs += durationCs;

                if (durationCs > 0) {
                    recordCanvasCtx.fillStyle = camIsExchange ? '#22c55e' : '#f97316';
                    recordCanvasCtx.beginPath();
                    if (recordCanvasCtx.roundRect) {
                        recordCanvasCtx.roundRect(x1, trackY, sw, trackH, 4 * scale);
                    } else {
                        recordCanvasCtx.rect(x1, trackY, sw, trackH);
                    }
                    recordCanvasCtx.fill();

                    // 現在進行中の秒数をバーの上に描画
                    if (sw > 14 * scale) {
                        recordCanvasCtx.font = 'bold ' + Math.max(8, Math.round(10 * scale)) + 'px sans-serif';
                        recordCanvasCtx.fillStyle = type === 'run' ? '#ffd8a8' : '#b2f2bb';
                        recordCanvasCtx.textAlign = 'center';
                        recordCanvasCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                        recordCanvasCtx.shadowBlur = 4 * scale;
                        recordCanvasCtx.fillText((durationCs / 100).toFixed(1) + '秒', x1 + sw / 2, trackY - 6 * scale);
                        recordCanvasCtx.shadowBlur = 0;
                    }
                }
            }

            // テキストラベルの描画
            recordCanvasCtx.font = 'bold ' + Math.max(9, Math.round(12 * scale)) + 'px sans-serif';
            recordCanvasCtx.fillStyle = '#ffffff';
            recordCanvasCtx.textBaseline = 'middle';

            // 左側: 0:00
            recordCanvasCtx.textAlign = 'left';
            recordCanvasCtx.fillText('0:00', trackX, h - 14 * scale);

            // 右側: 2:30
            recordCanvasCtx.textAlign = 'right';
            recordCanvasCtx.fillText('2:30', trackX + trackW, h - 14 * scale);

            // 中央: 残り時間 + Run合計 + 交換合計 (色分けして描画)
            const runSec = (canvasRunCs / 100).toFixed(1);
            const exchSec = (canvasExchangeCs / 100).toFixed(1);

            const partRemaining = `残り ${camFormatTime(camTimeLeft)}`;
            const divider = `  |  `;
            const partRun = `Run合計 ${runSec}秒`;
            const partExch = `交換合計 ${exchSec}秒`;

            recordCanvasCtx.font = 'bold ' + Math.max(9, Math.round(11 * scale)) + 'px sans-serif';
            const wRemaining = recordCanvasCtx.measureText(partRemaining).width;
            const wDivider   = recordCanvasCtx.measureText(divider).width;
            const wRun       = recordCanvasCtx.measureText(partRun).width;
            const wExch      = recordCanvasCtx.measureText(partExch).width;

            const totalTextWidth = wRemaining + wDivider + wRun + wDivider + wExch;

            // 背景に薄いカプセル風マスクを描画して視認性を上げる
            recordCanvasCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            recordCanvasCtx.beginPath();
            if (recordCanvasCtx.roundRect) {
                recordCanvasCtx.roundRect(trackX + trackW / 2 - totalTextWidth / 2 - 10 * scale, h - 23 * scale, totalTextWidth + 20 * scale, 18 * scale, 9 * scale);
            } else {
                recordCanvasCtx.rect(trackX + trackW / 2 - totalTextWidth / 2 - 10 * scale, h - 23 * scale, totalTextWidth + 20 * scale, 18 * scale);
            }
            recordCanvasCtx.fill();

            // テキストを分割して色指定しながら描画
            let currentX = trackX + trackW / 2 - totalTextWidth / 2;
            recordCanvasCtx.textBaseline = 'middle';
            recordCanvasCtx.textAlign = 'left';

            // 1. 残り時間 (白色)
            recordCanvasCtx.fillStyle = '#ffffff';
            recordCanvasCtx.fillText(partRemaining, currentX, h - 14 * scale);
            currentX += wRemaining;

            // 2. 仕切り (不透明度を下げた白色)
            recordCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            recordCanvasCtx.fillText(divider, currentX, h - 14 * scale);
            currentX += wDivider;

            // 3. Run合計 (オレンジ)
            recordCanvasCtx.fillStyle = '#ffd8a8'; // 明るいオレンジ
            recordCanvasCtx.fillText(partRun, currentX, h - 14 * scale);
            currentX += wRun;

            // 4. 仕切り (不透明度を下げた白色)
            recordCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            recordCanvasCtx.fillText(divider, currentX, h - 14 * scale);
            currentX += wDivider;

            // 5. 交換合計 (グリーン)
            recordCanvasCtx.fillStyle = '#b2f2bb'; // 明るいグリーン
            recordCanvasCtx.fillText(partExch, currentX, h - 14 * scale);
        }

        // 次フレームのループ
        recordAnimationId = requestAnimationFrame(drawRecordFrame);
    }

    // ======================================
    // 録画ボタン
    // ======================================
    camRecordBtn.addEventListener('click', () => {
        if (!cameraStream) return;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            // 停止して保存
            mediaRecorder.stop();
        } else {
            // 録画開始 — MP4優先、未対応の場合はWebMにフォールバック
            recordedChunks = [];
            const mp4Types = [
                'video/mp4;codecs=avc1,mp4a.40.2',
                'video/mp4;codecs=h264',
                'video/mp4'
            ];
            const webmTypes = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm'
            ];
            let selectedMime = '';
            let fileExt = 'webm';
            for (const t of mp4Types) {
                if (MediaRecorder.isTypeSupported(t)) {
                    selectedMime = t;
                    fileExt = 'mp4';
                    break;
                }
            }
            if (!selectedMime) {
                for (const t of webmTypes) {
                    if (MediaRecorder.isTypeSupported(t)) {
                        selectedMime = t;
                        fileExt = 'mp4';
                        break;
                    }
                }
            }

            // 「バーあり」がアクティブな場合はキャンバスからキャプチャしたストリームを使用
            const showBar = camTabOn.getAttribute('data-state') === 'active';
            let recordStream = cameraStream;

            if (showBar) {
                // 録画用の臨時キャンバスを作成
                recordCanvas = document.createElement('canvas');
                // ビデオ解像度を取得して合わせる（未取得時は1280x720デフォルト）
                recordCanvas.width = videoElement.videoWidth || 1280;
                recordCanvas.height = videoElement.videoHeight || 720;
                recordCanvasCtx = recordCanvas.getContext('2d');

                // キャンバス描画ループ開始
                drawRecordFrame();

                // キャンバスからキャプチャしたストリームを作成 (30fps)
                recordStream = recordCanvas.captureStream(30);

                // カメラストリームのオーディオトラック（マイク音声）をキャンバスストリームに追加
                const audioTracks = cameraStream.getAudioTracks();
                audioTracks.forEach(track => recordStream.addTrack(track));
            }

            try {
                mediaRecorder = selectedMime
                    ? new MediaRecorder(recordStream, { mimeType: selectedMime })
                    : new MediaRecorder(recordStream);
            } catch (e) {
                mediaRecorder = new MediaRecorder(recordStream);
            }

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blobType = mediaRecorder.mimeType || 'video/mp4';
                const blob = new Blob(recordedChunks, { type: blobType });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `FLL_Video_${Date.now()}.${fileExt}`;
                a.click();
                URL.revokeObjectURL(url);
                camRecordBtn.classList.remove('recording');
                camRecIndicator.classList.remove('active');
                // Re-enable tab switcher after recording finishes
                camTabList.classList.remove('disabled');

                // キャンバスループのクリーンアップ
                if (recordAnimationId) {
                    cancelAnimationFrame(recordAnimationId);
                    recordAnimationId = null;
                }
                recordCanvas = null;
                recordCanvasCtx = null;
            };
            mediaRecorder.start();
            camRecordBtn.classList.add('recording');
            camRecIndicator.classList.add('active');
            // Disable tab switcher while recording is active
            camTabList.classList.add('disabled');
        }
    });

    // ======================================
    // カメラ専用タイマー
    // ======================================
    function camFormatTime(cs) {
        const totalSec = Math.floor(cs / 100);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function camUpdateTimerDisplay() {
        camTimerOverlay.textContent = camFormatTime(camTimeLeft);
        camRemaining.textContent    = camFormatTime(camTimeLeft);
    }

    function camRenderTimeline() {
        camTimelineTrack.innerHTML = '';
        if (camTimelineTopLabels) camTimelineTopLabels.innerHTML = '';

        let totalRunCs = 0;
        let totalExchangeCs = 0;

        // 完了済みセグメント
        camSegments.forEach(seg => {
            const durationCs = seg.startCs - seg.endCs; // startCs > endCs (countdown)
            const widthPct   = (durationCs / CAM_TOTAL_CS) * 100;

            if (seg.type === 'run') {
                totalRunCs += durationCs;
            } else {
                totalExchangeCs += durationCs;
            }

            // 1. トラックセグメントを追加
            const div = document.createElement('div');
            div.className = `tl-segment ${seg.type}`;
            div.style.width = `${widthPct}%`;
            camTimelineTrack.appendChild(div);

            // 2. 上部ラベルを追加
            if (camTimelineTopLabels && durationCs > 0) {
                const labelDiv = document.createElement('div');
                labelDiv.className = `tl-top-label ${seg.type}`;
                labelDiv.style.width = `${widthPct}%`;
                labelDiv.innerHTML = `<span class="label-text">${(durationCs / 100).toFixed(1)}秒</span>`;
                camTimelineTopLabels.appendChild(labelDiv);
            }
        });

        // 現在進行中のセグメント
        if (camIsRunning) {
            const durationCs = camCurrentSegmentStart - camTimeLeft;
            if (durationCs > 0) {
                const widthPct = (durationCs / CAM_TOTAL_CS) * 100;
                const type = camIsExchange ? 'exchange' : 'run';

                if (type === 'run') {
                    totalRunCs += durationCs;
                } else {
                    totalExchangeCs += durationCs;
                }

                // 1. トラックセグメントを追加
                const div = document.createElement('div');
                div.className = `tl-segment ${type}`;
                div.style.width = `${widthPct}%`;
                camTimelineTrack.appendChild(div);

                // 2. 上部ラベルを追加
                if (camTimelineTopLabels) {
                    const labelDiv = document.createElement('div');
                    labelDiv.className = `tl-top-label ${type}`;
                    labelDiv.style.width = `${widthPct}%`;
                    labelDiv.innerHTML = `<span class="label-text">${(durationCs / 100).toFixed(1)}秒</span>`;
                    camTimelineTopLabels.appendChild(labelDiv);
                }
            }
        }

        // 下部合計表示を更新
        if (camTimelineRunTotal) {
            camTimelineRunTotal.textContent = (totalRunCs / 100).toFixed(1);
        }
        if (camTimelineExchangeTotal) {
            camTimelineExchangeTotal.textContent = (totalExchangeCs / 100).toFixed(1);
        }
    }

    function camTick() {
        const elapsed   = Date.now() - camStartStamp;
        const elapsedCs = Math.floor(elapsed / 10);
        camTimeLeft     = camLeftAtStart - elapsedCs;

        if (camTimeLeft <= 0) {
            camTimeLeft = 0;
            clearInterval(camTimerInterval);
            camTimerInterval = null;
            camIsRunning = false;
            // 最終セグメントを確定
            camCommitSegment();
            camUpdateTimerDisplay();
            camRenderTimeline();
            camStartStopBtn.classList.remove('running');
            camStartLabel.textContent = 'スタート';
            camExchangeBtn.disabled = true;
            alert('時間切れです！');
            return;
        }
        camUpdateTimerDisplay();
        camRenderTimeline();
    }

    function camCommitSegment() {
        const durationCs = camCurrentSegmentStart - camTimeLeft;
        if (durationCs > 0) {
            camSegments.push({
                type: camIsExchange ? 'exchange' : 'run',
                startCs: camCurrentSegmentStart,
                endCs: camTimeLeft
            });
        }
        camCurrentSegmentStart = camTimeLeft;
    }

    // スタート/ストップ
    camStartStopBtn.addEventListener('click', () => {
        if (!camIsRunning) {
            // スタート
            if (camTimeLeft <= 0) return;
            camStartStamp  = Date.now();
            camLeftAtStart = camTimeLeft;
            camTimerInterval = setInterval(camTick, 30);
            camIsRunning = true;
            camStartStopBtn.classList.add('running');
            camStartLabel.textContent = 'ストップ';
            camExchangeBtn.disabled = false;
            // 現在のセグメント開始を記録
            camCurrentSegmentStart = camTimeLeft;
        } else {
            // ストップ
            clearInterval(camTimerInterval);
            camTimerInterval = null;
            camIsRunning = false;
            // セグメント確定
            camCommitSegment();
            camRenderTimeline();
            camStartStopBtn.classList.remove('running');
            camStartLabel.textContent = 'スタート';
        }
    });

    // 交換ボタン
    camExchangeBtn.addEventListener('click', () => {
        if (!camIsRunning) return;
        // 現在のセグメントを確定
        camCommitSegment();
        // Run ↔ Exchange を切り替え
        camIsExchange = !camIsExchange;
        camExchangeLbl.textContent = camIsExchange ? '走行' : '交換';
        if (camIsExchange) {
            camExchangeBtn.classList.add('is-run');
        } else {
            camExchangeBtn.classList.remove('is-run');
        }
        camRenderTimeline();
    });

    // リセット
    camResetBtn.addEventListener('click', () => {
        if (camTimerInterval) clearInterval(camTimerInterval);
        camTimerInterval = null;
        camIsRunning     = false;
        camTimeLeft      = CAM_TOTAL_CS;
        camSegments      = [];
        camCurrentSegmentStart = CAM_TOTAL_CS;
        camIsExchange    = false;
        camRunCount      = 0;
        camExchangeCount = 0;
        camStartStopBtn.classList.remove('running');
        camStartLabel.textContent   = 'スタート';
        camExchangeLbl.textContent  = '交換';
        camExchangeBtn.classList.remove('is-run');
        camExchangeBtn.disabled     = true;
        camUpdateTimerDisplay();
        camRenderTimeline();
    });

    // 初期表示
    camUpdateTimerDisplay();
    camRenderTimeline();

    // ======================================
    // メインタイマー 初期化
    // ======================================

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
        const radius = 105; // circle fits beautifully in 300x300 canvas
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw base gray background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 18;
        ctx.stroke();

        // Helper: get angle from remaining time
        function getAngle(csRemaining) {
            const elapsedCs = totalTime - csRemaining;
            return -0.5 * Math.PI + (2 * Math.PI * (elapsedCs / totalTime));
        }

        // 2. Draw completed segments clockwise
        stopwatchSegments.forEach(seg => {
            const startAngle = getAngle(seg.startCs);
            const endAngle = getAngle(seg.endCs);
            const durationCs = seg.startCs - seg.endCs;
            const segmentColor = seg.type === 'run' ? '#f97316' : '#22c55e'; // orange / green

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.strokeStyle = segmentColor;
            ctx.lineWidth = 18;
            ctx.lineCap = 'butt';
            ctx.stroke();

            // Draw segment text (e.g. "12.3秒") outside the circle
            if (durationCs > 100) { // only show if more than 1 second to avoid crowdedness
                const midAngle = (startAngle + endAngle) / 2;
                const textRadius = radius + 22;
                const tx = centerX + Math.cos(midAngle) * textRadius;
                const ty = centerY + Math.sin(midAngle) * textRadius;

                ctx.save();
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw rounded capsule background for the badge
                const labelText = (durationCs / 100).toFixed(1) + '秒';
                const textWidth = ctx.measureText(labelText).width;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                const cw = textWidth + 8;
                const ch = 14;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(tx - cw / 2, ty - ch / 2, cw, ch, 4);
                } else {
                    ctx.rect(tx - cw / 2, ty - ch / 2, cw, ch);
                }
                ctx.fill();
                
                // Draw colored border around badge
                ctx.strokeStyle = seg.type === 'run' ? 'rgba(249, 115, 22, 0.6)' : 'rgba(34, 197, 94, 0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw text
                ctx.fillStyle = seg.type === 'run' ? '#ffd8a8' : '#b2f2bb';
                ctx.fillText(labelText, tx, ty);
                ctx.restore();
            }
        });

        // 3. Draw active segment clockwise (if running)
        if (isRunning && lastLapTime > timeLeft) {
            const startAngle = getAngle(lastLapTime);
            const endAngle = getAngle(timeLeft);
            const durationCs = lastLapTime - timeLeft;
            const currentType = exchangeButton.textContent === '交換' ? 'run' : 'exchange';
            const segmentColor = currentType === 'run' ? '#f97316' : '#22c55e';

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.strokeStyle = segmentColor;
            ctx.lineWidth = 18;
            ctx.lineCap = 'butt';
            ctx.stroke();

            // Draw active segment text outside
            if (durationCs > 100) {
                const midAngle = (startAngle + endAngle) / 2;
                const textRadius = radius + 22;
                const tx = centerX + Math.cos(midAngle) * textRadius;
                const ty = centerY + Math.sin(midAngle) * textRadius;

                ctx.save();
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const labelText = (durationCs / 100).toFixed(1) + '秒';
                const textWidth = ctx.measureText(labelText).width;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                const cw = textWidth + 8;
                const ch = 14;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(tx - cw / 2, ty - ch / 2, cw, ch, 4);
                } else {
                    ctx.rect(tx - cw / 2, ty - ch / 2, cw, ch);
                }
                ctx.fill();
                
                ctx.strokeStyle = currentType === 'run' ? 'rgba(249, 115, 22, 0.6)' : 'rgba(34, 197, 94, 0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = currentType === 'run' ? '#ffd8a8' : '#b2f2bb';
                ctx.fillText(labelText, tx, ty);
                ctx.restore();
            }
        }

        // 4. Draw remaining time (future time) in blue or blinking red/pink
        let remainingColor = '#3b82f6';
        if (progress > 0 && timeLeft <= 3000 && timeLeft > 0) {
            const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
            remainingColor = blinkOn ? '#ef4444' : '#fca5a5';
        }

        if (timeLeft > 0) {
            const startAngle = getAngle(timeLeft);
            const endAngle = 1.5 * Math.PI;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.strokeStyle = remainingColor;
            ctx.lineWidth = 18;
            ctx.lineCap = 'butt';
            
            // Add a subtle outer glow to the remaining time arc for rich aesthetics
            ctx.shadowBlur = 10;
            ctx.shadowColor = remainingColor;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 5. Update input/text colors in the center to match current segment color or warning color
        let activeColor = '#3b82f6';
        if (timeLeft <= 3000 && timeLeft > 0) {
            const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
            activeColor = blinkOn ? '#ef4444' : '#fca5a5';
        } else if (isRunning) {
            const currentType = exchangeButton.textContent === '交換' ? 'run' : 'exchange';
            activeColor = currentType === 'run' ? '#f97316' : '#22c55e';
        }
        
        timeText.style.color = activeColor;
        minutesInput.style.color = activeColor;
        secondsInput.style.color = activeColor;
        centisecondsDisplay.style.color = activeColor;
    }

    function updateTimer() {
        const elapsed = Date.now() - timerStartStamp;
        const elapsedCs = Math.floor(elapsed / 10);
        timeLeft = timerLeftAtStart - elapsedCs;
        if (timeLeft <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            isRunning = false;
            recordFinalSegment();
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

    function recordFinalSegment() {
        if (lastLapTime > timeLeft) {
            const timeDiff = lastLapTime - timeLeft;
            
            if (exchangeButton.textContent === '交換') {
                runCount++;
                addLapTime(`${runCount} Run`, timeDiff, true);
                totalRunTime += timeDiff;
                totalRunTimeDisplay.textContent = (totalRunTime / 100).toFixed(2);
                
                stopwatchSegments.push({
                    type: 'run',
                    startCs: lastLapTime,
                    endCs: timeLeft
                });
            } else {
                exchangeCount++;
                addLapTime(`交換 ${exchangeCount}回目`, timeDiff, false);
                totalExchangeTime += timeDiff;
                totalExchangeTimeDisplay.textContent = (totalExchangeTime / 100).toFixed(2);
                
                stopwatchSegments.push({
                    type: 'exchange',
                    startCs: lastLapTime,
                    endCs: timeLeft
                });
            }
            lastLapTime = timeLeft;
        }
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
            recordFinalSegment();
        }
    });

    exchangeButton.addEventListener('click', () => {
        if (isRunning) {
            const timeDiff = lastLapTime - timeLeft;
            
            if (exchangeButton.textContent === '交換') {
                runCount++;
                addLapTime(`${runCount} Run`, timeDiff, true);
                totalRunTime += timeDiff;
                totalRunTimeDisplay.textContent = (totalRunTime / 100).toFixed(2);
                
                stopwatchSegments.push({
                    type: 'run',
                    startCs: lastLapTime,
                    endCs: timeLeft
                });
                
                exchangeButton.textContent = '走行';
            } else {
                exchangeCount++;
                addLapTime(`交換 ${exchangeCount}回目`, timeDiff, false);
                totalExchangeTime += timeDiff;
                totalExchangeTimeDisplay.textContent = (totalExchangeTime / 100).toFixed(2);
                
                stopwatchSegments.push({
                    type: 'exchange',
                    startCs: lastLapTime,
                    endCs: timeLeft
                });
                
                exchangeButton.textContent = '交換';
            }
            lastLapTime = timeLeft;
            drawTimerCircle(timeLeft / totalTime); // Redraw immediately
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
        stopwatchSegments = []; // Clear segments
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

    // --- カメラ機能（旧コード削除済み） ---

    updateInputs(timeLeft);
    drawTimerCircle(1);
});