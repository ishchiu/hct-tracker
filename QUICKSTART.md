# 🚀 5 分鐘快速部署指南

這份指南將帶您在 5 分鐘內完成部署，啟用完全自動查詢功能！

## 📋 您需要什麼？

- ✅ 一個 GitHub 帳號（免費）
- ✅ 5 分鐘的時間
- ✅ 就這樣！

## 🎯 三步驟完成部署

### 第 1 步：上傳到 GitHub（2 分鐘）

**選項 A：使用 GitHub Desktop（最簡單）**

1. 下載並安裝 [GitHub Desktop](https://desktop.github.com/)
2. 打開 GitHub Desktop
3. File → Add Local Repository
4. 選擇專案資料夾：`/Users/mac/Documents/我的資料夾/vibe_coding/hct-tracker`
5. 如果顯示「not a git repository」，點擊「create a repository」
6. 填寫：
   - Name: `hct-tracker`
   - Description: `新竹物流貨態追蹤系統`
7. 點擊「Create Repository」
8. 點擊「Publish repository」
9. 選擇 Public 或 Private（建議 Public）
10. 點擊「Publish Repository」

**選項 B：使用終端機**

```bash
cd "/Users/mac/Documents/我的資料夾/vibe_coding/hct-tracker"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用戶名/hct-tracker.git
git push -u origin main
```

### 第 2 步：部署到 Vercel（2 分鐘）

1. **登入 Vercel**
   - 前往 https://vercel.com
   - 點擊「Sign Up」
   - 選擇「Continue with GitHub」
   - 授權 Vercel 存取您的 GitHub

2. **導入專案**
   - 點擊「Add New...」→「Project」
   - 找到「hct-tracker」
   - 點擊「Import」

3. **開始部署**
   - Framework Preset: 選擇「Other」
   - 其他設定保持預設
   - 點擊「Deploy」
   - 等待 30-60 秒

4. **完成！**
   - 看到「🎉 Congratulations!」
   - 記下您的網址，例如：
     ```
     https://hct-tracker-abc123.vercel.app
     ```

### 第 3 步：測試功能（1 分鐘）

1. **打開您的網站**
   - 點擊 Vercel 提供的網址

2. **測試自動查詢**
   - 輸入測試貨號：`6714484884`
   - 點擊「➕ 新增追蹤」
   - 點擊「🤖」按鈕
   - 等待 3-5 秒
   - 應該會看到自動查詢成功的訊息！

3. **啟用自動輪詢（可選）**
   - 勾選「自動輪詢」
   - 選擇「10 分鐘」
   - 系統會每 10 分鐘自動查詢未送達包裹

## ✅ 完成檢查清單

- [ ] GitHub Repository 已建立
- [ ] Vercel 部署成功
- [ ] 可以打開網站
- [ ] 🤖 自動查詢功能正常
- [ ] （可選）自動輪詢已啟用

## 🎉 恭喜！您已完成部署

現在您可以：

✅ **自動追蹤包裹**
- 輸入貨號
- 點擊 🤖
- 自動取得所有貨態記錄

✅ **自動輪詢**
- 勾選自動輪詢
- 系統定期自動查詢
- 送達時立即通知

✅ **分享給朋友**
- 複製您的 Vercel 網址
- 朋友也可以使用！

## ❓ 遇到問題？

### 問題：🤖 按鈕無法自動查詢

**可能原因：**
1. API 尚未部署成功
2. 網路問題

**解決方法：**
1. 按 F12 打開開發者工具
2. 切換到 Console 標籤
3. 點擊 🤖 按鈕
4. 查看錯誤訊息
5. 如果看到 404 錯誤，請檢查：
   - `api/query-hct.js` 檔案是否存在
   - Vercel 是否部署成功

### 問題：Vercel 部署失敗

**解決方法：**
1. 確認所有檔案都已上傳到 GitHub
2. 檢查以下檔案是否存在：
   - `api/query-hct.js`
   - `vercel.json`
   - `package.json`
3. 重新部署：
   - Vercel Dashboard → 您的專案
   - 點擊「Redeploy」

### 問題：GitHub 上傳失敗

**解決方法：**
1. 確認已安裝 Git
2. 確認 GitHub 帳號已登入
3. 使用 GitHub Desktop 更簡單

## 📚 進階設定

### 綁定自己的網域

1. Vercel Dashboard → 您的專案
2. Settings → Domains
3. 輸入您的網域名稱
4. 按照指示設定 DNS

### 查看 API 使用情況

1. Vercel Dashboard → 您的專案
2. Analytics 標籤
3. 查看請求數量和回應時間

## 🆘 需要完整教學？

詳細步驟請參考：[DEPLOY.md](./DEPLOY.md)

---

**祝您使用愉快！🎊**

如果覺得好用，歡迎分享給朋友！
