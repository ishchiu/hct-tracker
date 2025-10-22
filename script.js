// 新竹物流貨態查詢通知系統
class HCTTracker {
    constructor() {
        this.trackingItems = this.loadFromStorage();
        this.pollingTimer = null;
        this.init();
    }

    init() {
        // 綁定事件
        document.getElementById('addBtn').addEventListener('click', () => this.addTracking());
        document.getElementById('trackingNumber').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTracking();
        });
        document.getElementById('enableNotification').addEventListener('click', () => this.requestNotificationPermission());
        document.getElementById('autoPolling').addEventListener('change', (e) => this.togglePolling(e.target.checked));

        // 綁定主圖片上傳
        document.getElementById('uploadImageBtn').addEventListener('click', () => {
            document.getElementById('mainImageUpload').click();
        });
        document.getElementById('mainImageUpload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processMainImageUpload(file);
            }
        });

        // 顯示載入的資料數量（調試用）
        console.log('已載入追蹤項目：', this.trackingItems.length);
        console.log('追蹤資料：', this.trackingItems);

        // 渲染現有項目
        this.renderAll();

        // 檢查通知權限狀態
        this.updateNotificationStatus();
    }

    // 新增追蹤
    addTracking() {
        const input = document.getElementById('trackingNumber');
        const trackingNumber = input.value.trim();

        // 驗證貨號
        if (!/^\d{10}$/.test(trackingNumber)) {
            alert('請輸入正確的 10 碼貨號（純數字）');
            return;
        }

        // 檢查是否已存在
        if (this.trackingItems.find(item => item.trackingNumber === trackingNumber)) {
            alert('此貨號已在追蹤清單中');
            return;
        }

        // 新增項目
        const newItem = {
            trackingNumber,
            name: '',  // 收件人姓名
            address: '',  // 收件地址
            quantity: 1,  // 件數
            addedAt: new Date().toISOString(),
            statusHistory: [],  // 改為儲存完整歷程
            isDelivered: false
        };

        this.trackingItems.push(newItem);
        this.saveToStorage();
        this.renderAll();

        // 清空輸入框
        input.value = '';

        // 提示使用者
        alert(`已新增追蹤：${trackingNumber}\n\n點擊「🔍」按鈕前往查詢，然後點「➕」新增貨態記錄。`);
    }

    // 開啟查詢頁面
    openQueryPage(trackingNumber) {
        // 使用新竹物流的實際查詢 URL (使用 HTTPS)
        const url = `https://cagweb01.hct.com.tw/pls/hctweb/C_PIKAM020AS?pACT=C_POKAM31&pINVOICE_NO=${trackingNumber}`;
        window.open(url, '_blank');
    }

    // 新增貨態記錄
    addStatusRecord(trackingNumber) {
        const item = this.trackingItems.find(i => i.trackingNumber === trackingNumber);
        if (!item) return;

        // 預設狀態選項
        const statusOptions = [
            { code: 'pickup', name: '📦 已集貨', icon: '📦', keywords: ['集貨', '取件', '已取'] },
            { code: 'transit', name: '🚚 轉運中', icon: '🚚', keywords: ['轉運', '發送', '抵達', '到著'] },
            { code: 'delivery', name: '🏃 配送中', icon: '🏃', keywords: ['配達', '配送', '派送'] },
            { code: 'delivered', name: '✅ 順利送達', icon: '✅', keywords: ['送達', '配交', '簽收', '完成'] },
            { code: 'exception', name: '⚠️ 異常狀況', icon: '⚠️', keywords: ['客戶不在', '地址錯誤', '異常'] },
        ];

        const statusText = prompt(
            `請輸入 ${trackingNumber} 的貨態：\n\n` +
            statusOptions.map((opt, idx) => `${idx + 1}. ${opt.name}`).join('\n') +
            '\n\n請輸入編號 (1-5) 或直接貼上貨態文字：'
        );

        if (!statusText) return;

        // 解析輸入
        let statusName, statusCode, icon;
        const num = parseInt(statusText);

        if (num >= 1 && num <= statusOptions.length) {
            // 使用者選擇預設選項
            const selected = statusOptions[num - 1];
            statusName = selected.name;
            statusCode = selected.code;
            icon = selected.icon;
        } else {
            // 使用者輸入自訂文字，智能判斷類型
            statusName = statusText;

            // 智能偵測狀態類型
            const matched = statusOptions.find(opt =>
                opt.keywords.some(keyword => statusText.includes(keyword))
            );

            if (matched) {
                statusCode = matched.code;
                icon = matched.icon;
            } else {
                statusCode = 'custom';
                icon = '📝';
            }
        }

        // 建立新的狀態記錄
        const record = {
            timestamp: new Date().toISOString(),
            status: statusName,
            code: statusCode,
            icon: icon
        };

        // 加入歷程
        item.statusHistory.push(record);

        // 檢查是否已送達
        const wasDelivered = item.isDelivered;
        item.isDelivered = statusCode === 'delivered' ||
                          statusName.includes('送達') ||
                          statusName.includes('配交') ||
                          statusName.includes('簽收');

        this.saveToStorage();
        this.renderAll();

        // 如果剛變成送達狀態，顯示通知
        if (item.isDelivered && !wasDelivered) {
            this.showNotification(`貨號 ${trackingNumber}`, '您的包裹已順利送達！🎉');
        }
    }

    // 刪除追蹤
    deleteTracking(trackingNumber) {
        if (!confirm(`確定要刪除追蹤：${trackingNumber}？`)) return;

        this.trackingItems = this.trackingItems.filter(item => item.trackingNumber !== trackingNumber);
        this.saveToStorage();
        this.renderAll();
    }

    // 渲染所有項目
    renderAll() {
        const container = document.getElementById('trackingItems');
        container.innerHTML = '';

        this.trackingItems.forEach(item => {
            const element = this.createTrackingElement(item);
            container.appendChild(element);
        });
    }

    // 創建追蹤項目元素
    createTrackingElement(item) {
        const template = document.getElementById('trackingItemTemplate');
        const clone = template.content.cloneNode(true);
        const div = clone.querySelector('.tracking-item');

        div.dataset.trackingNumber = item.trackingNumber;
        div.querySelector('.tracking-number').textContent = item.trackingNumber;

        // 填入貨件資訊
        const nameInput = div.querySelector('.meta-name');
        const addressInput = div.querySelector('.meta-address');
        const quantityInput = div.querySelector('.meta-quantity');

        nameInput.value = item.name || '';
        addressInput.value = item.address || '';
        quantityInput.value = item.quantity || 1;

        // 監聽輸入變化並儲存
        nameInput.addEventListener('change', (e) => {
            item.name = e.target.value;
            this.saveToStorage();
        });
        addressInput.addEventListener('change', (e) => {
            item.address = e.target.value;
            this.saveToStorage();
        });
        quantityInput.addEventListener('change', (e) => {
            item.quantity = parseInt(e.target.value) || 1;
            this.saveToStorage();
        });

        // 綁定圖片上傳功能
        const uploadBtn = div.querySelector('.btn-upload');
        const fileInput = div.querySelector('.image-upload');

        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processImageOCR(file, item, nameInput, addressInput, quantityInput);
            }
        });

        // 狀態徽章
        const badge = div.querySelector('.status-badge');
        if (item.isDelivered) {
            badge.textContent = '✅ 已送達';
            badge.classList.add('delivered');
        } else if (item.statusHistory.length > 0) {
            const latest = item.statusHistory[item.statusHistory.length - 1];
            badge.textContent = latest.status.replace(/[📦🚚🏃✅⚠️📝]\s*/, '');
            badge.classList.add('in-transit');
        } else {
            badge.textContent = '待查詢';
            badge.classList.add('pending');
        }

        // 最後更新時間
        const updateTime = div.querySelector('.update-time');
        if (item.statusHistory.length > 0) {
            const latest = item.statusHistory[item.statusHistory.length - 1];
            updateTime.textContent = this.formatDate(latest.timestamp);
        } else {
            updateTime.textContent = '尚未更新';
        }

        // 渲染貨態時間軸
        const timelineContainer = div.querySelector('.timeline-items');
        if (item.statusHistory.length > 0) {
            // 反轉順序，最新的在上面
            const reversedHistory = [...item.statusHistory].reverse();
            reversedHistory.forEach(record => {
                const timelineItem = this.createTimelineItem(record);
                timelineContainer.appendChild(timelineItem);
            });
        }

        // 綁定按鈕事件
        div.querySelector('.auto-fetch-btn').addEventListener('click', () => {
            this.quickAddStatus(item.trackingNumber);
        });
        div.querySelector('.query-btn').addEventListener('click', () => {
            this.openQueryPage(item.trackingNumber);
        });
        div.querySelector('.update-btn').addEventListener('click', () => {
            this.addStatusRecord(item.trackingNumber);
        });
        div.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteTracking(item.trackingNumber);
        });

        return div;
    }

    // 自動查詢貨態（使用 Vercel API）
    async quickAddStatus(trackingNumber) {
        const item = this.trackingItems.find(i => i.trackingNumber === trackingNumber);
        if (!item) return;

        // 找到對應的按鈕並顯示載入動畫
        const itemElement = document.querySelector(`[data-tracking-number="${trackingNumber}"]`);
        const autoFetchBtn = itemElement?.querySelector('.auto-fetch-btn');

        if (autoFetchBtn) {
            autoFetchBtn.classList.add('loading');
            autoFetchBtn.textContent = '⏳';
        }

        try {
            console.log(`🤖 開始自動查詢貨號：${trackingNumber}`);

            // 呼叫 Vercel API V2（使用新版網站格式）
            // 本地測試：http://localhost:3000/api/query-hct-v2
            // 部署後：https://your-project.vercel.app/api/query-hct-v2
            const apiUrl = `/api/query-hct-v2?trackingNumber=${trackingNumber}`;

            console.log(`📡 API URL: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            console.log('📊 API 回應:', data);

            if (!data.success) {
                throw new Error(data.error || '查詢失敗');
            }

            const statusList = data.statusList || [];

            if (statusList.length === 0) {
                alert(`❌ 查詢失敗\n\n貨號：${trackingNumber}\n\n未找到貨態記錄，可能原因：\n• 貨號不存在\n• 尚未有貨態更新\n• API 格式已變更\n\n請點擊「🔍」手動前往官網確認`);
                return;
            }

            // 自動新增所有貨態記錄
            const wasDelivered = item.isDelivered;
            let newRecordCount = 0;

            statusList.forEach(apiStatus => {
                // 轉換時間格式
                const timestamp = this.parseHCTDateTime(apiStatus.time);
                const { code, icon } = this.detectStatusType(apiStatus.status);

                // 檢查是否已存在相同的記錄
                const exists = item.statusHistory.some(record =>
                    record.status === apiStatus.status &&
                    Math.abs(new Date(record.timestamp) - new Date(timestamp)) < 60000
                );

                if (!exists) {
                    item.statusHistory.push({
                        timestamp,
                        status: apiStatus.status,
                        code,
                        icon
                    });
                    newRecordCount++;
                }
            });

            // 更新送達狀態
            const hasDelivered = statusList.some(s =>
                s.status.includes('送達') ||
                s.status.includes('配交') ||
                s.status.includes('簽收')
            );

            item.isDelivered = hasDelivered;

            this.saveToStorage();
            this.renderAll();

            // 顯示結果
            if (newRecordCount > 0) {
                const latestStatus = statusList[statusList.length - 1];
                alert(`✅ 自動查詢成功！\n\n已新增 ${newRecordCount} 筆貨態記錄\n\n最新狀態：\n${latestStatus.time}\n${latestStatus.status}`);

                // 如果剛變成送達狀態，顯示通知
                if (item.isDelivered && !wasDelivered) {
                    this.showNotification(`貨號 ${trackingNumber}`, '您的包裹已順利送達！🎉');
                }
            } else {
                const latestStatus = statusList[statusList.length - 1];
                alert(`ℹ️ 查詢完成\n\n沒有新的貨態記錄\n\n目前狀態：\n${latestStatus.time}\n${latestStatus.status}`);
            }

        } catch (error) {
            console.error('❌ 自動查詢失敗:', error);
            alert(`❌ 自動查詢失敗\n\n錯誤訊息：${error.message}\n\n可能原因：\n• API 尚未部署到 Vercel\n• 網路連線問題\n• 新竹物流 API 暫時無法使用\n\n請點擊「🔍」手動前往官網查詢`);
        } finally {
            // 恢復按鈕狀態
            if (autoFetchBtn) {
                autoFetchBtn.classList.remove('loading');
                autoFetchBtn.textContent = '🤖';
            }
        }
    }

    // 自動查詢貨態（保留原功能，但預設不使用）
    async autoFetchStatus(trackingNumber) {
        const item = this.trackingItems.find(i => i.trackingNumber === trackingNumber);
        if (!item) return;

        // 找到對應的按鈕並顯示載入動畫
        const itemElement = document.querySelector(`[data-tracking-number="${trackingNumber}"]`);
        const autoFetchBtn = itemElement?.querySelector('.auto-fetch-btn');

        if (autoFetchBtn) {
            autoFetchBtn.classList.add('loading');
            autoFetchBtn.textContent = '⏳';
        }

        try {
            // 使用新竹物流的實際查詢 URL (HTTPS)
            const url = `https://cagweb01.hct.com.tw/pls/hctweb/C_PIKAM020AS?pACT=C_POKAM31&pINVOICE_NO=${trackingNumber}`;

            console.log(`🤖 開始自動查詢貨號：${trackingNumber}`);

            // 多個 CORS 代理服務列表
            const proxies = [
                {
                    name: 'AllOrigins',
                    url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                    timeout: 15000
                },
                {
                    name: 'CORS.sh',
                    url: `https://cors.sh/${url}`,
                    timeout: 15000,
                    headers: { 'x-requested-with': 'XMLHttpRequest' }
                },
                {
                    name: 'ThingProxy',
                    url: `https://thingproxy.freeboard.io/fetch/${url}`,
                    timeout: 15000
                },
                {
                    name: 'CORSProxy.io',
                    url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
                    timeout: 15000
                },
                {
                    name: 'AllOrigins JSON',
                    url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
                    timeout: 15000,
                    parseJson: true
                }
            ];

            let html = null;
            let successProxy = null;
            const errors = [];

            console.log(`📡 準備嘗試 ${proxies.length} 個代理服務...`);

            // 逐一嘗試每個代理
            for (let i = 0; i < proxies.length; i++) {
                const proxy = proxies[i];
                console.log(`🔄 [${i + 1}/${proxies.length}] 嘗試代理：${proxy.name}`);

                try {
                    // 使用 Promise.race 實現超時控制
                    const fetchPromise = fetch(proxy.url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/html,application/json',
                            ...proxy.headers
                        }
                    });

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('請求超時')), proxy.timeout)
                    );

                    const response = await Promise.race([fetchPromise, timeoutPromise]);

                    if (response.ok) {
                        if (proxy.parseJson) {
                            const data = await response.json();
                            html = data.contents;
                        } else {
                            html = await response.text();
                        }

                        // 驗證 HTML 是否有效
                        if (html && html.length > 200) {
                            successProxy = proxy.name;
                            console.log(`✅ 成功透過 ${proxy.name} 取得資料（長度：${html.length}）`);
                            break;
                        } else {
                            console.log(`⚠️ 回應內容太短（長度：${html?.length || 0}）`);
                            html = null;
                        }
                    }
                } catch (e) {
                    console.log(`❌ ${proxy.name} 失敗：${e.message}`);
                    errors.push({ proxy: proxy.name, error: e.message });
                }

                // 代理之間稍微延遲
                if (i < proxies.length - 1 && !html) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            }

            if (!html) {
                console.log('❌ 所有代理都失敗');
                throw new Error(`無法透過代理取得資料\n\n已嘗試 ${proxies.length} 個代理服務：\n${proxies.map((p, i) => `${i + 1}. ${p.name}${errors[i] ? ' - ' + errors[i].error : ''}`).join('\n')}\n\n⚠️ 建議：\n1. 點擊「🔍」按鈕手動前往官網查詢\n2. 查看貨態後點「➕」手動新增記錄`);
            }

            console.log(`✅ 成功使用代理：${successProxy}`);

            // 解析 HTML，提取貨態資訊
            const statusList = this.parseHCTStatusPage(html);

            if (statusList.length === 0) {
                alert(`❌ 無法解析貨態資訊\n\n查詢成功但未找到貨態記錄\n\n可能原因：\n• 貨號 ${trackingNumber} 不存在\n• 尚未有貨態更新\n• 網頁格式已變更\n\n💡 解決方法：\n1. 點擊「🔍」按鈕手動前往官網確認\n2. 檢查貨號是否正確\n3. 稍後再試\n\n✅ 成功使用的代理：${successProxy}\n🔍 請開啟瀏覽器開發者工具查看詳細日誌`);
                return;
            }

            // 自動新增所有貨態記錄
            const wasDelivered = item.isDelivered;
            let newRecordCount = 0;

            statusList.forEach(status => {
                // 檢查是否已存在相同的記錄
                const exists = item.statusHistory.some(record =>
                    record.status === status.status &&
                    Math.abs(new Date(record.timestamp) - new Date(status.timestamp)) < 60000 // 1分鐘內視為相同
                );

                if (!exists) {
                    item.statusHistory.push(status);
                    newRecordCount++;
                }
            });

            // 更新送達狀態
            item.isDelivered = statusList.some(s => s.code === 'delivered');

            this.saveToStorage();
            this.renderAll();

            // 顯示結果
            if (newRecordCount > 0) {
                alert(`✅ 自動查詢成功！\n\n已新增 ${newRecordCount} 筆貨態記錄\n最新狀態：${statusList[statusList.length - 1].status}`);

                // 如果剛變成送達狀態，顯示通知
                if (item.isDelivered && !wasDelivered) {
                    this.showNotification(`貨號 ${trackingNumber}`, '您的包裹已順利送達！🎉');
                }
            } else {
                alert(`ℹ️ 查詢完成\n\n沒有新的貨態記錄\n目前狀態：${statusList[statusList.length - 1].status}`);
            }

        } catch (error) {
            console.error('自動查詢失敗:', error);
            alert(`❌ 自動查詢失敗\n\n錯誤訊息：${error.message}\n\n請使用「🔍」按鈕手動查詢，然後點「➕」按鈕手動新增貨態。`);
        } finally {
            // 恢復按鈕狀態
            if (autoFetchBtn) {
                autoFetchBtn.classList.remove('loading');
                autoFetchBtn.textContent = '🤖';
            }
        }
    }

    // 解析新竹物流網頁的貨態資訊
    parseHCTStatusPage(html) {
        const statusList = [];

        try {
            console.log('📄 開始解析 HTML（長度：' + html.length + '）');

            // 建立一個 DOM 解析器
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 方法 1：尋找包含「作業時間」或「貨態進度」的表格
            const tables = doc.querySelectorAll('table');
            console.log(`找到 ${tables.length} 個表格`);

            let foundStatus = false;

            // 遍歷所有表格
            for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
                const table = tables[tableIdx];
                const rows = table.querySelectorAll('tr');

                console.log(`表格 ${tableIdx + 1}：${rows.length} 行`);

                rows.forEach((row, rowIdx) => {
                    const cells = row.querySelectorAll('td, th');

                    // 嘗試提取時間和狀態
                    if (cells.length >= 2) {
                        const cell1 = cells[0]?.textContent?.trim() || '';
                        const cell2 = cells[1]?.textContent?.trim() || '';
                        const cell3 = cells[2]?.textContent?.trim() || '';

                        // 檢查是否包含日期格式
                        const datePattern = /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/;
                        const timePattern = /\d{1,2}:\d{2}/;

                        // 嘗試不同的組合
                        let timeText = '';
                        let statusText = '';

                        if (datePattern.test(cell1)) {
                            timeText = cell1;
                            statusText = cell2 || cell3;
                        } else if (datePattern.test(cell2)) {
                            timeText = cell2;
                            statusText = cell3 || cell1;
                        }

                        // 過濾掉標題行
                        if (timeText && statusText &&
                            !statusText.includes('貨態') &&
                            !statusText.includes('時間') &&
                            statusText.length > 3) {

                            const timestamp = this.parseHCTDateTime(timeText);
                            const { code, icon } = this.detectStatusType(statusText);

                            statusList.push({
                                timestamp,
                                status: statusText,
                                code,
                                icon
                            });

                            foundStatus = true;
                            console.log(`✓ 找到貨態 [${rowIdx}]：${timeText} - ${statusText}`);
                        }
                    }
                });
            }

            // 方法 2：如果表格解析失敗，嘗試用正則表達式直接從文字中提取
            if (statusList.length === 0) {
                console.log('⚠️ 表格解析失敗，嘗試正則表達式...');

                const textContent = doc.body?.textContent || html;
                const dateRegex = /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[\s日]?(\d{1,2}):(\d{2})[^\n]{0,100}(集貨|轉運|配送|配達|送達|到著|簽收|異常|不在|錯誤)/g;

                let match;
                while ((match = dateRegex.exec(textContent)) !== null) {
                    const [fullMatch, year, month, day, hour, minute, keyword] = match;
                    const statusText = fullMatch.trim();
                    const timestamp = new Date(year, month - 1, day, hour, minute).toISOString();
                    const { code, icon } = this.detectStatusType(statusText);

                    statusList.push({
                        timestamp,
                        status: statusText,
                        code,
                        icon
                    });

                    console.log(`✓ 正則匹配：${statusText}`);
                }
            }

            console.log(`\n📊 解析結果：找到 ${statusList.length} 筆貨態記錄`);

            if (statusList.length === 0) {
                // Debug: 輸出部分 HTML 內容
                console.log('⚠️ 未找到任何貨態記錄');
                console.log('HTML 預覽（前 500 字元）：', html.substring(0, 500));
                console.log('Body 文字內容（前 500 字元）：', doc.body?.textContent?.substring(0, 500) || '無');
            }

            return statusList;

        } catch (error) {
            console.error('❌ 解析 HTML 失敗:', error);
            console.error('錯誤堆疊：', error.stack);
            return [];
        }
    }

    // 智能判斷貨態類型
    detectStatusType(statusText) {
        let code = 'custom';
        let icon = '📝';

        if (statusText.includes('集貨') || statusText.includes('取件')) {
            code = 'pickup';
            icon = '📦';
        } else if (statusText.includes('轉運') || statusText.includes('發送') || statusText.includes('到著') || statusText.includes('抵達')) {
            code = 'transit';
            icon = '🚚';
        } else if (statusText.includes('配達') || statusText.includes('配送')) {
            code = 'delivery';
            icon = '🏃';
        } else if (statusText.includes('送達') || statusText.includes('配交') || statusText.includes('簽收')) {
            code = 'delivered';
            icon = '✅';
        } else if (statusText.includes('異常') || statusText.includes('客戶不在') || statusText.includes('地址錯誤')) {
            code = 'exception';
            icon = '⚠️';
        }

        return { code, icon };
    }

    // 解析新竹物流的日期時間格式
    parseHCTDateTime(dateTimeStr) {
        try {
            // 格式可能是 "2025/10/20 14:30" 或 "2025/10/20 14:30:00"
            const match = dateTimeStr.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
            if (match) {
                const [, year, month, day, hour, minute] = match;
                return new Date(year, month - 1, day, hour, minute).toISOString();
            }
            return new Date().toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    // 創建時間軸項目
    createTimelineItem(record) {
        const div = document.createElement('div');
        div.className = 'timeline-item';
        if (record.code === 'delivered') {
            div.classList.add('delivered');
        } else if (record.code !== 'custom') {
            div.classList.add('in-transit');
        }

        div.innerHTML = `
            <div class="timeline-icon">${record.icon}</div>
            <div class="timeline-content">
                <div class="timeline-status">${record.status}</div>
                <div class="timeline-time">${this.formatDateTime(record.timestamp)}</div>
            </div>
        `;

        return div;
    }

    // 格式化日期（相對時間）
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins} 分鐘前`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} 小時前`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} 天前`;

        return date.toLocaleDateString('zh-TW');
    }

    // 格式化完整日期時間
    formatDateTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 本地儲存
    saveToStorage() {
        localStorage.setItem('hct_tracking_items', JSON.stringify(this.trackingItems));
    }

    loadFromStorage() {
        const data = localStorage.getItem('hct_tracking_items');
        if (!data) return [];

        try {
            const items = JSON.parse(data);

            // 遷移舊格式資料
            return items.map(item => {
                // 如果是舊格式（有 lastStatus 但沒有 statusHistory）
                if (!item.statusHistory) {
                    const migratedItem = {
                        trackingNumber: item.trackingNumber,
                        addedAt: item.addedAt,
                        statusHistory: [],
                        isDelivered: item.isDelivered || false
                    };

                    // 如果有舊的狀態記錄，轉換為新格式
                    if (item.lastStatus) {
                        migratedItem.statusHistory.push({
                            timestamp: item.lastUpdate || item.addedAt,
                            status: item.lastStatus,
                            code: item.statusCode || 'custom',
                            icon: '📝'
                        });
                    }

                    return migratedItem;
                }

                // 已經是新格式
                return item;
            });
        } catch (e) {
            console.error('載入資料失敗:', e);
            return [];
        }
    }

    // 通知權限
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('您的瀏覽器不支援桌面通知');
            return;
        }

        const permission = await Notification.requestPermission();
        this.updateNotificationStatus();

        if (permission === 'granted') {
            this.showNotification('測試通知', '桌面通知已啟用！您將在貨物送達時收到通知。');
        } else {
            alert('通知權限被拒絕，無法接收桌面通知');
        }
    }

    updateNotificationStatus() {
        const statusEl = document.getElementById('notificationStatus');
        const btnEl = document.getElementById('enableNotification');

        if (!('Notification' in window)) {
            statusEl.textContent = '您的瀏覽器不支援桌面通知';
            btnEl.disabled = true;
            return;
        }

        const permission = Notification.permission;
        if (permission === 'granted') {
            statusEl.textContent = '✅ 桌面通知已啟用';
            btnEl.disabled = true;
        } else if (permission === 'denied') {
            statusEl.textContent = '❌ 通知權限被拒絕';
            btnEl.disabled = true;
        } else {
            statusEl.textContent = '請點擊按鈕啟用桌面通知';
        }
    }

    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '📦',
                badge: '📦'
            });
        }
    }

    // 輪詢機制
    togglePolling(enabled) {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }

        if (enabled) {
            const interval = parseInt(document.getElementById('pollingInterval').value);
            const minutes = interval / 60000;

            this.pollingTimer = setInterval(() => {
                this.checkAndNotify();
            }, interval);

            alert(`✅ 已啟用定時提醒\n\n系統會每 ${minutes} 分鐘檢查一次未送達的包裹，並提醒您前往查詢。\n\n⚠️ 注意：純前端無法自動查詢貨態（需要新竹物流的 API 金鑰），您需要手動前往官網查看並更新狀態。`);

            // 立即執行一次檢查
            setTimeout(() => {
                alert('💡 提示：第一次提醒將在 ' + minutes + ' 分鐘後出現。\n\n如果想立即查詢，請點擊列表中的「🔍」按鈕。');
            }, 2000);
        } else {
            alert('已停用定時提醒');
        }
    }

    async checkAndNotify() {
        const undeliveredItems = this.trackingItems.filter(item => !item.isDelivered);

        if (undeliveredItems.length === 0) {
            // 如果沒有未送達的包裹，顯示通知並停用輪詢
            if (Notification.permission === 'granted') {
                this.showNotification('所有包裹已送達', '恭喜！所有追蹤的包裹都已送達 🎉');
            }
            alert('🎉 所有包裹已送達！\n\n自動輪詢已停用。');
            // 自動關閉輪詢
            document.getElementById('autoPolling').checked = false;
            this.togglePolling(false);
            return;
        }

        // 顯示桌面通知
        if (Notification.permission === 'granted') {
            this.showNotification(
                `🤖 自動查詢中...`,
                `正在查詢 ${undeliveredItems.length} 個未送達的包裹`
            );
        }

        console.log(`開始自動查詢 ${undeliveredItems.length} 個包裹...`);

        // 逐個自動查詢（使用新的 API）
        for (const item of undeliveredItems) {
            console.log(`查詢貨號: ${item.trackingNumber}`);
            await this.quickAddStatus(item.trackingNumber);

            // 每次查詢之間稍微延遲，避免過於頻繁
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('自動查詢完成');

        // 檢查是否有新的送達包裹
        const deliveredCount = this.trackingItems.filter(item => item.isDelivered).length;
        if (deliveredCount > 0) {
            this.showNotification(
                `✅ 查詢完成`,
                `已有 ${deliveredCount} 個包裹送達`
            );
        }
    }

    // OCR 圖片處理
    async processImageOCR(file, item, nameInput, addressInput, quantityInput) {
        try {
            // 顯示載入中
            const loadingMsg = document.createElement('div');
            loadingMsg.textContent = '🔄 正在識別圖片...';
            loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10000;';
            document.body.appendChild(loadingMsg);

            // 使用 Tesseract.js 進行 OCR
            if (!window.Tesseract) {
                // 如果 Tesseract 未載入，動態載入
                await this.loadTesseract();
            }

            const { data: { text } } = await Tesseract.recognize(file, 'chi_tra', {
                logger: m => console.log(m)
            });

            console.log('OCR 結果:', text);

            // 解析文字
            const parsed = this.parseOCRText(text);

            // 填入欄位
            if (parsed.name) {
                nameInput.value = parsed.name;
                item.name = parsed.name;
            }
            if (parsed.address) {
                addressInput.value = parsed.address;
                item.address = parsed.address;
            }
            if (parsed.quantity) {
                quantityInput.value = parsed.quantity;
                item.quantity = parsed.quantity;
            }

            this.saveToStorage();

            // 移除載入訊息
            document.body.removeChild(loadingMsg);

            alert(`✅ 識別完成！\n\n姓名：${parsed.name || '未識別'}\n地址：${parsed.address || '未識別'}\n件數：${parsed.quantity || '未識別'}`);

        } catch (error) {
            console.error('OCR 錯誤:', error);
            alert('❌ 圖片識別失敗：' + error.message);
        }
    }

    // 動態載入 Tesseract.js
    async loadTesseract() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 主圖片上傳處理（從新增追蹤區域）
    async processMainImageUpload(file) {
        try {
            // 顯示載入中
            const loadingMsg = document.createElement('div');
            loadingMsg.textContent = '🔄 正在識別圖片...';
            loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10000;';
            document.body.appendChild(loadingMsg);

            // 使用 Tesseract.js 進行 OCR
            if (!window.Tesseract) {
                await this.loadTesseract();
            }

            const { data: { text } } = await Tesseract.recognize(file, 'chi_tra', {
                logger: m => console.log(m)
            });

            console.log('OCR 結果:', text);

            // 解析文字（包含貨號）
            const parsed = this.parseOCRText(text, true);

            // 移除載入訊息
            document.body.removeChild(loadingMsg);

            // 驗證貨號
            if (!parsed.trackingNumber || !/^\d{10}$/.test(parsed.trackingNumber)) {
                alert(`❌ 無法識別貨號！\n\n請確認圖片清晰，或手動輸入貨號。\n\n識別到的內容：\n${text.substring(0, 200)}`);
                return;
            }

            // 檢查是否已存在
            if (this.trackingItems.find(item => item.trackingNumber === parsed.trackingNumber)) {
                alert(`此貨號已在追蹤清單中：${parsed.trackingNumber}`);
                return;
            }

            // 新增項目
            const newItem = {
                trackingNumber: parsed.trackingNumber,
                name: parsed.name || '',
                address: parsed.address || '',
                quantity: parsed.quantity || 1,
                addedAt: new Date().toISOString(),
                statusHistory: [],
                isDelivered: false
            };

            this.trackingItems.push(newItem);
            this.saveToStorage();
            this.renderAll();

            // 顯示成功訊息
            alert(`✅ 已成功新增追蹤！\n\n貨號：${parsed.trackingNumber}\n姓名：${parsed.name || '未識別'}\n地址：${parsed.address || '未識別'}\n件數：${parsed.quantity || 1}`);

        } catch (error) {
            console.error('圖片處理錯誤:', error);
            alert('❌ 圖片識別失敗：' + error.message);
        }
    }

    // 解析 OCR 文字
    parseOCRText(text, includeTrackingNumber = false) {
        const result = {
            trackingNumber: '',
            name: '',
            address: '',
            quantity: 1
        };

        // 清理文字
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log('清理後的行:', lines);

        // 提取貨號（10位數字）
        if (includeTrackingNumber) {
            for (const line of lines) {
                const trackingMatch = line.match(/(\d{10})/);
                if (trackingMatch && !result.trackingNumber) {
                    result.trackingNumber = trackingMatch[1];
                    console.log('找到貨號:', result.trackingNumber);
                    break;
                }
            }
        }

        // 提取姓名（中文字符，2-4個字）
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 尋找姓名
            const nameMatch = line.match(/([一-龥]{2,4})/);
            if (nameMatch && !result.name) {
                result.name = nameMatch[1];
                console.log('找到姓名:', result.name);
            }

            // 尋找地址（包含市、區、路、街、號等）
            if (line.includes('市') || line.includes('區') || line.includes('路') || line.includes('街') || line.includes('號')) {
                result.address = line;
                console.log('找到地址:', result.address);
            }

            // 尋找件數（單獨的數字）
            const quantityMatch = line.match(/^\s*(\d+)\s*$/);
            if (quantityMatch && parseInt(quantityMatch[1]) < 100) {
                result.quantity = parseInt(quantityMatch[1]);
                console.log('找到件數:', result.quantity);
            }
        }

        // 如果地址太短，嘗試合併多行
        if (result.address && result.address.length < 10 && lines.length > 2) {
            // 找到包含關鍵字的行，並合併相鄰行
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('市') || lines[i].includes('區')) {
                    const addressParts = [];
                    // 向後查找最多3行
                    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                        if (lines[j].match(/[市區路街巷弄號樓]/)) {
                            addressParts.push(lines[j]);
                        }
                    }
                    if (addressParts.length > 0) {
                        result.address = addressParts.join('');
                        console.log('合併地址:', result.address);
                    }
                    break;
                }
            }
        }

        return result;
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new HCTTracker();
});
