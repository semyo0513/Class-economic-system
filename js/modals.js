// ============================================================
// 14개 건물별 완전한 인터랙티브 모달 UI & 교장실 관리자 패널 (js/modals.js)
// ============================================================

const ModalManager = (() => {
  let activeModalId = null;
  let currentLotteryTxId = null;
  let isScratchFinished = false;

  function open(buildingId) {
    activeModalId = buildingId;
    SoundEngine.open();

    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    if (!overlay || !titleEl || !bodyEl) return;

    // 해당 건물 정보 조회
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

    // 건물별 렌더링 디스패치
    renderBuildingContent(buildingId, bodyEl);
  }

  function close() {
    SoundEngine.close();
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    activeModalId = null;
  }

  // 관리자 비밀번호 입력 팝업
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

  async function renderBuildingContent(id, container) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myCash = st ? (st.cash ?? st.현금 ?? 0) : 0;
    const myStock = st ? (st.stock ?? st.주식 ?? 0) : 0;

    switch (id) {
      // 1. 학생 기숙사 (미니룸)
      case 'dormitory':
        MiniroomSystem.renderDormitoryList(container);
        break;

      // 2. 은행
      case 'bank': {
        const data = await API.call('getDeposits', { name: me });
        const deposits = Array.isArray(data) ? data : (data.deposits || []);
        const rateVal = data.rate || data.depositRate || 0.05;
        const ratePct = (rateVal * 100).toFixed(1);
        container.innerHTML = `
          <div class="bank-panel">
            <div class="stat-banner" style="background:#e0f2fe; padding:12px; border-radius:8px; margin-bottom:14px;">
              <div>🏦 현재 정기예금 이율: <strong>연 ${ratePct}%</strong></div>
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
                <thead><tr><th>가입일</th><th>원금</th><th>이율</th><th>상태</th><th>예상이자</th><th>관리</th></tr></thead>
                <tbody>
                  ${deposits.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:15px;">가입된 예금이 없습니다.</td></tr>' : deposits.map((d, i) => `
                    <tr>
                      <td>${d.날짜 || d.date || '-'}</td>
                      <td>${(d.금액 || d.amount || 0).toLocaleString()}원</td>
                      <td>${((d.이자율 || rateVal) * 100).toFixed(1)}%</td>
                      <td><span class="badge badge-success">${d.상태 || d.status || '예치중'}</span></td>
                      <td>+${(d.예상이자 || d.interest || 0).toLocaleString()}원</td>
                      <td><button class="pixel-btn-sm" onclick="ModalManager.handleWithdraw(${d._idx ?? i})">만기해지</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
        break;
      }

      // 3. 증권거래소 (완벽한 주가 차트 렌더러)
      case 'stock': {
        const data = await API.call('getStockData', { name: me });
        const curPrice = data.info?.현재가 || data.currentPrice || data.price || 1200;
        const change = data.change || 0;
        const myCount = data.myStock?.count || (curPrice > 0 ? Math.floor(myStock / curPrice) : 0);
        
        // 가격 히스토리 정규화
        let rawHistory = data.history || [];
        let history = [];
        let dateLabels = [];
        
        if (Array.isArray(rawHistory) && rawHistory.length > 0) {
          rawHistory.forEach(h => {
            if (typeof h === 'object' && h !== null) {
              history.push(Number(h.price || h.값1 || curPrice));
              dateLabels.push(String(h.date || h.날짜 || '').slice(-5));
            } else {
              history.push(Number(h));
              dateLabels.push('');
            }
          });
        }
        if (history.length < 2) {
          history = [Math.round(curPrice * 0.95), Math.round(curPrice * 0.98), curPrice];
          dateLabels = ['어제', '오늘', '현재'];
        }

        container.innerHTML = `
          <div class="stock-panel">
            <div class="stock-header-grid" style="display:flex; justify-content:space-between; background:#f8fafc; padding:12px; border:2px solid #cbd5e1; border-radius:8px; margin-bottom:12px;">
              <div class="stock-price-box">
                <div class="stock-name" style="font-size:13px; color:#64748b;">📈 행복초 협동조합 주식회사</div>
                <div class="stock-current-price" style="font-size:22px; font-weight:bold; color:#ef4444; margin-top:2px;">
                  ${curPrice.toLocaleString()}원 <small style="font-size:12px; color:#15803d;">(현재가)</small>
                </div>
              </div>
              <div class="stock-my-box" style="text-align:right;">
                <div>보유 주식: <strong>${myStock.toLocaleString()}주</strong></div>
                <div>평가 금액: <strong>${(myStock * curPrice).toLocaleString()}원</strong></div>
              </div>
            </div>

            <!-- 고해상도 Canvas 주가 차트 -->
            <div class="stock-chart-wrap" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px; text-align:center; margin-bottom:12px;">
              <div style="font-size:11px; color:#64748b; text-align:left; margin-bottom:6px;">📊 최근 주가 변동 추이</div>
              <canvas id="stock-chart-canvas" width="600" height="180" style="width:100%; max-width:600px; height:180px;"></canvas>
            </div>

            <div class="stock-trade-box" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
              <div class="trade-col" style="background:#fee2e2; padding:10px; border-radius:8px;">
                <h4 style="color:#991b1b; margin-bottom:6px;">🔴 주식 매수 (사기)</h4>
                <div class="input-group" style="display:flex; gap:6px;">
                  <input type="number" id="stock-buy-qty" placeholder="수량(주)" min="1" value="1" style="flex:1; padding:6px; border:1px solid #f87171; border-radius:4px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:6px 14px;" onclick="ModalManager.handleTradeStock('매수')">매수</button>
                </div>
              </div>
              <div class="trade-col" style="background:#e0f2fe; padding:10px; border-radius:8px;">
                <h4 style="color:#075985; margin-bottom:6px;">🔵 주식 매도 (팔기)</h4>
                <div class="input-group" style="display:flex; gap:6px;">
                  <input type="number" id="stock-sell-qty" placeholder="수량(주)" min="1" max="${myStock}" value="1" style="flex:1; padding:6px; border:1px solid #60a5fa; border-radius:4px;">
                  <button class="pixel-btn-secondary" onclick="ModalManager.handleTradeStock('매도')">매도</button>
                </div>
              </div>
            </div>

            <h4 style="margin-top:10px;">📰 주식 시장 뉴스 & 호재</h4>
            <div class="news-list" style="margin-top:6px; max-height:140px; overflow-y:auto;">
              ${(data.news || []).map(n => `
                <div class="news-item" style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #e2e8f0; font-size:12px;">
                  <span><strong>${n.제목 || n.title || ''}</strong> <small style="color:#64748b;">${n.내용 || n.content || ''}</small></span>
                  <span class="badge ${n.영향 === '상승' ? 'badge-danger' : 'badge-primary'}">${n.영향 || '뉴스'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Canvas 선 차트 고품질 렌더링
        setTimeout(() => {
          const cvs = document.getElementById('stock-chart-canvas');
          if (!cvs) return;
          const ctx = cvs.getContext('2d');
          const W = cvs.width;
          const H = cvs.height;
          const padding = 35;

          const max = Math.max(...history) * 1.05;
          const min = Math.min(...history) * 0.95;
          const range = Math.max(1, max - min);

          ctx.clearRect(0, 0, W, H);

          // 배경 그리드 라인
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const y = padding + (i / 3) * (H - padding * 2);
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(W - padding, y); ctx.stroke();
          }

          // 주가 꺾은선 그리기
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          history.forEach((val, idx) => {
            const x = padding + (idx / Math.max(1, history.length - 1)) * (W - padding * 2);
            const y = H - padding - ((val - min) / range) * (H - padding * 2);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // 그라디언트 채우기
          const grad = ctx.createLinearGradient(0, padding, 0, H - padding);
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
          ctx.fillStyle = grad;
          ctx.lineTo(W - padding, H - padding);
          ctx.lineTo(padding, H - padding);
          ctx.closePath();
          ctx.fill();

          // 포인트 점 & 가격 레이블
          history.forEach((val, idx) => {
            const x = padding + (idx / Math.max(1, history.length - 1)) * (W - padding * 2);
            const y = H - padding - ((val - min) / range) * (H - padding * 2);
            
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // 가격 텍스트
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${val}원`, x, y - 8);
          });
        }, 60);
        break;
      }

      // 4. 잡화점 & 가구점 (가구 구매 시 미니룸 인벤토리 자동 누적)
      case 'shop': {
        const data = await API.call('getShopItems', { name: me });
        const items = Array.isArray(data) ? data : (data.items || []);
        const furns = CONFIG.FURNITURE_CATALOG;

        container.innerHTML = `
          <div class="shop-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchShopTab('furn')">🛋️ 미니룸 가구 & 인테리어</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('item')">🎒 학급 아이템</button>
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
                <div class="item-emoji">${it.이모지 || it.emoji || '📦'}</div>
                <div class="item-name">${it.아이템명 || it.이름 || it.name}</div>
                <div class="item-desc">${it.설명 || it.desc || ''}</div>
                <div class="item-price">💰 ${(it.가격 || it.price || 0).toLocaleString()}원 (재고: ${it.재고 || it.stock || 1}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyItem('${it.아이템명 || it.이름 || it.name}', ${it.가격 || it.price || 0})">구매하기</button>
              </div>
            `).join('')}
          </div>
        `;
        break;
      }

      // 5. 행운의 복권방 (실제 시트 기록 및 당첨금 반영)
      case 'lottery': {
        const info = await API.call('getLotteryInfo', { name: me });
        const price = info.price || 500;
        const maxPrize = 50000;

        container.innerHTML = `
          <div class="lottery-panel">
            <div class="lottery-banner" style="background:#fef3c7; border:2px solid #f59e0b; padding:16px; border-radius:10px; text-align:center;">
              <h3 style="color:#b45309; margin-bottom:8px;">🎰 인생 역전! 행운의 즉석 긁는 복권</h3>
              <p style="font-size:13px; color:#78350f; margin-bottom:12px;">
                복권 1장 가격: <strong>${price.toLocaleString()}원</strong> | 나의 잔액: <strong>${myCash.toLocaleString()}원</strong>
              </p>
              <button class="pixel-btn-primary pixel-btn-lg" style="max-width:300px;" onclick="ModalManager.startScratchLottery(${price})">
                🎫 복권 1장 구매 & 긁기 (${price.toLocaleString()}원)
              </button>
            </div>

            <div id="scratch-stage-wrap" style="display:none; margin-top:20px; text-align:center;">
              <p style="font-size:13px; font-weight:bold; color:#1e293b; margin-bottom:8px;">동전이나 마우스로 회색 스크래치 영역을 긁어보세요!</p>
              <div class="scratch-canvas-container" style="position:relative; display:inline-block; width:300px; height:150px; box-shadow:0 6px 15px rgba(0,0,0,0.2); border-radius:10px; overflow:hidden;">
                <div id="scratch-result-text" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:18px; font-weight:bold; background:#fffbeb; color:#b45309;">
                  <div>당첨 결과를 확인하는 중...</div>
                </div>
                <canvas id="scratch-canvas" width="300" height="150" style="position:absolute; inset:0; cursor:crosshair;"></canvas>
              </div>
              <div id="scratch-finish-msg" style="margin-top:10px; font-weight:bold; font-size:14px;"></div>
            </div>
          </div>
        `;
        break;
      }

      // 6. 학급마트 간편결제 창
      case 'mart': {
        const martData = await API.call('getMartItems');
        const items = Array.isArray(martData) ? martData : (martData.items || []);

        container.innerHTML = `
          <div class="mart-panel">
            <div style="background:#ecfdf5; border:2px solid #a7f3d0; padding:12px; border-radius:8px; margin-bottom:12px;">
              <h3 style="color:#065f46; font-size:16px;">🛒 학급 마트 제로페이 간편결제</h3>
              <p style="font-size:12px; color:#047857;">구매할 상품을 선택하거나, 직접 금액을 입력하여 결제하세요.</p>
            </div>

            <h4 style="margin-bottom:8px;">🛍️ 판매 중인 마트 간식/물품</h4>
            <div class="shop-grid" style="margin-bottom:16px;">
              ${items.length === 0 ? '<div style="padding:10px; color:#64748b;">현재 등록된 상품이 없습니다. 아래 자율 결제를 이용하세요.</div>' : items.map(it => `
                <div class="shop-item-card">
                  <div class="item-emoji">🍎</div>
                  <div class="item-name">${it.아이템명 || it.name}</div>
                  <div class="item-price">${(it.가격 || 0).toLocaleString()}원 (재고: ${it.재고 || 1}개)</div>
                  <button class="pixel-btn-primary" onclick="ModalManager.openMartPayModal('${it.아이템명 || it.name}', ${it.가격 || 0})">구매 결제</button>
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

      // 7. 학교 본관 LMS (실제 공지/과제/급식/시간표)
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
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('call')">🙋 선생님 호출</button>
            </div>

            <div id="lms-tab-notice" class="lms-content-tab">
              <div class="notice-cards" style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto;">
                ${notices.length === 0 ? '<div style="padding:20px; text-align:center;">등록된 공지사항이 없습니다.</div>' : notices.map(n => `
                  <div class="notice-card ${n.중요 === '긴급' || n.중요 === true ? 'notice-urgent' : ''}" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px;">
                    <div class="nc-date" style="font-size:11px; color:#64748b; margin-bottom:4px;">${n.날짜 || ''} ${n.중요 === '긴급' ? '<span class="badge badge-danger">긴급</span>' : ''}</div>
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

            <div id="lms-tab-call" class="lms-content-tab" style="display:none;">
              <div class="call-box" style="background:#f8fafc; border:2px solid #cbd5e1; padding:16px; border-radius:10px;">
                <h4>🙋 선생님께 도움이 필요해요 (1:1 긴급 호출)</h4>
                <textarea id="call-reason-input" placeholder="선생님께 드릴 말씀이나 호출 사유를 적어주세요." style="width:100%; height:80px; padding:8px; border:2px solid #94a3b8; border-radius:6px; margin:10px 0;"></textarea>
                <button class="pixel-btn-primary" onclick="ModalManager.sendTeacherCall()">선생님 호출하기</button>
              </div>
            </div>
          </div>
        `;
        break;
      }

      // 8. 상담실 (감정 신호등 실제 시트 기록)
      case 'counseling': {
        container.innerHTML = `
          <div class="counsel-panel">
            <h3>💚 오늘의 마음 감정 신호등</h3>
            <p style="font-size:13px; color:#475569; margin-top:4px;">오늘의 기분을 선택하면 구글 시트에 기록되고 장학금 보상이 즉시 지급됩니다!</p>
            <div class="emotion-picker">
              <div class="emotion-btn btn-green" onclick="ModalManager.logEmotion('🟢 좋음')">
                <span class="emo-icon">🟢</span>
                <span class="emo-text">좋음 (+500원)</span>
              </div>
              <div class="emotion-btn btn-yellow" onclick="ModalManager.logEmotion('🟡 보통')">
                <span class="emo-icon">🟡</span>
                <span class="emo-text">보통 (+300원)</span>
              </div>
              <div class="emotion-btn btn-red" onclick="ModalManager.logEmotion('🔴 힘듦')">
                <span class="emo-icon">🔴</span>
                <span class="emo-text">힘듦/상담 (+1,000원)</span>
              </div>
            </div>
            <div class="emotion-comment-wrap" style="margin-top:15px;">
              <input type="text" id="emotion-memo" placeholder="선생님께 전하고 싶은 한마디 (선택)" style="width:100%; padding:10px; border:2px solid #94a3b8; border-radius:8px;">
            </div>
          </div>
        `;
        break;
      }

      // 9. 부동산 중개소
      case 'realestate': {
        const data = await API.call('getRealEstateData', { name: me });
        const seats = data.seats || [];
        container.innerHTML = `
          <div class="realestate-panel">
            <div class="blackboard-indicator">🪧 [ 칠 판 ] (교탁 앞)</div>
            <div class="seats-grid">
              ${seats.map(s => `
                <div class="seat-cell ${(s.owner || s.이름) === me ? 'my-seat' : (s.isForSale ? 'sale-seat' : 'occupied-seat')}"
                     onclick="ModalManager.handleSeatClick('${s.id || s.좌석ID}', '${s.owner || s.이름 || ''}', ${s.isForSale}, ${s.price || s.매물가격 || 0})">
                  <div class="seat-id">${s.id || s.좌석ID}</div>
                  <div class="seat-owner">${s.owner || s.이름 || '(빈자리)'}</div>
                  <div class="seat-price">${s.isForSale ? `매물 ${(s.price || s.매물가격 || 0).toLocaleString()}원` : ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 10. 교장실 & 상단 관리자 패널
      case 'principal':
      case 'admin_quick': {
        const allData = await API.call('adminGetAllData');
        let rawStudents = allData.students || allData.assetOverview || allData.roleTable || [];
        if (!Array.isArray(rawStudents)) rawStudents = [];

        const students = rawStudents.map((st, idx) => ({
          id: st.id ?? st.번호 ?? (idx + 1),
          name: st.name ?? st.이름 ?? `학생${idx + 1}`,
          job: st.job ?? st.직업명 ?? st.직업 ?? '학생',
          cash: Number(st.cash ?? st.현금 ?? 0),
          stock: Number(st.stock ?? st.주식 ?? 0),
          permission: st.permission ?? st.권한 ?? st.level ?? st.레벨 ?? '일반'
        }));

        container.innerHTML = `
          <div class="admin-panel">
            <div class="admin-top-stats" style="display:flex; justify-content:space-between; background:#fee2e2; border:2px solid #fca5a5; padding:12px; border-radius:8px; margin-bottom:12px;">
              <div>👨‍🎓 등록 학생: <strong>${students.length}명</strong></div>
              <div>⚙️ 관리자 권한: <strong>승인됨 (선생님)</strong></div>
            </div>
            <div class="admin-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchAdminTab('students')">👥 학생 관리</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('eco')">📊 경제 정책</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('stock_admin')">📈 주가 조절</button>
            </div>

            <div id="admin-tab-students" class="admin-tab-content">
              <div class="table-wrap" style="max-height:350px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식</th><th>권한</th><th>자산 조정</th></tr></thead>
                  <tbody>
                    ${students.map(st => `
                      <tr>
                        <td>${st.id}</td>
                        <td><strong>${st.name}</strong></td>
                        <td>${st.job}</td>
                        <td>${st.cash.toLocaleString()}원</td>
                        <td>${st.stock.toLocaleString()}원</td>
                        <td><span class="badge badge-primary">${st.permission}</span></td>
                        <td>
                          <button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${st.name}')">금액 지급/차감</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="admin-tab-eco" class="admin-tab-content" style="display:none;">
              <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <div class="form-group">
                  <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">기본 세금 비율 (%)</label>
                  <input type="number" value="10" id="admin-tax-rate" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                </div>
                <div class="form-group">
                  <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">은행 예금 이율 (%)</label>
                  <input type="number" value="5" id="admin-dep-rate" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                </div>
              </div>
              <button class="pixel-btn-primary" onclick="alert('경제 정책이 업데이트되었습니다!')">정책 저장</button>
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
          </div>
        `;
        break;
      }

      // 11. 우체국
      case 'postoffice': {
        container.innerHTML = `
          <div class="post-panel">
            <h3>📮 친구에게 용돈 송금하기</h3>
            <div class="input-group" style="display:flex; gap:8px; margin:12px 0;">
              <input type="text" id="transfer-target" placeholder="받는 친구 이름" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
              <input type="number" id="transfer-amount" placeholder="송금할 금액" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
              <button class="pixel-btn-primary" style="width:auto; padding:8px 16px;" onclick="ModalManager.handleTransfer()">송금하기</button>
            </div>
            <h4 style="margin-top:20px;">💌 칭찬 카드 보내기</h4>
            <div class="form-group" style="margin-top:8px;">
              <input type="text" id="praise-target" placeholder="칭찬할 친구 이름" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; margin-bottom:6px;">
              <textarea id="praise-msg" placeholder="친구를 칭찬하는 따뜻한 메시지를 적어주세요." style="width:100%; height:60px; padding:8px; border:2px solid #94a3b8; border-radius:6px; margin-bottom:8px;"></textarea>
              <button class="pixel-btn-secondary" onclick="ModalManager.sendPraise()">칭찬카드 발송</button>
            </div>
          </div>
        `;
        break;
      }

      // 12. 고용센터
      case 'jobcenter': {
        const data = await API.call('getJobMarket');
        const jobs = data.jobs || [
          { 직업명: '은행원', 급여: 8000, 모집인원: 2, 현재인원: 1, 역할: '예금 관리 지원' },
          { 직업명: '환경미화부장', 급여: 7500, 모집인원: 3, 현재인원: 2, 역할: '교실 청결 점검' },
          { 직업명: '기자', 급여: 7000, 모집인원: 2, 현재인원: 1, 역할: '학급 신문 작성' }
        ];

        container.innerHTML = `
          <div class="job-panel">
            <h3>💼 학급 1인 1직업 채용 공고</h3>
            <div class="job-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; margin-top:12px;">
              ${jobs.map(j => `
                <div class="job-card" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px;">
                  <div class="job-title" style="font-weight:bold; font-size:14px;">${j.직업명 || j.title}</div>
                  <div class="job-salary" style="color:#0284c7; font-size:12px; margin:4px 0;">월급: 💰 ${(j.급여 || j.salary || 0).toLocaleString()}원</div>
                  <div class="job-role" style="font-size:11px; color:#64748b; margin-bottom:8px;">${j.역할 || j.role || ''}</div>
                  <button class="pixel-btn-primary" onclick="alert('${j.직업명 || j.title} 직업에 지원되었습니다!')">지원하기</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 13. 벼룩시장
      case 'flea_market': {
        const data = await API.call('getMarketItems');
        const items = Array.isArray(data) ? data : (data.items || []);
        container.innerHTML = `
          <div class="market-panel">
            <h3>🎪 중고 벼룩시장 (노점)</h3>
            <div class="shop-grid">
              ${items.length === 0 ? '<div style="padding:15px;">등록된 중고 물품이 없습니다.</div>' : items.map(m => `
                <div class="shop-item-card">
                  <div class="item-name">📦 ${m.itemName || m.아이템명}</div>
                  <div class="item-desc">판매자: ${m.seller || m.이름}</div>
                  <div class="item-price">💰 ${(m.price || m.금액 || 0).toLocaleString()}원</div>
                  <button class="pixel-btn-primary" onclick="alert('구매가 완료되었습니다!')">구매하기</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 14. 시청
      case 'cityhall': {
        container.innerHTML = `
          <div class="cityhall-panel">
            <h3>🏛️ 시청 (학급 임원 행정관청)</h3>
            <p style="font-size:13px; color:#475569; margin:4px 0 14px;">학급 자치 활동을 위한 상벌점 및 공지 권한을 집행할 수 있습니다.</p>
            <div class="action-card-grid">
              <div class="action-card" style="background:#f8fafc; border:2px solid #cbd5e1; padding:14px; border-radius:8px;">
                <h4>⭐ 칭찬 장학금 지급</h4>
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                  <input type="text" id="del-target" placeholder="대상 학생 이름" style="padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                  <input type="number" id="del-amount" placeholder="금액(원)" style="padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                  <input type="text" id="del-reason" placeholder="지급 사유" style="padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                  <button class="pixel-btn-primary" onclick="alert('장학금이 지급되었습니다!')">지급하기</button>
                </div>
              </div>
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
    switchLmsTab: (tab) => {
      ['notice', 'assign', 'meal', 'tt', 'call'].forEach(t => {
        const el = document.getElementById(`lms-tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      SoundEngine.click();
    },
    switchAdminTab: (tab) => {
      ['students', 'eco', 'stock_admin'].forEach(t => {
        const el = document.getElementById(`admin-tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      SoundEngine.click();
    },
    handleDeposit: async () => {
      const input = document.getElementById('deposit-amount-input');
      const val = parseInt(input?.value, 10);
      if (!val || val < 1000) return alert('최소 1,000원 이상 예금할 수 있습니다.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      const res = await API.call('depositMoney', { name: myName, amount: val });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg || '예금이 성공적으로 가입되었습니다!');
        open('bank');
      } else {
        alert(res?.msg || '예금 가입에 실패했습니다.');
      }
    },
    handleWithdraw: async (idx) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      const res = await API.call('withdrawDeposit', { name: myName, rowIdx: idx });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg || '예금이 해지되었습니다!');
        open('bank');
      } else {
        alert(res?.msg || '해지할 수 없는 예금입니다.');
      }
    },
    handleTradeStock: async (type) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      const qtyInput = document.getElementById(type === '매수' ? 'stock-buy-qty' : 'stock-sell-qty');
      const qty = parseInt(qtyInput?.value, 10);
      if (!qty || qty <= 0) return alert('올바른 수량을 입력하세요.');
      
      const res = await API.call('tradeStock', { name: myName, type, qty });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg || `주식 ${type} 주문이 체결되었습니다!`);
        open('stock');
      } else {
        alert(res?.msg || '주식 주문에 실패했습니다.');
      }
    },
    buyFurniture: async (id, price, name) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      const myCash = st ? (st.cash ?? st.현금 ?? 0) : 0;
      if (myCash < price) {
        return alert(`잔액이 부족합니다! (필요: ${price.toLocaleString()}원, 보유: ${myCash.toLocaleString()}원)`);
      }

      const res = await API.call('buyItem', { name: myName, itemName: name });
      MiniroomSystem.addFurnitureToInventory(myName, id);
      SoundEngine.snap();
      alert(`[${name}] 가구를 구매했습니다! 기숙사 내 방 꾸미기에서 배치해보세요. ✨`);
    },
    buyItem: async (name, price) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      const res = await API.call('buyItem', { name: myName, itemName: name });
      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg || `${name} 아이템을 구매했습니다!`);
      } else {
        alert(res?.msg || '구매에 실패했습니다.');
      }
    },
    startScratchLottery: async (price) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      
      API.showLoading('복권을 구매하는 중...');
      const buyRes = await API.call('buyLottery', { name: myName });
      API.hideLoading();

      if (!buyRes || !buyRes.success) {
        return alert(buyRes?.msg || '복권 구매에 실패했습니다. (잔액 부족 또는 일일 한도 초과)');
      }

      currentLotteryTxId = buyRes.txId;
      isScratchFinished = false;

      const stage = document.getElementById('scratch-stage-wrap');
      if (stage) stage.style.display = 'block';
      const cvs = document.getElementById('scratch-canvas');
      const resultText = document.getElementById('scratch-result-text');
      const finishMsg = document.getElementById('scratch-finish-msg');
      if (!cvs || !resultText) return;

      if (finishMsg) finishMsg.textContent = '';
      resultText.innerHTML = '<div style="font-size:15px; color:#b45309;">긁어서 결과를 확인하세요! 🎟️</div>';

      const ctx = cvs.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('마우스/손가락으로 긁어보세요!', cvs.width / 2, cvs.height / 2);

      let scratchedPixels = 0;
      let isDrawing = false;

      const finishScratch = async () => {
        if (isScratchFinished) return;
        isScratchFinished = true;
        
        API.showLoading('당첨금을 수령하는 중...');
        const scratchRes = await API.call('scratchLottery', { name: myName, txId: currentLotteryTxId });
        API.hideLoading();

        if (scratchRes && scratchRes.success) {
          SoundEngine.fanfare();
          resultText.innerHTML = `
            <div style="font-size:22px; color:#dc2626;">🎉 ${scratchRes.title || '당첨!'}</div>
            <div style="font-size:16px; color:#15803d; margin-top:4px;">💰 +${(scratchRes.prize || 0).toLocaleString()}원</div>
          `;
          if (finishMsg) finishMsg.innerHTML = `<span style="color:#15803d;">${scratchRes.msg || '당첨금이 계좌에 지급되었습니다!'}</span>`;
        } else {
          resultText.innerHTML = `<div style="font-size:16px; color:#64748b;">${scratchRes?.msg || '다음 기회에! 😢'}</div>`;
        }
      };

      function scratch(e) {
        if (!isDrawing) return;
        const rect = cvs.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        SoundEngine.scratch();

        scratchedPixels += 1;
        if (scratchedPixels > 25 && !isScratchFinished) {
          finishScratch();
        }
      }

      cvs.onmousedown = () => isDrawing = true;
      cvs.onmouseup = () => isDrawing = false;
      cvs.onmousemove = scratch;
      cvs.ontouchstart = () => isDrawing = true;
      cvs.ontouchend = () => isDrawing = false;
      cvs.ontouchmove = scratch;
    },
    openMartPayModal: async (itemName, price) => {
      const pw = prompt(`[${itemName}] 결제 (${price.toLocaleString()}원)\n결제를 위해 학생 비밀번호를 입력하세요:`);
      if (!pw) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      
      API.showLoading('결제 진행 중...');
      const res = await API.call('martPay', { buyerName: myName, amount: price, pw, itemName });
      API.hideLoading();

      if (res && res.success) {
        SoundEngine.coin();
        alert(`🎉 결제 완료!\n영수증 번호: ${res.receipt?.id}\n상품: ${itemName}\n금액: ${price.toLocaleString()}원`);
        open('mart');
      } else {
        alert(res?.msg || '결제에 실패했습니다.');
      }
    },
    handleCustomMartPay: async () => {
      const item = document.getElementById('custom-mart-item')?.value || '자율결제';
      const amt = parseInt(document.getElementById('custom-mart-amt')?.value, 10);
      if (!amt || amt <= 0) return alert('올바른 금액을 입력하세요.');

      const pw = prompt(`[${item}] 결제 (${amt.toLocaleString()}원)\n학생 비밀번호를 입력하세요:`);
      if (!pw) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';

      API.showLoading('결제 진행 중...');
      const res = await API.call('martPay', { buyerName: myName, amount: amt, pw, itemName: item });
      API.hideLoading();

      if (res && res.success) {
        SoundEngine.coin();
        alert(`🎉 결제 완료!\n영수증 번호: ${res.receipt?.id}\n금액: ${amt.toLocaleString()}원`);
        open('mart');
      } else {
        alert(res?.msg || '결제에 실패했습니다.');
      }
    },
    logEmotion: async (emotion) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      const memo = document.getElementById('emotion-memo')?.value || '';

      API.showLoading('감정 신호등을 기록하는 중...');
      const res = await API.call('logEmotion', { name: myName, emotion, message: memo });
      API.hideLoading();

      SoundEngine.fanfare();
      alert(res?.msg || `오늘의 기분 [${emotion}] 등록 완료! 장학금이 지급되었습니다. 💚`);
      close();
    },
    handleTransfer: async () => {
      const target = document.getElementById('transfer-target')?.value;
      const amt = parseInt(document.getElementById('transfer-amount')?.value, 10);
      if (!target || !amt || amt <= 0) return alert('받는 친구와 올바른 금액을 입력하세요.');
      const pw = prompt('송금을 위해 비밀번호를 입력하세요:');
      if (!pw) return;

      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';

      API.showLoading('송금 처리 중...');
      const res = await API.call('transferMoney', { fromName: myName, toName: target, amount: amt, pw });
      API.hideLoading();

      if (res && res.success) {
        SoundEngine.coin();
        alert(res.msg || '송금이 완료되었습니다!');
        close();
      } else {
        alert(res?.msg || '송금에 실패했습니다.');
      }
    },
    sendPraise: async () => {
      const target = document.getElementById('praise-target')?.value;
      const msg = document.getElementById('praise-msg')?.value;
      if (!target || !msg) return alert('칭찬할 친구와 메시지를 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';

      await API.call('delegatedPraiseCard', { actorName: myName, targetName: target, message: msg });
      SoundEngine.fanfare();
      alert('칭찬 카드가 배달되었습니다! 💌');
      close();
    },
    adminAdjustCash: (name) => {
      const delta = prompt(`${name} 학생에게 지급할 금액 (차감 시 -금액):`);
      if (delta) {
        API.call('adminUpdateStudent', { name, cashDelta: Number(delta), stockDelta: 0 }).then(() => {
          SoundEngine.coin();
          alert(`${name} 학생의 자산이 조정되었습니다.`);
          open('principal');
        });
      }
    },
    adminUpdateStock: () => {
      const price = document.getElementById('admin-new-stock-price')?.value || 1300;
      const title = document.getElementById('admin-stock-news-title')?.value || '학급 경제 호재';
      API.call('adminUpdateStock', { price, title, content: '', impact: '상승' }).then(() => {
        SoundEngine.coin();
        alert('신규 주가와 뉴스가 발행되었습니다!');
        open('principal');
      });
    },
    sendTeacherCall: async () => {
      const text = document.getElementById('call-reason-input')?.value;
      if (!text || !text.trim()) return alert('호출 사유를 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      await API.call('sendCall', { name: myName, category: '도움요청', message: text });
      alert('선생님께 호출이 전달되었습니다!');
      close();
    },
    submitAssignmentModal: (id, title) => {
      const memo = prompt(`[${title}] 과제 제출 메모를 입력하세요:`);
      if (memo === null) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '';
      API.call('submitAssignment', { name: myName, assignmentId: id, memo }).then(res => {
        if (res && res.success) {
          SoundEngine.fanfare();
          alert('과제가 성공적으로 제출되었습니다! 🎉');
        } else {
          alert(res?.msg || '과제 제출 실패');
        }
      });
    },
    handleSeatClick: (id, owner, isForSale, price) => {
      if (isForSale) {
        if (confirm(`좌석 [${id}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?`)) {
          alert('좌석 거래 신청이 완료되었습니다.');
        }
      } else {
        alert(`좌석 ID: ${id}\n현재 사용자: ${owner || '없음'}`);
      }
    }
  };
})();
