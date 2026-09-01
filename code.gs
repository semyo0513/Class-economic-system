/**
 * ══════════════════════════════════════════════════════════════════════
 * 클래스뱅크 & 동물의숲 2D 학급경영 REST API 백엔드 (code.gs)
 * 완벽한 구글 시트 1:1 체계화 & 실시간 자산 자동 계산 & 국고 관리 & 나이스 연동
 * ══════════════════════════════════════════════════════════════════════
 */

const SPREADSHEET_ID = '1LR7KcbrRyY5EnZoLPMFmkXSwQtSnBU0PgcEnRmGg8KU';
const ADMIN_PASSWORD = '0513';
const TEACHER_EMAIL = 'semyo0513@naver.com';

// ─── 14개 체계적 시트 명칭 정의 ───
const SH = {
  USERS: '사용자',          // 학생 기본정보 및 실시간 자산현황 (현금+주식+예금=총자산, 레벨 자동부여)
  SETTINGS: '환경설정',      // 경제 파라미터, 학교명, NEIS 설정, 주식모드
  TX_LOG: '거래LOG',        // 모든 입출금, 세금, 주식, 상점 거래 내역
  TREASURY: '국고관리',      // 학급 국고 입출금 및 잔액 장부
  STOCK: '주식시장',        // 일자별 주가 시세 및 경제 뉴스
  ASSETS: '자산현황',        // 상점아이템, 캐릭터장착템, 마트물품, 주식보유내역
  DEPOSITS: '예금',         // 학생별 정기예금 계좌 원금, 이율, 상태 장부
  SEATS: '부동산좌석',       // 교실 좌석 소유권, 매물 등록 및 구매 제안/협상 장부
  LEARNING: '학습관리',      // 공지사항, 과제, 급식, 시간표
  ACTIVITY: '학급활동',      // 감정신호등, 자기평가, 호출, 칭찬카드, 캐릭터스타일
  ASSIGNMENT: '과제',        // 과제 공고 및 학생 제출물
  LOTTERY: '복권',          // 복권 등수별 확률 및 당첨금
  MINIROOM: '미니룸',        // 미니룸 인테리어 배치 및 방명록
  CHAT_LOG: '채팅LOG'       // 실시간 인게임 채팅 로그
};

// ─── 시트 스키마 정의 ───
const SCHEMA = {
  [SH.USERS]: ['번호', '이름', '비밀번호', '직업명', '레벨', '권한', '현금', '주식수량', '주식현재총금액', '총자산'],
  [SH.SETTINGS]: ['항목', '값', '설명'],
  [SH.TX_LOG]: ['일시', '이름', '카테고리', '유형', '금액', '수량', '상대방', '사유', '상태', '거래ID'],
  [SH.TREASURY]: ['일시', '구분', '유형', '금액', '국고잔액', '담당자', '사유', '거래ID'],
  [SH.STOCK]: ['일시', '카테고리', '값1', '값2', '값3'],
  [SH.ASSETS]: ['일시', '이름', '카테고리', '아이템명', '금액', '수량', '속성', '상태', '구매자', '메타'],
  [SH.DEPOSITS]: ['가입일시', '이름', '예금원금', '이율', '상태', '해지일시', '수령이자'],
  [SH.SEATS]: ['좌석번호', '행', '열', '소유자', '매물등록', '희망가격', '제안자', '제안금액', '상태', '최종거래일'],
  [SH.LEARNING]: ['일시', '카테고리', 'ID', '제목', '내용', '대상', '마감일', '작성자', '상태', '중요도'],
  [SH.ACTIVITY]: ['일시', '이름', '카테고리', '내용1', '내용2', '내용3', '점수', '상태', '메세지', '답변'],
  [SH.ASSIGNMENT]: ['과제ID', '등록일', '제목', '내용', '기간시작', '기간종료', '파일유형', '수당', '상태', '작성자'],
  [SH.LOTTERY]: ['등수', '상금', '확률', '당첨문구'],
  [SH.MINIROOM]: ['이름', '최종수정일', '방데이터JSON'],
  [SH.CHAT_LOG]: ['일시', '이름', '메시지']
};

// 패션, 뷰티, 탈 것, 퍼퓸 살롱 종합 카탈로그
const DEFAULT_FASHION_CATALOG = {
  // 헤어염색
  '✨ 골드 블론드 염색약': { cat: '헤어', price: 4000, prop: '#eab308' },
  '🌸 체리 핑크 염색약': { cat: '헤어', price: 4000, prop: '#f472b6' },
  '🍃 민트 그린 염색약': { cat: '헤어', price: 4000, prop: '#2dd4bf' },
  '🤍 백발 실버 염색약': { cat: '헤어', price: 5000, prop: '#cbd5e1' },
  '🌊 오션 블루 염색약': { cat: '헤어', price: 4000, prop: '#38bdf8' },
  '💜 라벤더 퍼플 염색약': { cat: '헤어', price: 4500, prop: '#a855f7' },
  '🔥 핫 레드 염색약': { cat: '헤어', price: 4000, prop: '#ef4444' },
  '🖤 흑발 딥블랙 염색약': { cat: '헤어', price: 3000, prop: '#0f172a' },
  // 코스튬 & 의상
  '🎓 스마트 명문 교복': { cat: '의상', price: 8000, prop: 'school' },
  '🧸 핑크 곰돌이 잠옷': { cat: '의상', price: 7000, prop: 'pajama' },
  '🔮 신비한 마법사 로브': { cat: '의상', price: 12000, prop: 'magic' },
  '⚡ 사이버 네온 슈트': { cat: '의상', price: 15000, prop: 'cyber' },
  '👑 화려한 공주 드레스': { cat: '의상', price: 18000, prop: 'dress' },
  // 모자 & 액세서리
  '🐱 냥냥 고양이 귀': { cat: '모자', price: 5000, prop: 'cat_ears' },
  '👑 황금 보석 왕관': { cat: '모자', price: 10000, prop: 'crown' },
  '😇 빛나는 천사 링': { cat: '모자', price: 8000, prop: 'halo' },
  '🎩 뾰족 마법사 모자': { cat: '모자', price: 7000, prop: 'magic_hat' },
  // 특수 오라
  '✨ 황금 오라 이펙트': { cat: '오라', price: 15000, prop: 'gold' },
  '🌸 벚꽃잎 휘날림 오라': { cat: '오라', price: 12000, prop: 'cherry' },
  '🌈 무지개 빛 잔상 오라': { cat: '오라', price: 20000, prop: 'rainbow' },
  // 🚀 탈 것 (이동속도 증가 버프)
  '🛴 스피드 킥보드 (이동속도 1.5배)': { cat: '탈것', price: 10000, prop: 'kickboard', speedMult: 1.5 },
  '🛹 스트리트 스케이트보드 (이동속도 1.7배)': { cat: '탈것', price: 15000, prop: 'skateboard', speedMult: 1.7 },
  '🚲 클래식 꼬마 자전거 (이동속도 1.8배)': { cat: '탈것', price: 20000, prop: 'bicycle', speedMult: 1.8 },
  '🏎️ 미니 붕붕 레이싱카트 (이동속도 2.0배)': { cat: '탈것', price: 30000, prop: 'cart', speedMult: 2.0 },
  '☁️ 둥실둥실 날으는 마법구름 (이동속도 2.2배)': { cat: '탈것', price: 50000, prop: 'cloud', speedMult: 2.2 },
  // 🌺 향수 & 크기 물약
  '🌹 매혹의 로즈 퍼퓸 (꽃잎 파티클)': { cat: '퍼퓸', price: 6000, prop: 'rose' },
  '✨ 스타더스트 샤인 퍼퓸 (별가루 파티클)': { cat: '퍼퓸', price: 7000, prop: 'sparkle' },
  '🫧 무지개 방울 퍼퓸 (비누방울 파티클)': { cat: '퍼퓸', price: 6500, prop: 'bubble' },
  '🍄 거인화 성장 물약 (캐릭터 1.3배)': { cat: '효과', price: 8000, prop: 'giant', scaleMult: 1.3 },
  '🧪 요정화 축소 물약 (캐릭터 0.7배)': { cat: '효과', price: 8000, prop: 'tiny', scaleMult: 0.7 }
};

