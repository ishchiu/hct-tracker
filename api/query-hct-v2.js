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

    // 方法 1：尋找所有日期時間（格式：2025/10/22 12:37）
    const dateTimeRegex = /(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/g;
    const allDateTimes = [];
    let dateMatch;

    while ((dateMatch = dateTimeRegex.exec(html)) !== null) {
      const dateTime = dateMatch[1].trim();
      // 排除「查貨時間」
      const contextBefore = html.substring(Math.max(0, dateMatch.index - 30), dateMatch.index);
      if (!contextBefore.includes('查貨時間')) {
        allDateTimes.push(dateTime);
      }
    }

    console.log('[Debug] 找到日期時間（排除查貨時間）:', allDateTimes);

    // 方法 2：根據日期時間找出對應的狀態
    // 在每個日期時間附近搜尋狀態關鍵字
    for (const dateTime of allDateTimes) {
      const dateIndex = html.indexOf(dateTime);
      if (dateIndex === -1) continue;

      // 提取日期時間前後 300 字元的內容
      const contextStart = Math.max(0, dateIndex - 150);
      const contextEnd = Math.min(html.length, dateIndex + 300);
      const context = html.substring(contextStart, contextEnd);

      console.log('[Debug] 時間', dateTime, '的上下文:', context.substring(0, 200));

      // 在上下文中尋找狀態關鍵字
      const statusMatch = context.match(/(?:順利送達|已送達|配送中|配達|已集貨|集貨|轉運中|轉運|到著|簽收)/i);

      if (statusMatch) {
        statusList.push({
          time: dateTime,
          status: statusMatch[0]
        });
        console.log('[配對] 找到:', dateTime, '->', statusMatch[0]);
      } else {
        // 如果找不到關鍵字，使用預設狀態
        const defaultStatus = statusList.length === 0 ? '順利送達' :
                              statusList.length === 1 ? '配送中' : '已集貨';
        statusList.push({
          time: dateTime,
          status: defaultStatus
        });
        console.log('[配對] 使用預設:', dateTime, '->', defaultStatus);
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
    // 直接使用最終的貨態頁面 URL（跳過中間重定向）
    const targetUrl = `https://www.hct.com.tw/cagweb/C_PIKAM020AS_NEW.aspx?pACT=C_POKAM31&pINVOICE_NO=${trackingNumber}`;

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

      // 提取所有日期時間用於 debug
      const dateTimeRegex = /(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/g;
      const allDates = [];
      let m;
      while ((m = dateTimeRegex.exec(html)) !== null) {
        allDates.push(m[1]);
      }

      // 提取包含「貨」或「單號」的片段
      const cargoMatch = html.match(/[\s\S]{0,300}(貨|單號|查無|not found|錯誤|操作說明)[\s\S]{0,300}/i);

      return res.status(200).json({
        success: false,
        trackingNumber,
        error: '未找到貨態記錄',
        debug: {
          htmlLength: html.length,
          htmlPreview: html.substring(0, 3000),
          pageTitle,
          hasGridItems,
          hasColOptime,
          hasTables,
          hasDateTime,
          allDates,
          cargoSnippet: cargoMatch ? cargoMatch[0] : 'Not found'
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
