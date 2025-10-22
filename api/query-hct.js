/**
 * Vercel Serverless Function
 * 新竹物流貨態查詢 API
 *
 * 端點：/api/query-hct?trackingNumber=6714484884
 */

const CryptoJS = require('crypto-js');

/**
 * DES CBC 加密函數
 * 根據新竹物流 API 文件規範
 * 使用 crypto-js 避免 Node.js 18+ 的 OpenSSL 3.0 兼容性問題
 */
function desEncrypt(text) {
  try {
    // 1. 生成 Key：當前日期減 218 天，格式：yyyyMMdd
    const today = new Date();
    const keyDate = new Date(today);
    keyDate.setDate(today.getDate() - 218);

    const year = keyDate.getFullYear();
    const month = String(keyDate.getMonth() + 1).padStart(2, '0');
    const day = String(keyDate.getDate()).padStart(2, '0');
    const keyString = `${year}${month}${day}`; // 例如：20241018

    // 2. IV（初始化向量）：固定值
    const ivString = 'PEBQNLTU';

    // 3. 準備 Key 和 IV（使用 crypto-js 的格式）
    const key = CryptoJS.enc.Utf8.parse(keyString.substring(0, 8));
    const iv = CryptoJS.enc.Utf8.parse(ivString);

    // 4. DES-CBC 加密
    const encrypted = CryptoJS.DES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // 5. 轉換為 Base64
    const encryptedBase64 = encrypted.toString();

    console.log(`[加密成功] 原文: ${text}, Key: ${keyString.substring(0, 8)}, 密文: ${encryptedBase64.substring(0, 20)}...`);

    return encryptedBase64;
  } catch (error) {
    console.error('[加密失敗]', error);
    console.error('[錯誤詳情]', error.stack);
    throw new Error(`加密失敗: ${error.message}`);
  }
}

/**
 * 解析新竹物流 HTML 回應
 */
function parseHCTResponse(html) {
  const statusList = [];

  try {
    // 使用正則表達式提取貨態記錄
    // 新竹物流的 HTML 格式（根據文件截圖）：
    // <td>2017/11/24 21:27</td><td>貨件已經簽收...</td>

    // 方法 1：尋找表格行
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;

    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[1];
      const cells = [];

      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        // 移除 HTML 標籤，保留文字
        const text = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        cells.push(text);
      }

      // 檢查是否為有效的貨態記錄（至少有時間和狀態）
      if (cells.length >= 2) {
        const timeText = cells[0];
        const statusText = cells[1];

        // 驗證是否包含日期格式
        if (timeText.match(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/) &&
            statusText.length > 3 &&
            !statusText.includes('作業時間') &&
            !statusText.includes('貨態進度')) {

          statusList.push({
            time: timeText,
            status: statusText
          });
        }
      }
    }

    // 方法 2：如果方法 1 失敗，使用更寬鬆的正則
    if (statusList.length === 0) {
      const datePattern = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)[^\n]{0,200}(集貨|轉運|配送|配達|送達|到著|簽收|異常|不在|錯誤)/g;

      let match;
      while ((match = datePattern.exec(html)) !== null) {
        statusList.push({
          time: match[1].trim(),
          status: match[0].substring(match[1].length).trim()
        });
      }
    }

    console.log(`[解析] 找到 ${statusList.length} 筆貨態記錄`);

    return statusList;

  } catch (error) {
    console.error('[解析失敗]', error);
    return [];
  }
}

/**
 * 主處理函數
 */
export default async function handler(req, res) {
  // 允許 CORS（讓前端可以呼叫）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 OPTIONS 預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只接受 GET 請求
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
  }

  const { trackingNumber } = req.query;

  // 驗證貨號
  if (!trackingNumber) {
    return res.status(400).json({
      success: false,
      error: '缺少 trackingNumber 參數'
    });
  }

  if (!/^\d{10}$/.test(trackingNumber)) {
    return res.status(400).json({
      success: false,
      error: '貨號格式錯誤（必須是 10 碼數字）'
    });
  }

  console.log(`[查詢] 貨號: ${trackingNumber}`);

  try {
    // 1. 加密貨號
    const encryptedNo = desEncrypt(trackingNumber);

    // 2. 組建 API URL
    const v = '314FABD52C024B800AE5F0D2B1AC4FF1';
    const apiUrl = `https://hctapiweb.hct.com.tw/phone/searchGoods_Main.aspx?no=${encodeURIComponent(encryptedNo)}&v=${v}`;

    console.log(`[API] URL: ${apiUrl}`);

    // 3. 呼叫新竹物流 API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-TW,zh;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[回應] 長度: ${html.length} bytes`);

    // 4. 解析 HTML
    const statusList = parseHCTResponse(html);

    if (statusList.length === 0) {
      // 回傳原始 HTML 的前 500 字元供 debug
      return res.status(200).json({
        success: false,
        trackingNumber,
        error: '未找到貨態記錄',
        debug: {
          htmlPreview: html.substring(0, 500),
          htmlLength: html.length
        }
      });
    }

    // 5. 回傳結果
    return res.status(200).json({
      success: true,
      trackingNumber,
      statusList,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[錯誤]', error);

    return res.status(500).json({
      success: false,
      trackingNumber,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