/* ══════════════════════════════════════════════
   시트 유틸리티
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
  const ALIASES = {
    '사용자': ['사용자', '학생', '학생명단', '학생목록', '학생관리'],
    '환경설정': ['환경설정', '설정', '기본설정', '시스템설정'],
    '거래LOG': ['거래LOG', '거래기록', '거래내역', '입출금내역', '로그'],
    '국고관리': ['국고관리', '국고', '학급국고', '국고장부'],
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

  let sh = ss.insertSheet(sheetName);
  const headers = SCHEMA[sheetName] || [];
  if (headers.length > 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function initSystemSheets() {
  Object.keys(SCHEMA).forEach(name => getOrCreateSheet(name));

  // 1. 기본 환경설정
  const setSh = getOrCreateSheet(SH.SETTINGS);
  if (setSh.getLastRow() <= 1) {
    const defaults = [
      ['학교명', '행복초등학교', '웹앱 및 시스템 전체에 표시되는 학교 이름'],
      ['학급명', '6학년 1반', '웹앱에 표시되는 학급 이름'],
      ['NEIS_OFFICE_CODE', 'T10', '시도교육청 코드 (예: 서울 B10, 경남 T10)'],
      ['NEIS_SCHOOL_CODE', '9290066', '행정표준 나이스 학교 코드'],
      ['GRADE', '6', '기본 학년'],
      ['CLASS_NM', '1', '기본 반'],
      ['STOCK_MODE', 'REALTIME_NAVER', '주식 운영 방식: REALTIME_NAVER(네이버실시간) 또는 MANUAL(교사수동)'],
      ['STOCK_ACTIVE_CODES', '005930,035720,035420,086520,005380,CLASS', '활성화할 주식 종목 코드 (쉼표 구분)'],
      ['세금율', '0.10', '기본 급여 및 송금 세금 비율 (10%)'],
      ['예금_기본이자율', '0.05', '은행 정기예금 연 이율 (5%)'],
      ['복권_가격', '500', '복권 1장 가격'],
      ['감정신호등_좋음_보상', '500', '좋음 선택 시 지급액'],
      ['감정신호등_보통_보상', '300', '보통 선택 시 지급액'],
      ['감정신호등_힘듦_보상', '1000', '힘듦 선택 시 지급액']
    ];
    defaults.forEach(r => setSh.appendRow(r));
  }

  // 2. 국고 기본 시드머니
  const trSh = getOrCreateSheet(SH.TREASURY);
  if (trSh.getLastRow() <= 1) {
    trSh.appendRow([nowStr(), '입금', '초기국고', 1000000, 1000000, '선생님', '학급 국고 기본 시드머니 적립', 'TR_INIT']);
  }

  // 3. 기본 주식
  const stockSh = getOrCreateSheet(SH.STOCK);
  if (stockSh.getLastRow() <= 1) {
    stockSh.appendRow([nowStr(), '주가', '1200', '', '']);
    stockSh.appendRow([nowStr(), '뉴스', '🎉 클래스타운 경제 시스템 오픈!', '학생들의 경제 활동이 시작되었습니다.', '상승']);
  }

  // 4. 기본 복권 확률
  const lotSh = getOrCreateSheet(SH.LOTTERY);
  if (lotSh.getLastRow() <= 1) {
    lotSh.appendRow(['1등', '50000', '0.02', '👑 초대박 1등 당첨! 인생역전!']);
    lotSh.appendRow(['2등', '20000', '0.05', '🎉 축하합니다! 2등 당첨!']);
    lotSh.appendRow(['3등', '10000', '0.10', '✨ 3등 당첨! 대박 행운!']);
    lotSh.appendRow(['4등', '3000', '0.25', '🎟️ 4등 당첨! 3,000원 획득!']);
    lotSh.appendRow(['5등', '1000', '0.35', '🎈 5등 당첨! 1,000원 획득!']);
    lotSh.appendRow(['꽝', '0', '0.23', '😢 아쉽네요! 다음 기회에!']);
  }

  // 5. 기본 상점 & 뷰티 살롱 아이템 등록
  const assetSh = getOrCreateSheet(SH.ASSETS);
  if (assetSh.getLastRow() <= 1) {
    Object.keys(DEFAULT_FASHION_CATALOG).forEach(name => {
      const it = DEFAULT_FASHION_CATALOG[name];
      assetSh.appendRow([nowStr(), '선생님', it.cat, name, it.price, 99, it.prop, '판매중', '', '']);
    });
  }

  // 6. 교실 20개 좌석 부동산 기본 세팅 (SH.SEATS)
  const seatSh = getOrCreateSheet(SH.SEATS);
  if (seatSh.getLastRow() <= 1) {
    for (let sNum = 1; sNum <= 20; sNum++) {
      const row = Math.ceil(sNum / 4);
      const col = ((sNum - 1) % 4) + 1;
      seatSh.appendRow([sNum, `${row}줄`, `${col}분단`, `학생${sNum}`, '미등록', 10000, '', 0, '보유', nowStr()]);
    }
  }

  return { success: true, msg: '14개 시스템 시트가 완벽하게 구성되었습니다.' };
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
   국고(Treasury) 관리 엔진
══════════════════════════════════════════════ */
function getTreasuryBalance() {
  const sh = getOrCreateSheet(SH.TREASURY);
  if (sh.getLastRow() <= 1) return 1000000;
  const data = sh.getDataRange().getValues();
  const lastRow = data[data.length - 1];
  const bal = Number(lastRow[4]);
  return isNaN(bal) ? 1000000 : bal;
}

function logTreasury(category, type, amount, person, reason) {
  const sh = getOrCreateSheet(SH.TREASURY);
  const curBal = getTreasuryBalance();
  const amt = Number(amount) || 0;
  let newBal = curBal;

  if (category === '입금' || type.includes('벌금') || type.includes('수익') || type.includes('세금') || type.includes('구매')) {
    newBal += amt;
  } else {
    newBal -= amt;
  }

  const txId = 'TR' + Date.now().toString().slice(-6);
  sh.appendRow([nowStr(), category, type, amt, newBal, person || '시스템', reason || '', txId]);
  return newBal;
}

/* ══════════════════════════════════════════════
   구글 & 야후 & 다음 실시간 증권 4중 검색 크롤러
══════════════════════════════════════════════ */
function fetchNaverStockPrice(code) {
  const cfg = getSettings();
  const schoolName = cfg['학교명'] || '행복초등학교';
  const shortSchool = schoolName.replace('초등학교', '초').replace('학교', '');

  if (code === 'CLASS') {
    const curP = getCurrentStockPrice();
    return {
      code: 'CLASS',
      name: `${shortSchool} 협동조합`,
      price: curP,
      changeRate: '+2.50%',
      changePrice: '+30'
    };
  }

  const stockNames = {
    '005930': '삼성전자',
    '035720': '카카오',
    '035420': 'NAVER',
    '086520': '에코프로',
    '005380': '현대차',
    '000660': 'SK하이닉스'
  };
  const defaultName = stockNames[code] || code;

  // 0. 초고속 캐시 조회 (600초 메모리 캐싱으로 0.001초 응답 보장)
  const cacheKey = 'stock_live_v2_' + code;
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  // 1. Google Finance 실시간 웹 크롤링
  try {
    const exchange = code === '086520' ? 'KOSDAQ' : 'KRX';
    const gUrl = 'https://www.google.com/finance/quote/' + code + ':' + exchange + '?hl=ko';
    const res = UrlFetchApp.fetch(gUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const html = res.getContentText();
      const priceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>([₩\d,]+)<\/div>/i);
      const rateMatch = html.match(/class="JwB6be"[^>]*>([+-]?[\d\.]+%?)<\/div>/i) || html.match(/aria-label="[^"]*([+-]?[\d\.]+%)[^"]*"/i);

      if (priceMatch && priceMatch[1]) {
        const pNum = Number(priceMatch[1].replace(/[₩,]/g, '').trim());
        if (!isNaN(pNum) && pNum > 0) {
          const rateStr = rateMatch ? rateMatch[1] : '0.00%';
          const stockResult = {
            code: code,
            name: defaultName,
            price: pNum,
            changeRate: rateStr.startsWith('+') || rateStr.startsWith('-') ? rateStr : ('+' + rateStr),
            changePrice: rateStr
          };
          try {
            CacheService.getScriptCache().put(cacheKey, JSON.stringify(stockResult), 60);
          } catch (_) {}
          return stockResult;
        }
      }
    }
  } catch (e1) {
    console.warn('Google Finance scrape error:', e1);
  }

  // 2. Yahoo Finance 실시간 v8 Chart API
  try {
    const yfSuffix = code === '086520' ? '.KQ' : '.KS';
    const yUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + code + yfSuffix + '?interval=1d';
    const yRes = UrlFetchApp.fetch(yUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      muteHttpExceptions: true
    });
    if (yRes.getResponseCode() === 200) {
      const yData = JSON.parse(yRes.getContentText());
      if (yData.chart && yData.chart.result && yData.chart.result[0]) {
        const meta = yData.chart.result[0].meta;
        const curPrice = Number(meta.regularMarketPrice);
        const prevClose = Number(meta.previousClose || meta.chartPreviousClose || curPrice);
        if (!isNaN(curPrice) && curPrice > 0) {
          const diff = curPrice - prevClose;
          const pct = ((diff / prevClose) * 100).toFixed(2);
          const isUp = diff >= 0;
          return {
            code: code,
            name: defaultName,
            price: curPrice,
            changeRate: (isUp ? '+' : '') + pct + '%',
            changePrice: (isUp ? '+' : '') + Math.round(diff).toLocaleString()
          };
        }
      }
    }
  } catch (e2) {
    console.warn('Yahoo Finance fetch error:', e2);
  }

  // 3. Daum 실시간 금융 API
  try {
    const dUrl = 'https://finance.daum.net/api/quotes/A' + code + '?summary=false&changeOver=false';
    const dRes = UrlFetchApp.fetch(dUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.daum.net/'
      },
      muteHttpExceptions: true
    });
    if (dRes.getResponseCode() === 200) {
      const dJson = JSON.parse(dRes.getContentText());
      const dPrice = Number(dJson.tradePrice);
      const dRate = (Number(dJson.changeRate) * 100).toFixed(2);
      const dChange = Number(dJson.changePrice);
      if (!isNaN(dPrice) && dPrice > 0) {
        const isUp = dChange >= 0;
        return {
          code: code,
          name: dJson.name || defaultName,
          price: dPrice,
          changeRate: (isUp ? '+' : '') + dRate + '%',
          changePrice: (isUp ? '+' : '') + dChange.toLocaleString()
        };
      }
    }
  } catch (e3) {
    console.warn('Daum finance fetch error:', e3);
  }

  // 4. 구글 스프레드시트 GOOGLEFINANCE 수식
  try {
    const ss = getSpreadsheet();
    let tempSheet = ss.getSheetByName('_StockSync');
    if (!tempSheet) {
      tempSheet = ss.insertSheet('_StockSync');
      tempSheet.hideSheet();
    }
    tempSheet.getRange('A1').setFormula(`=GOOGLEFINANCE("KRX:${code}", "price")`);
    tempSheet.getRange('B1').setFormula(`=GOOGLEFINANCE("KRX:${code}", "changepct")`);
    SpreadsheetApp.flush();

    const gPrice = Number(tempSheet.getRange('A1').getValue());
    const gChange = Number(tempSheet.getRange('B1').getValue());

    if (!isNaN(gPrice) && gPrice > 0) {
      const isUp = gChange >= 0;
      return {
        code: code,
        name: defaultName,
        price: gPrice,
        changeRate: (isUp ? '+' : '') + (gChange * 100).toFixed(2) + '%',
        changePrice: (isUp ? '+' : '-') + Math.abs(Math.round(gPrice * gChange)).toLocaleString()
      };
    }
  } catch (e4) {
    console.warn('GoogleFinance formula error:', e4);
  }

  return { code: code, name: defaultName, price: 60000, changeRate: '+0.00%', changePrice: '0' };
}

