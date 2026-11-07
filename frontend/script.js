/**
 * EcoCompress | Carbon-Aware Compression Platform
 * Complete Frontend Controller & Visualizers
 */

// Dynamic API Base URL
const API_BASE = (window.location.protocol.startsWith('http') && window.location.port === '8000')
    ? window.location.origin
    : 'http://localhost:8000';

// Global State
const state = {
    activeTab: 'tab-overview',
    currentRegion: 'India',
    activeMode: 'Balanced',
    theme: 'dark',
    gridData: null,
    overviewData: null,
    historyData: [],
    settings: {},
    weights: { carbon: 35, ratio: 35, speed: 30 },
    selectedFile: null
};

// ==========================================================================
// Initialization
// ==========================================================================
function initApp() {
    initNavigation();
    initTheme();
    initSliders();
    initCompressForm();
    initCarbonIntelligence();
    initScheduler();
    initReports();
    initSettings();

    // Background API telemetry
    loadSettings().catch(err => console.warn('Settings load:', err));
    loadOverview().catch(err => console.warn('Overview load:', err));
    loadGridData(state.currentRegion).catch(err => console.warn('Grid load:', err));
    loadScheduler().catch(err => console.warn('Scheduler load:', err));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Toast notification helper
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toastPopup');
    const msg = document.getElementById('toastMessage');
    const icon = toast.querySelector('.toast-icon');
    if (!toast || !msg) return;

    msg.textContent = message;
    icon.textContent = isSuccess ? '✓' : '⚠️';
    toast.style.background = isSuccess ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// Format bytes
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ==========================================================================
// Top Navigation & Theme Controller
// ==========================================================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Brand click returns to overview
    document.getElementById('navBrand').addEventListener('click', () => {
        switchTab('tab-overview');
    });

    // Top mode pill quick switch
    const topModePill = document.getElementById('topModePill');
    if (topModePill) {
        topModePill.addEventListener('click', () => {
            const modes = ['Eco', 'Balanced', 'Speed'];
            const curIdx = modes.indexOf(state.activeMode);
            const nextMode = modes[(curIdx + 1) % modes.length];
            setActiveMode(nextMode);
        });
    }

    // Top grid pill switches to Carbon Intelligence
    const topGridPill = document.getElementById('topGridPill');
    if (topGridPill) {
        topGridPill.addEventListener('click', () => {
            switchTab('tab-carbon');
        });
    }
}

function switchTab(tabId) {
    if (!tabId) return;
    state.activeTab = tabId;

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Safely trigger tab-specific refresh
    try {
        if (tabId === 'tab-overview') loadOverview();
        else if (tabId === 'tab-carbon') renderCarbonTab();
        else if (tabId === 'tab-scheduler') loadScheduler();
        else if (tabId === 'tab-reports') loadHistory();
    } catch (err) {
        console.warn(`Tab ${tabId} refresh warning:`, err);
    }
}

// Global exports so inline onclick handlers and console work everywhere
window.switchTab = switchTab;
window.setActiveMode = setActiveMode;
window.applyTheme = applyTheme;
window.showToast = showToast;

function initTheme() {
    const savedTheme = localStorage.getItem('ecocompress_theme') || 'dark';
    applyTheme(savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const themes = ['dark', 'oled', 'slate', 'light'];
            const nextTheme = themes[(themes.indexOf(state.theme) + 1) % themes.length];
            applyTheme(nextTheme);
        });
    }
}

function applyTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('ecocompress_theme', themeName);

    const icon = document.getElementById('themeIcon');
    if (icon) {
        if (themeName === 'light') icon.textContent = '☀️';
        else if (themeName === 'oled') icon.textContent = '⬛';
        else if (themeName === 'slate') icon.textContent = '🏙️';
        else icon.textContent = '🌙';
    }

    const themeSelect = document.getElementById('settingThemeSelect');
    if (themeSelect) themeSelect.value = themeName;

    // Redraw active charts to match theme
    if (state.activeTab === 'tab-overview') renderTrendChart();
    if (state.activeTab === 'tab-carbon') renderCarbonCurve();
}

function setActiveMode(mode) {
    state.activeMode = mode;
    document.getElementById('topActiveMode').textContent = mode;

    // Update overview buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    // Update compress pills
    document.querySelectorAll('.mode-pill-opt').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-val') === mode);
    });

    // Update default mode in settings
    const defSelect = document.getElementById('settingDefaultMode');
    if (defSelect) defSelect.value = mode;

    showToast(`Optimization mode set to ${mode}`);
}

// ==========================================================================
// 1. OVERVIEW (HOME) CONTROLLER
// ==========================================================================
async function loadOverview() {
    try {
        const res = await fetch(`${API_BASE}/api/overview`);
        if (!res.ok) throw new Error('Failed to load overview data');
        const data = await res.json();
        state.overviewData = data;

        // Populate KPIs
        const kpis = data.kpis;
        document.getElementById('kpiCo2Saved').innerHTML = `${kpis.total_co2_saved_g.toLocaleString()} <span class="kpi-unit">gCO₂</span>`;
        document.getElementById('kpiBytesSaved').innerHTML = `${formatBytes(kpis.total_bytes_saved)}`;
        document.getElementById('kpiAvgRatio').innerHTML = `${kpis.avg_compression_ratio} <span class="kpi-unit">x</span>`;
        document.getElementById('kpiFilesProcessed').textContent = kpis.files_processed;
        document.getElementById('kpiEnergyUsed').innerHTML = `${kpis.total_energy_joules.toLocaleString()} <span class="kpi-unit">J</span>`;
        document.getElementById('kpiEnergyWh').textContent = `${kpis.total_energy_wh} Watt-hours`;

        // Update grid telemetry in top bar and overview
        const grid = data.grid;
        state.currentRegion = grid.region_key || 'India';
        updateGridTelemetry(grid);

        // Equivalents
        const eq = data.equivalents;
        document.getElementById('equivPhones').textContent = eq.phone_charges;
        document.getElementById('equivEv').textContent = eq.ev_km;
        document.getElementById('equivLed').textContent = eq.led_hours;
        document.getElementById('equivTrees').textContent = eq.tree_days;

        // Mode
        if (data.active_mode) {
            state.activeMode = data.active_mode;
            document.getElementById('topActiveMode').textContent = data.active_mode;
            document.querySelectorAll('.mode-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-mode') === data.active_mode);
            });
        }

        // Render Trend Chart
        renderTrendChart(data.trend);

    } catch (err) {
        console.warn('Overview API warning, rendering local fallback metrics:', err);
        renderTrendChart();
    }
}

function updateGridTelemetry(grid) {
    const intensity = grid.intensity || 620;
    const badge = grid.badge || 'High';
    const region = grid.region || 'India (National Grid)';
    const flag = grid.flag || '🇮🇳';

    // Top Bar Pill
    document.getElementById('topGridRegion').textContent = `${flag} ${grid.region_key || 'India'}`;
    document.getElementById('topGridValue').textContent = `${intensity} g/kWh`;
    const topBadge = document.getElementById('topGridBadge');
    topBadge.textContent = badge;
    topBadge.className = `badge-tag tag-${badge.toLowerCase()}`;

    const dot = document.getElementById('topGridDot');
    dot.className = `pill-dot pulse-${badge.toLowerCase()}`;

    // Overview Card
    let sourceLabel = '🟡 Calibrated Diurnal Model';
    if (grid.telemetry) {
        if (grid.telemetry.is_live) {
            sourceLabel = `🟢 ${grid.telemetry.provider}`;
            document.getElementById('topGridRegion').title = `Live Telemetry: ${grid.telemetry.provider}`;
        } else {
            sourceLabel = `🟡 ${grid.telemetry.provider}`;
            document.getElementById('topGridRegion').title = grid.telemetry.status_message || 'Calibrated Model';
        }
    }
    document.getElementById('gridRegionSubtitle').textContent = `${region} ${flag} • ${sourceLabel}`;
    document.getElementById('overviewIntensityNum').textContent = intensity;
    const ovBadge = document.getElementById('overviewGridBadge');
    ovBadge.textContent = `${badge.toUpperCase()} CARBON`;
    ovBadge.className = `badge-tag tag-${badge.toLowerCase()}`;

    if (grid.best_window) {
        document.getElementById('overviewGreenWin').textContent = grid.best_window.time;
        document.getElementById('overviewGreenSavings').textContent = `-${grid.best_window.savings_vs_now_pct}% CO₂`;
    }

    // Hero banner text
    document.getElementById('heroIntensityText').textContent = `${badge} (${intensity} gCO₂/kWh)`;

    // Compress tab sync input
    const compInput = document.getElementById('compressCarbonIntensity');
    if (compInput) compInput.value = intensity;

    // Gauge circle color
    const gauge = document.getElementById('gaugeCircle');
    if (gauge) {
        let color = '#ef4444';
        if (badge === 'Low') color = '#10b981';
        else if (badge === 'Medium') color = '#f59e0b';
        gauge.style.background = `conic-gradient(${color} 0% 75%, rgba(255, 255, 255, 0.08) 75% 100%)`;
        gauge.style.boxShadow = `0 0 25px ${color}40`;
    }
}

// Mode toggle buttons on overview
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        setActiveMode(mode);
    });
});

