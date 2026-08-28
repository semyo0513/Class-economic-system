/**
 * ══════════════════════════════════════════════════════════════════════
 * 클래스뱅크 & 동물의숲 2D 학급경영 REST API 백엔드 (code.gs)
 * 완벽한 구글 시트 1:1 체계화 & 실시간 자산 자동 계산 & 웹앱 통합 게이트웨이
 * ══════════════════════════════════════════════════════════════════════
 */

const SPREADSHEET_ID = '1LR7KcbrRyY5EnZoLPMFmkXSwQtSnBU0PgcEnRmGg8KU'; // 바인딩된 스프레드시트 사용 시 자동 참조
const ADMIN_PASSWORD = '0513';
const TEACHER_EMAIL = 'semyo0513@naver.com';

// ─── 11개 체계적 시트 명칭 정의 ───
const SH = {
  USERS: '사용자',          // 학생 기본정보 및 실시간 자산현황
  SETTINGS: '환경설정',      // 경제 파라미터 및 시스템 정책
  TX_LOG: '거래LOG',        // 모든 입출금, 세금, 주식, 상점 거래 내역
  STOCK: '주식시장',        // 일자별 주가 시세 및 경제 뉴스
  ASSETS: '자산현황',        // 예금, 상점아이템, 캐릭터장착템, 마트물품, 부동산좌석
  LEARNING: '학습관리',      // 공지사항, 숙제
  ACTIVITY: '학급활동',      // 감정신호등, 자기평가, 호출, 칭찬카드, 부동산구매요청
  ASSIGNMENT: '과제',        // 과제 공고 및 학생 제출물
  LOTTERY: '복권',          // 복권 등수별 확률 및 당첨금
  MINIROOM: '미니룸',        // 싸이월드풍 방꾸미기/인벤토리 JSON
  CHAT_LOG: '채팅LOG'       // 실시간 인게임 채팅 로그
};

// ─── 11개 시트 스키마 ───
const SCHEMA = {
  [SH.USERS]: ['번호', '이름', '비밀번호', '직업명', '레벨', '권한', '현금', '주식수량', '주식현재총금액', '총자산'],
  [SH.SETTINGS]: ['항목', '값', '설명'],
  [SH.TX_LOG]: ['일시', '이름', '카테고리', '유형', '금액', '수량', '상대방', '사유', '상태', '거래ID'],
  [SH.STOCK]: ['일시', '카테고리', '값1', '값2', '값3'],
  [SH.ASSETS]: ['일시', '이름', '카테고리', '아이템명', '금액', '수량', '속성', '상태', '구매자', '메타'],
  [SH.LEARNING]: ['일시', '카테고리', 'ID', '제목', '내용', '대상', '마감일', '작성자', '상태', '중요도'],
  [SH.ACTIVITY]: ['일시', '이름', '카테고리', '내용1', '내용2', '내용3', '점수', '상태', '메세지', '답변'],
  [SH.ASSIGNMENT]: ['과제ID', '등록일', '제목', '내용', '기간시작', '기간종료', '파일유형', '수당', '상태', '작성자'],
  [SH.LOTTERY]: ['등수', '상금', '확률', '당첨문구'],
  [SH.MINIROOM]: ['이름', '최종수정일', '방데이터JSON'],
  [SH.CHAT_LOG]: ['일시', '이름', '메시지']
};

