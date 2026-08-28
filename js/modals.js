// ============================================================
// 14개 건물 모달 UI & 인벤토리/장착 & 우편함 & 간편모드 & 놀이기구 스릴/운세 연출 (js/modals.js)
// ============================================================

const ModalManager = (() => {
  let activeModalId = null;
  let currentLotteryTxId = null;
  let isScratchFinished = false;

  // 행운의 운세 & 따뜻한 응원 글귀 데이터베이스
  const FORTUNES = [
    '🍀 오늘은 뜻밖의 행운과 횡재수가 따르는 날입니다! 복권을 긁어보세요.',
    '📈 주식 투자에서 대박 호재를 만나 자산이 불어날 예감입니다!',
    '🌟 친구들과 협동하면 큰 칭찬과 보상을 받게 될 멋진 하루입니다.',
    '💡 평소 생각지 못한 기발한 아이디어로 학급에서 인정받을 거예요!',
    '🎁 잡화점에서 마음에 쏙 드는 보물 아이템을 발견할 운세입니다.'
  ];

  const CHEER_MSGS = [
    '✨ "오늘도 최선을 다하는 네가 가장 빛나!"',
    '🌈 "작은 성공들이 모여 위대한 네가 될 거야!"',
    '💖 "너의 따뜻한 미소가 우리 반을 행복하게 만들어!"',
    '🚀 "실패를 두려워하지 마, 넌 이미 충분히 멋지니까!"',
    '🌸 "언제나 너를 응원해! 오늘도 힘차고 즐거운 하루 보내렴!"'
  ];

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

    // 4. 놀이기구 탑승 애니메이션 & 스릴/운세 모달
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

    // 지연 없이 0초 만에 즉시 렌더링
    try {
      renderBuildingContent(buildingId, bodyEl);
    } catch (err) {
      console.error('[Render Modal Error]', err);
      bodyEl.innerHTML = `<div style="padding:20px; text-align:center;">오류가 발생하여 기본 화면을 로드합니다.</div>`;
    }
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

    const res = await API.call('getMailbox', { name: me });
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
                보낸사람: ${m.이름 || '선생님'}
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

    const res = await API.call('getInventory', { name: me });
    const inv = Array.isArray(res) ? res : (res.inventory || []);
    if (!GameState.equippedItems) GameState.equippedItems = {};

    container.innerHTML = `
      <div class="inven-panel">
        <div class="inven-tabs" style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">
          <button class="tab-btn active" onclick="ModalManager.switchInvenTab('equips')">✨ 캐릭터 장착템</button>
          <button class="tab-btn" onclick="ModalManager.switchInvenTab('coupons')">🎟️ 학급 쿠폰 (${inv.filter(i => i.카테고리 !== '캐릭터아이템').length})</button>
          <button class="tab-btn" onclick="ModalManager.switchInvenTab('furns')">🛋️ 미니룸 가구</button>
        </div>

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

  // ─── [놀이기구 화려한 캔버스 연출 & 스릴/운세/응원글귀] ───
  function renderRideModal(container, data) {
    SoundEngine.fanfare();
    const thrillScore = Math.floor(Math.random() * 21) + 80; // 80~100점 스릴 점수
    const randFortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const randCheer = CHEER_MSGS[Math.floor(Math.random() * CHEER_MSGS.length)];

    container.innerHTML = `
      <div class="ride-modal-wrap" style="text-align:center;">
        <div style="font-size:15px; font-weight:bold; color:#1e293b; margin-bottom:6px;">
          ${data.rideTitle || data.name}에 탑승했습니다! 🎈✨
        </div>

        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:10px;">
          <div style="background:#fee2e2; border:1px solid #f87171; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; color:#991b1b;">
            🔥 스릴 만족도: <strong>${thrillScore}점 / 100점</strong>
          </div>
          <div style="background:#ecfdf5; border:1px solid #34d399; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; color:#065f46;">
            💰 보너스 용돈: <strong>+100원 지급</strong>
          </div>
        </div>

        <div style="position:relative; display:inline-block; border:3px solid #334155; border-radius:12px; overflow:hidden; box-shadow:0 8px 16px rgba(0,0,0,0.2);">
          <canvas id="ride-canvas" width="400" height="200" style="display:block; background:#0f172a;"></canvas>
        </div>

        <div style="margin-top:12px; background:#fffbeb; border:2px solid #fde68a; padding:10px 14px; border-radius:8px; text-align:left;">
          <div style="font-size:12px; font-weight:bold; color:#b45309; margin-bottom:4px;">🔮 오늘의 포춘 쿠키 & 운세</div>
          <div style="font-size:12px; color:#78350f; line-height:1.5; margin-bottom:8px;">${randFortune}</div>
          <div style="font-size:12px; font-weight:bold; color:#0369a1; border-top:1px dashed #cbd5e1; padding-top:6px;">
            💌 오늘의 응원: ${randCheer}
          </div>
        </div>
      </div>
    `;

    // 보상금 지급
    const st = GameState.student;
    if (st) {
      API.call('logEmotion', { name: st.name || st.이름, emotion: '🟢 좋음', message: `[놀이기구] ${data.name} 스릴만족(${thrillScore}점)` }, true);
    }

    setTimeout(() => {
      const cvs = document.getElementById('ride-canvas');
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      let angle = 0;

      function drawRide() {
        if (!document.getElementById('ride-canvas')) return;
        ctx.clearRect(0, 0, 400, 200);

        ctx.fillStyle = '#f8fafc';
        for (let i = 0; i < 20; i++) {
          ctx.fillRect((i * 37) % 400, (i * 23) % 180, 2, 2);
        }

        ctx.save();
        ctx.translate(200, 100);
        ctx.rotate(angle);
        for (let i = 0; i < 8; i++) {
          ctx.strokeStyle = data.rideColor || '#f43f5e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(i * Math.PI / 4) * 75, Math.sin(i * Math.PI / 4) * 75);
          ctx.stroke();

          ctx.font = '22px sans-serif';
          ctx.fillText(data.emoji || '🎠', Math.cos(i * Math.PI / 4) * 70, Math.sin(i * Math.PI / 4) * 70);
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

      // 잡화점
      case 'shop': {
        const data = await API.call('getShopItems', { name: me });
        const items = Array.isArray(data) ? data : (data.items || []);
        const furns = CONFIG.FURNITURE_CATALOG;

        container.innerHTML = `
          <div class="shop-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchShopTab('furn')">🛋️ 미니룸 가구</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('item')">🎒 캐릭터 장착템 & 쿠폰</button>
          </div>

          <div id="shop-tab-furn" class="shop-grid">
            ${furns.map(f => `
              <div class="shop-item-card">
                <div class="item-emoji">${f.emoji}</div>
                <div class="item-name">${f.name}</div>
                <div class="item-price">💰 ${f.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyFurniture('${f.id}', ${f.price}, '${f.name}')">구매하기</button>
              </div>
            `).join('')}
          </div>

          <div id="shop-tab-item" class="shop-grid" style="display:none;">
            ${items.length === 0 ? '<div style="padding:20px;">등록된 상점 아이템이 없습니다.</div>' : items.map(it => `
              <div class="shop-item-card">
                <div class="item-name">${it.아이템명 || it.itemName || it.이름}</div>
                <div class="item-desc">${it.설명 || it.desc || ''}</div>
                <div class="item-price">💰 ${(it.금액 || it.가격 || 0).toLocaleString()}원 (재고: ${it.수량 || it.재고 || 1}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyItem('${it.아이템명 || it.itemName || it.이름}', ${it.금액 || it.가격 || 0})">구매하기</button>
              </div>
            `).join('')}
          </div>
        `;
        break;
      }

      // 학급마트
      case 'mart': {
        const martData = await API.call('getMartItems');
        const items = Array.isArray(martData) ? martData : (martData.items || []);

        container.innerHTML = `
          <div class="mart-panel">
            <div style="background:#ecfdf5; border:2px solid #a7f3d0; padding:12px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="color:#065f46; font-size:16px;">🛒 학급 마트 제로페이 간편결제</h3>
                <p style="font-size:12px; color:#047857;">구매할 상품을 선택하거나, 직접 금액을 입력하여 결제하세요.</p>
              </div>
              <button class="pixel-btn-sm" onclick="ModalManager.openAddMartItemModal()">➕ 물품 등록(관리)</button>
            </div>

            <h4 style="margin-bottom:8px;">🛍️ 판매 중인 마트 물품</h4>
            <div class="shop-grid" style="margin-bottom:16px;">
              ${items.length === 0 ? '<div style="padding:10px; color:#64748b;">현재 등록된 상품이 없습니다. 아래 자율 결제를 이용하세요.</div>' : items.map(it => `
                <div class="shop-item-card">
                  <div class="item-emoji">🍎</div>
                  <div class="item-name">${it.아이템명 || it.name}</div>
                  <div class="item-price">${(it.가격 || it.금액 || 0).toLocaleString()}원 (재고: ${it.재고 || it.수량 || 1}개)</div>
                  <button class="pixel-btn-primary" onclick="ModalManager.openMartPayModal('${it.아이템명 || it.name}', ${it.가격 || it.금액 || 0})">구매 결제</button>
                </div>
              `).join('')}
            </div>

            <div style="background:#f8fafc; border:2px solid #cbd5e1; padding:14px; border-radius:8px;">
              <h4 style="margin-bottom:6px;">💳 자율 금액 결제</h4>
              <div style="display:flex; gap:8px;">
                <input type="text" id="custom-mart-item" placeholder="물품명 (예: 초코파이)" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                <input type="number" id="custom-mart-amt" placeholder="금액(원)" style="width:120px; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                <button class="pixel-btn-primary" style="width:auto; padding:8px 16px;" onclick="ModalManager.handleCustomMartPay()">결제하기</button>
              </div>
            </div>
          </div>
        `;
        break;
      }

      // 학교 본관 LMS
      case 'school': {
        const noticesRes = await API.call('getNotices');
        const notices = Array.isArray(noticesRes) ? noticesRes : (noticesRes.notices || []);
        const assignsRes = await API.call('getAssignments');
        const assigns = Array.isArray(assignsRes) ? assignsRes : (assignsRes.assignments || []);
        const mealData = await API.call('getMeal');
        const ttData = await API.call('getTimetable');

        container.innerHTML = `
          <div class="school-lms-wrap">
            <div class="lms-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchLmsTab('notice')">📢 공지사항 (${notices.length})</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('assign')">📝 과제 & 숙제 (${assigns.length})</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('meal')">🍱 오늘의 급식</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('tt')">⏰ 시간표</button>
            </div>

            <div id="lms-tab-notice" class="lms-content-tab">
              <div style="margin-bottom:10px; display:flex; justify-content:flex-end;">
                <button class="pixel-btn-sm" onclick="ModalManager.openNoticeWriteModal()">✍️ 새 공지 작성</button>
              </div>
              <div class="notice-cards" style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto;">
                ${notices.length === 0 ? '<div style="padding:20px; text-align:center;">등록된 공지사항이 없습니다.</div>' : notices.map(n => `
                  <div class="notice-card" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px;">
                    <div class="nc-date" style="font-size:11px; color:#64748b; margin-bottom:4px;">${n.일시 || n.날짜 || ''} ${n.중요도 === '긴급' ? '<span class="badge badge-danger">긴급</span>' : ''}</div>
                    <div class="nc-title" style="font-weight:bold; font-size:14px; margin-bottom:4px;">${n.제목}</div>
                    <div class="nc-content" style="font-size:12px; color:#334155; line-height:1.5;">${n.내용}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div id="lms-tab-assign" class="lms-content-tab" style="display:none;">
              <div class="table-wrap" style="max-height:300px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>과제명</th><th>내용</th><th>마감일</th><th>수당</th><th>제출</th></tr></thead>
                  <tbody>
                    ${assigns.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:15px;">등록된 과제가 없습니다.</td></tr>' : assigns.map(a => `
                      <tr>
                        <td><strong>${a.제목 || a.과제ID}</strong></td>
                        <td>${a.내용 || '-'}</td>
                        <td>${a.기간종료 || '-'}</td>
                        <td>💰 ${(a.수당 || 0).toLocaleString()}원</td>
                        <td><button class="pixel-btn-sm" onclick="ModalManager.submitAssignmentModal('${a.과제ID}', '${a.제목}')">제출</button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="lms-tab-meal" class="lms-content-tab" style="display:none;">
              <div class="meal-box" style="background:#fffbeb; border:2px solid #fde68a; padding:16px; border-radius:10px;">
                <h3 style="color:#b45309; margin-bottom:8px;">🍱 오늘의 영양 급식 식단</h3>
                <div class="meal-content" style="font-size:14px; line-height:1.7;">${mealData.meal || '찰보리밥, 한우소고기미역국, 돈육간장불고기, 상추쌈/쌈장, 배추김치, 멜론'}</div>
              </div>
            </div>

            <div id="lms-tab-tt" class="lms-content-tab" style="display:none;">
              <div class="timetable-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                ${(Array.isArray(ttData) ? ttData : (ttData.timetable || ['1교시: 국어', '2교시: 수학', '3교시: 사회', '4교시: 과학', '5교시: 체육', '6교시: 미술'])).map(t => `
                  <div class="tt-cell" style="background:#fff; border:2px solid #cbd5e1; padding:12px; border-radius:8px; text-align:center; font-weight:bold;">${t}</div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        break;
      }

      // 우체국
      case 'postoffice': {
        container.innerHTML = `
          <div class="post-panel">
            <h3>📮 친구에게 용돈 송금하기</h3>
            <div class="input-group" style="display:flex; gap:8px; margin:12px 0;">
              <input type="text" id="transfer-target" placeholder="받는 친구 이름" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
              <input type="number" id="transfer-amount" placeholder="송금할 금액" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
              <button class="pixel-btn-primary" style="width:auto; padding:8px 16px;" onclick="ModalManager.handleTransfer()">송금하기</button>
            </div>
            <h4 style="margin-top:20px;">💌 칭찬 카드 보내기 (보너스 장학금 동봉)</h4>
            <div class="form-group" style="margin-top:8px;">
              <input type="text" id="praise-target" placeholder="칭찬할 친구 이름" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; margin-bottom:6px;">
              <textarea id="praise-msg" placeholder="친구를 칭찬하는 따뜻한 메시지를 적어주세요." style="width:100%; height:60px; padding:8px; border:2px solid #94a3b8; border-radius:6px; margin-bottom:6px;"></textarea>
              <input type="number" id="praise-bonus" placeholder="동봉할 칭찬 보너스 금액(원) (기본 500원)" value="500" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; margin-bottom:8px;">
              <button class="pixel-btn-secondary" onclick="ModalManager.sendPraise()">칭찬카드 발송</button>
            </div>
          </div>
        `;
        break;
      }

      // 시청 & 교장실 관리자 패널
      case 'cityhall':
      case 'principal':
      case 'admin_quick': {
        const allData = await API.call('adminGetAllData');
        const students = allData.students || [];
        container.innerHTML = `
          <div class="admin-panel">
            <div class="admin-top-stats" style="display:flex; justify-content:space-between; background:#fee2e2; border:2px solid #fca5a5; padding:12px; border-radius:8px; margin-bottom:12px;">
              <div>👨‍🎓 등록 학생: <strong>${students.length}명</strong></div>
              <div>⚙️ 학급 관리자 권한: <strong>승인됨</strong></div>
            </div>

            <!-- 관리자 핵심 액션 툴바 -->
            <div class="admin-action-bar" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#0284c7;" onclick="ModalManager.openPaySalariesModal()">💰 월급 일괄 배부</button>
              <button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#dc2626;" onclick="ModalManager.openFineModal()">⚖️ 벌금 징수</button>
              <button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#ea580c;" onclick="ModalManager.openWarnModal()">⚠️ 경고장 발송</button>
              <button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#16a34a;" onclick="ModalManager.openNoticeWriteModal()">📢 새 공지 작성</button>
              <button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#7c3aed;" onclick="ModalManager.openAddMartItemModal()">🛒 마트 물품 등록</button>
            </div>

            <div class="admin-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchAdminTab('students')">👥 학생 자산 관리</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('stock_admin')">📈 주가 & 뉴스 발행</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('sheet_init')">🔄 시트 전체 초기화</button>
            </div>

            <div id="admin-tab-students" class="admin-tab-content">
              <div class="table-wrap" style="max-height:300px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식수량</th><th>총자산</th><th>관리</th></tr></thead>
                  <tbody>
                    ${students.map(st => `
                      <tr>
                        <td>${st.id}</td>
                        <td><strong>${st.name}</strong></td>
                        <td>${st.job}</td>
                        <td>${(st.cash || 0).toLocaleString()}원</td>
                        <td>${st.stockQty || 0}주</td>
                        <td><strong>${(st.totalAsset || 0).toLocaleString()}원</strong></td>
                        <td>
                          <button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${st.name}')">금액조정</button>
                          <button class="pixel-btn-sm" style="background:#f87171;" onclick="ModalManager.openFineModal('${st.name}')">벌금</button>
                          <button class="pixel-btn-sm" style="background:#fb923c;" onclick="ModalManager.openWarnModal('${st.name}')">경고</button>
                        </td>
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
    switchShopTab: (tab) => {
      document.getElementById('shop-tab-furn').style.display = tab === 'furn' ? 'grid' : 'none';
      document.getElementById('shop-tab-item').style.display = tab === 'item' ? 'grid' : 'none';
      document.querySelectorAll('.shop-tabs .tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (tab === 'furn' && i === 0) || (tab === 'item' && i === 1));
      });
      SoundEngine.click();
    },
    switchInvenTab: (tab) => {
      ['equips', 'coupons', 'furns'].forEach(t => {
        const el = document.getElementById(`inven-tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      SoundEngine.click();
    },
    switchLmsTab: (tab) => {
      ['notice', 'assign', 'meal', 'tt'].forEach(t => {
        const el = document.getElementById(`lms-tab-${t}`);
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
    // 관리자 액션 핸들러들
    openPaySalariesModal: async () => {
      const amt = prompt('전체 학생에게 일괄 지급할 월급 금액을 입력하세요:', '5000');
      if (!amt || isNaN(amt)) return;
      API.showLoading('월급을 배부하는 중...');
      const res = await API.call('adminPaySalaries', { amount: Number(amt) });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '월급 배부가 완료되었습니다!');
      open('principal');
    },
    openFineModal: async (targetDefault) => {
      const target = prompt('벌금을 부과할 학생 이름을 입력하세요:', targetDefault || '');
      if (!target) return;
      const amt = prompt(`${target} 학생에게 부과할 벌금 금액:`, '1000');
      if (!amt) return;
      const reason = prompt('벌금 부과 사유:', '학급 규칙 미준수');
      API.showLoading('벌금을 징수하는 중...');
      const res = await API.call('adminFineStudent', { targetName: target, amount: Number(amt), reason });
      API.hideLoading();
      SoundEngine.coin();
      alert(res?.msg || '벌금 징수가 완료되었습니다.');
      open('principal');
    },
    openWarnModal: async (targetDefault) => {
      const target = prompt('경고장을 발송할 학생 이름을 입력하세요:', targetDefault || '');
      if (!target) return;
      const reason = prompt('경고 주의 사유:', '수업 태도 주의');
      API.showLoading('경고장을 발송하는 중...');
      const res = await API.call('adminWarnStudent', { targetName: target, reason });
      API.hideLoading();
      SoundEngine.open();
      alert(res?.msg || '경고장이 발송되었습니다.');
      open('principal');
    },
    openNoticeWriteModal: async () => {
      const title = prompt('공지사항 제목을 입력하세요:');
      if (!title) return;
      const content = prompt('공지사항 내용:');
      const isUrgent = confirm('긴급 공지로 등록하시겠습니까?');
      API.showLoading('공지사항을 등록하는 중...');
      const res = await API.call('adminAddNotice', { title, content, isUrgent });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '공지사항이 등록되었습니다!');
      open('school');
    },
    openAddMartItemModal: async () => {
      const itemName = prompt('등록할 마트 물품명을 입력하세요 (예: 맛있는 젤리):');
      if (!itemName) return;
      const price = prompt('판매 가격(원):', '1000');
      const stock = prompt('초기 입고 수량(개):', '10');
      API.showLoading('마트 물품을 등록하는 중...');
      const res = await API.call('addMartItem', { itemName, price: Number(price), stock: Number(stock) });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '마트 물품이 성공적으로 등록되었습니다!');
      open('mart');
    },
    sendPraise: async () => {
      const target = document.getElementById('praise-target')?.value;
      const msg = document.getElementById('praise-msg')?.value;
      const bonus = Number(document.getElementById('praise-bonus')?.value || 500);
      if (!target || !msg) return alert('칭찬할 친구와 메시지를 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      API.showLoading('칭찬카드를 발송하는 중...');
      const res = await API.call('sendPraiseCard', { fromName: myName, targetName: target, message: msg, bonus });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '칭찬 카드가 배달되었습니다! 💌');
      close();
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