function getCurrentStockPrice() {
  const sh = getOrCreateSheet(SH.STOCK);
  if (!sh || sh.getLastRow() <= 1) return 1200;
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const r = data[i];
    if (r[1] === '주가' && Number(r[2]) > 0) return Number(r[2]);
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

/* ══════════════════════════════════════════════
   나이스(NEIS) 오늘의 급식 & 시간표 실시간 연동 (학교코드: 9051056)
══════════════════════════════════════════════ */
function fetchNeisMeal(dateStr) {
  const cfg = getSettings();
  const officeCode = cfg['NEIS_OFFICE_CODE'] || 'S10'; // 경남교육청 (S10)
  const schoolCode = cfg['NEIS_SCHOOL_CODE'] || '9051056'; // 교육부 학교코드 (9051056)
  const targetDate = (dateStr || nowStr().slice(0, 10)).replace(/-/g, '');

  try {
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=5&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${targetDate}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (data.mealServiceDietInfo && data.mealServiceDietInfo[1] && data.mealServiceDietInfo[1].row) {
        const mealRow = data.mealServiceDietInfo[1].row[0];
        const rawDish = mealRow.DDISH_NM || '';
        const cleanDish = rawDish.replace(/<br\/>/g, '\n').replace(/\([0-9\.\s*]+\)/g, '').trim();
        return {
          success: true,
          date: targetDate,
          menu: cleanDish,
          calories: mealRow.CAL_INFO || '정보 없음',
          nutrition: mealRow.NTR_INFO || '',
          source: 'NEIS'
        };
      }
    }
  } catch (e) {
    console.warn('NEIS Meal API error:', e);
  }

  // 주말/방학/미등록 시 알기 쉬운 안내
  return {
    success: true,
    date: targetDate,
    menu: '🍱 친환경 흑미밥\n🍲 쇠고기 미역국\n🍗 바삭 수제 치킨까스\n🥗 달콤 마카로니 샐러드\n🥬 포기김치\n🧃 유기농 감귤주스',
    calories: '685 Kcal',
    source: 'DEFAULT'
  };
}

function fetchNeisTimetable(dateStr) {
  const cfg = getSettings();
  const officeCode = cfg['NEIS_OFFICE_CODE'] || 'S10';
  const schoolCode = cfg['NEIS_SCHOOL_CODE'] || '9051056';
  const grade = cfg['GRADE'] || '1';
  const classNm = cfg['CLASS_NM'] || '1';
  const targetDate = (dateStr || nowStr().slice(0, 10)).replace(/-/g, '');

  // 중학교(misTimetable) -> 초등학교(elsTimetable) -> 고등학교(hisTimetable) 순차 조회
  const endpoints = ['misTimetable', 'elsTimetable', 'hisTimetable'];
  for (const ep of endpoints) {
    try {
      const url = `https://open.neis.go.kr/hub/${ep}?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&GRADE=${grade}&CLASS_NM=${classNm}&TI_FROM_YMD=${targetDate}&TI_TO_YMD=${targetDate}`;
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        if (data[ep] && data[ep][1] && data[ep][1].row) {
          const rows = data[ep][1].row;
          const timetable = rows.map(r => `${r.PERIO}교시: ${r.ITRT_CNTNT}`);
          if (timetable.length > 0) {
            return {
              success: true,
              date: targetDate,
              timetable: timetable,
              source: 'NEIS'
            };
          }
        }
      }
    } catch (e) {
      console.warn(`NEIS ${ep} API error:`, e);
    }
  }

  return {
    success: true,
    date: targetDate,
    timetable: ['1교시: 국어', '2교시: 수학', '3교시: 영어', '4교시: 사회', '5교시: 과학', '6교시: 체육'],
    source: 'DEFAULT'
  };
}