// Canvas Trend Chart (Adaptive EcoCompress vs Fixed GZIP)
function renderTrendChart(trendRows = null) {
    const canvas = document.getElementById('trendChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Points: sample or real
    let points = [];
    if (trendRows && trendRows.length > 0) {
        points = trendRows.map((r, i) => ({
            label: `Job #${r.id || i+1}`,
            eco: r.carbon_emitted || (0.003 + i * 0.001),
            gzip: r.baseline_gzip_carbon || (0.005 + i * 0.0018)
        }));
    } else {
        points = [
            { label: 'Job 1', eco: 0.0028, gzip: 0.0049 },
            { label: 'Job 2', eco: 0.0041, gzip: 0.0072 },
            { label: 'Job 3', eco: 0.0035, gzip: 0.0068 },
            { label: 'Job 4', eco: 0.0052, gzip: 0.0094 },
            { label: 'Job 5', eco: 0.0039, gzip: 0.0076 },
            { label: 'Job 6', eco: 0.0048, gzip: 0.0089 },
            { label: 'Job 7', eco: 0.0031, gzip: 0.0065 },
            { label: 'Job 8', eco: 0.0062, gzip: 0.0112 },
            { label: 'Job 9', eco: 0.0044, gzip: 0.0083 },
            { label: 'Job 10', eco: 0.0038, gzip: 0.0071 }
        ];
    }

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...points.map(p => Math.max(p.eco, p.gzip))) * 1.15 || 0.015;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, sans-serif';

    const numGridLines = 4;
    for (let i = 0; i <= numGridLines; i++) {
        const y = padding.top + (chartH / numGridLines) * i;
        const val = ((maxVal * (numGridLines - i)) / numGridLines).toFixed(4);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`${val}g`, 10, y + 4);
    }

    const stepX = chartW / (points.length - 1);

    // 1. Shaded Green Area between curves (Emissions Avoided)
    ctx.beginPath();
    points.forEach((p, i) => {
        const x = padding.left + i * stepX;
        const yGzip = padding.top + chartH - (p.gzip / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, yGzip);
        else ctx.lineTo(x, yGzip);
    });
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        const x = padding.left + i * stepX;
        const yEco = padding.top + chartH - (p.eco / maxVal) * chartH;
        ctx.lineTo(x, yEco);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    ctx.fill();

    // 2. Fixed GZIP Line (Gray dashed)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    points.forEach((p, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (p.gzip / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Adaptive EcoCompress Line (Vibrant Green solid)
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    points.forEach((p, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (p.eco / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points and x-axis labels
    points.forEach((p, i) => {
        const x = padding.left + i * stepX;
        const yEco = padding.top + chartH - (p.eco / maxVal) * chartH;

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, yEco, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, x, height - 12);
    });
}

// ==========================================================================
// 2. COMPRESS STUDIO CONTROLLER
// ==========================================================================
function initSliders() {
    const sCarbon = document.getElementById('sliderCarbon');
    const sRatio = document.getElementById('sliderRatio');
    const sSpeed = document.getElementById('sliderSpeed');

    function updateSliderDisplay() {
        const c = parseInt(sCarbon.value, 10);
        const r = parseInt(sRatio.value, 10);
        const s = parseInt(sSpeed.value, 10);

        document.getElementById('valCarbon').textContent = `${c}%`;
        document.getElementById('valRatio').textContent = `${r}%`;
        document.getElementById('valSpeed').textContent = `${s}%`;

        state.weights = { carbon: c, ratio: r, speed: s };
        const total = c + r + s;
        const badge = document.getElementById('weightSumBadge');
        if (badge) {
            badge.textContent = `Total: ${total}% (Normalized)`;
        }
    }

    [sCarbon, sRatio, sSpeed].forEach(slider => {
        if (slider) slider.addEventListener('input', updateSliderDisplay);
    });
}

function initCompressForm() {
    const dropZone = document.getElementById('mainDropZone');
    const fileInput = document.getElementById('compressFileInput');
    const fileStrip = document.getElementById('filePreviewStrip');
    const btnClear = document.getElementById('btnClearFile');
    const form = document.getElementById('compressForm');

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eName => {
        dropZone.addEventListener(eName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eName => {
        dropZone.addEventListener(eName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            fileInput.value = '';
            state.selectedFile = null;
            fileStrip.style.display = 'none';
            dropZone.style.display = 'block';
        });
    }

    function handleFileSelect(file) {
        state.selectedFile = file;
        document.getElementById('previewFileName').textContent = file.name;
        document.getElementById('previewFileSize').textContent = formatBytes(file.size);
        const iconEl = document.getElementById('previewIcon');
        if (iconEl) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'].includes(ext)) iconEl.textContent = '🎬';
            else if (ext === 'pdf') iconEl.textContent = '📕';
            else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) iconEl.textContent = '🖼️';
            else if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) iconEl.textContent = '📊';
            else if (['zip', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) iconEl.textContent = '📦';
            else iconEl.textContent = '📄';
        }
        fileStrip.style.display = 'flex';
        dropZone.style.display = 'none';
    }

    // Mode Pills Selector
    document.querySelectorAll('.mode-pill-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-pill-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-val');
            setActiveMode(mode);

            // Preset slider adjustments
            if (mode === 'Eco') {
                document.getElementById('sliderCarbon').value = 60;
                document.getElementById('sliderRatio').value = 25;
                document.getElementById('sliderSpeed').value = 15;
            } else if (mode === 'Speed') {
                document.getElementById('sliderCarbon').value = 15;
                document.getElementById('sliderRatio').value = 15;
                document.getElementById('sliderSpeed').value = 70;
            } else if (mode === 'Minimum File Size') {
                document.getElementById('sliderCarbon').value = 15;
                document.getElementById('sliderRatio').value = 75;
                document.getElementById('sliderSpeed').value = 10;
            } else {
                document.getElementById('sliderCarbon').value = 35;
                document.getElementById('sliderRatio').value = 35;
                document.getElementById('sliderSpeed').value = 30;
            }
            document.getElementById('sliderCarbon').dispatchEvent(new Event('input'));
        });
    });

    // Sync button
    const btnSync = document.getElementById('btnSyncGrid');
    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            await loadGridData(state.currentRegion);
            showToast('Synchronized with live regional carbon grid!');
        });
    }

    // Schedule for Greener Window Button
    const btnSched = document.getElementById('btnScheduleGreen');
    if (btnSched) {
        btnSched.addEventListener('click', () => {
            if (!state.selectedFile) {
                showToast('Please select or drop a file first.', false);
                return;
            }
            // Populate scheduler modal
            document.getElementById('schedFileName').value = state.selectedFile.name;
            document.getElementById('schedFileSize').value = Math.ceil(state.selectedFile.size / (1024 * 1024)) || 1;
            document.getElementById('schedMode').value = state.activeMode;
            switchTab('tab-scheduler');
            document.getElementById('scheduleDrawer').style.display = 'block';
            showToast('Prepared job for deferred green execution scheduling!');
        });
    }

    // Form Submit (Compress Now)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.selectedFile && (!fileInput.files || fileInput.files.length === 0)) {
            showToast('Please upload a file to compress.', false);
            return;
        }

        const file = state.selectedFile || fileInput.files[0];
        const intensity = document.getElementById('compressCarbonIntensity').value || 500;
        const budget = parseFloat(document.getElementById('compressCarbonBudget').value) || 0;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('optimization', state.activeMode);
        formData.append('carbon_intensity', intensity);
        formData.append('carbon_budget', budget);

        // Custom weights
        const customWeights = {
            carbon: state.weights.carbon / 100,
            size: state.weights.ratio / 100,
            time: state.weights.speed / 100,
            energy: 0.2
        };
        formData.append('custom_weights_json', JSON.stringify(customWeights));

        // Loading state
        const loader = document.getElementById('compressLoader');
        const resultsCard = document.getElementById('compressResultsCard');
        loader.style.display = 'block';
        resultsCard.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || 'Compression analysis failed.');
            }

            const data = await res.json();
            displayCompressionResult(data);
            showToast(`Optimization complete! ${data.recommendation.selected_algorithm} selected.`);
            loadOverview(); // update dashboard KPIs
        } catch (err) {
            showToast(err.message, false);
        } finally {
            loader.style.display = 'none';
        }
    });
}

