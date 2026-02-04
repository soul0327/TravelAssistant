// ==========================================
// 全域變數與初始化
// ==========================================
let currTripId = null;
let currDate = new Date().toISOString().split('T')[0];
let tripMeta = { start: null, end: null };
let mapInst = null;
let mapMarkers = [];
let mapLine = null;

// Modal 實體
let modalTrip = null;
let modalItem = null;

// 資料快取
let currentTripItems = [];
let companionsList = [];

$(document).ready(() => {
    // 初始化 Bootstrap Modals
    modalTrip = new bootstrap.Modal('#modal-trip');
    modalItem = new bootstrap.Modal('#modal-item');

    // 監聽 Modal 關閉事件 (重置表單)
    document.getElementById('modal-trip').addEventListener('hidden.bs.modal', () => {
        $('#form-trip')[0].reset();
        $('#trip-id').val('');
        $('#btn-del-trip').hide();
        companionsList = [];
        $('#companion-list').empty();
        // 重置分頁到第一頁
        const firstTab = new bootstrap.Tab(document.querySelector('#trip-tabs button[data-bs-target="#tab-basic"]'));
        firstTab.show();
        $('#hotel-fields-container').empty();
    });
    
    document.getElementById('modal-item').addEventListener('hidden.bs.modal', () => {
        $('#form-item')[0].reset();
        $('#inp-id').val('');
        $('#btn-del-item').hide();
        // 重置座標鎖定狀態
        $('#coord-status').addClass('d-none');
    });

    // 啟動應用
    loadHome();
});

// ==========================================
// API Helper
// ==========================================
async function api(url, method = 'GET', data = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    return res.json();
}

// ==========================================
// 首頁與預設資料邏輯
// ==========================================

async function loadHome() {
    const trips = await api('/api/trips');
    const $list = $('#view-home').empty();
    
    // 如果資料庫是空的，自動建立範例行程
    if (trips.length === 0) {
        await createDemoTrip();
        return; 
    }

    trips.forEach(t => {
        const days = (new Date(t.end_date) - new Date(t.start_date)) / (1000 * 60 * 60 * 24) + 1;
        $list.append(`
            <div class="trip-card" onclick="selectTrip('${t.id}', '${t.title}', '${t.start_date}', '${t.end_date}')">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <h5 class="fw-bold m-0 text-dark">${t.title}</h5>
                    <span class="badge bg-primary-subtle text-primary rounded-pill">${Math.max(1, Math.round(days))} 天</span>
                </div>
                <div class="text-muted small">
                    <span class="material-icons-round fs-6 align-middle me-1">calendar_today</span>
                    ${t.start_date} ~ ${t.end_date}
                </div>
            </div>
        `);
    });
}

