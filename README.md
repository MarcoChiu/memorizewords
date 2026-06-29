# 🎓 EngFlow — 每日英文智慧學習 & 聽寫抽考系統

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

**EngFlow** 是一個極簡、現代且功能強大的英文學習與聽力拼字抽考系統，專為提升單字記憶力、聽力與跟讀發音而設計。

本專案採用**無伺服器 (Serverless) 與本地雙模式運行架構**，前端介面融入了精緻的**磨砂玻璃質感 (Glassmorphism)** 與深色模式設計，提供流暢、高質感的學習體驗。

---

## ✨ 核心特色

### 1. 📁 每日單字檔案管理
* **自動檔案掃描**：啟動 Node.js 後，系統會自動讀取 `data/` 資料夾下的所有 `.txt` 單字檔（例如：`20260629.txt`），依日期倒序排列，方便挑選。
* **雙模式支援**：
  * **線上/伺服器模式**：直接讀取伺服器上的單字檔。
  * **本機離線模式**：無須運行伺服器，直接透過瀏覽器上傳本機 `.txt` 檔案即可開始學習。
* **資料匯出與備份**：學習進度、錯題記錄與標記單字接存於瀏覽器 `localStorage`，另提供匯出/匯入備份功能，確保記錄不遺失。

### 2. 🤖 智慧自動翻譯 (Google Translate API)
* **無痛單字導入**：您的單字檔內僅需寫入英文單字，系統載入時會自動透過 Google 翻譯 (gtx API) 進行批次線上翻譯。
* **手動客製翻譯**：支援以 `英文 | 中文` 或 `英文 - 中文` 格式自訂翻譯內容，保留個人化的解釋或例句。

### 3. 🔊 智慧發音與語音控制 (TTS)
* **多國口音切換**：整合 Web Speech API，可自由切換美式英語 (US)、英式英語 (UK)、澳洲英語 (AU) 等多種內建高品質語音庫。
* **細緻發音調整**：音調 (Pitch) 與語速 (Rate, 0.5x - 2.0x) 無級調節，是練習聽力與跟讀 (Shadowing) 的最佳利器。
* **自動朗讀**：測驗中支援題目載入時自動語音朗讀，完美模擬聽力測驗環境。

### 4. 📝 智慧抽考與錯題覆盤
* **聽力拼字測驗 (Dictation)**：聽發音、看中文提示，輸入英文拼寫。系統具備標點符號與大小寫寬容度，精準判定對錯。
* **雙面字卡與四選一模式**：後台已實作多種智慧測驗機制，提供多樣化的複習手段。
* **混合歷史抽考**：可選擇「僅考目前檔案」或「混合隨機抽考之前所有歷史單字」，擴大複習範圍。
* **錯題精準重試**：測驗結束後生成詳細成績單，支援一鍵「重試錯題」進行高強度弱點複習，直到完全記住。

---

## 🛠️ 技術架構

* **前端 (Frontend)**:
  * **Vanilla HTML5 & ES6+ JavaScript**: 純原生開發，保證極致的載入速度。
  * **Vanilla CSS3 (Grid & Flexbox)**: 自適應排版，支援各種螢幕尺寸（響應式設計）。
  * **Aesthetics**: Glassmorphism 磨砂玻璃視覺風格、自定義 CSS 變數（預設深色模式，支援淺色切換）、FontAwesome 圖標、Google Fonts (Inter, Outfit, Noto Sans TC)。
* **後端 (Backend)**:
  * **Node.js 原生 http 伺服器**: 無依賴（不需要安裝繁重的 Express），負責靜態檔案託管與簡單的數據 API。

---

## 🚀 快速開始

本專案支援兩種運行方式：

### 方法一：透過 Node.js 啟動（推薦，可自動讀取資料夾）

1. 確保您的系統已安裝 [Node.js](https://nodejs.org/)。
2. 複製（Clone）此專案到您的電腦：
   ```bash
   git clone https://github.com/您的帳號/englishApp.git
   cd englishApp
   ```
3. 執行以下指令啟動伺服器：
   ```bash
   npm run dev
   # 或者直接：node server.js
   ```
4. 開啟瀏覽器並前往 `http://localhost:5000` 即可開始使用！

### 方法二：直接打開 HTML 檔案（零環境要求，純離線運作）

1. 將專案下載解壓縮。
2. 雙擊 `index.html` 即可在瀏覽器中直接開啟。
3. 點選頁面底部的「**載入本機 .txt 單字檔**」，即可載入並翻譯自訂的單字檔案。

---

## 📝 單字檔案格式說明

請在 `data/` 資料夾內建立 `.txt` 檔案（例如 `20260630.txt`），檔案編碼請使用 `UTF-8`。

格式支援以下三種方式（混合使用亦可）：

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

## 📂 專案目錄結構

```text
englishApp/
├── index.html            # 主頁面 (SPA 結構)
├── app.js                # 前端核心邏輯與語音、測驗模組
├── style.css             # 前端 Glassmorphism 樣式表
├── server.js             # Node.js 原生 API 伺服器
├── package.json          # 項目配置檔
└── README.md             # 專案說明文件
```

---

## 🤝 貢獻指南

歡迎任何形式的貢獻！如果您有任何建議或發現 bug，請隨時提交 Issue 或 Pull Request。

1. Fork 本專案。
2. 建立您的功能分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交您的變更 (`git commit -m 'Add some AmazingFeature'`).
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 建立 Pull Request。

---

## 📄 開源授權

本專案採用 [MIT License](LICENSE) 授權。
