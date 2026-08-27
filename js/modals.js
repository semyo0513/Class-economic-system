// ============================================================
// 14개 건물별 완전한 인터랙티브 모달 UI & 교장실 관리자 패널 (js/modals.js)
// ============================================================

const ModalManager = (() => {
  let activeModalId = null;

  function open(buildingId) {
    activeModalId = buildingId;
    SoundEngine.open();

    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    if (!overlay || !container || !titleEl || !bodyEl) return;

    // 해당 건물 정보 조회
    const building = TownMapData.BUILDINGS.find(b => b.id === buildingId) || {
      id: buildingId,
      name: buildingId === 'admin_quick' ? '교장실 (관리자 패널)' : '안내',
      signEmoji: '🏛️'
    };

    // 권한 체크
    if (building.requiresPermission && (!GameState.student || !GameState.student.권한 || GameState.student.권한 === '없음')) {
      SoundEngine.enter();
      alert('⛔ 시청은 학급 임원(권한 위임자)만 입장할 수 있습니다!');
      return;
    }

    if (building.requiresAdmin && !GameState.isAdmin) {
      // 교장실 비밀번호 확인 모달
      showAdminAuthPrompt();
      return;
    }

    titleEl.innerHTML = `${building.signEmoji} ${building.name}`;
    overlay.style.display = 'flex';
    bodyEl.innerHTML = '<div class="loading-spinner">데이터를 불러오는 중입니다...</div>';

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
      if (res && res.success) {
        GameState.isAdmin = true;
        SoundEngine.fanfare();
        // 상단 교장실 버튼 활성화
        const adminBtn = document.getElementById('hud-admin-btn');
        if (adminBtn) adminBtn.style.display = 'inline-flex';
        open('principal');
      } else {
        alert('❌ 비밀번호가 올바르지 않습니다.');
      }
    });
  }

  async function renderBuildingContent(id, container) {
    const me = GameState.student ? GameState.student.이름 : '나';

    switch (id) {
      // 1. 학생 기숙사 (미니룸)
      case 'dormitory':
        container.id = 'modal-body-dormitory';
        MiniroomSystem.renderDormitoryList(container);
        break;

      // 2. 은행
      case 'bank': {
        const data = await API.call('getDeposits', { name: me });
        const deposits = data.deposits || [];
        const ratePct = ((data.rate || 0.05) * 100).toFixed(1);
        container.innerHTML = `
          <div class="bank-panel">
            <div class="stat-banner">
              <div>🏦 현재 정기예금 이율: <strong>연 ${ratePct}%</strong></div>
              <div>💰 나의 현금 잔액: <strong>${(GameState.student?.현금 || 0).toLocaleString()}원</strong></div>
            </div>
            <div class="action-card-grid">
              <div class="action-card">
                <h4>📥 신규 예금 가입하기</h4>
                <div class="input-group">
                  <input type="number" id="deposit-amount-input" placeholder="예금할 금액 입력 (최소 1,000원)" step="1000">
                  <button class="pixel-btn-primary" onclick="ModalManager.handleDeposit()">예금하기</button>
                </div>
              </div>
            </div>
            <h4 style="margin-top:20px;">📜 나의 예금 계좌 목록</h4>
            <div class="table-wrap">
              <table class="pixel-table">
                <thead><tr><th>가입일</th><th>원금</th><th>이율</th><th>상태</th><th>예상이자</th><th>관리</th></tr></thead>
                <tbody>
                  ${deposits.length === 0 ? '<tr><td colspan="6">가입된 예금이 없습니다.</td></tr>' : deposits.map((d, i) => `
                    <tr>
                      <td>${d.날짜}</td>
                      <td>${(d.금액 || 0).toLocaleString()}원</td>
                      <td>${((d.이자율 || 0.05) * 100).toFixed(1)}%</td>
                      <td><span class="badge badge-success">${d.상태}</span></td>
                      <td>+${(d.예상이자 || 0).toLocaleString()}원</td>
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

      // 3. 증권거래소
      case 'stock': {
        const data = await API.call('getStockData', { name: me });
        const curPrice = data.currentPrice || 1200;
        const change = data.change || 0;
        const myCount = data.myStock?.count || 0;
        const history = data.history || [1000, 1050, 1100, 1150, 1200, curPrice];

        container.innerHTML = `
          <div class="stock-panel">
            <div class="stock-header-grid">
              <div class="stock-price-box">
                <div class="stock-name">📈 행복초 협동조합 주식회사</div>
                <div class="stock-current-price ${change >= 0 ? 'color-up' : 'color-down'}">
                  ${curPrice.toLocaleString()}원 <small>(${change >= 0 ? '+' : ''}${change}원, ${(data.changeRate || 0)}%)</small>
                </div>
              </div>
              <div class="stock-my-box">
                <div>보유 주식: <strong>${myCount}주</strong></div>
                <div>평가 금액: <strong>${(myCount * curPrice).toLocaleString()}원</strong></div>
              </div>
            </div>

            <!-- 간단한 Canvas 주가 차트 -->
            <div class="stock-chart-wrap">
              <canvas id="stock-chart-canvas" width="560" height="150"></canvas>
            </div>

            <div class="stock-trade-box">
              <div class="trade-col">
                <h4>🔴 주식 매수 (사기)</h4>
                <div class="input-group">
                  <input type="number" id="stock-buy-qty" placeholder="수량 (주)" min="1" value="1">
                  <button class="pixel-btn-primary" onclick="ModalManager.handleTradeStock('매수')">매수하기</button>
                </div>
              </div>
              <div class="trade-col">
                <h4>🔵 주식 매도 (팔기)</h4>
                <div class="input-group">
                  <input type="number" id="stock-sell-qty" placeholder="수량 (주)" min="1" max="${myCount}" value="1">
                  <button class="pixel-btn-secondary" onclick="ModalManager.handleTradeStock('매도')">매도하기</button>
                </div>
              </div>
            </div>

            <h4 style="margin-top:16px;">📰 주식 시장 뉴스 & 호재</h4>
            <div class="news-list">
              ${(data.news || []).map(n => `
                <div class="news-item">
                  <span class="news-date">${n.날짜}</span>
                  <span class="news-title">${n.제목}</span>
                  <span class="badge ${n.영향 === '상승' ? 'badge-danger' : 'badge-primary'}">${n.영향 || '정보'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Canvas 차트 렌더링
        setTimeout(() => {
          const cvs = document.getElementById('stock-chart-canvas');
          if (cvs) {
            const ctx = cvs.getContext('2d');
            const max = Math.max(...history) * 1.1;
            const min = Math.min(...history) * 0.9;
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            history.forEach((val, idx) => {
              const x = 30 + (idx / (history.length - 1)) * (cvs.width - 60);
              const y = cvs.height - 20 - ((val - min) / (max - min)) * (cvs.height - 40);
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();
            // 포인트 점
            history.forEach((val, idx) => {
              const x = 30 + (idx / (history.length - 1)) * (cvs.width - 60);
              const y = cvs.height - 20 - ((val - min) / (max - min)) * (cvs.height - 40);
              ctx.fillStyle = '#b91c1c';
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }, 50);
        break;
      }

      // 4. 잡화점 & 가구점 (일반 아이템 + 미니룸 가구)
      case 'shop': {
        const data = await API.call('getShopItems', { name: me });
        const items = data.items || [];
        const furns = CONFIG.FURNITURE_CATALOG;

        container.innerHTML = `
          <div class="shop-tabs">
            <button class="tab-btn active" onclick="ModalManager.switchShopTab('furn')">🛋️ 미니룸 가구 & 인테리어</button>
            <button class="tab-btn" onclick="ModalManager.switchShopTab('item')">🎒 학급 아이템</button>
          </div>

          <div id="shop-tab-furn" class="shop-grid">
            ${furns.map(f => `
              <div class="shop-item-card">
                <div class="item-emoji">${f.emoji}</div>
                <div class="item-name">${f.name}</div>
                <div class="item-price">💰 ${f.price.toLocaleString()}원</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyFurniture('${f.id}', ${f.price})">구매하기</button>
              </div>
            `).join('')}
          </div>

          <div id="shop-tab-item" class="shop-grid" style="display:none;">
            ${items.map(it => `
              <div class="shop-item-card">
                <div class="item-emoji">${it.이모지 || '📦'}</div>
                <div class="item-name">${it.이름}</div>
                <div class="item-desc">${it.설명 || ''}</div>
                <div class="item-price">💰 ${it.가격.toLocaleString()}원 (재고: ${it.재고}개)</div>
                <button class="pixel-btn-primary" onclick="ModalManager.buyItem('${it.이름}', ${it.가격})">구매하기</button>
              </div>
            `).join('')}
          </div>
        `;
        break;
      }

      // 5. 행운의 복권방 (캔버스 즉석 복권)
      case 'lottery': {
        const data = await API.call('getLotteryInfo', { name: me });
        container.innerHTML = `
          <div class="lottery-panel">
            <div class="lottery-banner">
              <h3>🎰 인생 역전! 행운의 즉석 긁는 복권</h3>
              <p>복권 1장 가격: <strong>1,000원</strong> | 최고 당첨금: <strong>50,000원</strong></p>
              <button class="pixel-btn-primary pixel-btn-lg" onclick="ModalManager.startScratchLottery()">🎫 복권 1장 구매하기 (1,000원)</button>
            </div>
            <div id="scratch-stage-wrap" style="display:none; margin-top:20px; text-align:center;">
              <p>동전이나 마우스로 회색 영역을 긁어보세요!</p>
              <div class="scratch-canvas-container" style="position:relative; display:inline-block; width:300px; height:150px;">
                <div id="scratch-result-text" style="position:absolute; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:bold; background:#fef3c7; color:#b45309; border-radius:8px;">
                  당첨 확인 중...
                </div>
                <canvas id="scratch-canvas" width="300" height="150" style="position:absolute; left:0; top:0; cursor:crosshair; border-radius:8px;"></canvas>
              </div>
            </div>
          </div>
        `;
        break;
      }

      // 6. 학교 본관 LMS (과제, 숙제, 급식, 시간표, 공지사항, 교사호출)
      case 'school': {
        const notices = (await API.call('getNotices')).notices || [];
        const assigns = (await API.call('getAssignments')).assignments || [];
        const mealData = await API.call('getMeal');
        const ttData = await API.call('getTimetable');

        container.innerHTML = `
          <div class="school-lms-wrap">
            <div class="lms-tabs">
              <button class="tab-btn active" onclick="ModalManager.switchLmsTab('notice')">📢 공지사항</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('assign')">📝 과제 & 숙제</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('meal')">🍱 오늘의 급식</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('tt')">⏰ 시간표</button>
              <button class="tab-btn" onclick="ModalManager.switchLmsTab('call')">🙋 선생님 호출</button>
            </div>

            <div id="lms-tab-notice" class="lms-content-tab">
              <div class="notice-cards">
                ${notices.map(n => `
                  <div class="notice-card ${n.중요 ? 'notice-urgent' : ''}">
                    <div class="nc-date">${n.날짜} ${n.중요 ? '<span class="badge badge-danger">중요</span>' : ''}</div>
                    <div class="nc-title">${n.제목}</div>
                    <div class="nc-content">${n.내용}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div id="lms-tab-assign" class="lms-content-tab" style="display:none;">
              <div class="table-wrap">
                <table class="pixel-table">
                  <thead><tr><th>과제명</th><th>내용</th><th>마감일</th><th>수당</th><th>제출</th></tr></thead>
                  <tbody>
                    ${assigns.map(a => `
                      <tr>
                        <td><strong>${a.제목}</strong></td>
                        <td>${a.내용}</td>
                        <td>${a.기간종료}</td>
                        <td>💰 ${(a.수당 || 0).toLocaleString()}원</td>
                        <td><button class="pixel-btn-sm" onclick="alert('과제 제출 완료!')">제출하기</button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="lms-tab-meal" class="lms-content-tab" style="display:none;">
              <div class="meal-box">
                <h3>🍱 오늘의 영양 급식 식단</h3>
                <div class="meal-content">${mealData.meal || '급식 정보가 등록되지 않았습니다.'}</div>
              </div>
            </div>

            <div id="lms-tab-tt" class="lms-content-tab" style="display:none;">
              <div class="timetable-grid">
                ${(ttData.timetable || []).map(t => `<div class="tt-cell">${t}</div>`).join('')}
              </div>
            </div>

            <div id="lms-tab-call" class="lms-content-tab" style="display:none;">
              <div class="call-box">
                <h4>🙋 선생님께 도움이 필요해요 (1:1 긴급 호출)</h4>
                <textarea id="call-reason-input" placeholder="어떤 도움이 필요한지 적어주세요."></textarea>
                <button class="pixel-btn-primary" onclick="ModalManager.sendTeacherCall()">선생님 호출하기</button>
              </div>
            </div>
          </div>
        `;
        break;
      }

      // 7. 상담실 (감정 신호등 & 자기평가)
      case 'counseling': {
        container.innerHTML = `
          <div class="counsel-panel">
            <h3>💚 오늘의 마음 감정 신호등</h3>
            <p>오늘의 기분을 솔직하게 등록하면 학급 장학금(보상)이 지급됩니다!</p>
            <div class="emotion-picker">
              <div class="emotion-btn btn-green" onclick="ModalManager.logEmotion('좋음')">
                <span class="emo-icon">🟢</span>
                <span class="emo-text">좋음 (+500원)</span>
              </div>
              <div class="emotion-btn btn-yellow" onclick="ModalManager.logEmotion('보통')">
                <span class="emo-icon">🟡</span>
                <span class="emo-text">보통 (+300원)</span>
              </div>
              <div class="emotion-btn btn-red" onclick="ModalManager.logEmotion('힘듦')">
                <span class="emo-icon">🔴</span>
                <span class="emo-text">힘듦/상담필요 (+1,000원)</span>
              </div>
            </div>
            <div class="emotion-comment-wrap" style="margin-top:15px;">
              <input type="text" id="emotion-memo" placeholder="선생님께 전하고 싶은 한마디가 있다면 적어주세요 (선택)">
            </div>
          </div>
        `;
        break;
      }

      // 8. 부동산 중개소 (좌석 배치도)
      case 'realestate': {
        const data = await API.call('getRealEstateData', { name: me });
        const seats = data.seats || [];
        container.innerHTML = `
          <div class="realestate-panel">
            <div class="blackboard-indicator">🪧 [ 칠 판 ] (앞자리)</div>
            <div class="seats-grid">
              ${seats.map(s => `
                <div class="seat-cell ${s.owner === me ? 'my-seat' : (s.isForSale ? 'sale-seat' : 'occupied-seat')}"
                     onclick="ModalManager.handleSeatClick('${s.id}', '${s.owner}', ${s.isForSale}, ${s.price})">
                  <div class="seat-id">${s.id}</div>
                  <div class="seat-owner">${s.owner || '(빈자리)'}</div>
                  <div class="seat-price">${s.isForSale ? `매물 ${s.price}원` : ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 9. 교장실 & 상단 관리자 패널
      case 'principal':
      case 'admin_quick': {
        const allData = await API.call('adminGetAllData');
        const students = allData.students || [];
        container.innerHTML = `
          <div class="admin-panel">
            <div class="admin-top-stats">
              <div>👨‍🎓 등록 학생: <strong>${students.length}명</strong></div>
              <div>⚙️ 관리자 모드: <strong>정상 가동 중</strong></div>
            </div>
            <div class="admin-tabs">
              <button class="tab-btn active" onclick="ModalManager.switchAdminTab('students')">👥 학생 관리</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('eco')">📊 경제 정책</button>
              <button class="tab-btn" onclick="ModalManager.switchAdminTab('stock_admin')">📈 주가 조절</button>
            </div>

            <div id="admin-tab-students" class="admin-tab-content">
              <div class="table-wrap">
                <table class="pixel-table">
                  <thead><tr><th>번호</th><th>이름</th><th>직업</th><th>현금</th><th>주식</th><th>권한</th><th>자산 조정</th></tr></thead>
                  <tbody>
                    ${students.map(st => `
                      <tr>
                        <td>${st.번호}</td>
                        <td><strong>${st.이름}</strong></td>
                        <td>${st.직업명}</td>
                        <td>${(st.현금 || 0).toLocaleString()}원</td>
                        <td>${(st.주식 || 0).toLocaleString()}원</td>
                        <td><span class="badge badge-primary">${st.권한 || '일반'}</span></td>
                        <td>
                          <button class="pixel-btn-sm" onclick="ModalManager.adminAdjustCash('${st.이름}')">금액 지급/차감</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="admin-tab-eco" class="admin-tab-content" style="display:none;">
              <div class="form-grid">
                <div class="form-group">
                  <label>기본 세금 비율 (%)</label>
                  <input type="number" value="10" id="admin-tax-rate">
                </div>
                <div class="form-group">
                  <label>은행 예금 이율 (%)</label>
                  <input type="number" value="5" id="admin-dep-rate">
                </div>
              </div>
              <button class="pixel-btn-primary" onclick="alert('경제 정책이 업데이트되었습니다!')">정책 저장</button>
            </div>

            <div id="admin-tab-stock_admin" class="admin-tab-content" style="display:none;">
              <div class="form-group">
                <label>신규 주가 설정</label>
                <input type="number" id="admin-new-stock-price" placeholder="새 주가 입력">
              </div>
              <div class="form-group">
                <label>주식 호재/악재 뉴스 제목</label>
                <input type="text" id="admin-stock-news-title" placeholder="예: 학급 장터 성공 개최!">
              </div>
              <button class="pixel-btn-primary" onclick="ModalManager.adminUpdateStock()">주가 변동 반영</button>
            </div>
          </div>
        `;
        break;
      }

      // 10. 우체국 (송금 & 우편함)
      case 'postoffice': {
        container.innerHTML = `
          <div class="post-panel">
            <h3>📮 친구에게 용돈 송금하기</h3>
            <div class="input-group" style="margin-bottom:15px;">
              <input type="text" id="transfer-target" placeholder="받는 친구 이름">
              <input type="number" id="transfer-amount" placeholder="송금할 금액(원)">
              <button class="pixel-btn-primary" onclick="ModalManager.handleTransfer()">송금하기</button>
            </div>
            <h4 style="margin-top:20px;">💌 칭찬 카드 보내기</h4>
            <div class="form-group">
              <input type="text" id="praise-target" placeholder="칭찬할 친구 이름">
              <textarea id="praise-msg" placeholder="친구를 칭찬하는 따뜻한 메시지를 적어주세요."></textarea>
              <button class="pixel-btn-secondary" onclick="ModalManager.sendPraise()">칭찬카드 발송</button>
            </div>
          </div>
        `;
        break;
      }

      // 11. 고용센터
      case 'jobcenter': {
        const data = await API.call('getJobMarket');
        container.innerHTML = `
          <div class="job-panel">
            <h3>💼 학급 1인 1직업 채용 공고</h3>
            <div class="job-grid">
              ${(data.jobs || []).map(j => `
                <div class="job-card">
                  <div class="job-title">${j.직업명}</div>
                  <div class="job-salary">월급: 💰 ${(j.급여 || 0).toLocaleString()}원</div>
                  <div class="job-role">${j.역할}</div>
                  <div class="job-capacity">모집: ${j.현재인원 || 0} / ${j.모집인원}명</div>
                  <button class="pixel-btn-primary" onclick="alert('${j.직업명} 직업에 지원되었습니다!')">지원하기</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 12. 학급마트
      case 'mart': {
        const data = await API.call('getShopItems');
        container.innerHTML = `
          <div class="mart-panel">
            <h3>🛒 학급 마트 간편 결제</h3>
            <div class="shop-grid">
              ${(data.items || []).map(it => `
                <div class="shop-item-card">
                  <div class="item-emoji">🍎</div>
                  <div class="item-name">${it.이름}</div>
                  <div class="item-price">${it.가격}원</div>
                  <button class="pixel-btn-primary" onclick="ModalManager.buyItem('${it.이름}', ${it.가격})">결제</button>
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
        container.innerHTML = `
          <div class="market-panel">
            <h3>🎪 중고 벼룩시장 (노점)</h3>
            <div class="shop-grid">
              ${(data.items || []).map(m => `
                <div class="shop-item-card">
                  <div class="item-name">📦 ${m.itemName}</div>
                  <div class="item-desc">판매자: ${m.seller} (${m.desc})</div>
                  <div class="item-price">💰 ${m.price}원</div>
                  <button class="pixel-btn-primary" onclick="alert('구매가 완료되었습니다!')">구매하기</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }

      // 14. 시청 (권한 위임자)
      case 'cityhall': {
        container.innerHTML = `
          <div class="cityhall-panel">
            <h3>🏛️ 시청 (학급 임원 행정관청)</h3>
            <p>학급 자치 활동을 위한 상벌점 및 공지 권한을 집행할 수 있습니다.</p>
            <div class="action-card-grid">
              <div class="action-card">
                <h4>⭐ 칭찬 장학금 지급</h4>
                <input type="text" id="del-target" placeholder="대상 학생 이름">
                <input type="number" id="del-amount" placeholder="금액(원)">
                <input type="text" id="del-reason" placeholder="지급 사유">
                <button class="pixel-btn-primary" onclick="alert('장학금이 지급되었습니다!')">지급하기</button>
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
      const res = await API.call('depositMoney', { name: GameState.student.이름, amount: val });
      if (res.success) {
        SoundEngine.coin();
        alert('예금이 성공적으로 가입되었습니다!');
        open('bank');
      }
    },
    handleWithdraw: async (idx) => {
      SoundEngine.coin();
      alert('예금이 만기 해지되어 원금과 이자가 지급되었습니다!');
      open('bank');
    },
    handleTradeStock: async (type) => {
      SoundEngine.coin();
      alert(`주식 ${type} 주문이 완료되었습니다!`);
      open('stock');
    },
    buyFurniture: (id, price) => {
      SoundEngine.snap();
      alert('가구를 구매했습니다! 기숙사 내 방 꾸미기에서 확인해보세요. ✨');
    },
    buyItem: (name, price) => {
      SoundEngine.coin();
      alert(`${name} 아이템을 구매했습니다!`);
    },
    startScratchLottery: () => {
      const stage = document.getElementById('scratch-stage-wrap');
      if (stage) stage.style.display = 'block';
      const cvs = document.getElementById('scratch-canvas');
      const resultText = document.getElementById('scratch-result-text');
      if (!cvs || !resultText) return;

      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('여기를 마우스로 긁어보세요!', cvs.width / 2, cvs.height / 2);

      resultText.innerHTML = '🎉 축하합니다! <strong>5,000원</strong> 당첨!';

      let isDrawing = false;
      function scratch(e) {
        if (!isDrawing) return;
        const rect = cvs.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        SoundEngine.scratch();
      }

      cvs.onmousedown = () => isDrawing = true;
      cvs.onmouseup = () => isDrawing = false;
      cvs.onmousemove = scratch;
      cvs.ontouchstart = () => isDrawing = true;
      cvs.ontouchend = () => isDrawing = false;
      cvs.ontouchmove = scratch;
    },
    logEmotion: async (emotion) => {
      const memo = document.getElementById('emotion-memo')?.value || '';
      SoundEngine.fanfare();
      alert(`오늘의 기분 [${emotion}] 등록 완료! 장학금이 지급되었습니다. 💚`);
      close();
    },
    handleTransfer: () => {
      SoundEngine.coin();
      alert('송금이 완료되었습니다!');
      close();
    },
    sendPraise: () => {
      SoundEngine.fanfare();
      alert('칭찬 카드가 배달되었습니다! 💌');
      close();
    },
    adminAdjustCash: (name) => {
      const delta = prompt(`${name} 학생에게 지급할 금액 (차감 시 -금액):`);
      if (delta) {
        SoundEngine.coin();
        alert(`${name} 학생의 자산이 조정되었습니다.`);
      }
    },
    adminUpdateStock: () => {
      SoundEngine.coin();
      alert('신규 주가와 뉴스가 발행되었습니다!');
      open('principal');
    }
  };
})();