// --- 預設資料植入 (美味關西六日遊) ---
async function createDemoTrip() {
    const tripId = 'trip_demo_' + Date.now();
    const startDate = '2026-04-19';
    const endDate = '2026-04-24';
    
    // 1. 建立旅程 meta
    await api('/api/trips', 'POST', {
        id: tripId, title: '美味關西六日遊', start_date: startDate, end_date: endDate
    });

    // 2. 建立指定旅伴 (無 "我")
    const members = ['俊廷', '沛芷', '新翔', '葦茹'];
    for(const name of members) {
        await api('/api/companions', 'POST', { id: `comp_${Date.now()}_${name}`, trip_id: tripId, name: name });
    }

    const promises = [];

    // 3. 去程航班 GK50 (02:30 -> 06:05)
    const depTimeOut = '02:30';
    const arrTimeOut = '06:05';
    const suggestOut = subtractTime(depTimeOut, 2); // 00:30
    
    promises.push(api('/api/items', 'POST', {
        id: `fo_${tripId}`, trip_id: tripId, type: 'transport', date: startDate,
        start_time: depTimeOut, end_time: arrTimeOut,
        title: '去程 GK50', location: '關西機場',
        transport_start: 'TPE (桃園)', transport_end: 'KIX (關西)', transport_line: 'Jetstar GK50',
        note: `💡 建議 ${suggestOut} 抵達機場辦理登機`
    }));

    // 4. 回程航班 GK55 (15:20 -> 17:20)
    const depTimeIn = '15:20'; 
    const arrTimeIn = '17:20';
    const suggestIn = subtractTime(depTimeIn, 2); // 13:20

    promises.push(api('/api/items', 'POST', {
        id: `fi_${tripId}`, trip_id: tripId, type: 'transport', date: endDate,
        start_time: depTimeIn, end_time: arrTimeIn,
        title: '回程 GK55', location: '桃園機場',
        transport_start: 'KIX (關西)', transport_end: 'TPE (桃園)', transport_line: 'Jetstar GK55',
        note: `💡 建議 ${suggestIn} 抵達機場辦理登機`
    }));

    // 5. 住宿分配
    // Day 1, 2 (4/19, 4/20): 東橫INN 二條城南
    ['2026-04-19', '2026-04-20'].forEach((date, i) => {
        promises.push(api('/api/items', 'POST', {
            id: `hotel_${i}`, trip_id: tripId, type: 'hotel', date: date, start_time: '15:00',
            title: '入住飯店', location: '東橫INN 二條城南', note: 'Check-in'
        }));
    });

    // Day 3, 4, 5 (4/21, 4/22, 4/23): 東橫INN 大阪通天閣前
    ['2026-04-21', '2026-04-22', '2026-04-23'].forEach((date, i) => {
        promises.push(api('/api/items', 'POST', {
            id: `hotel_osaka_${i}`, trip_id: tripId, type: 'hotel', date: date, start_time: '15:00',
            title: '入住飯店', location: '東橫INN 大阪通天閣前', note: 'Check-in'
        }));
    });

    await Promise.all(promises);
    loadHome(); // 刷新顯示
}

// 選擇旅程 (綁定 window 確保 HTML onclick 可呼叫)
window.selectTrip = async function(id, title, start, end) {
    currTripId = id;
    tripMeta = { start, end };
    
    $('#app-title').text(title);
    $('#app-subtitle').text(`${start} 出發`);
    currDate = start; // 預設選第一天
    
    // 載入該旅程的所有資料
    currentTripItems = await api(`/api/items?trip_id=${id}`);
    companionsList = await api(`/api/companions?trip_id=${id}`);
    
    switchView('timeline');
}