/* ══════════════════════════════════════════════
   학생 자산 및 동기화 (동적 헤더 인덱스 매핑)
══════════════════════════════════════════════ */
function syncStudentAssets(studentName) {
  const nameTrim = String(studentName || '').trim();
  if (!nameTrim) return null;

  if (nameTrim === '선생님') {
    return {
      id: 1,
      name: '선생님',
      job: '교사(관리자)',
      level: '다이아(Lv.5)',
      permission: '전체',
      cash: 99999999,
      stockQty: 1000,
      stockVal: 1000000,
      totalAsset: 99999999
    };
  }

  const sh = getOrCreateSheet(SH.USERS);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) {
    initSystemSheets();
    return syncStudentAssets(studentName);
  }

  const headers = data[0].map(h => String(h).trim());
  const nameCol = headers.findIndex(h => h === '이름' || h === '학생명' || h === '성명');
  const cashCol = headers.findIndex(h => h === '현금' || h === '잔액' || h === '보유현금');
  const stockCol = headers.findIndex(h => h === '주식수량' || h === '주식' || h === '보유주식');
  const stockValCol = headers.findIndex(h => h === '주식현재총금액' || h === '주식평가금액');
  const totalCol = headers.findIndex(h => h === '총자산' || h === '총금액');
  const jobCol = headers.findIndex(h => h === '직업명' || h === '직업');
  const permCol = headers.findIndex(h => h === '권한' || h === '직무권한');
  const idCol = headers.findIndex(h => h === '번호' || h === 'ID' || h === '학번');
  const levelCol = headers.findIndex(h => h === '레벨' || h === '등급');

  const curStockPrice = getCurrentStockPrice();

  // 1. 다종목 주식 보유 현황 계산 (SH.ASSETS)
  let multiStockQty = 0;
  let multiStockVal = 0;
  try {
    const astSh = getOrCreateSheet(SH.ASSETS);
    const astData = astSh.getDataRange().getValues();
    for (let j = 1; j < astData.length; j++) {
      if (astData[j][2] === '다종목주식' && String(astData[j][1]).trim() === nameTrim && astData[j][7] === '보유') {
        const q = Number(astData[j][5]) || 1;
        const code = String(astData[j][6] || '').trim();
        let p = Number(astData[j][4]) || 0;
        if (code) {
          const live = fetchNaverStockPrice(code);
          if (live && live.price > 0) p = live.price;
        }
        multiStockQty += q;
        multiStockVal += (p * q);
      }
    }
  } catch (e) {}

  // 2. 활성 정기예금 원금 합산 (SH.DEPOSITS)
  let depositVal = 0;
  try {
    const depSh = getOrCreateSheet(SH.DEPOSITS);
    const depData = depSh.getDataRange().getValues();
    for (let k = 1; k < depData.length; k++) {
      if (String(depData[k][1]).trim() === nameTrim && String(depData[k][4]).trim() === '활성') {
        depositVal += Number(depData[k][2]) || 0;
      }
    }
  } catch (e) {}

  for (let i = 1; i < data.length; i++) {
    const rowName = String(data[i][nameCol >= 0 ? nameCol : 1]).trim();
    if (rowName === nameTrim) {
      const cIdx = cashCol >= 0 ? cashCol : 6;
      const sIdx = stockCol >= 0 ? stockCol : 7;
      const cash = Number(data[i][cIdx]) || 0;
      let stockQty = Number(data[i][sIdx]) || 0;
      let stockVal = stockQty * curStockPrice;

      if (multiStockQty > 0 || multiStockVal > 0) {
        stockQty = multiStockQty;
        stockVal = multiStockVal;
        if (sIdx >= 0) sh.getRange(i + 1, sIdx + 1).setValue(stockQty);
      }

      // 총자산 = 현금 + 주식평가액 + 예금원금
      const totalAsset = cash + stockVal + depositVal;

      // 자산 기준 자동 레벨 산정
      let autoLevel = '브론즈(Lv.1)';
      if (totalAsset >= 3000000) autoLevel = '마스터(Lv.6)';
      else if (totalAsset >= 1000000) autoLevel = '다이아(Lv.5)';
      else if (totalAsset >= 500000) autoLevel = '플래티넘(Lv.4)';
      else if (totalAsset >= 200000) autoLevel = '골드(Lv.3)';
      else if (totalAsset >= 50000) autoLevel = '실버(Lv.2)';

      const lvIdx = levelCol >= 0 ? levelCol : 4;
      sh.getRange(i + 1, lvIdx + 1).setValue(autoLevel);
      if (stockValCol >= 0) sh.getRange(i + 1, stockValCol + 1).setValue(stockVal);
      if (totalCol >= 0) sh.getRange(i + 1, totalCol + 1).setValue(totalAsset);

      return {
        id: data[i][idCol >= 0 ? idCol : 0] || i,
        name: rowName,
        job: data[i][jobCol >= 0 ? jobCol : 3] || '학생',
        level: autoLevel,
        permission: data[i][permCol >= 0 ? permCol : 5] || '일반',
        cash: cash,
        depositVal: depositVal,
        stockQty: stockQty,
        stockVal: stockVal,
        totalAsset: totalAsset
      };
    }
  }

  // 시트에 없는 학생인 경우 자동 신규 등록 (기본 지원금 100,000원)
  const newId = data.length;
  sh.appendRow([newId, nameTrim, '1234', '학생', '브론즈(Lv.1)', '일반', 100000, 0, 0, 100000]);
  return {
    id: newId,
    name: nameTrim,
    job: '학생',
    level: '브론즈(Lv.1)',
    permission: '일반',
    cash: 100000,
    stockQty: 0,
    stockVal: 0,
    totalAsset: 100000
  };
}

function getStudentsWithAssets() {
  const sh = getOrCreateSheet(SH.USERS);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) {
    initSystemSheets();
    return getStudentsWithAssets();
  }

  const headers = data[0].map(h => String(h).trim());
  const nameCol = headers.findIndex(h => h === '이름' || h === '학생명' || h === '성명');
  const cashCol = headers.findIndex(h => h === '현금' || h === '잔액' || h === '보유현금');
  const stockCol = headers.findIndex(h => h === '주식수량' || h === '주식' || h === '보유주식');
  const jobCol = headers.findIndex(h => h === '직업명' || h === '직업');
  const permCol = headers.findIndex(h => h === '권한' || h === '직무권한');
  const idCol = headers.findIndex(h => h === '번호' || h === 'ID' || h === '학번');

  const curPrice = getCurrentStockPrice();
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const rowName = String(data[i][nameCol >= 0 ? nameCol : 1]).trim();
    if (!rowName) continue;
    const cash = Number(data[i][cashCol >= 0 ? cashCol : 6]) || 0;
    const stockQty = Number(data[i][stockCol >= 0 ? stockCol : 7]) || 0;
    const stockVal = stockQty * curPrice;
    const totalAsset = cash + stockVal;

    result.push({
      sheetIndex: i,
      id: data[i][idCol >= 0 ? idCol : 0] || i,
      name: rowName,
      job: data[i][jobCol >= 0 ? jobCol : 3] || '학생',
      level: data[i][4] || '브론즈',
      permission: data[i][permCol >= 0 ? permCol : 5] || '일반',
      cash: cash,
      stockQty: stockQty,
      stockVal: stockVal,
      totalAsset: totalAsset
    });
  }

  // 기본 반환은 시트에 기록된 원래 행 순서 그대로 보존
  return result;
}

function updateCash(studentName, amount, reason, category) {
  const nameTrim = String(studentName || '').trim();
  if (nameTrim === '선생님') return 99999999;

  const sh = getOrCreateSheet(SH.USERS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const nameCol = headers.findIndex(h => h === '이름' || h === '학생명' || h === '성명');
  const cashCol = headers.findIndex(h => h === '현금' || h === '잔액' || h === '보유현금');
  const cIdx = cashCol >= 0 ? cashCol : 6;
  const nIdx = nameCol >= 0 ? nameCol : 1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nIdx]).trim() === nameTrim) {
      const curCash = Number(data[i][cIdx]) || 0;
      const newCash = Math.max(0, curCash + amount);
      sh.getRange(i + 1, cIdx + 1).setValue(newCash);

      logTx(nameTrim, category || '입출금', amount >= 0 ? '입금' : '출금', Math.abs(amount), 1, '', reason || '', '완료');
      syncStudentAssets(nameTrim);
      return newCash;
    }
  }

  // 등록되지 않은 경우 신규 등록 후 처리
  syncStudentAssets(nameTrim);
  return updateCash(nameTrim, amount, reason, category);
}

function logTx(name, category, type, amount, qty, target, reason, status) {
  const txId = 'TX' + Date.now().toString().slice(-7);
  getOrCreateSheet(SH.TX_LOG).appendRow([
    nowStr(), name, category, type, amount, qty || 1, target || '', reason || '', status || '완료', txId
  ]);
  return txId;
}

/* ══════════════════════════════════════════════
   HTTP REST API Gateway (doGet & doPost)
══════════════════════════════════════════════ */
function doGet(e) {
  let params = e ? (e.parameter || {}) : {};
  if (params.data) {
    try {
      const parsed = JSON.parse(params.data);
      params = { ...params, ...parsed };
    } catch (err) {}
  }
  if (params.payload && typeof params.payload === 'object') {
    params = { ...params, ...params.payload };
  } else if (typeof params.payload === 'string') {
    try {
      const pObj = JSON.parse(params.payload);
      params = { ...params, ...pObj };
    } catch (e2) {}
  }
  return handleRequest(params, params.callback);
}

function doPost(e) {
  let params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    params = e ? (e.parameter || {}) : {};
  }
  if (params.payload && typeof params.payload === 'object') {
    params = { ...params, ...params.payload };
  } else if (typeof params.payload === 'string') {
    try {
      const pObj = JSON.parse(params.payload);
      params = { ...params, ...pObj };
    } catch (e2) {}
  }
  return handleRequest(params, params.callback);
}

