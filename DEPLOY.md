# 🚀 Vercel 部署教學

本文件將教您如何將新竹物流追蹤系統部署到 Vercel，啟用完全自動查詢功能。

## 📋 前置準備

1. **GitHub 帳號**（免費）
2. **Vercel 帳號**（免費）- 使用 GitHub 登入即可

## 🎯 部署步驟

### 步驟 1：安裝 Git 和 Node.js（如果尚未安裝）

**Mac 用戶：**
```bash
# 安裝 Homebrew（如果沒有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 Git 和 Node.js
brew install git node
```

**Windows 用戶：**
- 下載安裝 Git: https://git-scm.com/download/win
- 下載安裝 Node.js: https://nodejs.org/

### 步驟 2：初始化 Git Repository

打開終端機（Terminal），執行以下指令：

```bash
# 進入專案目錄
cd "/Users/mac/Documents/我的資料夾/vibe_coding/hct-tracker"

# 初始化 Git
git init

# 將所有檔案加入 Git
git add .

# 建立第一個 commit
git commit -m "Initial commit: HCT Tracker with Vercel API"
```

### 步驟 3：推送到 GitHub

1. **登入 GitHub**
   - 前往 https://github.com
   - 登入您的帳號

2. **建立新的 Repository**
   - 點擊右上角的 `+` → `New repository`
   - Repository name: `hct-tracker`
   - 設定為 Public 或 Private（都可以）
   - **不要**勾選 "Initialize this repository with a README"
   - 點擊 `Create repository`

3. **連接並推送**

   複製 GitHub 提供的指令，應該類似：

   ```bash
   git remote add origin https://github.com/你的用戶名/hct-tracker.git
   git branch -M main
   git push -u origin main
   ```

### 步驟 4：部署到 Vercel

1. **前往 Vercel**
   - 打開 https://vercel.com
   - 點擊 `Sign Up` 或 `Log In`
   - 選擇 `Continue with GitHub`

2. **導入專案**
   - 點擊 `Add New...` → `Project`
   - 找到您的 `hct-tracker` repository
   - 點擊 `Import`

3. **配置專案**
   - **Framework Preset**: 選擇 `Other`
   - **Root Directory**: 保持預設 `./`
   - **Build Command**: 留空（不需要）
   - **Output Directory**: 留空（不需要）
   - 點擊 `Deploy`

4. **等待部署完成**
   - Vercel 會自動部署您的專案
   - 大約需要 30-60 秒
   - 完成後會顯示 🎉 Congratulations!

### 步驟 5：取得您的網站網址

部署完成後，Vercel 會提供一個網址，例如：
```
https://hct-tracker-abc123.vercel.app
```

**重要**：您的 API 端點會是：
```
https://hct-tracker-abc123.vercel.app/api/query-hct
```

### 步驟 6：測試功能

1. 打開您的 Vercel 網址
2. 輸入 10 碼貨號（例如：6714484884）
3. 點擊「➕ 新增追蹤」
4. 點擊「🤖」按鈕測試自動查詢
5. 查看 Console（F12 → Console）確認 API 正常運作

## ✅ 驗證部署

### 測試 API 端點

在瀏覽器打開以下網址（替換成您的網址）：
```
https://your-project.vercel.app/api/query-hct?trackingNumber=6714484884
```

應該會看到 JSON 回應：
```json
{
  "success": true,
  "trackingNumber": "6714484884",
  "statusList": [
    {
      "time": "2025/04/14 10:30",
      "status": "貨件已集貨"
    }
  ],
  "timestamp": "2025-04-14T10:30:00.000Z"
}
```

## 🔄 更新部署

當您修改程式碼後，只需要：

```bash
git add .
git commit -m "更新說明"
git push
```

Vercel 會自動偵測並重新部署！

## 🐛 故障排除

### 問題 1：API 回應 404

**原因**：API 檔案路徑不正確

**解決方法**：
- 確認 `api/query-hct.js` 檔案存在
- 檢查 `vercel.json` 設定

### 問題 2：CORS 錯誤

**原因**：跨域設定有問題

**解決方法**：
- 確認 `vercel.json` 中有 CORS headers 設定
- 重新部署

### 問題 3：加密錯誤

**原因**：DES CBC 加密失敗

**解決方法**：
- 打開 Vercel Dashboard → 您的專案 → Functions
- 查看 `/api/query-hct` 的 Logs
- 檢查是否有錯誤訊息

### 問題 4：無法找到貨態

**原因**：HTML 解析失敗或貨號不存在

**解決方法**：
- 使用「🔍」按鈕手動前往官網確認貨號是否正確
- 查看 API 回應中的 `debug.htmlPreview` 欄位
- 可能需要調整 HTML 解析邏輯

## 📊 監控和除錯

### 查看 API Logs

1. 登入 Vercel Dashboard
2. 選擇您的專案
3. 點擊 `Functions` 標籤
4. 點擊 `/api/query-hct`
5. 查看即時 Logs

### 本地測試（可選）

如果想在本地測試 API：

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 進入專案目錄
cd "/Users/mac/Documents/我的資料夾/vibe_coding/hct-tracker"

# 本地運行
vercel dev
```

然後打開 `http://localhost:3000`

## 🎉 完成！

現在您的新竹物流追蹤系統已經具備完全自動查詢功能了！

### 功能清單：
- ✅ 點擊 🤖 自動查詢貨態
- ✅ 自動解析所有貨態記錄
- ✅ 自動判斷貨態類型（集貨/轉運/配送/送達）
- ✅ 自動輪詢未送達包裹
- ✅ 送達時自動桌面通知
- ✅ 完全免費（Vercel 免費方案）

## 💡 進階功能

### 自訂域名（可選）

Vercel 支援綁定自己的域名：
1. 前往 Vercel Dashboard → 您的專案
2. 點擊 `Settings` → `Domains`
3. 輸入您的域名並按照指示設定 DNS

### 環境變數（目前不需要）

如果未來需要設定環境變數：
1. 前往 Vercel Dashboard → 您的專案
2. 點擊 `Settings` → `Environment Variables`
3. 新增變數

## 📞 需要幫助？

如果遇到問題，可以：
1. 查看 Vercel 官方文件：https://vercel.com/docs
2. 查看專案的 Console Logs（F12）
3. 查看 Vercel Function Logs

---

**祝您使用愉快！🎊**