// ==========================================
// 時間自動計算邏輯
// ==========================================
// changedType: 'start' (改開始), 'duration' (改耗時), 'end' (改結束)
window.calcTime = function(changedType) {
    const startTimeStr = $('#inp-time').val();
    if(!startTimeStr) return;

    // 統一使用 duration 欄位
    const $durationInput = $('#inp-duration');
    const $endTimeInput = $('#inp-end-time');

    const [sh, sm] = startTimeStr.split(':').map(Number);
    const startMins = sh * 60 + sm;

    if (changedType === 'start' || changedType === 'duration') {
        // 修改 [開始] or [耗時] -> 自動算出 [結束]
        const durVal = parseInt($durationInput.val());
        if (!isNaN(durVal)) {
            let totalMins = startMins + durVal;
            // 簡單處理跨日 (只顯示時間)
            let eh = Math.floor(totalMins / 60) % 24;
            let em = totalMins % 60;
            $endTimeInput.val(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`);
        }
    } else if (changedType === 'end') {
        // 修改 [結束] -> 自動回推 [耗時]
        const endTimeStr = $endTimeInput.val();
        if (endTimeStr) {
            const [eh, em] = endTimeStr.split(':').map(Number);
            let endMins = eh * 60 + em;
            if (endMins < startMins) endMins += 24 * 60; // 跨日處理
            let diff = endMins - startMins;
            $durationInput.val(diff);
        }
    }
}

// ==========================================
// 項目編輯 (Item Modal) 邏輯
// ==========================================

// 切換項目類型 (顯示/隱藏對應欄位)
// --- Item Form Logic (更新分類顯示邏輯) ---
window.setType = function(type) {
    $('.type-btn').removeClass('active'); 
    $(`.type-btn[data-t="${type}"]`).addClass('active'); 
    $('#inp-type').val(type);

    // 先隱藏所有專屬區塊
    $('#block-transport, #block-spot, #block-address, #block-img').addClass('d-none');

    // 根據類型顯示
    if(type === 'transport') {
        $('#block-transport').removeClass('d-none');
    } else if (type === 'spot' || type === 'dining' || type === 'luggage') {
        // 景點、美食、寄放 都顯示這些
        $('#block-spot').removeClass('d-none'); // 顯示停留時間
        $('#block-address').removeClass('d-none'); 
        $('#block-img').removeClass('d-none');
    } else if (type === 'hotel') {
        $('#block-address').removeClass('d-none');
        $('#block-img').removeClass('d-none');
    }
    // Expense (消費) 維持最簡潔，不顯示額外區塊
};
// 開啟編輯/新增視窗
window.openItemModal = function(id) {
    if (id) {
        // --- 編輯模式 ---
        const item = currentTripItems.find(i => i.id === id);
        if (!item) return;
        
        $('#inp-id').val(item.id);
        setType(item.type);
        
        // 通用欄位
        $('#inp-date').val(item.date);
        $('#inp-time').val(item.start_time);
        $('#inp-end-time').val(item.end_time);
        
        $('#inp-title').val(item.title);
        $('#inp-location').val(item.location);
        
        $('#inp-cost').val(item.cost);
        $('#inp-note').val(item.note);
        $('#inp-lat').val(item.lat);
        $('#inp-lng').val(item.lng);
        $('#inp-address').val(item.address);
        $('#inp-img').val(item.image_url);
        
        // 交通專屬
        $('#inp-start-point').val(item.transport_start);
        $('#inp-end-point').val(item.transport_end);
        $('#inp-trans-line').val(item.transport_line);
        
        // 耗時欄位回填 (依類型)
        if (item.type === 'transport') {
            $('#inp-duration').val(item.transport_time);
        } else {
            $('#inp-duration').val(item.stay_duration);
        }

        // 各自處理邏輯
        const isInd = (item.is_individual === 1);
        $('#inp-individual').prop('checked', isInd);
        toggleSplit(); // 更新 UI 顯示

        initPayerSplitUI(item.paid_by, item.split_by);
        
        // 顯示座標狀態
        if(item.lat) $('#coord-status').removeClass('d-none').text('✅ 已有座標');
        
        $('#btn-del-item').show();
    } else {
        // --- 新增模式 ---
        $('#inp-id').val('');
        $('#inp-date').val(currDate);
        $('#inp-time').val('09:00');
        $('#btn-del-item').hide();
        setType('spot'); // 預設類型
        
        $('#inp-individual').prop('checked', false);
        toggleSplit();
        
        initPayerSplitUI();
    }
    modalItem.show();
};

// 初始化記帳選單
window.initPayerSplitUI = function(paidBy, splitByStr) {
    const $sel = $('#inp-payer').empty();
    
    if(companionsList.length === 0) {
        $sel.append('<option value="">請先新增旅伴</option>');
    } else {
        companionsList.forEach(c => {
            $sel.append(`<option value="${c.id}">${c.name}</option>`);
        });
    }
    
    if(paidBy) $sel.val(paidBy);

    const $splitBox = $('#inp-split-container').empty();
    let splits = []; 
    try { splits = JSON.parse(splitByStr || '[]'); } catch(e){}
    
    if(companionsList.length === 0) {
        $splitBox.html('<small class="text-muted">無旅伴可選</small>');
    } else {
        companionsList.forEach(c => {
            const isChecked = (splits.length === 0 || splits.includes(c.id)) ? 'checked' : '';
            $splitBox.append(`
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" value="${c.id}" id="chk-${c.id}" ${isChecked}>
                    <label class="form-check-label" for="chk-${c.id}">${c.name}</label>
                </div>
            `);
        });
    }
};

// 切換各自處理 (隱藏分攤選單)
window.toggleSplit = function() {
    const isIndividual = $('#inp-individual').is(':checked');
    if (isIndividual) {
        $('#div-split-setting').addClass('d-none');
    } else {
        $('#div-split-setting').removeClass('d-none');
    }
};

// 儲存項目
window.saveItem = async function() {
    const id = $('#inp-id').val() || 'item_' + Date.now();
    const splits = []; 
    $('#inp-split-container input:checked').each(function() { splits.push($(this).val()); });
    
    const type = $('#inp-type').val();
    let transTime = '', stayDur = '';
    const durationVal = $('#inp-duration').val();

    // 根據類型將 duration 存入正確欄位
    if(type === 'transport') {
        transTime = durationVal;
    } else {
        stayDur = durationVal;
    }

    const newItem = {
        id: id, 
        trip_id: currTripId, 
        type: type, 
        date: $('#inp-date').val() || currDate,
        start_time: $('#inp-time').val() || '09:00', 
        end_time: $('#inp-end-time').val(), 
        title: $('#inp-title').val(), 
        location: $('#inp-location').val(),
        cost: parseInt($('#inp-cost').val()) || 0, 
        note: $('#inp-note').val(),
        lat: $('#inp-lat').val(), 
        lng: $('#inp-lng').val(), 
        address: $('#inp-address').val(), 
        image_url: $('#inp-img').val(),
        paid_by: $('#inp-payer').val(), 
        split_by: JSON.stringify(splits),
        
        // 新增欄位
        transport_start: $('#inp-start-point').val(),
        transport_end: $('#inp-end-point').val(),
        transport_line: $('#inp-trans-line').val(),
        transport_time: transTime,
        stay_duration: stayDur,
        is_individual: $('#inp-individual').is(':checked') ? 1 : 0
    };

    if(!newItem.title) return alert("請輸入標題");
    
    await api('/api/items', 'POST', newItem);
    modalItem.hide();
    
    // 如果日期變了，切換過去
    if(newItem.date !== currDate) currDate = newItem.date;
    
    // 重載並渲染
    currentTripItems = await api(`/api/items?trip_id=${currTripId}`);
    renderTimeline();
};

window.editItem = function(id) { window.openItemModal(id); };

window.deleteItem = async function() {
    if(!confirm("確定刪除？")) return;
    await api(`/api/items/${$('#inp-id').val()}`, 'DELETE');
    modalItem.hide();
    currentTripItems = await api(`/api/items?trip_id=${currTripId}`);
    renderTimeline();
};

// --- 功能：一鍵回飯店 ---
window.fillBackToHotel = function() {
    const hotel = currentTripItems.find(i => i.type === 'hotel' && i.date === currDate);
    if (hotel) {
        $('#inp-title').val(`回飯店`);
        $('#inp-location').val(hotel.location || hotel.title);
        // 切換到交通模式
        setType('transport');
        $('#inp-end-point').val(hotel.location || hotel.title);
    } else {
        alert("本日尚未設定住宿，無法自動填寫");
    }
}

// --- 功能：自動抓取座標 ---
window.fetchCoordinates = async function() {
    const query = $('#inp-location').val();
    if (!query) return alert("請先輸入地點名稱");

    const $btn = $('button[onclick="fetchCoordinates()"]');
    const originalIcon = $btn.html();
    $btn.html('<span class="spinner-border spinner-border-sm"></span>');

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.length > 0) {
            const place = data[0];
            $('#inp-lat').val(place.lat);
            $('#inp-lng').val(place.lon);
            $('#coord-status').removeClass('d-none').text(`✅ ${place.display_name.split(',')[0]}`);
            
            // 自動填入地址
            if(!$('#inp-address').val()) {
                $('#inp-address').val(place.display_name);
            }
        } else {
            alert("找不到此地點，請嘗試輸入更具體的名稱");
            $('#coord-status').addClass('d-none');
        }
    } catch (e) {
        console.error(e);
        alert("搜尋失敗");
    } finally {
        $btn.html(originalIcon);
    }
};

// --- 功能：地圖搜尋 ---
window.searchMap = function() {
    const query = $('#inp-location').val() || $('#inp-title').val();
    if(query) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    } else {
        alert("請先輸入地點");
    }
};

// ==========================================
// 行程時間軸 (Timeline)
// ==========================================

// --- Timeline Render (更新：地圖按鈕 & 標題修正) ---
window.renderTimeline = function() {
    const $nav = $('#day-nav').empty();
    const sDate = new Date(tripMeta.start);
    const eDate = new Date(tripMeta.end);
    
    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = dateStr.split('-')[2];
        const isActive = (dateStr === currDate);
        $nav.append(`
            <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary border-0 bg-light text-dark'} rounded-pill px-3 fw-bold shadow-sm" 
                onclick="changeDate('${dateStr}')" style="min-width: 50px;">
                ${dayLabel} <small class="fw-normal" style="font-size:10px">日</small>
            </button>
        `);
    }

    $('#timeline-date-label').text(currDate);
    
    const $list = $('#timeline-list').empty();
    $list.append('<div class="timeline-line"></div>');
    
    const items = currentTripItems.filter(i => i.date === currDate);
    items.sort((a, b) => (a.start_time > b.start_time) ? 1 : -1);

    if (items.length === 0) {
        $list.append('<div class="text-center text-muted mt-5 small">本日無行程</div>');
        $('#day-cost').text('0'); return;
    }

    let costSum = 0;
    items.forEach(item => {
        if (!item.is_individual) {
            costSum += (item.cost || 0);
        }
        
        let timeDisplay = `<span class="time-start">${item.start_time}</span>`;
        if (item.end_time) {
            timeDisplay += `<span class="time-arrow">➝</span><span class="time-end">${item.end_time}</span>`;
        }

        let mainContent = '';
        let extraBadge = item.is_individual ? `<span class="badge bg-secondary rounded-pill ms-2" style="font-size:0.7em">各自</span>` : '';

        // Google Map 按鈕邏輯
        // 優先使用座標，沒有則使用地點名稱，再沒有則使用標題
        let mapQuery = '';
        if (item.lat && item.lng) {
            mapQuery = `${item.lat},${item.lng}`;
        } else {
            mapQuery = encodeURIComponent(item.location || item.title);
        }
        
        const mapBtnHtml = `
            <button class="btn-timeline-map" onclick="openGoogleMap(event, '${mapQuery}')">
                <span class="material-icons-round fs-5">map</span>
            </button>
        `;

        // 內容顯示邏輯修正：統一顯示 Title
        if (item.type === 'transport') {
            const lineInfo = item.transport_line ? `(${item.transport_line})` : '';
            const route = (item.transport_start && item.transport_end) 
                          ? `${item.transport_start} <span class="text-muted">➝</span> ${item.transport_end} ${lineInfo}`
                          : item.title;
            const duration = item.transport_time ? `<span class="badge bg-light text-dark border ms-2">${item.transport_time}分</span>` : '';

            mainContent = `
                <h6 class="fw-bold mt-2 mb-1 text-primary pe-4">${route} ${duration} ${extraBadge}</h6>
                <div class="small text-muted"></div>
            `;
        } else {
            // 景點、美食、其他
            const stay = item.stay_duration ? `<span class="badge bg-light text-dark border ms-2">停留 ${item.stay_duration}分</span>` : '';
            
            // 地點顯示在標題下方
            const locationText = item.location ? `<div class="small text-muted"><span class="material-icons-round fs-6 align-middle me-1">place</span>${item.location}</div>` : '';

            mainContent = `
                <h6 class="fw-bold mt-2 mb-1 text-dark pe-4">${item.title} ${stay} ${extraBadge}</h6>
                ${locationText}
            `;
        }

        let noteHtml = '';
        if (item.note) {
            if (item.note.includes('💡')) {
                noteHtml = `<div class="mt-2 p-2 bg-warning-subtle text-warning-emphasis rounded small fw-bold border border-warning-subtle">${item.note}</div>`;
            } else {
                noteHtml = `<div class="small text-muted text-truncate mt-1">${item.note}</div>`;
            }
        }

        $list.append(`
            <div class="item-card" data-type="${item.type}" onclick="editItem('${item.id}')">
                ${mapBtnHtml} <div class="time-dot"></div>
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="time-wrapper">${timeDisplay}</div>
                    ${item.cost ? `<span class="fw-bold text-danger small">-$${item.cost}</span>` : ''}
                </div>
                ${mainContent}
                ${noteHtml}
            </div>
        `);
    });
    $('#day-cost').text(costSum);
};
// 新增：直接開啟 Google Map 的函式 (防止冒泡)
window.openGoogleMap = function(event, query) {
    event.stopPropagation(); // 阻止觸發卡片的 editItem
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};
window.changeDate = function(dateStr) { 
    currDate = dateStr; 
    renderTimeline(); 
};

// ==========================================
// 分帳與結算 (Expense)
// ==========================================

window.renderExpense = function() {
    let totalCost = 0;
    let payers = {}; 
    let balance = {};
    
    // 初始化
    companionsList.forEach(c => { payers[c.id] = 0; balance[c.id] = 0; });

    currentTripItems.forEach(item => {
        // 如果是各自處理，完全不計入分帳
        if (item.is_individual) return;

        const cost = item.cost || 0;
        if (cost <= 0) return;
        totalCost += cost;

        // 誰代墊 (債權人)
        const payerId = item.paid_by;
        if (payerId && payers[payerId] !== undefined) {
            payers[payerId] += cost;
            balance[payerId] += cost; // 他多付了，餘額增加 (別人欠他)
        }

        // 分攤給誰 (債務人)
        let splits = [];
        try { splits = JSON.parse(item.split_by || '[]'); } catch(e){}
        
        if (splits.length > 0) {
            const perPerson = cost / splits.length;
            splits.forEach(uid => {
                if (balance[uid] !== undefined) balance[uid] -= perPerson; // 他應付，餘額減少 (他欠別人)
            });
        }
    });

    $('#exp-total').text(totalCost);
    
    // Render 代墊榜
    const $payerList = $('#exp-payer-list').empty();
    Object.keys(payers).sort((a,b) => payers[b] - payers[a]).forEach(uid => {
        if (payers[uid] > 0) {
            const name = companionsList.find(c=>c.id===uid)?.name || '未知';
            $payerList.append(`
                <li class="list-group-item d-flex justify-content-between">
                    <span>${name}</span>
                    <span class="fw-bold">$${Math.round(payers[uid])}</span>
                </li>
            `);
        }
    });

    // Render 結算建議 (最小化轉帳次數演算法)
    const $settleList = $('#exp-settle-list').empty();
    let debtors = [], creditors = [];
    
    Object.keys(balance).forEach(uid => {
        const val = balance[uid];
        if (val < -1) debtors.push({ id: uid, amount: val }); // 欠錢
        if (val > 1) creditors.push({ id: uid, amount: val }); // 被欠錢
    });
    
    debtors.sort((a, b) => a.amount - b.amount); // 欠最多排前
    creditors.sort((a, b) => b.amount - a.amount); // 被欠最多排前

    let settleHTML = '';
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        let debt = Math.abs(debtors[i].amount);
        let credit = creditors[j].amount;
        let amount = Math.min(debt, credit); // 這次還多少
        
        const fromName = companionsList.find(c=>c.id===debtors[i].id)?.name || '未知';
        const toName = companionsList.find(c=>c.id===creditors[j].id)?.name || '未知';

        settleHTML += `
            <div class="card border-0 bg-white p-3 shadow-sm rounded-4 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold text-danger">${fromName}</span>
                        <span class="material-icons-round text-muted small">arrow_forward</span>
                        <span class="fw-bold text-success">${toName}</span>
                    </div>
                    <span class="fw-bold fs-5">$${Math.round(amount)}</span>
                </div>
            </div>
        `;

        debtors[i].amount += amount; 
        creditors[j].amount -= amount;
        
        if (Math.abs(debtors[i].amount) < 1) i++;
        if (creditors[j].amount < 1) j++;
    }
    
    if (settleHTML === '') {
        $settleList.html('<div class="text-center text-muted py-3">目前收支平衡</div>');
    } else {
        $settleList.html(settleHTML);
    }
};

// ==========================================
// 旅程設定 (Trip Modal)
// ==========================================

window.openTripModal = async function(id) { 
    if(id) {
        // Edit Mode
        const trips = await api('/api/trips');
        const t = trips.find(x => x.id === id);
        $('#sheet-trip-title').text('編輯旅程');
        $('#trip-id').val(t.id); 
        $('#trip-title').val(t.title); 
        $('#trip-start').val(t.start_date); 
        $('#trip-end').val(t.end_date);
        $('#btn-del-trip').show();
        
        // 載入旅伴 (重要：必須在開啟時載入)
        companionsList = await api(`/api/companions?trip_id=${id}`);
        renderCompanionList();
        generateHotelFields(); 
    } else {
        // New Mode
        $('#sheet-trip-title').text('新增旅程');
        $('#trip-id').val('');
        $('#btn-del-trip').hide();
        companionsList = [];
        renderCompanionList();
        generateHotelFields();
    }
    modalTrip.show(); 
};

window.renderCompanionList = function() {
    const $ul = $('#companion-list').empty();
    companionsList.forEach(c => {
        $ul.append(`
            <li class="list-group-item bg-transparent d-flex justify-content-between px-0">
                <span>${c.name}</span>
                <button class="btn btn-sm text-danger" onclick="removeCompanion('${c.id}')">X</button>
            </li>
        `);
    });
};

window.addCompanionUI = function() {
    const name = $('#new-companion-name').val().trim();
    if(!name) return;
    companionsList.push({ id: 'comp_' + Date.now(), trip_id: $('#trip-id').val(), name: name, is_new: true });
    $('#new-companion-name').val('');
    renderCompanionList();
};

window.removeCompanion = async function(id) {
    const idx = companionsList.findIndex(c => c.id === id);
    if(idx > -1) {
        if (!companionsList[idx].is_new && $('#trip-id').val()) {
            await api(`/api/companions/${id}`, 'DELETE');
        }
        companionsList.splice(idx, 1);
        renderCompanionList();
    }
};

window.saveTrip = async function() { 
    const id = $('#trip-id').val(); 
    const newId = id || 'trip_' + Date.now();
    await api('/api/trips', 'POST', {
        id: newId, 
        title: $('#trip-title').val(), 
        start_date: $('#trip-start').val(), 
        end_date: $('#trip-end').val()
    });
    
    for(const c of companionsList) {
        if(c.is_new) await api('/api/companions', 'POST', { id: c.id, trip_id: newId, name: c.name });
    }
    
    modalTrip.hide();
    if(!id) { loadHome(); switchView('home'); } 
    else { selectTrip(newId, $('#trip-title').val(), $('#trip-start').val()); }
};

window.deleteTrip = async function() {
    if(confirm("確定刪除？")) {
        await api(`/api/trips/${$('#trip-id').val()}`, 'DELETE');
        modalTrip.hide();
        loadHome();
        switchView('home');
    }
};

// ==========================================
// 其他輔助 (地圖, View切換)
// ==========================================

window.switchView = function(view) {
    $('.nav-item').removeClass('active'); 
    $(`.nav-item[onclick="switchView('${view}')"]`).addClass('active');
    
    $('#view-home, #view-timeline, #view-map, #view-expense').addClass('d-none');
    $('#fab-new-trip, #fab-add-item').addClass('d-none'); 
    $('#btn-trip-setting').addClass('d-none');
    
    if (view === 'home') {
        $('#view-home').removeClass('d-none'); 
        $('#fab-new-trip').removeClass('d-none'); 
        $('#app-title').text('我的旅程'); 
        currTripId=null; 
        loadHome();
    } else {
        if(!currTripId) return switchView('home');
        $('#btn-trip-setting').removeClass('d-none');
        
        if(view === 'timeline') {
            $('#view-timeline').removeClass('d-none');
            $('#fab-add-item').removeClass('d-none');
            renderTimeline();
        } else if(view === 'map') {
            $('#view-map').removeClass('d-none');
            window.renderMap();
        } else if(view === 'expense') {
            $('#view-expense').removeClass('d-none');
            renderExpense();
        }
    }
};

window.renderMap = function() {
    if (!mapInst) {
        mapInst = L.map('map-container').setView([34.6937, 135.5023], 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap' }).addTo(mapInst);
    } else {
        setTimeout(() => mapInst.invalidateSize(), 200);
    }

    mapMarkers.forEach(m => mapInst.removeLayer(m));
    if (mapLine) mapInst.removeLayer(mapLine);
    mapMarkers = [];

    // 只顯示當天且有座標的點
    const items = currentTripItems.filter(i => i.date === currDate && i.lat && i.lng);
    items.sort((a, b) => (a.start_time > b.start_time) ? 1 : -1);

    const latlngs = [];

    items.forEach((item, idx) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        latlngs.push([lat, lng]);

        const icon = L.divIcon({
            className: 'custom-icon-wrap',
            html: `<div class="custom-marker" style="background-color: ${item.type === 'spot' ? '#198754' : '#0b57d0'}">${idx + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([lat, lng], { icon: icon }).addTo(mapInst);
        
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            $('#map-card').removeClass('d-none');
            $('#map-card-title').text(item.title);
            $('#map-card-addr').text(item.address || '無詳細資訊');
            $('#map-card-time').text(item.start_time);
            
            if(item.image_url) { $('#map-card-img').attr('src', item.image_url).removeClass('d-none'); } 
            else { $('#map-card-img').addClass('d-none'); }
            
            $('#map-go-btn').off('click').on('click', () => window.open(`http://googleusercontent.com/maps.google.com/search/${lat},${lng}`, '_blank'));
        });

        mapMarkers.push(marker);
    });

    if (latlngs.length > 1) {
        mapLine = L.polyline(latlngs, { color: '#0b57d0', dashArray: '10, 10' }).addTo(mapInst);
        mapInst.fitBounds(latlngs, { padding: [50, 50] });
    } else if (latlngs.length === 1) {
        mapInst.setView(latlngs[0], 14);
    }
};