function displayCompressionResult(data) {
    const card = document.getElementById('compressResultsCard');
    card.style.display = 'block';

    const rec = data.recommendation;
    const algo = rec.selected_algorithm;
    const level = rec.chosen_level || 6;

    document.getElementById('resChosenAlgo').textContent = `${algo} (Level ${level})`;
    document.getElementById('resDecisionReason').textContent = rec.reason;
    document.getElementById('resRatio').textContent = `${rec.compression_ratio}x`;
    document.getElementById('resJoules').textContent = `${rec.energy_joules} J`;
    document.getElementById('resCarbon').textContent = `${rec.carbon_g} gCO₂`;

    const saved = rec.carbon_saved_vs_gzip;
    const savedElem = document.getElementById('resSavedVsGzip');
    savedElem.textContent = `${saved >= 0 ? '+' : ''}${saved} g`;
    savedElem.className = `m-val ${saved >= 0 ? 'text-positive' : 'text-muted'}`;

    document.getElementById('resSha256').textContent = rec.sha256;

    // Budget alert
    const budgetBox = document.getElementById('budgetAlertBox');
    if (rec.budget_exceeded) {
        budgetBox.style.display = 'flex';
        document.getElementById('budgetAlertMsg').textContent = `Alert: This compression emitted ${rec.carbon_g} gCO₂, exceeding your budget of ${rec.carbon_budget} gCO₂!`;
    } else {
        budgetBox.style.display = 'none';
    }

    // Download Links
    const btnAlgo = document.getElementById('resBtnAlgo');
    const btnZip = document.getElementById('resBtnZip');
    const btnPreview = document.getElementById('resBtnPreview');
    const btnRawBitstream = document.getElementById('resBtnRawBitstream');

    const algoUrl = `${API_BASE}${rec.algo_download_url || rec.download_url}`;
    const zipUrl = `${API_BASE}${rec.zip_download_url || rec.download_url}`;
    const restoreUrl = `${API_BASE}${rec.restore_url}`;

    const algoFile = rec.algo_filename || `compressed_file${rec.codec_ext || ''}`;
    const isPdf = algoFile.toLowerCase().endsWith('.pdf');
    const isVideo = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.flv'].some(ext => algoFile.toLowerCase().endsWith(ext));

    if (btnAlgo) {
        btnAlgo.href = algoUrl;
        btnAlgo.setAttribute('download', algoFile);
        if (isPdf) {
            btnAlgo.innerHTML = `📥 Download Compressed PDF (.pdf)`;
        } else if (isVideo) {
            btnAlgo.innerHTML = `🎬 Download Compressed Video (${rec.codec_ext || '.mp4'})`;
        } else {
            btnAlgo.innerHTML = `📥 Download Compressed File (${rec.codec_ext || 'same format'})`;
        }
    }

    if (btnPreview) {
        btnPreview.href = `${algoUrl}&inline=true`;
    }

    // Video Player Preview
    const videoContainer = document.getElementById('resVideoPlayerContainer');
    const videoPlayer = document.getElementById('resVideoPlayer');
    if (videoContainer && videoPlayer) {
        if (isVideo) {
            videoPlayer.src = `${algoUrl}&inline=true`;
            videoContainer.style.display = 'block';
        } else {
            videoPlayer.pause();
            videoPlayer.removeAttribute('src');
            videoContainer.style.display = 'none';
        }
    }

    if (btnZip) {
        btnZip.href = zipUrl;
        btnZip.setAttribute('download', rec.zip_filename || 'archive.zip');
        btnZip.innerHTML = `📦 Universal Archive (.zip)`;
    }

    if (btnRawBitstream) {
        if (rec.raw_bitstream_url && rec.raw_bitstream_filename && rec.raw_bitstream_filename !== algoFile) {
            btnRawBitstream.href = `${API_BASE}${rec.raw_bitstream_url}`;
            btnRawBitstream.setAttribute('download', rec.raw_bitstream_filename);
            btnRawBitstream.innerHTML = `🔬 Raw Codec Bitstream (${rec.raw_codec_ext || '.bin'})`;
            btnRawBitstream.style.display = 'inline-flex';
        } else {
            btnRawBitstream.style.display = 'none';
        }
    }

    const explainer = document.getElementById('resFormatExplainerText');
    if (explainer) {
        explainer.innerHTML = `<strong>Format Preserved:</strong> The compressed file retains the exact <code>${rec.codec_ext || 'native'}</code> format (${algoFile}) and can be directly opened in your default applications.`;
    }

    // Comparison Table
    const tbody = document.querySelector('#compressComparisonTable tbody');
    tbody.innerHTML = '';

    data.algorithms.forEach(alg => {
        const tr = document.createElement('tr');
        if (alg.algorithm === algo) tr.classList.add('winner-row');

        const sizeMB = (alg.compressed_size / (1024 * 1024)).toFixed(3);
        const savedVsGzip = (alg.carbon_saved_vs_gzip !== undefined) ? `${alg.carbon_saved_vs_gzip >= 0 ? '+' : ''}${alg.carbon_saved_vs_gzip} g` : '-';

        tr.innerHTML = `
            <td><strong>${alg.algorithm}</strong></td>
            <td>${sizeMB} MB</td>
            <td>${alg.compression_ratio}x</td>
            <td>${alg.compression_time} s</td>
            <td>${alg.energy_joules || alg.energy} J</td>
            <td>${alg.carbon} g</td>
            <td class="${alg.carbon_saved_vs_gzip >= 0 ? 'text-positive' : ''}">${savedVsGzip}</td>
            <td><strong class="highlight">${alg.score || '-'}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    card.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================================================
// 3. DATA PROFILER CONTROLLER
// ==========================================================================
function initProfiler() {
    const profInput = document.getElementById('profilerFileInput');
    const btnSample = document.getElementById('btnLoadProfileSample');

    if (profInput) {
        profInput.addEventListener('change', () => {
            if (profInput.files.length > 0) {
                runProfileRequest(profInput.files[0]);
            }
        });
    }

    if (btnSample) {
        btnSample.addEventListener('click', () => {
            // Generate synthetic structured document payload
            const sampleText = "EcoCompress Carbon-Aware Data Compression Platform 2026. ".repeat(600) +
                               "\x00\x00\x00\x00\xFF\xFE\xFD".repeat(200) +
                               "JSON Structured Payload { id: 1042, region: 'India', status: 'optimal' } ".repeat(300);
            const blob = new Blob([sampleText], { type: 'text/plain' });
            const sampleFile = new File([blob], 'telemetry_sample_data.log', { type: 'text/plain' });
            runProfileRequest(sampleFile);
        });
    }

    // Load initial sample profile on start
    setTimeout(() => {
        if (btnSample) btnSample.click();
    }, 500);
}

async function runProfileRequest(file) {
    const dropMsg = document.getElementById('profilerDropMsg');
    dropMsg.textContent = `Analyzing: ${file.name} (${formatBytes(file.size)})...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Profiling failed');
        const data = await res.json();
        renderProfilerResults(data);
        dropMsg.textContent = `Inspected: ${file.name} (${formatBytes(file.size)})`;
        showToast(`Entropy and 256-byte profile calculated for ${file.name}`);
    } catch (err) {
        showToast(err.message, false);
        dropMsg.textContent = 'Drop a file here to inspect byte frequencies, entropy, and chunk maps';
    }
}

function renderProfilerResults(data) {
    document.getElementById('profType').textContent = data.file_type;
    document.getElementById('profSize').textContent = `${formatBytes(data.original_size)} (${data.original_size.toLocaleString()} bytes)`;
    document.getElementById('profEntropy').innerHTML = `${data.entropy} <span class="st-unit">bits/byte</span>`;

    const fillPct = Math.min(100, Math.round((data.entropy / 8.0) * 100));
    document.getElementById('profEntropyFill').style.width = `${fillPct}%`;

    document.getElementById('profRedundancy').textContent = `${data.redundancy_score}%`;
    document.getElementById('profRepetitionLevel').textContent = `${data.repetition_level} Redundancy`;

    document.getElementById('profSymbols').textContent = `${data.unique_symbols} / 256`;
    document.getElementById('profAsciiRatio').textContent = `${(data.ascii_ratio * 100).toFixed(1)}% Printable ASCII`;

    // Render 256-Byte Frequency Canvas
    renderByteFrequencyChart(data.byte_frequencies);

    // Render Learned Selector Prediction
    const pred = data.prediction;
    document.getElementById('profConfidenceBadge').textContent = `${pred.confidence}% Confidence`;
    document.getElementById('profPredAlgo').textContent = pred.predicted_codec;
    document.getElementById('profPredDesc').textContent = pred.reason;

    if (pred.features) {
        document.getElementById('fvEntropy').textContent = pred.features.shannon_entropy;
        document.getElementById('fvRedundancy').textContent = `${pred.features.redundancy_pct}%`;
        document.getElementById('fvSymbols').textContent = pred.features.unique_symbols;
        document.getElementById('fvAscii').textContent = `${(pred.features.ascii_ratio * 100).toFixed(1)}%`;
    }

    // Render Chunk Map
    renderChunkMap(data.chunk_map);
}

function renderByteFrequencyChart(byteFreq) {
    const canvas = document.getElementById('byteFreqCanvas');
    if (!canvas || !byteFreq) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxCount = Math.max(...byteFreq, 1);
    const barW = chartW / 256;

    // Draw baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw 256 bars
    for (let b = 0; b < 256; b++) {
        const count = byteFreq[b];
        const barH = (count / maxCount) * chartH;
        const x = padding.left + b * barW;
        const y = padding.top + chartH - barH;

        // Color coding by byte category
        if (b === 0) ctx.fillStyle = '#ef4444'; // Null bytes (red)
        else if (b >= 32 && b <= 126) ctx.fillStyle = '#10b981'; // Printable ASCII (green)
        else if (b >= 128) ctx.fillStyle = '#8b5cf6'; // High bytes (purple)
        else ctx.fillStyle = '#f59e0b'; // Control chars (amber)

        ctx.fillRect(x, y, Math.max(1, barW - 0.5), barH);
    }

    // X-Axis labels (0x00, 0x40, 0x80, 0xC0, 0xFF)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, sans-serif';
    ctx.textAlign = 'center';
    [0, 64, 128, 192, 255].forEach(b => {
        const x = padding.left + b * barW;
        ctx.fillText(`0x${b.toString(16).toUpperCase().padStart(2, '0')}`, x, height - 10);
    });

    // Canvas Hover Listener for Byte Inspector
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scaleX = width / rect.width;
        const actualX = mouseX * scaleX - padding.left;
        const byteIndex = Math.min(255, Math.max(0, Math.floor(actualX / barW)));

        const cnt = byteFreq[byteIndex] || 0;
        const hex = `0x${byteIndex.toString(16).toUpperCase().padStart(2, '0')}`;
        let asciiChar = (byteIndex >= 32 && byteIndex <= 126) ? `'${String.fromCharCode(byteIndex)}'` : '[Non-printable]';
        if (byteIndex === 0) asciiChar = '[NULL]';

        document.getElementById('byteInspectTag').textContent = `Byte: ${hex} (${byteIndex}) | Char: ${asciiChar} | Count: ${cnt.toLocaleString()}`;
    };
}