/* ══════════════════════════════════════════════
   초기화 및 시트 유틸리티
══════════════════════════════════════════════ */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  // 유사 시트명 별칭 매핑
  const ALIASES = {
    '사용자': ['사용자', '학생', '학생명단', '학생목록', '학생관리'],
    '환경설정': ['환경설정', '설정', '기본설정', '시스템설정'],
    '거래LOG': ['거래LOG', '거래기록', '거래내역', '입출금내역', '로그'],
    '주식시장': ['주식시장', '주식', '증권', '주가'],
    '자산현황': ['자산현황', '상점', '아이템', '상점아이템', '자산'],
    '학습관리': ['학습관리', '공지사항', '공지', '게시판'],
    '학급활동': ['학급활동', '활동기록', '활동', '상벌점'],
    '과제': ['과제', '숙제', '과제제출'],
    '복권': ['복권', '로또', '행운복권'],
    '미니룸': ['미니룸', '기숙사', '방데이터', '하우징'],
    '채팅LOG': ['채팅LOG', '채팅로그', '채팅기록', '채팅']
  };

  const candidateNames = ALIASES[sheetName] || [sheetName];
  for (const name of candidateNames) {
    const found = ss.getSheetByName(name);
    if (found) return found;
  }

  // 없으면 표준 이름으로 신규 생성
  let sh = ss.insertSheet(sheetName);
  const headers = SCHEMA[sheetName] || [];
  if (headers.length > 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// 전체 시스템 시트 자동 초기화
function initSystemSheets() {
  Object.keys(SCHEMA).forEach(name => getOrCreateSheet(name));

  // 1. 기본 환경설정 채우기
  const setSh = getOrCreateSheet(SH.SETTINGS);
  if (setSh.getLastRow() <= 1) {
    const defaults = [
      ['학교명', '행복초등학교', '웹앱 상단에 표시되는 학교 이름'],
      ['세금율', '0.10', '기본 급여 및 송금 세금 비율 (10%)'],
      ['예금_기본이자율', '0.05', '은행 정기예금 연 이율 (5%)'],
      ['복권_가격', '500', '복권 1장 가격'],
      ['감정신호등_보상_활성', '1', '기분 등록 시 장학금 지급 여부 (1=활성)'],
      ['감정신호등_좋음_보상', '500', '좋음 선택 시 지급액'],
      ['감정신호등_보통_보상', '300', '보통 선택 시 지급액'],
      ['감정신호등_힘듦_보상', '1000', '힘듦 선택 시 지급액']
    ];
    defaults.forEach(r => setSh.appendRow(r));
  }

  // 2. 기본 주식 채우기
  const stockSh = getOrCreateSheet(SH.STOCK);
  if (stockSh.getLastRow() <= 1) {
    stockSh.appendRow([nowStr(), '주가', '1200', '', '']);
    stockSh.appendRow([nowStr(), '뉴스', '🎉 2D 동물의숲 클래스타운 개장!', '새로운 학급 경제 시스템이 시작되었습니다.', '상승']);
  }

  // 3. 기본 복권 확률 채우기
  const lotSh = getOrCreateSheet(SH.LOTTERY);
  if (lotSh.getLastRow() <= 1) {
    lotSh.appendRow(['1등', '50000', '0.02', '👑 초대박 1등 당첨! 인생역전!']);
    lotSh.appendRow(['2등', '10000', '0.08', '🎉 축하합니다! 2등 당첨!']);
    lotSh.appendRow(['3등', '3000', '0.20', '✨ 3등 당첨! 쏠쏠한 행운!']);
    lotSh.appendRow(['4등', '500', '0.40', '🎟️ 4등 당첨! 본전 수령!']);
    lotSh.appendRow(['꽝', '0', '0.30', '😢 아쉽네요! 다음 기회에!']);
  }

  // 4. 기본 캐릭터 특수 아이템 등록
  const assetSh = getOrCreateSheet(SH.ASSETS);
  if (assetSh.getLastRow() <= 1) {
    const defaultItems = [
      [nowStr(), '관리자', '캐릭터아이템', '👟 스피드 롤러스케이트', 5000, 99, 'speed_boost:1.8', '판매중', '', '이동속도 80% 증가'],
      [nowStr(), '관리자', '캐릭터아이템', '✨ 황금 오라 이펙트', 8000, 99, 'aura_gold', '판매중', '', '몸 주변에 반짝이는 황금 입자 애니메이션'],
      [nowStr(), '관리자', '캐릭터아이템', '🍄 슈퍼 아이키커 버섯', 6000, 99, 'size_giant:1.5', '판매중', '', '캐릭터 크기 1.5배 거대화'],
      [nowStr(), '관리자', '캐릭터아이템', '🪽 천사의 날개', 10000, 99, 'wings_angel', '판매중', '', '등 뒤에 화려한 천사의 날개 장착'],
      [nowStr(), '관리자', '캐릭터아이템', '🛴 네온 전동 킥보드', 12000, 99, 'mount_kickboard', '판매중', '', '세련된 네온 킥보드 탑승 모드'],
      [nowStr(), '관리자', '아이템', '🪑 자리 우선 선택권', 5000, 10, 'coupon', '판매중', '', '원하는 좌석을 먼저 고를 수 있는 티켓'],
      [nowStr(), '관리자', '아이템', '📝 숙제 1회 면제권', 8000, 5, 'coupon', '판매중', '', '기본 과제 1회 면제 쿠폰'],
      [nowStr(), '관리자', '아이템', '🍫 마트 간식 교환권', 3000, 20, 'coupon', '판매중', '', '학급 마트 맛있는 간식 교환권']
    ];
    defaultItems.forEach(r => assetSh.appendRow(r));
  }

  return { success: true, msg: '11개 시스템 시트가 완벽하게 구성되었습니다.' };
}

function nowStr() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

function sheetToObj(sh) {
  if (!sh || sh.getLastRow() <= 1) return [];
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = { _row: i + 1 };
    headers.forEach((h, col) => {
      let val = data[i][col];
      if (val instanceof Date) val = Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

/* ══════════════════════════════════════════════
   실시간 학생 자산 계산 및 동기화 코어 엔진
══════════════════════════════════════════════ */
function getCurrentStockPrice() {
  const sh = getOrCreateSheet(SH.STOCK);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim() === '주가') return Number(data[i][2]) || 1200;
  }
  return 1200;
}

function getSettings() {
  const sh = getOrCreateSheet(SH.SETTINGS);
  const rows = sheetToObj(sh);
  const map = {};
  rows.forEach(r => { if (r['항목']) map[r['항목']] = r['값']; });
  return map;
}

// 학생 1명의 자산을 시트 상에 실시간 자동 계산/동기화
function syncStudentAssets(studentName) {
  const sh = getOrCreateSheet(SH.USERS);
  const data = sh.getDataRange().getValues();
  const curStockPrice = getCurrentStockPrice();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === studentName) {
      const cash = Number(data[i][6]) || 0;
      const stockQty = Number(data[i][7]) || 0;
      const stockVal = stockQty * curStockPrice;
      const totalAsset = cash + stockVal;

      sh.getRange(i + 1, 9).setValue(stockVal);   // 주식현재총금액
      sh.getRange(i + 1, 10).setValue(totalAsset); // 총자산
      return {
        id: data[i][0],
        name: data[i][1],
        job: data[i][3] || '학생',
        level: data[i][4] || '브론즈',
        permission: data[i][5] || '일반',
        cash: cash,
        stockQty: stockQty,
        stockVal: stockVal,
        totalAsset: totalAsset
      };
    }
  }
  return null;
}

