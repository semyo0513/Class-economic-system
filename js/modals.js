// ============================================================
// 모달 및 UI 팝업 매니저 (js/modals.js)
// 국고 공개 조회, 마트 POS 통계, 역할별 권한 부여(RBAC), 학생 선택형 벌금/경고
// ============================================================

const ModalManager = (() => {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  let currentOpenId = null;

  function open(id) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myPerm = st ? (st.permission || st.권한 || '일반') : '일반';
    const isTeacher = GameState.isAdmin || me === '선생님' || myPerm.includes('전체');

    // 🔒 교장실 접근 통제: 오직 교사(관리자)만 입장 가능
    if (id === 'principal' && !isTeacher) {
      SoundEngine.snap();
      alert('⚠️ 교장실은 선생님(관리자) 전용 공간입니다.\n교사 모드로 로그인해주세요.');
      return;
    }

    // 🔒 시청(위임관청) 접근 통제: 학급 직무 권한 소지자 또는 교사만 입장 가능
    if (id === 'cityhall') {
      const hasAnyPerm = isTeacher || myPerm.includes('월급배부') || myPerm.includes('벌금징수') || myPerm.includes('경고') || myPerm.includes('공지작성') || myPerm.includes('마트관리');
      if (!hasAnyPerm) {
        SoundEngine.snap();
        alert(`⚠️ 시청은 직무 권한(월급배부, 벌금징수, 경고 등)을 부여받은 임원만 입장할 수 있습니다.\n(현재 내 권한: ${myPerm})`);
        return;
      }
    }

    currentOpenId = id;
    if (!overlay || !titleEl || !bodyEl) return;

    SoundEngine.open();
    overlay.style.display = 'flex';
    bodyEl.innerHTML = '';

    const building = TownMapData.BUILDINGS.find(b => b.id === id);
    if (building) {
      titleEl.innerHTML = `${building.signEmoji || '🏠'} ${building.name}`;
      renderBuildingContent(id, bodyEl);
    } else {
      titleEl.innerText = '상세 정보';
      renderSpecialContent(id, bodyEl);
    }
  }

  function close() {
    if (overlay) {
      SoundEngine.close();
      overlay.style.display = 'none';
      bodyEl.innerHTML = '';
      currentOpenId = null;
    }
  }

  function renderBuildingContent(id, container) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myCash = st ? (st.cash ?? st.현금 ?? 0) : 0;
    const myStock = st ? (st.stock ?? st.주식 ?? 0) : 0;
    const myPerm = st ? (st.permission || st.권한 || '일반') : '일반';
    const isTeacher = GameState.isAdmin || me === '선생님' || myPerm.includes('전체');

    switch (id) {
      case 'dormitory':
        MiniroomSystem.renderDormitoryList(container);
        break;

      // 1. 은행 (개인 예금 & 학급 국고 공개 조회)
      case 'bank': {
        const rateVal = 0.05;
        container.innerHTML = `
          <div class="bank-panel">
            <div class="bank-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchBankTab('personal')">🏦 개인 예금 계좌</button>
              <button class="tab-btn" onclick="ModalManager.switchBankTab('treasury')">🏛️ 학급 국고(재정) 현황</button>
            </div>

            <!-- 개인 계좌 탭 -->
            <div id="bank-tab-personal">
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
                  <tbody id="bank-deposits-tbody">
                    <tr><td colspan="5" style="text-align:center; padding:15px;">예금 내역을 동기화하고 있습니다...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 학급 국고 공개 탭 -->
            <div id="bank-tab-treasury" style="display:none;">
              <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border:2px solid #f59e0b; padding:16px; border-radius:10px; margin-bottom:14px; text-align:center;">
                <div style="font-size:13px; font-weight:bold; color:#92400e;">🏛️ 행복초 학급 국고(총 자산) 잔액</div>
                <div style="font-size:26px; font-weight:900; color:#b45309; margin:6px 0;" id="bank-treasury-balance">💰 1,000,000원</div>
                <div style="font-size:11px; color:#78350f;">(벌금 징수액, 학급마트 수익금, 세금 등이 투명하게 국고로 귀속 관리됩니다)</div>
              </div>
              <h4>📜 최근 국고 수입 & 지출 내역</h4>
              <div class="table-wrap" style="margin-top:8px; max-height:220px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>일시</th><th>내용(사유)</th><th>입/출금</th><th>금액</th><th>상태</th></tr></thead>
                  <tbody id="bank-treasury-tbody">
                    <tr><td colspan="5" style="text-align:center; padding:15px;">국고 거래 장부를 조회하고 있습니다...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;

        API.call('getDeposits', { name: me }, true).then(data => {
          const deposits = Array.isArray(data) ? data : (data.deposits || []);
          const tbody = document.getElementById('bank-deposits-tbody');
          if (tbody) {
            tbody.innerHTML = deposits.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:15px;">가입된 예금이 없습니다.</td></tr>' : deposits.map((d, i) => `
              <tr>
                <td>${d.일시 || d.날짜 || '2026-08-28'}</td>
                <td>${(d.금액 || 0).toLocaleString()}원</td>
                <td>${((d.속성 || rateVal) * 100).toFixed(1)}%</td>
                <td><span class="badge badge-success">${d.상태 || '활성'}</span></td>
                <td><button class="pixel-btn-sm" onclick="ModalManager.handleWithdraw(${i})">만기해지</button></td>
              </tr>
            `).join('');
          }
        });

        API.call('getTreasuryData', {}, true).then(tData => {
          if (tData && tData.success) {
            const bEl = document.getElementById('bank-treasury-balance');
            if (bEl) bEl.textContent = `💰 ${(tData.balance || 1000000).toLocaleString()}원`;
            const tTbody = document.getElementById('bank-treasury-tbody');
            if (tTbody) {
              const logs = tData.recentLogs || [];
              tTbody.innerHTML = logs.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:15px;">국고 거래 기록이 없습니다.</td></tr>' : logs.map(l => `
                <tr>
                  <td>${l.일시 || '2026-08-28'}</td>
                  <td>${l.사유 || l.내용 || '국고 입출금'}</td>
                  <td><span class="badge badge-success">입금(귀속)</span></td>
                  <td><strong>+${(Number(l.금액) || 0).toLocaleString()}원</strong></td>
                  <td>완료</td>
                </tr>
              `).join('');
            }
          }
        });
        break;
      }

      // 2. 증권거래소
      case 'stock': {
        const curPrice = 1200;
        let history = [1150, 1180, 1200];

        container.innerHTML = `
          <div class="stock-panel">
            <div class="stock-header-grid" style="display:flex; justify-content:space-between; background:#f8fafc; padding:12px; border:2px solid #cbd5e1; border-radius:8px; margin-bottom:12px;">
              <div>
                <div style="font-size:13px; color:#64748b;">📈 행복초 협동조합 주식회사</div>
                <div style="font-size:22px; font-weight:bold; color:#ef4444;" id="stock-current-price-val">${curPrice.toLocaleString()}원</div>
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

        function drawStockChart(hist) {
          const cvs = document.getElementById('stock-chart-canvas');
          if (!cvs) return;
          const ctx = cvs.getContext('2d');
          const W = cvs.width, H = cvs.height, padding = 30;
          const max = Math.max(...hist) * 1.05, min = Math.min(...hist) * 0.95, range = Math.max(1, max - min);

          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
          ctx.beginPath();
          hist.forEach((val, idx) => {
            const x = padding + (idx / Math.max(1, hist.length - 1)) * (W - padding * 2);
            const y = H - padding - ((val - min) / range) * (H - padding * 2);
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        setTimeout(() => drawStockChart(history), 30);

        API.call('getStockData', { name: me }, true).then(data => {
          if (data && data.currentPrice) {
            const priceEl = document.getElementById('stock-current-price-val');
            if (priceEl) priceEl.textContent = `${Number(data.currentPrice).toLocaleString()}원`;
            if (data.history) {
              const h = data.history.map(item => typeof item === 'object' ? Number(item.price || 1200) : Number(item));
              if (h.length > 0) drawStockChart(h);
            }
          }
        });
        break;
      }

      // 3. 잡화점
      case 'shop': {
        const furns = CONFIG.FURNITURE_CATALOG;
        const defaultItems = [
          { itemName: '👟 스피드 롤러스케이트', 금액: 5000, 수량: 99, 설명: '이동속도 80% 증가' },
          { itemName: '✨ 황금 오라 이펙트', 금액: 8000, 수량: 99, 설명: '반짝이는 황금빛 파티클' },
          { itemName: '🍄 슈퍼 아이키커 버섯', 금액: 6000, 수량: 99, 설명: '캐릭터 크기 1.5배 거대화' },
          { itemName: '🪽 천사의 날개', 금액: 10000, 수량: 99, 설명: '등 뒤에 날개 장착' },
          { itemName: '🪑 자리 우선 선택권', 금액: 5000, 수량: 10, 설명: '원하는 자리를 먼저 고를 수 있는 티켓' }
        ];

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
            ${defaultItems.map(it => `
              <div class="shop-item-card">
                <div class="item-name">${it.itemName}</div>
                <div class="item-desc">${it.설명}</div>
                <div class="item-price">💰 ${it.금액.toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyItem('${it.itemName}', ${it.금액})">구매하기</button>
              </div>
            `).join('')}
          </div>
        `;

        API.call('getShopItems', { name: me }, true).then(data => {
          const items = Array.isArray(data) ? data : (data.items || []);
          const itemGrid = document.getElementById('shop-tab-item');
          if (itemGrid && items.length > 0) {
            itemGrid.innerHTML = items.map(it => `
              <div class="shop-item-card">
                <div class="item-name">${it.아이템명 || it.itemName || it.이름}</div>
                <div class="item-desc">${it.설명 || it.desc || ''}</div>
                <div class="item-price">💰 ${(it.금액 || it.가격 || 0).toLocaleString()}원 (재고: ${it.수량 || it.재고 || 1}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyItem('${it.아이템명 || it.itemName || it.이름}', ${it.금액 || it.가격 || 0})">구매하기</button>
              </div>
            `).join('');
          }
        });
        break;
      }

      // 4. 학급마트 & POS 포스기 관리 대시보드
      case 'mart': {
        const hasMartPerm = isTeacher || myPerm.includes('마트관리');
        const defaultMartItems = [
          { 아이템명: '초코파이', 가격: 800, 재고: 20 },
          { 아이템명: '비타민 음료', 가격: 1200, 재고: 15 },
          { 아이템명: '고급 형광펜', 가격: 1500, 재고: 10 },
          { 아이템명: '과일 젤리 세트', 가격: 600, 재고: 25 }
        ];

        container.innerHTML = `
          <div class="mart-panel">
            <div class="mart-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchMartTab('shop')">🛒 마트 간편 쇼핑</button>
              ${hasMartPerm ? '<button class="tab-btn" onclick="ModalManager.switchMartTab(\'pos\')">🖥️ 마트 POS & 운영 통계</button>' : ''}
            </div>

            <!-- 1) 쇼핑 탭 -->
            <div id="mart-tab-shop">
              <div style="background:#ecfdf5; border:2px solid #a7f3d0; padding:12px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h3 style="color:#065f46; font-size:15px;">🛒 학급 마트 제로페이 간편결제</h3>
                  <p style="font-size:12px; color:#047857;">상품을 선택하여 결제하세요. (수익금은 국고로 안전하게 입금됩니다)</p>
                </div>
                ${hasMartPerm ? '<button class="pixel-btn-sm" onclick="ModalManager.openAddMartItemModal()">➕ 물품 등록</button>' : ''}
              </div>

              <h4 style="margin-bottom:8px;">🛍️ 판매 중인 마트 물품</h4>
              <div class="shop-grid" id="mart-items-grid" style="margin-bottom:16px;">
                ${defaultMartItems.map(it => `
                  <div class="shop-item-card">
                    <div class="item-emoji">🍎</div>
                    <div class="item-name">${it.아이템명}</div>
                    <div class="item-price">${it.가격.toLocaleString()}원 (재고: ${it.재고}개)</div>
                    <button class="pixel-btn-primary" onclick="ModalManager.openMartPayModal('${it.아이템명}', ${it.가격})">구매 결제</button>
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

            <!-- 2) 마트 POS 관리자 대시보드 탭 -->
            <div id="mart-tab-pos" style="display:none;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                <div style="background:#f0fdf4; border:2px solid #86efac; padding:12px; border-radius:8px; text-align:center;">
                  <div style="font-size:12px; color:#15803d;">💰 누적 마트 총 매출액</div>
                  <div style="font-size:22px; font-weight:bold; color:#166534;" id="pos-total-revenue">0원</div>
                </div>
                <div style="background:#eff6ff; border:2px solid #93c5fd; padding:12px; border-radius:8px; text-align:center;">
                  <div style="font-size:12px; color:#1d4ed8;">🧾 총 판매 거래 건수</div>
                  <div style="font-size:22px; font-weight:bold; color:#1e40af;" id="pos-total-sales-count">0건</div>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4>📊 최근 실시간 마트 판매 기록</h4>
                <button class="pixel-btn-sm" style="background:#0284c7;" onclick="ModalManager.openAddMartItemModal()">➕ 신규 물품 등록</button>
              </div>

              <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>판매일시</th><th>구매자</th><th>품목명</th><th>결제금액</th></tr></thead>
                  <tbody id="pos-sales-tbody">
                    <tr><td colspan="4" style="text-align:center; padding:15px;">POS 매출 데이터를 불러오는 중...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;

        API.call('getMartItems', {}, true).then(martData => {
          const items = Array.isArray(martData) ? martData : (martData.items || []);
          const grid = document.getElementById('mart-items-grid');
          if (grid && items.length > 0) {
            grid.innerHTML = items.map(it => `
              <div class="shop-item-card">
                <div class="item-emoji">🍎</div>
                <div class="item-name">${it.아이템명 || it.name}</div>
                <div class="item-price">${(it.가격 || it.금액 || 0).toLocaleString()}원 (재고: ${it.재고 || it.수량 || 1}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.openMartPayModal('${it.아이템명 || it.name}', ${it.가격 || it.금액 || 0})">구매 결제</button>
              </div>
            `).join('');
          }
        });

        if (hasMartPerm) {
          API.call('getMartStats', {}, true).then(stats => {
            if (stats && stats.success) {
              const revEl = document.getElementById('pos-total-revenue');
              const cntEl = document.getElementById('pos-total-sales-count');
              if (revEl) revEl.textContent = `${(stats.totalRevenue || 0).toLocaleString()}원`;
              if (cntEl) cntEl.textContent = `${stats.totalSalesCount || 0}건`;

              const posTbody = document.getElementById('pos-sales-tbody');
              if (posTbody) {
                const sales = stats.recentSales || [];
                posTbody.innerHTML = sales.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:15px;">판매 내역이 없습니다.</td></tr>' : sales.map(s => `
                  <tr>
                    <td>${s.일시 || '-'}</td>
                    <td><strong>${s.이름 || '-'}</strong></td>
                    <td>${s.사유 || '-'}</td>
                    <td><strong>${(Number(s.금액) || 0).toLocaleString()}원</strong></td>
                  </tr>
                `).join('');
              }
            }
          });
        }
        break;
      }

      // 5. 학교 본관 LMS
      case 'school': {
        const defaultNotices = [
          { 날짜: '2026-08-28', 제목: '🎉 2D 동물의숲 클래스타운 개장 안내!', 내용: '기숙사 미니룸을 꾸미고 친구들과 교류해보세요.', 중요도: '긴급' },
          { 날짜: '2026-08-27', 제목: '이번 주 금요일 주식 배당금 지급 안내', 내용: '보유 주식 수에 따라 배당금이 지급됩니다.', 중요도: '일반' }
        ];

        container.innerHTML = `
          <div class="school-lms-wrap">
            <div class="lms-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchLmsTab('notice')">📢 공지사항</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('assign')">📝 과제 & 숙제</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('meal')">🍱 오늘의 급식</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('tt')">⏰ 시간표</button>
            </div>

            <div id="lms-tab-notice" class="lms-content-tab">
              <div style="margin-bottom:10px; display:flex; justify-content:flex-end;">
                <button class="pixel-btn-sm" onclick="ModalManager.openNoticeWriteModal()">✍️ 새 공지 작성</button>
              </div>
              <div class="notice-cards" id="notice-cards-list" style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto;">
                ${defaultNotices.map(n => `
                  <div class="notice-card" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px;">
                    <div class="nc-date" style="font-size:11px; color:#64748b; margin-bottom:4px;">${n.날짜} ${n.중요도 === '긴급' ? '<span class="badge badge-danger">긴급</span>' : ''}</div>
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
                  <tbody id="assignments-tbody">
                    <tr>
                      <td><strong>2학기 경제 포트폴리오</strong></td>
                      <td>나의 소비 습관과 투자 일지 작성 제출</td>
                      <td>2026-09-15</td>
                      <td>💰 5,000원</td>
                      <td><button class="pixel-btn-sm" onclick="ModalManager.submitAssignmentModal('as1', '2학기 경제 포트폴리오')">제출</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div id="lms-tab-meal" class="lms-content-tab" style="display:none;">
              <div class="meal-box" style="background:#fffbeb; border:2px solid #fde68a; padding:16px; border-radius:10px;">
                <h3 style="color:#b45309; margin-bottom:8px;">🍱 오늘의 영양 급식 식단</h3>
                <div class="meal-content" style="font-size:14px; line-height:1.7;">찰보리밥, 한우소고기미역국, 돈육간장불고기, 상추쌈/쌈장, 배추김치, 멜론</div>
              </div>
            </div>

            <div id="lms-tab-tt" class="lms-content-tab" style="display:none;">
              <div class="timetable-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                ${['1교시: 국어', '2교시: 수학', '3교시: 사회', '4교시: 과학', '5교시: 체육', '6교시: 미술'].map(t => `
                  <div class="tt-cell" style="background:#fff; border:2px solid #cbd5e1; padding:12px; border-radius:8px; text-align:center; font-weight:bold;">${t}</div>
                `).join('')}
              </div>
            </div>
          </div>
        `;

        API.call('getNotices', {}, true).then(noticesRes => {
          const notices = Array.isArray(noticesRes) ? noticesRes : (noticesRes.notices || []);
          const list = document.getElementById('notice-cards-list');
          if (list && notices.length > 0) {
            list.innerHTML = notices.map(n => `
              <div class="notice-card" style="background:#fff; border:2px solid #cbd5e1; border-radius:8px; padding:12px;">
                <div class="nc-date" style="font-size:11px; color:#64748b; margin-bottom:4px;">${n.일시 || n.날짜 || ''} ${n.중요도 === '긴급' ? '<span class="badge badge-danger">긴급</span>' : ''}</div>
                <div class="nc-title" style="font-weight:bold; font-size:14px; margin-bottom:4px;">${n.제목}</div>
                <div class="nc-content" style="font-size:12px; color:#334155; line-height:1.5;">${n.내용}</div>
              </div>
            `).join('');
          }
        });
        break;
      }

      // 6. 우체국
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

      // 7. 시청 & 교장실 관리자 패널
      case 'cityhall':
      case 'principal':
      case 'admin_quick': {
        const canPaySalary = isTeacher || myPerm.includes('월급배부');
        const canFine = isTeacher || myPerm.includes('벌금징수');
        const canWarn = isTeacher || myPerm.includes('경고');
        const canNotice = isTeacher || myPerm.includes('공지작성');
        const canMart = isTeacher || myPerm.includes('마트관리');

        const students = (GameState.rankingList && GameState.rankingList.length > 0)
          ? GameState.rankingList
          : [
              { id: 1, name: '김현주', job: '문화체육부 장관', cash: 2310000, stockQty: 50, totalAsset: 2370000, permission: '벌금징수,마트관리' },
              { id: 2, name: '이하진', job: '대통령(반장)', cash: 1722000, stockQty: 30, totalAsset: 1758000, permission: '월급배부,경고' },
              { id: 3, name: '정수빈', job: '은행원', cash: 1695800, stockQty: 20, totalAsset: 1719800, permission: '일반' },
              { id: 4, name: '서언', job: '국세청장', cash: 1666560, stockQty: 10, totalAsset: 1678560, permission: '월급배부' }
            ];

        container.innerHTML = `
          <div class="admin-panel">
            <div class="admin-top-stats" style="display:flex; justify-content:space-between; background:#fee2e2; border:2px solid #fca5a5; padding:12px; border-radius:8px; margin-bottom:12px;">
              <div>👨‍🎓 등록 학생: <strong id="admin-student-count">${students.length}명</strong></div>
              <div>⚙️ 내 직무 권한: <strong>${isTeacher ? '👑 교사(전체)' : myPerm}</strong></div>
            </div>

            <!-- 관리자 핵심 액션 툴바 (권한 기반 필터링) -->
            <div class="admin-action-bar" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              ${canPaySalary ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#0284c7;" onclick="ModalManager.openPaySalariesModal()">💰 월급 일괄 배부</button>' : ''}
              ${canFine ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#dc2626;" onclick="ModalManager.openFineModal()">⚖️ 벌금 징수</button>' : ''}
              ${canWarn ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#ea580c;" onclick="ModalManager.openWarnModal()">⚠️ 경고장 발송</button>' : ''}
              ${canNotice ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#16a34a;" onclick="ModalManager.openNoticeWriteModal()">📢 새 공지 작성</button>' : ''}
              ${canMart ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#7c3aed;" onclick="ModalManager.openAddMartItemModal()">🛒 마트 물품 등록</button>' : ''}
            </div>

            <div class="admin-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchAdminTab('students')">👥 학생 목록 & 현황</button>
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'permissions\')">👑 학생 권한 부여</button>' : ''}
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'stock_admin\')">📈 주가 & 뉴스 발행</button>' : ''}
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'sheet_init\')">🔄 시트 전체 초기화 (교사전용)</button>' : ''}
            </div>

            <!-- 1. 학생 목록 탭 -->
            <div id="admin-tab-students" class="admin-tab-content">
              <div class="table-wrap" style="max-height:300px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식수량</th><th>총자산</th><th>부여권한</th>${isTeacher ? '<th>교사조정</th>' : ''}</tr></thead>
                  <tbody id="admin-students-tbody">
                    ${students.map((s, idx) => `
                      <tr>
                        <td>${s.id || idx + 1}</td>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.job}</td>
                        <td>${(s.cash || s.total || 0).toLocaleString()}원</td>
                        <td>${s.stockQty || 0}주</td>
                        <td><strong>${(s.totalAsset || s.total || 0).toLocaleString()}원</strong></td>
                        <td><span class="badge badge-primary">${s.permission || '일반'}</span></td>
                        ${isTeacher ? `
                          <td>
                            <button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${s.name}')">금액조정</button>
                          </td>
                        ` : ''}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. 교사 전용 권한 부여 관리 탭 -->
            ${isTeacher ? `
              <div id="admin-tab-permissions" class="admin-tab-content" style="display:none;">
                <div style="background:#fef3c7; border:2px solid #f59e0b; padding:10px; border-radius:8px; margin-bottom:10px; font-size:12px; color:#92400e;">
                  💡 학생 직무에 맞춰 권한을 체크하고 [권한 저장]을 누르면 즉시 시트에 동기화됩니다.
                </div>
                <div class="table-wrap" style="max-height:280px; overflow-y:auto;">
                  <table class="pixel-table">
                    <thead><tr><th>이름</th><th>직업</th><th>부여할 권한 선택</th><th>저장</th></tr></thead>
                    <tbody id="admin-perm-tbody">
                      ${students.filter(s => s.name !== '선생님').map(s => `
                        <tr>
                          <td><strong>${s.name}</strong></td>
                          <td>${s.job}</td>
                          <td>
                            <label style="margin-right:6px; font-size:11px;"><input type="checkbox" class="perm-chk-${s.name}" value="월급배부" ${(s.permission || '').includes('월급배부') ? 'checked' : ''}> 월급배부</label>
                            <label style="margin-right:6px; font-size:11px;"><input type="checkbox" class="perm-chk-${s.name}" value="벌금징수" ${(s.permission || '').includes('벌금징수') ? 'checked' : ''}> 벌금징수</label>
                            <label style="margin-right:6px; font-size:11px;"><input type="checkbox" class="perm-chk-${s.name}" value="경고" ${(s.permission || '').includes('경고') ? 'checked' : ''}> 경고</label>
                            <label style="margin-right:6px; font-size:11px;"><input type="checkbox" class="perm-chk-${s.name}" value="공지작성" ${(s.permission || '').includes('공지작성') ? 'checked' : ''}> 공지작성</label>
                            <label style="margin-right:6px; font-size:11px;"><input type="checkbox" class="perm-chk-${s.name}" value="마트관리" ${(s.permission || '').includes('마트관리') ? 'checked' : ''}> 마트관리</label>
                          </td>
                          <td>
                            <button class="pixel-btn-sm" style="background:#16a34a;" onclick="ModalManager.handleSavePermission('${s.name}')">저장</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            <!-- 3. 주가 & 뉴스 발행 탭 -->
            ${isTeacher ? `
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

              <!-- 4. 시트 전체 초기화 탭 (교사전용) -->
              <div id="admin-tab-sheet_init" class="admin-tab-content" style="display:none; text-align:center; padding:20px;">
                <p style="color:#ef4444; font-weight:bold; margin-bottom:12px;">⚠️ 교사 전용 기능: 구글 시트의 11개 시트 구조와 기본 데이터를 완전하게 재구성합니다.</p>
                <button class="pixel-btn-primary" style="background:#ef4444; border-color:#991b1b;" onclick="ModalManager.adminInitSheets()">11개 시스템 시트 자동 초기화 실행</button>
              </div>
            ` : ''}
          </div>
        `;

        API.call('adminGetAllData', {}, true).then(allData => {
          const freshStudents = allData.students || [];
          if (freshStudents.length > 0) {
            GameState.rankingList = freshStudents;
            const countEl = document.getElementById('admin-student-count');
            if (countEl) countEl.textContent = `${freshStudents.length}명`;
            const tbody = document.getElementById('admin-students-tbody');
            if (tbody) {
              tbody.innerHTML = freshStudents.map(s => `
                <tr>
                  <td>${s.id}</td>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.job}</td>
                  <td>${(s.cash || 0).toLocaleString()}원</td>
                  <td>${s.stockQty || 0}주</td>
                  <td><strong>${(s.totalAsset || 0).toLocaleString()}원</strong></td>
                  <td><span class="badge badge-primary">${s.permission || '일반'}</span></td>
                  ${isTeacher ? `
                    <td>
                      <button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${s.name}')">금액조정</button>
                    </td>
                  ` : ''}
                </tr>
              `).join('');
            }
          }
        });
        break;
      }

      default:
        container.innerHTML = `<div style="padding:20px;">${id} 시설에 오신 것을 환영합니다!</div>`;
    }
  }

  function renderSpecialContent(id, container) {
    if (id === 'inventory') {
      const st = GameState.student;
      container.innerHTML = `
        <div class="inven-panel">
          <div class="inven-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchInvenTab('equips')">🪽 장착 아이템</button>
            <button class="tab-btn" onclick="ModalManager.switchInvenTab('coupons')">🎟️ 보유 쿠폰</button>
            <button class="tab-btn" onclick="ModalManager.switchInvenTab('furns')">🛋️ 가구 보관함</button>
          </div>
          <div id="inven-tab-equips">
            <div class="shop-grid">
              <div class="shop-item-card">
                <div class="item-emoji">👟</div>
                <div class="item-name">스피드 롤러스케이트</div>
                <button class="pixel-btn-primary" onclick="ModalManager.toggleEquip('speed')">장착 토글</button>
              </div>
              <div class="shop-item-card">
                <div class="item-emoji">✨</div>
                <div class="item-name">황금 오라 이펙트</div>
                <button class="pixel-btn-primary" onclick="ModalManager.toggleEquip('aura')">장착 토글</button>
              </div>
              <div class="shop-item-card">
                <div class="item-emoji">🪽</div>
                <div class="item-name">천사의 날개</div>
                <button class="pixel-btn-primary" onclick="ModalManager.toggleEquip('wings')">장착 토글</button>
              </div>
              <div class="shop-item-card">
                <div class="item-emoji">🛴</div>
                <div class="item-name">네온 킥보드</div>
                <button class="pixel-btn-primary" onclick="ModalManager.toggleEquip('mount')">장착 토글</button>
              </div>
            </div>
          </div>
          <div id="inven-tab-coupons" style="display:none; padding:10px;">
            <p style="color:#64748b;">보유 중인 쿠폰 목록입니다.</p>
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
              <div style="background:#fff; border:2px solid #cbd5e1; padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <span>🎟️ 자리 우선 선택권</span>
                <button class="pixel-btn-sm" onclick="ModalManager.handleUseItem('자리 우선 선택권')">사용하기</button>
              </div>
            </div>
          </div>
          <div id="inven-tab-furns" style="display:none; padding:10px;">
            <p style="color:#64748b;">기숙사 방꾸미기 모드에서 배치할 수 있습니다.</p>
          </div>
        </div>
      `;
    }
  }

  function getStudentListForSelect() {
    const list = GameState.rankingList && GameState.rankingList.length > 0
      ? GameState.rankingList
      : [
          { name: '김현주' }, { name: '이하진' }, { name: '정수빈' }, { name: '서언' },
          { name: '고설아' }, { name: '윤선우' }, { name: '허수연' }
        ];
    return list.filter(s => s.name !== '선생님');
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
    switchBankTab: (tab) => {
      document.getElementById('bank-tab-personal').style.display = tab === 'personal' ? 'block' : 'none';
      document.getElementById('bank-tab-treasury').style.display = tab === 'treasury' ? 'block' : 'none';
      document.querySelectorAll('.bank-tabs .tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (tab === 'personal' && i === 0) || (tab === 'treasury' && i === 1));
      });
      SoundEngine.click();
    },
    switchMartTab: (tab) => {
      document.getElementById('mart-tab-shop').style.display = tab === 'shop' ? 'block' : 'none';
      const posEl = document.getElementById('mart-tab-pos');
      if (posEl) posEl.style.display = tab === 'pos' ? 'block' : 'none';
      document.querySelectorAll('.mart-tabs .tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (tab === 'shop' && i === 0) || (tab === 'pos' && i === 1));
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
      ['students', 'permissions', 'stock_admin', 'sheet_init'].forEach(t => {
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

    // ─── 1. 월급 일괄 배부 모달 ───
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

    // ─── 2. 학생 선택형 벌금 징수 모달 ───
    openFineModal: (targetDefault) => {
      const students = getStudentListForSelect();
      const optionsHtml = students.map(s => `<option value="${s.name}" ${s.name === targetDefault ? 'selected' : ''}>${s.name} (${s.job || '학생'})</option>`).join('');

      bodyEl.innerHTML = `
        <div style="padding:10px;">
          <h3 style="color:#dc2626; margin-bottom:12px;">⚖️ 학생 벌금 징수 (국고 귀속)</h3>
          <p style="font-size:12px; color:#64748b; margin-bottom:14px;">징수된 벌금은 학생 계좌에서 차감되어 <strong>학급 국고</strong>로 자동 입금됩니다.</p>
          
          <div class="form-group" style="margin-bottom:10px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">대상 학생 선택</label>
            <select id="fine-target-select" style="width:100%; padding:10px; border:2px solid #94a3b8; border-radius:6px; font-size:14px;">
              ${optionsHtml}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:10px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">벌금 금액 (원)</label>
            <input type="number" id="fine-amount-input" value="1000" step="500" style="width:100%; padding:10px; border:2px solid #94a3b8; border-radius:6px;">
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">벌금 부과 사유</label>
            <input type="text" id="fine-reason-input" placeholder="예: 학급 규칙 미준수, 지각 등" style="width:100%; padding:10px; border:2px solid #94a3b8; border-radius:6px;">
          </div>

          <button class="pixel-btn-primary" style="background:#dc2626; border-color:#991b1b;" onclick="ModalManager.submitFine()">국고로 벌금 징수 실행</button>
        </div>
      `;
      titleEl.innerText = '⚖️ 벌금 징수 관리';
      overlay.style.display = 'flex';
    },

    submitFine: async () => {
      const target = document.getElementById('fine-target-select')?.value;
      const amt = Number(document.getElementById('fine-amount-input')?.value || 1000);
      const reason = document.getElementById('fine-reason-input')?.value || '학급 규칙 위반';
      if (!target) return alert('대상 학생을 선택하세요.');

      const st = GameState.student;
      const actor = st ? (st.name || st.이름) : '선생님';

      API.showLoading('벌금을 징수하는 중...');
      const res = await API.call('adminFineStudent', { targetName: target, amount: amt, reason, actorName: actor });
      API.hideLoading();
      SoundEngine.coin();
      alert(res?.msg || '벌금 징수가 완료되어 국고로 귀속되었습니다.');
      open('principal');
    },

    // ─── 3. 학생 선택형 경고장 발송 모달 ───
    openWarnModal: (targetDefault) => {
      const students = getStudentListForSelect();
      const optionsHtml = students.map(s => `<option value="${s.name}" ${s.name === targetDefault ? 'selected' : ''}>${s.name} (${s.job || '학생'})</option>`).join('');

      bodyEl.innerHTML = `
        <div style="padding:10px;">
          <h3 style="color:#ea580c; margin-bottom:12px;">⚠️ 학생 경고장 발송</h3>
          
          <div class="form-group" style="margin-bottom:10px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">대상 학생 선택</label>
            <select id="warn-target-select" style="width:100%; padding:10px; border:2px solid #94a3b8; border-radius:6px; font-size:14px;">
              ${optionsHtml}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">경고 주의 사유</label>
            <textarea id="warn-reason-input" placeholder="수업 태도 주의 및 학급 규칙 준수 당부" style="width:100%; height:80px; padding:10px; border:2px solid #94a3b8; border-radius:6px;"></textarea>
          </div>

          <button class="pixel-btn-primary" style="background:#ea580c; border-color:#9a3412;" onclick="ModalManager.submitWarn()">경고장 공식 전달</button>
        </div>
      `;
      titleEl.innerText = '⚠️ 경고장 발송 관리';
      overlay.style.display = 'flex';
    },

    submitWarn: async () => {
      const target = document.getElementById('warn-target-select')?.value;
      const reason = document.getElementById('warn-reason-input')?.value || '주의 조치';
      if (!target) return alert('대상 학생을 선택하세요.');

      const st = GameState.student;
      const actor = st ? (st.name || st.이름) : '선생님';

      API.showLoading('경고장을 발송하는 중...');
      const res = await API.call('adminWarnStudent', { targetName: target, reason, actorName: actor });
      API.hideLoading();
      SoundEngine.open();
      alert(res?.msg || '경고장이 전달되었습니다.');
      open('principal');
    },

    // ─── 4. 교사 전용 권한 저장 ───
    handleSavePermission: async (targetName) => {
      const chks = document.querySelectorAll(`.perm-chk-${targetName}:checked`);
      const perms = Array.from(chks).map(c => c.value).join(',');
      const finalPerm = perms || '일반';

      API.showLoading(`${targetName} 학생 권한 업데이트 중...`);
      const res = await API.call('grantPermission', { targetName, permissions: finalPerm });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '권한이 성공적으로 저장되었습니다!');
      open('principal');
    },

    openNoticeWriteModal: async () => {
      const title = prompt('공지사항 제목을 입력하세요:');
      if (!title) return;
      const content = prompt('공지사항 내용:');
      const isUrgent = confirm('긴급 공지로 등록하시겠습니까?');
      const st = GameState.student;
      const author = st ? (st.name || st.이름) : '선생님';

      API.showLoading('공지사항을 등록하는 중...');
      const res = await API.call('adminAddNotice', { title, content, isUrgent, authorName: author });
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
      const st = GameState.student;
      const owner = st ? (st.name || st.이름) : '선생님';

      API.showLoading('마트 물품을 등록하는 중...');
      const res = await API.call('addMartItem', { itemName, price: Number(price), stock: Number(stock), ownerName: owner });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '마트 물품이 성공적으로 등록되었습니다!');
      open('mart');
    },

    openMartPayModal: async (itemName, price) => {
      if (!confirm(`[${itemName}] 상품을 ${price.toLocaleString()}원에 구매 결제하시겠습니까? (수익은 국고로 입금됩니다)`)) return;
      const st = GameState.student;
      const buyer = st ? (st.name || st.이름) : '나';
      API.showLoading('제로페이 결제 중...');
      const res = await API.call('martPay', { buyerName: buyer, itemName: itemName, amount: price });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`결제 완료! 🧾 영수증 번호: ${res.receipt?.id}\n${itemName} 상품이 지급되었습니다.`);
      } else {
        alert(res?.msg || '결제에 실패했습니다.');
      }
    },

    handleCustomMartPay: async () => {
      const itemName = document.getElementById('custom-mart-item')?.value || '자율간식';
      const amt = Number(document.getElementById('custom-mart-amt')?.value || 0);
      if (amt <= 0) return alert('결제할 금액을 입력하세요.');
      const st = GameState.student;
      const buyer = st ? (st.name || st.이름) : '나';
      API.showLoading('결제 처리 중...');
      const res = await API.call('martPay', { buyerName: buyer, itemName, amount: amt });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`결제 완료! 🧾 ${itemName} (${amt.toLocaleString()}원) 결제가 완료되었습니다.`);
      } else {
        alert(res?.msg || '결제에 실패했습니다.');
      }
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

    // 오직 교사만 실행 가능한 직권 자산 조정
    adminAdjustCash: (name) => {
      const delta = prompt(`[교사 직권 조정] ${name} 학생에게 지급할 금액 (차감 시 -금액):`);
      if (delta && !isNaN(delta)) {
        API.call('updateCash', { name, delta: Number(delta), reason: '교사 직권 조정' }).then(() => {
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

    // 오직 교사만 실행 가능한 시트 전체 초기화
    adminInitSheets: () => {
      if (!confirm('⚠️ 정말로 11개 시스템 시트를 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) return;
      API.showLoading('시트를 초기화하는 중...');
      API.call('initSystemSheets', { adminPw: '0513' }).then(res => {
        API.hideLoading();
        SoundEngine.fanfare();
        alert(res?.msg || '시트가 초기화되었습니다!');
      });
    }
  };
})();
