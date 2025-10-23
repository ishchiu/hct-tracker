# 新竹物流貨態查詢通知系統 - 產品需求文件 (PRD)

**版本**: 2.0
**最後更新**: 2025-10-23
**專案位置**: https://hct-tracker-lgfa.vercel.app/
**GitHub**: https://github.com/ishchiu/hct-tracker

---

## 📋 目錄

1. [產品概述](#產品概述)
2. [核心功能](#核心功能)
3. [技術架構](#技術架構)
4. [功能詳細說明](#功能詳細說明)
5. [OCR 圖片識別](#ocr-圖片識別)
6. [使用者介面](#使用者介面)
7. [資料結構](#資料結構)
8. [部署與維護](#部署與維護)
9. [已知限制](#已知限制)
10. [未來規劃](#未來規劃)

---

## 產品概述

### 產品定位
新竹物流貨態查詢通知系統是一個**純前端 Web 應用**，幫助使用者追蹤多個新竹物流包裹，並在包裹送達時透過桌面通知提醒。

### 目標使用者
- 電商賣家：需要追蹤大量出貨訂單
- 網購消費者：關注多個包裹配送狀態
- 物流管理人員：監控配送進度

### 核心價值
1. **智能 OCR 識別**：上傳標籤圖片自動提取貨號、姓名、地址、件數
2. **自動輪詢監控**：定期查詢未送達包裹狀態
3. **即時桌面通知**：包裹送達立即提醒
4. **本地資料儲存**：無需註冊，資料存於瀏覽器

---

## 核心功能

### 1. 貨號追蹤管理
- ✅ 手動輸入 10 碼貨號新增追蹤
- ✅ 上傳標籤圖片自動識別並新增
- ✅ 顯示追蹤清單（貨號、姓名、地址、件數）
- ✅ 手動查詢貨態（前往新竹物流官網）
- ✅ 手動新增貨態記錄
- ✅ 刪除追蹤項目

### 2. OCR 圖片識別 ⭐ 核心功能
- ✅ 支援新竹物流標籤格式（表格式）
- ✅ 自動識別：
  - 貨號（10 碼數字，排除電話號碼）
  - 收件人姓名（2-4 個中文字）
  - 收件地址（包含市/區/路/街/號）
  - 件數（數字）
- ✅ 智能區域識別：
  - 只提取收件人區域資料
  - 忽略寄件人區域
  - 過濾右側欄位（尺寸、代收金額等）
- ✅ 多格式支援：
  - 簡單標籤格式
  - 表格紅框格式
  - 混合文字格式

### 3. 自動輪詢查詢
- ✅ 可設定輪詢間隔（5/10/30/60 分鐘）
- ✅ 只查詢未送達的包裹
- ⚠️ 後端 API 功能未完成（受限於新竹物流網站 JS 渲染）

### 4. 桌面通知
- ✅ 請求瀏覽器通知權限
- ✅ 包裹送達時彈出通知
- ✅ 顯示貨號、狀態、時間

### 5. 資料持久化
- ✅ LocalStorage 儲存追蹤清單
- ✅ 自動儲存姓名、地址、件數編輯
- ✅ 資料本地化，無隱私疑慮

---

## 技術架構

### 前端技術棧
- **HTML5**: 語義化標籤
- **CSS3**:
  - Morandi 色系設計（#8B9D9B, #A8B5B2, #C4AFA4）
  - Flexbox/Grid 佈局
  - 響應式設計（RWD）
- **JavaScript (ES6+)**:
  - Vanilla JS（無框架）
  - LocalStorage API
  - Notification API
  - Fetch API

### 第三方函式庫
- **Tesseract.js v5.1.0**: OCR 文字識別
  - 語言包：`chi_tra`（繁體中文）
  - 動態載入（減少初始載入時間）

### 後端技術棧（未完成）
- **Vercel Serverless Functions**: Node.js 18+
- **crypto-js**: DES 加密（舊版 API）
- ⚠️ **問題**: 新竹物流網站使用 JavaScript 渲染資料，fetch 無法取得完整內容

### 部署平台
- **Vercel**:
  - 自動 CI/CD（GitHub push 觸發部署）
  - Serverless Functions
  - 全球 CDN

---

## 功能詳細說明

### OCR 圖片識別流程

#### 1. 圖片上傳
```javascript
// 主要上傳按鈕
<button id="uploadImageBtn">📷 上傳圖片</button>
<input type="file" id="mainImageUpload" accept="image/*">

// 每個追蹤項目的上傳按鈕
<button class="btn-upload">📷 上傳圖片</button>
<input type="file" class="image-upload" accept="image/*">
```

#### 2. OCR 處理
```
圖片檔案
  ↓
Tesseract.js (chi_tra)
  ↓
OCR 文字結果
  ↓
parseOCRText() 解析
  ↓
提取：貨號、姓名、地址、件數
```

#### 3. 姓名提取策略（5 種方法）

**方法 0: 尋找「收件人」標籤**
```javascript
// 找到「收件人」「收貨人」「收」字
// 清理：移除數字、符號、標籤詞
// 提取：2-4 個中文字
```
- 優先級：⭐⭐⭐⭐⭐
- 適用：標準格式「收件人：陳信雄」

**方法 0.5: 檢查「收件人」下一行**
```javascript
// 如果收件人標籤單獨一行
// 檢查下一行內容
```
- 優先級：⭐⭐⭐⭐
- 適用：垂直排列格式

**方法 1: 尋找「姓名」標籤**
```javascript
// 找到「姓名」字樣
// 移除標籤、電話、空格
// 提取中文姓名
```
- 優先級：⭐⭐⭐
- 適用：「姓名 陳信雄」格式

**方法 2: 上下文搜索**
```javascript
// 找到「姓名」或「收件人」
// 檢查當前行、下一行、下兩行
// 提取純中文片段
```
- 優先級：⭐⭐
- 適用：分散式標籤

**方法 3: 純中文行匹配**
```javascript
// 找單獨一行 2-4 個中文字
// 排除標籤關鍵字
```
- 優先級：⭐
- 適用：簡單格式

**方法 4: 貨號後搜索（表格格式）** ⭐ 最重要
```javascript
// 找到貨號所在行
// 往後搜索 2-6 行
// 清理混合文字（移除英文、數字、符號）
// 提取 2-4 個中文字
```
- 優先級：⭐⭐⭐⭐⭐
- 適用：「陳 信 雄 | L# _」混合格式
- 處理流程：
  ```
  輸入: "陳 信 雄 | L# _"
  ↓ 移除數字
  "陳 信 雄 | L# _"
  ↓ 移除英文字母
  "陳 信 雄 | # _"
  ↓ 移除特殊符號
  "陳 信 雄"
  ↓ 移除空格
  "陳信雄" ✅
  ```

**方法 5: 寬鬆匹配**
```javascript
// 在整行文字中找中文名字
// 最寬鬆的備用方案
```
- 優先級：⭐
- 適用：無明確標籤的格式

#### 4. 區域邊界識別

**寄件人邊界**
```javascript
// 找到「寄件人」「寄貨人」「寄」字所在行
// 設為搜索下邊界
// 所有方法只在此行之前搜索
```

**右側欄位過濾**
```javascript
function isRightColumnContent(line) {
  // 排除：
  // - 件數欄位（件、長、寬、高、S60/S70/S80）
  // - 金額欄位（代收）
  // - 日期欄位（指配、到著、箱配、10/22）
  // - 純數字（1）
}
```

**標籤結構**
```
┌─────────────────────┬─────────────┐
│ 收貨人              │ 1 件        │ ← 過濾
│ 陳信雄              │ 長 S60      │ ← 過濾
│ 0909906666          │ 代收 1200   │ ← 過濾
│ 新北市中和區...     │ 指配10/22   │ ← 過濾
├─────────────────────┼─────────────┤ ← 寄件人邊界
│ 寄貨人              │             │
│ 旭迪有限公司        │             │ ← 忽略
│ 02-27922618         │             │ ← 忽略
└─────────────────────┴─────────────┘
```

#### 5. 地址提取
```javascript
// 找包含「市」「區」「路」「街」「號」「巷」「弄」的行
// 選擇最長的一行
// 清理：移除「地址」標籤、特殊符號、空格
```

範例：
```
OCR: "新北 市 中 和 區 員 山 路 514 巷 15 號 ... t 1200 ..."
清理: "新北市中和區員山路514巷15號" ✅
```

#### 6. 件數提取
```javascript
// 方法 1: 找「件數」標籤後的數字
// 方法 2: 找單獨的數字行（1-99）
```

#### 7. 排除規則

**公司名稱排除**
```javascript
const excludeKeywords = [
  '公司', '有限', '股份', '企業', '商行', '工作室'
];
```

**地理位置排除**
```javascript
// 排除城市、區域名稱（避免誤認為姓名）
'新北市', '台北市', '高雄市', '台中市',
'中和區', '員山路', '淡水區', '楊格', '帥園'
```

**標籤詞排除**
```javascript
'姓名', '貨號', '地址', '件數',
'收件人', '寄件人', '電話', '手機', '備註'
```

---

## 使用者介面

### 主要區塊

#### 1. Header
```html
<header>
  <h1>📦 新竹物流貨態查詢通知</h1>
  <p>輸入單號，自動監控配送狀態，送達時立即通知</p>
</header>
```

#### 2. 輸入區
```html
<div class="input-section">
  <label>請輸入 10 碼貨號：</label>
  <input type="text" id="trackingNumber" maxlength="10" pattern="[0-9]{10}">
  <button id="addBtn">➕ 新增追蹤</button>
  <button id="uploadImageBtn">📷 上傳圖片</button>
  <input type="file" id="mainImageUpload" accept="image/*" style="display: none;">
</div>
```

#### 3. 通知設定
```html
<div class="notification-section">
  <button id="enableNotification">🔔 啟用桌面通知</button>
  <p id="notificationStatus"></p>
</div>
```

#### 4. 追蹤清單
```html
<div class="tracking-list">
  <h2>追蹤清單</h2>
  <div id="trackingItems">
    <!-- 動態生成追蹤項目 -->
  </div>
</div>
```

#### 5. 追蹤項目範本
```html
<div class="tracking-item" data-tracking-number="6717596830">
  <div class="tracking-header">
    <span class="tracking-number">6717596830</span>
    <span class="status-badge pending">查詢中</span>
  </div>

  <div class="tracking-meta">
    <div class="meta-item">
      <label>姓名：</label>
      <input type="text" class="meta-name" placeholder="未識別">
    </div>
    <div class="meta-item">
      <label>地址：</label>
      <input type="text" class="meta-address" placeholder="未識別">
    </div>
    <div class="meta-item">
      <label>件數：</label>
      <input type="number" class="meta-quantity" min="1" value="1">
    </div>
    <button class="btn-upload">📷 上傳圖片</button>
  </div>

  <div class="tracking-body">
    <div class="tracking-info">
      <p>最後更新：<span class="update-time">--</span></p>
      <div class="status-timeline">
        <h4>貨態歷程</h4>
        <div class="timeline-items">
          <!-- 貨態記錄 -->
        </div>
      </div>
    </div>

    <div class="tracking-actions">
      <button class="btn-icon auto-fetch-btn" title="自動查詢">🤖</button>
      <button class="btn-icon query-btn" title="前往官網">🔍</button>
      <button class="btn-icon update-btn" title="手動新增">➕</button>
      <button class="btn-icon delete-btn" title="刪除">🗑️</button>
    </div>
  </div>
</div>
```

#### 6. 自動輪詢設定
```html
<div class="polling-control">
  <label>
    <input type="checkbox" id="autoPolling">
    自動輪詢（每
    <select id="pollingInterval">
      <option value="300000">5 分鐘</option>
      <option value="600000" selected>10 分鐘</option>
      <option value="1800000">30 分鐘</option>
      <option value="3600000">1 小時</option>
    </select>
    自動查詢）
  </label>
</div>
```

### 狀態標籤樣式

```css
.status-badge.pending {
    background: #E8DFD6;
    color: #8B7355;
}

.status-badge.delivered {
    background: #D4E3DB;
    color: #5A7A65;
}

.status-badge.in-transit {
    background: #DAE2E6;
    color: #6B7F8E;
}
```

---

## 資料結構

### TrackingItem
```javascript
{
  trackingNumber: string,      // 10碼貨號
  name: string,                 // 收件人姓名
  address: string,              // 收件地址
  quantity: number,             // 件數
  addedAt: string,              // ISO 8601 時間戳
  statusHistory: Array<Status>, // 貨態歷程
  isDelivered: boolean          // 是否已送達
}
```

### Status
```javascript
{
  time: string,    // 時間（格式：2025/10/22 12:37）
  status: string   // 狀態（已集貨/轉運中/配送中/順利送達）
}
```

### LocalStorage Keys
```javascript
'hct-trackingItems': JSON.stringify(trackingItems)
```

---

## 部署與維護

### 部署流程

1. **開發環境**
```bash
# 本地測試
open index.html
```

2. **Git 版本控制**
```bash
git add .
git commit -m "描述"
git push origin main
```

3. **Vercel 自動部署**
- GitHub push 觸發
- 自動建置
- 部署到 CDN
- 更新 https://hct-tracker-lgfa.vercel.app/

### 檔案結構
```
hct-tracker/
├── index.html           # 主頁面
├── style.css            # 樣式表
├── script.js            # 主要邏輯
├── api/
│   ├── query-hct.js     # 舊版 API（未使用）
│   └── query-hct-v2.js  # 新版 API（未完成）
├── vercel.json          # Vercel 設定
├── package.json         # 依賴管理
├── .gitignore          # Git 忽略清單
└── PRD.md              # 產品需求文件（本文件）
```

### 環境需求
- Node.js 18+（Serverless Functions）
- 現代瀏覽器（支援 ES6+、LocalStorage、Notification API）

---

## 已知限制

### 1. 後端 API 未完成 ⚠️
**問題**：新竹物流網站使用 JavaScript 動態渲染資料
```javascript
// 問題：fetch 只能取得初始 HTML
const response = await fetch(hctUrl);
const html = await response.text();
// html 中沒有貨態資料（由 JS 後續載入）
```

**嘗試過的方案**：
- ✅ DES 加密（舊版 API）→ 網站改版
- ✅ 直接 fetch 新版網站 → 資料由 JS 渲染
- ❌ 未嘗試：Puppeteer（無頭瀏覽器）

**影響**：
- 自動查詢功能無法使用
- 使用者需手動前往官網查詢
- 可手動新增貨態記錄

### 2. OCR 準確度
**常見錯誤**：
- 「師」→「帥」（帥園市）
- 「楊」→「楊格」（楊格區）
- 「梅」→「莓/煤」

**解決方案**：
- ✅ 允許手動編輯所有欄位
- ✅ 排除常見錯誤地名

### 3. 瀏覽器相容性
**需求**：
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

**不支援**：
- IE 11（不支援 ES6）
- 舊版行動瀏覽器

### 4. LocalStorage 限制
- **容量**：約 5-10MB
- **隱私模式**：資料不持久
- **跨裝置**：無法同步

---

## 未來規劃

### Phase 1: 核心功能完善
- ✅ OCR 圖片識別
- ✅ 手動新增貨態
- ✅ 桌面通知
- ⏳ 自動查詢 API（待新竹物流 API 調查）

### Phase 2: 使用者體驗優化
- [ ] 批量上傳圖片
- [ ] OCR 結果預覽與確認
- [ ] 歷史記錄匯出（CSV/Excel）
- [ ] 暗色模式

### Phase 3: 進階功能
- [ ] 多家物流支援（黑貓、順豐）
- [ ] 使用者帳號系統（Firebase）
- [ ] 跨裝置同步
- [ ] 手機 App（PWA）

### Phase 4: 商業化
- [ ] 電商平台整合
- [ ] API 開放（付費）
- [ ] 批量查詢方案

---

## 技術決策記錄

### 為何選擇 Vanilla JS 而非框架？
- ✅ 專案規模小，不需要 React/Vue
- ✅ 載入速度快（無框架體積）
- ✅ 學習曲線低
- ❌ 缺點：狀態管理較複雜

### 為何選擇 LocalStorage 而非後端？
- ✅ 無需伺服器成本
- ✅ 隱私保護（資料不上傳）
- ✅ 快速開發
- ❌ 缺點：無法跨裝置同步

### 為何選擇 Tesseract.js？
- ✅ 純前端 OCR（無需 API 金鑰）
- ✅ 支援繁體中文
- ✅ 免費開源
- ❌ 缺點：準確度不如商業服務（Google Vision API）

### 為何選擇 Vercel？
- ✅ 免費額度充足
- ✅ 自動 CI/CD
- ✅ Serverless Functions 支援
- ✅ 全球 CDN

---

## 開發者指南

### 本地開發
```bash
# Clone 專案
git clone https://github.com/ishchiu/hct-tracker.git
cd hct-tracker

# 安裝依賴（僅 API 需要）
npm install

# 本地執行
open index.html
```

### Debug OCR
```javascript
// 在 Console 檢查 OCR 結果
console.log('OCR 結果:', text);
console.log('清理後的行:', lines);
console.log('解析結果:', parsed);
```

### 修改 OCR 邏輯
1. 編輯 `script.js` 的 `parseOCRText()` 函數
2. 調整方法 0-5 的優先順序
3. 修改排除關鍵字清單

### 新增貨態狀態
```javascript
// 在 addManualStatus() 中新增
const statusOptions = [
  '已集貨',
  '轉運中',
  '配送中',
  '順利送達',
  '配送失敗',  // 新增
  '退回中'      // 新增
];
```

---

## 常見問題 (FAQ)

### Q1: 為什麼自動查詢不能用？
**A**: 新竹物流網站使用 JavaScript 渲染資料，簡單的 fetch 無法取得完整內容。目前建議手動前往官網查詢，或手動新增貨態記錄。

### Q2: OCR 識別不準確怎麼辦？
**A**: 所有欄位都可以手動編輯。建議：
1. 上傳清晰的圖片
2. 確保圖片包含完整標籤
3. 識別後立即檢查並修正

### Q3: 資料會不會遺失？
**A**: 資料存在瀏覽器的 LocalStorage，除非：
- 清除瀏覽器資料
- 使用隱私/無痕模式
- 瀏覽器損壞

建議定期截圖或記錄重要貨號。

### Q4: 可以在手機上使用嗎？
**A**: 可以！網站支援 RWD 響應式設計。但 OCR 處理較慢，建議在電腦上使用。

### Q5: 支援其他物流公司嗎？
**A**: 目前僅支援新竹物流。其他物流公司列入未來規劃。

---

## 聯絡資訊

- **GitHub Issues**: https://github.com/ishchiu/hct-tracker/issues
- **專案網址**: https://hct-tracker-lgfa.vercel.app/

---

## 版本歷史

### v2.0 (2025-10-23) - OCR 智能識別
- ✅ 實現 OCR 圖片識別（Tesseract.js）
- ✅ 5 種姓名提取策略
- ✅ 區域邊界識別（收貨人/寄貨人分離）
- ✅ 右側欄位過濾
- ✅ 地址空格清理
- ✅ 公司名稱排除

### v1.0 (2025-10-22) - 基礎功能
- ✅ 手動新增追蹤貨號
- ✅ 手動新增貨態記錄
- ✅ 桌面通知
- ✅ LocalStorage 儲存
- ✅ Morandi 色系 UI

---

**文件結束**

最後更新：2025-10-23
維護者：Claude Code + ishchiu
