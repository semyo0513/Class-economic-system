// ============================================================
// 모달 및 UI 팝업 매니저 (js/modals.js)
// 14개 전 건물 완벽 구현, 국고 관리, 나이스 급식/시간표, 주식 모드 설정, 패션 살롱
// ============================================================

const ModalManager = (() => {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  let currentOpenId = null;

  function getSchoolName() {
    return (GameState.settings && (GameState.settings['학교명'] || GameState.settings.schoolName)) || '행복초등학교';
  }

  function open(id, extraData) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myPerm = st ? (st.permission || st.권한 || '일반') : '일반';
    const isTeacher = GameState.isAdmin || me === '선생님' || myPerm.includes('전체');

    // 🔒 교장실 접근 통제: 오직 교사만 입장 가능
    if (id === 'principal' && !isTeacher) {
      SoundEngine.snap();
      alert('⚠️ 교장실은 선생님(관리자) 전용 공간입니다.\n교사 모드로 로그인해주세요.');
      return;
    }

    // 🔒 시청 접근 통제: 직무 권한자 또는 교사만 입장 가능
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
    const schoolName = getSchoolName();

    switch (id) {
      // 1. 기숙사
      case 'dormitory': {
        MiniroomSystem.renderDormitoryList(container);
        break;
      }

      // 2. 은행 & 국고 관리
      case 'bank': {
        const rateVal = Number(GameState.settings?.['예금_기본이자율'] || 0.05);

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
                <div style="font-size:13px; font-weight:bold; color:#92400e;">🏛️ ${schoolName} 학급 국고(총 자산) 잔액</div>
                <div style="font-size:26px; font-weight:900; color:#b45309; margin:6px 0;" id="bank-treasury-balance">💰 1,000,000원</div>
                <div style="font-size:11px; color:#78350f;">(벌금 징수액, 학급마트 수익금, 세금 등이 투명하게 국고로 귀속 관리됩니다)</div>
              </div>

              ${isTeacher ? `
                <div style="display:flex; gap:8px; justify-content:center; margin-bottom:12px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:6px 14px; background:#16a34a;" onclick="ModalManager.openTreasuryDepositModal()">💰 국고 직접 입금</button>
                  <button class="pixel-btn-primary" style="width:auto; padding:6px 14px; background:#dc2626;" onclick="ModalManager.openTreasuryExpenseModal()">💸 국고 지출 집행</button>
                </div>
              ` : ''}

              <h4>📜 최근 국고 수입 & 지출 내역</h4>
              <div class="table-wrap" style="margin-top:8px; max-height:220px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>일시</th><th>구분</th><th>금액</th><th>국고잔액</th><th>담당자</th><th>사유</th></tr></thead>
                  <tbody id="bank-treasury-tbody">
                    <tr><td colspan="6" style="text-align:center; padding:15px;">국고 거래 장부를 조회하고 있습니다...</td></tr>
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
              tTbody.innerHTML = logs.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:15px;">국고 기록이 없습니다.</td></tr>' : logs.map(l => `
                <tr>
                  <td>${l.일시 || '-'}</td>
                  <td><span class="badge badge-${(l.구분 || l.유형 || '').includes('출금') || (l.구분 || l.유형 || '').includes('지출') ? 'danger' : 'success'}">${l.구분 || l.유형 || '입금'}</span></td>
                  <td><strong>${(Number(l.금액 || 0)).toLocaleString()}원</strong></td>
                  <td>${(Number(l.국고잔액 || 0)).toLocaleString()}원</td>
                  <td>${l.담당자 || '-'}</td>
                  <td>${l.사유 || '-'}</td>
                </tr>
              `).join('');
            }
          }
        });
        break;
      }

      // 3. 다종목 실시간 증권시장
      case 'stock': {
        const shortSchool = schoolName.replace('초등학교', '초').replace('학교', '');
        const stockList = [
          { code: '005930', name: '삼성전자', icon: '📱', price: 0, changeRate: '...' },
          { code: '035720', name: '카카오', icon: '🟡', price: 0, changeRate: '...' },
          { code: '035420', name: 'NAVER', icon: '🟢', price: 0, changeRate: '...' },
          { code: '086520', name: '에코프로', icon: '🔋', price: 0, changeRate: '...' },
          { code: '005380', name: '현대차', icon: '🚗', price: 0, changeRate: '...' },
          { code: 'CLASS', name: `${shortSchool} 협동조합`, icon: '🏫', price: 0, changeRate: '...' }
        ];

        container.innerHTML = `
          <div class="stock-panel">
            <div style="background:#f0fdf4; border:2px solid #86efac; padding:10px 14px; border-radius:10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:14px; font-weight:bold; color:#166534;">📈 실시간 증권 거래소</span>
                <span style="font-size:11px; color:#15803d; margin-left:6px;" id="stock-mode-badge">(구글 & 야후 금융 실시간 연동)</span>
              </div>
              <div style="font-size:12px; color:#166534;">
                💰 내 현금: <strong id="stock-my-cash-val">${myCash.toLocaleString()}원</strong>
              </div>
            </div>

            <!-- 종목 선택 탭 -->
            <div class="stock-tabs" id="stock-tab-buttons-wrap" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              ${stockList.map(s => `
                <button class="tab-btn stock-code-tab ${s.code === '005930' ? 'active' : ''}" id="stock-tab-${s.code}" onclick="ModalManager.switchStockCode('${s.code}')" style="padding:6px 10px; font-size:12px;">
                  ${s.icon} ${s.name}
                </button>
              `).join('')}
            </div>

            <!-- 선택 종목 시세 헤더 -->
            <div class="stock-header-grid" style="display:flex; justify-content:space-between; background:#ffffff; padding:12px 16px; border:2px solid #cbd5e1; border-radius:10px; margin-bottom:12px;">
              <div>
                <div style="font-size:13px; color:#64748b;" id="stock-active-name">📱 삼성전자 (005930)</div>
                <div style="display:flex; align-items:baseline; gap:8px;">
                  <div style="font-size:24px; font-weight:900; color:#ef4444;" id="stock-active-price">실시간 시세 조회 중...</div>
                  <div style="font-size:13px; font-weight:bold; color:#ef4444;" id="stock-active-rate">...</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px; color:#64748b;">내 보유 수량: <strong id="stock-active-holdings" style="color:#0f172a; font-size:14px;">0주</strong></div>
                <div style="font-size:12px; color:#64748b;">평가 금액: <strong id="stock-active-eval" style="color:#2563eb; font-size:14px;">0원</strong></div>
              </div>
            </div>

            <!-- 실시간 주가 차트 캔버스 -->
            <div class="stock-chart-wrap" style="background:#fff; border:2px solid #cbd5e1; border-radius:10px; padding:10px; text-align:center; margin-bottom:12px;">
              <canvas id="stock-chart-canvas" width="600" height="150" style="width:100%; max-width:600px; height:150px;"></canvas>
            </div>

            <!-- 매수 & 매도 컨트롤 박스 -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
              <div style="background:#fef2f2; border:2px solid #fca5a5; padding:10px; border-radius:8px;">
                <h4 style="color:#991b1b; font-size:13px; margin-bottom:6px;">🔴 매수 (사기)</h4>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="multi-stock-buy-qty" placeholder="수량" min="1" value="1" style="flex:1; padding:6px; border:1px solid #f87171; border-radius:4px; font-size:13px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:6px 14px; background:#dc2626;" onclick="ModalManager.handleTradeMultiStock('매수')">매수</button>
                </div>
              </div>
              <div style="background:#eff6ff; border:2px solid #bfdbfe; padding:10px; border-radius:8px;">
                <h4 style="color:#1e40af; font-size:13px; margin-bottom:6px;">🔵 매도 (팔기)</h4>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="multi-stock-sell-qty" placeholder="수량" min="1" value="1" style="flex:1; padding:6px; border:1px solid #60a5fa; border-radius:4px; font-size:13px;">
                  <button class="pixel-btn-secondary" style="background:#2563eb;" onclick="ModalManager.handleTradeMultiStock('매도')">매도</button>
                </div>
              </div>
            </div>

            <!-- 내 주식 보유 포트폴리오 -->
            <h4 style="margin-bottom:6px; font-size:13px; color:#334155;">📊 나의 주식 보유 포트폴리오</h4>
            <div class="table-wrap" style="max-height:120px; overflow-y:auto;">
              <table class="pixel-table">
                <thead><tr><th>종목명</th><th>실시간 현재가</th><th>보유 수량</th><th>총 평가금액</th></tr></thead>
                <tbody id="multi-stock-portfolio-tbody">
                  <tr><td colspan="4" style="text-align:center; padding:10px;">포트폴리오를 불러오는 중...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        `;

        ModalManager.activeMultiStockCode = '005930';
        ModalManager.multiStockCache = stockList;
        ModalManager.fetchLiveStockClient('005930');

        API.call('getMultiStockData', { name: me }, true).then(data => {
          if (data && data.success && data.stocks) {
            ModalManager.multiStockCache = data.stocks;
            ModalManager.multiStockHoldings = data.holdings || {};
            const wrap = document.getElementById('stock-tab-buttons-wrap');
            if (wrap) {
              wrap.innerHTML = data.stocks.map((s, i) => `
                <button class="tab-btn stock-code-tab ${s.code === ModalManager.activeMultiStockCode ? 'active' : ''}" id="stock-tab-${s.code}" onclick="ModalManager.switchStockCode('${s.code}')" style="padding:6px 10px; font-size:12px;">
                  ${s.icon || '📈'} ${s.name}
                </button>
              `).join('');
            }
            ModalManager.updateMultiStockUI();
          }
        });
        break;
      }

      // 4. 잡화점 & 뷰티 패션 살롱
      case 'shop': {
        const furns = CONFIG.FURNITURE_CATALOG;
        const hairDyes = [
          { id: 'hair_gold', name: '✨ 골드 블론드 염색약', color: '#eab308', price: 4000, desc: '반짝이는 황금빛 헤어' },
          { id: 'hair_pink', name: '🌸 체리 핑크 염색약', color: '#f472b6', price: 4000, desc: '사랑스러운 벚꽃 핑크 헤어' },
          { id: 'hair_mint', name: '🍃 민트 그린 염색약', color: '#2dd4bf', price: 4000, desc: '상큼하고 청량한 민트 헤어' },
          { id: 'hair_silver', name: '🤍 백발 실버 염색약', color: '#cbd5e1', price: 5000, desc: '신비로운 백은발 헤어' },
          { id: 'hair_blue', name: '🌊 오션 블루 염색약', color: '#38bdf8', price: 4000, desc: '시원한 바다빛 파란 헤어' },
          { id: 'hair_purple', name: '💜 라벤더 퍼플 염색약', color: '#a855f7', price: 4500, desc: '우아한 보랏빛 헤어' },
          { id: 'hair_red', name: '🔥 핫 레드 염색약', color: '#ef4444', price: 4000, desc: '열정적인 붉은 헤어' },
          { id: 'hair_black', name: '🖤 흑발 딥블랙 염색약', color: '#0f172a', price: 3000, desc: '깔끔한 정통 흑발 헤어' }
        ];

        const costumes = [
          { id: 'costume_school', name: '🎓 스마트 명문 교복', price: 8000, desc: '단정하고 깔끔한 감청색 교복' },
          { id: 'costume_pajama', name: '🧸 핑크 곰돌이 잠옷', price: 7000, desc: '포근하고 귀여운 동물 파자마' },
          { id: 'costume_magic', name: '🔮 신비한 마법사 로브', price: 12000, desc: '마력이 깃든 보랏빛 마법 로브' },
          { id: 'costume_cyber', name: '⚡ 사이버 네온 슈트', price: 15000, desc: '미래지향적인 네온 발광 슈트' },
          { id: 'costume_dress', name: '👑 화려한 공주 드레스', price: 18000, desc: '로맨틱한 핑크 프릴 드레스' }
        ];

        const hats = [
          { id: 'hat_cat_ears', name: '🐱 냥냥 고양이 귀', price: 5000, desc: '귀엽게 쫑긋거리는 고양이 귀' },
          { id: 'hat_crown', name: '👑 황금 보석 왕관', price: 10000, desc: '눈부신 최고급 황금 왕관' },
          { id: 'hat_halo', name: '😇 빛나는 천사 링', price: 8000, desc: '머리 위에 떠있는 성스러운 링' },
          { id: 'hat_magic_hat', name: '🎩 뾰족 마법사 모자', price: 7000, desc: '고깔 모양의 마법 모자' }
        ];

        const auras = [
          { id: 'aura_gold', name: '✨ 황금 오라 이펙트', price: 15000, desc: '캐릭터 주변에 황금빛 파티클' },
          { id: 'aura_cherry', name: '🌸 벚꽃잎 휘날림 오라', price: 12000, desc: '걸을 때마다 벚꽃이 흩날림' },
          { id: 'aura_rainbow', name: '🌈 무지개 빛 잔상 오라', price: 20000, desc: '화려한 7색 무지개 오라' }
        ];

        container.innerHTML = `
          <div class="shop-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchShopTab('furn')">🛋️ 미니룸 가구</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('hair')">💇‍♀️ 헤어 염색 살롱</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('costume')">👗 패션 코스튬</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('hat')">👑 모자/머리띠</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('aura')">✨ 특수 오라/이펙트</button>
          </div>

          <!-- 1. 미니룸 가구 탭 -->
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

          <!-- 2. 헤어 염색 살롱 탭 -->
          <div id="shop-tab-hair" class="shop-grid" style="display:none;">
            ${hairDyes.map(h => `
              <div class="shop-item-card" style="border-color:${h.color};">
                <div style="width:36px; height:36px; border-radius:50%; background:${h.color}; margin:0 auto 6px; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.2);"></div>
                <div class="item-name">${h.name}</div>
                <div class="item-desc">${h.desc}</div>
                <div class="item-price">💰 ${h.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" style="background:${h.color}; color:#fff;" onclick="ModalManager.buyHairDye('${h.id}', '${h.color}', ${h.price}, '${h.name}')">염색하기</button>
              </div>
            `).join('')}
          </div>

          <!-- 3. 패션 코스튬 탭 -->
          <div id="shop-tab-costume" class="shop-grid" style="display:none;">
            ${costumes.map(c => `
              <div class="shop-item-card">
                <div style="font-size:32px; margin-bottom:4px;">👗</div>
                <div class="item-name">${c.name}</div>
                <div class="item-desc">${c.desc}</div>
                <div class="item-price">💰 ${c.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyCostume('${c.id}', ${c.price}, '${c.name}')">의상 입기</button>
              </div>
            `).join('')}
          </div>

          <!-- 4. 모자/머리띠 탭 -->
          <div id="shop-tab-hat" class="shop-grid" style="display:none;">
            ${hats.map(h => `
              <div class="shop-item-card">
                <div style="font-size:32px; margin-bottom:4px;">👑</div>
                <div class="item-name">${h.name}</div>
                <div class="item-desc">${h.desc}</div>
                <div class="item-price">💰 ${h.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyHat('${h.id}', ${h.price}, '${h.name}')">장착하기</button>
              </div>
            `).join('')}
          </div>

          <!-- 5. 특수 오라 탭 -->
          <div id="shop-tab-aura" class="shop-grid" style="display:none;">
            ${auras.map(a => `
              <div class="shop-item-card">
                <div style="font-size:32px; margin-bottom:4px;">✨</div>
                <div class="item-name">${a.name}</div>
                <div class="item-desc">${a.desc}</div>
                <div class="item-price">💰 ${a.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" style="background:#7c3aed;" onclick="ModalManager.buyAura('${a.id}', ${a.price}, '${a.name}')">오라 구매</button>
              </div>
            `).join('')}
          </div>
        `;
        break;
      }

      // 5. 마트
      case 'mart': {
        const canManageMart = isTeacher || myPerm.includes('마트관리');
        container.innerHTML = `
          <div class="mart-panel">
            <div class="mart-tabs" style="display:flex; gap:8px; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchMartTab('shop')">🛒 마트 쇼핑 & 바코드 결제</button>
              ${canManageMart ? '<button class="tab-btn" onclick="ModalManager.switchMartTab(\'pos\')">💼 마트 POS기 & 물품 관리</button>' : ''}
            </div>

            <div id="mart-tab-shop">
              <div class="mart-grid" id="mart-items-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; max-height:280px; overflow-y:auto;">
                <div style="grid-column:span 2; text-align:center; padding:20px;">물품 목록을 불러오는 중...</div>
              </div>
            </div>

            ${canManageMart ? `
              <div id="mart-tab-pos" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span style="font-size:13px; font-weight:bold; color:#1e293b;">📋 등록 물품 관리</span>
                  <button class="pixel-btn-sm" style="background:#7c3aed;" onclick="ModalManager.openAddMartItemModal()">➕ 새 물품 등록</button>
                </div>
                <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
                  <table class="pixel-table">
                    <thead><tr><th>물품명</th><th>가격</th><th>재고</th><th>상태</th><th>수정</th></tr></thead>
                    <tbody id="mart-pos-tbody">
                      <tr><td colspan="5" style="text-align:center; padding:10px;">목록 로딩 중...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}
          </div>
        `;

        API.call('getMartItems', {}, true).then(res => {
          const items = res.items || [];
          const grid = document.getElementById('mart-items-grid');
          if (grid && items.length > 0) {
            grid.innerHTML = items.map(it => `
              <div class="shop-item-card">
                <div class="item-name">${it.아이템명 || it.itemName}</div>
                <div class="item-price">💰 ${(Number(it.금액 || 0)).toLocaleString()}원 (재고: ${it.수량 || 0}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyMartItem('${it.아이템명 || it.itemName}', ${it.금액 || 0})">구매하기</button>
              </div>
            `).join('');
          }
          const posTbody = document.getElementById('mart-pos-tbody');
          if (posTbody && items.length > 0) {
            posTbody.innerHTML = items.map(it => `
              <tr>
                <td><strong>${it.아이템명 || it.itemName}</strong></td>
                <td>${(Number(it.금액 || 0)).toLocaleString()}원</td>
                <td>${it.수량 || 0}개</td>
                <td><span class="badge badge-success">${it.상태 || '판매중'}</span></td>
                <td><button class="pixel-btn-sm" onclick="ModalManager.editMartItem('${it.아이템명 || it.itemName}', ${it.금액 || 0}, ${it.수량 || 0})">수정</button></td>
              </tr>
            `).join('');
          }
        });
        break;
      }

      // 6. 복권방
      case 'lottery': {
        container.innerHTML = `
          <div class="lottery-panel" style="text-align:center; padding:10px;">
            <div style="background:#fef3c7; border:2px solid #f59e0b; padding:14px; border-radius:10px; margin-bottom:14px;">
              <h3 style="color:#b45309; font-size:18px; margin-bottom:4px;">🎰 ${schoolName} 행운의 즉석 스크래치 복권</h3>
              <p style="font-size:12px; color:#92400e;">1장당 <strong>500원</strong>! 긁어서 최고 <strong>50,000원</strong>의 행운을 잡으세요! (4등 상금 3,000원)</p>
            </div>

            <div class="scratch-card" id="lottery-scratch-box" style="background:#fff; border:3px dashed #d97706; border-radius:12px; padding:24px; margin:0 auto 16px; max-width:320px;">
              <div id="scratch-prompt">
                <div style="font-size:48px; margin-bottom:8px;">🎟️</div>
                <div style="font-size:15px; font-weight:bold; color:#1e293b;">행운의 복권 한 장</div>
                <div style="font-size:12px; color:#64748b; margin-top:4px;">구매 후 즉시 긁어서 당첨금을 확인하세요!</div>
              </div>
              <div id="scratch-result" style="display:none;">
                <div style="font-size:40px; margin-bottom:4px;">🎉</div>
                <div style="font-size:20px; font-weight:900; color:#ef4444;" id="scratch-title">1등 당첨!</div>
                <div style="font-size:13px; font-weight:bold; color:#1e293b; margin-top:6px;" id="scratch-msg">50,000원 획득!</div>
              </div>
            </div>

            <button class="pixel-btn-primary" style="width:auto; padding:10px 24px; font-size:15px; background:#d97706;" onclick="ModalManager.playLottery()">
              🎟️ 복권 구매 & 긁기 (500원)
            </button>
          </div>
        `;
        break;
      }

      // 7. 상담실
      case 'counseling': {
        const todayKey = 'emotion_' + new Date().toISOString().slice(0, 10);
        const alreadyDone = localStorage.getItem(todayKey) === 'true';

        container.innerHTML = `
          <div class="counseling-panel">
            <div style="background:#f0fdf4; border:2px solid #86efac; padding:12px; border-radius:8px; margin-bottom:12px;">
              <h3 style="color:#166534; font-size:15px;">💚 ${schoolName} 마음 상담실 & 감정신호등</h3>
              <p style="font-size:12px; color:#15803d;">오늘 나의 마음 상태를 선택하고 등록하면 매일 1회 학급화폐 장학금이 지급됩니다!</p>
            </div>

            <div class="emotion-select-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:14px;">
              <button class="emotion-opt-btn active" style="background:#dcfce7; border:2px solid #22c55e; padding:12px; border-radius:8px; text-align:center;" onclick="ModalManager.selectEmotion('🟢 좋음', this)">
                <div style="font-size:26px;">🟢</div>
                <div style="font-weight:bold; color:#15803d; font-size:13px; margin-top:2px;">기분 최고!</div>
                <div style="font-size:11px; color:#166534;">(+500원)</div>
              </button>
              <button class="emotion-opt-btn" style="background:#fef9c3; border:2px solid #eab308; padding:12px; border-radius:8px; text-align:center;" onclick="ModalManager.selectEmotion('🟡 보통', this)">
                <div style="font-size:26px;">🟡</div>
                <div style="font-weight:bold; color:#854d0e; font-size:13px; margin-top:2px;">그냥 그래요</div>
                <div style="font-size:11px; color:#854d0e;">(+300원)</div>
              </button>
              <button class="emotion-opt-btn" style="background:#fee2e2; border:2px solid #ef4444; padding:12px; border-radius:8px; text-align:center;" onclick="ModalManager.selectEmotion('🔴 힘듦', this)">
                <div style="font-size:26px;">🔴</div>
                <div style="font-weight:bold; color:#991b1b; font-size:13px; margin-top:2px;">힘들고 지쳐요</div>
                <div style="font-size:11px; color:#991b1b;">(+1,000원)</div>
              </button>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <textarea id="emotion-msg-input" placeholder="선생님께 전하고 싶은 말이나 오늘의 기분을 자유롭게 적어주세요. (비밀 보장)" style="width:100%; height:70px; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;"></textarea>
            </div>

            <button class="pixel-btn-primary" style="${alreadyDone ? 'background:#94a3b8;' : ''}" onclick="ModalManager.submitEmotion()">
              ${alreadyDone ? '✅ 오늘 이미 등록함 (재등록 가능)' : '✨ 감정신호등 등록하고 장학금 받기'}
            </button>
          </div>
        `;
        break;
      }

      // 8. 벼룩시장
      case 'flea_market': {
        container.innerHTML = `
          <div class="flea-panel">
            <div style="background:#fffbeb; border:2px solid #fde68a; padding:10px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:13px; font-weight:bold; color:#92400e;">🎪 학생 자율 중고 벼룩시장</span>
              <button class="pixel-btn-sm" onclick="ModalManager.openAddFleaModal()">➕ 중고 물품 등록</button>
            </div>
            <div class="flea-grid" id="flea-items-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; max-height:260px; overflow-y:auto;">
              <div style="grid-column:span 2; text-align:center; padding:15px;">등록된 벼룩시장 물품을 불러오는 중...</div>
            </div>
          </div>
        `;

        API.call('getFleaItems', {}, true).then(res => {
          const items = res.items || [];
          const grid = document.getElementById('flea-items-grid');
          if (grid) {
            grid.innerHTML = items.length === 0 ? '<div style="grid-column:span 2; text-align:center; padding:20px; color:#64748b;">등록된 중고 물품이 없습니다. 첫 물품을 등록해보세요!</div>' : items.map(it => `
              <div class="shop-item-card">
                <div class="item-name">${it.아이템명 || it.name}</div>
                <div style="font-size:11px; color:#64748b;">판매자: ${it.판매자 || it.seller || '친구'}</div>
                <div class="item-price">💰 ${(it.금액 || it.price || 0).toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyFleaItem('${it.아이템명 || it.name}', ${it.금액 || it.price || 0})">구매하기</button>
              </div>
            `).join('');
          }
        });
        break;
      }

      // 9. 고용센터
      case 'jobcenter': {
        container.innerHTML = `
          <div class="job-panel">
            <div style="background:#f1f5f9; border:2px solid #cbd5e1; padding:12px; border-radius:8px; margin-bottom:12px;">
              <h3 style="color:#1e293b; font-size:15px;">💼 ${schoolName} 1인 1직업 고용센터</h3>
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
                <td>💰 ${(j.salary || 50000).toLocaleString()}원</td>
                <td><button class="pixel-btn-sm" onclick="ModalManager.applyJob('${j.jobTitle}')">신청</button></td>
              </tr>
            `).join('');
          }
        });
        break;
      }

      // 10. 부동산 중개소
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

      // 11. 학교 본관 LMS (나이스 실시간 연동)
      case 'school': {
        const defaultNotices = [
          { 날짜: '2026-08-28', 제목: `🎉 ${schoolName} 2D 클래스타운 개장 안내!`, 내용: '기숙사 미니룸을 꾸미고 친구들과 교류해보세요.', 중요도: '긴급' },
          { 날짜: '2026-08-27', 제목: '이번 주 금요일 주식 배당금 지급 안내', 내용: '보유 주식 수에 따라 배당금이 지급됩니다.', 중요도: '일반' }
        ];

        container.innerHTML = `
          <div class="school-lms-wrap">
            <div class="lms-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchLmsTab('notice')">📢 공지사항</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('assign')">📝 과제 & 숙제</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('meal')">🍱 오늘의 나이스 급식</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('tt')">⏰ 나이스 시간표</button>
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <h3 style="color:#b45309; font-size:16px;">🍱 ${schoolName} 오늘의 영양 급식 식단</h3>
                  <span id="meal-source-badge" class="badge badge-primary">나이스(NEIS) 실시간</span>
                </div>
                <div id="meal-content-text" style="font-size:14px; line-height:1.8; color:#1e293b; white-space:pre-line;">급식 정보를 불러오는 중...</div>
                <div id="meal-calories-text" style="font-size:12px; color:#78350f; margin-top:8px; font-weight:bold;"></div>
              </div>
            </div>

            <div id="lms-tab-tt" class="lms-content-tab" style="display:none;">
              <div style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:10px; padding:14px;">
                <div style="font-size:14px; font-weight:bold; color:#1e293b; margin-bottom:10px;">⏰ 오늘의 학급 시간표</div>
                <div class="timetable-grid" id="timetable-grid-wrap" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                  ${['1교시: 국어', '2교시: 수학', '3교시: 사회', '4교시: 과학', '5교시: 체육', '6교시: 미술'].map(t => `
                    <div class="tt-cell" style="background:#fff; border:2px solid #cbd5e1; padding:12px; border-radius:8px; text-align:center; font-weight:bold;">${t}</div>
                  `).join('')}
                </div>
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

      // 13. 교장실 & 시청 관리자 패널
      case 'cityhall':
      case 'principal':
      case 'admin_quick': {
        const canPaySalary = isTeacher || myPerm.includes('월급배부');
        const canFine = isTeacher || myPerm.includes('벌금징수');
        const canWarn = isTeacher || myPerm.includes('경고');
        const canNotice = isTeacher || myPerm.includes('공지작성');
        const canMart = isTeacher || myPerm.includes('마트관리');

        container.innerHTML = `
          <div class="admin-panel">
            <div class="admin-top-stats" style="display:flex; justify-content:space-between; background:#fee2e2; border:2px solid #fca5a5; padding:12px; border-radius:8px; margin-bottom:12px;">
              <div>👨‍🎓 등록 학생: <strong id="admin-student-count">불러오는 중...</strong></div>
              <div>⚙️ 내 직무 권한: <strong>${isTeacher ? '👑 교사(전체)' : myPerm}</strong></div>
            </div>

            <!-- 관리자 핵심 액션 툴바 -->
            <div class="admin-action-bar" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              ${canPaySalary ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#0284c7;" onclick="ModalManager.openPaySalariesModal()">💰 월급 일괄 배부</button>' : ''}
              ${canFine ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#dc2626;" onclick="ModalManager.openFineModal()">⚖️ 벌금 징수</button>' : ''}
              ${canWarn ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#ea580c;" onclick="ModalManager.openWarnModal()">⚠️ 경고장 발송</button>' : ''}
              ${canNotice ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#16a34a;" onclick="ModalManager.openNoticeWriteModal()">📢 새 공지 작성</button>' : ''}
              ${canMart ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#7c3aed;" onclick="ModalManager.openAddMartItemModal()">🛒 마트 물품 등록</button>' : ''}
            </div>

            <div class="admin-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="tab-btn active" onclick="ModalManager.switchAdminTab('students')">👥 학생 목록 & 현황</button>
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'permissions\')">👑 학생 권한 부여</button>' : ''}
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'items_admin\')">🛍️ 아이템 가격/수량 수정</button>' : ''}
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'stock_admin\')">📈 주식 설정 & 시세 관리</button>' : ''}
              ${isTeacher ? '<button class="tab-btn" onclick="ModalManager.switchAdminTab(\'sheet_init\')">🔄 시트 전체 초기화</button>' : ''}
            </div>

            <!-- 1. 학생 목록 탭 -->
            <div id="admin-tab-students" class="admin-tab-content">
              <div class="table-wrap" style="max-height:300px; overflow-y:auto;">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식수량</th><th>총자산</th><th>부여권한</th>${isTeacher ? '<th>교사조정</th>' : ''}</tr></thead>
                  <tbody id="admin-students-tbody">
                    <tr><td colspan="8" style="text-align:center; padding:15px;">전체 학생 목록을 불러오는 중...</td></tr>
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
                      <tr><td colspan="4" style="text-align:center; padding:15px;">학생 목록을 불러오는 중...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            <!-- 2-1. 아이템 가격 & 수량 관리 탭 (교사전용) -->
            ${isTeacher ? `
              <div id="admin-tab-items_admin" class="admin-tab-content" style="display:none;">
                <div style="background:#eff6ff; border:2px solid #93c5fd; padding:10px; border-radius:8px; margin-bottom:10px; font-size:12px; color:#1e40af;">
                  💡 가구, 의상, 아이템, 마트 물품의 가격과 재고 수량을 즉시 수정할 수 있습니다.
                </div>
                <div class="table-wrap" style="max-height:280px; overflow-y:auto;">
                  <table class="pixel-table">
                    <thead><tr><th>카테고리</th><th>아이템명</th><th>판매가격(원)</th><th>재고수량</th><th>수정</th></tr></thead>
                    <tbody id="admin-items-editor-tbody">
                      <tr><td colspan="5" style="text-align:center; padding:15px;">아이템 목록을 불러오는 중...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            <!-- 3. 주식 설정 & 시세 관리 탭 -->
            ${isTeacher ? `
              <div id="admin-tab-stock_admin" class="admin-tab-content" style="display:none;">
                <div style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:12px;">
                  <div style="font-weight:bold; font-size:13px; margin-bottom:6px;">📈 주식 운영 모드 설정</div>
                  <label style="margin-right:12px; font-size:12px;"><input type="radio" name="stock-mode-radio" value="REALTIME_NAVER" checked> 실시간 네이버 증권 (다종목)</label>
                  <label style="font-size:12px;"><input type="radio" name="stock-mode-radio" value="MANUAL"> 교사 수동 조정 주식 (학급 자체 주가)</label>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                  <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">활성화할 주식 종목 코드 (쉼표로 구분)</label>
                  <input type="text" id="admin-stock-codes" value="005930,035720,035420,086520,005380,CLASS" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;">
                  <div style="font-size:11px; color:#64748b; margin-top:2px;">(예: 005930=삼성전자, 035720=카카오, 035420=NAVER, 086520=에코프로, CLASS=학급주식)</div>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                  <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">학급 자체 주가 수동 설정 (원)</label>
                  <input type="number" id="admin-new-stock-price" placeholder="예: 1300" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                  <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">주식 경제 뉴스 제목</label>
                  <input type="text" id="admin-stock-news-title" placeholder="예: 학급 마트 신규 오픈 호재" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
                </div>

                <button class="pixel-btn-primary" onclick="ModalManager.saveStockSettings()">💾 주식 모드 및 시세 설정 저장</button>
              </div>

              <!-- 4. 시트 전체 초기화 탭 (교사전용) -->
              <div id="admin-tab-sheet_init" class="admin-tab-content" style="display:none; text-align:center; padding:20px;">
                <p style="color:#ef4444; font-weight:bold; margin-bottom:12px;">⚠️ 교사 전용 기능: 구글 시트의 12개 시트 구조와 기본 데이터를 완전하게 재구성합니다.</p>
                <button class="pixel-btn-primary" style="background:#ef4444; border-color:#991b1b;" onclick="ModalManager.adminInitSheets()">12개 시스템 시트 자동 초기화 실행</button>
              </div>
            ` : ''}
          </div>
        `;

        // 전체 학생 목록 실시간 로드 및 렌더링
        API.call('getStudents', {}, true).then(res => {
          const students = res.students || [];
          GameState.rankingList = students;

          const countEl = document.getElementById('admin-student-count');
          if (countEl) countEl.textContent = `${students.length}명`;

          const sTbody = document.getElementById('admin-students-tbody');
          if (sTbody) {
            sTbody.innerHTML = students.map((s, idx) => `
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
            `).join('');
          }

          const pTbody = document.getElementById('admin-perm-tbody');
          if (pTbody) {
            pTbody.innerHTML = students.filter(s => s.name !== '선생님').map(s => `
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
            `).join('');
          }
        });
        break;
      }

      default:
        container.innerHTML = `<div style="padding:20px;">${id} 시설에 오신 것을 환영합니다!</div>`;
    }
  }

  // 특수 팝업 (간편모드, 인벤토리, 우편함)
  function renderSpecialContent(id, container, extraData) {
    const st = GameState.student;
    const me = st ? (st.name || st.이름 || '나') : '나';
    const myPerm = st ? (st.permission || st.권한 || '일반') : '일반';
    const isTeacher = GameState.isAdmin || me === '선생님' || myPerm.includes('전체');

    if (id === 'quick_board') {
      const facilities = [
        { id: 'dormitory', name: '학생 기숙사', emoji: '🏠', desc: '미니룸 방꾸미기' },
        { id: 'bank', name: '클래스 은행', emoji: '🏦', desc: '예금 & 국고 조회' },
        { id: 'stock', name: '증권거래소', emoji: '📈', desc: '네이버 주식 매매' },
        { id: 'shop', name: '잡화점 & 살롱', emoji: '🛋️', desc: '패션/헤어 & 가구' },
        { id: 'mart', name: '학급마트', emoji: '🛒', desc: '간식 결제 & POS' },
        { id: 'school', name: '학교 본관', emoji: '🏫', desc: '나이스급식/시간표' },
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
        <div class="quick-board-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; max-height:360px; overflow-y:auto;">
          ${facilities.map(f => {
            const isCityHallDisabled = f.id === 'cityhall' && !isTeacher && !myPerm.includes('월급배부') && !myPerm.includes('벌금징수') && !myPerm.includes('경고') && !myPerm.includes('공지작성') && !myPerm.includes('마트관리');
            const isPrincipalDisabled = f.id === 'principal' && !isTeacher;
            const disabled = isCityHallDisabled || isPrincipalDisabled;

            return `
              <div class="quick-board-card" style="background:#fff; border:2px solid ${disabled ? '#e2e8f0' : '#94a3b8'}; border-radius:8px; padding:10px; display:flex; align-items:center; justify-content:space-between; opacity:${disabled ? '0.5' : '1'}; cursor:${disabled ? 'not-allowed' : 'pointer'};" onclick="${disabled ? `alert('${isPrincipalDisabled ? '교사 전용 공간입니다.' : '직무 권한이 필요합니다.'}')` : `ModalManager.open('${f.id}')`}">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="font-size:24px;">${f.emoji}</div>
                  <div>
                    <div style="font-weight:bold; font-size:12px; color:#1e293b;">${f.name}</div>
                    <div style="font-size:10px; color:#64748b;">${f.desc}</div>
                  </div>
                </div>
                <button class="pixel-btn-sm" style="padding:4px 8px; font-size:11px; ${disabled ? 'background:#cbd5e1; cursor:not-allowed;' : ''}">이동</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (id === 'inventory') {
      container.innerHTML = `
        <div class="inventory-panel">
          <div class="inven-tabs" style="display:flex; gap:6px; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchInvenTab('equips')">⚔️ 장착 아이템</button>
            <button class="tab-btn" onclick="ModalManager.switchInvenTab('coupons')">🎟️ 보유 쿠폰</button>
            <button class="tab-btn" onclick="ModalManager.switchInvenTab('furns')">🛋️ 미니룸 가구</button>
          </div>

          <div id="inven-tab-equips" class="inven-grid">
            <div style="padding:15px; text-align:center; color:#64748b;">보유 장착템을 불러오는 중...</div>
          </div>
          <div id="inven-tab-coupons" class="inven-grid" style="display:none;">
            <div style="padding:15px; text-align:center; color:#64748b;">보유 쿠폰을 불러오는 중...</div>
          </div>
          <div id="inven-tab-furns" class="inven-grid" style="display:none;">
            <div style="padding:15px; text-align:center; color:#64748b;">가구 목록을 불러오는 중...</div>
          </div>
        </div>
      `;

      API.call('getUserInventory', { name: me }, true).then(res => {
        const inv = res.inventory || [];
        const equips = inv.filter(it => ['캐릭터아이템', '의상', '모자', '오라', '헤어'].includes(it.카테고리));
        const coupons = inv.filter(it => it.카테고리 === '아이템');
        const furns = inv.filter(it => it.카테고리 === '가구');

        const eqEl = document.getElementById('inven-tab-equips');
        if (eqEl) {
          eqEl.innerHTML = equips.length === 0 ? '<div style="padding:15px; text-align:center; color:#64748b;">보유 중인 패션 장착 아이템이 없습니다.</div>' : equips.map(e => `
            <div class="shop-item-card" style="border:2px solid #a7f3d0; background:#f0fdf4; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div class="item-name" style="font-weight:bold; font-size:13px; color:#065f46;">${e.아이템명}</div>
                <div style="font-size:11px; color:#15803d; margin-top:2px;">[${e.카테고리}] ${e.상태 || '보유중'}</div>
              </div>
              <span class="badge badge-success" style="background:#22c55e; color:white; padding:4px 8px; border-radius:6px; font-size:11px;">✨ 장착됨</span>
            </div>
          `).join('');
        }

        const cpEl = document.getElementById('inven-tab-coupons');
        if (cpEl) {
          cpEl.innerHTML = coupons.length === 0 ? '<div style="padding:15px; text-align:center; color:#64748b;">보유 중인 쿠폰이 없습니다.</div>' : coupons.map(c => `
            <div class="shop-item-card">
              <div class="item-name">${c.아이템명}</div>
              <button class="pixel-btn-primary" style="margin-top:6px;" onclick="ModalManager.useItem('${c.아이템명}')">사용하기</button>
            </div>
          `).join('');
        }

        const fnEl = document.getElementById('inven-tab-furns');
        if (fnEl) {
          fnEl.innerHTML = furns.length === 0 ? '<div style="padding:15px; text-align:center; color:#64748b;">보유 중인 가구가 없습니다.</div>' : furns.map(f => `
            <div class="shop-item-card">
              <div class="item-name">${f.아이템명}</div>
              <div style="font-size:11px; color:#3b82f6;">수량: ${f.수량 || 1}개</div>
            </div>
          `).join('');
        }
      });
    } else if (id === 'mailbox') {
      container.innerHTML = `
        <div class="mailbox-panel">
          <div class="table-wrap" style="max-height:280px; overflow-y:auto;">
            <table class="pixel-table">
              <thead><tr><th>일시</th><th>보낸 사람</th><th>유형</th><th>내용</th></tr></thead>
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
    }
  }

  return {
    open,
    close,
    switchShopTab: (tab) => {
      ['furn', 'hair', 'costume', 'hat', 'aura'].forEach(t => {
        const el = document.getElementById(`shop-tab-${t}`);
        if (el) el.style.display = t === tab ? 'grid' : 'none';
      });
      document.querySelectorAll('.shop-tabs .tab-btn').forEach((b, i) => {
        const tabs = ['furn', 'hair', 'costume', 'hat', 'aura'];
        b.classList.toggle('active', tabs[i] === tab);
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
      if (tab === 'meal') {
        API.call('getNeisMeal', {}, true).then(res => {
          const contentEl = document.getElementById('meal-content-text');
          const calEl = document.getElementById('meal-calories-text');
          if (contentEl) contentEl.innerText = res.menu || '급식 정보가 없습니다.';
          if (calEl) calEl.innerText = `🔥 칼로리: ${res.calories || '정보 없음'}`;
        });
      } else if (tab === 'tt') {
        API.call('getNeisTimetable', {}, true).then(res => {
          const ttWrap = document.getElementById('timetable-grid-wrap');
          if (ttWrap && res.timetable && res.timetable.length > 0) {
            ttWrap.innerHTML = res.timetable.map(t => `
              <div class="tt-cell" style="background:#fff; border:2px solid #cbd5e1; padding:12px; border-radius:8px; text-align:center; font-weight:bold;">${t}</div>
            `).join('');
          }
        });
      }
      SoundEngine.click();
    },
    switchAdminTab: (tab) => {
      ['students', 'permissions', 'items_admin', 'stock_admin', 'sheet_init'].forEach(t => {
        const el = document.getElementById(`admin-tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      if (tab === 'items_admin') ModalManager.loadAdminItems();
      SoundEngine.click();
    },

    // ─── 국고 직접 입금 & 지출 집행 ───
    openTreasuryDepositModal: () => {
      const amt = prompt('국고에 입금할 금액(원)을 입력하세요:');
      if (!amt || isNaN(amt) || Number(amt) <= 0) return;
      const reason = prompt('입금 사유(예: 교사 특별 보조금 등):', '교사 보조금 입금');
      if (!reason) return;

      API.showLoading('국고 입금 집행 중...');
      API.call('manageTreasury', { type: '입금', amount: Number(amt), reason: reason, person: '선생님' }).then(res => {
        API.hideLoading();
        SoundEngine.fanfare();
        alert(res?.msg || '입금 완료');
        open('bank');
      });
    },

    openTreasuryExpenseModal: () => {
      const amt = prompt('국고에서 지출할 금액(원)을 입력하세요:');
      if (!amt || isNaN(amt) || Number(amt) <= 0) return;
      const reason = prompt('지출 사유(예: 학급 피자 파티 비용, 장학금 지급):', '학급 행사비 지출');
      if (!reason) return;

      API.showLoading('국고 지출 집행 중...');
      API.call('manageTreasury', { type: '출금', amount: Number(amt), reason: reason, person: '선생님' }).then(res => {
        API.hideLoading();
        SoundEngine.coin();
        alert(res?.msg || '지출 집행 완료');
        open('bank');
      });
    },

    // ─── 패션 살롱 & 아이템 구매 (품절 에러 원천 방지) ───
    buyHairDye: async (id, color, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하여 머리를 염색하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');

      API.showLoading('헤어 살롱 염색 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '헤어', prop: color });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${(buyRes.student.cash || 0).toLocaleString()}원`;
        }
        if (!GameState.characterStyle) GameState.characterStyle = {};
        GameState.characterStyle.hairColor = color;
        localStorage.setItem(`char_style_${myName}`, JSON.stringify(GameState.characterStyle));
        API.call('updateCharacterStyle', { name: myName, studentName: myName, style: GameState.characterStyle }, true);

        if (window.MainGameScene && window.MainGameScene.reloadPlayerTexture) {
          window.MainGameScene.reloadPlayerTexture();
        }
        SoundEngine.fanfare();
        alert(`✨ ${name} 적용 완료! 캐릭터 헤어가 멋지게 바뀌었습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyCostume: async (id, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하여 착용하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const cType = id.replace('costume_', '');

      API.showLoading('의상 착용 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '의상', prop: cType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${(buyRes.student.cash || 0).toLocaleString()}원`;
        }
        if (!GameState.characterStyle) GameState.characterStyle = {};
        GameState.characterStyle.costume = cType;
        localStorage.setItem(`char_style_${myName}`, JSON.stringify(GameState.characterStyle));
        API.call('updateCharacterStyle', { name: myName, studentName: myName, style: GameState.characterStyle }, true);

        if (window.MainGameScene && window.MainGameScene.reloadPlayerTexture) {
          window.MainGameScene.reloadPlayerTexture();
        }
        SoundEngine.fanfare();
        alert(`👗 ${name} 착용 완료! 패션 스타일이 업그레이드되었습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyHat: async (id, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하여 장착하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const hType = id.replace('hat_', '');

      API.showLoading('액세서리 장착 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '모자', prop: hType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${(buyRes.student.cash || 0).toLocaleString()}원`;
        }
        if (!GameState.characterStyle) GameState.characterStyle = {};
        GameState.characterStyle.hat = hType;
        localStorage.setItem(`char_style_${myName}`, JSON.stringify(GameState.characterStyle));
        API.call('updateCharacterStyle', { name: myName, studentName: myName, style: GameState.characterStyle }, true);

        if (window.MainGameScene && window.MainGameScene.reloadPlayerTexture) {
          window.MainGameScene.reloadPlayerTexture();
        }
        SoundEngine.fanfare();
        alert(`👑 ${name} 장착 완료!`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyAura: async (id, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const aType = id.replace('aura_', '');

      API.showLoading('특수 오라 발동 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '오라', prop: aType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${(buyRes.student.cash || 0).toLocaleString()}원`;
        }
        if (!GameState.characterStyle) GameState.characterStyle = {};
        GameState.characterStyle.aura = aType;
        localStorage.setItem(`char_style_${myName}`, JSON.stringify(GameState.characterStyle));
        API.call('updateCharacterStyle', { name: myName, studentName: myName, style: GameState.characterStyle }, true);

        if (window.MainGameScene && window.MainGameScene.reloadPlayerTexture) {
          window.MainGameScene.reloadPlayerTexture();
        }
        SoundEngine.fanfare();
        alert(`✨ ${name} 발동 완료! 화려한 오라가 몸을 감쌉니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyFurniture: async (id, price, name) => {
      if (!confirm(`[${name}] 가구를 ${price.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');

      API.showLoading('가구 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '가구', prop: id });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${(buyRes.student.cash || 0).toLocaleString()}원`;
        }
        MiniroomSystem.addFurnitureToInventory(myName, id);
        SoundEngine.fanfare();
        alert(`🛋️ ${name} 구매 완료! 미니룸 인벤토리에 보관되었습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    // ─── 주식 설정 저장 (교장실) ───
    saveStockSettings: async () => {
      const modeEl = document.querySelector('input[name="stock-mode-radio"]:checked');
      const mode = modeEl ? modeEl.value : 'REALTIME_NAVER';
      const codes = document.getElementById('admin-stock-codes')?.value || '005930,035720,035420,086520,005380,CLASS';
      const price = Number(document.getElementById('admin-new-stock-price')?.value);
      const title = document.getElementById('admin-stock-news-title')?.value || '';

      API.showLoading('주식 설정 저장 중...');
      const res = await API.call('updateStockSettings', { mode: mode, codes: codes, customPrice: price });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '주식 설정이 성공적으로 저장되었습니다!');
    },

    activeMultiStockCode: '005930',
    multiStockCache: [],
    multiStockHoldings: {},
    fetchLiveStockClient: async (code) => {
      if (code === 'CLASS') return;
      try {
        const yfSuffix = code === '086520' ? '.KQ' : '.KS';
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}${yfSuffix}?interval=1d`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.chart && data.chart.result && data.chart.result[0]) {
            const meta = data.chart.result[0].meta;
            const price = Number(meta.regularMarketPrice);
            const prev = Number(meta.previousClose || meta.chartPreviousClose || price);
            const diff = price - prev;
            const rate = ((diff / prev) * 100).toFixed(2);
            const isUp = diff >= 0;

            const existing = ModalManager.multiStockCache.find(s => s.code === code);
            if (existing) {
              existing.price = price;
              existing.changeRate = (isUp ? '+' : '') + rate + '%';
              existing.changePrice = (isUp ? '+' : '') + Math.round(diff).toLocaleString();
            }
            ModalManager.updateMultiStockUI();
          }
        }
      } catch (err) {
        console.warn('[Client live stock fetch error]', err);
      }
    },
    switchStockCode: (code) => {
      ModalManager.activeMultiStockCode = code;
      document.querySelectorAll('.stock-code-tab').forEach(b => b.classList.remove('active'));
      const activeTab = document.getElementById(`stock-tab-${code}`);
      if (activeTab) activeTab.classList.add('active');
      ModalManager.updateMultiStockUI();
      ModalManager.fetchLiveStockClient(code);
      SoundEngine.click();
    },
    updateMultiStockUI: () => {
      const code = ModalManager.activeMultiStockCode || '005930';
      const stocks = ModalManager.multiStockCache || [];
      const curStock = stocks.find(s => s.code === code) || stocks[0] || { name: '삼성전자', code: '005930', price: 0, changeRate: '...' };
      const holdings = ModalManager.multiStockHoldings || {};
      const myQty = holdings[code] || holdings[curStock.name] || 0;

      const nameEl = document.getElementById('stock-active-name');
      const priceEl = document.getElementById('stock-active-price');
      const rateEl = document.getElementById('stock-active-rate');
      const holdEl = document.getElementById('stock-active-holdings');
      const evalEl = document.getElementById('stock-active-eval');

      if (nameEl) nameEl.textContent = `${curStock.icon || '📈'} ${curStock.name} (${curStock.code})`;
      if (priceEl) {
        if (!curStock.price || curStock.price === 0) {
          priceEl.textContent = '실시간 시세 조회 중...';
          priceEl.style.color = '#64748b';
        } else {
          priceEl.textContent = `${curStock.price.toLocaleString()}원`;
          const isUp = (curStock.changeRate || '').includes('+');
          priceEl.style.color = isUp ? '#ef4444' : '#3b82f6';
        }
      }
      if (rateEl) {
        const isUp = (curStock.changeRate || '').includes('+');
        rateEl.textContent = curStock.changeRate || '0.00%';
        rateEl.style.color = isUp ? '#ef4444' : '#3b82f6';
      }
      if (holdEl) holdEl.textContent = `${myQty.toLocaleString()}주`;
      if (evalEl) evalEl.textContent = `${(myQty * (curStock.price || 0)).toLocaleString()}원`;

      const cvs = document.getElementById('stock-chart-canvas');
      if (cvs && curStock.price && curStock.price > 0) {
        const ctx = cvs.getContext('2d');
        const W = cvs.width, H = cvs.height, padding = 25;
        const p = curStock.price;
        const hist = [p * 0.97, p * 0.99, p * 0.98, p * 1.01, p * 0.995, p];
        const max = Math.max(...hist) * 1.02, min = Math.min(...hist) * 0.98, range = Math.max(1, max - min);
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = (curStock.changeRate || '').includes('+') ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        hist.forEach((val, idx) => {
          const x = padding + (idx / (hist.length - 1)) * (W - padding * 2);
          const y = H - padding - ((val - min) / range) * (H - padding * 2);
          if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      const pTbody = document.getElementById('multi-stock-portfolio-tbody');
      if (pTbody) {
        pTbody.innerHTML = stocks.map(s => {
          const q = holdings[s.code] || holdings[s.name] || 0;
          return `
            <tr style="${s.code === code ? 'background:#f0fdf4;' : ''}">
              <td><strong>${s.icon || '📈'} ${s.name}</strong></td>
              <td>${(s.price || 0).toLocaleString()}원 <span style="color:${(s.changeRate||'').includes('+')?'#ef4444':'#3b82f6'}; font-size:11px;">(${s.changeRate||'0%'})</span></td>
              <td><strong>${q.toLocaleString()}주</strong></td>
              <td>${(q * (s.price || 0)).toLocaleString()}원</td>
            </tr>
          `;
        }).join('');
      }
    },

    handleTradeMultiStock: async (type) => {
      const code = ModalManager.activeMultiStockCode || '005930';
      const qtyInput = document.getElementById(type === '매수' ? 'multi-stock-buy-qty' : 'multi-stock-sell-qty');
      const qty = parseInt(qtyInput?.value, 10);
      if (!qty || qty <= 0) return alert('올바른 수량을 입력하세요.');

      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading(`네이버 증시 ${type} 주문 체결 중...`);
      const res = await API.call('tradeMultiStock', { name: myName, code: code, qty: qty, type: type });
      API.hideLoading();

      if (res && res.success) {
        if (res.student) {
          GameState.student = res.student;
          const cashEl = document.getElementById('hud-cash-val');
          const stockEl = document.getElementById('hud-stock-val');
          const curC = res.student.cash ?? res.student.현금 ?? 0;
          const curS = res.student.stock ?? res.student.주식 ?? 0;
          if (cashEl) cashEl.textContent = `${curC.toLocaleString()}원`;
          if (stockEl) stockEl.textContent = `${curS.toLocaleString()}원`;
        }
        SoundEngine.fanfare();
        alert(res.msg);
        open('stock');
      } else {
        alert(res?.msg || '주문 실패');
      }
    },

    // ─── 복권 ───
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

      if (scrRes?.prize > 0) SoundEngine.fanfare();
      else SoundEngine.snap();
    },

    // ─── 감정신호등 ───
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

      const bonus = emotion.includes('힘듦') ? 1000 : (emotion.includes('보통') ? 300 : 500);
      if (st) st.cash = (st.cash || 0) + bonus;
      const cashEl = document.getElementById('hud-cash-val');
      if (cashEl && st) cashEl.textContent = `${st.cash.toLocaleString()}원`;

      SoundEngine.fanfare();
      alert(res?.msg || `오늘의 기분 [${emotion}] 등록 완료! +${bonus.toLocaleString()}원 장학금이 지급되었습니다!`);
      open('counseling');
    },

    // ─── 관리자 권한 저장 / 벌금 / 경고 / 월급배부 ───
    handleSavePermission: async (targetStudent) => {
      const chks = document.querySelectorAll(`.perm-chk-${targetStudent}:checked`);
      const perms = Array.from(chks).map(c => c.value).join(',');
      API.showLoading('권한을 저장하는 중...');
      const res = await API.call('setStudentPermission', { targetStudent: targetStudent, permission: perms || '일반' });
      API.hideLoading();
      SoundEngine.coin();
      alert(res?.msg || '권한 저장 완료');
    },

    openPaySalariesModal: () => {
      if (!confirm('모든 학생에게 월급을 일괄 배부하시겠습니까?')) return;
      API.showLoading('월급을 배부하는 중...');
      API.call('payAllSalaries', {}).then(res => {
        API.hideLoading();
        SoundEngine.fanfare();
        alert(res?.msg || '월급 배부 완료');
        open('principal');
      });
    },

    openFineModal: () => {
      const students = GameState.rankingList?.filter(s => s.name !== '선생님') || [];
      const opts = students.map(s => `<option value="${s.name}">${s.name} (${s.job || '학생'})</option>`).join('');
      const html = `
        <div style="padding:10px;">
          <h3>⚖️ 학생 벌금 징수 (국고 귀속)</h3>
          <div class="form-group" style="margin:12px 0;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">대상 학생 선택</label>
            <select id="fine-target-select" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">${opts}</select>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">징수 금액(원)</label>
            <input type="number" id="fine-amount-input" placeholder="예: 500" value="500" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
          </div>
          <div class="form-group" style="margin-bottom:14px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">징수 사유</label>
            <input type="text" id="fine-reason-input" placeholder="예: 숙제 미제출, 지각 등" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">
          </div>
          <button class="pixel-btn-primary" style="background:#dc2626;" onclick="ModalManager.executeFine()">벌금 징수 집행</button>
        </div>
      `;
      bodyEl.innerHTML = html;
    },

    executeFine: async () => {
      const target = document.getElementById('fine-target-select')?.value;
      const amt = Number(document.getElementById('fine-amount-input')?.value);
      const reason = document.getElementById('fine-reason-input')?.value || '학급 규칙 위반';
      if (!target || !amt) return alert('모든 항목을 입력하세요.');

      API.showLoading('벌금 징수 중...');
      const res = await API.call('executeFine', { targetStudent: target, amount: amt, reason: reason });
      API.hideLoading();
      SoundEngine.snap();
      alert(res?.msg || '벌금 징수 완료');
      open('principal');
    },

    openWarnModal: () => {
      const students = GameState.rankingList?.filter(s => s.name !== '선생님') || [];
      const opts = students.map(s => `<option value="${s.name}">${s.name} (${s.job || '학생'})</option>`).join('');
      const html = `
        <div style="padding:10px;">
          <h3>⚠️ 학생 경고장 발송</h3>
          <div class="form-group" style="margin:12px 0;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">대상 학생 선택</label>
            <select id="warn-target-select" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px;">${opts}</select>
          </div>
          <div class="form-group" style="margin-bottom:14px;">
            <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">경고 사유</label>
            <textarea id="warn-reason-input" placeholder="학생에게 보낼 경고 메시지" style="width:100%; height:80px; padding:8px; border:2px solid #94a3b8; border-radius:6px;"></textarea>
          </div>
          <button class="pixel-btn-primary" style="background:#ea580c;" onclick="ModalManager.executeWarn()">경고장 발송</button>
        </div>
      `;
      bodyEl.innerHTML = html;
    },

    executeWarn: async () => {
      const target = document.getElementById('warn-target-select')?.value;
      const reason = document.getElementById('warn-reason-input')?.value;
      if (!target || !reason) return alert('모든 항목을 입력하세요.');

      API.showLoading('경고장 발송 중...');
      const res = await API.call('sendWarning', { targetStudent: target, reason: reason });
      API.hideLoading();
      SoundEngine.snap();
      alert(res?.msg || '경고장 발송 완료');
      open('principal');
    },

    adminInitSheets: async () => {
      if (!confirm('정말로 구글 시트의 12개 시트를 초기화하시겠습니까?\n기본 시트 구조와 파라미터가 재생성됩니다.')) return;
      API.showLoading('시트 전체 자동 초기화 중...');
      const res = await API.call('initAllSheets', {});
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || '초기화 완료');
    },

    loadAdminItems: async () => {
      const tbody = document.getElementById('admin-items-editor-tbody');
      if (!tbody) return;
      const res = await API.call('getAdminItemsList', {}, true);
      const items = res?.items || [];
      tbody.innerHTML = items.map(it => `
        <tr>
          <td><span class="badge badge-primary">${it.카테고리 || '아이템'}</span></td>
          <td><strong>${it.아이템명 || it.이름 || '-'}</strong></td>
          <td>${(Number(it.금액 || it.가격 || 0)).toLocaleString()}원</td>
          <td>${it.수량 || it.재고 || 0}개</td>
          <td>
            <button class="pixel-btn-sm" onclick="ModalManager.editItemPriceAndStock('${it.아이템명 || it.이름}', ${it.금액 || it.가격 || 0}, ${it.수량 || it.재고 || 0})">수정</button>
          </td>
        </tr>
      `).join('');
    },

    editItemPriceAndStock: async (itemName, curPrice, curStock) => {
      const newPrice = prompt(`[${itemName}] 새 판매 가격(원):`, curPrice);
      if (newPrice === null) return;
      const newStock = prompt(`[${itemName}] 새 재고 수량(개):`, curStock);
      if (newStock === null) return;

      API.showLoading('아이템 정보 수정 중...');
      const res = await API.call('updateItemPriceAndStock', { itemName, price: Number(newPrice), stock: Number(newStock) });
      API.hideLoading();
      SoundEngine.coin();
      alert(res?.msg || '수정 완료');
      ModalManager.loadAdminItems();
    },

    handleDeposit: async () => {
      const input = document.getElementById('deposit-amount-input');
      const amt = Number(input?.value);
      if (!amt || amt < 1000) return alert('예금 최소 금액은 1,000원입니다.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('예금 계좌 개설 중...');
      const res = await API.call('deposit', { name: myName, amount: amt });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert('정기예금에 성공적으로 가입되었습니다!');
        open('bank');
      } else {
        alert(res?.msg || '예금 가입 실패');
      }
    },

    handleWithdraw: async (index) => {
      if (!confirm('정기예금을 만기 해지하여 원금과 이자를 수령하시겠습니까?')) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('예금 해지 및 정산 중...');
      const res = await API.call('withdraw', { name: myName, index: index });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`예금 만기 해지 완료! 원금과 이자(${res.amount?.toLocaleString()}원)가 지급되었습니다.`);
        open('bank');
      } else {
        alert(res?.msg || '해지 실패');
      }
    },

    handleTransfer: async () => {
      const target = document.getElementById('transfer-target')?.value;
      const amt = Number(document.getElementById('transfer-amount')?.value);
      if (!target || !amt || amt <= 0) return alert('받는 친구 이름과 올바른 송금 금액을 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('용돈 송금 중...');
      const res = await API.call('transfer', { sender: myName, receiver: target, amount: amt });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`[${target}] 친구에게 ${amt.toLocaleString()}원을 송금했습니다!`);
        open('postoffice');
      } else {
        alert(res?.msg || '송금 실패');
      }
    },

    sendPraise: async () => {
      const target = document.getElementById('praise-target')?.value;
      const msg = document.getElementById('praise-msg')?.value;
      const bonus = Number(document.getElementById('praise-bonus')?.value || 500);
      if (!target || !msg) return alert('칭찬할 친구 이름과 메시지를 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('칭찬카드 발송 중...');
      const res = await API.call('sendPraise', { sender: myName, receiver: target, message: msg, bonus: bonus });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`[${target}] 친구에게 따뜻한 칭찬카드와 보너스를 보냈습니다!`);
        open('postoffice');
      } else {
        alert(res?.msg || '칭찬카드 발송 실패');
      }
    },

    buyMartItem: async (itemName, amount) => {
      if (!confirm(`[${itemName}]을(를) ${amount.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('마트 바코드 결제 중...');
      const res = await API.call('martPay', { buyerName: myName, itemName: itemName, amount: amount });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`🛒 [${itemName}] 구매 영수증이 발행되었습니다! (금액: ${amount.toLocaleString()}원)`);
        open('mart');
      } else {
        alert(res?.msg || '구매 실패');
      }
    },

    openAddMartItemModal: () => {
      const name = prompt('등록할 마트 물품명:');
      if (!name) return;
      const price = Number(prompt('판매 가격(원):', '1000'));
      if (isNaN(price)) return;
      const stock = Number(prompt('입고 수량(개):', '20'));
      if (isNaN(stock)) return;

      API.showLoading('마트 물품 등록 중...');
      API.call('updateMartItem', { itemName: name, price: price, stock: stock, status: '판매중' }).then(res => {
        API.hideLoading();
        SoundEngine.fanfare();
        alert(res?.msg || '물품 등록 완료');
        open('mart');
      });
    },

    editMartItem: (name, curPrice, curStock) => {
      const price = Number(prompt(`[${name}] 변경할 가격(원):`, curPrice));
      if (isNaN(price)) return;
      const stock = Number(prompt(`[${name}] 변경할 재고 수량:`, curStock));
      if (isNaN(stock)) return;

      API.showLoading('물품 정보 수정 중...');
      API.call('updateMartItem', { itemName: name, price: price, stock: stock, status: '판매중' }).then(res => {
        API.hideLoading();
        SoundEngine.coin();
        alert(res?.msg || '수정 완료');
        open('mart');
      });
    },

    openNoticeWriteModal: () => {
      const title = prompt('새 공지사항 제목:');
      if (!title) return;
      const content = prompt('공지 내용:');
      if (!content) return;
      const urgent = confirm('긴급 공지로 등록하시겠습니까?');

      API.showLoading('공지 등록 중...');
      API.call('writeNotice', { title: title, content: content, urgent: urgent }).then(res => {
        API.hideLoading();
        SoundEngine.fanfare();
        alert(res?.msg || '공지사항이 등록되었습니다.');
        open('school');
      });
    },

    applyJob: async (jobTitle) => {
      if (!confirm(`[${jobTitle}] 직업에 지원하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('구직 신청서 제출 중...');
      const res = await API.call('applyJob', { name: myName, jobTitle: jobTitle });
      API.hideLoading();
      SoundEngine.fanfare();
      alert(res?.msg || `[${jobTitle}] 직업 신청이 완료되었습니다.`);
    },

    buySeatModal: async (seatId, price, curOwner) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';
      if (curOwner === myName) return alert('이미 내가 보유한 교실 좌석입니다.');

      if (!confirm(`[${seatId}] 좌석을 ${price.toLocaleString()}원에 매입하시겠습니까?`)) return;
      API.showLoading('좌석 매입 중...');
      const res = await API.call('buySeat', { buyerName: myName, seatId: seatId, price: price });
      API.hideLoading();
      if (res && res.success) {
        SoundEngine.fanfare();
        alert(`[${seatId}] 좌석을 성공적으로 매입했습니다!`);
        open('realestate');
      } else {
        alert(res?.msg || '매입 실패');
      }
    }
  };
})();