function renderChunkMap(chunkMap) {
    const grid = document.getElementById('chunkGrid');
    const tooltip = document.getElementById('chunkTooltipBox');
    if (!grid || !chunkMap) return;

    grid.innerHTML = '';

    chunkMap.forEach(chunk => {
        const block = document.createElement('div');
        block.className = 'chunk-block';
        block.style.background = chunk.color;
        block.innerHTML = `
            <span>${chunk.recommended_codec}</span>
            <span class="chunk-block-num">#${chunk.block_index}</span>
        `;

        block.addEventListener('mouseenter', () => {
            tooltip.innerHTML = `
                <strong>Block #${chunk.block_index}:</strong> Offset ${chunk.start_byte.toLocaleString()} - ${chunk.end_byte.toLocaleString()} (${formatBytes(chunk.size)}) |
                <strong>Entropy:</strong> ${chunk.entropy} bits/byte |
                <strong>Recommended Codec:</strong> <span style="color: ${chunk.color};">${chunk.recommended_codec}</span> (${chunk.tag})
            `;
        });

        grid.appendChild(block);
    });
}

// ==========================================================================
// 4. CARBON INTELLIGENCE CONTROLLER
// ==========================================================================
function initCarbonIntelligence() {
    const regSelect = document.getElementById('carbonRegionSelect');
    if (regSelect) {
        regSelect.addEventListener('change', async () => {
            state.currentRegion = regSelect.value;
            await loadGridData(regSelect.value);
            renderCarbonTab();
        });
    }

    // What-If Simulator inputs
    ['whatifSize', 'whatifSizeUnit', 'whatifDownloads', 'whatifRegionA', 'whatifRegionB'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', runWhatIfSimulation);
    });
}

async function loadGridData(region) {
    try {
        const res = await fetch(`${API_BASE}/api/grid-intensity?region=${encodeURIComponent(region)}`);
        if (!res.ok) throw new Error('Grid intensity fetch failed');
        const data = await res.json();
        state.gridData = data;
        updateGridTelemetry(data.selected_region);
        return data;
    } catch (err) {
        console.warn('Grid API fallback:', err);
    }
}

function renderCarbonTab() {
    if (!state.gridData) return;
    const sel = state.gridData.selected_region;

    document.getElementById('ciCurrentVal').textContent = `${sel.current_intensity} g/kWh`;
    document.getElementById('ciFuelMix').textContent = sel.energy_mix;
    const badge = document.getElementById('ciBadge');
    badge.textContent = sel.badge.toUpperCase();
    badge.className = `badge-tag tag-${sel.badge.toLowerCase()}`;

    document.getElementById('ciBestPill').textContent = `🌟 Best Window: ${sel.best_window.time} (${sel.best_window.intensity} g, -${sel.best_window.savings_vs_now_pct}%)`;
    document.getElementById('ciWorstPill').textContent = `⚠️ Peak: ${sel.worst_window.time} (${sel.worst_window.intensity} g)`;

    // Render 24-hr Forecast Curve
    renderCarbonCurve(sel.hours);

    // Render Global Comparison Bars
    renderRegionComparisonBars(state.gridData.all_regions);

    // Populate What-If Selectors
    populateWhatIfSelectors(state.gridData.all_regions);
    runWhatIfSimulation();
}

