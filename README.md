# 🎓 EngFlow — 每日英文智慧學習 & 智慧抽考系統 (React + Vite 版)

🚀 **線上直接使用連結：[https://MarcoChiu.github.io/memorizewords/](https://MarcoChiu.github.io/memorizewords/)**

**EngFlow** 是一個極簡、現代且功能強大的英文學習與聽力拼字抽考系統，專為提升單字記憶力、聽力與跟讀發音而設計。本專案採用 **React + Vite** 重構，介面融入了精緻的 **磨砂玻璃質感 (Glassmorphism)** 與響應式深色模式設計，提供流暢、高品質的單頁應用程式 (SPA) 學習體驗。

---

## ✨ 核心特色

### 1. 📁 每日單字檔案管理
* **自動/手動檔案掃描**：系統會自動讀取 `public/data/` 資料夾下的所有 `.txt` 單字檔（例如：`Unit1.txt`），依名稱倒序排列。
* **本地導入模式**：無須任何後端，直接從瀏覽器載入本機電腦的 `.txt` 檔案即可開始學習。
* **進度保留**：您的學習歷史、錯題記錄均安全地儲存於瀏覽器的 `localStorage` 中。

### 2. 🤖 智慧自動翻譯 (Google Translate API)
* **無痛單字導入**：您的單字檔內僅需寫入英文單字，系統載入時會自動透過 Google 翻譯 (gtx API) 進行批次線上翻譯。
* **手動客製翻譯**：支援以 `英文 | 中文` 或 `英文 - 中文` 格式自訂翻譯內容，保留個人化的解釋或例句。

### 3. 🔊 智慧發音與語音控制 (TTS)
* **多國口音切換**：整合 Web Speech API，可自由切換美式英語 (US)、英式英語 (UK)、澳洲英語 (AU) 等多種高品質語音庫。
* **發音速度調整**：音調 (Pitch) 與語速 (Rate, 0.5x - 2.0x) 皆能調節，支援「自動播放全部 (跟讀)」與「遮蔽中文」進行盲聽訓練。
* **跟讀重複模式**：預設為朗讀兩次（正常速一次 + 慢速一次），給予學習者足夠的時間消化與重複跟讀。

### 4. 📝 三大智慧抽考模式
* **聽力拼字測驗 (Dictation)**：聽發音、看中文提示，輸入英文拼寫。系統具備標點符號寬容度，精準判定對錯。
* **中文四選一測驗 (Choice)**：看中文提示，從隨機生成的四個選項中選出正確英文。
* **雙面字卡記憶 (Flashcard)**：看英文/中文翻牌，自我評估熟練度，高強度加深印象。
* **錯題覆盤與重新挑戰**：測驗結束後生成詳細成績單，支持一鍵「重試錯題」進行高強度弱點複習，直到完全記住。

### 5. 🏷️ 版本追蹤
* **版本號注入**：網頁標題會自動顯示您最新的建置時間戳記（例如 `(202607101801 build)`），方便您確認 GitHub Pages 是否已成功更新。

---

## 📂 專案目錄結構

```text
memorizewords/
├── public/                     # 靜態資源目錄
│   ├── favicon.svg             # 網站圖標
│   └── data/                   # 單字資料庫
│       ├── Unit1.txt           # 內建單字檔
│       ├── Unit2.txt           # 內建單字檔
│       └── files.json          # 自動生成的靜態單字檔案索引
├── src/                        # React 原始碼目錄
│   ├── components/             # React 元件 (Header, Navigation, Tabs 等)
│   ├── utils/                  # 工具函式 (翻譯 API 處理)
│   ├── App.jsx                 # 全域 State 與 TTS 語音引擎
│   ├── index.css               # 整合 Glassmorphism 美學的樣式表
│   └── main.jsx                # React 啟動點
├── .github/workflows/          # 自動化工作流
│   └── deploy.yml              # GitHub Actions 自動部署腳本
├── vite.config.js              # Vite 設定檔 (包含 base 相對路徑設定)
├── generate-files-json.js      # 單字清單索引自動生成器
├── index.html                  # 首頁 HTML 模板
└── package.json                # npm 設定檔與相依套件
```

---

## 🚀 快速開始

### 1. 本地開發環境設置
確保系統已安裝 [Node.js](https://nodejs.org/)。

```bash
# 下載/複製儲存庫
git clone https://github.com/MarcoChiu/memorizewords.git
cd memorizewords

# 安裝依賴
npm install

# 啟動本地開發伺服器
npm run dev
```
啟動後在瀏覽器開啟 `http://localhost:5173` 即可開始使用！

### 2. 生產環境打包與更新清單
如果您在 `public/data/` 內新增了單字 `.txt` 檔案，請執行：
```bash
npm run build
```
這會自動執行 `generate-files-json.js` 生成最新的檔案清單索引 `files.json`，並利用 Vite 打包專案至 `dist/`。

---

## 🚀 部署至 GitHub Pages

本專案支援**本地一鍵部署**與 **GitHub Actions 自動化部署**雙重模式：

### 方式一：本地一鍵部署 (推薦，最快速)
直接在終端機執行：
```bash
npm run deploy
```
系統會自動在本地完成 `build` 打包，並使用 `gh-pages` 工具將產出推送到 `gh-pages` 分支完成發佈。

> [!IMPORTANT]
> **GitHub 設定調整**：
> 當您使用此部署方式時，請確認您 GitHub 專案倉庫的 **Settings** -> **Pages** 中，**Source** 設為 **`Deploy from a branch`**，並將分支選取為 **`gh-pages`**，目錄選取為 **`/ (root)`**。

### 方式二：GitHub Actions 自動化部署
我們已配置了 `.github/workflows/deploy.yml`。只要您將程式碼推送至 `main` 分支，GitHub 將在雲端自動進行建置並發佈。

> [!IMPORTANT]
> **GitHub 設定調整**：
> 當您使用此部署方式時，請在 **Settings** -> **Pages** 中，將 **Source** 改為 **`GitHub Actions`**。

---

## 📝 單字檔案格式說明

請在 `public/data/` 資料夾內建立 `.txt` 檔案（例如 `Unit3.txt`），檔案編碼請使用 `UTF-8`。格式支援以下三種方式（混合使用亦可）：

```text
# 這是一行註解，系統會自動忽略
schedule
cooking
lesson - 課程
badminton | 羽毛球
```
* **僅輸入英文**（如 `schedule`）：系統將自動透過 Google Translate 線上翻譯為中文。
* **使用 `|` 或 `-` 自訂翻譯**（如 `badminton | 羽毛球`）：系統將優先採用您提供的中文翻譯。

---

## 📄 開源授權

本專案採用 [MIT License](LICENSE) 授權。