// 모든 학생의 자산 일괄 동기화 및 랭킹 산출
function getStudentsWithAssets() {
  const sh = getOrCreateSheet(SH.USERS);
  if (sh.getLastRow() <= 1) {
    // 기본 더미 학생 데이터가 없을 시 자동 생성
    const defaultStudents = [
      [1, '선생님', '0513', '교사(관리자)', '다이아(Lv.5)', '전체', 999999, 100, 120000, 1119999],
      [2, '홍길동', '1234', '투자왕', '골드(Lv.3)', '은행', 120000, 50, 60000, 180000],
      [3, '김철수', '1234', '은행원', '실버(Lv.2)', '은행', 65000, 20, 24000, 89000],
      [4, '이영희', '1234', '기자', '실버(Lv.2)', '임원', 55000, 15, 18000, 73000],
      [5, '박민우', '1234', '환경미화', '브론즈(Lv.1)', '일반', 40000, 5, 6000, 46000],
      [6, '최수진', '1234', '우체부', '브론즈(Lv.1)', '일반', 35000, 10, 12000, 47000]
    ];
    defaultStudents.forEach(r => sh.appendRow(r));
  }

  const curPrice = getCurrentStockPrice();
  const rows = sheetToObj(sh);
  const result = [];

  rows.forEach(r => {
    const cash = Number(r['현금'] || 0);
    const stockQty = Number(r['주식수량'] || 0);
    const stockVal = stockQty * curPrice;
    const totalAsset = cash + stockVal;

    result.push({
      id: r['번호'] || r._row - 1,
      name: String(r['이름']).trim(),
      pw: String(r['비밀번호'] || ''),
      job: r['직업명'] || '학생',
      level: r['레벨'] || '브론즈',
      permission: r['권한'] || '일반',
      cash: cash,
      stockQty: stockQty,
      stockVal: stockVal,
      totalAsset: totalAsset
    });
  });

  result.sort((a, b) => b.totalAsset - a.totalAsset);
  return result;
}

function updateCash(name, delta, reason, cat) {
  const sh = getOrCreateSheet(SH.USERS);
  const data = sh.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === name) {
      const cur = Number(data[i][6]) || 0;
      const next = Math.max(0, cur + delta);
      sh.getRange(i + 1, 7).setValue(next);
      found = true;
      break;
    }
  }

  if (found) {
    syncStudentAssets(name);
    logTx(name, cat || '현금', delta >= 0 ? '수입' : '지출', Math.abs(delta), 1, '', reason, '완료');
  }
  return found;
}

function updateStockQty(name, deltaQty, price, reason) {
  const sh = getOrCreateSheet(SH.USERS);
  const data = sh.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === name) {
      const cur = Number(data[i][7]) || 0;
      const next = Math.max(0, cur + deltaQty);
      sh.getRange(i + 1, 8).setValue(next);
      found = true;
      break;
    }
  }

  if (found) {
    syncStudentAssets(name);
    logTx(name, '주식', deltaQty >= 0 ? '매수' : '매도', price * Math.abs(deltaQty), Math.abs(deltaQty), '', reason, '완료');
  }
  return found;
}

function logTx(name, cat, type, amount, qty, target, reason, status) {
  const txId = 'TX' + Date.now().toString().slice(-7);
  getOrCreateSheet(SH.TX_LOG).appendRow([
    nowStr(), name, cat, type, Number(amount || 0), qty || 1, target || '', reason || '', status || '완료', txId
  ]);
  return txId;
}

