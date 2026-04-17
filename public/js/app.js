let currTripId = null;
let currDate = new Date().toISOString().split('T')[0];
let tripMeta = { start: null, end: null };

let modalTrip = null;
let modalItem = null;
let modalView = null; 

let currentTripItems = [];
let companionsList = [];

$(document).ready(() => {
    modalTrip = new bootstrap.Modal('#modal-trip');
    modalItem = new bootstrap.Modal('#modal-item');
    modalView = new bootstrap.Modal('#modal-view-item');

    document.getElementById('modal-trip').addEventListener('hidden.bs.modal', () => {
        $('#form-trip')[0].reset();
        $('#trip-id').val('');
        $('#btn-del-trip').hide();
        companionsList = [];
        $('#companion-list').empty();
        const firstTab = new bootstrap.Tab(document.querySelector('#trip-tabs button[data-bs-target="#tab-basic"]'));
        firstTab.show();
        $('#hotel-fields-container').empty();
    });
    
    document.getElementById('modal-item').addEventListener('hidden.bs.modal', () => {
        $('#form-item')[0].reset();
        $('#inp-id').val('');
        $('#btn-del-item').hide();
        $('#coord-status').addClass('d-none');
    });

    loadHome();
});

async function api(url, method = 'GET', data = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    return res.json();
}