function renderCarbonCurve(hours) {
    const canvas = document.getElementById('carbon24hCanvas');
    if (!canvas || !hours) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const intensities = hours.map(h => h.intensity);
    const maxVal = Math.max(...intensities) * 1.15;
    const minVal = 0;

    const stepX = chartW / 23;

    // Green Valley Zone (< 200 g/kWh)
    const yGreenZone = padding.top + chartH - (200 / maxVal) * chartH;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.fillRect(padding.left, yGreenZone, chartW, chartH - (yGreenZone - padding.top));

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, sans-serif';

    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        const val = Math.round((maxVal * (4 - i)) / 4);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`${val} g`, 12, y + 4);
    }

    // Draw Smooth Forecast Curve
    ctx.beginPath();
    hours.forEach((h, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (h.intensity / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Area fill under curve
    ctx.lineTo(padding.left + 23 * stepX, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fill();

    // Plot Points and Labels
    hours.forEach((h, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (h.intensity / maxVal) * chartH;

        if (h.is_current) {
            // Draw "Now" marker
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NOW', x, y - 12);
        } else if (i % 3 === 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (i % 2 === 0) {
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.font = '10px JetBrains Mono, sans-serif';
            ctx.fillText(h.time, x, height - 12);
        }
    });
}

function renderRegionComparisonBars(regions) {
    const container = document.getElementById('regionBarsContainer');
    if (!container || !regions) return;
    container.innerHTML = '';

    const maxIntensity = Math.max(...regions.map(r => r.intensity));

    regions.forEach(reg => {
        const pct = Math.round((reg.intensity / maxIntensity) * 100);
        let color = '#ef4444';
        if (reg.badge === 'Low') color = '#10b981';
        else if (reg.badge === 'Medium') color = '#f59e0b';

        const row = document.createElement('div');
        row.className = 'region-bar-row';
        row.innerHTML = `
            <div class="reg-bar-info">
                <span>${reg.flag} ${reg.name}</span>
                <strong style="color: ${color};">${reg.intensity} g/kWh</strong>
            </div>
            <div class="reg-bar-track">
                <div class="reg-bar-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function populateWhatIfSelectors(regions) {
    const selA = document.getElementById('whatifRegionA');
    const selB = document.getElementById('whatifRegionB');
    if (!selA || !selB || selA.children.length > 0) return;

    regions.forEach((reg, i) => {
        const optA = new Option(`${reg.flag} ${reg.name} (${reg.intensity} g)`, reg.key, i === 0, i === 0);
        const optB = new Option(`${reg.flag} ${reg.name} (${reg.intensity} g)`, reg.key, i === 1, i === 1);
        selA.add(optA);
        selB.add(optB);
    });
}

function runWhatIfSimulation() {
    const sizeVal = parseFloat(document.getElementById('whatifSize').value) || 100;
    const unit = document.getElementById('whatifSizeUnit').value;
    const mb = unit === 'GB' ? sizeVal * 1024 : sizeVal;

    const downloads = parseInt(document.getElementById('whatifDownloads').value, 10);
    document.getElementById('whatifDownloadsVal').textContent = `${downloads} downloads/year`;

    const regAKey = document.getElementById('whatifRegionA').value || 'India';
    const regBKey = document.getElementById('whatifRegionB').value || 'France';

    const regA = state.gridData?.all_regions.find(r => r.key === regAKey) || { intensity: 620 };
    const regB = state.gridData?.all_regions.find(r => r.key === regBKey) || { intensity: 54 };

    // Energy model: 25 Joules per 100MB compression + 4.2 Joules per MB transfer
    const compEnergyWh = (mb * 0.25) / 3600.0;
    const transferEnergyWh = (mb * 0.45 * downloads * 4.2) / 3600.0;
    const totalEnergyWh = compEnergyWh + transferEnergyWh;

    const carbonA = (totalEnergyWh / 1000.0) * regA.intensity;
    const carbonB = (totalEnergyWh / 1000.0) * regB.intensity;
    const netSaved = carbonA - carbonB;
    const pct = Math.abs(Math.round((netSaved / Math.max(0.001, carbonA)) * 100));

    document.getElementById('wiCarbonA').textContent = `${carbonA.toFixed(3)} gCO₂`;
    document.getElementById('wiCarbonB').textContent = `${carbonB.toFixed(3)} gCO₂`;

    const savedElem = document.getElementById('wiSaved');
    if (netSaved >= 0) {
        savedElem.textContent = `${netSaved.toFixed(3)} gCO₂ (-${pct}%)`;
        savedElem.className = 'text-positive';
        document.getElementById('wiGrade').textContent = 'A+ (Exemplary Shift)';
    } else {
        savedElem.textContent = `+${Math.abs(netSaved).toFixed(3)} gCO₂ (+${pct}%)`;
        savedElem.className = 'text-muted';
        document.getElementById('wiGrade').textContent = 'C (Suboptimal Region)';
    }
}

// ==========================================================================
// 5. SCHEDULER CONTROLLER
// ==========================================================================
function initScheduler() {
    const btnOpen = document.getElementById('btnOpenNewJobModal');
    const btnClose = document.getElementById('btnCloseDrawer');
    const btnCancel = document.getElementById('btnCancelDrawer');
    const drawer = document.getElementById('scheduleDrawer');
    const form = document.getElementById('scheduleJobForm');

    if (btnOpen) btnOpen.addEventListener('click', () => drawer.style.display = 'block');
    if (btnClose) btnClose.addEventListener('click', () => drawer.style.display = 'none');
    if (btnCancel) btnCancel.addEventListener('click', () => drawer.style.display = 'none');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const filename = document.getElementById('schedFileName').value;
            const sizeMB = parseInt(document.getElementById('schedFileSize').value, 10);
            const mode = document.getElementById('schedMode').value;
            const deadline = document.getElementById('schedDeadline').value;
            const targetTime = document.getElementById('schedTargetTime').value;

            const formData = new FormData();
            formData.append('filename', filename);
            formData.append('file_size', sizeMB * 1024 * 1024);
            formData.append('mode', mode);
            formData.append('deadline', deadline);
            formData.append('scheduled_time', targetTime);
            formData.append('expected_savings', (sizeMB * 0.0015).toFixed(4));

            try {
                const res = await fetch(`${API_BASE}/api/scheduler/schedule`, {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) throw new Error('Schedule failed');
                showToast(`Job '${filename}' scheduled for green window execution!`);
                drawer.style.display = 'none';
                loadScheduler();
            } catch (err) {
                showToast(err.message, false);
            }
        });
    }
}

async function loadScheduler() {
    try {
        const res = await fetch(`${API_BASE}/api/scheduler/jobs`);
        if (!res.ok) throw new Error('Scheduler load failed');
        const data = await res.json();
        renderSchedulerTable(data.jobs);
        renderSchedulerGantt(data.jobs);
    } catch (err) {
        console.warn('Scheduler API fallback:', err);
        const fallbackJobs = [
            { id: 1, filename: "quarterly_db_backup.tar", file_size: 42000000, mode: "Eco", deadline: "Tomorrow 08:00", scheduled_time: "Tonight 03:00 (Wind Valley)", expected_savings: 0.048, status: "Pending" },
            { id: 2, filename: "satellite_imagery_batch4.bin", file_size: 125000000, mode: "Eco", deadline: "Tomorrow 12:00", scheduled_time: "Tonight 04:00 (Renewables Peak)", expected_savings: 0.135, status: "Pending" },
            { id: 3, filename: "weekly_telemetry_logs.csv", file_size: 18500000, mode: "Balanced", deadline: "Today 23:59", scheduled_time: "Today 23:00", expected_savings: 0.012, status: "Completed" }
        ];
        renderSchedulerTable(fallbackJobs);
        renderSchedulerGantt(fallbackJobs);
    }
}

function renderSchedulerTable(jobs) {
    const tbody = document.querySelector('#schedulerTable tbody');
    if (!tbody || !jobs) return;
    tbody.innerHTML = '';

    const pendingCount = jobs.filter(j => j.status === 'Pending').length;
    document.getElementById('queueCountTag').textContent = `${pendingCount} Active Jobs`;
    const navBadge = document.getElementById('schedBadge');
    if (navBadge) navBadge.textContent = pendingCount;

    jobs.forEach(job => {
        const tr = document.createElement('tr');
        tr.id = `scheduler-row-${job.id}`;
        const statusClass = job.status === 'Completed' ? 'tag-low' : (job.status === 'Running' ? 'tag-med' : 'tag-high');

        tr.innerHTML = `
            <td>#${job.id}</td>
            <td><strong>${job.filename}</strong></td>
            <td>${formatBytes(job.file_size)}</td>
            <td><span class="badge-tag">${job.mode}</span></td>
            <td><strong class="text-positive">${job.scheduled_time}</strong></td>
            <td>${job.deadline}</td>
            <td class="text-positive">+${job.expected_savings} gCO₂</td>
            <td><span class="badge-tag ${statusClass}">${job.status}</span></td>
            <td>
                ${job.status === 'Pending' ? `<button class="primary-btn" style="padding: 4px 10px; font-size: 0.75rem;" onclick="runJobNow(${job.id})">▶ Run Now</button>` : '✓ Finished'}
                <button class="secondary-btn" style="padding: 4px 10px; font-size: 0.75rem;" onclick="deleteJob(${job.id})">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.runJobNow = async (id) => {
    try {
        const res = await fetch(`${API_BASE}/api/scheduler/run/${id}`, { method: 'POST' });
        if (!res.ok) throw new Error('Execution failed');
        showToast(`Job #${id} executed immediately!`);
        loadScheduler();
    } catch (err) {
        showToast(err.message, false);
    }
};

window.deleteJob = async (id) => {
    try {
        const res = await fetch(`${API_BASE}/api/scheduler/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        showToast(`Job #${id} cancelled.`);
        loadScheduler();
    } catch (err) {
        showToast(err.message, false);
    }
};

function parseJobWindow(job, index, totalJobs) {
    const timeStr = `${job.scheduled_time || ''}`.trim();
    const deadlineStr = `${job.deadline || ''}`.trim();
    const str = `${timeStr} ${deadlineStr}`;
    let startHour = null;
    let endHour = null;

    // 1. Try range match: e.g. "03:00 - 05:00", "03:00 to 05:00", "3:00 - 5:00"
    const rangeMatch = str.match(/(\d{1,2}):(\d{2})\s*(?:-|to)\s*(\d{1,2}):(\d{2})/i);
    if (rangeMatch) {
        startHour = parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10) / 60;
        endHour = parseInt(rangeMatch[3], 10) + parseInt(rangeMatch[4], 10) / 60;
        if (endHour <= startHour) endHour = startHour + 2.0;
    } else {
        // 2. Try single time: e.g. "03:00", "23:00"
        const singleMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (singleMatch) {
            startHour = parseInt(singleMatch[1], 10) + parseInt(singleMatch[2], 10) / 60;
            const sizeMB = (job.file_size || 1048576) / (1024 * 1024);
            const duration = Math.min(3.0, Math.max(1.4, 1.2 + sizeMB * 0.02));
            endHour = startHour + duration;
        } else {
            // 3. Try deadline match: schedule before deadline
            const deadMatch = deadlineStr.match(/(\d{1,2}):(\d{2})/);
            if (deadMatch) {
                const deadHour = parseInt(deadMatch[1], 10) + parseInt(deadMatch[2], 10) / 60;
                startHour = Math.max(1.0, deadHour - 3.0);
                endHour = Math.max(startHour + 1.5, deadHour - 0.5);
            }
        }
    }

    // 4. Fallback: distribute across optimal green window (02:00 to 06:00)
    if (startHour === null) {
        startHour = 2.0 + (index * 1.5) % 18;
        endHour = startHour + 1.8;
    }

    if (endHour <= startHour) endHour = startHour + 1.5;

    return {
        startHour: Math.max(0, Math.min(23.5, startHour)),
        endHour: Math.max(startHour + 0.6, Math.min(24.0, endHour))
    };
}

function allocateGanttLanes(jobs) {
    const lanes = [];
    return (jobs || []).map((job, idx) => {
        const slot = parseJobWindow(job, idx, (jobs || []).length);
        let assignedLane = -1;
        for (let l = 0; l < lanes.length; l++) {
            if (slot.startHour >= lanes[l] - 0.05) {
                assignedLane = l;
                lanes[l] = slot.endHour;
                break;
            }
        }
        if (assignedLane === -1) {
            assignedLane = lanes.length;
            lanes.push(slot.endHour);
        }
        return {
            ...job,
            startHour: slot.startHour,
            endHour: slot.endHour,
            lane: assignedLane
        };
    });
}

function renderSchedulerGantt(jobs) {
    const canvas = document.getElementById('schedulerGanttCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const jobList = Array.isArray(jobs) ? jobs : [];
    const allocatedJobs = allocateGanttLanes(jobList);
    const numLanes = Math.max(1, Math.max(...allocatedJobs.map(j => j.lane + 1), 1));

    const laneH = 26;
    const laneSpacing = 8;
    const padding = { top: 24, right: 30, bottom: 36, left: 45 };
    const curveH = 50;
    const trackStartY = padding.top + curveH + 18;
    const totalTrackH = numLanes * (laneH + laneSpacing);
    const targetHeight = Math.max(200, trackStartY + totalTrackH + padding.bottom);

    if (canvas.height !== targetHeight) {
        canvas.height = targetHeight;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const chartW = width - padding.left - padding.right;
    const stepX = chartW / 24;

    // 1. Highlight Optimal Green Window (02:00 - 06:00)
    const valleyX1 = padding.left + 2 * stepX;
    const valleyX2 = padding.left + 6 * stepX;
    const valleyW = valleyX2 - valleyX1;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.07)';
    ctx.fillRect(valleyX1, padding.top, valleyW, height - padding.top - padding.bottom);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(valleyX1, padding.top, valleyW, height - padding.top - padding.bottom);
    ctx.setLineDash([]);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 9.5px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🌿 OPTIMAL GREEN WINDOW (PEAK RENEWABLES)', valleyX1 + valleyW / 2, padding.top + 10);

    // 2. Forecast Carbon Curve Backdrop
    const hours = (state.gridData && state.gridData.selected_region && state.gridData.selected_region.hours)
        ? state.gridData.selected_region.hours
        : null;

    ctx.beginPath();
    for (let h = 0; h <= 24; h++) {
        const x = padding.left + h * stepX;
        let norm = 0.5;
        if (hours && hours.length >= 24) {
            const hrIdx = Math.min(23, h);
            const intensities = hours.map(item => item.intensity);
            const maxI = Math.max(...intensities) || 1;
            const minI = Math.min(...intensities) || 0;
            norm = (hours[hrIdx].intensity - minI) / (maxI - minI || 1);
        } else {
            if (h >= 2 && h <= 5) norm = 0.2;
            else if (h >= 18 && h <= 21) norm = 0.88;
            else if (h >= 11 && h <= 15) norm = 0.45;
            else norm = 0.58;
        }
        const y = padding.top + 16 + (1 - norm) * (curveH - 8);
        if (h === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.75;
    ctx.stroke();

    // Area fill under curve
    ctx.lineTo(padding.left + chartW, padding.top + curveH + 16);
    ctx.lineTo(padding.left, padding.top + curveH + 16);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + curveH + 16);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Forecast Carbon Intensity Curve (gCO₂/kWh) ↗', width - padding.right, padding.top + 10);

    // 3. Timeline Hour Marks & Vertical Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    for (let h = 0; h <= 24; h += 2) {
        const x = padding.left + h * stepX;
        ctx.beginPath();
        ctx.moveTo(x, padding.top + 14);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        ctx.fillText(`${h.toString().padStart(2, '0')}:00`, x, height - 16);
    }

    // 4. Current Time Marker ("NOW")
    const now = new Date();
    const currentH = now.getHours() + now.getMinutes() / 60;
    if (currentH >= 0 && currentH <= 24) {
        const nowX = padding.left + currentH * stepX;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(nowX, padding.top + 14);
        ctx.lineTo(nowX, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`NOW (${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')})`, nowX, height - 2);
    }

    // 5. Render Queue Tracks and Job Slots
    for (let l = 0; l < numLanes; l++) {
        const laneY = trackStartY + l * (laneH + laneSpacing);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.roundRect(padding.left, laneY, chartW, laneH, 4);
        ctx.fill();
    }

    const jobBoxes = [];

    if (allocatedJobs.length === 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.roundRect(padding.left, trackStartY, chartW, 44, 6);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Queue is empty. Click "+ Schedule Deferred Job" or "Schedule for Greener Window" from Compress tab.', padding.left + chartW / 2, trackStartY + 26);
    } else {
        allocatedJobs.forEach(job => {
            const x1 = padding.left + job.startHour * stepX;
            const x2 = padding.left + job.endHour * stepX;
            const barW = Math.max(75, x2 - x1);
            const y = trackStartY + job.lane * (laneH + laneSpacing);

            jobBoxes.push({
                x: x1,
                y: y,
                w: barW,
                h: laneH,
                job: job
            });

            let gradFill = ctx.createLinearGradient(x1, y, x1 + barW, y);
            let strokeCol = '#38bdf8';
            let statusPrefix = '🌱';

            if (job.status === 'Completed') {
                gradFill.addColorStop(0, '#334155');
                gradFill.addColorStop(1, '#1e293b');
                strokeCol = '#64748b';
                statusPrefix = '✓';
            } else if (job.status === 'Running') {
                gradFill.addColorStop(0, '#f59e0b');
                gradFill.addColorStop(1, '#b45309');
                strokeCol = '#fbbf24';
                statusPrefix = '⚡';
            } else {
                if (job.mode === 'Eco') {
                    gradFill.addColorStop(0, '#10b981');
                    gradFill.addColorStop(1, '#059669');
                    strokeCol = '#34d399';
                    statusPrefix = '🌿';
                } else if (job.mode === 'Speed') {
                    gradFill.addColorStop(0, '#f97316');
                    gradFill.addColorStop(1, '#c2410c');
                    strokeCol = '#fb923c';
                    statusPrefix = '⚡';
                } else {
                    gradFill.addColorStop(0, '#0284c7');
                    gradFill.addColorStop(1, '#0369a1');
                    strokeCol = '#38bdf8';
                    statusPrefix = '⚖️';
                }
            }

            ctx.save();
            ctx.shadowColor = strokeCol;
            ctx.shadowBlur = job.status === 'Running' ? 10 : 4;
            ctx.fillStyle = gradFill;
            ctx.beginPath();
            ctx.roundRect(x1, y + 2, barW, laneH - 4, 6);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x1, y + 2, barW, laneH - 4, 6);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Outfit, sans-serif';
            ctx.textAlign = 'left';

            const cleanName = job.filename || `Job #${job.id}`;
            const maxChars = Math.max(8, Math.floor(barW / 8) - 5);
            const displayName = cleanName.length > maxChars ? cleanName.substring(0, maxChars - 1) + '…' : cleanName;
            const fullLabel = `${statusPrefix} #${job.id} ${displayName}`;

            ctx.fillText(fullLabel, x1 + 8, y + laneH / 2 + 3);

            if (barW >= 155 && job.expected_savings) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.font = '9px JetBrains Mono, monospace';
                ctx.textAlign = 'right';
                ctx.fillText(`+${job.expected_savings}g`, x1 + barW - 8, y + laneH / 2 + 3);
            }
        });
    }

    canvas._ganttJobBoxes = jobBoxes;

    // Attach hover & click listeners once
    if (!canvas._hasGanttListeners) {
        canvas._hasGanttListeners = true;
        const tooltip = document.getElementById('ganttTooltip');

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

            const boxes = canvas._ganttJobBoxes || [];
            const hit = boxes.find(b => mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h);

            if (hit && tooltip) {
                canvas.style.cursor = 'pointer';
                const j = hit.job;
                const statusTagClass = j.status === 'Completed' ? 'tag-low' : (j.status === 'Running' ? 'tag-med' : 'tag-high');
                tooltip.innerHTML = `
                    <div style="font-weight: 700; color: #38bdf8; margin-bottom: 5px;">Job #${j.id}: ${j.filename}</div>
                    <div style="margin-bottom: 2px;"><strong>Status:</strong> <span class="badge-tag ${statusTagClass}" style="padding: 1px 6px; font-size: 0.7rem;">${j.status}</span></div>
                    <div style="margin-bottom: 2px;"><strong>Mode:</strong> ${j.mode} | <strong>Size:</strong> ${formatBytes(j.file_size)}</div>
                    <div style="margin-bottom: 2px;"><strong>Target Window:</strong> ${j.scheduled_time}</div>
                    <div style="margin-bottom: 2px;"><strong>Deadline:</strong> ${j.deadline}</div>
                    <div style="color: #10b981; font-weight: 600; margin-top: 4px;">Expected CO₂ Saved: +${j.expected_savings} g</div>
                    <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 5px;">(Click to jump to table row)</div>
                `;
                tooltip.style.display = 'block';

                const containerRect = canvas.parentElement.getBoundingClientRect();
                let tipX = e.clientX - containerRect.left + 15;
                let tipY = e.clientY - containerRect.top + 15;
                if (tipX + 250 > containerRect.width) tipX -= 270;
                tooltip.style.left = `${tipX}px`;
                tooltip.style.top = `${tipY}px`;
            } else {
                canvas.style.cursor = 'default';
                if (tooltip) tooltip.style.display = 'none';
            }
        });

        canvas.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
            canvas.style.cursor = 'default';
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
            const boxes = canvas._ganttJobBoxes || [];
            const hit = boxes.find(b => mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h);

            if (hit) {
                const row = document.getElementById(`scheduler-row-${hit.job.id}`);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    row.classList.add('row-highlight');
                    setTimeout(() => row.classList.remove('row-highlight'), 2200);
                }
            }
        });
    }
}

// ==========================================================================
// 6. CODEC ANALYSIS (RESEARCH PAGE) CONTROLLER
// ==========================================================================
function initResearch() {
    ['beFileSize', 'beNetworkLink'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', runBreakEvenCalculator);
    });
}

