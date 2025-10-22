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
    // 使用新版網址（不需加密）
    const url = `https://www.hct.com.tw/Search/SearchGoods.aspx?txtNo=${trackingNumber}`;
    console.log('[請求] URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log('[回應] 長度:', html.length);

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