function subtractTime(timeStr, hours) {
    if(!timeStr) return "00:00";
    const [h, m] = timeStr.split(':').map(Number);
    let newH = h - hours;
    if (newH < 0) newH += 24; 
    return `${String(newH).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

window.generateHotelFields = function() {
    const start = $('#trip-start').val();
    const end = $('#trip-end').val();
    const $container = $('#hotel-fields-container').empty();
    if (!start || !end) return;
    const sDate = new Date(start);
    const eDate = new Date(end);
    let count = 0;
    for (let d = new Date(sDate); d < eDate; d.setDate(d.getDate() + 1)) {
        count++;
        const dateStr = d.toISOString().split('T')[0];
        $container.append(`
            <div class="hotel-day-block">
                <div class="fw-bold small text-primary mb-2">Day ${count} (${dateStr.slice(5)})</div>
                <input type="text" class="form-control bg-light border-0 mb-2 hotel-name" data-date="${dateStr}" placeholder="飯店名稱">
                <input type="text" class="form-control bg-light border-0 mb-2 hotel-addr" data-date="${dateStr}" placeholder="地址">
                <input type="text" class="form-control bg-light border-0 hotel-img" data-date="${dateStr}" placeholder="圖片 URL">
            </div>
        `);
    }
};

window.copyFirstHotel = function() {
    const name = $('.hotel-name').first().val();
    const addr = $('.hotel-addr').first().val();
    const img = $('.hotel-img').first().val();
    if(name) {
        $('.hotel-name').val(name);
        $('.hotel-addr').val(addr);
        $('.hotel-img').val(img);
    }
};