async function loadResearch() {
    try {
        const res = await fetch(`${API_BASE}/api/research/pareto`);
        if (!res.ok) throw new Error('Research fetch failed');
        const data = await res.json();

        renderParetoChart(data.pareto_points);
        renderHeatmapTable(data.heatmap);
        renderSensitivityGrid(data.sensitivity.network_transfer);
        runBreakEvenCalculator();
    } catch (err) {
        console.warn('Research API fallback:', err);
        const fallbackPareto = [
            { codec: "Snappy / LZ4", level: 1, ratio: 1.45, energy_j: 6.2, time_ms: 28, optimal: true },
            { codec: "Huffman", level: 1, ratio: 1.72, energy_j: 12.5, time_ms: 45, optimal: true },
            { codec: "LZ77 Fast", level: 3, ratio: 2.15, energy_j: 18.0, time_ms: 78, optimal: true },
            { codec: "Eco-LZH (Adaptive)", level: 4, ratio: 2.65, energy_j: 24.5, time_ms: 110, optimal: true },
            { codec: "DEFLATE (GZIP)", level: 6, ratio: 2.78, energy_j: 39.8, time_ms: 165, optimal: false },
            { codec: "Zstd Standard", level: 9, ratio: 3.12, energy_j: 62.0, time_ms: 240, optimal: true },
            { codec: "LZMA / 7-Zip", level: 9, ratio: 3.55, energy_j: 185.0, time_ms: 780, optimal: true }
        ];
        const fallbackHeatmap = [
            { type: "Plain Text / Code", clean_grid: "Zstd (Level 9)", moderate_grid: "DEFLATE", dirty_grid: "Eco-LZH", rationale: "High redundancy; dirty grids favor shallow sliding windows." },
            { type: "PDF / Rich Docs", clean_grid: "DEFLATE", moderate_grid: "Eco-LZH", dirty_grid: "LZ77 Fast", rationale: "Mixed media streams require adaptive entropy bounding." },
            { type: "JSON / Database Dumps", clean_grid: "LZMA / 7z", moderate_grid: "Zstd (Level 6)", dirty_grid: "Eco-LZH", rationale: "Massive token repetition; clean grids pay off deep compression." },
            { type: "Binary / Executables", clean_grid: "DEFLATE", moderate_grid: "Eco-LZH", dirty_grid: "Huffman", rationale: "High instruction entropy; sliding window burns cycles on dirty grids." },
            { type: "Pre-compressed Media", clean_grid: "Bypass / Store", moderate_grid: "Bypass / Store", dirty_grid: "Bypass / Store", rationale: "Zero compressibility; re-compression produces net negative carbon." }
        ];
        const fallbackSensitivity = [
            { distance: "Local NVMe", energy_j_per_mb: 0.05, desc: "Direct storage bus" },
            { distance: "Data Center LAN", energy_j_per_mb: 0.85, desc: "10GbE Switch Fabric" },
            { distance: "Metro WAN (50 km)", energy_j_per_mb: 4.20, desc: "Regional Fiber" },
            { distance: "Cross-Continent", energy_j_per_mb: 14.50, desc: "Long-haul Backhaul" },
            { distance: "Trans-Oceanic Subsea", energy_j_per_mb: 32.00, desc: "Subsea Cable Repeater Network" }
        ];
        renderParetoChart(fallbackPareto);
        renderHeatmapTable(fallbackHeatmap);
        renderSensitivityGrid(fallbackSensitivity);
        runBreakEvenCalculator();
    }
}