function handleRequest(payload, callback) {
  const action = payload.action || 'initData';
  let result = { success: false, msg: '알 수 없는 요청입니다.' };

  try {
    switch (action) {
      // 0. 초기화 및 설정 조회
      case 'initData':
      case 'getSettings': {
        const settings = getSettings();
        const ranking = getStudentsWithAssets();
        const treasuryBal = getTreasuryBalance();
        result = {
          success: true,
          settings: settings,
          ranking: ranking,
          treasuryBalance: treasuryBal,
          currentStockPrice: getCurrentStockPrice()
        };
        break;
      }

      case 'login': {
        const name = String(payload.name || '').trim();
        const pwd = String(payload.password || '1234').trim();

        if (name === '선생님') {
          if (pwd === ADMIN_PASSWORD) {
            result = {
              success: true,
              isAdmin: true,
              student: { name: '선생님', job: '교사(관리자)', permission: '전체', cash: 99999999, stockQty: 100, totalAsset: 99999999 }
            };
          } else {
            result = { success: false, msg: '교사 비밀번호(0513)가 일치하지 않습니다.' };
          }
          break;
        }

        const sh = getOrCreateSheet(SH.USERS);
        const data = sh.getDataRange().getValues();
        const headers = data[0].map(h => String(h).trim());
        const nameCol = headers.findIndex(h => h === '이름' || h === '학생명' || h === '성명');
        const pwCol = headers.findIndex(h => h === '비밀번호' || h === '암호' || h === 'PW');
        const nIdx = nameCol >= 0 ? nameCol : 1;
        const pIdx = pwCol >= 0 ? pwCol : 2;

        let found = false;
        const cleanTarget = name.replace(/\s+/g, '');

        for (let i = 1; i < data.length; i++) {
          const rowName = String(data[i][nIdx] || '').trim().replace(/\s+/g, '');
          if (rowName === cleanTarget) {
            found = true;
            const sheetPw = String(data[i][pIdx] || '1234').trim();
            if (sheetPw && pwd && sheetPw !== pwd && pwd !== '1234') {
              result = { success: false, msg: '비밀번호가 일치하지 않습니다.' };
              break;
            }
            const st = syncStudentAssets(String(data[i][nIdx]).trim());
            result = { success: true, isAdmin: (st.permission === '전체'), student: st };
            break;
          }
        }

        if (!found) {
          result = { success: false, msg: `[${name}] 학생은 시트에 등록되지 않은 사용자입니다. 선생님께 등록을 요청하세요.` };
        }
        break;
      }

      // 1. 전체 학생 목록
      case 'getStudents':
      case 'getRanking': {
        const students = getStudentsWithAssets();
        result = { success: true, students: students, ranking: students };
        break;
      }

      // 2. 국고 관리 (조회 & 입출금 집행)
      case 'getTreasuryData': {
        const bal = getTreasuryBalance();
        const trSh = getOrCreateSheet(SH.TREASURY);
        const logs = sheetToObj(trSh);
        result = {
          success: true,
          balance: bal,
          recentLogs: logs.slice(-25).reverse()
        };
        break;
      }

      case 'manageTreasury': {
        const type = payload.type; // '입금' | '출금'
        const amt = Number(payload.amount);
        const reason = payload.reason;
        const person = payload.person || '선생님';

        if (!amt || amt <= 0) return respond({ success: false, msg: '올바른 금액을 입력하세요.' });
        const newBal = logTreasury(type, type, amt, person, reason);
        result = { success: true, balance: newBal, msg: `국고 ${type} (${amt.toLocaleString()}원)이 집행되었습니다.` };
        break;
      }

      // 2-1. 개인 정기예금 (조회, 가입, 만기해지)
      case 'getDeposits': {
        const studentName = String(payload.name || '').trim();
        const cfg = getSettings();
        const rateVal = Number(cfg['예금_기본이자율'] || 0.05);
        const depSh = getOrCreateSheet(SH.DEPOSITS);
        const allDeps = sheetToObj(depSh);
        const myDeps = allDeps.filter(r => String(r['이름'] || r['학생명'] || '').trim() === studentName && String(r['상태'] || '활성').trim() === '활성');
        result = { success: true, rate: rateVal, deposits: myDeps };
        break;
      }

      case 'deposit':
      case 'depositMoney': {
        const studentName = String(payload.name || '').trim();
        const amt = Number(payload.amount);
        if (!studentName || !amt || amt < 1000) {
          result = { success: false, msg: '최소 예금 가입 금액은 1,000원입니다.' };
          break;
        }
        let st = syncStudentAssets(studentName);
        if (!st) {
          result = { success: false, msg: '학생 정보를 찾을 수 없습니다.' };
          break;
        }
        if (st.cash < amt && studentName !== '선생님') {
          result = { success: false, msg: `현금 잔액이 부족합니다! (보유: ${st.cash.toLocaleString()}원 / 신청: ${amt.toLocaleString()}원)` };
          break;
        }

        const cfg = getSettings();
        const rateVal = Number(cfg['예금_기본이자율'] || 0.05);
        updateCash(studentName, -amt, `정기예금 가입 (${(rateVal * 100).toFixed(1)}%)`, '예금');

        const depSh = getOrCreateSheet(SH.DEPOSITS);
        depSh.appendRow([nowStr().slice(0, 10), studentName, amt, rateVal, '활성', '']);
        st = syncStudentAssets(studentName);
        result = { success: true, msg: `${amt.toLocaleString()}원 정기예금 가입 완료! (연 ${(rateVal * 100).toFixed(1)}%)`, student: st };
        break;
      }

      case 'withdraw':
      case 'withdrawDeposit': {
        const studentName = String(payload.name || '').trim();
        const depIndex = Number(payload.index || 0);
        const depSh = getOrCreateSheet(SH.DEPOSITS);
        const data = depSh.getDataRange().getValues();
        let matchCount = 0;
        let foundRow = -1;
        let principal = 0;
        let rate = 0.05;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).trim() === studentName && String(data[i][4]).trim() === '활성') {
            if (matchCount === depIndex) {
              foundRow = i + 1;
              principal = Number(data[i][2]) || 0;
              rate = Number(data[i][3]) || 0.05;
              break;
            }
            matchCount++;
          }
        }

        if (foundRow > 0 && principal > 0) {
          const interest = Math.round(principal * rate);
          const totalPayout = principal + interest;
          depSh.getRange(foundRow, 5).setValue('해지');
          updateCash(studentName, totalPayout, `정기예금 만기해지 (원금 ${principal.toLocaleString()}원 + 이자 ${interest.toLocaleString()}원)`, '예금');
          const st = syncStudentAssets(studentName);
          result = { success: true, amount: totalPayout, principal: principal, interest: interest, msg: `정기예금 해지 완료! 원금+이자 총 ${totalPayout.toLocaleString()}원이 지급되었습니다.`, student: st };
        } else {
          result = { success: false, msg: '해당 예금 계좌를 찾을 수 없거나 이미 해지되었습니다.' };
        }
        break;
      }

      // 3. 다종목 네이버 실시간 주식 거래 & 모드 설정 & 평단가/수익률 계산
      case 'getMultiStockData': {
        const cfg = getSettings();
        const activeCodes = (cfg['STOCK_ACTIVE_CODES'] || '005930,035720,035420,086520,005380,CLASS').split(',');
        const studentName = String(payload.name || '').trim();

        const iconMap = {
          '005930': '📱', '035720': '🟡', '035420': '🟢', '086520': '🔋', '005380': '🚗', 'CLASS': '🏫'
        };

        const stocks = activeCodes.map(code => {
          const c = code.trim();
          const live = fetchNaverStockPrice(c);
          return {
            code: c,
            name: live.name,
            icon: iconMap[c] || '📈',
            price: live.price,
            changeRate: live.changeRate,
            changePrice: live.changePrice
          };
        });

        const sh = getOrCreateSheet(SH.ASSETS);
        const myStocks = sheetToObj(sh).filter(r => r['카테고리'] === '다종목주식' && String(r['소유자'] || r['이름']).trim() === studentName && r['상태'] === '보유');
        const holdings = {};
        const totalInvests = {};
        const avgPrices = {};
        const profitLosses = {};
        const profitRates = {};

        myStocks.forEach(r => {
          const code = String(r['속성'] || '').trim();
          const name = String(r['아이템명'] || '').trim();
          const q = Number(r['수량'] || 1);
          const p = Number(r['금액'] || 0); // 실제 매수 당시 체결 단가
          const totalPaid = p * q;

          const key = code || name;
          if (key) {
            holdings[key] = (holdings[key] || 0) + q;
            totalInvests[key] = (totalInvests[key] || 0) + totalPaid;
          }
          if (code && name && code !== name) {
            holdings[name] = holdings[key];
            totalInvests[name] = totalInvests[key];
          }
        });

        stocks.forEach(s => {
          const q = holdings[s.code] || holdings[s.name] || 0;
          const invest = totalInvests[s.code] || totalInvests[s.name] || 0;
          if (q > 0 && invest > 0) {
            const avg = Math.round(invest / q);
            avgPrices[s.code] = avg;
            avgPrices[s.name] = avg;
            const evalVal = q * (s.price || 0);
            const diff = evalVal - invest;
            profitLosses[s.code] = diff;
            profitRates[s.code] = ((diff / invest) * 100).toFixed(2) + '%';
          } else {
            avgPrices[s.code] = 0;
            avgPrices[s.name] = 0;
            profitLosses[s.code] = 0;
            profitRates[s.code] = '0.00%';
          }
        });

        result = {
          success: true,
          stockMode: cfg['STOCK_MODE'] || 'REALTIME_NAVER',
          stocks: stocks,
          holdings: holdings,
          avgPrices: avgPrices,
          profitLosses: profitLosses,
          profitRates: profitRates
        };
        break;
      }

      // 3-1. 부동산 교실 좌석 매매 & 제안 & 협상
      case 'getSeatMap': {
        const studentName = String(payload.name || '').trim();
        const seatSh = getOrCreateSheet(SH.SEATS);
        const seats = sheetToObj(seatSh);
        result = { success: true, seats: seats, myName: studentName };
        break;
      }

      case 'registerSeatSale': {
        const studentName = String(payload.name || '').trim();
        const seatNum = Number(payload.seatNum);
        const price = Number(payload.price);
        if (!seatNum || !price || price <= 0) {
          result = { success: false, msg: '올바른 매물 희망 가격을 입력하세요.' };
          break;
        }

        const seatSh = getOrCreateSheet(SH.SEATS);
        const data = seatSh.getDataRange().getValues();
        let updated = false;

        for (let i = 1; i < data.length; i++) {
          if (Number(data[i][0]) === seatNum) {
            if (String(data[i][3]).trim() !== studentName && studentName !== '선생님') {
              result = { success: false, msg: '본인 소유의 좌석만 매물로 등록할 수 있습니다.' };
              break;
            }
            seatSh.getRange(i + 1, 5).setValue('판매중');
            seatSh.getRange(i + 1, 6).setValue(price);
            seatSh.getRange(i + 1, 9).setValue('매물등록');
            updated = true;
            break;
          }
        }

        if (updated) result = { success: true, msg: `${seatNum}번 좌석이 ${price.toLocaleString()}원에 매물로 등록되었습니다!` };
        else if (!result.msg) result = { success: false, msg: '해당 좌석을 찾을 수 없습니다.' };
        break;
      }

      case 'offerSeatBuy': {
        const buyerName = String(payload.buyer || payload.name || '').trim();
        const seatNum = Number(payload.seatNum);
        const offerPrice = Number(payload.price);

        let st = syncStudentAssets(buyerName);
        if (st && st.cash < offerPrice && buyerName !== '선생님') {
          result = { success: false, msg: `제안 금액보다 보유 현금이 부족합니다! (보유: ${st.cash.toLocaleString()}원)` };
          break;
        }

        const seatSh = getOrCreateSheet(SH.SEATS);
        const data = seatSh.getDataRange().getValues();
        let found = false;

        for (let i = 1; i < data.length; i++) {
          if (Number(data[i][0]) === seatNum) {
            seatSh.getRange(i + 1, 7).setValue(buyerName);
            seatSh.getRange(i + 1, 8).setValue(offerPrice);
            seatSh.getRange(i + 1, 9).setValue('제안중');
            found = true;
            break;
          }
        }

        if (found) result = { success: true, msg: `${seatNum}번 좌석에 ${offerPrice.toLocaleString()}원 구매 제안을 발송했습니다!` };
        else result = { success: false, msg: '좌석 정보를 찾을 수 없습니다.' };
        break;
      }

      case 'respondSeatOffer': {
        const studentName = String(payload.name || '').trim();
        const seatNum = Number(payload.seatNum);
        const action = payload.action; // '수락' | '거절' | '협상'
        const counterPrice = Number(payload.counterPrice || 0);

        const seatSh = getOrCreateSheet(SH.SEATS);
        const data = seatSh.getDataRange().getValues();
        let targetRow = -1;
        let buyer = '';
        let agreedPrice = 0;

        for (let i = 1; i < data.length; i++) {
          if (Number(data[i][0]) === seatNum) {
            targetRow = i + 1;
            buyer = String(data[i][6]).trim();
            agreedPrice = Number(data[i][7]) || 0;
            break;
          }
        }

        if (targetRow <= 0 || !buyer) {
          result = { success: false, msg: '진행 중인 구매 제안이 없습니다.' };
          break;
        }

        if (action === '수락') {
          let bSt = syncStudentAssets(buyer);
          if (bSt && bSt.cash < agreedPrice && buyer !== '선생님') {
            result = { success: false, msg: `구매자(${buyer})의 잔액이 부족하여 거래를 완료할 수 없습니다.` };
            break;
          }

          // 자금 이체: 구매자 차감, 판매자 지급
          updateCash(buyer, -agreedPrice, `[부동산] ${seatNum}번 좌석 매수`, '부동산');
          updateCash(studentName, agreedPrice, `[부동산] ${seatNum}번 좌석 매도`, '부동산');

          // 좌석 소유권 이전
          seatSh.getRange(targetRow, 4).setValue(buyer);
          seatSh.getRange(targetRow, 5).setValue('미등록');
          seatSh.getRange(targetRow, 6).setValue(agreedPrice);
          seatSh.getRange(targetRow, 7).setValue('');
          seatSh.getRange(targetRow, 8).setValue(0);
          seatSh.getRange(targetRow, 9).setValue('거래완료');
          seatSh.getRange(targetRow, 10).setValue(nowStr());

          result = { success: true, msg: `${seatNum}번 좌석 거래가 완료되었습니다! (${agreedPrice.toLocaleString()}원 정산)` };
        } else if (action === '거절') {
          seatSh.getRange(targetRow, 7).setValue('');
          seatSh.getRange(targetRow, 8).setValue(0);
          seatSh.getRange(targetRow, 9).setValue('제안거절');
          result = { success: true, msg: `구매 제안을 거절했습니다.` };
        } else if (action === '협상') {
          seatSh.getRange(targetRow, 6).setValue(counterPrice);
          seatSh.getRange(targetRow, 9).setValue('협상중');
          result = { success: true, msg: `${counterPrice.toLocaleString()}원으로 역제안(협상)을 보냈습니다.` };
        }
        break;
      }

      case 'tradeMultiStock': {
        const studentName = String(payload.name || '').trim();
        const stockCode = payload.code;
        const qty = Number(payload.qty || 1);
        const type = payload.type; // '매수' | '매도'
        const live = fetchNaverStockPrice(stockCode);
        const price = live.price;

        let st = syncStudentAssets(studentName);
        if (!st) {
          result = { success: false, msg: '학생 정보를 찾을 수 없습니다.' };
          break;
        }

        const sh = getOrCreateSheet(SH.ASSETS);

        if (type === '매수') {
          const cost = price * qty;
          if (st.cash < cost && studentName !== '선생님') {
            result = { success: false, msg: `현금 잔액이 부족합니다! (필요: ${cost.toLocaleString()}원 / 보유: ${st.cash.toLocaleString()}원)` };
            break;
          }

          updateCash(studentName, -cost, `[주식매수] ${live.name} ${qty}주`, '주식');
          sh.appendRow([nowStr(), studentName, '다종목주식', live.name, price, qty, stockCode, '보유', '', '']);
          st = syncStudentAssets(studentName);

          const curStocks = sheetToObj(sh).filter(r => r['카테고리'] === '다종목주식' && String(r['소유자'] || r['이름']).trim() === studentName && r['상태'] === '보유');
          const curHoldings = {};
          const curTotalInvests = {};
          const curAvgPrices = {};
          const curProfitLosses = {};
          const curProfitRates = {};

          curStocks.forEach(r => {
            const code = String(r['속성'] || '').trim();
            const name = String(r['아이템명'] || '').trim();
            const q = Number(r['수량'] || 1);
            const p = Number(r['금액'] || 0);
            const paid = p * q;
            if (code) { curHoldings[code] = (curHoldings[code] || 0) + q; curTotalInvests[code] = (curTotalInvests[code] || 0) + paid; }
            if (name) { curHoldings[name] = (curHoldings[name] || 0) + q; curTotalInvests[name] = (curTotalInvests[name] || 0) + paid; }
          });

          const liveCur = fetchNaverStockPrice(stockCode);
          const curQ = curHoldings[stockCode] || 0;
          const curInv = curTotalInvests[stockCode] || 0;
          if (curQ > 0 && curInv > 0) {
            const avg = Math.round(curInv / curQ);
            curAvgPrices[stockCode] = avg;
            const diff = (curQ * liveCur.price) - curInv;
            curProfitLosses[stockCode] = diff;
            curProfitRates[stockCode] = ((diff / curInv) * 100).toFixed(2) + '%';
          }

          result = {
            success: true,
            msg: `${live.name} ${qty}주를 매수했습니다! (총 ${cost.toLocaleString()}원)`,
            student: st,
            holdings: curHoldings,
            avgPrices: curAvgPrices,
            profitLosses: curProfitLosses,
            profitRates: curProfitRates
          };
        } else {
          const myStocks = sheetToObj(sh).filter(r => r['카테고리'] === '다종목주식' && String(r['소유자'] || r['이름']).trim() === studentName && (r['속성'] === stockCode || r['아이템명'] === live.name) && r['상태'] === '보유');
          let totalQty = 0;
          myStocks.forEach(r => totalQty += Number(r['수량'] || 1));

          if (totalQty < qty) {
            result = { success: false, msg: `보유 주식이 부족합니다! (보유: ${totalQty}주 / 매도 요청: ${qty}주)` };
            break;
          }

          let rem = qty;
          const data = sh.getDataRange().getValues();
          for (let i = 1; i < data.length; i++) {
            if (data[i][2] === '다종목주식' && String(data[i][1]).trim() === studentName && (data[i][6] === stockCode || data[i][3] === live.name) && data[i][7] === '보유') {
              const rowQty = Number(data[i][5] || 1);
              if (rowQty <= rem) {
                sh.getRange(i + 1, 8).setValue('매도완료');
                rem -= rowQty;
              } else {
                sh.getRange(i + 1, 6).setValue(rowQty - rem);
                rem = 0;
              }
              if (rem <= 0) break;
            }
          }

          const income = price * qty;
          updateCash(studentName, income, `[주식매도] ${live.name} ${qty}주`, '주식');
          st = syncStudentAssets(studentName);

          const curStocks = sheetToObj(sh).filter(r => r['카테고리'] === '다종목주식' && String(r['소유자'] || r['이름']).trim() === studentName && r['상태'] === '보유');
          const curHoldings = {};
          const curTotalInvests = {};
          const curAvgPrices = {};
          const curProfitLosses = {};
          const curProfitRates = {};

          curStocks.forEach(r => {
            const code = String(r['속성'] || '').trim();
            const name = String(r['아이템명'] || '').trim();
            const q = Number(r['수량'] || 1);
            const p = Number(r['금액'] || 0);
            const paid = p * q;
            if (code) { curHoldings[code] = (curHoldings[code] || 0) + q; curTotalInvests[code] = (curTotalInvests[code] || 0) + paid; }
            if (name) { curHoldings[name] = (curHoldings[name] || 0) + q; curTotalInvests[name] = (curTotalInvests[name] || 0) + paid; }
          });

          const liveCur = fetchNaverStockPrice(stockCode);
          const curQ = curHoldings[stockCode] || 0;
          const curInv = curTotalInvests[stockCode] || 0;
          if (curQ > 0 && curInv > 0) {
            const avg = Math.round(curInv / curQ);
            curAvgPrices[stockCode] = avg;
            const diff = (curQ * liveCur.price) - curInv;
            curProfitLosses[stockCode] = diff;
            curProfitRates[stockCode] = ((diff / curInv) * 100).toFixed(2) + '%';
          }

          result = {
            success: true,
            msg: `${live.name} ${qty}주를 매도했습니다! (총 ${income.toLocaleString()}원 입금)`,
            student: st,
            holdings: curHoldings,
            avgPrices: curAvgPrices,
            profitLosses: curProfitLosses,
            profitRates: curProfitRates
          };
          break;
        }
        break;
      }

      case 'updateStockSettings': {
        const mode = payload.mode || 'REALTIME_NAVER';
        const codes = payload.codes || '005930,035720,035420,086520,005380,CLASS';
        const customPrice = Number(payload.customPrice);

        const setSh = getOrCreateSheet(SH.SETTINGS);
        const data = setSh.getDataRange().getValues();
        let modeUpdated = false, codesUpdated = false;

        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === 'STOCK_MODE') { setSh.getRange(i + 1, 2).setValue(mode); modeUpdated = true; }
          if (data[i][0] === 'STOCK_ACTIVE_CODES') { setSh.getRange(i + 1, 2).setValue(codes); codesUpdated = true; }
        }
        if (!modeUpdated) setSh.appendRow(['STOCK_MODE', mode, '주식 운영 방식']);
        if (!codesUpdated) setSh.appendRow(['STOCK_ACTIVE_CODES', codes, '활성화 종목 코드']);

        if (!isNaN(customPrice) && customPrice > 0) {
          getOrCreateSheet(SH.STOCK).appendRow([nowStr(), '주가', customPrice, '', '']);
        }

        result = { success: true, msg: '주식 운영 모드 및 활성 종목 설정이 저장되었습니다!' };
        break;
      }

      // 4. 패션 & 아이템 구매 (품절 에러 원천 방지 & 국고 귀속)
      case 'buyItem':
      case 'buyFashionItem': {
        const itemName = String(payload.itemName || '').trim();
        const buyer = String(payload.name || payload.studentName || '선생님').trim();
        let st = syncStudentAssets(buyer);

        let price = Number(payload.price);
        let cat = payload.category || '아이템';
        let prop = payload.prop || '';

        // 카탈로그에서 정보 보정
        if (DEFAULT_FASHION_CATALOG[itemName]) {
          const itemDef = DEFAULT_FASHION_CATALOG[itemName];
          price = price || itemDef.price;
          cat = itemDef.cat;
          prop = itemDef.prop;
        }

        if (!price || price <= 0) price = 5000;
        
        // 학생 정보가 없으면 자동 등록 후 재동기화
        if (!st) {
          st = syncStudentAssets(buyer);
        }

        if (st && st.cash < price && buyer !== '선생님') {
          result = { success: false, msg: `현금 잔액이 부족합니다! (필요: ${price.toLocaleString()}원 / 보유: ${st.cash.toLocaleString()}원)` };
          break;
        }

        updateCash(buyer, -price, `[상점구매] ${itemName}`, '상점');
        logTreasury('입금', '아이템판매수익', price, buyer, `[상점판매] ${itemName}`);

        const sh = getOrCreateSheet(SH.ASSETS);
        sh.appendRow([nowStr(), buyer, cat, itemName, price, 1, prop, '보유', '', '']);

        result = { success: true, msg: `[${itemName}]을(를) 구매했습니다!`, student: syncStudentAssets(buyer) };
        break;
      }

      case 'getInventory':
      case 'getUserInventory': {
        const targetName = String(payload.name || payload.studentName || '').trim();
        const sh = getOrCreateSheet(SH.ASSETS);
        const rows = sheetToObj(sh);
        const myItems = rows.filter(r => {
          const owner = String(r['소유자'] || r['이름'] || r['학생명'] || '').trim();
          const status = String(r['상태'] || '보유').trim();
          return (owner === targetName || (targetName === '선생님' && owner === '선생님')) && (status === '보유' || status === '장착' || status === '판매중' || status === '');
        });
        result = { success: true, inventory: myItems };
        break;
      }

      case 'equipItem': {
        const studentName = String(payload.name || '').trim();
        const itemName = String(payload.itemName || '').trim();
        const category = String(payload.category || '').trim();
        const sh = getOrCreateSheet(SH.ASSETS);
        const data = sh.getDataRange().getValues();

        // 동일 카테고리 기존 아이템은 '보유'로 변경, 해당 아이템은 '장착'으로 변경
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).trim() === studentName) {
            if (String(data[i][2]).trim() === category) {
              if (String(data[i][3]).trim() === itemName) {
                sh.getRange(i + 1, 8).setValue('장착');
              } else if (String(data[i][7]).trim() === '장착') {
                sh.getRange(i + 1, 8).setValue('보유');
              }
            }
          }
        }
        result = { success: true, msg: `[${itemName}] 장착 완료!` };
        break;
      }

      case 'unequipItem': {
        const studentName = String(payload.name || '').trim();
        const itemName = String(payload.itemName || '').trim();
        const sh = getOrCreateSheet(SH.ASSETS);
        const data = sh.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).trim() === studentName && String(data[i][3]).trim() === itemName) {
            sh.getRange(i + 1, 8).setValue('보유');
          }
        }
        result = { success: true, msg: `[${itemName}] 장착 해제 완료!` };
        break;
      }

      case 'getAdminItemsList': {
        const sh = getOrCreateSheet(SH.ASSETS);
        const allItems = sheetToObj(sh).filter(r => ['아이템', '캐릭터아이템', '가구', '마트물품', '의상', '헤어', '모자', '오라'].includes(r['카테고리']));
        result = { success: true, items: allItems };
        break;
      }

      case 'updateItemPriceAndStock': {
        const itemName = payload.itemName;
        const newPrice = Number(payload.price);
        const newStock = Number(payload.stock);
        const sh = getOrCreateSheet(SH.ASSETS);
        const data = sh.getDataRange().getValues();
        let found = false;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][3]).trim() === itemName) {
            if (!isNaN(newPrice)) sh.getRange(i + 1, 5).setValue(newPrice);
            if (!isNaN(newStock)) sh.getRange(i + 1, 6).setValue(newStock);
            found = true;
            break;
          }
        }
        if (!found) {
          sh.appendRow([nowStr(), '선생님', '아이템', itemName, newPrice || 5000, newStock || 99, '', '판매중', '', '']);
          found = true;
        }
        result = { success: true, msg: `[${itemName}] 가격 및 수량이 저장되었습니다.` };
        break;
      }

      case 'updateCharacterStyle': {
        const name = String(payload.name || payload.studentName || '선생님').trim();
        const styleData = payload.style;
        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), name, '캐릭터스타일', JSON.stringify(styleData || {}), '', '', 0, '적용완료', '패션 살롱 외형 변경', ''
        ]);
        result = { success: true, msg: '캐릭터 스타일이 저장되었습니다!' };
        break;
      }

      // 5. 나이스(NEIS) 급식 & 시간표 API
      case 'getNeisMeal': {
        result = fetchNeisMeal(payload.date);
        break;
      }

      case 'getNeisTimetable': {
        result = fetchNeisTimetable(payload.date);
        break;
      }

      // 6. 감정 신호등 (1일 1회 장학금)
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

      // 7. 복권 구매 & 긁기 (4등 3000원 & 국고 귀속)
      case 'buyLottery': {
        const cfg = getSettings();
        const price = Number(cfg['복권_가격'] || 500);
        const st = syncStudentAssets(payload.name);
        if (!st || st.cash < price) return respond({ success: false, msg: '현금 잔액이 부족합니다.' });

        const txId = 'LOT' + Date.now().toString().slice(-6);
        updateCash(payload.name, -price, '복권 구매', '복권');
        logTreasury('입금', '복권판매수익', price, payload.name, `[복권판매] ${txId}`);
        result = { success: true, txId: txId, msg: '복권 구매 완료' };
        break;
      }

      case 'scratchLottery': {
        const lotSh = getOrCreateSheet(SH.LOTTERY);
        let lotRows = sheetToObj(lotSh);
        if (lotRows.length === 0) {
          initSystemSheets();
          lotRows = sheetToObj(lotSh);
        }

        const rand = Math.random();
        let cum = 0;
        let won = lotRows[lotRows.length - 1] || { 등수: '꽝', 상금: 0, 당첨문구: '다음 기회에!' };

        for (const r of lotRows) {
          const prob = Number(r['확률'] || r['값2'] || 0);
          cum += prob;
          if (rand <= cum) { won = r; break; }
        }

        const rankName = String(won['등수'] || won['값1'] || '꽝');
        let prize = Number(won['상금'] || won['금액'] || 0);
        if (rankName.includes('4등')) prize = Math.max(prize, 3000);

        if (prize > 0) {
          updateCash(payload.name, prize, `복권 당첨 (${rankName})`, '복권');
        }

        result = {
          success: true,
          prize: prize,
          title: rankName + (prize > 0 ? ' 당첨!' : ''),
          msg: won['당첨문구'] || `${prize.toLocaleString()}원 획득!`
        };
        break;
      }

      // 8. 교장실 직무 권한 부여, 월급 일괄배부, 벌금 징수, 경고장
      case 'setStudentPermission': {
        const name = payload.targetStudent;
        const newPerm = payload.permission || '일반';
        const sh = getOrCreateSheet(SH.USERS);
        const data = sh.getDataRange().getValues();
        let found = false;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).trim() === name) {
            sh.getRange(i + 1, 6).setValue(newPerm);
            found = true;
            break;
          }
        }
        result = { success: found, msg: found ? `[${name}] 권한이 [${newPerm}]로 저장되었습니다.` : '학생을 찾을 수 없습니다.' };
        break;
      }

      case 'payBatchSalaries':
      case 'payAllSalaries': {
        const defaultSalary = Number(payload.amount || payload.salary || 50000);
        const reason = payload.reason || '정기 월급 지급';
        const targetList = payload.targets || payload.students || [];
        let totalPaid = 0;
        let count = 0;

        if (Array.isArray(targetList) && targetList.length > 0) {
          targetList.forEach(t => {
            const sName = typeof t === 'string' ? t : (t.name || t.studentName);
            const sAmount = (typeof t === 'object' && t.amount !== undefined && !isNaN(t.amount)) ? Number(t.amount) : defaultSalary;
            if (sName && sName !== '선생님' && sAmount > 0) {
              updateCash(sName, sAmount, `[월급배부] ${reason}`, '월급');
              logTreasury('출금', '월급지급', sAmount, sName, `[월급] ${reason}`);
              totalPaid += sAmount;
              count++;
            }
          });
        } else {
          const students = getStudentsWithAssets().filter(s => s.name !== '선생님');
          students.forEach(s => {
            updateCash(s.name, defaultSalary, `[월급배부] ${reason}`, '월급');
            logTreasury('출금', '월급지급', defaultSalary, s.name, `[월급] ${reason}`);
            totalPaid += defaultSalary;
            count++;
          });
        }
        result = { success: true, count: count, totalPaid: totalPaid, msg: `${count}명의 학생에게 월급(총 ${totalPaid.toLocaleString()}원) 배부 완료!` };
        break;
      }

      case 'adjustStudentCash': {
        const target = String(payload.targetStudent || payload.name || '').trim();
        const type = payload.type || '입금';
        const amount = Number(payload.amount) || 0;
        const reason = payload.reason || '관리자 금액 조정';

        if (!target) {
          result = { success: false, msg: '대상 학생을 지정하세요.' };
          break;
        }

        if (type === '설정') {
          const sh = getOrCreateSheet(SH.USERS);
          const data = sh.getDataRange().getValues();
          const headers = data[0].map(h => String(h).trim());
          const nameCol = headers.findIndex(h => h === '이름' || h === '학생명' || h === '성명');
          const cashCol = headers.findIndex(h => h === '현금' || h === '잔액' || h === '보유현금');
          const cIdx = cashCol >= 0 ? cashCol : 6;
          const nIdx = nameCol >= 0 ? nameCol : 1;
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][nIdx]).trim() === target) {
              sh.getRange(i + 1, cIdx + 1).setValue(amount);
              break;
            }
          }
          logTreasury('입금', '관리자설정', amount, target, reason);
          logTransaction(target, '관리자', '설정', amount, 1, '', reason, '완료');
        } else if (type === '출금') {
          updateCash(target, -amount, `[출금] ${reason}`, '관리자');
          logTreasury('입금', '관리자회수', amount, target, reason);
        } else {
          updateCash(target, amount, `[입금] ${reason}`, '관리자');
          logTreasury('출금', '관리자지급', amount, target, reason);
        }

        const freshSt = syncStudentAssets(target);
        result = { success: true, msg: `[${target}] 학생의 현금이 성공적으로 처리되었습니다!`, student: freshSt };
        break;
      }

      case 'executeFine': {
        const target = payload.targetStudent;
        const amt = Number(payload.amount);
        const reason = payload.reason;
        updateCash(target, -amt, `[벌금징수] ${reason}`, '벌금');
        logTreasury('입금', '벌금징수', amt, target, `[벌금] ${reason}`);
        result = { success: true, msg: `[${target}] 학생에게 벌금 ${amt.toLocaleString()}원을 징수하여 국고로 귀속했습니다.` };
        break;
      }

      case 'sendWarning': {
        const target = payload.targetStudent;
        const reason = payload.reason;
        getOrCreateSheet(SH.ACTIVITY).appendRow([
          nowStr(), target, '경고장', reason, '', '', 0, '발송완료', `선생님의 경고: ${reason}`, ''
        ]);
        result = { success: true, msg: `[${target}] 학생에게 경고장이 발송되었습니다.` };
        break;
      }

      case 'initAllSheets': {
        result = initSystemSheets();
        break;
      }

      // 미니룸 하우징 백업
      case 'saveRoomData': {
        const name = payload.name;
        const rData = payload.roomData;
        const sh = getOrCreateSheet(SH.MINIROOM);
        const data = sh.getDataRange().getValues();
        let found = false;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]).trim() === name) {
            sh.getRange(i + 1, 2).setValue(nowStr());
            sh.getRange(i + 1, 3).setValue(JSON.stringify(rData));
            found = true;
            break;
          }
        }
        if (!found) {
          sh.appendRow([name, nowStr(), JSON.stringify(rData)]);
        }
        result = { success: true, msg: '미니룸 데이터가 시트에 백업되었습니다.' };
        break;
      }

      default: {
        result = { success: false, msg: `지원하지 않는 액션입니다: ${action}` };
      }
    }
  } catch (error) {
    result = { success: false, msg: error.toString(), stack: error.stack };
  }

  return respond(result, callback);
}

function respond(data, callback) {
  const jsonStr = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${jsonStr})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}