async function loadHome() {
    const trips = await api('/api/trips');
    const $list = $('#view-home').empty();
    
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

async function createDemoTrip() {
    const tripId = 'trip_demo_' + Date.now();
    await api('/api/trips', 'POST', { id: tripId, title: '日本關西之旅', start_date: '2026-04-19', end_date: '2026-04-24' });

    const members = ['俊廷', '沛芷', '新翔', '葦茹'];
    for(const name of members) {
        await api('/api/companions', 'POST', { id: `comp_${Date.now()}_${name}`, trip_id: tripId, name: name });
    }

    const promises = [];
    const addItem = (type, date, start, end, title, loc, note, tStart, tEnd, tLine) => {
        promises.push(api('/api/items', 'POST', {
            id: `item_${Math.random().toString(36).substr(2,9)}`, trip_id: tripId, type: type, date: date, 
            start_time: start, end_time: end, title: title, location: loc || '', note: note || '', cost: 0,
            transport_start: tStart || '', transport_end: tEnd || '', transport_line: tLine || '', stay_duration: '', is_individual: 0
        }));
    };

    const d1 = '2026-04-19';
    addItem('luggage', d1, '00:00', '00:00', '🎫 交通票券與劃位提醒', '', '💡 必備票券：\n1. JR 關西廣域鐵路周遊券 (5日券)\n2. 南海電鐵 Rapi:t (D6)\n3. ICOCA\n4. Uber App\n\n⚠️ JR 劃位重點：\n抵達日本第一天，請將 D1 HARUKA 與 D2 天橋立特急 (1號/8號) 指定席劃位完成，確保4人坐一起！');
    addItem('transport', d1, '02:30', '06:05', '去程航班 GK 50', '大阪關西', '💡 建議 00:30 抵達台北辦理登機', '台北 TPE', '大阪關西 KIX', 'Jetstar GK 50');
    addItem('transport', d1, '07:41', '09:05', '搭乘 HARUKA 6號', '京都車站', '【使用 JR 券】', '關西機場', '京都車站', 'JR HARUKA 6號');
    addItem('luggage', d1, '09:05', '09:30', '京都車站寄放行李', '京都車站', '');
    addItem('transport', d1, '09:30', '09:55', '搭 JR 前往馬堀站', '馬堀站', '【使用 JR 券】', '京都車站', '馬堀站', 'JR 山陰本線');
    addItem('spot', d1, '10:30', '15:40', '嵐山小火車與漫步', '嵐山', '10:53 抵達後，步行竹林、天龍寺、渡月橋\n(已購小火車)');
    addItem('transport', d1, '15:40', '16:20', '搭 JR 返回京都領行李', '京都車站', '【使用 JR 券】', '嵯峨嵐山站', '京都車站', 'JR');
    addItem('transport', d1, '16:20', '17:00', '地鐵前往飯店', '二條城前站', '交通 (ICOCA 刷地鐵)：\n京都站 (烏丸線) ➔ 烏丸御池 (轉東西線) ➔ 二條城前站 (2號出口電梯)。', '京都站', '二條城前站', '京都市營地鐵');
    addItem('hotel', d1, '17:00', '19:00', '飯店 Check-in 休息充電', '東橫INN 二條城南', '紅眼航班體力補給');
    addItem('dining', d1, '19:00', '21:30', '祇園/河原町 聚餐', '祇園', '東西線直達「三條京阪」');

    const d2 = '2026-04-20';
    addItem('transport', d2, '09:25', '11:32', '搭乘 特急 Hashidate 1號', '天橋立', '【使用 JR 券】直達', '京都車站', '天橋立', '特急 Hashidate 1號');
    addItem('spot', d2, '12:00', '14:30', '智恩寺、飛龍觀纜車', '天橋立車站側', '');
    addItem('spot', d2, '14:30', '18:09', '傘松公園、搭船觀光', '天橋立對岸(一之宮)', '看「昇龍觀」');
    addItem('transport', d2, '18:09', '20:21', '搭乘 特急 Hashidate 8號', '京都車站', '【使用 JR 券】(直達末班)\n註：此段來回價值超過 1 萬日圓，務必使用周遊券。', '天橋立', '京都車站', '特急 Hashidate 8號');
    addItem('dining', d2, '20:30', '22:00', '晚餐', '京都車站周邊', '');
    addItem('hotel', d2, '22:00', '22:00', '返回飯店', '東橫INN 二條城南', '');

    const d3 = '2026-04-21';
    addItem('transport', d3, '08:00', '08:30', '退房寄行李，Uber 叫車', 'Tekuteku Kyoto 清水店', '4人1台 ➔ 前往和服店', '飯店', '和服店', 'Uber');
    addItem('spot', d3, '08:30', '10:00', '和服體驗', 'Tekuteku Kyoto 清水店', '挑選、妝髮、穿著約 1.5 小時');
    addItem('spot', d3, '10:00', '12:15', '清水寺周邊拍照', '清水寺', '清水寺/二年坂/三年坂');
    addItem('transport', d3, '12:15', '13:00', '歸還和服，Uber 返回飯店領行李', '東橫INN 二條城南', '4人1台', '清水寺', '飯店', 'Uber');
    addItem('transport', d3, '13:00', '14:02', '地鐵前往京都車站', '京都車站', '交通 (ICOCA 刷地鐵)：二條城前 ➔ 烏丸御池 (轉線) ➔ 京都車站', '二條城前', '京都車站', '地鐵');
    addItem('transport', d3, '14:02', '14:47', '搭乘 JR 奈良線 (快速)', '奈良', '【使用 JR 券】', '京都車站', '奈良', 'JR 奈良線(快速)');
    addItem('spot', d3, '15:00', '17:30', '奈良公園、東大寺', '奈良公園', '車站寄存行李，搭公車前往。餵鹿、參拜');
    addItem('transport', d3, '17:30', '18:30', '搭乘 JR 大和路線 (快速)', '新今宮站', '【使用 JR 券】 直達「新今宮站」', '奈良', '新今宮', 'JR 大和路線(快速)');
    addItem('hotel', d3, '18:30', '19:30', '大阪飯店 Check-in', '東橫INN 大阪通天閣前', '');

    const d4 = '2026-04-22';
    addItem('transport', d4, '06:00', '07:00', '搭 JR 前往 USJ', 'USJ 環球影城', '【使用 JR 券】：新今宮 ➔ 西九條 (轉 JR 櫻島線) ➔ USJ', '新今宮', 'USJ', 'JR');
    addItem('spot', d4, '07:00', '21:00', '環球影城 USJ 全日', '日本環球影城', 'USJ 門口排隊。\n💡 全日使用快通 4。', '', '', '');
    addItem('transport', d4, '21:00', '22:00', '原路搭 JR 返回', '新今宮', '【使用 JR 券】', 'USJ', '新今宮', 'JR');
    addItem('hotel', d4, '22:00', '22:00', '返回飯店', '東橫INN 大阪通天閣前', '');

    const d5 = '2026-04-23';
    addItem('transport', d5, '08:30', '09:30', '前往勝尾寺', '勝尾寺', '交通：地鐵「動物園前」➔「千里中央」，轉 Uber/計程車 往勝尾寺。', '動物園前', '勝尾寺', '地鐵 + Uber');
    addItem('spot', d5, '09:30', '13:00', '勝尾寺參拜', '勝尾寺', '看必勝達摩');
    addItem('spot', d5, '13:00', '19:00', '難波/心齋橋採買', '道頓堀', '註：今日市內移動以地鐵為主，請使用 ICOCA。\n神奇寶貝中心 DX、道頓堀採買、摩天輪');
    addItem('dining', d5, '19:00', '21:30', '梅田商圈夜景晚餐', '藍天大廈空中庭園', '此區不吃牛餐廳極多');
    addItem('hotel', d5, '22:00', '22:00', '返回飯店', '東橫INN 大阪通天閣前', '');

    const d6 = '2026-04-24';
    addItem('spot', d6, '10:00', '13:00', '最後採買、補貨', '難波', '藥妝、電器最後掃貨');
    addItem('transport', d6, '13:00', '13:40', '搭乘 南海電鐵 Rapi:t', '關西機場', '⚠️ JR 券已失效，需另購', '難波', '關西機場', '南海電鐵 Rapi:t');
    addItem('luggage', d6, '13:40', '15:20', '抵達機場辦理登機', '關西機場', '');
    addItem('transport', d6, '15:20', '17:20', '回程航班 GK 55', '台北', '', '大阪關西 KIX', '台北 TPE', 'Jetstar GK 55');

    await Promise.all(promises);
    loadHome();
}

window.selectTrip = async function(id, title, start, end) {
    currTripId = id; tripMeta = { start, end };
    $('#app-title').text(title); $('#app-subtitle').text(`${start} 出發`);
    currDate = start; 
    currentTripItems = await api(`/api/items?trip_id=${id}`);
    companionsList = await api(`/api/companions?trip_id=${id}`);
    switchView('timeline');
}

// 檢視模式 (View Only)
window.viewItem = function(id) {
    const item = currentTripItems.find(i => i.id === id);
    if (!item) return;

    $('#view-title').text(item.title);
    $('#view-location').text(item.location || '無地點資訊');
    if(!item.location) $('#view-location-row').addClass('d-none'); else $('#view-location-row').removeClass('d-none');

    $('#view-start-time').text(item.start_time);
    $('#view-end-time').text(item.end_time || '--:--');
    
    let duration = '--';
    if(item.start_time && item.end_time) {
        const [sh, sm] = item.start_time.split(':').map(Number);
        const [eh, em] = item.end_time.split(':').map(Number);
        let diff = (eh*60+em) - (sh*60+sm);
        if(diff < 0) diff += 24*60;
        duration = `${diff} 分`;
    }
    $('#view-duration').text(duration);

    const typeMap = { 'spot': '景點', 'dining': '美食', 'transport': '交通', 'hotel': '住宿', 'luggage': '票券/雜項', 'expense': '消費' };
    const typeColor = { 'spot': 'success', 'dining': 'warning', 'transport': 'primary', 'hotel': 'info', 'luggage': 'secondary', 'expense': 'danger' };
    $('#view-type-badge').text(typeMap[item.type] || '其他').attr('class', `badge rounded-pill bg-${typeColor[item.type] || 'dark'}`);

    if (item.type === 'transport') {
        $('#view-trans-detail').removeClass('d-none');
        $('#view-trans-route').text(`${item.transport_start || '?'} ➝ ${item.transport_end || '?'}`);
        $('#view-trans-line').text(item.transport_line ? `(${item.transport_line})` : '');
    } else {
        $('#view-trans-detail').addClass('d-none');
    }

    if (item.note) { $('#view-note-row').removeClass('d-none'); $('#view-note').text(item.note); } 
    else { $('#view-note-row').addClass('d-none'); }

    if (item.cost > 0) {
        $('#view-cost-row').removeClass('d-none'); $('#view-cost').text(item.cost);
        if (item.is_individual) {
            $('#view-individual-badge').removeClass('d-none'); $('#view-payer-badge').addClass('d-none');
        } else {
            $('#view-individual-badge').addClass('d-none'); $('#view-payer-badge').removeClass('d-none');
            const payerName = companionsList.find(c => c.id === item.paid_by)?.name || '未知';
            $('#view-payer-badge').text(`${payerName} 代墊`);
        }
    } else { $('#view-cost-row').addClass('d-none'); }

    const query = item.location || item.title;
    if (item.address || query) {
        $('#view-address-row').removeClass('d-none'); $('#view-address').text(item.address || query);
        $('#btn-view-map').off('click').on('click', () => {
            if(item.lat && item.lng) window.open(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`, '_blank');
            else window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
        });
    } else { $('#view-address-row').addClass('d-none'); }

    if (item.image_url) { $('#view-hero-img').removeClass('d-none').css('background-image', `url(${item.image_url})`); } 
    else { $('#view-hero-img').addClass('d-none'); }

    $('#btn-view-edit').off('click').on('click', () => { modalView.hide(); openItemModal(id); });
    modalView.show();
};

window.openItemModal = function(id) {
    if (id) {
        const item = currentTripItems.find(i => i.id === id);
        if (!item) return;
        
        $('#inp-id').val(item.id); setType(item.type);
        $('#inp-date').val(item.date); $('#inp-time').val(item.start_time); $('#inp-end-time').val(item.end_time);
        $('#inp-title').val(item.title); $('#inp-location').val(item.location);
        $('#inp-cost').val(item.cost); $('#inp-note').val(item.note);
        $('#inp-lat').val(item.lat); $('#inp-lng').val(item.lng);
        $('#inp-address').val(item.address); $('#inp-img').val(item.image_url);
        
        $('#inp-start-point').val(item.transport_start); $('#inp-end-point').val(item.transport_end); $('#inp-trans-line').val(item.transport_line);
        if (item.type === 'transport') $('#inp-duration').val(item.transport_time); else $('#inp-duration').val(item.stay_duration);

        $('#inp-individual').prop('checked', (item.is_individual === 1)); toggleSplit(); 
        initPayerSplitUI(item.paid_by, item.split_by);
        if(item.lat) $('#coord-status').removeClass('d-none').text('✅ 已有座標');
        $('#btn-del-item').show();
    } else {
        $('#inp-id').val(''); $('#inp-date').val(currDate); $('#inp-time').val('09:00'); $('#btn-del-item').hide();
        setType('spot'); $('#inp-individual').prop('checked', false); toggleSplit(); initPayerSplitUI();
    }
    modalItem.show();
};

window.setType = function(type) {
    $('.type-btn').removeClass('active'); $(`.type-btn[data-t="${type}"]`).addClass('active'); $('#inp-type').val(type);
    $('#block-transport, #block-spot, #block-address, #block-img').addClass('d-none');
    if(type === 'transport') $('#block-transport').removeClass('d-none');
    else if (type === 'spot' || type === 'dining' || type === 'luggage') { $('#block-spot').removeClass('d-none'); $('#block-address').removeClass('d-none'); $('#block-img').removeClass('d-none'); }
    else if (type === 'hotel') { $('#block-address').removeClass('d-none'); $('#block-img').removeClass('d-none'); }
};

window.initPayerSplitUI = function(paidBy, splitByStr) {
    const $sel = $('#inp-payer').empty();
    if(companionsList.length === 0) $sel.append('<option value="">請先新增旅伴</option>');
    else companionsList.forEach(c => $sel.append(`<option value="${c.id}">${c.name}</option>`));
    if(paidBy) $sel.val(paidBy);
    const $splitBox = $('#inp-split-container').empty(); let splits = []; try { splits = JSON.parse(splitByStr || '[]'); } catch(e){}
    if(companionsList.length === 0) $splitBox.html('<small class="text-muted">無旅伴可選</small>');
    else companionsList.forEach(c => { const isChecked = (splits.length === 0 || splits.includes(c.id)) ? 'checked' : ''; $splitBox.append(`<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" value="${c.id}" id="chk-${c.id}" ${isChecked}><label class="form-check-label" for="chk-${c.id}">${c.name}</label></div>`); });
};

window.toggleSplit = function() {
    if ($('#inp-individual').is(':checked')) $('#div-split-setting').addClass('d-none'); else $('#div-split-setting').removeClass('d-none');
};

window.saveItem = async function() {
    const id = $('#inp-id').val() || 'item_' + Date.now(); const splits = []; 
    $('#inp-split-container input:checked').each(function() { splits.push($(this).val()); });
    const type = $('#inp-type').val(); let transTime = '', stayDur = ''; const durationVal = $('#inp-duration').val();
    if(type === 'transport') transTime = durationVal; else stayDur = durationVal;

    const newItem = {
        id: id, trip_id: currTripId, type: type, date: $('#inp-date').val() || currDate, 
        start_time: $('#inp-time').val() || '09:00', end_time: $('#inp-end-time').val(), 
        title: $('#inp-title').val(), location: $('#inp-location').val(), cost: parseInt($('#inp-cost').val()) || 0, note: $('#inp-note').val(),
        lat: $('#inp-lat').val(), lng: $('#inp-lng').val(), address: $('#inp-address').val(), image_url: $('#inp-img').val(),
        paid_by: $('#inp-payer').val(), split_by: JSON.stringify(splits), transport_start: $('#inp-start-point').val(), transport_end: $('#inp-end-point').val(), transport_line: $('#inp-trans-line').val(),
        transport_time: transTime, stay_duration: stayDur, is_individual: $('#inp-individual').is(':checked') ? 1 : 0
    };
    if(!newItem.title) return alert("請輸入標題");
    await api('/api/items', 'POST', newItem); modalItem.hide();
    if(newItem.date !== currDate) currDate = newItem.date;
    currentTripItems = await api(`/api/items?trip_id=${currTripId}`); 
    renderTimeline();
};

window.editItem = function(id) { window.openItemModal(id); };
window.deleteItem = async function() { if(!confirm("確定刪除？")) return; await api(`/api/items/${$('#inp-id').val()}`, 'DELETE'); modalItem.hide(); currentTripItems = await api(`/api/items?trip_id=${currTripId}`); renderTimeline(); };

window.calcTime = function(changedType) {
    const startTimeStr = $('#inp-time').val(); if(!startTimeStr) return;
    const $durationInput = $('#inp-duration'); const $endTimeInput = $('#inp-end-time');
    const [sh, sm] = startTimeStr.split(':').map(Number); const startMins = sh * 60 + sm;
    if (changedType === 'start' || changedType === 'duration') {
        const durVal = parseInt($durationInput.val());
        if (!isNaN(durVal)) { let totalMins = startMins + durVal; let eh = Math.floor(totalMins / 60) % 24; let em = totalMins % 60; $endTimeInput.val(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`); }
    } else if (changedType === 'end') {
        const endTimeStr = $endTimeInput.val();
        if (endTimeStr) { const [eh, em] = endTimeStr.split(':').map(Number); let endMins = eh * 60 + em; if (endMins < startMins) endMins += 24 * 60; $durationInput.val(endMins - startMins); }
    }
}
window.fillBackToHotel = function() { const hotel = currentTripItems.find(i => i.type === 'hotel' && i.date === currDate); if (hotel) { $('#inp-title').val(`回飯店`); $('#inp-location').val(hotel.location || hotel.title); setType('transport'); $('#inp-end-point').val(hotel.location || hotel.title); } else { alert("本日無住宿"); } }
window.fetchCoordinates = async function() { const query = $('#inp-location').val(); if (!query) return alert("請先輸入地點名稱"); const $btn = $('button[onclick="fetchCoordinates()"]'); const originalIcon = $btn.html(); $btn.html('<span class="spinner-border spinner-border-sm"></span>'); try { const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`; const res = await fetch(url); const data = await res.json(); if (data && data.length > 0) { const place = data[0]; $('#inp-lat').val(place.lat); $('#inp-lng').val(place.lon); $('#coord-status').removeClass('d-none').text(`✅ ${place.display_name.split(',')[0]}`); if(!$('#inp-address').val()) { $('#inp-address').val(place.display_name); } } else { alert("找不到"); $('#coord-status').addClass('d-none'); } } catch (e) { alert("搜尋失敗"); } finally { $btn.html(originalIcon); } };
window.searchMap = function() { const query = $('#inp-location').val() || $('#inp-title').val(); if(query) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank'); else alert("請先輸入"); };
window.openGoogleMap = function(event, query) { event.stopPropagation(); window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank'); };

// --- 渲染時間軸 ---
window.renderTimeline = function() {
    const $nav = $('#day-nav').empty(); const sDate = new Date(tripMeta.start); const eDate = new Date(tripMeta.end);
    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]; const dayLabel = dateStr.split('-')[2]; const isActive = (dateStr === currDate);
        $nav.append(`<button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary border-0 bg-light text-dark'} rounded-pill px-3 fw-bold shadow-sm" onclick="changeDate('${dateStr}')" style="min-width: 50px;">${dayLabel} <small class="fw-normal" style="font-size:10px">日</small></button>`);
    }
    $('#timeline-date-label').text(currDate);
    const $list = $('#timeline-list').empty(); $list.append('<div class="timeline-line"></div>');
    const items = currentTripItems.filter(i => i.date === currDate); items.sort((a, b) => (a.start_time > b.start_time) ? 1 : -1);
    if (items.length === 0) { $list.append('<div class="text-center text-muted mt-5 small">本日無行程</div>'); $('#day-cost').text('0'); return; }

    let costSum = 0;
    items.forEach(item => {
        if (!item.is_individual) costSum += (item.cost || 0);
        let timeDisplay = `<span class="time-start">${item.start_time}</span>`; if (item.end_time) timeDisplay += `<span class="time-arrow">➝</span><span class="time-end">${item.end_time}</span>`;
        let mainContent = '', extraBadge = item.is_individual ? `<span class="badge bg-secondary rounded-pill ms-2" style="font-size:0.7em">各自</span>` : '';
        
        let mapQuery = (item.lat && item.lng) ? `${item.lat},${item.lng}` : encodeURIComponent(item.location || item.title);
        const mapBtnHtml = `<button class="btn-timeline-map" onclick="openGoogleMap(event, '${mapQuery}')"><span class="material-icons-round fs-5">map</span></button>`;

        const displayTitle = item.title; const subTitle = item.location ? item.location : '';

        if (item.type === 'transport') {
            const lineInfo = item.transport_line ? `(${item.transport_line})` : '';
            const route = (item.transport_start && item.transport_end) ? `${item.transport_start} <span class="text-muted">➝</span> ${item.transport_end} ${lineInfo}` : item.title;
            mainContent = `<h6 class="fw-bold mt-2 mb-1 text-primary pe-4">${route} ${extraBadge}</h6>`;
        } else {
            mainContent = `<h6 class="fw-bold mt-2 mb-1 text-dark pe-4">${displayTitle} ${extraBadge}</h6>${subTitle ? `<div class="small text-muted mb-1"><span class="material-icons-round fs-6 align-middle me-1">place</span>${subTitle}</div>` : ''}`;
        }
        let noteHtml = item.note ? (item.note.includes('💡') ? `<div class="mt-2 p-2 bg-warning-subtle text-warning-emphasis rounded small fw-bold border border-warning-subtle">${item.note}</div>` : `<div class="small text-muted text-truncate mt-1">${item.note}</div>`) : '';

        $list.append(`
            <div class="item-card" data-type="${item.type}" onclick="viewItem('${item.id}')">
                ${mapBtnHtml}
                <div class="time-dot"></div>
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

window.changeDate = function(dateStr) { currDate = dateStr; renderTimeline(); };

// --- 渲染路線導航包 (取代舊的地圖功能) ---
window.renderRoute = function() {
    const items = currentTripItems.filter(i => i.date === currDate);
    items.sort((a, b) => (a.start_time > b.start_time) ? 1 : -1);

    const stops = [];
    items.forEach(item => {
        let query = '';
        if (item.lat && item.lng) query = `${item.lat},${item.lng}`;
        else if (item.location) query = item.location;
        else if (item.title) query = item.title;

        // 排除單純的票券提醒或純文字筆記
        if (query && item.type !== 'luggage' && item.type !== 'expense') {
            stops.push({ name: item.location || item.title, query: query, type: item.type });
        }
    });

    const $list = $('#route-stops-list').empty();

    if (stops.length === 0) {
        $list.html('<div class="text-center text-muted py-4">本日尚無可導航的行程點</div>');
        $('#btn-open-gmaps').prop('disabled', true).addClass('opacity-50');
        return;
    }

    $('#btn-open-gmaps').prop('disabled', false).removeClass('opacity-50');

    stops.forEach((stop, idx) => {
        let icon = 'place';
        if(stop.type === 'dining') icon = 'restaurant';
        if(stop.type === 'transport') icon = 'train';
        if(stop.type === 'hotel') icon = 'hotel';

        $list.append(`
            <div class="card border-0 bg-white rounded-4 p-3 d-flex flex-row align-items-center gap-3 shadow-sm route-node">
                <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; background-color: var(--tea-oat); color: var(--tea-caramel);">
                    <span class="material-icons-round">${icon}</span>
                </div>
                <div class="fw-bold text-dark flex-grow-1 text-truncate">${stop.name}</div>
                <div class="badge bg-light text-muted border">${idx + 1}</div>
            </div>
        `);
    });

    // 產生 Google Maps 導航連結
    $('#btn-open-gmaps').off('click').on('click', () => {
        if (stops.length === 1) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stops[0].query)}`, '_blank');
            return;
        }

        const origin = encodeURIComponent(stops[0].query);
        const destination = encodeURIComponent(stops[stops.length - 1].query);
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

        if (stops.length > 2) {
            const waypoints = stops.slice(1, stops.length - 1).map(s => encodeURIComponent(s.query)).join('|');
            url += `&waypoints=${waypoints}`;
        }
        window.open(url, '_blank');
    });
};

window.renderExpense = function() { /* 同前 */ let totalCost = 0; let payers = {}; let balance = {}; companionsList.forEach(c => { payers[c.id] = 0; balance[c.id] = 0; }); currentTripItems.forEach(item => { if (item.is_individual) return; const cost = item.cost || 0; if (cost <= 0) return; totalCost += cost; const payerId = item.paid_by; if (payerId && payers[payerId] !== undefined) { payers[payerId] += cost; balance[payerId] += cost; } let splits = []; try { splits = JSON.parse(item.split_by || '[]'); } catch(e){} if (splits.length > 0) { const perPerson = cost / splits.length; splits.forEach(uid => { if (balance[uid] !== undefined) balance[uid] -= perPerson; }); } }); $('#exp-total').text(totalCost); const $payerList = $('#exp-payer-list').empty(); Object.keys(payers).sort((a,b) => payers[b] - payers[a]).forEach(uid => { if (payers[uid] > 0) { const name = companionsList.find(c=>c.id===uid)?.name || '未知'; $payerList.append(`<li class="list-group-item d-flex justify-content-between bg-transparent border-0 px-0"><span>${name}</span><span class="fw-bold text-dark">$${Math.round(payers[uid])}</span></li>`); } }); const $settleList = $('#exp-settle-list').empty(); let debtors = [], creditors = []; Object.keys(balance).forEach(uid => { const val = balance[uid]; if (val < -1) debtors.push({ id: uid, amount: val }); if (val > 1) creditors.push({ id: uid, amount: val }); }); debtors.sort((a, b) => a.amount - b.amount); creditors.sort((a, b) => b.amount - a.amount); let settleHTML = ''; let i = 0, j = 0; while (i < debtors.length && j < creditors.length) { let debt = Math.abs(debtors[i].amount); let credit = creditors[j].amount; let amount = Math.min(debt, credit); const fromName = companionsList.find(c=>c.id===debtors[i].id)?.name || '未知'; const toName = companionsList.find(c=>c.id===creditors[j].id)?.name || '未知'; settleHTML += `<div class="card border-0 bg-white p-3 shadow-sm rounded-4 mb-2"><div class="d-flex justify-content-between align-items-center"><div class="d-flex align-items-center gap-2"><span class="fw-bold text-danger">${fromName}</span><span class="material-icons-round text-muted small">arrow_forward</span><span class="fw-bold text-success">${toName}</span></div><span class="fw-bold fs-5 text-dark">$${Math.round(amount)}</span></div></div>`; debtors[i].amount += amount; creditors[j].amount -= amount; if (Math.abs(debtors[i].amount) < 1) i++; if (creditors[j].amount < 1) j++; } if (settleHTML === '') $settleList.html('<div class="text-center text-muted py-3">目前收支平衡</div>'); else $settleList.html(settleHTML); };
window.openTripModal = async function(id) { if(id) { const trips = await api('/api/trips'); const t = trips.find(x => x.id === id); $('#sheet-trip-title').text('編輯旅程'); $('#trip-id').val(t.id); $('#trip-title').val(t.title); $('#trip-start').val(t.start_date); $('#trip-end').val(t.end_date); $('#btn-del-trip').show(); companionsList = await api(`/api/companions?trip_id=${id}`); renderCompanionList(); generateHotelFields(); } else { $('#sheet-trip-title').text('新增旅程'); $('#trip-id').val(''); $('#btn-del-trip').hide(); companionsList=[]; renderCompanionList(); generateHotelFields(); } modalTrip.show(); };
window.renderCompanionList = function() { const $ul = $('#companion-list').empty(); companionsList.forEach(c => { $ul.append(`<li class="list-group-item bg-transparent border-0 d-flex justify-content-between px-0"><span>${c.name}</span><button class="btn btn-sm text-danger" onclick="removeCompanion('${c.id}')">X</button></li>`); }); };
window.addCompanionUI = function() { const name = $('#new-companion-name').val().trim(); if(!name) return; companionsList.push({ id: 'comp_' + Date.now(), trip_id: $('#trip-id').val(), name: name, is_new: true }); $('#new-companion-name').val(''); renderCompanionList(); };
window.removeCompanion = async function(id) { const idx = companionsList.findIndex(c => c.id === id); if(idx > -1) { if (!companionsList[idx].is_new && $('#trip-id').val()) { await api(`/api/companions/${id}`, 'DELETE'); } companionsList.splice(idx, 1); renderCompanionList(); } };
window.saveTrip = async function() { const id = $('#trip-id').val(); const newId = id || 'trip_' + Date.now(); await api('/api/trips', 'POST', { id: newId, title: $('#trip-title').val(), start_date: $('#trip-start').val(), end_date: $('#trip-end').val() }); for(const c of companionsList) { if(c.is_new) await api('/api/companions', 'POST', { id: c.id, trip_id: newId, name: c.name }); } modalTrip.hide(); if(!id) { loadHome(); switchView('home'); } else { selectTrip(newId, $('#trip-title').val(), $('#trip-start').val()); } };
window.deleteTrip = async function() { if(confirm("確定刪除？")) { await api(`/api/trips/${$('#trip-id').val()}`, 'DELETE'); modalTrip.hide(); loadHome(); switchView('home'); } };

// 切換 View (加入路線切換邏輯)
window.switchView = function(view) {
    $('.nav-item').removeClass('active'); 
    $(`.nav-item[onclick="switchView('${view}')"]`).addClass('active');
    
    // 注意這裡的 view-route 取代了原本的 view-map
    $('#view-home, #view-timeline, #view-route, #view-expense').addClass('d-none');
    $('#fab-new-trip, #fab-add-item').addClass('d-none'); 
    $('#btn-trip-setting').addClass('d-none');
    
    if (view === 'home') {
        $('#view-home').removeClass('d-none'); $('#fab-new-trip').removeClass('d-none'); 
        $('#app-title').text('我的旅程'); currTripId=null; loadHome();
    } else {
        if(!currTripId) return switchView('home');
        $('#btn-trip-setting').removeClass('d-none');
        
        if(view === 'timeline') { 
            $('#view-timeline').removeClass('d-none'); 
            $('#fab-add-item').removeClass('d-none'); 
            renderTimeline(); 
        } 
        else if(view === 'route') { 
            $('#view-route').removeClass('d-none'); 
            window.renderRoute(); // 呼叫新的路線函式
        } 
        else if(view === 'expense') { 
            $('#view-expense').removeClass('d-none'); 
            renderExpense(); 
        }
    }
};

window.generateHotelFields = function() { const start = $('#trip-start').val(); const end = $('#trip-end').val(); const $container = $('#hotel-fields-container').empty(); if (!start || !end) return; const sDate = new Date(start); const eDate = new Date(end); let count = 0; for (let d = new Date(sDate); d < eDate; d.setDate(d.getDate() + 1)) { count++; const dateStr = d.toISOString().split('T')[0]; $container.append(`<div class="hotel-day-block bg-transparent border-0 border-bottom mb-2 pb-2"><div class="fw-bold small text-dark mb-1">Day ${count} (${dateStr.slice(5)})</div><input type="text" class="form-control bg-light border-0 mb-1 hotel-name" data-date="${dateStr}" placeholder="飯店名稱"><input type="text" class="form-control bg-light border-0 mb-1 hotel-addr" data-date="${dateStr}" placeholder="地址"><input type="text" class="form-control bg-light border-0 hotel-img" data-date="${dateStr}" placeholder="圖片 URL"></div>`); } };
window.copyFirstHotel = function() { const name = $('.hotel-name').first().val(); const addr = $('.hotel-addr').first().val(); const img = $('.hotel-img').first().val(); if(name) { $('.hotel-name').val(name); $('.hotel-addr').val(addr); $('.hotel-img').val(img); } };