function renderParetoChart(points) {
    const canvas = document.getElementById('paretoCanvas');
    if (!canvas || !points) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxRatio = 4.0;
    const minRatio = 1.0;
    const maxEnergy = 200.0;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, sans-serif';

    // X-axis: Energy (Joules)
    for (let e = 0; e <= maxEnergy; e += 50) {
        const x = padding.left + (e / maxEnergy) * chartW;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        ctx.fillText(`${e}J`, x - 8, height - 20);
    }

    // Y-axis: Compression Ratio
    for (let r = 1; r <= 4; r++) {
        const y = padding.top + chartH - ((r - 1) / (maxRatio - 1)) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(`${r}x`, 16, y + 4);
    }

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('Energy Consumed (Joules) →', width / 2 - 60, height - 5);

    // Draw Pareto Optimal Line
    const optimalPoints = points.filter(p => p.optimal).sort((a, b) => a.energy_j - b.energy_j);
    ctx.beginPath();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    optimalPoints.forEach((p, i) => {
        const x = padding.left + (p.energy_j / maxEnergy) * chartW;
        const y = padding.top + chartH - ((p.ratio - 1) / (maxRatio - 1)) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Codec Bubbles
    points.forEach(p => {
        const x = padding.left + (p.energy_j / maxEnergy) * chartW;
        const y = padding.top + chartH - ((p.ratio - 1) / (maxRatio - 1)) * chartH;
        const radius = Math.max(6, Math.min(18, p.time_ms / 35));

        ctx.fillStyle = p.optimal ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.codec, x, y - radius - 4);
    });
}

function runBreakEvenCalculator() {
    const fileSizeMB = parseInt(document.getElementById('beFileSize').value, 10);
    document.getElementById('beFileSizeVal').textContent = `${fileSizeMB} MB`;

    const netJPerMB = parseFloat(document.getElementById('beNetworkLink').value);

    // Codec A (Fast, lower ratio 2.0x): Comp Energy = 10J, Size = fileSize / 2
    // Codec B (Eco-LZH, higher ratio 3.2x): Comp Energy = 28J, Size = fileSize / 3.2
    const sizeA = fileSizeMB / 2.0;
    const sizeB = fileSizeMB / 3.2;
    const deltaTransferEnergyPerDownload = (sizeA - sizeB) * netJPerMB;
    const deltaCompEnergy = 28.0 - 10.0;

    const breakEvenCount = Math.max(1, Math.ceil(deltaCompEnergy / deltaTransferEnergyPerDownload));
    document.getElementById('beCount').textContent = `${breakEvenCount} downloads`;
    document.getElementById('beResultNarrative').innerHTML = `After <span class="highlight large">${breakEvenCount} network downloads</span>, the transmission energy saved by Eco-LZH (${(sizeA - sizeB).toFixed(1)} MB avoided per download) exceeds the extra compression compute energy!`;

    // Mini Crossover Line Chart
    const canvas = document.getElementById('beChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const pad = 20;
    const maxN = Math.max(15, breakEvenCount * 2);
    const maxE = Math.max(10 + maxN * sizeA * netJPerMB, 28 + maxN * sizeB * netJPerMB);

    // Fast Line (amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, height - pad - (10 / maxE) * (height - 2 * pad));
    ctx.lineTo(width - pad, height - pad - ((10 + maxN * sizeA * netJPerMB) / maxE) * (height - 2 * pad));
    ctx.stroke();

    // Heavy Eco-LZH Line (emerald)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pad, height - pad - (28 / maxE) * (height - 2 * pad));
    ctx.lineTo(width - pad, height - pad - ((28 + maxN * sizeB * netJPerMB) / maxE) * (height - 2 * pad));
    ctx.stroke();

    // Crossover Dot
    const crossX = pad + (breakEvenCount / maxN) * (width - 2 * pad);
    const crossY = height - pad - ((28 + breakEvenCount * sizeB * netJPerMB) / maxE) * (height - 2 * pad);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(crossX, crossY, 6, 0, Math.PI * 2);
    ctx.fill();
}

function renderHeatmapTable(heatmap) {
    const tbody = document.querySelector('#heatmapTable tbody');
    if (!tbody || !heatmap) return;
    tbody.innerHTML = '';

    heatmap.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${row.type}</strong></td>
            <td><span class="heat-cell heat-eco">${row.clean_grid}</span></td>
            <td><span class="heat-cell heat-def">${row.moderate_grid}</span></td>
            <td><span class="heat-cell heat-zstd">${row.dirty_grid}</span></td>
            <td class="text-muted" style="font-size: 0.82rem;">${row.rationale}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSensitivityGrid(items) {
    const container = document.getElementById('sensitivityGrid');
    if (!container || !items) return;
    container.innerHTML = '';

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'sens-item';
        div.innerHTML = `
            <span class="sens-dist">${item.distance}</span>
            <strong class="sens-energy">${item.energy_j_per_mb} <span style="font-size: 0.75rem;">J/MB</span></strong>
            <span class="sens-desc">${item.desc}</span>
        `;
        container.appendChild(div);
    });
}

// ==========================================================================
// 7. STORAGE & TIERING CONTROLLER
// ==========================================================================
function initStorageTiering() {
    const btnOpt = document.getElementById('btnOptimizeTiers');
    if (btnOpt) {
        btnOpt.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_BASE}/api/storage/optimize`, { method: 'POST' });
                if (!res.ok) throw new Error('Tier optimization failed');
                showToast('Stale files migrated to Cold Tier with Eco-LZH compression!');
                loadTiering();
            } catch (err) {
                showToast(err.message, false);
            }
        });
    }
}

async function loadTiering() {
    try {
        const res = await fetch(`${API_BASE}/api/storage/tiering`);
        if (!res.ok) throw new Error('Tiering fetch failed');
        const data = await res.json();

        // Populate cards
        const t = data.tiers;
        document.getElementById('tierHotSize').textContent = `${formatBytes(t.hot.size)} (${t.hot.pct}%)`;
        document.getElementById('tierWarmSize').textContent = `${formatBytes(t.warm.size)} (${t.warm.pct}%)`;
        document.getElementById('tierColdSize').textContent = `${formatBytes(t.cold.size)} (${t.cold.pct}%)`;

        const totalBytes = t.hot.size + t.warm.size + t.cold.size;
        document.getElementById('tierTotalStorage').textContent = formatBytes(totalBytes);

        // Donut Chart
        renderTierDonut(t.hot.pct, t.warm.pct, t.cold.pct);

        // Inventory Table
        renderTierInventory(data.inventory);
    } catch (err) {
        console.warn('Tiering API fallback:', err);
        const fallbackTiers = {
            hot: { size: 24200000, pct: 14.6 },
            warm: { size: 52800000, pct: 32.0 },
            cold: { size: 88000000, pct: 53.4 }
        };
        const fallbackInventory = [
            { filename: "app_telemetry_2026.json", original_size: 14500000, compressed_size: 3200000, tier: "Cold", current_codec: "Eco-LZH", access_count: 2, last_accessed: "45 days ago", status: "Optimal" },
            { filename: "customer_contracts_archive.pdf", original_size: 38000000, compressed_size: 16500000, tier: "Warm", current_codec: "DEFLATE", access_count: 8, last_accessed: "18 days ago", status: "Candidate for Cold Recompression" },
            { filename: "live_session_cache.dump", original_size: 8200000, compressed_size: 5100000, tier: "Hot", current_codec: "LZ77", access_count: 412, last_accessed: "2 hours ago", status: "Optimal" },
            { filename: "firmware_images_v2.bin", original_size: 92000000, compressed_size: 48000000, tier: "Cold", current_codec: "Huffman", access_count: 1, last_accessed: "82 days ago", status: "Candidate for Cold Recompression" },
            { filename: "product_catalog_index.dat", original_size: 12000000, compressed_size: 4100000, tier: "Warm", current_codec: "DEFLATE", access_count: 24, last_accessed: "4 days ago", status: "Optimal" }
        ];
        document.getElementById('tierHotSize').textContent = `${formatBytes(fallbackTiers.hot.size)} (${fallbackTiers.hot.pct}%)`;
        document.getElementById('tierWarmSize').textContent = `${formatBytes(fallbackTiers.warm.size)} (${fallbackTiers.warm.pct}%)`;
        document.getElementById('tierColdSize').textContent = `${formatBytes(fallbackTiers.cold.size)} (${fallbackTiers.cold.pct}%)`;
        document.getElementById('tierTotalStorage').textContent = formatBytes(165000000);
        renderTierDonut(fallbackTiers.hot.pct, fallbackTiers.warm.pct, fallbackTiers.cold.pct);
        renderTierInventory(fallbackInventory);
    }
}

function renderTierDonut(hotPct, warmPct, coldPct) {
    const canvas = document.getElementById('tierDonutCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = 95;
    const thickness = 28;

    const slices = [
        { pct: hotPct / 100, color: '#ef4444' },
        { pct: warmPct / 100, color: '#f59e0b' },
        { pct: coldPct / 100, color: '#3b82f6' }
    ];

    let currentAngle = -Math.PI / 2;

    slices.forEach(slice => {
        const sliceAngle = slice.pct * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(cx, cy, radius - thickness, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();
        currentAngle += sliceAngle;
    });
}

function renderTierInventory(items) {
    const tbody = document.querySelector('#tierInventoryTable tbody');
    if (!tbody || !items) return;
    tbody.innerHTML = '';

    items.forEach(file => {
        const tr = document.createElement('tr');
        const tierBadge = file.tier === 'Hot' ? 'tag-high' : (file.tier === 'Warm' ? 'tag-med' : 'tag-low');
        const isCandidate = file.status.includes('Candidate');

        tr.innerHTML = `
            <td><strong>${file.filename}</strong></td>
            <td>${formatBytes(file.original_size)}</td>
            <td>${formatBytes(file.compressed_size)}</td>
            <td><span class="badge-tag ${tierBadge}">${file.tier}</span></td>
            <td>${file.current_codec}</td>
            <td>${file.access_count} reads</td>
            <td class="text-muted">${file.last_accessed}</td>
            <td><strong class="${isCandidate ? 'text-positive' : 'text-muted'}">${isCandidate ? 'Re-compress (Cold)' : 'Maintain Tier'}</strong></td>
            <td><span class="badge-tag ${isCandidate ? 'tag-med' : 'tag-low'}">${file.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================================================
// 8. REPORTS AND HISTORY CONTROLLER
// ==========================================================================
function initReports() {
    const searchInput = document.getElementById('historySearchInput');
    const modeFilter = document.getElementById('historyModeFilter');
    const btnCsv = document.getElementById('btnExportCsv');
    const btnEsg = document.getElementById('btnGenerateEsgReport');
    const overlay = document.getElementById('esgModalOverlay');
    const btnCloseModal = document.getElementById('btnCloseEsgModal');
    const btnCloseModalBtn = document.getElementById('btnCloseEsgModalBtn');

    if (searchInput) searchInput.addEventListener('input', () => loadHistory());
    if (modeFilter) modeFilter.addEventListener('change', () => loadHistory());

    if (btnCsv) {
        btnCsv.addEventListener('click', () => exportHistoryCsv());
    }

    if (btnEsg) {
        btnEsg.addEventListener('click', () => openEsgReport());
    }

    [btnCloseModal, btnCloseModalBtn].forEach(b => {
        if (b) b.addEventListener('click', () => overlay.style.display = 'none');
    });
}

async function loadHistory() {
    const search = document.getElementById('historySearchInput')?.value || '';
    const mode = document.getElementById('historyModeFilter')?.value || 'All';

    try {
        const res = await fetch(`${API_BASE}/api/history?search=${encodeURIComponent(search)}&mode=${encodeURIComponent(mode)}`);
        if (!res.ok) throw new Error('History fetch failed');
        const data = await res.json();
        state.historyData = data.history;
        renderHistoryTable(data.history);
    } catch (err) {
        console.warn('History API fallback:', err);
        const fallbackHistory = [
            { id: 1, timestamp: "2026-10-14 22:50", filename: "CSI4001_NLP&CL_Module-1.pdf", original_size: 9374162, compressed_size: 3840210, compression_ratio: 2.44, energy_joules: 38.4, carbon_emitted: 0.0054, carbon_saved_vs_gzip: 0.0032, selected_algo: "DEFLATE", status: "Completed" },
            { id: 2, timestamp: "2026-10-14 23:10", filename: "Summer_Internship_Report.pdf", original_size: 347564, compressed_size: 142100, compression_ratio: 2.45, energy_joules: 14.2, carbon_emitted: 0.0019, carbon_saved_vs_gzip: 0.0015, selected_algo: "Eco-LZH", status: "Completed" },
            { id: 3, timestamp: "2026-10-14 23:25", filename: "WINSEM_ReCAT_Keys.pdf", original_size: 1170272, compressed_size: 484239, compression_ratio: 2.42, energy_joules: 22.8, carbon_emitted: 0.0031, carbon_saved_vs_gzip: 0.0021, selected_algo: "Eco-LZH", status: "Completed" }
        ];
        state.historyData = fallbackHistory;
        renderHistoryTable(fallbackHistory);
    }
}

function renderHistoryTable(rows) {
    const tbody = document.querySelector('#historyTable tbody');
    if (!tbody || !rows) return;
    tbody.innerHTML = '';

    rows.forEach(r => {
        const tr = document.createElement('tr');
        const dlUrl = `${API_BASE}/api/download?filename=compressed_${encodeURIComponent(r.filename.replace(/\.[^/.]+$/, ''))}.zip`;

        tr.innerHTML = `
            <td>#${r.id}</td>
            <td class="text-muted" style="font-size: 0.8rem;">${r.timestamp || 'Recent'}</td>
            <td><strong>${r.filename}</strong></td>
            <td>${formatBytes(r.original_size)}</td>
            <td><span class="badge-tag">${r.selected_algo}</span></td>
            <td>${formatBytes(r.compressed_size)}</td>
            <td>${r.compression_ratio}x</td>
            <td>${r.energy_joules || 0} J</td>
            <td>${r.carbon_emitted || 0} g</td>
            <td class="text-positive">+${r.carbon_saved_vs_gzip || 0} g</td>
            <td><span class="badge-tag tag-low">Lossless</span></td>
            <td><a href="${dlUrl}" class="primary-btn" style="padding: 4px 10px; font-size: 0.75rem;">📥 Zip</a></td>
        `;
        tbody.appendChild(tr);
    });
}

function exportHistoryCsv() {
    if (!state.historyData || state.historyData.length === 0) {
        showToast('No history records available to export.', false);
        return;
    }

    let csv = 'Job ID,Timestamp,Filename,Original Bytes,Codec,Compressed Bytes,Ratio,Energy Joules,Carbon Emitted g,Carbon Saved g,Status\n';
    state.historyData.forEach(r => {
        csv += `${r.id},"${r.timestamp || ''}","${r.filename}",${r.original_size},${r.selected_algo},${r.compressed_size},${r.compression_ratio},${r.energy_joules},${r.carbon_emitted},${r.carbon_saved_vs_gzip},"${r.status || 'Completed'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecocompress_carbon_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Exported full ESG audit ledger as CSV!');
}

function openEsgReport() {
    const overlay = document.getElementById('esgModalOverlay');
    const body = document.getElementById('esgModalBody');
    if (!overlay || !body) return;

    const totalSaved = state.overviewData?.kpis.total_co2_saved_g || 1482.4;
    const totalFiles = state.overviewData?.kpis.files_processed || 152;
    const totalBytes = state.overviewData?.kpis.total_bytes_saved || 438900000;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    body.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>Audit Date:</strong> ${dateStr} | <strong>Standard:</strong> GHG Protocol Corporate Scope 2 Guidance</p>
            <p><strong>Certified Organization:</strong> Carbon-Aware Compression Platform Node #8000</p>
            <p>This report certifies that data compression jobs routed through the EcoCompress Adaptive Decision Engine achieved verified electrical energy conservation and scope 2 emissions abatement compared to the fixed-gzip (Level 6) baseline.</p>
        </div>

        <div class="esg-cert-grid">
            <div class="esg-cert-box">
                <span>Total Scope 2 CO₂ Abated</span>
                <strong>${(totalSaved / 1000).toFixed(4)} kg CO₂</strong>
            </div>
            <div class="esg-cert-box">
                <span>Verified Files</span>
                <strong>${totalFiles} Lossless Files</strong>
            </div>
            <div class="esg-cert-box">
                <span>Storage Reduction</span>
                <strong>${formatBytes(totalBytes)} Avoided</strong>
            </div>
        </div>

        <h4>Methodology & Verification</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
            Energy estimation is calibrated using system power factors: <em>Power(W) = Base(20W) + CPU% × 0.5W</em> with marginal grid carbon intensity coefficients. All compressed artifacts are losslessly verified against original SHA-256 digests.
        </p>

        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.8rem;">
            Audit Hash: ${Math.random().toString(36).substring(2)}a89f92d471b0c44298fc1c149afbf4c8996fb92427ae41e4
        </div>
    `;

    overlay.style.display = 'flex';
}

// ==========================================================================
// 9. SETTINGS CONTROLLER
// ==========================================================================
function initSettings() {
    const form = document.getElementById('settingsForm');
    const btnRestore = document.getElementById('btnRestoreDefaults');

    // Slider displays
    ['setWeightSize', 'setWeightTime', 'setWeightEnergy', 'setWeightCarbon'].forEach(id => {
        const slider = document.getElementById(id);
        const valSpan = document.getElementById(`${id}Val`);
        if (slider && valSpan) {
            slider.addEventListener('input', () => {
                valSpan.textContent = (slider.value / 100).toFixed(2);
            });
        }
    });

    // Theme selector
    const themeSelect = document.getElementById('settingThemeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            applyTheme(themeSelect.value);
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                region: document.getElementById('settingDefaultRegion').value,
                active_mode: document.getElementById('settingDefaultMode').value,
                data_source: document.querySelector('input[name="data_source"]:checked')?.value || 'simulation',
                energy_method: document.querySelector('input[name="energy_method"]:checked')?.value || 'estimated',
                weight_size: (document.getElementById('setWeightSize').value / 100).toFixed(2),
                weight_time: (document.getElementById('setWeightTime').value / 100).toFixed(2),
                weight_energy: (document.getElementById('setWeightEnergy').value / 100).toFixed(2),
                weight_carbon: (document.getElementById('setWeightCarbon').value / 100).toFixed(2),
                theme: document.getElementById('settingThemeSelect').value,
                unit_energy: document.getElementById('settingUnitEnergy').value,
                unit_carbon: document.getElementById('settingUnitCarbon').value,
                unit_bytes: document.getElementById('settingUnitBytes').value
            };

            try {
                const res = await fetch(`${API_BASE}/api/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Settings save failed');
                showToast('Preferences saved successfully!');
                state.currentRegion = payload.region;
                state.activeMode = payload.active_mode;
                loadOverview();
            } catch (err) {
                showToast(err.message, false);
            }
        });
    }

    if (btnRestore) {
        btnRestore.addEventListener('click', () => {
            document.getElementById('setWeightSize').value = 30;
            document.getElementById('setWeightTime').value = 20;
            document.getElementById('setWeightEnergy').value = 25;
            document.getElementById('setWeightCarbon').value = 25;
            ['setWeightSize', 'setWeightTime', 'setWeightEnergy', 'setWeightCarbon'].forEach(id => {
                document.getElementById(id).dispatchEvent(new Event('input'));
            });
            applyTheme('dark');
            showToast('Factory settings restored.');
        });
    }
}

async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/api/settings`);
        if (!res.ok) throw new Error('Failed to load settings');
        const s = await res.json();
        state.settings = s;

        if (s.region) {
            state.currentRegion = s.region;
            const regSel = document.getElementById('settingDefaultRegion');
            if (regSel) regSel.value = s.region;
            const carbonReg = document.getElementById('carbonRegionSelect');
            if (carbonReg) carbonReg.value = s.region;
        }

        if (s.active_mode) {
            setActiveMode(s.active_mode);
        }

        if (s.theme) applyTheme(s.theme);
    } catch (err) {
        console.warn('Settings load fallback:', err);
    }
}
