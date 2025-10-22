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

    // 新版網站使用 grid-item 結構
    // 時間格式：<div class="grid-item col_optime">2025/10/22 12:37</div>

    // 提取所有時間
    const timeRegex = /<div[^>]*class="grid-item col_optime"[^>]*>([^<]+)<\/div>/g;
    const times = [];
    let match;

    while ((match = timeRegex.exec(html)) !== null) {
      const timeText = match[1].trim();
      if (timeText.match(/\d{4}\/\d{1,2}\/\d{1,2}/)) {
        times.push(timeText);
      }
    }

    console.log('[提取] 找到時間:', times);

    // 提取狀態關鍵字
    const statusKeywords = html.match(/(?:順利送達|配送中|已集貨|轉運中|到著|配達)/g) || [];
    console.log('[提取] 找到狀態關鍵字:', statusKeywords);

    // 配對時間和狀態
    const minLength = Math.min(times.length, statusKeywords.length);

    for (let i = 0; i < minLength; i++) {
      statusList.push({
        time: times[i],
        status: statusKeywords[i]
      });
    }

    // 如果狀態數量少於時間，用位置推測
    if (times.length > statusKeywords.length) {
      for (let i = statusKeywords.length; i < times.length; i++) {
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
      return res.status(200).json({
        success: false,
        trackingNumber,
        error: '未找到貨態記錄',
        debug: {
          htmlLength: html.length,
          htmlPreview: html.substring(0, 2000)
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
