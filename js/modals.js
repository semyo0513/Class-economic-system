// ============================================================
// 14개 건물 모달 UI & 인벤토리/장착 & 우편함 & 간편모드 & 놀이기구 연출 (js/modals.js)
// ============================================================

const ModalManager = (() => {
  let activeModalId = null;
  let currentLotteryTxId = null;
  let isScratchFinished = false;

  function open(buildingId, extraData) {
    activeModalId = buildingId;
    SoundEngine.open();

    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    if (!overlay || !titleEl || !bodyEl) return;

    // 1. 간편모드 (대시보드 게시판 뷰어)
    if (buildingId === 'quick_board') {
      titleEl.innerHTML = `📋 클래스 타운 간편 대시보드 (게시판 모드)`;
      overlay.style.display = 'flex';
      renderQuickBoard(bodyEl);
      return;
    }

    // 2. 우편함 모달
    if (buildingId === 'mailbox') {
      titleEl.innerHTML = `📬 나의 우편함 & 알림`;
      overlay.style.display = 'flex';
      renderMailboxModal(bodyEl);
      return;
    }

    // 3. 인벤토리 & 캐릭터 장착 모달
    if (buildingId === 'inventory') {
      titleEl.innerHTML = `🎒 나의 가방 & 캐릭터 장착실`;
      overlay.style.display = 'flex';
      renderInventoryModal(bodyEl);
      return;
    }

    // 4. 놀이기구 탑승 애니메이션 모달
    if (buildingId === 'ride_modal') {
      titleEl.innerHTML = `${extraData.emoji || '🎠'} ${extraData.name}`;
      overlay.style.display = 'flex';
      renderRideModal(bodyEl, extraData);
      return;
    }

    // 5. NPC 대화 모달
    if (buildingId === 'npc_modal') {
      titleEl.innerHTML = `💬 ${extraData.name} 와의 대화`;
      overlay.style.display = 'flex';
      renderNpcDialogModal(bodyEl, extraData);
      return;
    }

    // 건물 정보 조회
    const building = TownMapData.BUILDINGS.find(b => b.id === buildingId) || {
      id: buildingId,
      name: buildingId === 'admin_quick' || buildingId === 'principal' ? '교장실 (관리자 패널)' : '안내',
      signEmoji: '🏛️'
    };

    // 권한 체크
    const st = GameState.student;
    const myPerm = st ? (st.permission || st.권한 || '') : '';
    if (building.requiresPermission && (!myPerm || myPerm === '없음')) {
      SoundEngine.enter();
      alert('⛔ 시청은 학급 임원(권한 위임자)만 입장할 수 있습니다!');
      return;
    }

    if (building.requiresAdmin && !GameState.isAdmin) {
      showAdminAuthPrompt();
      return;
    }

    titleEl.innerHTML = `${building.signEmoji} ${building.name}`;
    overlay.style.display = 'flex';
    bodyEl.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">데이터를 불러오는 중입니다...</div>';

    renderBuildingContent(buildingId, bodyEl);
  }

  function close() {
    SoundEngine.close();
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    activeModalId = null;

    setTimeout(() => {
      window.focus();
      const canvas = document.querySelector('#game-canvas-wrap canvas');
      if (canvas) canvas.focus();
      if (window.GameApp) {
        const scene = window.GameApp.scene.getScene('TownScene');
        if (scene && scene.input && scene.input.keyboard) {
          scene.input.keyboard.resetKeys();
        }
      }
    }, 50);
  }

  function showAdminAuthPrompt() {
    const pw = prompt('🔐 교장실 관리자 비밀번호를 입력하세요:');
    if (!pw) return;

    API.showLoading('비밀번호를 확인하는 중...');
    API.call('adminAuth', { pw }).then(res => {
      API.hideLoading();
      if (res && (res.success || res.isAdmin)) {
        GameState.isAdmin = true;
        SoundEngine.fanfare();
        const adminBtn = document.getElementById('hud-admin-btn');
        if (adminBtn) adminBtn.style.display = 'inline-flex';
        open('principal');
      } else {
        alert('❌ 비밀번호가 올바르지 않습니다.');
      }
    });
  }

  // ─── [간편모드] 맵 이동 없이 14개 건물 원클릭 사용 ───
  function renderQuickBoard(container) {
    container.innerHTML = `
      <div class="quick-board-wrap">
        <div style="background:#ecfdf5; border:2px solid #a7f3d0; padding:10px 14px; border-radius:8px; margin-bottom:12px; font-size:12px; color:#065f46;">
          📌 <strong>간편모드</strong>에서는 캐릭터를 이동하지 않고도 마을의 모든 시설과 은행, 상점, 기숙사를 즉시 이용할 수 있습니다!
        </div>
        <div class="quick-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:10px;">
          ${TownMapData.BUILDINGS.map(b => `
            <div class="quick-card" style="background:#fff; border:2px solid #cbd5e1; border-radius:10px; padding:12px; text-align:center; cursor:pointer; transition:transform 0.1s;"
                 onclick="ModalManager.open('${b.id}')" onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='#cbd5e1'">
              <div style="font-size:32px; margin-bottom:4px;">${b.signEmoji}</div>
              <div style="font-weight:bold; font-size:13px; color:#1e293b;">${b.name}</div>
              <div style="font-size:10px; color:#64748b; margin-top:2px;">${b.desc.substring(0, 18)}...</div>
              <button class="pixel-btn-sm" style="margin-top:8px; width:100%;">바로가기</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ─── [우편함] 송금, 칭찬카드, 부동산 요청 수신함 ───
  async function renderMailboxModal(container) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';

    API.showLoading('우편함을 확인하는 중...');
    const res = await API.call('getMailbox', { name: me });
    API.hideLoading();

    const mails = Array.isArray(res) ? res : (res.mails || []);

    container.innerHTML = `
      <div class="mailbox-wrap">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-size:14px; color:#1e293b;">📬 도착한 우편 & 알림 목록 (${mails.length})</h4>
          <button class="pixel-btn-sm" onclick="ModalManager.open('postoffice')">💌 새 우편 보내기</button>
        </div>
        <div class="mail-list" style="display:flex; flex-direction:column; gap:8px; max-height:350px; overflow-y:auto;">
          ${mails.length === 0 ? `
            <div style="text-align:center; padding:30px; color:#64748b; background:#f8fafc; border-radius:8px;">
              📭 도착한 우편이 없습니다. 친구에게 먼저 칭찬카드를 보내보세요!
            </div>
          ` : mails.map(m => `
            <div class="mail-card" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:4px;">
                <span>${m.일시 || m.날짜 || '-'}</span>
                <span class="badge badge-primary">${m.카테고리 || '우편'}</span>
              </div>
              <div style="font-weight:bold; font-size:13px; color:#1e293b; margin-bottom:4px;">
                보낸사람: ${m.이름 || '익명'}
              </div>
              <div style="font-size:12px; color:#334155; line-height:1.5;">
                ${m.메세지 || m.내용 || '내용 없음'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ─── [인벤토리 & 캐릭터 장착실] ───
  async function renderInventoryModal(container) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';

    API.showLoading('가방을 여는 중...');
    const res = await API.call('getInventory', { name: me });
    API.hideLoading();

    const inv = Array.isArray(res) ? res : (res.inventory || []);
    if (!GameState.equippedItems) GameState.equippedItems = {};

    container.innerHTML = `
      <div class="inven-panel">
        <div class="inven-tabs" style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">
          <button class="tab-btn active" onclick="ModalManager.switchInvenTab('equips')">✨ 캐릭터 장착템</button>
          <button class="tab-btn" onclick="ModalManager.switchInvenTab('coupons')">🎟️ 학급 쿠폰 (${inv.filter(i => i.카테고리 !== '캐릭터아이템').length})</button>
          <button class="tab-btn" onclick="ModalManager.switchInvenTab('furns')">🛋️ 미니룸 가구</button>
        </div>

        <!-- 1. 캐릭터 장착 탭 -->
        <div id="inven-tab-equips">
          <div style="background:#fffbeb; border:2px solid #fde68a; padding:10px; border-radius:8px; margin-bottom:10px; font-size:12px; color:#b45309;">
            💡 장착한 아이템은 즉시 캐릭터의 이동속도, 크기, 오라 이펙트에 실시간으로 적용됩니다!
          </div>
          <div class="shop-grid">
            ${[
              { id: 'speed_shoes', name: '👟 스피드 롤러스케이트', desc: '이동속도 80% 증가', type: 'speed' },
              { id: 'gold_aura',   name: '✨ 황금 오라 이펙트',     desc: '반짝이는 황금빛 파티클', type: 'aura' },
              { id: 'giant_grow',  name: '🍄 슈퍼 아이키커 버섯',   desc: '캐릭터 크기 1.5배 거대화', type: 'size' },
              { id: 'angel_wings', name: '🪽 천사의 날개',         desc: '등 뒤에 날개 장착', type: 'wings' },
              { id: 'kickboard',   name: '🛴 네온 전동 킥보드',     desc: '특수 탈 것 탑승', type: 'mount' }
            ].map(eq => {
              const isEquipped = !!GameState.equippedItems[eq.id];
              return `
                <div class="shop-item-card" style="border-color:${isEquipped ? '#22c55e' : '#cbd5e1'}; background:${isEquipped ? '#f0fdf4' : '#fff'};">
                  <div class="item-name">${eq.name}</div>
                  <div class="item-desc" style="font-size:11px; color:#64748b;">${eq.desc}</div>
                  <div style="font-size:11px; font-weight:bold; color:${isEquipped ? '#15803d' : '#94a3b8'};">
                    ${isEquipped ? '🟢 장착중' : '⚪ 미장착'}
                  </div>
                  <button class="pixel-btn-primary" style="background:${isEquipped ? '#ef4444' : '#22c55e'}; border-color:${isEquipped ? '#991b1b' : '#14532d'};"
                          onclick="ModalManager.toggleEquip('${eq.id}')">
                    ${isEquipped ? '해제하기' : '장착하기'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. 쿠폰 탭 -->
        <div id="inven-tab-coupons" style="display:none;">
          <div class="shop-grid">
            ${inv.filter(i => i.카테고리 !== '캐릭터아이템').length === 0 ? `
              <div style="grid-column: 1/-1; text-align:center; padding:30px; color:#64748b; background:#f8fafc; border-radius:10px;">
                보유 중인 쿠폰이 없습니다. 잡화점에서 쿠폰을 구매해보세요!
              </div>
            ` : inv.filter(i => i.카테고리 !== '캐릭터아이템').map(it => `
              <div class="shop-item-card" style="border-color:#38bdf8;">
                <div class="item-emoji">🎟️</div>
                <div class="item-name">${it.아이템명 || it.itemName}</div>
                <div class="item-desc" style="font-size:11px; color:#64748b;">${it.설명 || '학급 전용 쿠폰'}</div>
                <button class="pixel-btn-primary" onclick="ModalManager.handleUseItem('${it.아이템명 || it.itemName}')">✨ 사용하기</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 3. 가구 탭 -->
        <div id="inven-tab-furns" style="display:none;">
          <div class="shop-grid">
            ${CONFIG.FURNITURE_CATALOG.map(f => `
              <div class="shop-item-card">
                <div class="item-emoji">${f.emoji}</div>
                <div class="item-name">${f.name}</div>
                <div class="item-desc" style="font-size:11px; color:#64748b;">${f.type}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ─── [놀이기구 화려한 캔버스 연출 모달] ───
  function renderRideModal(container, data) {
    SoundEngine.fanfare();
    container.innerHTML = `
      <div class="ride-modal-wrap" style="text-align:center;">
        <div style="font-size:14px; font-weight:bold; color:#1e293b; margin-bottom:8px;">
          ${data.rideTitle || data.name}에 탑승했습니다! 🎈✨
        </div>
        <div style="position:relative; display:inline-block; border:3px solid #334155; border-radius:12px; overflow:hidden; box-shadow:0 8px 16px rgba(0,0,0,0.2);">
          <canvas id="ride-canvas" width="400" height="220" style="display:block; background:#0f172a;"></canvas>
        </div>
        <div id="ride-status-msg" style="margin-top:10px; font-weight:bold; font-size:14px; color:#15803d;">
          🎉 즐겁게 탑승 중! 스릴 만족도 보상 +100원이 지급되었습니다!
        </div>
      </div>
    `;

    // 보상금 지급
    const st = GameState.student;
    if (st) {
      API.call('logEmotion', { name: st.name || st.이름, emotion: '🟢 좋음', message: `[놀이기구] ${data.name} 탑승 즐거움` });
    }

    // Canvas 회전/파티클 애니메이션
    setTimeout(() => {
      const cvs = document.getElementById('ride-canvas');
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      let angle = 0;

      function drawRide() {
        if (!document.getElementById('ride-canvas')) return;
        ctx.clearRect(0, 0, 400, 220);

        // 밤하늘 별
        ctx.fillStyle = '#f8fafc';
        for (let i = 0; i < 20; i++) {
          ctx.fillRect((i * 37) % 400, (i * 23) % 180, 2, 2);
        }

        // 회전하는 중앙 빛
        ctx.save();
        ctx.translate(200, 110);
        ctx.rotate(angle);
        for (let i = 0; i < 8; i++) {
          ctx.strokeStyle = data.rideColor || '#f43f5e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(i * Math.PI / 4) * 80, Math.sin(i * Math.PI / 4) * 80);
          ctx.stroke();

          ctx.font = '24px sans-serif';
          ctx.fillText(data.emoji || '🎠', Math.cos(i * Math.PI / 4) * 75, Math.sin(i * Math.PI / 4) * 75);
        }
        ctx.restore();

        angle += 0.03;
        requestAnimationFrame(drawRide);
      }
      drawRide();
    }, 50);
  }

  // ─── [NPC 대화 모달] ───
  function renderNpcDialogModal(container, npc) {
    SoundEngine.open();
    const dialogs = npc.dialogs || [npc.dialog || '반가워요!'];
    container.innerHTML = `
      <div class="npc-dialog-wrap" style="background:#fffdf7; padding:12px; border-radius:10px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; border-bottom:2px solid #cbd5e1; padding-bottom:10px;">
          <div style="font-size:42px; background:#e0f2fe; padding:8px; border-radius:50%;">🐾</div>
          <div>
            <div style="font-size:16px; font-weight:bold; color:#1e293b;">${npc.name}</div>
            <div style="font-size:11px; color:#64748b;">마을 주민 동물 친구</div>
          </div>
        </div>
        <div class="npc-bubble" style="background:#f8fafc; border:2px solid #94a3b8; border-radius:10px; padding:14px; font-size:13px; color:#1e293b; line-height:1.6; margin-bottom:14px;">
          ${dialogs.map(d => `<p style="margin-bottom:6px;">"${d}"</p>`).join('')}
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="pixel-btn-primary" style="width:auto; padding:8px 18px;" onclick="ModalManager.close()">대화 끝내기</button>
        </div>
      </div>
    `;
  }

  async function renderBuildingContent(id, container) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myCash = st ? (st.cash ?? st.현금 ?? 0) : 0;
    const myStock = st ? (st.stock ?? st.주식 ?? 0) : 0;

    switch (id) {
      case 'dormitory':
        MiniroomSystem.renderDormitoryList(container);
        break;

      case 'bank': {
        const data = await API.call('getDeposits', { name: me });
        const deposits = Array.isArray(data) ? data : (data.deposits || []);
        const rateVal = data.rate || 0.05;
        container.innerHTML = `
          <div class="bank-panel">
            <div class="stat-banner" style="background:#e0f2fe; padding:12px; border-radius:8px; margin-bottom:14px;">
              <div>🏦 현재 정기예금 이율: <strong>연 ${(rateVal * 100).toFixed(1)}%</strong></div>
              <div>💰 나의 현금 잔액: <strong>${myCash.toLocaleString()}원</strong></div>
            </div>
            <div class="action-card-grid">
              <div class="action-card">
                <h4>📥 신규 예금 가입하기</h4>
                <div class="input-group" style="display:flex; gap:8px; margin-top:8px;">
                  <input type="number" id="deposit-amount-input" placeholder="예금할 금액 (최소 1,000원)" step="1000" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:8px 16px;" onclick="ModalManager.handleDeposit()">예금하기</button>
                </div>
              </div>
            </div>
            <h4 style="margin-top:20px;">📜 나의 예금 계좌 목록</h4>
            <div class="table-wrap" style="margin-top:8px;">
              <table class="pixel-table">
                <thead><tr><th>가입일</th><th>원금</th><th>이율</th><th>상태</th><th>관리</th></tr></thead>
                <tbody>
                  ${deposits.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:15px;">가입된 예금이 없습니다.</td></tr>' : deposits.map((d, i) => `
                    <tr>
                      <td>${d.일시 || d.날짜 || '-'}</td>
                      <td>${(d.금액 || 0).toLocaleString()}원</td>
                      <td>${((d.속성 || rateVal) * 100).toFixed(1)}%</td>
                      <td><span class="badge badge-success">${d.상태 || '활성'}</span></td>
                      <td><button class="pixel-btn-sm" onclick="ModalManager.handleWithdraw(${i})">만기해지</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
        break;
      }

      case 'stock': {
        const data = await API.call('getStockData', { name: me });
        const curPrice = data.currentPrice || data.info?.현재가 || 1200;
        let rawHistory = data.history || [];
        let history = rawHistory.map(h => typeof h === 'object' ? Number(h.price || 1200) : Number(h));
        if (history.length < 2) history = [Math.round(curPrice * 0.95), curPrice];

        container.innerHTML = `
          <div class="stock-panel">
            <div class="stock-header-grid" style="display:flex; justify-content:space-between; background:#f8fafc; padding:12px; border:2px solid #cbd5e1; border-radius:8px; margin-bottom:12px;">
              <div>
                <div style="font-size:13px; color:#64748b;">📈 행복초 협동조합 주식회사</div>
                <div style="font-size:22px; font-weight:bold; color:#ef4444;">${curPrice.toLocaleString()}원</div>
              </div>
              <div style="text-align:right;">
                <div>보유 주식: <strong>${myStock.toLocaleString()}주</strong></div>
                <div>평가 금액: <strong>${(myStock * curPrice).toLocaleString()}원</strong></div>
              </div>
            </div>
            <div class="stock-chart-wrap" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px; text-align:center; margin-bottom:12px;">
              <canvas id="stock-chart-canvas" width="600" height="180" style="width:100%; max-width:600px; height:180px;"></canvas>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
              <div style="background:#fee2e2; padding:10px; border-radius:8px;">
                <h4 style="color:#991b1b; margin-bottom:6px;">🔴 매수</h4>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="stock-buy-qty" placeholder="수량" min="1" value="1" style="flex:1; padding:6px; border:1px solid #f87171; border-radius:4px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:6px 14px;" onclick="ModalManager.handleTradeStock('매수')">매수</button>
                </div>
              </div>
              <div style="background:#e0f2fe; padding:10px; border-radius:8px;">
                <h4 style="color:#075985; margin-bottom:6px;">🔵 매도</h4>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="stock-sell-qty" placeholder="수량" min="1" max="${myStock}" value="1" style="flex:1; padding:6px; border:1px solid #60a5fa; border-radius:4px;">
                  <button class="pixel-btn-secondary" onclick="ModalManager.handleTradeStock('매도')">매도</button>
                </div>
              </div>
            </div>
          </div>
        `;

        setTimeout(() => {
          const cvs = document.getElementById('stock-chart-canvas');
          if (!cvs) return;
          const ctx = cvs.getContext('2d');
          const W = cvs.width, H = cvs.height, padding = 30;
          const max = Math.max(...history) * 1.05, min = Math.min(...history) * 0.95, range = Math.max(1, max - min);

          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
          ctx.beginPath();
          history.forEach((val, idx) => {
            const x = padding + (idx / Math.max(1, history.length - 1)) * (W - padding * 2);
            const y = H - padding - ((val - min) / range) * (H - padding * 2);
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }, 50);
        break;
      }

      // 부동산 좌석 & 구매 요청
      case 'realestate': {
        const data = await API.call('getRealEstateData', { name: me });
        const seats = data.seats || [];
        container.innerHTML = `
          <div class="realestate-panel">
            <div class="blackboard-indicator">🪧 [ 칠 판 ] (교탁 앞)</div>
            <div style="font-size:12px; color:#475569; margin-bottom:10px; text-align:center;">
              💡 다른 친구가 앉아있는 좌석을 클릭하면 <strong>좌석 양도/구매 요청</strong>을 보낼 수 있습니다!
            </div>
            <div class="seats-grid">
              ${seats.map(s => `
                <div class="seat-cell ${s.owner === me ? 'my-seat' : (s.isForSale ? 'sale-seat' : 'occupied-seat')}"
                     onclick="ModalManager.handleSeatClick('${s.id}', '${s.owner || ''}', ${s.isForSale}, ${s.price || 5000})">
                  <div class="seat-id">${s.id}</div>
                  <div class="seat-owner">${s.owner || '(빈자리)'}</div>
                  <div class="seat-price">${s.isForSale ? `매물 ${(s.price).toLocaleString()}원` : ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 교장실 관리자 패널
      case 'principal':
      case 'admin_quick': {
        const allData = await API.call('adminGetAllData');
        const students = allData.students || [];
        container.innerHTML = `
          <div class="admin-panel">
            <div class="admin-top-stats" style="display:flex; justify-content:space-between; background:#fee2e2; border:2px solid #fca5a5; padding:12px; border-radius:8px; margin-bottom:12px;">
              <div>👨‍🎓 등록 학생: <strong>${students.length}명</strong></div>
              <div>⚙️ 관리자 모드: <strong>승인됨 (선생님)</strong></div>
            </div>
            <div class="admin-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchAdminTab('students')">👥 학생 자산 관리</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('stock_admin')">📈 주가 & 뉴스 발행</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('sheet_init')">🔄 시트 전체 초기화</button>
            </div>

            <div id="admin-tab-students" class="admin-tab-content">
              <div class="table-wrap" style="max-height:350px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식수량</th><th>총자산</th><th>자산조정</th></tr></thead>
                  <tbody>
                    ${students.map(st => `
                      <tr>
                        <td>${st.id}</td>
                        <td><strong>${st.name}</strong></td>
                        <td>${st.job}</td>
                        <td>${(st.cash || 0).toLocaleString()}원</td>
                        <td>${st.stockQty || 0}주</td>
                        <td><strong>${(st.totalAsset || 0).toLocaleString()}원</strong></td>
                        <td><button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${st.name}')">지급/차감</button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="admin-tab-stock_admin" class="admin-tab-content" style="display:none;">
              <div class="form-group" style="margin-bottom:10px;">
                <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">신규 주가 설정 (원)</label>
                <input type="number" id="admin-new-stock-price" placeholder="예: 1300" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">주식 뉴스 제목</label>
                <input type="text" id="admin-stock-news-title" placeholder="예: 학급 마트 신규 오픈 호재" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
              </div>
              <button class="pixel-btn-primary" onclick="ModalManager.adminUpdateStock()">주가 변동 반영</button>
            </div>

            <div id="admin-tab-sheet_init" class="admin-tab-content" style="display:none; text-align:center; padding:20px;">
              <p style="color:#ef4444; font-weight:bold; margin-bottom:12px;">구글 시트의 11개 시트 구조와 기본 데이터를 완전하게 재구성합니다.</p>
              <button class="pixel-btn-primary" style="background:#ef4444; border-color:#991b1b;" onclick="ModalManager.adminInitSheets()">11개 시스템 시트 자동 초기화 실행</button>
            </div>
          </div>
        `;
        break;
      }

      default:
        container.innerHTML = `<div style="padding:20px;">${building.desc || '준비 중인 건물입니다.'}</div>`;
    }
  }

  return {
    open,
    close,
    switchInvenTab: (tab) => {
      ['equips', 'coupons', 'furns'].forEach(t => {
        const el = document.getElementById(`inven-tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      SoundEngine.click();
    },
    switchAdminTab: (tab) => {
      ['students', 'stock_admin', 'sheet_init'].forEach(t => {
        const el = document.getElementById(`admin-tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      SoundEngine.click();
    },
    toggleEquip: (id) => {
      if (!GameState.equippedItems) GameState.equippedItems = {};
      GameState.equippedItems[id] = !GameState.equippedItems[id];
      SoundEngine.snap();
      open('inventory');
    },
    handleUseItem: async (itemName) => {
      if (!confirm(`[${itemName}] 쿠폰을 사용하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      API.showLoading('아이템을 사용하는 중...');
      const res = await API.call('useItem', { name: myName, itemName });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '쿠폰이 사용되었습니다!');
      open('inventory');
    },
    handleSeatClick: async (seatId, owner, isForSale, price) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';

      if (owner === myName) {
        alert(`좌석 [${seatId}]은(는) 회원님의 현재 좌석입니다! ⭐`);
        return;
      }

      const offer = prompt(`[${seatId}] 좌석 (${owner || '빈자리'})\n${owner}님에게 제안할 구매 금액을 입력하세요:`, price || 5000);
      if (!offer) return;

      API.showLoading('좌석 구매 요청을 전송하는 중...');
      const res = await API.call('requestSeatTrade', { fromName: myName, targetOwner: owner, seatId, offerPrice: Number(offer) });
      API.hideLoading();

      SoundEngine.fanfare();
      alert(res?.msg || `${owner}님에게 좌석 구매 요청이 전송되었습니다!`);
    },
    handleDeposit: async () => {
      const val = parseInt(document.getElementById('deposit-amount-input')?.value, 10);
      if (!val || val < 1000) return alert('최소 1,000원 이상 예금할 수 있습니다.');
      const st = GameState.student;
      const res = await API.call('depositMoney', { name: st.name || st.이름, amount: val });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg);
        open('bank');
      } else {
        alert(res?.msg || '예금 가입 실패');
      }
    },
    handleWithdraw: async (idx) => {
      const st = GameState.student;
      const res = await API.call('withdrawDeposit', { name: st.name || st.이름, rowIdx: idx });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg);
        open('bank');
      } else {
        alert(res?.msg || '해지 실패');
      }
    },
    handleTradeStock: async (type) => {
      const qty = parseInt(document.getElementById(type === '매수' ? 'stock-buy-qty' : 'stock-sell-qty')?.value, 10);
      if (!qty || qty <= 0) return alert('올바른 수량을 입력하세요.');
      const st = GameState.student;
      const res = await API.call('tradeStock', { name: st.name || st.이름, type, qty });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg);
        open('stock');
      } else {
        alert(res?.msg || '주문 실패');
      }
    },
    adminAdjustCash: (name) => {
      const delta = prompt(`${name} 학생에게 지급할 금액 (차감 시 -금액):`);
      if (delta) {
        API.call('updateCash', { name, delta: Number(delta), reason: '관리자 직권 조정' }).then(() => {
          SoundEngine.coin();
          alert('자산이 조정되었습니다.');
          open('principal');
        });
      }
    },
    adminUpdateStock: () => {
      const price = document.getElementById('admin-new-stock-price')?.value || 1300;
      const title = document.getElementById('admin-stock-news-title')?.value || '학급 경제 호재';
      API.call('adminUpdateStock', { price, title }).then(() => {
        SoundEngine.coin();
        alert('신규 주가와 뉴스가 발행되었습니다!');
        open('principal');
      });
    },
    adminInitSheets: () => {
      if (!confirm('11개 시스템 시트를 초기화하시겠습니까?')) return;
      API.showLoading('시트를 초기화하는 중...');
      API.call('initSystemSheets').then(res => {
        API.hideLoading();
        SoundEngine.fanfare();
        alert(res?.msg || '시트가 초기화되었습니다!');
      });
    }
  };
})();
