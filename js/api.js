// ============================================================
// GAS 통신 브릿지 모듈 (js/api.js)
// ============================================================

const API = (() => {
  let isRequestPending = false;

  function showLoading(text = '처리 중입니다...') {
    const el = document.getElementById('global-loading');
    const textEl = document.getElementById('global-loading-text');
    if (el) {
      if (textEl) textEl.textContent = text;
      el.style.display = 'flex';
    }
  }

  function hideLoading() {
    const el = document.getElementById('global-loading');
    if (el) el.style.display = 'none';
  }

  // 모의(Mock) 데이터 생성기 - GAS URL 미설정 시에도 즉시 게임 동작 가능
  function getMockResponse(action, payload) {
    console.log(`[API Mock] Action: ${action}`, payload);
    const mockStudent = {
      id: 1, 번호: 1,
      name: payload.name || '테스트학생', 이름: payload.name || '테스트학생',
      job: '은행원', 직업명: '은행원',
      cash: 50000, 현금: 50000,
      stock: 20000, 주식: 20000,
      status: '정상', 상태: '정상',
      level: '골드(Lv.3)', 레벨: '골드(Lv.3)',
      permission: '전체', 권한: '전체'
    };

    switch (action) {
      case 'studentLogin':
        return {
          success: true,
          student: { ...mockStudent, name: payload.name || '테스트학생', 이름: payload.name || '테스트학생' },
          settings: { 세금율: 0.1, 예금이율: 0.05, 학교명: '행복초등학교' },
          ranking: [
            { rank: 1, name: '홍길동', total: 120000, job: '투자왕' },
            { rank: 2, name: payload.name || '테스트학생', total: 70000, job: '은행원' },
            { rank: 3, name: '이영희', total: 65000, job: '기자' }
          ]
        };
      case 'getInitData':
        return { success: true, student: mockStudent };
      case 'getDeposits':
        return {
          success: true,
          rate: 0.05,
          cash: 50000,
          deposits: [
            { 날짜: '2026-08-01', 금액: 30000, 이자율: 0.05, 상태: '예치중', 예상이자: 1500 }
          ]
        };
      case 'depositMoney':
      case 'withdrawDeposit':
        return { success: true, message: '정상적으로 처리되었습니다.', newCash: 40000 };
      case 'getStockData':
        return {
          success: true,
          currentPrice: 1250,
          change: 50,
          changeRate: 4.17,
          history: [1100, 1120, 1150, 1180, 1200, 1250],
          news: [
            { 날짜: '2026-08-28', 제목: '학급 협동조합 신규 아이템 출시 임박 호재!', 영향: '상승' },
            { 날짜: '2026-08-27', 제목: '마을 청소의 날 성황리 개최', 영향: '보통' }
          ],
          myStock: { count: 16, avgPrice: 1150, currentVal: 20000 }
        };
      case 'tradeStock':
        return { success: true, message: '주식 주문이 체결되었습니다.' };
      case 'getShopItems':
        return {
          success: true,
          items: [
            { 이름: '황금 연필', 가격: 1500, 재고: 10, 이모지: '✏️', 설명: '필기할 때 반짝반짝 빛납니다.' },
            { 이름: '행운의 부적', 가격: 3000, 재고: 5, 이모지: '🧿', 설명: '복권 당첨 확률이 올라갈지도?' },
            { 이름: '자리 우선권', 가격: 10000, 재고: 2, 이모지: '🪑', 설명: '원하는 자리를 먼저 고를 수 있는 티켓' }
          ]
        };
      case 'buyItem':
        return { success: true, message: '구매가 완료되었습니다.' };
      case 'getRealEstateData':
        return {
          success: true,
          seats: Array.from({ length: 24 }, (_, i) => ({
            id: `seat_${i + 1}`, row: Math.floor(i / 6) + 1, col: (i % 6) + 1,
            owner: i === 4 ? payload.name : (i % 3 === 0 ? `학생${i + 1}` : null),
            isForSale: i % 4 === 0, price: 5000 + i * 500
          }))
        };
      case 'getLotteryInfo':
        return {
          success: true,
          lottery: { cost: 1000, title: '대박 긁는 복권', maxPrize: 50000 },
          history: [
            { 날짜: '2026-08-28', 당첨금: 5000, 내용: '3등 당첨' }
          ]
        };
      case 'buyLottery':
        return {
          success: true,
          txId: 'lot_' + Date.now(),
          ticket: { rank: '2등', prize: 10000, msg: '축하합니다! 2등에 당첨되었습니다!' }
        };
      case 'scratchLottery':
        return { success: true, prize: 10000, message: '10,000원이 지급되었습니다!' };
      case 'getJobMarket':
        return {
          success: true,
          jobs: [
            { 직업명: '은행원', 급여: 8000, 모집인원: 2, 현재인원: 1, 역할: '예금 관리 및 이자 계산 지원' },
            { 직업명: '환경미화부장', 급여: 7500, 모집인원: 3, 현재인원: 2, 역할: '교실 청결 상태 점검 및 미화' },
            { 직업명: '방송/기자', 급여: 7000, 모집인원: 2, 현재인원: 1, 역할: '학급 신문 및 주식 뉴스 작성' },
            { 직업명: '우체부', 급여: 6500, 모집인원: 2, 현재인원: 2, 역할: '편지 및 칭찬카드 배달' }
          ]
        };
      case 'getInventory':
        return {
          success: true,
          inventory: [
            { 아이템명: '자리 우선 선택권', 설명: '원하는 자리를 먼저 고를 수 있는 티켓', 상태: '보유' },
            { 아이템명: '숙제 1회 면제권', 설명: '기본 과제 1회 면제 쿠폰', 상태: '보유' },
            { 아이템명: '간식 교환권', 설명: '학급 마트 맛있는 간식 교환 티켓', 상태: '보유' }
          ]
        };
      case 'useItem':
        return { success: true, msg: `아이템을 성공적으로 사용했습니다!` };
      case 'logEmotion':
        return { success: true, msg: `오늘의 기분 [${payload.emotion}] 등록 완료! +500원 보상이 지급되었습니다.` };
      case 'getMailbox':
        return {
          success: true,
          mails: [
            { 일시: '2026-08-28 09:30', 이름: '김철수', 카테고리: '칭찬카드', 메세지: '항상 밝은 미소로 청소를 도와줘서 고마워! 👍' },
            { 일시: '2026-08-28 09:10', 이름: '선생님', 카테고리: '송금우편', 메세지: '학급 자치활동 우수 장학금 5,000원이 입금되었습니다.' }
          ]
        };
      case 'requestSeatTrade':
        return { success: true, msg: `${payload.targetOwner}님에게 좌석 [${payload.seatId}] 구매 요청을 전송했습니다.` };
      case 'initSystemSheets':
        return { success: true, msg: '11개 시스템 시트가 완벽하게 초기화되었습니다.' };
      case 'logChat':
        return { success: true };
      case 'getMarketItems':
        return {
          success: true,
          items: [
            { txId: 'm1', seller: '김철수', itemName: '동화책', price: 2000, desc: '재미있는 이야기책' },
            { txId: 'm2', seller: '박지민', itemName: '수제 책갈피', price: 800, desc: '직접 만든 예쁜 책갈피' }
          ]
        };
      case 'getAssignments':
      case 'adminGetAssignments':
        return {
          success: true,
          assignments: [
            { 과제ID: 'as1', 제목: '2학기 경제 포트폴리오', 내용: '나의 소비 습관과 투자 일지 작성 제출', 기간종료: '2026-09-15', 수당: 5000, 상태: '진행중' },
            { 과제ID: 'as2', 제목: '독서 감상문 쓰기', 내용: '지정 도서 1권 읽고 느낀 점 쓰기', 기간종료: '2026-09-10', 수당: 3000, 상태: '진행중' }
          ]
        };
      case 'getNotices':
        return {
          success: true,
          notices: [
            { 날짜: '2026-08-28', 제목: '🎉 2D 동물의숲 클래스타운 개장 안내!', 내용: '기숙사 미니룸을 꾸미고 친구들과 교류해보세요.', 중요: true },
            { 날짜: '2026-08-27', 제목: '이번 주 금요일 주식 배당금 지급 예정', 내용: '보유 주식 수에 따라 배당금이 지급됩니다.', 중요: false }
          ]
        };
      case 'getMeal':
        return {
          success: true,
          meal: '찰보리밥, 한우소고기미역국, 돈육간장불고기, 상추쌈/쌈장, 배추김치, 멜론'
        };
      case 'getTimetable':
        return {
          success: true,
          timetable: ['1교시: 국어', '2교시: 수학', '3교시: 사회', '4교시: 과학', '5교시: 체육', '6교시: 미술']
        };
      case 'adminAuth':
        return payload.pw === '0513' ? { success: true, isAdmin: true } : { success: false, error: '비밀번호가 일치하지 않습니다.' };
      case 'adminGetAllData':
        return {
          success: true,
          students: [
            { id: 1, 번호: 1, name: '홍길동', 이름: '홍길동', job: '투자왕', 직업명: '투자왕', cash: 120000, 현금: 120000, stock: 30000, 주식: 30000, level: '다이아', 레벨: '다이아', permission: '전체', 권한: '전체' },
            { id: 2, 번호: 2, name: '김철수', 이름: '김철수', job: '은행원', 직업명: '은행원', cash: 50000, 현금: 50000, stock: 20000, 주식: 20000, level: '골드', 레벨: '골드', permission: '은행', 권한: '은행' },
            { id: 3, 번호: 3, name: '이영희', 이름: '이영희', job: '기자', 직업명: '기자', cash: 65000, 현금: 65000, stock: 15000, 주식: 15000, level: '실버', 레벨: '실버', permission: '없음', 권한: '없음' }
          ],
          settings: { 급여: 5000, 세금율: 0.1, 예금이율: 0.05 }
        };
      default:
        return { success: true, message: '요청이 성공적으로 처리되었습니다.' };
    }
  }

  async function callAPI(action, payload = {}, silent = false) {
    if (!silent) showLoading();
    isRequestPending = true;

    try {
      // GAS_URL이 설정되어 있지 않거나 예시 URL인 경우 Mock 데이터 반환
      if (!CONFIG.GAS_URL || CONFIG.GAS_URL.includes('EXAMPLE') || CONFIG.GAS_URL.trim() === '') {
        await new Promise(r => setTimeout(r, 250)); // 실제 통신 느낌의 미세 딜레이
        const res = getMockResponse(action, payload);
        if (!silent) hideLoading();
        isRequestPending = false;
        return res;
      }

      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });

      const data = await res.json();
      if (!silent) hideLoading();
      isRequestPending = false;
      return data;
    } catch (err) {
      console.warn(`[API Network Error] ${action} 요청 중 오류 발생 -> Mock 데이터로 대체합니다:`, err);
      const mockRes = getMockResponse(action, payload);
      if (!silent) hideLoading();
      isRequestPending = false;
      return mockRes;
    }
  }

  return {
    call: callAPI,
    showLoading,
    hideLoading
  };
})();
