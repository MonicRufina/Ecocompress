# EcoCompress: Carbon-Aware Adaptive Compression Platform 🌿⚡

**EcoCompress** is an enterprise-grade, carbon-aware data compression platform that dynamically optimizes compression algorithms, sliding windows, and execution timing against real-time electrical grid carbon intensity ($g\text{CO}_2/\text{kWh}$).

---

## 🌟 9 Comprehensive Views & Navigation Top Bar

The platform features a sticky, glassmorphism **Navigation Top Bar** with live regional carbon telemetry, active mode selector, theme toggles, and seamless one-click navigation across all 9 specialized views:

### 1. 📊 Overview (Home)
- **Real-Time KPI Cards:**
  - **Total $\text{CO}_2$ Saved:** Real-time grams and kilograms of carbon avoided.
  - **Bytes Saved:** Compression storage volume avoided (MB / GB).
  - **Average Compression Ratio:** Cross-payload compression ratio ($X\text{x}$).
  - **Files Processed:** Lossless cryptographic verification count.
  - **Energy Used:** System energy expenditure in **Joules (J)** and **Watt-hours (Wh)**.
- **Current Grid Carbon Intensity Dial:**
  - Live intensity ($g\text{CO}_2/\text{kWh}$) with animated **Low / Medium / High** pulsing radar ring.
  - Next greenest generation window prediction.
- **Trend Chart ($\text{CO}_2$ Saved vs. Fixed-GZIP Baseline):**
  - Interactive dual-curve canvas plotting EcoCompress against the industry-standard static DEFLATE/GZIP (Level 6) baseline.
  - Shaded area highlighting total cumulative carbon abatement.
- **Currently Active Mode Widget:**
  - Quick-switch selector for **Eco**, **Balanced**, and **Speed** modes.
- **Real-World ESG Equivalents:**
  - Tangible metrics: Smartphone battery recharges, Electric Vehicle (EV) kilometers driven, LED lightbulb hours, and Tree-seedling sequestration days.

---

### 2. ⚡ Compress Studio
- **File Upload & Folder Drop Zone:**
  - Drag-and-drop zone supporting arbitrary files, documents, binaries, and folder structures.
  - Live file preview with icon, MIME type, and formatted size.
- **Mode Selector & 3-Way Weight Sliders:**
  - **Eco Mode:** Heavily penalizes CPU energy during dirty grid hours, chooses lightweight fast-entropy codecs or throttles compression level.
  - **Balanced Mode:** Equal trade-off between ratio, speed, and carbon footprint.
  - **Speed Mode:** High throughput, low latency.
  - **Max Ratio Mode:** Archival depth.
  - Interactive multi-objective weighting sliders: **Carbon Priority vs. Compression Ratio vs. Processing Speed** (auto-normalizing to 100%).
- **Optional Carbon Budget Input:**
  - Configure maximum allowable $g\text{CO}_2$ per job.
  - Automated detection alerts when prevailing grid conditions threaten to breach the budget.
- **Execution Actions:**
  - **Compress Now:** Instant multi-codec evaluation, energy scoring, and compression execution.
  - **Schedule for Greener Window:** Automatically defers the workload to the lowest-carbon generation valley in the Scheduler!
- **Live Decision & Download Results:**
  - Chosen codec, level, and explicit decision reasoning.
  - Lossless cryptographic verification badge with full **SHA-256 checksum**.
  - **Download Compressed Archive (.zip):** Native OS-compatible archive.
  - **Save Decompressed File:** Restored verified payload.
  - **Raw Bitstream (.bin):** Raw algorithm output.
  - **Open / Preview in Browser:** Inline preview stream.
  - Codec comparison matrix (Huffman, LZ77, DEFLATE, Eco-LZH) with size, time, Joules, $g\text{CO}_2$, and scores.

---

### 3. 🔬 Data Profiler
- **Deep Payload Inspection:**
  - MIME type detection, byte counts, and unique symbols ($0..255$).
  - **Shannon Entropy ($H$):**
    $$H = -\sum_{i=0}^{255} p_i \log_2(p_i) \quad (0.0 \text{ to } 8.0 \text{ bits/byte})$$
    with animated visual gradient meter.
  - Repetition and redundancy index ($1 - H / 8$).
  - Compressibility classification.
- **Interactive 256-Byte Frequency Distribution:**
  - High-resolution canvas histogram rendering all 256 byte values ($0\text{x}00 \text{ to } 0\text{xFF}$).
  - Hover inspector displaying hex code, ASCII character representation, and exact occurrence count.
- **Learned Selector Prediction:**
  - Heuristic machine learning classifier with **Confidence Percentage (%)**.
  - Decision reasoning and extracted statistical feature vector table.
- **Block-Level Chunk Map:**
  - 16-to-32 block interactive visualizer showing local entropy slices.
  - Color-coded by best-fit codec (LZ77, Eco-LZH, DEFLATE, Huffman, Raw).
  - Hover inspects byte offsets, slice size, and chunk codec rationale.

---

### 4. 🌍 Carbon Intelligence
- **Live & 24-Hour Forecast Curve:**
  - Continuous 24-hour hourly grid carbon curve modeling diurnal solar dips, wind peaks, and evening thermal peaker surges.
  - Visual color bands: Green clean zone ($<180\text{ g/kWh}$), Amber moderate zone, Red dirty zone ($>420\text{ g/kWh}$).
  - Live **NOW** indicator pin.
- **Optimal Windows Highlighted:**
  - 🌟 **Greenest Window:** Start/end hours, intensity, and % savings vs. current hour.
  - ⚠️ **Peak Dirtiness:** Fossil thermal generation warning.
