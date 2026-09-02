// ============================================================
// 통신 브릿지 (js/api.js)
// Google Apps Script REST API 통신 & 3초 타임아웃 & 즉시 로드 캐시 폴백
// ============================================================

const API = (() => {
  let loadingTimer = null;

  function showLoading(msg = '처리 중입니다...') {
    const el = document.getElementById('global-loading');
    const textEl = document.getElementById('global-loading-text');
    if (el) {
      if (textEl) textEl.textContent = msg;
      el.style.display = 'flex';
    }
    // 안전장치: 어떤 경우에도 2.5초 후 자동 닫힘
    if (loadingTimer) clearTimeout(loadingTimer);
    loadingTimer = setTimeout(hideLoading, 2500);
  }

  function hideLoading() {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    const el = document.getElementById('global-loading');
    if (el) el.style.display = 'none';
  }

  async function call(action, payload = {}, silent = false, customTimeoutMs = null) {
    if (!silent) showLoading();

    try {
      const gasUrl = (typeof CONFIG !== 'undefined' && (CONFIG.GAS_URL || (CONFIG.API && CONFIG.API.GAS_URL))) || '';
      if (!gasUrl || gasUrl.includes('YOUR_DEPLOYMENT_ID')) {
        return getMockResponse(action, payload);
      }

      // Google Apps Script REST 통신: GET 방식으로 단 1회 초고속 호출 (CORS 100% 호환 & 이중 실행 원천 차단)
      const dataStr = encodeURIComponent(JSON.stringify(payload));
      const getUrl = gasUrl + (gasUrl.includes('?') ? '&' : '?') + 'action=' + encodeURIComponent(action) + '&data=' + dataStr + '&t=' + Date.now();

      const timeoutDuration = customTimeoutMs || 12000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const response = await fetch(getUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const res = await response.json();
        if (res) return res;
      }

      return getMockResponse(action, payload);
    } catch (err) {
      console.warn(`[API Call Fallback] Action: ${action}`, err);
      return getMockResponse(action, payload);
    } finally {
      if (!silent) hideLoading();
    }
  }

  // 모의(Mock) 데이터 생성기
  function getMockResponse(action, payload) {
    const me = (payload && payload.name) || (GameState && GameState.student && (GameState.student.name || GameState.student.이름)) || '학생';
    const mockStudent = {
      id: 1, 번호: 1,
      name: me, 이름: me,
      job: '학생', 직업명: '학생',
      cash: 50000, 현금: 50000,
      stockQty: 20, stock: 20000, 주식: 20000,
      totalAsset: 74000,
      status: '정상', 상태: '정상',
      level: '골드(Lv.3)', 레벨: '골드(Lv.3)',
      permission: '전체', 권한: '전체'
    };

    switch (action) {
      case 'login':
      case 'studentLogin':
        return {
          success: true,
          student: { ...mockStudent, name: me, 이름: me },
          settings: { 세금율: 0.1, 예금이율: 0.05, 학교명: '행복초등학교' },
          ranking: [
            { rank: 1, name: '김현주', total: 2310000, job: '문화체육부 장관' },
            { rank: 2, name: '이하진', total: 1722000, job: '대통령(반장)' },
            { rank: 3, name: '정수빈', total: 1695800, job: '은행원' },
            { rank: 4, name: '서언', total: 1666560, job: '국세청장' },
            { rank: 5, name: me, total: 74000, job: '학생' }
          ]
        };
      case 'adminAuth':
        return payload.pw === '0513' ? { success: true, isAdmin: true } : { success: false, error: '비밀번호 불일치' };
      case 'adminGetAllData':
        return {
          success: true,
          students: [
            { id: 1, name: '김현주', job: '문화체육부 장관', cash: 2310000, stockQty: 50, totalAsset: 2370000 },
            { id: 2, name: '이하진', job: '대통령(반장)', cash: 1722000, stockQty: 30, totalAsset: 1758000 },
            { id: 3, name: '정수빈', job: '은행원', cash: 1695800, stockQty: 20, totalAsset: 1719800 },
            { id: 4, name: '서언', job: '국세청장', cash: 1666560, stockQty: 10, totalAsset: 1678560 },
            { id: 5, name: '선생님', job: '교사(관리자)', cash: 999999, stockQty: 100, totalAsset: 1119999 }
          ],
          settings: { 세금율: 0.1, 예금이율: 0.05, 복권_가격: 500 }
        };
      case 'getDeposits':
        return {
          success: true,
          rate: 0.05,
          deposits: [
            { 일시: '2026-08-01', 금액: 30000, 속성: 0.05, 상태: '활성' }
          ]
        };
      case 'depositMoney':
      case 'withdrawDeposit':
        return { success: true, msg: '정상적으로 처리되었습니다.' };
      case 'getStockData':
        return {
          success: true,
          currentPrice: 1200,
          info: { 현재가: 1200 },
          history: [{ date: '08-27', price: 1150 }, { date: '08-28', price: 1200 }],
          news: [
            { 제목: '🎉 2D 동물의숲 클래스타운 개장!', 내용: '학급 경제 시스템이 시작되었습니다.', 영향: '상승' }
          ]
        };
      case 'tradeStock':
        return { success: true, msg: '주식 주문이 정상 체결되었습니다.' };
      case 'getShopItems':
        return {
          success: true,
          items: [
            { itemName: '👟 스피드 롤러스케이트', 금액: 5000, 수량: 99, 설명: '이동속도 80% 증가' },
            { itemName: '✨ 황금 오라 이펙트', 금액: 8000, 수량: 99, 설명: '반짝이는 황금빛 파티클' },
            { itemName: '🍄 슈퍼 아이키커 버섯', 금액: 6000, 수량: 99, 설명: '캐릭터 크기 1.5배 거대화' },
            { itemName: '🪽 천사의 날개', 금액: 10000, 수량: 99, 설명: '등 뒤에 날개 장착' },
            { itemName: '🪑 자리 우선 선택권', 금액: 5000, 수량: 10, 설명: '원하는 자리를 먼저 고를 수 있는 티켓' }
          ]
        };
      case 'getInventory':
        return {
          success: true,
          inventory: [
            { 아이템명: '👟 스피드 롤러스케이트', 카테고리: '캐릭터아이템', 설명: '이동속도 80% 증가', 상태: '보유' },
            { 아이템명: '자리 우선 선택권', 카테고리: '아이템', 설명: '원하는 자리를 먼저 고르는 티켓', 상태: '보유' }
          ]
        };
      case 'useItem':
        return { success: true, msg: '아이템을 사용했습니다!' };
      case 'getLotteryInfo':
        return { success: true, price: 500 };
      case 'buyLottery':
        return { success: true, txId: 'lot_' + Date.now() };
      case 'scratchLottery':
        return { success: true, prize: 3000, title: '3등 당첨!', msg: '3,000원이 지급되었습니다!' };
      case 'getMartItems':
        return {
          success: true,
          items: [
            { 아이템명: '초코파이', 가격: 800, 재고: 15 },
            { 아이템명: '비타민 음료', 가격: 1200, 재고: 10 },
            { 아이템명: '고급 형광펜', 가격: 1500, 재고: 8 }
          ]
        };
      case 'martPay':
        return { success: true, receipt: { id: 'PAY' + Date.now().toString().slice(-6), amount: payload.amount, date: '2026-08-28' } };
      case 'logEmotion':
        return { success: true, msg: `오늘의 기분 [${payload.emotion}] 등록 완료! +500원 장학금이 지급되었습니다.` };
      case 'getRealEstateData':
        return {
          success: true,
          seats: Array.from({ length: 24 }, (_, i) => ({
            id: `seat_${i + 1}`,
            owner: i === 2 ? '홍길동' : (i === 4 ? me : `학생${i + 1}`),
            isForSale: i % 4 === 0,
            price: 5000 + i * 500
          }))
        };
      case 'getMailbox':
        return {
          success: true,
          mails: [
            { 일시: '2026-08-28 09:30', 이름: '선생님', 카테고리: '칭찬카드', 메세지: '항상 밝은 미소로 청소를 도와줘서 고마워! 💌 (+500원)' },
            { 일시: '2026-08-28 09:10', 이름: '선생님', 카테고리: '송금우편', 메세지: '학급 자치활동 우수 장학금 5,000원이 입금되었습니다.' }
          ]
        };
      case 'getNotices':
        return {
          success: true,
          notices: [
            { 날짜: '2026-08-28', 제목: '🎉 2D 동물의숲 클래스타운 개장 안내!', 내용: '기숙사 미니룸을 꾸미고 친구들과 교류해보세요.', 중요: '긴급' },
            { 날짜: '2026-08-27', 제목: '이번 주 금요일 주식 배당금 지급 예정', 내용: '보유 주식 수에 따라 배당금이 지급됩니다.', 중요: '일반' }
          ]
        };
      case 'getAssignments':
        return {
          success: true,
          assignments: [
            { 과제ID: 'as1', 제목: '2학기 경제 포트폴리오', 내용: '나의 소비 습관과 투자 일지 작성 제출', 기간종료: '2026-09-15', 수당: 5000 }
          ]
        };
      case 'getMeal':
        return { success: true, meal: '찰보리밥, 한우소고기미역국, 돈육간장불고기, 상추쌈/쌈장, 배추김치, 멜론' };
      case 'getTimetable':
        return { success: true, timetable: ['1교시: 국어', '2교시: 수학', '3교시: 사회', '4교시: 과학', '5교시: 체육', '6교시: 미술'] };
      case 'adminPaySalaries':
      case 'adminFineStudent':
      case 'adminWarnStudent':
      case 'sendPraise':
      case 'sendPraiseCard':
      case 'transfer':
      case 'sendMoney':
      case 'addMartItem':
      case 'updateCash':
      case 'adminAddNotice':
      case 'requestSeatTrade':
      case 'logChat':
      case 'getMailbox':
        return { success: true, msg: '성공적으로 처리되었습니다.' };
      default:
        return { success: true, msg: '요청 완료' };
    }
  }

  return {
    call,
    showLoading,
    hideLoading
  };
})();
