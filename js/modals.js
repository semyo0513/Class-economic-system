// ============================================================
// 모달 및 UI 팝업 매니저 (js/modals.js)
// 14개 전 건물 완벽 구현, 감정신호등 1일1회보상, 간편모드, 마트POS, 실제 인벤토리, 복권방
// ============================================================

const ModalManager = (() => {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  let currentOpenId = null;

  function open(id, extraData) {
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
      titleEl.innerText = id === 'quick_board' ? '📋 학생 간편모드 (시설 바로가기)' : (id === 'inventory' ? '🎒 내 인벤토리' : (id === 'mailbox' ? '📬 우편함' : '상세 정보'));
      renderSpecialContent(id, bodyEl, extraData);
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
      // 1. 기숙사
      case 'dormitory':
        MiniroomSystem.renderDormitoryList(container);
        break;

      // 2. 은행 (개인 계좌 & 국고 공개 조회)
      case 'bank': {
        const rateVal = 0.05;
        container.innerHTML = `
          <div class="bank-panel">
            <div class="bank-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchBankTab('personal')">🏦 개인 예금 계좌</button>
              <button class="tab-btn" onclick="ModalManager.switchBankTab('treasury')">🏛️ 학급 국고(재정) 현황</button>
            </div>

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

      // 3. 증권거래소
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

      // 4. 잡화점
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

      // 5. 학급마트 (쇼핑 & POS 관리)
      case 'mart': {
        const hasMartPerm = isTeacher || myPerm.includes('마트관리');
        container.innerHTML = `
          <div class="mart-panel">
            <div class="mart-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchMartTab('shop')">🛒 마트 간편 쇼핑</button>
              ${hasMartPerm ? '<button class="tab-btn" onclick="ModalManager.switchMartTab(\'pos\')">🖥️ 마트 POS & 운영 통계</button>' : ''}
            </div>

            <!-- 쇼핑 탭 -->
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
                <div style="padding:15px; color:#64748b;">마트 물품을 불러오는 중...</div>
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

            <!-- POS 관리자 대시보드 탭 -->
            ${hasMartPerm ? `
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
                  <h4>📦 마트 재고/가격 관리 & 통계</h4>
                  <button class="pixel-btn-sm" style="background:#0284c7;" onclick="ModalManager.openAddMartItemModal()">➕ 신규 물품 등록</button>
                </div>

                <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
                  <table class="pixel-table">
                    <thead><tr><th>품목명</th><th>가격</th><th>재고</th><th>상태</th><th>관리</th></tr></thead>
                    <tbody id="pos-stock-tbody">
                      <tr><td colspan="5" style="text-align:center; padding:15px;">물품 재고 목록을 불러오는 중...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}
          </div>
        `;

        API.call('getMartItems', {}, true).then(martData => {
          const items = Array.isArray(martData) ? martData : (martData.items || []);
          const grid = document.getElementById('mart-items-grid');
          if (grid) {
            grid.innerHTML = items.length === 0 ? '<div style="padding:10px;">등록된 마트 물품이 없습니다.</div>' : items.map(it => `
              <div class="shop-item-card">
                <div class="item-emoji">🍎</div>
                <div class="item-name">${it.아이템명 || it.name}</div>
                <div class="item-price">${(it.가격 || it.금액 || 0).toLocaleString()}원 (재고: ${it.재고 || it.수량 || 1}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.openMartPayModal('${it.아이템명 || it.name}', ${it.가격 || it.금액 || 0})">구매 결제</button>
              </div>
            `).join('');
          }

          const posStockTbody = document.getElementById('pos-stock-tbody');
          if (posStockTbody && hasMartPerm) {
            posStockTbody.innerHTML = items.length === 0 ? '<tr><td colspan="5" style="text-align:center;">등록된 물품이 없습니다.</td></tr>' : items.map(it => `
              <tr>
                <td><strong>${it.아이템명 || it.name}</strong></td>
                <td>${(it.가격 || it.금액 || 0).toLocaleString()}원</td>
                <td>${it.재고 || it.수량 || 0}개</td>
                <td><span class="badge badge-${it.상태 === '판매중' ? 'success' : 'danger'}">${it.상태 || '판매중'}</span></td>
                <td>
                  <button class="pixel-btn-sm" onclick="ModalManager.editMartItem('${it.아이템명 || it.name}', ${it.가격 || it.금액 || 0}, ${it.재고 || it.수량 || 0})">수정</button>
                  <button class="pixel-btn-sm" style="background:#ef4444;" onclick="ModalManager.deleteMartItem('${it.아이템명 || it.name}')">삭제</button>
                </td>
              </tr>
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
            }
          });
        }
        break;
      }

      // 6. 행운의 복권방
      case 'lottery': {
        const ticketPrice = 500;
        container.innerHTML = `
          <div class="lottery-panel" style="text-align:center; padding:10px;">
            <div style="background:#fef3c7; border:2px solid #f59e0b; padding:16px; border-radius:12px; margin-bottom:16px;">
              <h3 style="color:#b45309; font-size:18px; margin-bottom:4px;">🎰 행복초 즉석 행운 복권</h3>
              <p style="font-size:12px; color:#78350f;">1장당 <strong>${ticketPrice.toLocaleString()}원</strong> (당첨금 최대 50,000원!)</p>
            </div>

            <div id="scratch-card-box" style="background:#ffffff; border:3px dashed #d97706; padding:20px; border-radius:12px; margin-bottom:16px; min-height:140px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
              <div id="scratch-prompt" style="font-size:14px; font-weight:bold; color:#64748b;">
                아래 [복권 구매 & 긁기] 버튼을 눌러 행운을 확인하세요! 🎟️
              </div>
              <div id="scratch-result" style="display:none;">
                <div id="scratch-title" style="font-size:24px; font-weight:900; color:#dc2626; margin-bottom:6px;"></div>
                <div id="scratch-msg" style="font-size:15px; font-weight:bold; color:#1e293b;"></div>
              </div>
            </div>

            <button class="pixel-btn-primary" style="font-size:16px; padding:12px 24px; background:#d97706; border-color:#92400e;" onclick="ModalManager.playLottery()">
              🎟️ 복권 구매 & 즉석 긁기 (${ticketPrice.toLocaleString()}원)
            </button>
          </div>
        `;
        break;
      }

      // 7. 마음 상담실 (감정신호등 1일 1회 화폐 지급)
      case 'counseling': {
        const todayKey = 'emotion_' + new Date().toISOString().slice(0, 10);
        const alreadyDone = localStorage.getItem(todayKey) === 'true';

        container.innerHTML = `
          <div class="counseling-panel" style="padding:10px;">
            <div style="background:#f0fdf4; border:2px solid #86efac; padding:14px; border-radius:10px; margin-bottom:14px;">
              <h3 style="color:#166534; font-size:16px; margin-bottom:4px;">💚 오늘의 마음 감정신호등</h3>
              <p style="font-size:12px; color:#15803d;">오늘의 기분을 솔직하게 체크하면 <strong>1일 1회 마음 장학금(화폐)</strong>이 지급됩니다!</p>
            </div>

            ${alreadyDone ? `
              <div style="background:#fff; border:2px solid #cbd5e1; padding:20px; border-radius:10px; text-align:center;">
                <div style="font-size:32px; margin-bottom:8px;">✅</div>
                <h4 style="color:#1e293b; margin-bottom:4px;">오늘의 감정신호등 체크 완료!</h4>
                <p style="font-size:12px; color:#64748b;">내일 또 새로운 마음 상태를 기록해주세요.</p>
              </div>
            ` : `
              <div style="margin-bottom:14px;">
                <label style="display:block; font-size:13px; font-weight:bold; margin-bottom:8px;">1. 오늘의 내 기분 상태를 선택해주세요:</label>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                  <button type="button" class="tab-btn emotion-opt-btn active" style="padding:12px 6px; text-align:center;" onclick="ModalManager.selectEmotion('🟢 좋음', this)">
                    <div style="font-size:24px;">🟢</div>
                    <div style="font-weight:bold; margin-top:4px;">좋음</div>
                    <div style="font-size:10px; color:#16a34a;">(+500원)</div>
                  </button>
                  <button type="button" class="tab-btn emotion-opt-btn" style="padding:12px 6px; text-align:center;" onclick="ModalManager.selectEmotion('🟡 보통', this)">
                    <div style="font-size:24px;">🟡</div>
                    <div style="font-weight:bold; margin-top:4px;">보통</div>
                    <div style="font-size:10px; color:#ca8a04;">(+300원)</div>
                  </button>
                  <button type="button" class="tab-btn emotion-opt-btn" style="padding:12px 6px; text-align:center;" onclick="ModalManager.selectEmotion('🔴 힘듦', this)">
                    <div style="font-size:24px;">🔴</div>
                    <div style="font-weight:bold; margin-top:4px;">힘듦</div>
                    <div style="font-size:10px; color:#dc2626;">(+1,000원)</div>
                  </button>
                </div>
              </div>

              <div style="margin-bottom:16px;">
                <label style="display:block; font-size:13px; font-weight:bold; margin-bottom:6px;">2. 선생님께 전하고 싶은 한 줄 마음 (선택):</label>
                <input type="text" id="emotion-msg-input" placeholder="선생님, 오늘 기분이 이래요..." style="width:100%; padding:10px; border:2px solid #94a3b8; border-radius:8px;">
              </div>

              <button class="pixel-btn-primary" style="font-size:15px; padding:12px;" onclick="ModalManager.submitEmotion()">
                💌 감정신호등 등록 & 장학금 받기
              </button>
            `}
          </div>
        `;
        break;
      }

      // 8. 중고 벼룩시장
      case 'flea_market': {
        container.innerHTML = `
          <div class="flea-panel">
            <div style="background:#fff7ed; border:2px solid #fed7aa; padding:12px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="color:#9a3412; font-size:15px;">🎪 친구들과의 중고 벼룩시장</h3>
                <p style="font-size:12px; color:#c2410c;">안 쓰는 아이템을 등록하고 친구의 물건을 구매해보세요!</p>
              </div>
              <button class="pixel-btn-sm" style="background:#ea580c;" onclick="ModalManager.openAddFleaModal()">➕ 물품 판매 등록</button>
            </div>

            <div class="shop-grid" id="flea-items-grid">
              <div style="padding:15px; color:#64748b;">벼룩시장 매물을 불러오는 중...</div>
            </div>
          </div>
        `;

        API.call('getFleaMarketItems', {}, true).then(res => {
          const items = res.items || [];
          const grid = document.getElementById('flea-items-grid');
          if (grid) {
            grid.innerHTML = items.length === 0 ? '<div style="padding:15px;">등록된 중고 매물이 없습니다.</div>' : items.map(it => `
              <div class="shop-item-card">
                <div class="item-emoji">📦</div>
                <div class="item-name">${it.아이템명 || it.이름}</div>
                <div class="item-desc" style="font-size:11px; color:#64748b;">판매자: ${it.소유자 || it.이름}</div>
                <div class="item-price">💰 ${(it.금액 || 0).toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyFleaItem('${it.아이템명 || it.이름}', ${it.금액 || 0}, '${it.소유자 || it.이름}')">구매하기</button>
              </div>
            `).join('');
          }
        });
        break;
      }

      // 9. 고용센터 1인 1직업
      case 'jobcenter': {
        container.innerHTML = `
          <div class="job-panel">
            <div style="background:#f1f5f9; border:2px solid #cbd5e1; padding:12px; border-radius:8px; margin-bottom:12px;">
              <h3 style="color:#1e293b; font-size:15px;">💼 행복초 1인 1직업 고용센터</h3>
              <p style="font-size:12px; color:#475569;">원하는 직업을 살펴보고 구직/전직 신청을 해보세요!</p>
            </div>

            <div class="table-wrap" style="max-height:260px; overflow-y:auto;">
              <table class="pixel-table">
                <thead><tr><th>직업명</th><th>주요 업무</th><th>월급</th><th>신청</th></tr></thead>
                <tbody id="jobs-tbody">
                  <tr><td colspan="4" style="text-align:center; padding:15px;">직업 정보를 불러오는 중...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        `;

        API.call('getJobs', {}, true).then(res => {
          const jobs = res.jobs || [];
          const tbody = document.getElementById('jobs-tbody');
          if (tbody) {
            tbody.innerHTML = jobs.map(j => `
              <tr>
                <td><strong>${j.jobTitle}</strong></td>
                <td>${j.desc}</td>
                <td>💰 ${(j.salary || 5000).toLocaleString()}원</td>
                <td><button class="pixel-btn-sm" onclick="ModalManager.applyJob('${j.jobTitle}')">신청</button></td>
              </tr>
            `).join('');
          }
        });
        break;
      }

      // 10. 부동산 중개소 (교실 좌석 배치도)
      case 'realestate': {
        container.innerHTML = `
          <div class="realestate-panel">
            <div style="background:#fef3c7; border:2px solid #fcd34d; padding:12px; border-radius:8px; margin-bottom:12px;">
              <h3 style="color:#92400e; font-size:15px;">🏢 교실 좌석 부동산 배치도</h3>
              <p style="font-size:12px; color:#b45309;">원하는 교실 좌석을 클릭하여 구매 또는 양도받을 수 있습니다.</p>
            </div>

            <div class="seat-grid" id="seats-grid" style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px; margin-bottom:12px;">
              <div style="grid-column:span 6; text-align:center; padding:15px;">좌석 배치도를 불러오는 중...</div>
            </div>
          </div>
        `;

        API.call('getRealEstateData', {}, true).then(res => {
          const seats = res.seats || [];
          const grid = document.getElementById('seats-grid');
          if (grid && seats.length > 0) {
            grid.innerHTML = seats.map(s => `
              <div style="background:${s.owner === me ? '#bbf7d0' : '#fff'}; border:2px solid #94a3b8; border-radius:6px; padding:8px 4px; text-align:center; cursor:pointer;" onclick="ModalManager.buySeatModal('${s.id}', ${s.price}, '${s.owner}')">
                <div style="font-size:10px; font-weight:bold; color:#64748b;">${s.id}</div>
                <div style="font-size:11px; font-weight:bold; margin:2px 0;">${s.owner || '빈자리'}</div>
                <div style="font-size:9px; color:#0284c7;">${(s.price || 5000).toLocaleString()}원</div>
              </div>
            `).join('');
          }
        });
        break;
      }

      // 11. 학교 본관 LMS
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

      // 12. 우체국
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

      // 13. 시청 & 교장실 관리자 패널
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
        break;
      }

      default:
        container.innerHTML = `<div style="padding:20px;">${id} 시설에 오신 것을 환영합니다!</div>`;
    }
  }

  // 특수 팝업 (간편모드, 인벤토리, 우편함, 놀이기구)
  function renderSpecialContent(id, container, extraData) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myPerm = st ? (st.permission || st.권한 || '일반') : '일반';
    const isTeacher = GameState.isAdmin || me === '선생님' || myPerm.includes('전체');

    if (id === 'quick_board') {
      const facilities = [
        { id: 'dormitory', name: '학생 기숙사', emoji: '🏠', desc: '미니룸 방꾸미기' },
        { id: 'bank', name: '클래스 은행', emoji: '🏦', desc: '예금 & 국고 조회' },
        { id: 'stock', name: '증권거래소', emoji: '📈', desc: '주식 매수/매도' },
        { id: 'shop', name: '잡화점 & 가구', emoji: '🛋️', desc: '장착템 & 가구' },
        { id: 'mart', name: '학급마트', emoji: '🛒', desc: '간식 결제 & POS' },
        { id: 'school', name: '학교 본관', emoji: '🏫', desc: '공지/과제/급식' },
        { id: 'lottery', name: '행운 복권방', emoji: '🎰', desc: '즉석 스크래치 복권' },
        { id: 'counseling', name: '마음 상담실', emoji: '💚', desc: '감정신호등 장학금' },
        { id: 'flea_market', name: '중고 벼룩시장', emoji: '🎪', desc: '친구와 중고 거래' },
        { id: 'jobcenter', name: '고용센터', emoji: '💼', desc: '1인 1직업 구직' },
        { id: 'realestate', name: '부동산 중개소', emoji: '🏢', desc: '교실 좌석 매입' },
        { id: 'postoffice', name: '클래스 우체국', emoji: '📮', desc: '송금 & 칭찬카드' },
        { id: 'cityhall', name: '시청 (위임관청)', emoji: '🏛️', desc: '임원 직무 집행', reqRole: true },
        { id: 'principal', name: '교장실', emoji: '👑', desc: '교사 관리자 패널', reqTeacher: true }
      ];

      container.innerHTML = `
        <div class="quick-board-panel" style="padding:10px;">
          <div style="background:#f8fafc; border:2px solid #cbd5e1; padding:12px; border-radius:10px; margin-bottom:14px; text-align:center;">
            <h3 style="color:#0f172a; font-size:16px; margin-bottom:4px;">📋 마을 시설 즉시 이용 (간편모드)</h3>
            <p style="font-size:12px; color:#64748b;">맵을 이동하지 않고 원하는 시설을 바로 클릭하여 이용할 수 있습니다.</p>
          </div>

          <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; max-height:360px; overflow-y:auto;">
            ${facilities.map(f => {
              const isLocked = (f.reqTeacher && !isTeacher) || (f.reqRole && !isTeacher && myPerm === '일반');
              return `
                <div style="background:${isLocked ? '#f1f5f9' : '#fff'}; border:2px solid ${isLocked ? '#cbd5e1' : '#94a3b8'}; border-radius:8px; padding:10px; display:flex; align-items:center; justify-content:space-between; cursor:${isLocked ? 'not-allowed' : 'pointer'};" onclick="ModalManager.open('${f.id}')">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div style="font-size:22px;">${isLocked ? '🔒' : f.emoji}</div>
                    <div>
                      <div style="font-weight:bold; font-size:13px; color:${isLocked ? '#94a3b8' : '#1e293b'};">${f.name}</div>
                      <div style="font-size:11px; color:#64748b;">${f.desc}</div>
                    </div>
                  </div>
                  <button class="pixel-btn-sm" style="${isLocked ? 'background:#cbd5e1; color:#64748b;' : ''}">열기</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (id === 'inventory') {
      const ownedItems = JSON.parse(localStorage.getItem('user_inventory_' + me) || '[]');

      container.innerHTML = `
        <div class="inven-panel">
          <div class="inven-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchInvenTab('equips')">🪽 내 장착 아이템</button>
            <button class="tab-btn" onclick="ModalManager.switchInvenTab('coupons')">🎟️ 보유 쿠폰</button>
            <button class="tab-btn" onclick="ModalManager.switchInvenTab('furns')">🛋️ 가구 보관함</button>
          </div>

          <div id="inven-tab-equips">
            <div class="shop-grid" id="inven-equips-grid">
              <div style="padding:15px; color:#64748b;">보유 장착템을 확인하는 중...</div>
            </div>
          </div>

          <div id="inven-tab-coupons" style="display:none; padding:10px;">
            <div id="inven-coupons-list" style="display:flex; flex-direction:column; gap:6px;">
              <p style="color:#64748b;">보유 중인 쿠폰이 없습니다. 잡화점에서 구매해보세요!</p>
            </div>
          </div>

          <div id="inven-tab-furns" style="display:none; padding:10px;">
            <p style="color:#64748b;">기숙사 방꾸미기 모드에서 배치할 수 있는 가구 목록입니다.</p>
          </div>
        </div>
      `;

      API.call('getUserInventory', { name: me }, true).then(res => {
        const inv = (res.inventory || []).concat(ownedItems);
        const equipGrid = document.getElementById('inven-equips-grid');
        const equipItems = inv.filter(it => (it.카테고리 === '캐릭터아이템' || String(it.아이템명 || it.name).includes('스피드') || String(it.아이템명 || it.name).includes('오라') || String(it.아이템명 || it.name).includes('날개') || String(it.아이템명 || it.name).includes('킥보드') || String(it.아이템명 || it.name).includes('버섯')));

        if (equipGrid) {
          equipGrid.innerHTML = equipItems.length === 0 ? '<div style="padding:15px; color:#64748b;">보유 중인 장착 아이템이 없습니다. 잡화점에서 구매해보세요!</div>' : equipItems.map(it => {
            const name = it.아이템명 || it.name;
            const equipKey = name.includes('스피드') ? 'speed' : (name.includes('오라') ? 'aura' : (name.includes('날개') ? 'wings' : (name.includes('킥보드') ? 'mount' : 'giant')));
            const isEquipped = GameState.equippedItems && GameState.equippedItems[equipKey];
            return `
              <div class="shop-item-card">
                <div class="item-name">${name}</div>
                <button class="pixel-btn-primary" style="${isEquipped ? 'background:#ef4444;' : ''}" onclick="ModalManager.toggleEquip('${equipKey}')">
                  ${isEquipped ? '장착 해제' : '장착하기'}
                </button>
              </div>
            `;
          }).join('');
        }
      });
    } else if (id === 'mailbox') {
      container.innerHTML = `
        <div class="mailbox-panel" style="padding:10px;">
          <h3 style="margin-bottom:12px;">📬 내 우편함 (칭찬카드/경고장/송금 내역)</h3>
          <div class="table-wrap" style="max-height:280px; overflow-y:auto;">
            <table class="pixel-table">
              <thead><tr><th>날짜</th><th>발송자</th><th>종류</th><th>내용</th></tr></thead>
              <tbody id="mailbox-tbody">
                <tr><td colspan="4" style="text-align:center; padding:15px;">우편함을 확인하는 중...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      API.call('getMailbox', { name: me }, true).then(res => {
        const mails = res.mails || [];
        const tbody = document.getElementById('mailbox-tbody');
        if (tbody) {
          tbody.innerHTML = mails.length === 0 ? '<tr><td colspan="4" style="text-align:center;">도착한 우편이 없습니다.</td></tr>' : mails.map(m => `
            <tr>
              <td>${m.일시 || '2026-08-28'}</td>
              <td><strong>${m.이름 || '선생님'}</strong></td>
              <td><span class="badge badge-primary">${m.카테고리 || '우편'}</span></td>
              <td>${m.메모 || m.사유 || m.내용 || '-'}</td>
            </tr>
          `).join('');
        }
      });
    } else if (id === 'ride_modal' && extraData) {
      const thrills = Math.floor(Math.random() * 21) + 80;
      const fortunes = [
        '✨ 오늘은 뜻밖의 행운과 장학금이 찾아올 길한 날입니다!',
        '🎯 주식 시장의 흐름을 잘 살피면 큰 이익을 얻을 수 있습니다.',
        '🤝 친구를 칭찬하고 도와주면 더 큰 복으로 되돌아옵니다.',
        '🌟 오늘 하루 모든 일이 술술 풀리는 최고의 대길(大吉)입니다!'
      ];
      const randFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      container.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <div style="font-size:42px; margin-bottom:8px;">${extraData.emoji || '🎡'}</div>
          <h3 style="color:${extraData.rideColor || '#0284c7'}; font-size:18px; margin-bottom:6px;">${extraData.rideTitle || extraData.name} 탑승 완료!</h3>
          <div style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:10px; padding:14px; margin:12px 0;">
            <div style="font-size:13px; font-weight:bold; color:#475569; margin-bottom:4px;">🎢 오늘의 스릴 만족도</div>
            <div style="font-size:24px; font-weight:bold; color:#ef4444;">${thrills}점 / 100점</div>
            <div style="margin-top:10px; font-size:12px; color:#1e293b; line-height:1.6; border-top:1px dashed #cbd5e1; padding-top:8px;">
              <strong>🥠 오늘의 포춘 쿠키 운세</strong><br>${randFortune}
            </div>
          </div>
          <button class="pixel-btn-primary" onclick="ModalManager.close()">즐겁게 하차하기</button>
        </div>
      `;
    } else if (id === 'npc_modal' && extraData) {
      const dialogList = extraData.dialogs || ['안녕! 행복초 클래스 타운에 온 걸 환영해!'];
      const randMsg = dialogList[Math.floor(Math.random() * dialogList.length)];
      container.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <div style="font-size:48px; margin-bottom:8px;">💬</div>
          <h3 style="color:#0f172a; margin-bottom:12px;">${extraData.name}</h3>
          <div style="background:#fffbeb; border:2px solid #fde68a; border-radius:10px; padding:16px; font-size:14px; color:#92400e; line-height:1.6; margin-bottom:14px;">
            "${randMsg}"
          </div>
          <button class="pixel-btn-primary" onclick="ModalManager.close()">대화 마치기</button>
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

    // ─── 감정신호등 1일 1회 보상 시스템 ───
    selectedEmotionVal: '🟢 좋음',
    selectEmotion: (val, btn) => {
      ModalManager.selectedEmotionVal = val;
      document.querySelectorAll('.emotion-opt-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      SoundEngine.click();
    },
    submitEmotion: async () => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';
      const emotion = ModalManager.selectedEmotionVal || '🟢 좋음';
      const msg = document.getElementById('emotion-msg-input')?.value || '';

      API.showLoading('감정신호등을 기록하는 중...');
      const res = await API.call('logEmotion', { name: myName, emotion, message: msg });
      API.hideLoading();

      const todayKey = 'emotion_' + new Date().toISOString().slice(0, 10);
      localStorage.setItem(todayKey, 'true');

      // 잔액 즉시 가산
      const bonus = emotion.includes('힘듦') ? 1000 : (emotion.includes('보통') ? 300 : 500);
      if (st) st.cash = (st.cash || 0) + bonus;
      const cashEl = document.getElementById('hud-cash-val');
      if (cashEl && st) cashEl.textContent = `${st.cash.toLocaleString()}원`;

      SoundEngine.fanfare();
      alert(res?.msg || `오늘의 기분 [${emotion}] 등록 완료! +${bonus.toLocaleString()}원 장학금이 지급되었습니다!`);
      open('counseling');
    },

    // ─── 행운의 즉석 복권 ───
    playLottery: async () => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';
      const cash = st ? (st.cash || 0) : 0;
      if (cash < 500) return alert('복권 구매를 위한 현금(500원)이 부족합니다.');

      API.showLoading('복권을 구매하여 긁는 중...');
      const buyRes = await API.call('buyLottery', { name: myName });
      if (!buyRes || !buyRes.success) {
        API.hideLoading();
        return alert(buyRes?.msg || '복권 구매 실패');
      }

      const scrRes = await API.call('scratchLottery', { name: myName });
      API.hideLoading();

      if (st) st.cash = (st.cash || 0) - 500 + (scrRes?.prize || 0);
      const cashEl = document.getElementById('hud-cash-val');
      if (cashEl && st) cashEl.textContent = `${st.cash.toLocaleString()}원`;

      const promptEl = document.getElementById('scratch-prompt');
      const resultEl = document.getElementById('scratch-result');
      const titleEl = document.getElementById('scratch-title');
      const msgEl = document.getElementById('scratch-msg');

      if (promptEl) promptEl.style.display = 'none';
      if (resultEl) resultEl.style.display = 'block';
      if (titleEl) titleEl.textContent = scrRes?.title || '꽝!';
      if (msgEl) msgEl.textContent = scrRes?.msg || '다음 기회에!';

      if (scrRes?.prize > 0) {
        SoundEngine.fanfare();
      } else {
        SoundEngine.snap();
      }
    },

    // ─── 마트 아이템 수정 및 삭제 (마트관리 권한자 전용) ───
    editMartItem: async (itemName, curPrice, curStock) => {
      const newPrice = prompt(`[${itemName}] 새 판매 가격(원):`, curPrice);
      if (newPrice === null) return;
      const newStock = prompt(`[${itemName}] 새 재고 수량(개):`, curStock);
      if (newStock === null) return;

      API.showLoading('물품 정보를 수정하는 중...');
      const res = await API.call('updateMartItem', { itemName, price: Number(newPrice), stock: Number(newStock), status: Number(newStock) > 0 ? '판매중' : '품절' });
      API.hideLoading();
      SoundEngine.coin();
      alert(res?.msg || '수정 완료');
      open('mart');
    },

    deleteMartItem: async (itemName) => {
      if (!confirm(`[${itemName}] 물품을 마트에서 삭제하시겠습니까?`)) return;
      API.showLoading('물품을 삭제하는 중...');
      const res = await API.call('deleteMartItem', { itemName });
      API.hideLoading();
      SoundEngine.coin();
      alert(res?.msg || '삭제 완료');
      open('mart');
    },

    // ─── 벼룩시장 등록 & 구매 ───
    openAddFleaModal: async () => {
      const itemName = prompt('벼룩시장에 판매할 물품명을 입력하세요:');
      if (!itemName) return;
      const price = prompt('판매 희망 가격(원):', '1000');
      if (!price) return;
      const desc = prompt('물품에 대한 간단한 설명:', '상태 좋은 중고 물품');
      const st = GameState.student;
      const seller = st ? (st.name || st.이름) : '나';

      API.showLoading('벼룩시장에 등록하는 중...');
      const res = await API.call('addFleaMarketItem', { sellerName: seller, itemName, price: Number(price), desc });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '벼룩시장에 등록되었습니다!');
      open('flea_market');
    },

    buyFleaItem: async (itemName, price, seller) => {
      if (!confirm(`[${itemName}] 중고 물품을 ${price.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const buyer = st ? (st.name || st.이름) : '나';

      API.showLoading('물품을 구매하는 중...');
      const res = await API.call('buyFleaMarketItem', { itemName, price: Number(price), sellerName: seller, buyerName: buyer });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(res.msg);
        open('flea_market');
      } else {
        alert(res?.msg || '구매에 실패했습니다.');
      }
    },

    // ─── 고용센터 전직 신청 ───
    applyJob: async (jobTitle) => {
      if (!confirm(`[${jobTitle}] 직업으로 전직/구직 신청하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('직업 신청 중...');
      const res = await API.call('applyJob', { name: myName, jobTitle });
      API.hideLoading();
      if (res && res.success) {
        if (st) st.job = jobTitle;
        const jobEl = document.getElementById('hud-job-badge');
        if (jobEl) jobEl.textContent = jobTitle;
        SoundEngine.fanfare();
        alert(res.msg);
      } else {
        alert(res?.msg || '신청 실패');
      }
    },

    // ─── 부동산 좌석 구매 ───
    buySeatModal: async (seatId, price, owner) => {
      const st = GameState.student;
      const me = st ? (st.name || st.이름) : '나';
      if (owner === me) return alert('이미 내가 보유한 좌석입니다.');

      if (!confirm(`[${seatId}] 좌석을 ${price.toLocaleString()}원에 매입하시겠습니까?`)) return;
      API.showLoading('좌석을 매입하는 중...');
      const res = await API.call('buySeat', { seatId, price, buyerName: me });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(res.msg);
        open('realestate');
      } else {
        alert(res?.msg || '매입 실패');
      }
    },

    // ─── 상점 가구 & 아이템 구매 ───
    buyFurniture: async (id, price, name) => {
      if (!confirm(`[${name}] 가구를 ${price.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const me = st ? (st.name || st.이름) : '나';
      API.showLoading('가구를 구매하는 중...');
      const res = await API.call('buyItem', { name: me, itemName: name });
      API.hideLoading();
      if (res && res.success) {
        // 로컬 보관함에도 즉시 저장
        const key = 'user_inventory_' + me;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push({ name: name, 카테고리: '가구', 금액: price });
        localStorage.setItem(key, JSON.stringify(list));

        SoundEngine.fanfare();
        alert(res.msg);
      } else {
        alert(res?.msg || '구매 실패');
      }
    },

    buyItem: async (itemName, price) => {
      if (!confirm(`[${itemName}] 아이템을 ${price.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const me = st ? (st.name || st.이름) : '나';
      API.showLoading('아이템을 구매하는 중...');
      const res = await API.call('buyItem', { name: me, itemName: itemName });
      API.hideLoading();
      if (res && res.success) {
        // 로컬 보관함에도 즉시 저장
        const key = 'user_inventory_' + me;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push({ name: itemName, 카테고리: '캐릭터아이템', 금액: price });
        localStorage.setItem(key, JSON.stringify(list));

        SoundEngine.fanfare();
        alert(res.msg);
      } else {
        alert(res?.msg || '구매 실패');
      }
    },

    // ─── 관리자 액션 핸들러들 ───
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
