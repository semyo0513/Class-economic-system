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
          <div class="stock-panel" style="display:flex; flex-direction:column; gap:8px; max-width:100%; overflow:hidden;">
            <!-- 상단 요약 바 -->
            <div style="background:#f0fdf4; border:2px solid #86efac; padding:6px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <div style="font-size:13px; font-weight:bold; color:#166534;">
                📈 실시간 증권 거래소 <span style="font-size:11px; color:#15803d; font-weight:normal;" id="stock-mode-badge">(실시간 연동)</span>
              </div>
              <div style="font-size:12px; color:#166534;">
                💰 현금: <strong id="stock-my-cash-val" style="color:#15803d; font-size:13px;">${myCash.toLocaleString()}원</strong>
              </div>
            </div>

            <!-- 종목 선택 탭 -->
            <div class="stock-tabs" id="stock-tab-buttons-wrap" style="display:flex; gap:4px; flex-wrap:wrap; justify-content:flex-start;">
              ${stockList.map(s => `
                <button class="tab-btn stock-code-tab ${s.code === '005930' ? 'active' : ''}" id="stock-tab-${s.code}" onclick="ModalManager.switchStockCode('${s.code}')" style="padding:4px 8px; font-size:11px;">
                  ${s.icon} ${s.name}
                </button>
              `).join('')}
            </div>

            <!-- 메인 시세 및 매매 2열 그리드 -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:8px;">
              <!-- 좌측: 현재가 헤더 & 미니 차트 -->
              <div style="background:#ffffff; border:2px solid #cbd5e1; border-radius:8px; padding:8px 10px; display:flex; flex-direction:column; justify-content:space-between;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <div style="font-size:12px; color:#64748b; font-weight:bold;" id="stock-active-name">📱 삼성전자 (005930)</div>
                    <div style="display:flex; align-items:baseline; gap:6px; margin-top:2px;">
                      <div style="font-size:20px; font-weight:900; color:#ef4444;" id="stock-active-price">시세 조회 중...</div>
                      <div style="font-size:12px; font-weight:bold; color:#ef4444;" id="stock-active-rate">...</div>
                    </div>
                  </div>
                  <div style="text-align:right; font-size:11px; color:#475569;">
                    <div>보유: <strong id="stock-active-holdings" style="color:#0f172a; font-size:12px;">0주</strong></div>
                    <div>평가액: <strong id="stock-active-eval" style="color:#2563eb; font-size:12px;">0원</strong></div>
                  </div>
                </div>
                <!-- 캔버스 차트 -->
                <div style="margin-top:6px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; height:80px; overflow:hidden;">
                  <canvas id="stock-chart-canvas" width="360" height="80" style="width:100%; height:80px; display:block;"></canvas>
                </div>
              </div>

              <!-- 우측: 매수 & 매도 컨트롤 박스 -->
              <div style="display:flex; flex-direction:column; gap:6px;">
                <div style="background:#fef2f2; border:2px solid #fca5a5; padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:6px;">
                  <span style="color:#991b1b; font-weight:bold; font-size:12px; white-space:nowrap;">🔴 매수</span>
                  <input type="number" id="multi-stock-buy-qty" placeholder="수량" min="1" value="1" style="width:70px; padding:4px 6px; border:1px solid #f87171; border-radius:4px; font-size:12px; text-align:center;">
                  <button class="pixel-btn-primary" style="width:auto; padding:4px 12px; font-size:11px; background:#dc2626;" onclick="ModalManager.handleTradeMultiStock('매수')">사기</button>
                </div>

                <div style="background:#eff6ff; border:2px solid #bfdbfe; padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:6px;">
                  <span style="color:#1e40af; font-weight:bold; font-size:12px; white-space:nowrap;">🔵 매도</span>
                  <input type="number" id="multi-stock-sell-qty" placeholder="수량" min="1" value="1" style="width:70px; padding:4px 6px; border:1px solid #60a5fa; border-radius:4px; font-size:12px; text-align:center;">
                  <button class="pixel-btn-secondary" style="width:auto; padding:4px 12px; font-size:11px; background:#2563eb;" onclick="ModalManager.handleTradeMultiStock('매도')">팔기</button>
                </div>
              </div>
            </div>

            <!-- 하단: 내 주식 보유 포트폴리오 (슬림 테이블) -->
            <div style="background:#ffffff; border:2px solid #cbd5e1; border-radius:8px; padding:6px 10px;">
              <div style="font-size:11px; font-weight:bold; color:#475569; margin-bottom:4px;">📊 나의 주식 보유 현황</div>
              <div class="table-wrap" style="max-height:110px; overflow-y:auto;">
                <table class="pixel-table" style="font-size:11px;">
                  <thead><tr><th>종목명</th><th>현재가</th><th>보유수량</th><th>평단가</th><th>수익률</th><th>총평가액</th></tr></thead>
                  <tbody id="multi-stock-portfolio-tbody">
                    <tr><td colspan="6" style="text-align:center; padding:6px;">포트폴리오 조회 중...</td></tr>
                  </tbody>
                </table>
              </div>
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
            ModalManager.multiStockAvgPrices = data.avgPrices || {};
            ModalManager.multiStockProfitLosses = data.profitLosses || {};
            ModalManager.multiStockProfitRates = data.profitRates || {};
            
            // 로컬스토리지에 평단가 캐싱
            try {
              localStorage.setItem(`classbank_stock_avg_${me}`, JSON.stringify(ModalManager.multiStockAvgPrices));
            } catch (_) {}

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

        const mounts = [
          { id: 'mount_kickboard', name: '🛴 스피드 킥보드', price: 10000, desc: '이동속도 1.5배 증가 버프', speed: 1.5, emoji: '🛴' },
          { id: 'mount_skateboard', name: '🛹 스트리트 스케이트보드', price: 15000, desc: '이동속도 1.7배 증가 버프', speed: 1.7, emoji: '🛹' },
          { id: 'mount_bicycle', name: '🚲 클래식 꼬마 자전거', price: 20000, desc: '이동속도 1.8배 증가 버프', speed: 1.8, emoji: '🚲' },
          { id: 'mount_cart', name: '🏎️ 미니 붕붕 레이싱카트', price: 30000, desc: '이동속도 2.0배 폭풍 질주', speed: 2.0, emoji: '🏎️' },
          { id: 'mount_cloud', name: '☁️ 둥실둥실 마법구름', price: 50000, desc: '이동속도 2.2배 구름 비행', speed: 2.2, emoji: '☁️' }
        ];

        const perfumes = [
          { id: 'perfume_rose', name: '🌹 로즈 퍼퓸', price: 6000, desc: '장미 꽃잎 파티클 이펙트', emoji: '🌹' },
          { id: 'perfume_sparkle', name: '✨ 스타더스트 퍼퓸', price: 7000, desc: '반짝이는 별가루 파티클', emoji: '✨' },
          { id: 'perfume_bubble', name: '🫧 무지개 방울 퍼퓸', price: 6500, desc: '방울방울 비누방울 이펙트', emoji: '🫧' },
          { id: 'potion_giant', name: '🍄 거인 성장 물약', price: 8000, desc: '캐릭터 1.3배 거대화 효과', emoji: '🍄' },
          { id: 'potion_tiny', name: '🧪 요정 축소 물약', price: 8000, desc: '캐릭터 0.7배 미니멀 효과', emoji: '🧪' }
        ];

        container.innerHTML = `
          <div class="shop-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            <button class="tab-btn active" onclick="ModalManager.switchShopTab('furn')">🛋️ 미니룸 가구</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('mount')">🚀 탈 것 (속도증가)</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('perfume')">🌺 퍼퓸 & 물약</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('hair')">💇‍♀️ 헤어 염색</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('costume')">👗 패션 코스튬</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('hat')">👑 모자/머리띠</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('aura')">✨ 특수 오라</button>
          </div>

          <!-- 1. 미니룸 가구 & 소품 탭 -->
          <div id="shop-tab-furn" class="shop-grid">
            ${furns.map(f => `
              <div class="shop-item-card" style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:8px;">
                <div class="item-emoji" style="height:48px; display:flex; align-items:center; justify-content:center;">
                  ${f.image ? `<img src="${f.image}" style="max-height:46px; max-width:46px; object-fit:contain;">` : `<span style="font-size:32px;">${f.emoji}</span>`}
                </div>
                <div class="item-name" style="font-size:11px; font-weight:bold; margin-top:4px; text-align:center; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</div>
                <div style="font-size:9px; color:#64748b; margin-bottom:4px; text-align:center;">${f.desc || ''}</div>
                <div class="item-price" style="font-size:11px; font-weight:bold; color:#b45309; margin-bottom:6px;">💰 ${f.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" style="padding:4px 8px; font-size:11px;" onclick="ModalManager.buyFurniture('${f.id}', ${f.price}, '${f.name}')">구매하기</button>
              </div>
            `).join('')}
          </div>

          <!-- 1-1. 🚀 탈 것 (속도 버프) 탭 -->
          <div id="shop-tab-mount" class="shop-grid" style="display:none;">
            ${mounts.map(m => `
              <div class="shop-item-card" style="border-color:#38bdf8;">
                <div style="font-size:36px; margin-bottom:4px;">${m.emoji}</div>
                <div class="item-name">${m.name}</div>
                <div class="item-desc" style="color:#0369a1; font-weight:bold;">${m.desc}</div>
                <div class="item-price">💰 ${m.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" style="background:#0284c7;" onclick="ModalManager.buyMount('${m.id}', ${m.price}, '${m.name}', ${m.speed})">구매하기</button>
              </div>
            `).join('')}
          </div>

          <!-- 1-2. 🌺 퍼퓸 & 크기 물약 탭 -->
          <div id="shop-tab-perfume" class="shop-grid" style="display:none;">
            ${perfumes.map(p => `
              <div class="shop-item-card" style="border-color:#f472b6;">
                <div style="font-size:36px; margin-bottom:4px;">${p.emoji}</div>
                <div class="item-name">${p.name}</div>
                <div class="item-desc" style="color:#be185d;">${p.desc}</div>
                <div class="item-price">💰 ${p.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" style="background:#db2777;" onclick="ModalManager.buyPerfume('${p.id}', ${p.price}, '${p.name}')">구매하기</button>
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
                <button class="pixel-btn-primary" style="background:${h.color}; color:#fff;" onclick="ModalManager.buyHairDye('${h.id}', '${h.color}', ${h.price}, '${h.name}')">구매하기</button>
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
                <button class="pixel-btn-primary" onclick="ModalManager.buyCostume('${c.id}', ${c.price}, '${c.name}')">구매하기</button>
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
                <button class="pixel-btn-primary" onclick="ModalManager.buyHat('${h.id}', ${h.price}, '${h.name}')">구매하기</button>
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
                <button class="pixel-btn-primary" onclick="ModalManager.buyAura('${a.id}', ${a.price}, '${a.name}')">구매하기</button>
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

      // 6. 복권방 (리얼 인터랙티브 캔버스 스크래치 복권)
      case 'lottery': {
        container.innerHTML = `
          <div class="lottery-panel" style="text-align:center; padding:10px;">
            <div style="background:#fef3c7; border:2px solid #f59e0b; padding:12px; border-radius:10px; margin-bottom:14px;">
              <h3 style="color:#b45309; font-size:17px; margin-bottom:4px;">🎰 ${schoolName} 행운의 즉석 스크래치 복권</h3>
              <p style="font-size:12px; color:#92400e;">1장당 <strong>500원</strong> (국고 귀속) | 최고 <strong>50,000원</strong> 대박 행운! (4등 3,000원)</p>
            </div>

            <div id="lottery-game-area" style="text-align:center;">
              <!-- 1단계: 구매 전 안내 카드 -->
              <div id="lottery-before-buy" style="background:#fff; border:3px dashed #d97706; border-radius:12px; padding:24px; margin:0 auto 16px; max-width:340px;">
                <div style="font-size:48px; margin-bottom:8px;">🎟️</div>
                <div style="font-size:16px; font-weight:bold; color:#1e293b;">행운의 즉석 스크래치 복권</div>
                <div style="font-size:12px; color:#64748b; margin-top:4px;">구매 후 마우스나 손가락으로 직접 긁어보세요!</div>
                <button class="pixel-btn-primary" style="margin-top:16px; width:auto; padding:10px 24px; font-size:15px; background:#d97706;" onclick="ModalManager.buyScratchLottery()">
                  🎟️ 복권 1장 구매하기 (500원)
                </button>
              </div>

              <!-- 2단계: 스크래치 캔버스 스테이지 -->
              <div id="lottery-scratch-stage" style="display:none; position:relative; width:340px; height:180px; margin:0 auto 16px; border:3px solid #b45309; border-radius:12px; overflow:hidden; box-shadow:0 6px 0 #78350f;">
                <!-- 밑바닥 당첨 결과 레이어 -->
                <div id="lottery-result-underlay" style="position:absolute; inset:0; background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px;">
                  <div id="lottery-prize-icon" style="font-size:36px; margin-bottom:4px;">🎉</div>
                  <div id="lottery-prize-title" style="font-size:22px; font-weight:900; color:#ef4444;">1등 당첨!</div>
                  <div id="lottery-prize-msg" style="font-size:15px; font-weight:bold; color:#1e293b; margin-top:4px;">50,000원 획득!</div>
                </div>
                <!-- 윗면 스크래치 은박 코팅 캔버스 -->
                <canvas id="lottery-scratch-canvas" width="340" height="180" style="position:absolute; inset:0; cursor:pointer; touch-action:none;"></canvas>
              </div>

              <!-- 3단계: 긁기 완료 후 재도전 버튼 -->
              <div id="lottery-after-scratch" style="display:none;">
                <button class="pixel-btn-primary" style="width:auto; padding:10px 24px; font-size:15px; background:#d97706;" onclick="ModalManager.buyScratchLottery()">
                  🎟️ 한 장 더 구매하여 긁기 (500원)
                </button>
              </div>
            </div>
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

            <div id="emotion-selected-display" style="background:#f1f5f9; border:2px solid #94a3b8; padding:8px 12px; border-radius:8px; margin-bottom:12px; font-weight:bold; font-size:13px; color:#1e293b; text-align:center;">
              선택한 기분: <span id="emotion-selected-badge" style="color:#16a34a; font-size:14px;">🟢 기분 최고! (장학금 +500원)</span>
            </div>

            <div class="emotion-select-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:14px;">
              <button class="emotion-opt-btn active" id="btn-emotion-good" style="cursor:pointer; background:#dcfce7; border:4px solid #16a34a; padding:14px 8px; border-radius:12px; text-align:center; transform:scale(1.05); box-shadow:0 6px 12px rgba(22,163,74,0.3); transition:all 0.15s ease;" onclick="ModalManager.selectEmotion('🟢 좋음', '기분 최고!', 500, this)">
                <div style="font-size:32px;">🟢</div>
                <div style="font-weight:900; color:#15803d; font-size:14px; margin-top:4px;">기분 최고!</div>
                <div style="font-size:12px; font-weight:bold; color:#166534; margin-top:2px;">(+500원)</div>
                <div class="emotion-check-tag" style="margin-top:6px; font-size:11px; font-weight:bold; color:#15803d; background:#bbf7d0; border-radius:10px; padding:2px 6px;">선택됨 ✅</div>
              </button>
              <button class="emotion-opt-btn" id="btn-emotion-normal" style="cursor:pointer; background:#fef9c3; border:2px solid #eab308; padding:14px 8px; border-radius:12px; text-align:center; opacity:0.75; transition:all 0.15s ease;" onclick="ModalManager.selectEmotion('🟡 보통', '그냥 그래요', 300, this)">
                <div style="font-size:32px;">🟡</div>
                <div style="font-weight:900; color:#854d0e; font-size:14px; margin-top:4px;">그냥 그래요</div>
                <div style="font-size:12px; font-weight:bold; color:#854d0e; margin-top:2px;">(+300원)</div>
                <div class="emotion-check-tag" style="display:none; margin-top:6px; font-size:11px; font-weight:bold; color:#854d0e; background:#fef08a; border-radius:10px; padding:2px 6px;">선택됨 ✅</div>
              </button>
              <button class="emotion-opt-btn" id="btn-emotion-hard" style="cursor:pointer; background:#fee2e2; border:2px solid #ef4444; padding:14px 8px; border-radius:12px; text-align:center; opacity:0.75; transition:all 0.15s ease;" onclick="ModalManager.selectEmotion('🔴 힘듦', '힘들고 지쳐요', 1000, this)">
                <div style="font-size:32px;">🔴</div>
                <div style="font-weight:900; color:#991b1b; font-size:14px; margin-top:4px;">힘들고 지쳐요</div>
                <div style="font-size:12px; font-weight:bold; color:#991b1b; margin-top:2px;">(+1,000원)</div>
                <div class="emotion-check-tag" style="display:none; margin-top:6px; font-size:11px; font-weight:bold; color:#991b1b; background:#fecaca; border-radius:10px; padding:2px 6px;">선택됨 ✅</div>
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

      // 10. 부동산 중개소 (교실 좌석 매매 & 제안/협상)
      case 'realestate': {
        container.innerHTML = `
          <div class="realestate-panel">
            <div style="background:#fef3c7; border:2px solid #fcd34d; padding:10px 12px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="color:#92400e; font-size:14px; margin:0;">🏢 교실 좌석 부동산 배치도 (20석)</h3>
                <p style="font-size:11px; color:#b45309; margin:2px 0 0 0;">내 자리를 매물로 등록하거나, 원하는 좌석에 구매 제안을 보내보세요!</p>
              </div>
              <div style="font-size:11px; color:#78350f;">칠판 (앞쪽) ⬇️</div>
            </div>

            <!-- 교실 20개 좌석 2D 그리드 (4분단 x 5줄) -->
            <div class="seat-grid" id="seats-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:12px;">
              <div style="grid-column:span 4; text-align:center; padding:15px;">좌석 배치도를 불러오는 중...</div>
            </div>

            <div style="display:flex; justify-content:space-around; font-size:11px; color:#64748b; background:#f8fafc; padding:6px; border-radius:6px; border:1px solid #e2e8f0;">
              <span>🟩 내 좌석</span>
              <span>🟨 판매중 매물</span>
              <span>🟧 구매 제안중</span>
              <span>⬜ 일반 좌석</span>
            </div>
          </div>
        `;

        API.call('getSeatMap', { name: me }, true).then(res => {
          const seats = res.seats || [];
          const grid = document.getElementById('seats-grid');
          if (grid && seats.length > 0) {
            grid.innerHTML = seats.map(s => {
              const seatNum = Number(s.좌석번호 || s.id || 0);
              const owner = String(s.소유자 || s.owner || '빈자리').trim();
              const isMy = owner === me;
              const isSale = (s.매물등록 || s.isForSale) === '판매중';
              const price = Number(s.희망가격 || s.price || 10000);
              const proposer = String(s.제안자 || '').trim();
              const offerPrice = Number(s.제안금액 || 0);
              const hasOffer = !!proposer && offerPrice > 0;

              let bgColor = '#ffffff';
              let borderColor = '#cbd5e1';
              if (isMy) { bgColor = '#dcfce7'; borderColor = '#22c55e'; }
              else if (hasOffer) { bgColor = '#ffedd5'; borderColor = '#ea580c'; }
              else if (isSale) { bgColor = '#fef9c3'; borderColor = '#eab308'; }

              return `
                <div class="seat-card" style="background:${bgColor}; border:2px solid ${borderColor}; border-radius:8px; padding:8px 6px; text-align:center; cursor:pointer; transition:transform 0.1s;" onclick="ModalManager.openSeatActionModal(${seatNum}, '${owner}', ${price}, '${proposer}', ${offerPrice})">
                  <div style="font-size:11px; font-weight:bold; color:#475569;">🪑 ${seatNum}번 자리</div>
                  <div style="font-size:12px; font-weight:bold; color:#0f172a; margin:3px 0;">${owner}</div>
                  <div style="font-size:10px; color:${isSale ? '#dc2626' : '#2563eb'}; font-weight:bold;">
                    ${isSale ? `🏷️ ${price.toLocaleString()}원` : `${price.toLocaleString()}원`}
                  </div>
                  ${hasOffer && isMy ? '<div style="font-size:9px; background:#ef4444; color:#fff; border-radius:4px; padding:1px 3px; margin-top:2px;">제안도착!</div>' : ''}
                </div>
              `;
            }).join('');
          }
        });
        break;
      }

      // 10-1. 놀이기구 탑승 모달
      case 'ride_modal': {
        const ride = data || { name: '놀이기구', emoji: '🎠' };
        container.innerHTML = `
          <div style="text-align:center; padding:16px;">
            <div style="font-size:56px; margin-bottom:10px; animation:bounce 1s infinite alternate;">${ride.emoji || '🎠'}</div>
            <h3 style="font-size:18px; color:#1e293b; margin-bottom:6px;">${ride.name}</h3>
            <p style="font-size:12px; color:#64748b; margin-bottom:16px;">신나게 탑승하여 친구들과 즐거운 추억을 만들고 스트레스를 풀어보세요!</p>
            <button class="pixel-btn-primary" style="width:auto; padding:10px 28px; font-size:15px; background:#0284c7;" onclick="ModalManager.enjoyRide('${ride.name}')">
              🎡 신나게 탑승하기!
            </button>
          </div>
        `;
        break;
      }

      // 10-2. NPC 인터랙티브 대화 모달
      case 'npc_modal': {
        const npc = data || { name: '주민', dialogs: ['반가워요!'] };
        const dialogList = npc.dialogs || [npc.dialog || '오늘도 활기찬 클래스타운에서 행복한 하루 보내세요!'];
        const currentLine = dialogList[Math.floor(Math.random() * dialogList.length)];
        
        let npcEmoji = '🐻';
        if (npc.type === 'rabbit') npcEmoji = '🐰';
        if (npc.type === 'cat') npcEmoji = '🐱';
        if (npc.type === 'panda') npcEmoji = '🐼';
        if (npc.type === 'fox') npcEmoji = '🦊';

        container.innerHTML = `
          <div style="padding:16px; text-align:center;">
            <div style="font-size:52px; margin-bottom:6px; animation:bounce 1.5s infinite alternate;">${npcEmoji}</div>
            <h3 style="font-size:17px; font-weight:bold; color:#1e293b; margin-bottom:4px;">${npc.name || '마을 주민'}</h3>
            <div style="font-size:11px; color:#64748b; margin-bottom:12px;">클래스타운 친절한 이웃 주민</div>

            <!-- 대화 말풍선 -->
            <div id="npc-dialog-box" style="background:#fffbeb; border:3px solid #fcd34d; border-radius:12px; padding:16px; font-size:14px; color:#1e293b; line-height:1.7; margin-bottom:16px; min-height:75px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:500;">
              "${currentLine}"
            </div>

            <!-- 인터랙티브 행동 버튼들 -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
              <button class="pixel-btn-primary" style="background:#3b82f6; font-size:12px; padding:8px 10px;" onclick="ModalManager.talkNextNpc('${npc.id}')">
                💬 다른 이야기 듣기
              </button>
              <button class="pixel-btn-primary" style="background:#10b981; font-size:12px; padding:8px 10px;" onclick="ModalManager.startNpcQuiz('${npc.type}')">
                💡 경제 상식 퀴즈 (장학금 1,000원)
              </button>
              <button class="pixel-btn-primary" style="background:#8b5cf6; font-size:12px; padding:8px 10px;" onclick="ModalManager.getNpcFortune('${npc.name}')">
                🍀 오늘의 행운 조언
              </button>
              <button class="pixel-btn-secondary" style="font-size:12px; padding:8px 10px;" onclick="ModalManager.close()">
                👋 인사하고 떠나기
              </button>
            </div>
          </div>
        `;
        break;
      }

      // 10-3. 환경 구조물 상호작용 모달 (분수대, 벤치, 가로등, 우체통, 모닥불, 텐트 등)
      case 'structure_modal': {
        const prop = data || { type: 'fountain', name: '구조물' };
        let contentHtml = '';

        if (prop.type === 'fountain') {
          contentHtml = `
            <div style="text-align:center; padding:16px;">
              <div style="font-size:56px; margin-bottom:8px; animation:bounce 1.5s infinite;">⛲</div>
              <h3 style="font-size:18px; color:#0284c7; margin-bottom:6px;">중앙 광장 대형 분수대</h3>
              <p style="font-size:12px; color:#64748b; margin-bottom:16px;">시원한 물줄기가 솟구치는 소원 분수대입니다. 동전을 던지고 소원을 빌어보세요!</p>
              <div style="background:#f0f9ff; border:2px solid #bae6fd; border-radius:10px; padding:12px; margin-bottom:16px; font-size:13px; color:#0369a1;">
                🪙 100원을 던져 행운의 소원을 빌면 좋은 일이 생길지도 몰라요!
              </div>
              <div style="display:flex; justify-content:center; gap:8px;">
                <button class="pixel-btn-primary" style="background:#0284c7; width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.tossFountainCoin()">
                  🪙 소원 동전 던지기 (100원)
                </button>
                <button class="pixel-btn-secondary" style="width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.close()">닫기</button>
              </div>
            </div>
          `;
        } else if (prop.type === 'bench') {
          contentHtml = `
            <div style="text-align:center; padding:16px;">
              <div style="font-size:56px; margin-bottom:8px;">🪑</div>
              <h3 style="font-size:18px; color:#b45309; margin-bottom:6px;">공원 휴식 벤치</h3>
              <p style="font-size:12px; color:#64748b; margin-bottom:16px;">푸른 나무 그늘 아래 놓인 안락한 벤치입니다.</p>
              <div style="background:#fffbeb; border:2px solid #fde68a; border-radius:10px; padding:14px; margin-bottom:16px; font-size:13px; color:#78350f; line-height:1.6;">
                "잠깐 쉬어가도 괜찮아. 오늘도 최선을 다한 너를 응원해 ☕"
              </div>
              <div style="display:flex; justify-content:center; gap:8px;">
                <button class="pixel-btn-primary" style="background:#d97706; width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.restOnBench()">
                  🧘‍♂️ 5초간 힐링 휴식하기 (+기분 회복)
                </button>
                <button class="pixel-btn-secondary" style="width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.close()">일어나기</button>
              </div>
            </div>
          `;
        } else if (prop.type === 'lamp') {
          contentHtml = `
            <div style="text-align:center; padding:16px;">
              <div style="font-size:56px; margin-bottom:8px;">💡</div>
              <h3 style="font-size:18px; color:#eab308; margin-bottom:6px;">클래스타운 감성 가로등</h3>
              <p style="font-size:12px; color:#64748b; margin-bottom:16px;">밤길을 따스하게 비춰주는 빈티지 조명입니다.</p>
              <button class="pixel-btn-primary" style="background:#eab308; width:auto; padding:10px 24px; font-size:13px;" onclick="ModalManager.toggleStreetLamp()">
                ✨ 가로등 스위치 켜기/끄기
              </button>
            </div>
          `;
        } else if (prop.type === 'mailbox') {
          contentHtml = `
            <div style="text-align:center; padding:16px;">
              <div style="font-size:56px; margin-bottom:8px;">📮</div>
              <h3 style="font-size:18px; color:#dc2626; margin-bottom:6px;">빨간 우체통</h3>
              <p style="font-size:12px; color:#64748b; margin-bottom:16px;">소중한 친구에게 따뜻한 칭찬 편지와 용돈을 부쳐보세요.</p>
              <div style="display:flex; justify-content:center; gap:8px;">
                <button class="pixel-btn-primary" style="background:#dc2626; width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.open('postoffice')">
                  💌 우체국 열기 & 편지 쓰기
                </button>
                <button class="pixel-btn-secondary" style="width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.close()">닫기</button>
              </div>
            </div>
          `;
        } else if (prop.type === 'campfire' || prop.type === 'camp_tent') {
          contentHtml = `
            <div style="text-align:center; padding:16px;">
              <div style="font-size:56px; margin-bottom:8px; animation:bounce 1s infinite;">🔥</div>
              <h3 style="font-size:18px; color:#ea580c; margin-bottom:6px;">숲속 캠프파이어 & 텐트</h3>
              <p style="font-size:12px; color:#64748b; margin-bottom:16px;">타닥타닥 타오르는 모닥불 앞에서 마시멜로를 구워보세요!</p>
              <div style="display:flex; justify-content:center; gap:8px;">
                <button class="pixel-btn-primary" style="background:#ea580c; width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.roastMarshmallow()">
                  🍡 마시멜로 노릇노릇 굽기
                </button>
                <button class="pixel-btn-secondary" style="width:auto; padding:10px 20px; font-size:13px;" onclick="ModalManager.close()">일어나기</button>
              </div>
            </div>
          `;
        }

        container.innerHTML = contentHtml;
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

      // 12. 우체국 (친구 송금 및 칭찬카드)
      case 'postoffice': {
        const students = (GameState.rankingList && GameState.rankingList.length > 0)
          ? GameState.rankingList
          : [{ name: '김현주' }, { name: '이하진' }, { name: '정수빈' }, { name: '서언' }, { name: '고설아' }];

        const optionsHtml = students
          .filter(s => s.name !== me)
          .map(s => `<option value="${s.name}">${s.name} (${s.job || '학생'})</option>`)
          .join('');

        container.innerHTML = `
          <div class="post-panel">
            <div style="background:#eff6ff; border:2px solid #93c5fd; padding:12px; border-radius:8px; margin-bottom:14px;">
              <h3 style="color:#1e40af; font-size:15px; margin:0 0 4px 0;">📮 친구에게 용돈 송금하기</h3>
              <p style="font-size:11px; color:#3b82f6; margin:0 0 10px 0;">목록에서 친구를 선택하고 안전하게 용돈을 이체해보세요.</p>
              <div class="input-group" style="display:flex; flex-direction:column; gap:8px;">
                <select id="transfer-target" style="width:100%; padding:9px; border:2px solid #94a3b8; border-radius:6px; font-weight:bold; font-size:13px; background:#fff;">
                  <option value="">-- 송금받을 친구 선택 --</option>
                  ${optionsHtml}
                </select>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="transfer-amount" placeholder="송금할 금액(원)" style="flex:1; padding:9px; border:2px solid #94a3b8; border-radius:6px; font-size:13px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:9px 20px; background:#0284c7;" onclick="ModalManager.handleTransfer()">💸 송금하기</button>
                </div>
              </div>
            </div>

            <div style="background:#fefce8; border:2px solid #fde047; padding:12px; border-radius:8px;">
              <h3 style="color:#854d0e; font-size:15px; margin:0 0 4px 0;">💌 칭찬 카드 보내기 (보너스 장학금 동봉)</h3>
              <p style="font-size:11px; color:#a16207; margin:0 0 10px 0;">따뜻한 칭찬 메시지와 함께 소정의 장학금을 선물하세요.</p>
              <div class="form-group" style="display:flex; flex-direction:column; gap:8px;">
                <select id="praise-target" style="width:100%; padding:9px; border:2px solid #94a3b8; border-radius:6px; font-weight:bold; font-size:13px; background:#fff;">
                  <option value="">-- 칭찬할 친구 선택 --</option>
                  ${optionsHtml}
                </select>
                <textarea id="praise-msg" placeholder="친구를 칭찬하는 따뜻한 메시지를 적어주세요. (예: 오늘 발표 정말 멋졌어!)" style="width:100%; height:60px; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;"></textarea>
                <div style="display:flex; gap:6px;">
                  <input type="number" id="praise-bonus" placeholder="동봉할 장학금(원)" value="500" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;">
                  <button class="pixel-btn-primary" style="width:auto; padding:8px 20px; background:#ca8a04;" onclick="ModalManager.sendPraise()">✨ 칭찬카드 발송</button>
                </div>
              </div>
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
            <!-- 상단 요약 바 -->
            <div class="admin-top-stats" style="display:flex; justify-content:space-between; align-items:center; background:#fee2e2; border:2px solid #fca5a5; padding:10px 14px; border-radius:8px; margin-bottom:12px;">
              <div>👥 총 등록 학생: <strong id="admin-student-count" style="color:#991b1b;">불러오는 중...</strong></div>
              <div>👑 관리 권한: <strong style="color:#991b1b;">${isTeacher ? '교사(전체 관리자)' : myPerm}</strong></div>
            </div>

            <!-- 4대 카테고리 탭 네비게이션 -->
            <div class="admin-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button class="tab-btn active" id="btn-adm-tab-students" onclick="ModalManager.switchAdminCategory('students')">👥 1. 학생/학급 관리</button>
              ${isTeacher || canMart ? '<button class="tab-btn" id="btn-adm-tab-items" onclick="ModalManager.switchAdminCategory(\'items\')">🏪 2. 상점/물품 관리</button>' : ''}
              ${isTeacher ? '<button class="tab-btn" id="btn-adm-tab-finance" onclick="ModalManager.switchAdminCategory(\'finance\')">📈 3. 금융/경제 설정</button>' : ''}
              ${isTeacher || canNotice ? '<button class="tab-btn" id="btn-adm-tab-system" onclick="ModalManager.switchAdminCategory(\'system\')">⚙️ 4. 시스템/공지 관리</button>' : ''}
            </div>

            <!-- ════════ 탭 1: 학생 및 학급 관리 ════════ -->
            <div id="admin-cat-students" class="admin-category-panel">
              <!-- 학급 운영 퀵 액션 카드 -->
              <div style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:8px; padding:10px; margin-bottom:12px;">
                <div style="font-weight:bold; font-size:12px; color:#334155; margin-bottom:6px;">⚡ 학급 운영 직무 집행</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  ${canPaySalary ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#0284c7;" onclick="ModalManager.openPaySalariesModal()">💰 월급 일괄 배부</button>' : ''}
                  ${canFine ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#dc2626;" onclick="ModalManager.openFineModal()">⚖️ 벌금 징수</button>' : ''}
                  ${canWarn ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#ea580c;" onclick="ModalManager.openWarnModal()">⚠️ 경고장 발송</button>' : ''}
                </div>
              </div>

              <!-- 학생 명렬 & 다기능 정렬 툴바 -->
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
                <span style="font-weight:bold; font-size:13px; color:#1e293b;">📋 학생 목록 및 자산 현황</span>
                <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; font-size:11px;">
                  <span style="color:#64748b;">정렬:</span>
                  <button class="pixel-btn-sm adm-sort-btn active" id="sort-btn-default" style="padding:3px 6px;" onclick="ModalManager.sortAdminStudentsList('default')">📑 시트 순서 (기본)</button>
                  <button class="pixel-btn-sm adm-sort-btn" id="sort-btn-totalAsset" style="padding:3px 6px;" onclick="ModalManager.sortAdminStudentsList('totalAsset')">💰 총자산 순</button>
                  <button class="pixel-btn-sm adm-sort-btn" id="sort-btn-cash" style="padding:3px 6px;" onclick="ModalManager.sortAdminStudentsList('cash')">💵 현금 순</button>
                  <button class="pixel-btn-sm adm-sort-btn" id="sort-btn-stock" style="padding:3px 6px;" onclick="ModalManager.sortAdminStudentsList('stock')">📈 주식 순</button>
                  <button class="pixel-btn-sm adm-sort-btn" id="sort-btn-name" style="padding:3px 6px;" onclick="ModalManager.sortAdminStudentsList('name')">🔤 이름 순</button>
                </div>
              </div>

              <div class="table-wrap" style="max-height:240px; overflow-y:auto; margin-bottom:14px;">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식수량</th><th>총자산</th><th>부여권한</th>${isTeacher ? '<th>교사조정</th>' : ''}</tr></thead>
                  <tbody id="admin-students-tbody">
                    <tr><td colspan="8" style="text-align:center; padding:15px;">전체 학생 목록을 불러오는 중...</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- 직무 권한 부여 섹션 -->
              ${isTeacher ? `
                <div style="background:#fef3c7; border:2px solid #f59e0b; border-radius:8px; padding:10px; margin-top:8px;">
                  <div style="font-weight:bold; font-size:13px; color:#92400e; margin-bottom:6px;">👑 학생 1인 1직무 권한 부여</div>
                  <div class="table-wrap" style="max-height:180px; overflow-y:auto;">
                    <table class="pixel-table">
                      <thead><tr><th>이름</th><th>직업</th><th>부여할 권한 선택</th><th>저장</th></tr></thead>
                      <tbody id="admin-perm-tbody">
                        <tr><td colspan="4" style="text-align:center; padding:10px;">학생 목록 로딩 중...</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- ════════ 탭 2: 상점 및 물품 관리 ════════ -->
            <div id="admin-cat-items" class="admin-category-panel" style="display:none;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="font-weight:bold; font-size:13px; color:#1e293b;">🛍️ 상점 물품 & 마트 관리</div>
                ${canMart ? '<button class="pixel-btn-primary" style="width:auto; padding:6px 12px; background:#7c3aed;" onclick="ModalManager.openAddMartItemModal()">🛒 마트 신규 물품 등록</button>' : ''}
              </div>

              ${isTeacher ? `
                <div style="background:#eff6ff; border:2px solid #93c5fd; padding:8px 12px; border-radius:8px; margin-bottom:10px; font-size:12px; color:#1e40af;">
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
              ` : ''}
            </div>

            <!-- ════════ 탭 3: 금융 및 경제 설정 ════════ -->
            <div id="admin-cat-finance" class="admin-category-panel" style="display:none;">
              <div style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:12px;">
                <div style="font-weight:bold; font-size:13px; margin-bottom:6px;">📈 주식 운영 모드 설정</div>
                <label style="margin-right:12px; font-size:12px;"><input type="radio" name="stock-mode-radio" value="REALTIME_NAVER" checked> 실시간 네이버 증권 (다종목)</label>
                <label style="font-size:12px;"><input type="radio" name="stock-mode-radio" value="MANUAL"> 교사 수동 조정 주식 (학급 자체 주가)</label>
              </div>

              <div class="form-group" style="margin-bottom:10px;">
                <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">활성화할 주식 종목 코드 (쉼표로 구분)</label>
                <input type="text" id="admin-stock-codes" value="005930,035720,035420,086520,005380,CLASS" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;">
                <div style="font-size:11px; color:#64748b; margin-top:2px;">(005930=삼성전자, 035720=카카오, 035420=NAVER, 086520=에코프로, CLASS=학급주식)</div>
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

            <!-- ════════ 탭 4: 시스템 및 공지 관리 ════════ -->
            <div id="admin-cat-system" class="admin-category-panel" style="display:none;">
              <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; border:2px solid #cbd5e1; padding:12px; border-radius:8px; margin-bottom:12px;">
                <div>
                  <div style="font-weight:bold; font-size:13px; color:#1e293b;">📢 학급 전체 공지사항</div>
                  <div style="font-size:11px; color:#64748b;">학생들에게 전달할 새 공지를 학교 본관에 등록합니다.</div>
                </div>
                ${canNotice ? '<button class="pixel-btn-primary" style="width:auto; padding:8px 14px; background:#16a34a;" onclick="ModalManager.openNoticeWriteModal()">✍️ 새 공지 작성</button>' : ''}
              </div>

              ${isTeacher ? `
                <div style="background:#fee2e2; border:2px solid #fca5a5; border-radius:8px; padding:14px; margin-top:14px; text-align:center;">
                  <div style="color:#991b1b; font-weight:bold; font-size:13px; margin-bottom:6px;">⚠️ 시트 전체 초기화 (교사 전용)</div>
                  <p style="color:#7f1d1d; font-size:11px; margin-bottom:10px;">구글 시트의 12개 시트 구조 및 기본 데이터를 완전하게 재생성합니다.</p>
                  <button class="pixel-btn-primary" style="background:#ef4444; border-color:#991b1b; width:auto; padding:8px 16px;" onclick="ModalManager.adminInitSheets()">🔄 12개 시스템 시트 자동 초기화</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        // 전체 학생 목록 실시간 로드 및 렌더링 (시트 순서 기본값 보존)
        API.call('getStudents', {}, true).then(res => {
          const students = res.students || [];
          ModalManager.adminStudentsCache = students;
          GameState.rankingList = students;

          const countEl = document.getElementById('admin-student-count');
          if (countEl) countEl.textContent = `${students.length}명`;

          ModalManager.renderAdminStudentsTable(students);

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
                <button class="pixel-btn-sm" style="padding:4px 8px; font-size:11px; ${disabled ? 'background:#cbd5e1; cursor:not-allowed;' : ''}" onclick="event.stopPropagation(); ${disabled ? `alert('${isPrincipalDisabled ? '교사 전용 공간입니다.' : '직무 권한이 필요합니다.'}')` : `ModalManager.open('${f.id}')`}">이동</button>
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
        const equips = inv.filter(it => ['캐릭터아이템', '의상', '모자', '오라', '헤어', '탈것', '퍼퓸'].includes(it.카테고리));
        const coupons = inv.filter(it => it.카테고리 === '아이템');
        const furns = inv.filter(it => it.카테고리 === '가구');

        const eqEl = document.getElementById('inven-tab-equips');
        if (eqEl) {
          eqEl.innerHTML = equips.length === 0 ? '<div style="padding:15px; text-align:center; color:#64748b;">보유 중인 패션/탈것 장착 아이템이 없습니다. 잡화점에서 원하는 아이템을 구매해보세요!</div>' : equips.map(e => {
            const isEquipped = e.상태 === '장착';
            return `
              <div class="shop-item-card" style="border:2px solid ${isEquipped ? '#86efac' : '#cbd5e1'}; background:${isEquipped ? '#f0fdf4' : '#ffffff'}; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div>
                  <div class="item-name" style="font-weight:bold; font-size:13px; color:#1e293b;">${e.아이템명}</div>
                  <div style="font-size:11px; color:#64748b; margin-top:2px;">[${e.카테고리}] ${isEquipped ? '<span style="color:#16a34a; font-weight:bold;">현재 장착 중</span>' : '보유 중'}</div>
                </div>
                <div>
                  ${isEquipped ? `
                    <button class="pixel-btn-sm" style="background:#fee2e2; color:#991b1b; border-color:#f87171;" onclick="ModalManager.toggleEquipItem('${e.아이템명}', '${e.카테고리}', '${e.속성 || ''}', '장착')">❌ 장착 해제</button>
                  ` : `
                    <button class="pixel-btn-sm" style="background:#22c55e; color:white;" onclick="ModalManager.toggleEquipItem('${e.아이템명}', '${e.카테고리}', '${e.속성 || ''}', '보유')">✨ 장착하기</button>
                  `}
                </div>
              </div>
            `;
          }).join('');
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
      const tabs = ['furn', 'mount', 'perfume', 'hair', 'costume', 'hat', 'aura'];
      tabs.forEach(t => {
        const el = document.getElementById(`shop-tab-${t}`);
        if (el) el.style.display = t === tab ? 'grid' : 'none';
      });
      document.querySelectorAll('.shop-tabs .tab-btn').forEach((b, i) => {
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

    // ─── 패션 살롱 & 아이템 구매 (인벤토리 보관 후 장착 원칙) ───
    buyHairDye: async (id, color, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?\n(구매 후 인벤토리에서 언제든 염색/장착 가능)`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('헤어 염색약 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '헤어', prop: color });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        SoundEngine.fanfare();
        alert(`🎁 [${name}] 구매 완료!\n아이템이 내 인벤토리(🎒)에 안전하게 보관되었습니다.\n인벤토리에서 언제든 장착할 수 있습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyCostume: async (id, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?\n(구매 후 인벤토리에서 언제든 착용 가능)`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const cType = id.replace('costume_', '');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('의상 코스튬 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '의상', prop: cType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        SoundEngine.fanfare();
        alert(`🎁 [${name}] 구매 완료!\n의상이 내 인벤토리(🎒)에 안전하게 보관되었습니다.\n인벤토리에서 착용할 수 있습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyHat: async (id, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?\n(구매 후 인벤토리에서 언제든 장착 가능)`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const hType = id.replace('hat_', '');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('액세서리 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '모자', prop: hType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        SoundEngine.fanfare();
        alert(`🎁 [${name}] 구매 완료!\n아이템이 내 인벤토리(🎒)에 보관되었습니다.\n인벤토리에서 언제든 장착할 수 있습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    buyAura: async (id, price, name) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?\n(구매 후 인벤토리에서 언제든 오라 발동 가능)`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const aType = id.replace('aura_', '');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('특수 오라 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '오라', prop: aType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        SoundEngine.fanfare();
        alert(`🎁 [${name}] 구매 완료!\n오라가 내 인벤토리(🎒)에 보관되었습니다.\n인벤토리에서 언제든 발동할 수 있습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    // 🚀 탈 것 구매 (인벤토리 보관 후 인벤토리에서 탑승)
    buyMount: async (id, price, name, speedMult) => {
      if (!confirm(`[${name}]을(를) ${price.toLocaleString()}원에 구매하시겠습니까?\n(이동속도 ${speedMult}배 / 구매 후 인벤토리에서 탑승 가능)`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const mType = id.replace('mount_', '');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('탈 것 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '탈것', prop: mType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        SoundEngine.fanfare();
        alert(`🎁 [${name}] 구매 완료!\n탈 것이 내 인벤토리(🎒)에 안전하게 보관되었습니다.\n인벤토리에서 언제든 탑승/해제할 수 있습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    // 🌺 퍼퓸 & 크기 물약 구매
    buyPerfume: async (id, price, name) => {
      if (!confirm(`[${name}] 효과를 ${price.toLocaleString()}원에 구매하시겠습니까?\n(구매 후 인벤토리에서 효과 적용 가능)`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');
      const pType = id.replace('perfume_', '').replace('potion_', '');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('물약/향수 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '퍼퓸', prop: pType });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        SoundEngine.fanfare();
        alert(`🎁 [${name}] 구매 완료!\n아이템이 내 인벤토리(🎒)에 안전하게 보관되었습니다.\n인벤토리에서 언제든 효과를 적용/해제할 수 있습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    // 🎡 놀이기구 탑승
    enjoyRide: (rideName) => {
      SoundEngine.fanfare();
      alert(`🎉 [${rideName}]에 신나게 탑승했습니다!\n스트레스가 해소되고 기분이 최고로 좋아졌습니다! ✨ (+행복도 100)`);
      ModalManager.close();
    },

    // 🏢 부동산 좌석 상호작용 모달
    openSeatActionModal: (seatNum, owner, price, proposer, offerPrice) => {
      const st = GameState.student;
      const me = st ? (st.name || st.이름) : '나';
      const isMy = owner === me;
      const hasOffer = !!proposer && offerPrice > 0;

      let html = `
        <div style="padding:16px; text-align:center;">
          <div style="font-size:48px; margin-bottom:8px;">🪑</div>
          <h3 style="font-size:18px; color:#1e293b; margin-bottom:4px;">교실 ${seatNum}번 좌석</h3>
          <p style="font-size:12px; color:#64748b; margin-bottom:14px;">현재 소유자: <strong>${owner}</strong> | 기준 가격: <strong>${price.toLocaleString()}원</strong></p>
      `;

      if (isMy) {
        if (hasOffer) {
          html += `
            <div style="background:#ffedd5; border:2px solid #ea580c; border-radius:8px; padding:12px; margin-bottom:14px; text-align:left;">
              <div style="font-weight:bold; color:#c2410c; margin-bottom:4px;">💬 구매 제안 도착!</div>
              <div style="font-size:12px; color:#9a3412;">제안자: <strong>${proposer}</strong></div>
              <div style="font-size:13px; font-weight:bold; color:#ea580c;">제안 금액: ${offerPrice.toLocaleString()}원</div>
            </div>
            <div style="display:flex; gap:6px; justify-content:center;">
              <button class="pixel-btn-primary" style="background:#16a34a;" onclick="ModalManager.handleRespondSeatOffer(${seatNum}, '수락')">🤝 제안 수락</button>
              <button class="pixel-btn-secondary" style="background:#dc2626; color:#fff;" onclick="ModalManager.handleRespondSeatOffer(${seatNum}, '거절')">❌ 거절</button>
              <button class="pixel-btn-secondary" style="background:#ca8a04; color:#fff;" onclick="ModalManager.handleCounterSeatOffer(${seatNum})">🔄 역제안(협상)</button>
            </div>
          `;
        } else {
          html += `
            <div style="background:#f0fdf4; border:2px solid #86efac; border-radius:8px; padding:12px; margin-bottom:14px;">
              <div style="font-weight:bold; color:#15803d; margin-bottom:6px;">내 소유 좌석입니다.</div>
              <p style="font-size:11px; color:#166534; margin-bottom:8px;">희망 가격을 정해 학급 부동산 매물로 등록할 수 있습니다.</p>
              <input type="number" id="seat-sale-price-input" placeholder="매물 희망 가격(원)" value="${price}" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:13px; margin-bottom:8px;">
              <button class="pixel-btn-primary" style="background:#0284c7;" onclick="ModalManager.handleRegisterSeatSale(${seatNum})">🏷️ 매물 등록하기</button>
            </div>
          `;
        }
      } else {
        html += `
          <div style="background:#eff6ff; border:2px solid #93c5fd; border-radius:8px; padding:12px; margin-bottom:14px;">
            <div style="font-weight:bold; color:#1e40af; margin-bottom:6px;">구매 제안하기</div>
            <p style="font-size:11px; color:#3b82f6; margin-bottom:8px;">소유자(${owner})에게 원하는 구매 희망 금액을 제안해보세요.</p>
            <input type="number" id="seat-offer-price-input" placeholder="구매 제안 금액(원)" value="${price}" style="width:100%; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:13px; margin-bottom:8px;">
            <button class="pixel-btn-primary" style="background:#2563eb;" onclick="ModalManager.handleOfferSeatBuy(${seatNum})">💬 구매 제안 발송</button>
          </div>
        `;
      }

      html += `
          <div style="margin-top:12px;">
            <button class="pixel-btn-secondary" style="width:auto; padding:6px 20px;" onclick="ModalManager.open('realestate')">⬅️ 좌석도 돌아가기</button>
          </div>
        </div>
      `;

      const modalBody = document.getElementById('modal-body');
      if (modalBody) modalBody.innerHTML = html;
      SoundEngine.open();
    },

    handleRegisterSeatSale: async (seatNum) => {
      const price = Number(document.getElementById('seat-sale-price-input')?.value || 0);
      if (!price || price <= 0) return alert('올바른 희망 가격을 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('매물 등록 중...');
      const res = await API.call('registerSeatSale', { name: myName, seatNum, price });
      API.hideLoading();

      if (res && res.success) {
        SoundEngine.fanfare();
        alert(res.msg || '매물 등록 완료!');
        ModalManager.open('realestate');
      } else {
        alert(res?.msg || '매물 등록 실패');
      }
    },

    handleOfferSeatBuy: async (seatNum) => {
      const price = Number(document.getElementById('seat-offer-price-input')?.value || 0);
      if (!price || price <= 0) return alert('올바른 제안 금액을 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading('구매 제안 발송 중...');
      const res = await API.call('offerSeatBuy', { buyer: myName, name: myName, seatNum, price });
      API.hideLoading();

      if (res && res.success) {
        SoundEngine.fanfare();
        alert(res.msg || '구매 제안이 발송되었습니다!');
        ModalManager.open('realestate');
      } else {
        alert(res?.msg || '제안 실패');
      }
    },

    handleRespondSeatOffer: async (seatNum, action, counterPrice = 0) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      API.showLoading(`제안 ${action} 처리 중...`);
      const res = await API.call('respondSeatOffer', { name: myName, seatNum, action, counterPrice });
      API.hideLoading();

      if (res && res.success) {
        SoundEngine.fanfare();
        alert(res.msg || '처리 완료!');
        ModalManager.open('realestate');
      } else {
        alert(res?.msg || '처리 실패');
      }
    },

    handleCounterSeatOffer: async (seatNum) => {
      const counter = prompt('역제안(협상)할 새 희망 금액(원)을 입력하세요:');
      if (!counter || isNaN(counter) || Number(counter) <= 0) return;
      ModalManager.handleRespondSeatOffer(seatNum, '협상', Number(counter));
    },

    buyFurniture: async (id, price, name) => {
      if (!confirm(`[${name}] 가구를 ${price.toLocaleString()}원에 구매하시겠습니까?`)) return;
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생1');

      if (st && (st.cash || 0) < price) {
        return alert(`잔액이 부족합니다! (보유: ${(st.cash || 0).toLocaleString()}원, 필요: ${price.toLocaleString()}원)`);
      }

      API.showLoading('가구 구매 중...');
      const buyRes = await API.call('buyFashionItem', { name: myName, studentName: myName, itemName: name, price: price, category: '가구', prop: id });
      API.hideLoading();

      if (buyRes && buyRes.success) {
        if (buyRes.student) {
          GameState.student = buyRes.student;
        } else if (st) {
          st.cash = Math.max(0, (st.cash || 0) - price);
        }
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl && GameState.student) cashEl.textContent = `${(GameState.student.cash || 0).toLocaleString()}원`;

        MiniroomSystem.addFurnitureToInventory(myName, id);
        SoundEngine.fanfare();
        alert(`🛋️ [${name}] 구매 완료! 미니룸 인벤토리에 보관되었습니다.`);
      } else {
        alert(buyRes?.msg || '구매 실패');
      }
    },

    toggleEquipItem: async (itemName, category, prop, currentStatus) => {
      const st = GameState.student;
      const myName = (st && (st.name || st.이름)) ? (st.name || st.이름) : (GameState.isAdmin ? '선생님' : '학생');
      const isCurrentlyEquipped = currentStatus === '장착';

      if (!GameState.characterStyle) GameState.characterStyle = {};

      if (isCurrentlyEquipped) {
        // 장착 해제
        API.showLoading('아이템 장착 해제 중...');
        await API.call('unequipItem', { name: myName, studentName: myName, itemName: itemName, category: category });
        API.hideLoading();

        if (category === '오라') GameState.characterStyle.aura = null;
        else if (category === '의상') GameState.characterStyle.costume = null;
        else if (category === '모자') GameState.characterStyle.hat = null;
        else if (category === '헤어') GameState.characterStyle.hairColor = null;
        else if (category === '탈것') {
          GameState.characterStyle.mount = null;
          GameState.characterStyle.speedMult = 1.0;
        }
        else if (category === '퍼퓸') GameState.characterStyle.perfume = null;

        localStorage.setItem(`char_style_${myName}`, JSON.stringify(GameState.characterStyle));
        API.call('updateCharacterStyle', { name: myName, studentName: myName, style: GameState.characterStyle }, true);
        if (window.MainGameScene && window.MainGameScene.reloadPlayerTexture) {
          window.MainGameScene.reloadPlayerTexture();
        }
        SoundEngine.click();
        alert(`[${itemName}] 장착을 해제했습니다.`);
      } else {
        // 장착하기 (동일 카테고리 기존 장착템 자동 해제 및 1개만 장착)
        API.showLoading('아이템 장착 중...');
        await API.call('equipItem', { name: myName, studentName: myName, itemName: itemName, category: category });
        API.hideLoading();

        if (category === '오라') {
          let aKey = prop || 'gold';
          if (itemName.includes('황금')) aKey = 'gold';
          else if (itemName.includes('벚꽃')) aKey = 'cherry';
          else if (itemName.includes('무지개')) aKey = 'rainbow';
          GameState.characterStyle.aura = aKey;
        } else if (category === '의상') {
          let cKey = prop || 'school';
          if (itemName.includes('한복')) cKey = 'hanbok';
          else if (itemName.includes('정장')) cKey = 'suit';
          else if (itemName.includes('마법사')) cKey = 'wizard';
          else if (itemName.includes('교복')) cKey = 'school';
          else if (itemName.includes('잠옷')) cKey = 'pajama';
          else if (itemName.includes('사이버')) cKey = 'cyber';
          else if (itemName.includes('드레스')) cKey = 'dress';
          GameState.characterStyle.costume = cKey;
        } else if (category === '모자') {
          let hKey = prop || 'crown';
          if (itemName.includes('고양이')) hKey = 'cat_ears';
          else if (itemName.includes('왕관')) hKey = 'crown';
          else if (itemName.includes('천사')) hKey = 'halo';
          else if (itemName.includes('마법사')) hKey = 'magic_hat';
          else if (itemName.includes('베레모')) hKey = 'beret';
          else if (itemName.includes('캡모자')) hKey = 'cap';
          GameState.characterStyle.hat = hKey;
        } else if (category === '헤어') {
          GameState.characterStyle.hairColor = prop || '#f59e0b';
        } else if (category === '탈것') {
          let mKey = prop || 'kickboard';
          let speed = 1.5;
          if (itemName.includes('킥보드') || prop === 'kickboard') { mKey = 'kickboard'; speed = 1.5; }
          else if (itemName.includes('스케이트보드') || prop === 'skateboard') { mKey = 'skateboard'; speed = 1.7; }
          else if (itemName.includes('자전거') || prop === 'bicycle') { mKey = 'bicycle'; speed = 1.8; }
          else if (itemName.includes('카트') || prop === 'cart') { mKey = 'cart'; speed = 2.0; }
          else if (itemName.includes('구름') || prop === 'cloud') { mKey = 'cloud'; speed = 2.2; }
          GameState.characterStyle.mount = mKey;
          GameState.characterStyle.speedMult = speed;
        } else if (category === '퍼퓸') {
          let pKey = prop || 'sparkle';
          if (itemName.includes('로즈')) pKey = 'rose';
          else if (itemName.includes('스타더스트')) pKey = 'sparkle';
          else if (itemName.includes('방울')) pKey = 'bubble';
          else if (itemName.includes('거인')) pKey = 'giant';
          else if (itemName.includes('축소')) pKey = 'tiny';
          GameState.characterStyle.perfume = pKey;
        }

        localStorage.setItem(`char_style_${myName}`, JSON.stringify(GameState.characterStyle));
        API.call('updateCharacterStyle', { name: myName, studentName: myName, style: GameState.characterStyle }, true);
        if (window.MainGameScene && window.MainGameScene.reloadPlayerTexture) {
          window.MainGameScene.reloadPlayerTexture();
        }
        SoundEngine.fanfare();
        alert(`✨ [${itemName}] 장착 완료!\n(기존 같은 계열 장착 아이템은 자동으로 해제되었습니다)`);
      }

      // 인벤토리 모달 새로고침
      ModalManager.open('inventory');
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
      const yfSuffix = (code === '086520') ? '.KQ' : '.KS';
      const targetYf = `https://query1.finance.yahoo.com/v8/finance/chart/${code}${yfSuffix}?interval=1d`;
      const urls = [
        targetYf,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetYf)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(targetYf)}`
      ];

      for (const u of urls) {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(u, { signal: controller.signal });
          clearTimeout(tid);

          if (res.ok) {
            const data = await res.json();
            if (data && data.chart && data.chart.result && data.chart.result[0]) {
              const meta = data.chart.result[0].meta;
              const price = Number(meta.regularMarketPrice);
              const prev = Number(meta.previousClose || meta.chartPreviousClose || price);
              if (!isNaN(price) && price > 0) {
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
                return; // 성공 시 종료
              }
            }
          }
        } catch (err) {
          // 다음 프록시 시도
        }
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
      const avgPrices = ModalManager.multiStockAvgPrices || {};
      const me = GameState.student ? (GameState.student.name || GameState.student.이름 || '나') : '나';

      const myQty = holdings[code] || holdings[curStock.name] || 0;
      let myAvg = (avgPrices[code] !== undefined && avgPrices[code] > 0) ? avgPrices[code] : (avgPrices[curStock.name] || 0);

      // 로컬스토리지 평단가 백업 조회
      if (myAvg === 0 && myQty > 0) {
        try {
          const cachedAvg = JSON.parse(localStorage.getItem(`classbank_stock_avg_${me}`) || '{}');
          if (cachedAvg[code]) myAvg = cachedAvg[code];
        } catch (_) {}
      }

      // 실시간 시세 기준 평가손익 및 수익률 동적 계산
      let myProfitLoss = 0;
      let myProfitRate = '0.00%';
      if (myQty > 0 && myAvg > 0 && curStock.price > 0) {
        myProfitLoss = myQty * (curStock.price - myAvg);
        const rateVal = (((curStock.price - myAvg) / myAvg) * 100).toFixed(2);
        myProfitRate = (curStock.price >= myAvg ? '+' : '') + rateVal + '%';
      }

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
      if (holdEl) holdEl.innerHTML = `${myQty.toLocaleString()}주 <span style="font-size:10px; color:#64748b;">(평단가: ${myAvg > 0 ? myAvg.toLocaleString() + '원' : '-'})</span>`;
      if (evalEl) {
        const isProfit = myProfitLoss >= 0;
        evalEl.innerHTML = `${(myQty * (curStock.price || 0)).toLocaleString()}원 <span style="font-size:10px; color:${isProfit ? '#ef4444' : '#3b82f6'}; font-weight:bold;">(${myProfitRate})</span>`;
      }

      const cvs = document.getElementById('stock-chart-canvas');
      if (cvs && curStock.price && curStock.price > 0) {
        const ctx = cvs.getContext('2d');
        const W = cvs.width, H = cvs.height, padding = 12;
        const p = curStock.price;
        const hist = [p * 0.97, p * 0.99, p * 0.98, p * 1.01, p * 0.995, p];
        const max = Math.max(...hist) * 1.02, min = Math.min(...hist) * 0.98, range = Math.max(1, max - min);
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = (curStock.changeRate || '').includes('+') ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 2.5;
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
          let avg = (avgPrices[s.code] !== undefined && avgPrices[s.code] > 0) ? avgPrices[s.code] : (avgPrices[s.name] || 0);
          if (avg === 0 && q > 0) {
            try {
              const cachedAvg = JSON.parse(localStorage.getItem(`classbank_stock_avg_${me}`) || '{}');
              if (cachedAvg[s.code]) avg = cachedAvg[s.code];
            } catch (_) {}
          }
          let pr = '0.00%';
          let isProf = true;
          if (q > 0 && avg > 0 && s.price > 0) {
            const diff = s.price - avg;
            const rVal = ((diff / avg) * 100).toFixed(2);
            isProf = diff >= 0;
            pr = (isProf ? '+' : '') + rVal + '%';
          }
          return `
            <tr style="${s.code === code ? 'background:#f0fdf4;' : ''}">
              <td><strong>${s.icon || '📈'} ${s.name}</strong></td>
              <td>${(s.price || 0).toLocaleString()}원</td>
              <td><strong>${q.toLocaleString()}주</strong></td>
              <td>${avg > 0 ? avg.toLocaleString() + '원' : '-'}</td>
              <td style="color:${isProf ? '#ef4444' : '#3b82f6'}; font-weight:bold;">${q > 0 && avg > 0 ? pr : '-'}</td>
              <td>${(q * (s.price || 0)).toLocaleString()}원</td>
            </tr>
          `;
        }).join('');
      }
    },

    handleTradeMultiStock: async (type) => {
      if (ModalManager._actionLock) return;
      const code = ModalManager.activeMultiStockCode || '005930';
      const qtyInput = document.getElementById(type === '매수' ? 'multi-stock-buy-qty' : 'multi-stock-sell-qty');
      const qty = parseInt(qtyInput?.value, 10);
      if (!qty || qty <= 0) return alert('올바른 수량을 입력하세요.');

      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      ModalManager._actionLock = true;
      API.showLoading(`네이버 증시 ${type} 주문 체결 중...`);
      try {
        const res = await API.call('tradeMultiStock', { name: myName, code: code, qty: qty, type: type });
        API.hideLoading();

        if (res && res.success) {
          if (res.student) {
            GameState.student = res.student;
            const cashEl = document.getElementById('hud-cash-val');
            const stockEl = document.getElementById('hud-stock-val');
            const curC = res.student.cash ?? res.student.현금 ?? 0;
            const curS = res.student.stock ?? res.student.stockVal ?? res.student.주식 ?? 0;
            if (cashEl) cashEl.textContent = `${curC.toLocaleString()}원`;
            if (stockEl) stockEl.textContent = `${curS.toLocaleString()}원`;
            const stockCashEl = document.getElementById('stock-my-cash-val');
            if (stockCashEl) stockCashEl.textContent = `${curC.toLocaleString()}원`;
          }
          if (res.holdings) ModalManager.multiStockHoldings = res.holdings;
          if (res.avgPrices) ModalManager.multiStockAvgPrices = res.avgPrices;
          if (res.profitLosses) ModalManager.multiStockProfitLosses = res.profitLosses;
          if (res.profitRates) ModalManager.multiStockProfitRates = res.profitRates;

          ModalManager.updateMultiStockUI();
          SoundEngine.fanfare();
          alert(res.msg);
        } else {
          alert(res?.msg || '주문 실패');
        }
      } finally {
        ModalManager._actionLock = false;
        API.hideLoading();
      }
    },

    // ─── 리얼 인터랙티브 캔버스 스크래치 복권 ───
    buyScratchLottery: async () => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';
      const cash = st ? (st.cash || 0) : 0;
      if (cash < 500 && myName !== '선생님') return alert('복권 구매를 위한 현금(500원)이 부족합니다!');

      API.showLoading('새 복권을 발권하는 중...');
      const buyRes = await API.call('buyLottery', { name: myName });
      if (!buyRes || !buyRes.success) {
        API.hideLoading();
        return alert(buyRes?.msg || '복권 구매 실패');
      }

      const scrRes = await API.call('scratchLottery', { name: myName });
      API.hideLoading();

      if (st && myName !== '선생님') st.cash = (st.cash || 0) - 500;
      const cashEl = document.getElementById('hud-cash-val');
      if (cashEl && st) cashEl.textContent = `${(st.cash || 0).toLocaleString()}원`;

      // 1단계 카드 숨기고 2단계 스크래치 스테이지 노출
      const beforeBuy = document.getElementById('lottery-before-buy');
      const scratchStage = document.getElementById('lottery-scratch-stage');
      const afterScratch = document.getElementById('lottery-after-scratch');
      if (beforeBuy) beforeBuy.style.display = 'none';
      if (afterScratch) afterScratch.style.display = 'none';
      if (scratchStage) scratchStage.style.display = 'block';

      // 당첨 결과 텍스트 바인딩
      const titleEl = document.getElementById('lottery-prize-title');
      const msgEl = document.getElementById('lottery-prize-msg');
      const iconEl = document.getElementById('lottery-prize-icon');

      const isWinner = (scrRes?.prize || 0) > 0;
      if (titleEl) titleEl.textContent = scrRes?.title || (isWinner ? '당첨!' : '꽝!');
      if (msgEl) msgEl.textContent = scrRes?.msg || (isWinner ? `${scrRes.prize.toLocaleString()}원 획득!` : '다음 기회에!');
      if (iconEl) iconEl.textContent = isWinner ? '🎉' : '💨';

      // 캔버스 은박 코팅 초기화 & 스크래치 이벤트 바인딩
      const cvs = document.getElementById('lottery-scratch-canvas');
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      const W = cvs.width, H = cvs.height;

      // 은박 스크래치 질감 렌더링
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, W, H);

      // 반짝이 격자 무늬
      ctx.fillStyle = '#cbd5e1';
      for (let x = 0; x < W; x += 24) {
        for (let y = 0; y < H; y += 24) {
          if ((x + y) % 48 === 0) ctx.fillRect(x, y, 12, 12);
        }
      }

      // 안내 문구
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 15px Galmuri11, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪙 동전이나 마우스로 긁어보세요! 🪙', W / 2, H / 2 - 4);
      ctx.font = '11px Galmuri11, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('(드래그 / 터치하여 은박을 지우세요)', W / 2, H / 2 + 18);

      let isDrawing = false;
      let scratchCount = 0;
      let isRevealed = false;

      function getPos(e) {
        const rect = cvs.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * (W / rect.width),
          y: (clientY - rect.top) * (H / rect.height)
        };
      }

      function scratchAt(x, y) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();

        scratchCount++;
        if (Math.random() < 0.25) SoundEngine.step();

        // 35회 이상 긁었을 때 전체 공개 및 당첨금 지급 처리
        if (scratchCount > 35 && !isRevealed) {
          isRevealed = true;
          setTimeout(() => {
            ctx.clearRect(0, 0, W, H);
            if (st && (scrRes?.prize || 0) > 0) {
              st.cash = (st.cash || 0) + scrRes.prize;
              const curCashEl = document.getElementById('hud-cash-val');
              if (curCashEl) curCashEl.textContent = `${(st.cash || 0).toLocaleString()}원`;
              SoundEngine.fanfare();
            } else {
              SoundEngine.snap();
            }
            if (afterScratch) afterScratch.style.display = 'block';
          }, 200);
        }
      }

      cvs.onmousedown = (e) => { isDrawing = true; const p = getPos(e); scratchAt(p.x, p.y); };
      cvs.onmousemove = (e) => { if (isDrawing) { const p = getPos(e); scratchAt(p.x, p.y); } };
      window.onmouseup = () => { isDrawing = false; };

      cvs.ontouchstart = (e) => { isDrawing = true; e.preventDefault(); const p = getPos(e); scratchAt(p.x, p.y); };
      cvs.ontouchmove = (e) => { if (isDrawing) { e.preventDefault(); const p = getPos(e); scratchAt(p.x, p.y); } };
      cvs.ontouchend = () => { isDrawing = false; };
    },

    // ─── 감정신호등 ───
    selectedEmotionVal: '🟢 좋음',
    selectEmotion: (val, label, bonus, btn) => {
      ModalManager.selectedEmotionVal = val;

      // 1. 모든 버튼 초기화
      document.querySelectorAll('.emotion-opt-btn').forEach(b => {
        b.classList.remove('active');
        b.style.transform = 'scale(1)';
        b.style.boxShadow = 'none';
        b.style.opacity = '0.75';
        const tag = b.querySelector('.emotion-check-tag');
        if (tag) tag.style.display = 'none';
      });

      // 2. 클릭된 버튼 강조 활성화
      if (btn) {
        btn.classList.add('active');
        btn.style.transform = 'scale(1.06)';
        btn.style.opacity = '1';
        btn.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
        const tag = btn.querySelector('.emotion-check-tag');
        if (tag) tag.style.display = 'inline-block';
      }

      // 3. 상단 텍스트 배지 즉시 갱신
      const badgeEl = document.getElementById('emotion-selected-badge');
      if (badgeEl) {
        let color = '#16a34a';
        if (val.includes('보통')) color = '#ca8a04';
        if (val.includes('힘듦')) color = '#dc2626';
        badgeEl.style.color = color;
        badgeEl.textContent = `${val} ${label} (장학금 +${bonus.toLocaleString()}원)`;
      }

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

    adminStudentsCache: [],
    currentAdminSort: 'default',

    switchAdminCategory: (cat) => {
      SoundEngine.click();
      document.querySelectorAll('.admin-category-panel').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));

      const targetPanel = document.getElementById(`admin-cat-${cat}`);
      const targetBtn = document.getElementById(`btn-adm-tab-${cat}`);
      if (targetPanel) targetPanel.style.display = 'block';
      if (targetBtn) targetBtn.classList.add('active');

      if (cat === 'items') {
        ModalManager.loadAdminItems();
      }
    },

    sortAdminStudentsList: (criteria) => {
      SoundEngine.click();
      ModalManager.currentAdminSort = criteria;
      document.querySelectorAll('.adm-sort-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById(`sort-btn-${criteria}`);
      if (activeBtn) activeBtn.classList.add('active');

      const list = [...(ModalManager.adminStudentsCache || [])];
      if (criteria === 'default') {
        // 원래 구글 시트 행 번호 순서
        list.sort((a, b) => (a.sheetIndex || a.id || 0) - (b.sheetIndex || b.id || 0));
      } else if (criteria === 'totalAsset') {
        list.sort((a, b) => (b.totalAsset || b.total || 0) - (a.totalAsset || a.total || 0));
      } else if (criteria === 'cash') {
        list.sort((a, b) => (b.cash || 0) - (a.cash || 0));
      } else if (criteria === 'stock') {
        list.sort((a, b) => (b.stockQty || 0) - (a.stockQty || 0));
      } else if (criteria === 'name') {
        list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
      }

      ModalManager.renderAdminStudentsTable(list);
    },

    renderAdminStudentsTable: (students) => {
      const isTeacher = GameState.isAdmin || (GameState.student && (GameState.student.name === '선생님' || GameState.student.permission === '전체'));
      const sTbody = document.getElementById('admin-students-tbody');
      if (sTbody) {
        if (!students || students.length === 0) {
          sTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:15px;">등록된 학생이 없습니다.</td></tr>';
          return;
        }
        sTbody.innerHTML = students.map((s, idx) => `
          <tr>
            <td>${s.sheetIndex || s.id || idx + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td>${s.job || '학생'}</td>
            <td>${(s.cash || 0).toLocaleString()}원</td>
            <td>${s.stockQty || 0}주</td>
            <td><strong>${(s.totalAsset || s.total || s.cash || 0).toLocaleString()}원</strong></td>
            <td><span class="badge badge-primary">${s.permission || '일반'}</span></td>
            ${isTeacher ? `
              <td>
                <button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${s.name}')">금액조정</button>
              </td>
            ` : ''}
          </tr>
        `).join('');
      }
    },

    loadAdminItems: async () => {
      const tbody = document.getElementById('admin-items-editor-tbody');
      if (!tbody) return;

      let furnHtml = '';
      if (typeof CONFIG !== 'undefined' && CONFIG.FURNITURE_CATALOG) {
        furnHtml = CONFIG.FURNITURE_CATALOG.map(f => `
          <tr style="background:#fdf2f8;">
            <td><span class="badge" style="background:#ec4899; color:white;">미니룸소품</span></td>
            <td><strong>${f.image ? `<img src="${f.image}" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;">` : (f.emoji || '🛋️')} ${f.name}</strong></td>
            <td style="color:#b45309; font-weight:bold;">${(f.price || 0).toLocaleString()}원</td>
            <td>무제한</td>
            <td>
              <button class="pixel-btn-sm" style="background:#ec4899; color:white;" onclick="ModalManager.editFurnitureCatalogPrice('${f.id}', ${f.price || 0}, '${f.name}')">가격 수정</button>
            </td>
          </tr>
        `).join('');
      }

      const res = await API.call('getAdminItemsList', {}, true);
      const items = res?.items || [];
      const itemsHtml = items.map(it => `
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

      tbody.innerHTML = furnHtml + itemsHtml;
    },

    editFurnitureCatalogPrice: async (id, curPrice, name) => {
      const newPriceStr = prompt(`[${name}] 미니룸 소품의 새 판매 가격(원)을 입력하세요:`, curPrice);
      if (newPriceStr === null) return;
      const newPrice = Number(newPriceStr);
      if (isNaN(newPrice) || newPrice < 0) return alert('올바른 가격을 입력해주세요.');

      // 1. CONFIG.FURNITURE_CATALOG 즉시 반영
      if (typeof CONFIG !== 'undefined' && CONFIG.FURNITURE_CATALOG) {
        const itemDef = CONFIG.FURNITURE_CATALOG.find(f => f.id === id);
        if (itemDef) itemDef.price = newPrice;
      }

      // 2. localStorage 저장
      try {
        const customPrices = JSON.parse(localStorage.getItem('classbank_custom_furn_prices') || '{}');
        customPrices[id] = newPrice;
        localStorage.setItem('classbank_custom_furn_prices', JSON.stringify(customPrices));
      } catch (_) {}

      // 3. 서버 설정 저장 (비동기)
      API.call('updateSetting', { key: `FURN_PRICE_${id}`, value: newPrice }, true);

      SoundEngine.coin();
      alert(`[${name}] 가격이 ${newPrice.toLocaleString()}원으로 변경되었습니다! ✨`);
      ModalManager.loadAdminItems();
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

    _actionLock: false,

    handleDeposit: async () => {
      if (ModalManager._actionLock) return;
      const input = document.getElementById('deposit-amount-input');
      const amt = Number(input?.value);
      if (!amt || amt < 1000) return alert('예금 최소 금액은 1,000원입니다.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      ModalManager._actionLock = true;
      API.showLoading('예금 계좌 개설 중...');
      try {
        const res = await API.call('deposit', { name: myName, amount: amt });
        API.hideLoading();
        if (res && res.success) {
          if (res.student) {
            GameState.student = res.student;
            const cashEl = document.getElementById('hud-cash-val');
            if (cashEl) cashEl.textContent = `${(res.student.cash || 0).toLocaleString()}원`;
          }
          SoundEngine.fanfare();
          alert('정기예금에 성공적으로 가입되었습니다!');
          open('bank');
        } else {
          alert(res?.msg || '예금 가입 실패');
        }
      } finally {
        ModalManager._actionLock = false;
        API.hideLoading();
      }
    },

    handleWithdraw: async (index) => {
      if (ModalManager._actionLock) return;
      if (!confirm('정기예금을 만기 해지하여 원금과 이자를 수령하시겠습니까?')) return;
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      ModalManager._actionLock = true;
      API.showLoading('예금 해지 및 정산 중...');
      try {
        const res = await API.call('withdraw', { name: myName, index: index });
        API.hideLoading();
        if (res && res.success) {
          if (res.student) {
            GameState.student = res.student;
            const cashEl = document.getElementById('hud-cash-val');
            if (cashEl) cashEl.textContent = `${(res.student.cash || 0).toLocaleString()}원`;
          }
          SoundEngine.fanfare();
          alert(`예금 만기 해지 완료! 원금과 이자(${res.amount?.toLocaleString()}원)가 지급되었습니다.`);
          open('bank');
        } else {
          alert(res?.msg || '해지 실패');
        }
      } finally {
        ModalManager._actionLock = false;
        API.hideLoading();
      }
    },

    handleTransfer: async () => {
      if (ModalManager._actionLock) return;
      const target = document.getElementById('transfer-target')?.value;
      const amt = Number(document.getElementById('transfer-amount')?.value);
      if (!target || !amt || amt <= 0) return alert('받는 친구 이름과 올바른 송금 금액을 입력하세요.');
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';

      ModalManager._actionLock = true;
      API.showLoading('용돈 송금 중...');
      try {
        const res = await API.call('transfer', { sender: myName, receiver: target, amount: amt });
        API.hideLoading();
        if (res && res.success) {
          if (res.student) {
            GameState.student = res.student;
            const cashEl = document.getElementById('hud-cash-val');
            if (cashEl) cashEl.textContent = `${(res.student.cash || 0).toLocaleString()}원`;
          }
          SoundEngine.fanfare();
          alert(`[${target}] 친구에게 ${amt.toLocaleString()}원을 송금했습니다!`);
          open('postoffice');
        } else {
          alert(res?.msg || '송금 실패');
        }
      } finally {
        ModalManager._actionLock = false;
        API.hideLoading();
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
    },

    // ─── 동물 NPC 인터랙티브 기능 ───
    talkNextNpc: (npcId) => {
      const npcDef = TownMapData.NPCS.find(n => n.id === npcId);
      if (!npcDef || !npcDef.dialogs) return;
      const box = document.getElementById('npc-dialog-box');
      if (box) {
        const nextLine = npcDef.dialogs[Math.floor(Math.random() * npcDef.dialogs.length)];
        box.style.transform = 'scale(0.95)';
        setTimeout(() => {
          box.textContent = `"${nextLine}"`;
          box.style.transform = 'scale(1)';
        }, 100);
        SoundEngine.snap();
      }
    },

    startNpcQuiz: (npcType) => {
      const quizzes = [
        { q: '회사가 낸 이익의 일부를 주주들에게 나누어 주는 돈을 무엇이라 할까요?', a: ['배당금', '복권상금', '학급세금'], ans: 0 },
        { q: '은행에 돈을 맡기고 만기까지 기다렸을 때 원금에 더해 받는 것은?', a: ['이자', '수수료', '과태료'], ans: 0 },
        { q: '물건이나 주식을 싼 가격에 사서 비싼 가격에 팔았을 때 생기는 이익은?', a: ['시세차익', '이자소득', '소득세'], ans: 0 },
        { q: '학급 공동체의 편의와 시설 유지를 위해 국가나 학급에 납부하는 돈은?', a: ['세금', '기부금', '투자금'], ans: 0 },
        { q: '현금 대신 편리하게 물건을 사고 결제하는 QR 간편결제 시스템은?', a: ['제로페이', '어음', '약속증서'], ans: 0 }
      ];
      const qItem = quizzes[Math.floor(Math.random() * quizzes.length)];
      const box = document.getElementById('npc-dialog-box');
      if (box) {
        box.innerHTML = `
          <div style="text-align:left; width:100%;">
            <div style="font-weight:bold; color:#b45309; margin-bottom:8px;">💡 오늘의 퀴즈: ${qItem.q}</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              ${qItem.a.map((opt, i) => `
                <button class="pixel-btn-sm" style="text-align:left; background:#fff; border:1px solid #cbd5e1; padding:6px 10px; font-size:12px; cursor:pointer;" onclick="ModalManager.answerNpcQuiz(${i === qItem.ans})">
                  ${i + 1}. ${opt}
                </button>
              `).join('')}
            </div>
          </div>
        `;
        SoundEngine.coin();
      }
    },

    answerNpcQuiz: async (isCorrect) => {
      const box = document.getElementById('npc-dialog-box');
      if (!box) return;
      if (isCorrect) {
        SoundEngine.fanfare();
        box.innerHTML = `
          <div style="color:#15803d; font-weight:bold; font-size:15px; text-align:center;">
            🎉 딩동댕! 정답입니다! (+장학금 1,000원 지급)
          </div>
        `;
        const st = GameState.student;
        const myName = st ? (st.name || st.이름) : '나';
        await API.call('rewardStudent', { name: myName, amount: 1000, reason: 'NPC 경제 퀴즈 정답' }, true);
        if (st) {
          st.cash = (st.cash || 0) + 1000;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${st.cash.toLocaleString()}원`;
        }
      } else {
        SoundEngine.fail();
        box.innerHTML = `
          <div style="color:#dc2626; font-weight:bold; font-size:14px; text-align:center;">
            ❌ 아쉽네요! 다음 기회에 다시 도전해보세요.
          </div>
        `;
      }
    },

    getNpcFortune: (npcName) => {
      const fortunes = [
        '✨ 오늘은 주식 시장에서 기분 좋은 상승이 예상됩니다! 포트폴리오를 점검해보세요.',
        '🌸 친구의 기숙사 미니룸에 방명록을 남기면 큰 행운이 찾아옵니다!',
        '💰 계획적인 저축이 미래의 부자가 되는 가장 확실한 지름길입니다.',
        '🍀 마음 상담실에서 오늘의 감정을 솔직히 적으면 마음이 한결 가벼워질 거예요.',
        '🎡 오늘 하루도 친구들과 함께 웃음 가득한 클래스타운을 만들어보세요!'
      ];
      const selected = fortunes[Math.floor(Math.random() * fortunes.length)];
      const box = document.getElementById('npc-dialog-box');
      if (box) {
        box.innerHTML = `
          <div style="color:#6b21a8; font-weight:500; font-size:13px; text-align:center;">
            ${selected}
          </div>
        `;
        SoundEngine.fanfare();
      }
    },

    // ─── 환경 구조물 인터랙션 ───
    tossFountainCoin: async () => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '나';
      if (st && st.cash < 100) return alert('분수대에 던질 동전(100원)이 부족합니다!');

      SoundEngine.coin();
      if (st) {
        st.cash -= 100;
        const cashEl = document.getElementById('hud-cash-val');
        if (cashEl) cashEl.textContent = `${st.cash.toLocaleString()}원`;
      }

      const luckyMessages = [
        '✨ 퐁당~! "이번 주 주식 수익률 대박 나게 해주세요!" 소원이 하늘에 닿았습니다!',
        '🌸 퐁당~! "기숙사 방에 좋은 일만 가득하길!" 행운 버프가 부여되었습니다.',
        '💎 퐁당~! 분수대 깊은 곳에서 반짝이는 보물(보너스 500원)을 발견했습니다!'
      ];
      const win = Math.random() < 0.3;
      if (win) {
        SoundEngine.fanfare();
        if (st) {
          st.cash += 500;
          const cashEl = document.getElementById('hud-cash-val');
          if (cashEl) cashEl.textContent = `${st.cash.toLocaleString()}원`;
        }
        alert(luckyMessages[2]);
      } else {
        alert(luckyMessages[Math.floor(Math.random() * 2)]);
      }
      ModalManager.close();
    },

    restOnBench: () => {
      SoundEngine.fanfare();
      alert('☕ 벤치에서 따스한 햇살을 받으며 휴식을 취했습니다. 기분이 상쾌해졌습니다!');
      ModalManager.close();
    },

    toggleStreetLamp: () => {
      SoundEngine.snap();
      alert('💡 가로등 스위치를 조작했습니다! 클래스타운 거리가 은은하게 빛납니다.');
      ModalManager.close();
    },

    roastMarshmallow: () => {
      SoundEngine.fanfare();
      alert('🍡 모닥불에 마시멜로를 노릇노릇 맛있게 구웠습니다! 달콤하고 행복한 기분~!');
      ModalManager.close();
    }
  };
})();