/* ══════════════════════════════════════════════
   REST API 디스패처 (doPost & doGet)
══════════════════════════════════════════════ */
function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  let params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (_) {
      params = e.parameter || {};
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }
  return handleRequest(params);
}

function handleRequest(params) {
  const action = params.action || 'getInitData';
  const payload = params.payload || params;
  let result = { success: false, msg: '알 수 없는 요청' };

  try {
    switch (action) {
      // 1. 초기화 & 인증
      case 'initSystemSheets':
        result = initSystemSheets();
        break;

      case 'studentLogin': {
        const studentName = String(payload.name || '학생').trim();
        const inputPw = String(payload.pw || '').trim();
        let students = getStudentsWithAssets();
        let found = students.find(s => s.name === studentName);

        if (!found) {
          // 시트에 등록되지 않은 신규 학생일 경우 자동 등록!
          const sh = getOrCreateSheet(SH.USERS);
          const newId = sh.getLastRow();
          const initialCash = 50000;
          const initialStock = 10;
          const curP = getCurrentStockPrice();
          sh.appendRow([newId, studentName, inputPw || '1234', '학생', '브론즈(Lv.1)', '일반', initialCash, initialStock, initialStock * curP, initialCash + (initialStock * curP)]);
          students = getStudentsWithAssets();
          found = students.find(s => s.name === studentName);
        } else if (found.pw && inputPw && String(found.pw) !== inputPw) {
          return respond({ success: false, msg: '비밀번호가 일치하지 않습니다.' });
        }

        result = {
          success: true,
          student: found || { id: 1, name: studentName, job: '학생', level: '브론즈(Lv.1)', permission: '일반', cash: 50000, stockQty: 10, totalAsset: 62000 },
          settings: getSettings(),
          ranking: students.map((s, idx) => ({ rank: idx + 1, name: s.name, total: s.totalAsset, job: s.job, level: s.level }))
        };
        break;
      }

      case 'adminAuth': {
        const ok = String(payload.pw) === ADMIN_PASSWORD;
        result = { success: ok, isAdmin: ok, msg: ok ? '관리자 인증 성공' : '비밀번호 불일치' };
        break;
      }

      case 'adminGetAllData': {
        const students = getStudentsWithAssets();
        result = {
          success: true,
          students: students,
          settings: getSettings(),
          stockPrice: getCurrentStockPrice()
        };
        break;
      }

      // 2. 은행 예금
      case 'getDeposits': {
        const rows = sheetToObj(getOrCreateSheet(SH.ASSETS))
          .filter(r => r['카테고리'] === '예금' && String(r['이름']).trim() === payload.name);
        const rate = Number(getSettings()['예금_기본이자율'] || 0.05);
        result = { success: true, rate: rate, deposits: rows };
        break;
      }

      case 'depositMoney': {
        const amt = Number(payload.amount);
        if (amt < 1000) return respond({ success: false, msg: '최소 1,000원 이상 예금 가능합니다.' });
        const st = syncStudentAssets(payload.name);
        if (!st || st.cash < amt) return respond({ success: false, msg: '현금 잔액이 부족합니다.' });
        
        const rate = Number(getSettings()['예금_기본이자율'] || 0.05);
        getOrCreateSheet(SH.ASSETS).appendRow([nowStr(), payload.name, '예금', '정기예금', amt, 1, rate, '활성', '', '']);
        updateCash(payload.name, -amt, '정기예금 가입', '예금');
        result = { success: true, msg: `${amt.toLocaleString()}원 예금에 가입되었습니다. (이율 ${(rate*100).toFixed(1)}%)` };
        break;
      }

      case 'withdrawDeposit': {
        const sh = getOrCreateSheet(SH.ASSETS);
        const rows = sheetToObj(sh).filter(r => r['카테고리'] === '예금' && String(r['이름']).trim() === payload.name);
        const dep = rows[payload.rowIdx || 0];
        if (!dep || dep['상태'] !== '활성') return respond({ success: false, msg: '해지할 수 없는 예금입니다.' });

        const base = Number(dep['금액'] || 0);
        const rate = Number(dep['속성'] || 0.05);
        const total = Math.floor(base * (1 + rate));

        sh.getRange(dep._row, 8).setValue('해지');
        updateCash(payload.name, total, '예금 만기 해지(원금+이자)', '예금');
        result = { success: true, msg: `예금이 해지되어 ${total.toLocaleString()}원이 지급되었습니다.` };
        break;
      }

      // 3. 주식 시장
      case 'getStockData': {
        const rows = sheetToObj(getOrCreateSheet(SH.STOCK));
        const hist = rows.filter(r => r['카테고리'] === '주가').map(r => ({
          date: String(r['일시']).slice(5, 10),
          price: Number(r['값1'] || 1200)
        }));
        const news = rows.filter(r => r['카테고리'] === '뉴스').reverse().map(r => ({
          제목: r['값1'], 내용: r['값2'], 영향: r['값3']
        }));
        const curP = getCurrentStockPrice();
        if (hist.length === 0) hist.push({ date: '오늘', price: curP });
        result = {
          success: true,
          info: { 현재가: curP },
          currentPrice: curP,
          history: hist,
          news: news
        };
        break;
      }

      case 'tradeStock': {
        const qty = Number(payload.qty || 1);
        const type = payload.type; // '매수' | '매도'
        const curP = getCurrentStockPrice();
        const st = syncStudentAssets(payload.name);
        if (!st) return respond({ success: false, msg: '학생 정보를 찾을 수 없습니다.' });

        if (type === '매수') {
          const cost = curP * qty;
          if (st.cash < cost) return respond({ success: false, msg: `잔액이 부족합니다! (필요: ${cost.toLocaleString()}원)` });
          updateCash(payload.name, -cost, `주식 ${qty}주 매수`, '주식');
          updateStockQty(payload.name, qty, curP, `주식매수 ${qty}주@${curP}`);
          result = { success: true, msg: `주식 ${qty}주를 ${cost.toLocaleString()}원에 매수했습니다!` };
        } else {
          if (st.stockQty < qty) return respond({ success: false, msg: '보유 주식이 부족합니다.' });
          const income = curP * qty;
          updateStockQty(payload.name, -qty, curP, `주식매도 ${qty}주@${curP}`);
          updateCash(payload.name, income, `주식 ${qty}주 매도`, '주식');
          result = { success: true, msg: `주식 ${qty}주를 매도하여 ${income.toLocaleString()}원을 수령했습니다!` };
        }
        break;
      }

      case 'adminUpdateStock': {
        const newP = Number(payload.price || 1300);
        const title = payload.title || '학급 경제 호재';
        const impact = payload.impact || '상승';
        getOrCreateSheet(SH.STOCK).appendRow([nowStr(), '주가', newP, '', '']);
        getOrCreateSheet(SH.STOCK).appendRow([nowStr(), '뉴스', title, payload.content || '', impact]);
        result = { success: true, msg: `신규 주가(${newP}원)와 뉴스가 발행되었습니다.` };
        break;
      }

      // 4. 인벤토리 & 캐릭터 장착 아이템
      case 'getInventory': {
        const inv = sheetToObj(getOrCreateSheet(SH.ASSETS))
          .filter(r => (r['카테고리'] === '아이템' || r['카테고리'] === '캐릭터아이템') && String(r['이름']).trim() === payload.name && r['상태'] === '보유');
        result = { success: true, inventory: inv };
        break;
      }

      case 'getShopItems': {
        let items = sheetToObj(getOrCreateSheet(SH.ASSETS))
          .filter(r => (r['카테고리'] === '아이템' || r['카테고리'] === '캐릭터아이템') && r['상태'] === '판매중' && Number(r['수량'] || 0) > 0);
        if (items.length === 0) {
          initSystemSheets();
          items = sheetToObj(getOrCreateSheet(SH.ASSETS))
            .filter(r => (r['카테고리'] === '아이템' || r['카테고리'] === '캐릭터아이템') && r['상태'] === '판매중' && Number(r['수량'] || 0) > 0);
        }
        result = { success: true, items: items };
        break;
      }

      case 'buyItem': {
        const itemName = payload.itemName;
        const sh = getOrCreateSheet(SH.ASSETS);
        const data = sh.getDataRange().getValues();
        let targetRow = -1, price = 0, stock = 0, cat = '아이템', prop = '';

        for (let i = 1; i < data.length; i++) {
          if ((data[i][2] === '아이템' || data[i][2] === '캐릭터아이템') && data[i][3] === itemName && data[i][7] === '판매중') {
            targetRow = i + 1;
            cat = data[i][2];
            price = Number(data[i][4]);
            stock = Number(data[i][5]);
            prop = data[i][6];
            break;
          }
        }

        if (targetRow < 0 || stock <= 0) return respond({ success: false, msg: '품절되었거나 없는 아이템입니다.' });
        const st = syncStudentAssets(payload.name);
        if (!st || st.cash < price) return respond({ success: false, msg: '잔액이 부족합니다.' });

        sh.getRange(targetRow, 6).setValue(stock - 1);
        sh.appendRow([nowStr(), payload.name, cat, itemName, price, 1, prop, '보유', '', '']);
        updateCash(payload.name, -price, `[상점구매] ${itemName}`, '상점');
        result = { success: true, msg: `[${itemName}] 아이템을 구매했습니다!` };
        break;
      }

      case 'useItem': {
        const sh = getOrCreateSheet(SH.ASSETS);
        const data = sh.getDataRange().getValues();
        let found = false;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).trim() === payload.name && (data[i][2] === '아이템' || data[i][2] === '캐릭터아이템') && data[i][3] === payload.itemName && data[i][7] === '보유') {
            sh.getRange(i + 1, 8).setValue('사용됨');
            found = true;
            break;
          }
        }
        result = { success: found, msg: found ? `[${payload.itemName}] 아이템을 사용했습니다!` : '보유 중인 아이템이 아닙니다.' };
        break;
      }

      // 5. 복권 시스템
      case 'getLotteryInfo': {
        const cfg = getSettings();
        result = { success: true, price: Number(cfg['복권_가격'] || 500) };
        break;
      }

      case 'buyLottery': {
        const cfg = getSettings();
        const price = Number(cfg['복권_가격'] || 500);
        const st = syncStudentAssets(payload.name);
        if (!st || st.cash < price) return respond({ success: false, msg: '현금 잔액이 부족합니다.' });

        const txId = 'LOT' + Date.now().toString().slice(-6);
        updateCash(payload.name, -price, '복권 구매', '복권');
        result = { success: true, txId: txId, msg: '복권 구매 완료' };
        break;
      }

      case 'scratchLottery': {
        const lotRows = sheetToObj(getOrCreateSheet(SH.LOTTERY));
        const rand = Math.random();
        let cum = 0;
        let won = lotRows[lotRows.length - 1] || { 등수: '꽝', 상금: 0, 당첨문구: '다음 기회에!' };

        for (const r of lotRows) {
          cum += Number(r['확률'] || 0);
          if (rand <= cum) {
            won = r;
            break;
          }
        }

        const prize = Number(won['상금'] || 0);
        if (prize > 0) {
          updateCash(payload.name, prize, `복권 당첨 (${won['등수']})`, '복권');
        }

        result = {
          success: true,
          prize: prize,
          title: won['등수'] + (prize > 0 ? ' 당첨!' : ''),
          msg: won['당첨문구'] || `${prize.toLocaleString()}원 획득!`
        };
        break;
      }

      // 6. 학급마트 간편결제
      case 'getMartItems': {
        const sh = getOrCreateSheet(SH.ASSETS);
        let items = sheetToObj(sh)
          .filter(r => r['카테고리'] === '마트물품' && r['상태'] === '판매중' && Number(r['수량'] || 0) > 0);
        if (items.length === 0) {
          const defaultMarts = [
            [nowStr(), '선생님', '마트물품', '초코파이', 800, 20, '', '판매중', '', '달콤한 초코파이 간식'],
            [nowStr(), '선생님', '마트물품', '비타민 음료', 1200, 15, '', '판매중', '', '상큼한 활력 비타민 음료'],
            [nowStr(), '선생님', '마트물품', '고급 형광펜', 1500, 10, '', '판매중', '', '필기용 네온 형광펜'],
            [nowStr(), '선생님', '마트물품', '과일 젤리 세트', 600, 25, '', '판매중', '', '쫀득쫀득 맛있는 젤리']
          ];
          defaultMarts.forEach(r => sh.appendRow(r));
          items = sheetToObj(sh).filter(r => r['카테고리'] === '마트물품' && r['상태'] === '판매중');
        }
        result = { success: true, items: items };
        break;
      }

      case 'martPay': {
        const amt = Number(payload.amount);
        const buyer = payload.buyerName;
        const itemName = payload.itemName || '자율결제';
        const st = syncStudentAssets(buyer);
        if (!st || st.cash < amt) return respond({ success: false, msg: '현금 잔액이 부족합니다.' });

        updateCash(buyer, -amt, `[학급마트] ${itemName}`, '마트');
        const txId = 'MART' + Date.now().toString().slice(-6);
        result = { success: true, receipt: { id: txId, item: itemName, amount: amt, date: nowStr() } };
        break;
      }

      // 7. 감정 신호등
      case 'logEmotion': {
        const emotion = payload.emotion || '🟢 좋음';
        const cfg = getSettings();
        const bonusMap = {
          '🟢 좋음': Number(cfg['감정신호등_좋음_보상'] || 500),
          '🟡 보통': Number(cfg['감정신호등_보통_보상'] || 300),
          '🔴 힘듦': Number(cfg['감정신호등_힘듦_보상'] || 1000)
        };
        const bonus = bonusMap[emotion] || 500;

        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), payload.name, '감정신호등', emotion, '', '', bonus, '완료', payload.message || '', ''
        ]);

        if (bonus > 0) {
          updateCash(payload.name, bonus, `감정신호등 참여 보상(${emotion})`, '활동보상');
        }

        result = { success: true, msg: `오늘의 기분 [${emotion}] 등록 완료! +${bonus.toLocaleString()}원 장학금 지급!` };
        break;
      }

      // 8. 부동산 좌석 & 구매 요청
      case 'getRealEstateData': {
        const sh = getOrCreateSheet(SH.ASSETS);
        const rows = sheetToObj(sh).filter(r => r['카테고리'] === '부동산좌석');
        const students = getStudentsWithAssets();

        const seats = Array.from({ length: 24 }, (_, i) => {
          const id = `seat_${i + 1}`;
          const existing = rows.find(r => r['아이템명'] === id);
          return {
            id: id,
            row: Math.floor(i / 6) + 1,
            col: (i % 6) + 1,
            owner: existing ? existing['이름'] : (students[i % students.length]?.name || ''),
            isForSale: existing ? existing['상태'] === '매물' : (i % 5 === 0),
            price: existing ? Number(existing['금액']) : 5000 + i * 500
          };
        });
        result = { success: true, seats: seats };
        break;
      }

      case 'requestSeatTrade': {
        const fromName = payload.fromName;
        const targetOwner = payload.targetOwner;
        const seatId = payload.seatId;
        const offerPrice = Number(payload.offerPrice || 5000);

        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), fromName, '부동산요청', seatId, offerPrice, targetOwner, 0, '대기', `${fromName}님이 좌석 [${seatId}]을(를) ${offerPrice.toLocaleString()}원에 양도 요청했습니다.`, ''
        ]);

        result = { success: true, msg: `${targetOwner}님에게 좌석 [${seatId}] 구매 요청을 전송했습니다.` };
        break;
      }

      // 9. 우체국 & 송금 & 우편함
      case 'transferMoney': {
        const fromName = payload.fromName;
        const toName = payload.toName;
        const amt = Number(payload.amount);
        const st = syncStudentAssets(fromName);
        if (!st || st.cash < amt) return respond({ success: false, msg: '잔액이 부족합니다.' });

        updateCash(fromName, -amt, `${toName}에게 송금`, '송금');
        updateCash(toName, amt, `${fromName}로부터 송금`, '송금');

        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), fromName, '송금우편', amt, toName, '', 0, '완료', `${fromName}님이 ${amt.toLocaleString()}원을 송금했습니다.`, ''
        ]);

        result = { success: true, msg: `${toName}님에게 ${amt.toLocaleString()}원 송금이 완료되었습니다.` };
        break;
      }

      case 'getMailbox': {
        const rows = sheetToObj(getOrCreateSheet(SH.ACTIVITY))
          .filter(r => (r['내용2'] === payload.name || r['이름'] === payload.name) && (r['카테고리'] === '송금우편' || r['카테고리'] === '칭찬카드' || r['카테고리'] === '부동산요청' || r['카테고리'] === '호출답변'))
          .reverse();
        result = { success: true, mails: rows };
        break;
      }

      // 10. 미니룸 & 싸이월드 방 저장
      case 'saveRoomData': {
        const sh = getOrCreateSheet(SH.MINIROOM);
        const data = sh.getDataRange().getValues();
        let foundRow = -1;
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]).trim() === payload.name) {
            foundRow = i + 1;
            break;
          }
        }
        const jsonStr = JSON.stringify(payload.roomData || {});
        if (foundRow > 0) {
          sh.getRange(foundRow, 2).setValue(nowStr());
          sh.getRange(foundRow, 3).setValue(jsonStr);
        } else {
          sh.appendRow([payload.name, nowStr(), jsonStr]);
        }
        result = { success: true, msg: '미니룸이 시트에 안전하게 백업되었습니다.' };
        break;
      }

      case 'getRoomData': {
        const rows = sheetToObj(getOrCreateSheet(SH.MINIROOM));
        const found = rows.find(r => String(r['이름']).trim() === payload.name);
        result = {
          success: true,
          roomData: found && found['방데이터JSON'] ? JSON.parse(found['방데이터JSON']) : null
        };
        break;
      }

      // 11. 인게임 실시간 채팅 시트 기록
      case 'logChat': {
        if (payload.name && payload.msg) {
          getOrCreateSheet(SH.CHAT_LOG).appendRow([nowStr(), payload.name, payload.msg]);
        }
        result = { success: true };
        break;
      }

      // 12. 공지사항 & 과제
      case 'getNotices': {
        const sh = getOrCreateSheet(SH.LEARNING);
        let rows = sheetToObj(sh).filter(r => r['카테고리'] === '공지').reverse();
        if (rows.length === 0) {
          sh.appendRow([nowStr(), '공지', 'N1', '🎉 2D 동물의숲 클래스타운 개장 안내!', '기숙사 미니룸을 꾸미고 친구들과 교류해보세요.', 'all', '', '선생님', '활성', '긴급']);
          sh.appendRow([nowStr(), '공지', 'N2', '이번 주 금요일 주식 배당금 지급 안내', '보유 주식 수에 따라 배당금이 지급됩니다.', 'all', '', '선생님', '활성', '일반']);
          rows = sheetToObj(sh).filter(r => r['카테고리'] === '공지').reverse();
        }
        result = { success: true, notices: rows };
        break;
      }

      case 'adminAddNotice': {
        const title = payload.title || '새 공지사항';
        const content = payload.content || '';
        const isUrgent = payload.isUrgent ? '긴급' : '일반';
        const id = 'NOTI' + Date.now().toString().slice(-6);
        getOrCreateSheet(SH.LEARNING).appendRow([
          nowStr(), '공지', id, title, content, 'all', '', '선생님', '활성', isUrgent
        ]);
        result = { success: true, msg: '공지사항이 성공적으로 등록되었습니다!' };
        break;
      }

      case 'getAssignments': {
        const sh = getOrCreateSheet(SH.ASSIGNMENT);
        let rows = sheetToObj(sh).reverse();
        if (rows.length === 0) {
          sh.appendRow(['as1', '2026-08-28', '2학기 경제 포트폴리오 작성', '나의 소비 습관과 투자 일지 작성 제출', '2026-08-28', '2026-09-15', '문서', 5000, '진행중', '선생님']);
          sh.appendRow(['as2', '2026-08-28', '금융/경제 독서 감상문 쓰기', '지정 도서 1권 읽고 느낀 점 쓰기', '2026-08-28', '2026-09-10', '문서', 3000, '진행중', '선생님']);
          rows = sheetToObj(sh).reverse();
        }
        result = { success: true, assignments: rows };
        break;
      }

      case 'submitAssignment': {
        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), payload.name, '과제제출', payload.assignmentId, '', '', 0, '제출완료', payload.memo || '', ''
        ]);
        result = { success: true, msg: '과제가 정상적으로 제출되었습니다!' };
        break;
      }

      // 13. [관리 & 상호작용 코어] 월급배부, 벌금징수, 경고, 칭찬카드, 마트관리
      case 'adminPaySalaries': {
        const amount = Number(payload.amount || 5000);
        const students = getStudentsWithAssets();
        let count = 0;
        students.forEach(st => {
          if (st.name !== '선생님') {
            updateCash(st.name, amount, '월급(기본급) 일괄 배부', '월급');
            count++;
          }
        });
        result = { success: true, msg: `전체 ${count}명의 학생에게 월급 ${amount.toLocaleString()}원이 배부되었습니다.` };
        break;
      }

      case 'adminFineStudent': {
        const target = payload.targetName;
        const fine = Number(payload.amount || 1000);
        const reason = payload.reason || '학급 규칙 위반';
        updateCash(target, -fine, `[벌금징수] ${reason}`, '벌금');
        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), '선생님', '벌금징수', fine, target, '', 0, '완료', `[벌금 고지] ${reason} (-${fine.toLocaleString()}원)`, ''
        ]);
        result = { success: true, msg: `${target} 학생에게 벌금 ${fine.toLocaleString()}원이 징수되었습니다.` };
        break;
      }

      case 'adminWarnStudent': {
        const target = payload.targetName;
        const reason = payload.reason || '경고 주의 조치';
        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), '선생님', '경고장', '경고', target, '', 0, '완료', `⚠️ [선생님 경고장] ${reason}`, ''
        ]);
        result = { success: true, msg: `${target} 학생에게 경고장이 전달되었습니다.` };
        break;
      }

      case 'sendPraiseCard': {
        const from = payload.fromName || '익명';
        const to = payload.targetName;
        const msg = payload.message || '너를 칭찬해!';
        const bonus = Number(payload.bonus || 500);
        if (bonus > 0) {
          updateCash(to, bonus, `[칭찬카드 보너스] from ${from}`, '칭찬보상');
        }
        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), from, '칭찬카드', bonus, to, '', 0, '완료', `💌 [칭찬카드] "${msg}" ${bonus > 0 ? `(+${bonus.toLocaleString()}원)` : ''}`, ''
        ]);
        result = { success: true, msg: `${to} 학생에게 칭찬카드가 전달되었습니다!` };
        break;
      }

      case 'addMartItem': {
        const itemName = payload.itemName;
        const price = Number(payload.price || 1000);
        const stock = Number(payload.stock || 10);
        const desc = payload.desc || '학급마트 간식';
        getOrCreateSheet(SH.ASSETS).appendRow([
          nowStr(), payload.ownerName || '선생님', '마트물품', itemName, price, stock, '', '판매중', '', desc
        ]);
        result = { success: true, msg: `[${itemName}] 마트 물품이 등록되었습니다!` };
        break;
      }

      case 'updateCash': {
        const name = payload.name;
        const delta = Number(payload.delta || 0);
        const reason = payload.reason || '관리자 조정';
        updateCash(name, delta, reason, '관리자조정');
        result = { success: true, msg: `${name} 학생의 잔액이 조정되었습니다.` };
        break;
      }

      default:
        result = { success: true, msg: '요청이 수신되었습니다.' };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return respond(result);
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}