- **Global Grid Region Selector & Comparison:**
  - Supports: 🇮🇳 India, 🇫🇷 France, 🇳🇴 Norway, 🇩🇪 Germany, 🇺🇸 US-California, 🇬🇧 United Kingdom, 🇯🇵 Japan, 🇦🇺 Australia.
  - Side-by-side comparison bar chart with real-time fuel generation mixes.
- **What-If Scenario Simulator:**
  - Compare the exact same workload across different geographical regions or hours.
  - Inputs for payload size (MB/GB), Source vs. Destination regions, and annual access count.
  - Computes compression compute emissions, network transmission carbon, net difference avoided, and **ESG Grade (A+ to F)**.

---

### 5. ⏱️ Scheduler
- **Deferred Job Queue:**
  - Manage batch compression workloads with deadline commitments.
  - Queue columns: Job ID, Filename, Size, Mode, Target Green Window, Deadline, Expected $\text{CO}_2$ Saved, and Status (**Pending**, **Running**, **Completed**).
  - Actions: **Run Now** (force execution), **Delete/Cancel**.
- **Interactive Scheduling Drawer:**
  - Easily queue deferred jobs with custom deadlines and green execution targets.
- **Gantt-Style Timeline Overlaid on Carbon Curve:**
  - 24-hour visual horizontal Gantt lane positioned under the forecast curve.
  - Visually proves job execution slots align with renewable generation valleys.

---

### 6. 📈 Codec Analysis (Research Page)
- **Pareto Frontier Plot:**
  - Multi-dimensional scatter plot: **Ratio vs. Energy (Joules) vs. Latency (ms)**.
  - Codecs plotted: Snappy/LZ4, Huffman, LZ77, Eco-LZH, DEFLATE, Zstandard, and LZMA/7-Zip.
  - Dynamic **Pareto-Optimal Boundary Line** with hoverable metric bubbles.
- **Network Transmission Break-Even Calculator:**
  - Solves the core research equation:
    $$E_{\text{total}} = E_{\text{compress}} + N_{\text{reads}} \times \left(E_{\text{transfer}}(\text{size}) + E_{\text{decompress}}\right)$$
  - Dynamically calculates the exact number of downloads/reads at which heavier compression overcomes initial compute energy.
  - Live crossover chart visualization.
- **Optimal Codec Decision Matrix Heatmap:**
  - Matrix mapping payload categories (Text, PDF, JSON/DB, Binary, Media) against grid carbon regimes (Clean, Moderate, Dirty).
- **Network Sensitivity Analysis:**
  - Energy required per megabyte across communication distances: Local NVMe, Data Center LAN, Metro WAN, Trans-Continental, and Trans-Oceanic Subsea cables.

---

### 7. 🗄️ Storage and Tiering
- **Hot, Warm, and Cold Capacity Breakdown:**
  - Interactive donut chart showing volume distribution across storage tiers.
  - Tier assignments:
    - **Hot Tier ($<7$ days):** LZ77 / Snappy (ultra-fast decompression).
    - **Warm Tier ($7-90$ days):** DEFLATE / Zstd (balanced).
    - **Cold Tier ($>90$ days):** Eco-LZH / 7z Heavy (maximum compression archival).
- **Data Inventory & Re-compression Candidates:**
  - File table tracking 30-day read counts and staleness.
  - Automated flagging for candidate files whose access frequency has dropped.
  - **Optimize Stale Candidates:** One-click batch migration to Cold Tier during clean grid hours.
- **Projected Lifetime Carbon Savings:**
  - 1-Year, 3-Year, and 5-Year cumulative carbon reductions factoring in drive idle power draw and network transfers.

---

### 8. 📜 Reports and History
- **Searchable & Filterable Audit Ledger:**
  - Filter by file name, codec, and optimization mode.
  - Complete history table with original size, codec, compressed size, ratio, Joules, emitted $\text{CO}_2$, and savings vs. baseline.
- **Export Capabilities:**
  - **Export CSV:** Instant download of the full audit trail.
  - **Generate ESG Carbon Report:** Modal rendering a certified, ISO 14064 GHG protocol-compliant Sustainability Certificate with Scope 2 mitigation metrics and cryptographic hashes.
  - One-click **Print / Save as PDF**.

---

### 9. ⚙️ Settings
- **Carbon Telemetry Source:**
  - High-Fidelity Diurnal Simulation Engine vs. Live API (Electricity Maps, WattTime).
- **Default Grid Region:** Configurable default location.
- **Energy Measurement Instrumentation:**
  - Intel RAPL / AMD Hardware Counters vs. CodeCarbon vs. Calibrated Software Model ($P = 20\text{W} + \text{CPU}\% \times 0.5\text{W}$).
- **Custom Multi-Objective Weights:**
  - Sliders for $\alpha$ (Size), $\beta$ (Time), $\gamma$ (Energy), and $\delta$ (Carbon) with auto-normalization.
- **Appearance & Units:**
  - Themes: **Cyber-Eco Dark**, **Deep OLED Black**, **Classic Slate**, **Eco Light**.
  - Units: Joules (J) vs. Watt-hours (Wh), Grams ($g\text{CO}_2$) vs. Kilograms ($kg\text{CO}_2$), Decimal (MB) vs. Binary (MiB).

---

## 🚀 Quick Start Guide

### Option 1: One-Click Launch (Windows)
Double-click `run.bat` in the repository root.

### Option 2: Command Line
```powershell
cd carbon_compression
.\venv\Scripts\python.exe -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser and navigate to:
**`http://localhost:8000`**
