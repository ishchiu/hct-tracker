/**
 * Vercel Serverless Function V2
 * 新竹物流貨態查詢 API（使用新版網站）
 *
 * 端點：/api/query-hct-v2?trackingNumber=6717596830
 */

/**
 * 解析新竹物流新版網站 HTML
 */
function parseNewHCTFormat(html) {
  const statusList = [];

  try {
    console.log('[解析] HTML 長度:', html.length);

    // Debug: 搜尋關鍵字和結構
    const hasColOptime = html.includes('col_optime');
    const hasGridItem = html.includes('grid-item');
    const hasGridContainer = html.includes('grid-container');

    console.log('[Debug] 包含 col_optime:', hasColOptime);
    console.log('[Debug] 包含 grid-item:', hasGridItem);
    console.log('[Debug] 包含 grid-container:', hasGridContainer);

    // 搜尋 grid-container 的內容
    const gridMatch = html.match(/<div[^>]*class="[^"]*grid-container[^"]*"[^>]*>([\s\S]{0,1000})<\/div>/i);
    if (gridMatch) {
      console.log('[Debug] grid-container 內容:', gridMatch[1].substring(0, 500));
    } else {
      console.log('[Debug] 找不到 grid-container 完整內容');

      // 嘗試找出 grid-container 開始標籤
      const gridStartMatch = html.match(/<div[^>]*class="[^"]*grid-container[^"]*"[^>]*>/);
      if (gridStartMatch) {
        const startIndex = html.indexOf(gridStartMatch[0]);
        const snippet = html.substring(startIndex, Math.min(html.length, startIndex + 800));
        console.log('[Debug] grid-container 開始處:', snippet);
      }
    }

    // 搜尋是否有 JavaScript 變數或 API 呼叫
    const hasJsonData = html.match(/var\s+\w+\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/);
    if (hasJsonData) {
      console.log('[Debug] 找到 JavaScript 資料:', hasJsonData[0].substring(0, 200));
    }

    // 搜尋 AJAX 呼叫或 fetch 請求
    const ajaxMatch = html.match(/(?:fetch|ajax|XMLHttpRequest|axios|jquery|getJSON)\s*\([^)]*["']([^"']+)["']/gi);
    if (ajaxMatch) {
      console.log('[Debug] 找到 AJAX 呼叫:', ajaxMatch);
    }

    // 搜尋 .aspx 或 .asmx 端點（ASP.NET Web Services）
    const apiEndpoints = html.match(/["']([^"']*\.(?:aspx|asmx|ashx)[^"']*)["']/gi);
    if (apiEndpoints) {
      console.log('[Debug] 找到 API 端點:', apiEndpoints.slice(0, 10));
    }

    // 搜尋包含 "txtNo" 或貨號的 JavaScript 程式碼
    const trackingCodeMatch = html.match(/txtNo[\s\S]{0,200}/);
    if (trackingCodeMatch) {
      console.log('[Debug] txtNo 相關程式碼:', trackingCodeMatch[0]);
    }

    // 方法 1：提取 grid-item 結構（新版網站）
    // 時間格式：<div class="grid-item col_optime">2025/10/22 12:37</div>
    const timeRegex = /<div[^>]*class="[^"]*col_optime[^"]*"[^>]*>([^<]+)<\/div>/gi;
    const times = [];
    let match;

    while ((match = timeRegex.exec(html)) !== null) {
      const timeText = match[1].trim();
      if (timeText.match(/\d{4}\/\d{1,2}\/\d{1,2}/)) {
        times.push(timeText);
      }
    }

    console.log('[提取] 找到時間:', times);

    // 方法 2：提取所有狀態關鍵字（包含更多變體）
    const statusKeywords = html.match(/(?:順利送達|已送達|配送中|配達|已集貨|集貨|轉運中|轉運|到著|簽收)/gi) || [];
    console.log('[提取] 找到狀態關鍵字:', statusKeywords);

    // 方法 3：如果 grid-item 方法失敗，嘗試表格解析
    if (times.length === 0) {
      console.log('[備用] 嘗試表格解析...');

      // 提取表格中的時間
      const tableTimeRegex = /<td[^>]*>(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)<\/td>/gi;
      while ((match = tableTimeRegex.exec(html)) !== null) {
        times.push(match[1].trim());
      }

      console.log('[備用] 找到時間:', times);
    }

    // 配對時間和狀態
    const minLength = Math.min(times.length, statusKeywords.length);

    for (let i = 0; i < minLength; i++) {
      statusList.push({
        time: times[i],
        status: statusKeywords[i]
      });
    }

    // 如果只有時間沒有狀態，用位置推測
    if (times.length > 0 && statusKeywords.length === 0) {
      console.log('[推測] 根據時間數量推測狀態...');
      for (let i = 0; i < times.length; i++) {
        const guessedStatus = i === 0 ? '順利送達' : i === 1 ? '配送中' : '已集貨';
        statusList.push({
          time: times[i],
          status: guessedStatus
        });
      }
    }

    console.log('[結果] 解析出', statusList.length, '筆記錄');

    return statusList;
  } catch (error) {
    console.error('[錯誤] 解析失敗:', error);
    return [];
  }
}

/**
 * 主處理函數
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { trackingNumber } = req.query;

  if (!trackingNumber || !/^\d{10}$/.test(trackingNumber)) {
    return res.status(400).json({ success: false, error: '請提供正確的 10 碼貨號' });
  }

  console.log('[查詢] 貨號:', trackingNumber);

  try {
    // 使用完整的絕對 URL（GET 請求）
    const targetUrl = `https://www.hct.com.tw/Search/SearchGoods.aspx?txtNo=${trackingNumber}`;

    console.log('[請求] 完整 URL:', targetUrl);
    console.log('[請求] Method: GET');
    console.log('[請求] 貨號:', trackingNumber);
    console.log('[環境] Vercel Region:', process.env.VERCEL_REGION || 'local');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow'
    });

    console.log('[回應] Status:', response.status);
    console.log('[回應] StatusText:', response.statusText);
    console.log('[回應] Final URL:', response.url);
    console.log('[回應] Redirected:', response.redirected);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('[回應] 內容長度:', html.length);

    // 提取 title 用於 debug
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : 'No title found';
    console.log('[回應] 頁面標題:', pageTitle);

    // 檢查是否是我們自己的網站
    if (html.includes('新竹物流貨態查詢通知') || html.includes('script.js')) {
      throw new Error('錯誤：fetch 請求返回了自己的網站內容，而不是新竹物流網站');
    }

    const statusList = parseNewHCTFormat(html);

    if (statusList.length === 0) {
      // 提取一些關鍵資訊用於 debug
      const hasGridItems = html.includes('grid-item');
      const hasColOptime = html.includes('col_optime');
      const hasTables = html.includes('<table');
      const hasDateTime = /\d{4}\/\d{1,2}\/\d{1,2}/.test(html);

      return res.status(200).json({
        success: false,
        trackingNumber,
        error: '未找到貨態記錄',
        debug: {
          htmlLength: html.length,
          htmlPreview: html.substring(0, 3000),
          hasGridItems,
          hasColOptime,
          hasTables,
          hasDateTime
        }
      });
    }

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
      error: error.message
    });
  }
}
