// ============================================================
// 클래스뱅크 LMS - Code.gs v16 (자산종합 탭 추가 및 로딩/UI 버그 수정판)
// ============================================================
// 📋 시트 구성 (8개)
// 1. 학생        : 학생 마스터 (이름/비밀번호/직업/현금/주식/상태)
// 2. 거래LOG     : 현금거래+세금+주식주문+고용+구직+부동산 모든 이력
// 3. 자산현황    : 예금+인벤토리+중고거래+상점 아이템
// 4. 주식시장    : 주가이력+주식뉴스
// 5. 학급활동    : 자기평가(체크리스트)+감정신호등+호출시스템
// 6. 학습관리    : 숙제+공지사항+시간표(정적)
// 7. 자리배치    : 자리배치도+부동산거래이력
// 8. 설정        : 모든 설정값 (카테고리별)
// ============================================================

const SPREADSHEET_ID = '1xzW5jE7vNaaZlJYw4sqbL8KBgvM_GEqB3xxEmwhUPkc';
const ADMIN_PASSWORD = '0513';
const TEACHER_EMAIL  = 'semyo0513@naver.com';

const NEIS_KEY       = 'eca4752c3f2b44bc9a14df9a0c567b62';
const NEIS_OFFICE    = 'S10';
const NEIS_SCHOOL    = '9051056';
const NEIS_BASE_URL  = 'https://open.neis.go.kr/hub';

// ─── 시트명 상수 ───
const SH = {
  STUDENTS   : '학생',
  TX_LOG     : '거래LOG',
  ASSETS     : '자산현황',
  STOCK      : '주식시장',
  ACTIVITY   : '학급활동',
  LEARNING   : '학습관리',
  SEAT       : '자리배치',
  CONFIG     : '설정',
  LOTTERY    : '복권',
  ASSIGNMENT : '과제'
};

// ─── 거래LOG 카테고리 상수 ───
const TX = {
  CASH    : '현금거래',
  TAX     : '세금',
  STOCK_O : '주식주문',
  EMPLOY  : '고용',
  JOB_APP : '구직지원',
  RE_TX   : '부동산거래',
  SALARY  : '급여'
};

// ─── 자산현황 카테고리 상수 ───
const AS = {
  DEPOSIT : '예금',
  ITEM    : '아이템',
  INVEN   : '인벤토리',
  MARKET  : '중고거래'
};

// ─── 학급활동 카테고리 상수 ───
const AC = {
  EVAL    : '자기평가',
  EMOTION : '감정신호등',
  CALL    : '호출'
};

// ─── 학습관리 카테고리 상수 ───
const LR = {
  HOMEWORK : '숙제',
  NOTICE   : '공지',
  TIMETABLE: '시간표'
};

// ─── 시트 스키마 ───
const SCHEMA = {
  '학생'    : ['번호','이름','비밀번호','직업명','현금','주식','상태','레벨','권한'],
  '거래LOG' : ['날짜','이름','카테고리','유형','금액','수량','대상','사유','상태','메타'],
  '자산현황': ['날짜','이름','카테고리','아이템명','금액','수량','이자율','상태','구매자','메타'],
  '주식시장': ['날짜','카테고리','값1','값2','값3','값4'],
  '학급활동': ['날짜','이름','카테고리','내용1','내용2','내용3','점수','상태','메세지','답변'],
  '학습관리': ['날짜','카테고리','번호','제목','내용','대상','마감일','작성자','상태','중요도'],
  '자리배치': ['좌석ID','행','열','활성여부','이름','매물상태','매물가격','거래상태','txId','거래일'],
  '설정'    : ['카테고리','설정키','설정값','설명','수정일'],
  '복권'    : ['구분','제목','내용','확률','현금'],
  '과제'    : ['과제ID','등록일','제목','내용','기간시작','기간종료','파일유형','수당','상태','작성자']
};

// ─── 기본 설정값 ───
const DEFAULT_SETTINGS = {
  급여: {
    '자기평가_상_급여'      : [10000, '자기평가 상 선택 시 지급액(원)'],
    '자기평가_중_급여'      : [5000,  '자기평가 중 선택 시 지급액(원)'],
    '자기평가_하_급여'      : [3000,  '자기평가 하 선택 시 지급액(원)'],
    '자기평가_세금적용'      : [1,     '급여 세금 적용 여부 (1=적용)'],
    '세금율'                : [0.10,  '급여 세금 비율 (0.10=10%)']
  },
  감정: {
    '감정신호등_보상_활성'  : [1,     '보상 지급 여부 (1=활성)'],
    '감정신호등_좋음_보상'  : [500,   '🟢 좋음 등록 시 보상(원)'],
    '감정신호등_보통_보상'  : [300,   '🟡 보통 등록 시 보상(원)'],
    '감정신호등_힘듦_보상'  : [1000,  '🔴 힘듦 등록 시 보상(원)']
  },
  경제: {
    '주식_초기가'           : [1000,  '주식 초기 가격(원)'],
    '예금_기본이자율'       : [0.02,  '예금 기본 이자율 (0.02=2%/일)'],
    '송금_수수료율'         : [0,     '송금 수수료율 (0=무료)']
  },
  이메일: {
    '호출_즉시발송'         : [1,     '호출 시 교사 이메일 즉시 발송 (1=활성)'],
    '일일요약_활성'         : [1,     '일일 요약 이메일 활성 여부 (1=활성)'],
    '일일요약_발송시간'     : [16,    '일일 요약 이메일 발송 시간 (0~23시)']
  },
  복권: {
    '복권_가격'             : [500,   '복권 1장 가격(원)'],
    '복권_1인당_일일한도'   : [3,     '1인당 하루 최대 구매 가능 장수']
  },
  과제: {
    '과제_제출_수당'        : [2000,  '과제 제출 시 지급 특별 수당(원)'],
    '과제_수당_세금적용'    : [0,     '과제 수당 세금 적용 여부 (1=적용)']
  },
  레벨: {
    '레벨_기본등급'         : ['씨앗', '기본 레벨 등급명'],
    '레벨_1_이름'           : ['씨앗',  '레벨1 등급명'],
    '레벨_1_최소자산'       : [0,       '레벨1 최소 총자산(원)'],
    '레벨_2_이름'           : ['새싹',  '레벨2 등급명'],
    '레벨_2_최소자산'       : [50000,   '레벨2 최소 총자산(원)'],
    '레벨_3_이름'           : ['나무',  '레벨3 등급명'],
    '레벨_3_최소자산'       : [150000,  '레벨3 최소 총자산(원)'],
    '레벨_4_이름'           : ['별',    '레벨4 등급명'],
    '레벨_4_최소자산'       : [300000,  '레벨4 최소 총자산(원)'],
    '레벨_5_이름'           : ['왕',    '레벨5 등급명'],
    '레벨_5_최소자산'       : [500000,  '레벨5 최소 총자산(원)']
  }
};

/* ══════════════════════════════════════════════
   유틸리티
══════════════════════════════════════════════ */
function getSheet(n) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(n);
}
function getOrCreate(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (SCHEMA[name]) sh.appendRow(SCHEMA[name]);
  }
  return sh;
}
function sheetToObj(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const hdrs = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    hdrs.forEach((h,i) => {
      let v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v,'Asia/Seoul','yyyy-MM-dd HH:mm:ss');
      obj[h] = v;
    });
    return obj;
  });
}
function todayDate() { return Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd'); }
function nowStr()    { return Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm:ss'); }

/* ──────────────────────────────────────────────
   시트 초기화
────────────────────────────────────────────── */
function checkAndSetupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  for (let name in SCHEMA) {
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); sh.appendRow(SCHEMA[name]); }
    else if (sh.getLastRow() === 0) sh.appendRow(SCHEMA[name]);
  }
  const stk = getSheet(SH.STOCK);
  if (stk && stk.getLastRow() <= 1) stk.appendRow([nowStr(),'주가',1000,'','','']);
  getSettings();
}

/* ══════════════════════════════════════════════
   설정 관리
══════════════════════════════════════════════ */
function getSettings() {
  const sh = getOrCreate(SH.CONFIG);
  const rows = sheetToObj(sh);
  const cfg = {};
  for (let cat in DEFAULT_SETTINGS)
    for (let key in DEFAULT_SETTINGS[cat])
      cfg[key] = DEFAULT_SETTINGS[cat][key][0];
  rows.forEach(r => {
    if (r['설정키'] && r['설정값'] !== '') cfg[r['설정키']] = isNaN(r['설정값']) ? r['설정값'] : Number(r['설정값']);
  });
  if (rows.length === 0) {
    for (let cat in DEFAULT_SETTINGS)
      for (let key in DEFAULT_SETTINGS[cat]) {
        const [val, desc] = DEFAULT_SETTINGS[cat][key];
        sh.appendRow([cat, key, val, desc, nowStr()]);
      }
  }
  return cfg;
}

function updateSettings(settingsObj) {
  const sh = getOrCreate(SH.CONFIG);
  const data = sh.getDataRange().getValues();
  for (let key in settingsObj) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(key)) {
        sh.getRange(i+1, 3).setValue(settingsObj[key]);
        sh.getRange(i+1, 5).setValue(nowStr());
        found = true; break;
      }
    }
    if (!found) sh.appendRow(['기타', key, settingsObj[key], '', nowStr()]);
  }
  return { success: true, msg: '설정 저장 완료', settings: getSettings() };
}

/* ══════════════════════════════════════════════
   학생 관리
══════════════════════════════════════════════ */
function getStudents() {
  checkAndSetupSheets();
  return sheetToObj(getSheet(SH.STUDENTS)).map(s => ({
    id: s['번호']||'', name: String(s['이름']||''), job: s['직업명']||'무직',
    cash: Number(s['현금']||0), stock: Number(s['주식']||0), status: s['상태']||'재직',
    level: s['레벨']||'', permission: s['권한']||''
  }));
}
function getStudentByName(name) { return getStudents().find(s => s.name === name) || null; }

function studentLogin(name, pw) {
  const s = sheetToObj(getSheet(SH.STUDENTS)).find(r => String(r['이름']) === String(name));
  if (!s) return { success: false, msg: '이름 없음' };
  if (String(s['비밀번호']||'') !== '' && String(s['비밀번호']) !== String(pw))
    return { success: false, msg: '비밀번호 오류' };
  return { success: true, student: { id:s['번호']||'', name:String(s['이름']||''), job:s['직업명']||'무직', cash:Number(s['현금']||0), stock:Number(s['주식']||0), status:s['상태']||'재직', level:s['레벨']||'', permission:s['권한']||'' }};
}
function changePassword(name, oldPw, newPw) {
  if (!studentLogin(name, oldPw).success) return { success: false, msg: '현재 비밀번호 오류' };
  updateStudentField(name, '비밀번호', newPw);
  return { success: true, msg: '변경됨' };
}
function updateStudentField(name, field, value, isAdd=false) {
  const sh = getSheet(SH.STUDENTS); if (!sh) return false;
  const data = sh.getDataRange().getValues();
  const nc = data[0].indexOf('이름'), fc = data[0].indexOf(field);
  if (nc<0||fc<0) return false;
  for (let i=1;i<data.length;i++) {
    if (String(data[i][nc]) === name) {
      const cell = sh.getRange(i+1, fc+1);
      cell.setValue(isAdd ? Number(cell.getValue()||0) + value : value);
      return true;
    }
  }
  return false;
}

/* ══════════════════════════════════════════════
   거래LOG
══════════════════════════════════════════════ */
function logTxRow(name, cat, type, amount, qty, target, reason, status, meta) {
  getOrCreate(SH.TX_LOG).appendRow([
    nowStr(), name||'', cat||'', type||'', Number(amount||0),
    qty||'', target||'', reason||'', status||'', meta||''
  ]);
}
function updateCash(name, delta, reason, cat) {
  const ok = updateStudentField(name, '현금', delta, true);
  if (ok) logTxRow(name, cat||TX.CASH, delta>=0?'수입':'지출', Math.abs(delta), '', '', reason, '완료', '');
  return ok;
}
function transferMoney(fromName, toName, amount, pw) {
  amount = Number(amount);
  if (amount <= 0) return { success: false, msg: '금액 오류' };
  const s = studentLogin(fromName, pw);
  if (!s.success) return { success: false, msg: '비밀번호 오류' };
  if (s.student.cash < amount) return { success: false, msg: '잔액 부족' };
  if (!getStudentByName(toName)) return { success: false, msg: '받는 사람 없음' };
  const cfg = getSettings();
  const fee = Math.floor(amount * Number(cfg['송금_수수료율']||0));
  updateCash(fromName, -(amount), `${toName}에게 송금`);
  updateCash(toName, amount - fee, `${fromName}로부터 송금`);
  if (fee > 0) logTxRow(fromName, TX.TAX, '세금', fee, '', '', '송금 수수료', '완료', '');
  return { success: true, msg: `${amount.toLocaleString()}원 송금 완료` };
}
function getTransactions(name) {
  return sheetToObj(getSheet(SH.TX_LOG))
    .filter(r => String(r['이름']) === name && r['카테고리'] === TX.CASH)
    .reverse();
}

/* ══════════════════════════════════════════════
   주식시장
══════════════════════════════════════════════ */
function getCurrentStockPrice() {
  const sh = getSheet(SH.STOCK);
  if (!sh || sh.getLastRow() <= 1) return 1000;
  const data = sh.getDataRange().getValues();
  for (let i = data.length-1; i >= 1; i--) {
    if (String(data[i][1]) === '주가') return Number(data[i][2]) || 1000;
  }
  return 1000;
}
function getStockData() {
  const rows = sheetToObj(getSheet(SH.STOCK));
  const hist = rows.filter(r=>r['카테고리']==='주가').map(r=>({date:String(r['날짜']).slice(5,10),price:Number(r['값1']||0)}));
  const news = rows.filter(r=>r['카테고리']==='뉴스').reverse().map(r=>({제목:r['값1'],내용:r['값2'],영향:r['값3']}));
  const orders = sheetToObj(getSheet(SH.TX_LOG)).filter(r=>r['카테고리']===TX.STOCK_O);
  const volMap = {};
  orders.forEach(o=>{const p=Number(o['금액']),q=Number(o['수량']);if(!volMap[p])volMap[p]=0;if(o['유형']==='매수')volMap[p]+=q;else{volMap[p]-=q;if(volMap[p]<0)volMap[p]=0;}});
  const curP = getCurrentStockPrice();
  if (hist.length===0) hist.push({date:todayDate().slice(5,10),price:curP});
  if (news.length===0) news.push({제목:'주식 시장 오픈',내용:'학급 주식 시장이 열렸습니다.',영향:''});
  return { info:{'현재가':curP}, history:hist, news, volume:Object.entries(volMap).map(([p,v])=>({price:Number(p),volume:v})).filter(x=>x.volume>0).sort((a,b)=>a.price-b.price) };
}
function tradeStock(name, type, qty) {
  qty = Number(qty); if (qty<=0) return { success:false, msg:'수량 오류' };
  const student = getStudentByName(name), cp = getCurrentStockPrice();
  if (type==='매수') {
    const cost = cp*qty;
    if (student.cash<cost) return { success:false, msg:'잔액 부족' };
    updateCash(name, -cost, `주식 ${qty}주 매수`);
    updateStudentField(name,'주식',qty,true);
    logTxRow(name, TX.STOCK_O, '매수', cp, qty, '', `주식매수 ${qty}주@${cp}`, '완료','');
  } else if (type==='매도') {
    if ((student.stock||0)<qty) return { success:false, msg:'주식 부족' };
    updateCash(name, cp*qty, `주식 ${qty}주 매도`);
    updateStudentField(name,'주식',-qty,true);
    logTxRow(name, TX.STOCK_O, '매도', cp, qty, '', `주식매도 ${qty}주@${cp}`, '완료','');
  }
  return { success:true, msg:`체결 완료 (단가: ${cp}원)` };
}

/* ══════════════════════════════════════════════
   예금
══════════════════════════════════════════════ */
function getCurrentDepositRate() {
  const cfg = getSettings(); return Number(cfg['예금_기본이자율']||0.02);
}
function getDeposits(name) {
  const sh = getSheet(SH.ASSETS); if(!sh) return [];
  const rows = sheetToObj(sh).filter(r=>r['카테고리']===AS.DEPOSIT&&String(r['이름'])===name);
  const today = new Date();
  const todayMs = today.getTime();
  return rows.map((r,i)=>{
    const joinDate = new Date(String(r['날짜']).slice(0,19));
    const msElapsed = todayMs - joinDate.getTime();
    const daysPassed = Math.floor(msElapsed / (1000*60*60*24));
    const canWithdraw = msElapsed >= 24*60*60*1000;
    const rate = Number(r['이자율']||getCurrentDepositRate());
    const base = Number(r['금액']||0);
    const interest = Math.floor(base * rate * daysPassed);
    return { ...r, _idx:i, 가입일문자열:String(r['날짜']).slice(0,10), 경과일수:daysPassed, canWithdraw:canWithdraw, 예상이자:interest };
  });
}
function depositMoney(name, amount) {
  if (amount<1000) return { success:false, msg:'최소 1000원' };
  const s = getStudentByName(name);
  if (!s || s.cash<amount) return { success:false, msg:'잔액 부족' };
  const rate = getCurrentDepositRate();
  getOrCreate(SH.ASSETS).appendRow([nowStr(),name,AS.DEPOSIT,'예금',amount,'',rate,'활성','','']);
  updateCash(name,-amount,'예금 가입');
  return { success:true, msg:`${amount.toLocaleString()}원 예금 가입 (이자율${(rate*100).toFixed(1)}%)` };
}

// ★ 버그가 수정된 withdrawDeposit 함수입니다.
function withdrawDeposit(name, rowIdx) {
  // 1. 전체 예금 목록을 그대로 가져옵니다. (인덱스 매칭을 위해 필터링하지 않음)
  const deps = getDeposits(name);
  
  // 2. 전달받은 고유 인덱스(rowIdx)로 해당 예금을 찾습니다.
  const dep = deps[rowIdx];

  // 3. 예금이 존재하지 않거나, 이미 활성 상태가 아니라면 거절합니다.
  if (!dep || String(dep['상태']).trim() !== '활성') {
    return { success:false, msg:'해지할 수 없는 예금이거나 존재하지 않습니다.' };
  }

  // 24시간(밀리초 기준) 보호예수 체크
  const joinDate = new Date(String(dep['날짜']).slice(0,19));
  const msElapsed = new Date().getTime() - joinDate.getTime();

  if (msElapsed < 24 * 60 * 60 * 1000) {
    const remainMs = 24 * 60 * 60 * 1000 - msElapsed;
    const remainH = Math.floor(remainMs / (1000*60*60));
    const remainM = Math.floor((remainMs % (1000*60*60)) / (1000*60));
    return { success:false, msg:`24시간 후 해지 가능 (${remainH}시간 ${remainM}분 남음)` };
  }

  const total = Number(dep['금액']||0) + dep.예상이자;

  // ★ 날짜 정확히 매칭하여 올바른 행 특정
  const sh = getSheet(SH.ASSETS), data = sh.getDataRange().getValues();
  const depDateStr = String(dep['날짜']).slice(0,19);
  let found = false;
  for (let i=1; i<data.length; i++) {
    let rv = data[i][0];
    if (rv instanceof Date) rv = Utilities.formatDate(rv, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    const rowDate = String(rv).slice(0,19);
    if (data[i][1]===name && data[i][2]===AS.DEPOSIT && String(data[i][7]).trim()==='활성' && rowDate===depDateStr) {
      sh.getRange(i+1, 8).setValue('해지');
      found = true;
      break;
    }
  }
  if (!found) return { success:false, msg:'해지 처리 실패 (이미 해지되었거나 데이터 오류)' };

  updateCash(name, total, `예금 해지 (원금+이자)`);
  return { success:true, msg:`${total.toLocaleString()}원 수령` };
}

/* ══════════════════════════════════════════════
   상점 / 인벤토리
══════════════════════════════════════════════ */
function getShopItems() {
  return sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.ITEM)
    .map(r=>({아이템명:r['아이템명'],가격:Number(r['금액']||0),재고:Number(r['수량']||0),이모지:r['메타']||'🎁',설명:r['이자율']||''}));
}
function buyItem(name, itemName) {
  const sh = getSheet(SH.ASSETS), data = sh.getDataRange().getValues();
  let itemRow=-1, price=0, stock=0;
  for (let i=1;i<data.length;i++) {
    if (data[i][2]===AS.ITEM && data[i][3]===itemName) { itemRow=i; price=Number(data[i][4]); stock=Number(data[i][5]); break; }
  }
  if (itemRow<0||stock<=0) return { success:false, msg:'품절' };
  const s = getStudentByName(name);
  if (!s||s.cash<price) return { success:false, msg:'잔액 부족' };
  sh.getRange(itemRow+1,6).setValue(stock-1);
  getOrCreate(SH.ASSETS).appendRow([nowStr(),name,AS.INVEN,itemName,price,1,'','보유','','']);
  updateCash(name,-price,'상점 구매');
  return { success:true, msg:'구매 완료' };
}
function adminAddShopItem(name, price, stock, emoji, desc) {
  getOrCreate(SH.ASSETS).appendRow([nowStr(),'관리자',AS.ITEM,name,price,stock,desc||'','활성','',emoji||'🎁']);
  return { success:true, msg:'아이템 등록됨' };
}
function getInventory(name) {
  return sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.INVEN&&String(r['이름'])===name&&String(r['상태'])==='보유');
}
function useItem(name, itemName) {
  const sh=getSheet(SH.ASSETS),data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++) {
    if(data[i][1]===name&&data[i][2]===AS.INVEN&&data[i][3]===itemName&&data[i][7]==='보유'){
      sh.getRange(i+1,8).setValue('사용됨'); return { success:true, msg:'사용 완료' };
    }
  }
  return { success:false, msg:'아이템 없음' };
}

/* ══════════════════════════════════════════════
   중고거래 (장터)
══════════════════════════════════════════════ */
function getMarketItems() {
  return sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.MARKET).reverse();
}
function addMarketItem(name, itemName, price) {
  getOrCreate(SH.ASSETS).appendRow([nowStr(),name,AS.MARKET,itemName,Number(price),1,'','판매중','','']);
  return { success:true, msg:'등록 완료' };
}
function buyMarketItem(buyerName, sellerName, itemName, price) {
  if (buyerName===sellerName) return { success:false, msg:'내 물건 구매 불가' };
  const s = getStudentByName(buyerName);
  if (!s||s.cash<Number(price)) return { success:false, msg:'잔액 부족' };
  const sh=getSheet(SH.ASSETS),data=sh.getDataRange().getValues();
  let found=false;
  for(let i=1;i<data.length;i++) {
    if(data[i][2]===AS.MARKET&&data[i][1]===sellerName&&data[i][3]===itemName&&data[i][7]==='판매중'){
      sh.getRange(i+1,8).setValue('판매완료'); sh.getRange(i+1,9).setValue(buyerName); found=true; break;
    }
  }
  if(!found) return { success:false, msg:'이미 판매된 물품' };
  updateCash(buyerName,-Number(price),`중고거래 구매: ${itemName}`);
  updateCash(sellerName,Number(price),`중고거래 판매: ${itemName}`);
  return { success:true, msg:'구매 완료' };
}

/* ══════════════════════════════════════════════
   자기평가
══════════════════════════════════════════════ */
function getTodayChecklist(name) {
  return sheetToObj(getSheet(SH.ACTIVITY)).find(r=>r['카테고리']===AC.EVAL&&String(r['이름'])===name&&String(r['날짜']).slice(0,10)===todayDate()) || null;
}
function saveChecklist(name, scores, comment) {
  if (getTodayChecklist(name)) return { success:false, msg:'이미 완료함' };
  const cfg = getSettings();
  const salaryMap = { '상':Number(cfg['자기평가_상_급여']||10000), '중':Number(cfg['자기평가_중_급여']||5000), '하':Number(cfg['자기평가_하_급여']||3000) };
  const taxRate = Number(cfg['세금율']||0.10), useTax = Number(cfg['자기평가_세금적용'])===1;
  const grade = scores.role1 || '중', salary = salaryMap[grade] || 0;
  const s = getStudentByName(name);
  getOrCreate(SH.ACTIVITY).appendRow([nowStr(),name,AC.EVAL,s?s.job:'',grade,comment||'',grade,salary>0?'지급':'미지급','','']);
  if (salary>0) {
    if (useTax) {
      const tax = Math.floor(salary*taxRate);
      updateCash(name, salary-tax, '평가급여 세후', TX.SALARY);
      logTxRow(name, TX.TAX, '세금', tax, '', '', '급여세금', '완료','');
    } else {
      updateCash(name, salary, '평가급여', TX.SALARY);
    }
  }
  return { success:true, msg:`평가 완료! ${salary>0?salary.toLocaleString()+'원 지급':''}` };
}

/* ══════════════════════════════════════════════
   감정신호등
══════════════════════════════════════════════ */
function logEmotion(name, emotion, message) {
  const cfg = getSettings(), today = todayDate();
  const already = sheetToObj(getSheet(SH.ACTIVITY)).some(
    r=>r['카테고리']===AC.EMOTION&&String(r['이름'])===name&&String(r['날짜']).slice(0,10)===today
  );
  getOrCreate(SH.ACTIVITY).appendRow([
    nowStr(), name, AC.EMOTION,
    emotion, '', '', '', '',
    message||'', ''
  ]);
  let bonusMsg = '';
  if (!already && Number(cfg['감정신호등_보상_활성'])===1) {
    const bonusMap = {
      '🟢 좋음': Number(cfg['감정신호등_좋음_보상']||0),
      '🟡 보통': Number(cfg['감정신호등_보통_보상']||0),
      '🔴 힘듦': Number(cfg['감정신호등_힘듦_보상']||0)
    };
    const bonus = bonusMap[emotion] || 0;
    if (bonus>0) { updateCash(name, bonus, `감정신호등 보상(${emotion})`, TX.SALARY); bonusMsg = ` +${bonus}원 보상!`; }
  }
  return { success:true, msg:'기록 완료'+bonusMsg, bonus:bonusMsg };
}

/* ══════════════════════════════════════════════
   호출시스템 (★ v15.2: 교사 이메일 즉시 발송)
══════════════════════════════════════════════ */
function sendCall(name, category, message) {
  getOrCreate(SH.ACTIVITY).appendRow([nowStr(),name,AC.CALL,category,'','','','대기',message||'','']);
  // ★ 호출 즉시 이메일 발송
  const cfg = getSettings();
  if (Number(cfg['호출_즉시발송']) === 1) {
    try {
      const subject = `[클래스뱅크] 🔔 학생 호출 알림 — ${name} (${category})`;
      const body = [
        '안녕하세요, 선생님.',
        '',
        '학생 호출이 접수되었습니다.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        `👤 학생명  : ${name}`,
        `📂 구분    : ${category}`,
        `🕐 시각    : ${nowStr()}`,
        `💬 내용    : ${message || '(내용 없음)'}`,
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '클래스뱅크 LMS에서 확인 및 답변해 주세요.'
      ].join('\n');
      MailApp.sendEmail({ to: TEACHER_EMAIL, subject: subject, body: body });
    } catch(e) {
      Logger.log('호출 이메일 발송 실패: ' + e.message);
    }
  }
  return { success: true, msg: '전송 완료' };
}

function getCalls(name) {
  return sheetToObj(getSheet(SH.ACTIVITY))
    .filter(r=>r['카테고리']===AC.CALL&&String(r['이름'])===name)
    .reverse().slice(0,20)
    .map(r=>({날짜:r['날짜'],구분:r['내용1'],메세지:r['메세지'],답변상태:r['상태'],교사답변:r['답변']}));
}

/* ══════════════════════════════════════════════
   숙제
══════════════════════════════════════════════ */
function getHomework(status) {
  const rows = sheetToObj(getSheet(SH.LEARNING)).filter(r=>r['카테고리']===LR.HOMEWORK);
  return status==='미완료' ? rows.filter(r=>String(r['상태']).trim()!=='완료') : rows;
}
function addHomework(subject, content, dueDate, registrant, importance) {
  const id = Date.now().toString().slice(-8);
  getOrCreate(SH.LEARNING).appendRow([nowStr(),LR.HOMEWORK,id,subject,content,'all',dueDate||'',registrant||'','미완료',importance||'보통']);
  return { success:true };
}
function completeHomework(id) {
  const sh=getSheet(SH.LEARNING),data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++) {
    if(data[i][1]===LR.HOMEWORK&&String(data[i][2])===String(id)){ sh.getRange(i+1,9).setValue('완료'); return {success:true}; }
  }
  return { success:false, msg:'없음' };
}

/* ══════════════════════════════════════════════
   공지사항
══════════════════════════════════════════════ */
function getNotices() {
  return sheetToObj(getSheet(SH.LEARNING))
    .filter(r=>r['카테고리']===LR.NOTICE).reverse()
    .map(r=>({날짜:r['날짜'],제목:r['제목'],내용:r['내용'],작성자:r['작성자'],중요:r['중요도']}));
}
function adminAddNotice(title, content, isUrgent) {
  getOrCreate(SH.LEARNING).appendRow([nowStr(),LR.NOTICE,Date.now().toString().slice(-8),title,content,'all','','선생님','활성',isUrgent?'긴급':'일반']);
  return { success:true, msg:'등록됨' };
}

/* ══════════════════════════════════════════════
   시간표
══════════════════════════════════════════════ */
function getTimetable() {
  const rows = sheetToObj(getSheet(SH.LEARNING)).filter(r=>r['카테고리']===LR.TIMETABLE);
  return {
    success: true,
    timetable: rows.map(r=>({
      day:     r['제목'],
      period:  r['내용'],
      subject: r['대상'],
      teacher: r['작성자']
    }))
  };
}

/* ══════════════════════════════════════════════
   급식 (NEIS API)
══════════════════════════════════════════════ */
function getMeal(date) {
  const targetDate = date || todayDate();
  const neisDate = targetDate.replace(/-/g, '');
  try {
    const url = `${NEIS_BASE_URL}/mealServiceDietInfo`
      + `?KEY=${NEIS_KEY}&Type=json`
      + `&ATPT_OFCDC_SC_CODE=${NEIS_OFFICE}`
      + `&SD_SCHUL_CODE=${NEIS_SCHOOL}`
      + `&MLSV_YMD=${neisDate}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (!json.mealServiceDietInfo) {
      return { success: false, meals: [], date: targetDate, msg: '해당 날짜 급식 없음' };
    }
    const items = json.mealServiceDietInfo[1].row;
    return {
      success: true,
      date: targetDate,
      meals: items.map(m => ({
        type: m.MMEAL_SC_NM,
        menu: m.DDISH_NM.replace(/<br\/>/g, '\n').replace(/\d+\.\d*/g, '').trim(),
        calorie: m.CAL_INFO || '',
        nutrition: m.NTR_INFO || ''
      }))
    };
  } catch(e) {
    return { success: false, meals: [], date: targetDate, msg: String(e.message) };
  }
}

/* ══════════════════════════════════════════════
   자리배치 / 부동산
══════════════════════════════════════════════ */
function getRealEstateData() {
  return { seats: sheetToObj(getSheet(SH.SEAT)) };
}
function sellSeat(name, price) {
  price = Number(price); if (price<=0) return { success:false, msg:'가격 오류' };
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++) {
    if(String(data[i][4])===name){ sh.getRange(i+1,6).setValue('매물등록'); sh.getRange(i+1,7).setValue(price); return {success:true,msg:'매물 등록 완료'}; }
  }
  return { success:false, msg:'배정된 자리 없음' };
}
function buySeat(buyerName, seatId) {
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  let seller='',price=0,row=-1;
  for(let i=1;i<data.length;i++) {
    if(String(data[i][0])===String(seatId)&&String(data[i][5])==='매물등록'){
      seller=data[i][4]; price=Number(data[i][6]); row=i; break;
    }
  }
  if(row===-1) return {success:false,msg:'매물 없음'};
  if(buyerName===seller) return {success:false,msg:'내 자리 구매 불가'};
  if(getStudentByName(buyerName).cash<price) return {success:false,msg:'잔액 부족'};
  const txId = Date.now().toString();
  updateCash(buyerName,-price,'부동산 구매 홀딩');
  sh.getRange(row+1,6).setValue('거래중');
  sh.getRange(row+1,8).setValue('승인대기');
  sh.getRange(row+1,9).setValue(txId);
  sh.getRange(row+1,10).setValue(nowStr());
  logTxRow(buyerName,TX.RE_TX,'매수신청',price,'',seatId,`${seller}→${buyerName}`,'승인대기',txId);
  return {success:true,msg:'구매 신청 완료! 선생님 승인 대기'};
}
function cancelMySale(name) {
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++) {
    if(String(data[i][4])===name&&String(data[i][5])==='매물등록'){
      sh.getRange(i+1,6).setValue('일반'); sh.getRange(i+1,7).setValue('');
      return {success:true,msg:'취소 완료'};
    }
  }
  return {success:false,msg:'취소할 매물 없음'};
}
function adminGenSeat(rows, cols) {
  const sh=getOrCreate(SH.SEAT);
  sh.clear(); sh.appendRow(SCHEMA[SH.SEAT]);
  for(let r=1;r<=rows;r++) for(let c=1;c<=cols;c++) sh.appendRow([`${r}-${c}`,r,c,'O','','일반','','','','']);
  return {success:true,msg:`${rows}x${cols} 좌석 생성 완료`};
}
function adminToggleSeat(id) {
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++) {
    if(String(data[i][0])===String(id)){
      const cur=data[i][3];
      sh.getRange(i+1,4).setValue(cur==='O'?'X':'O');
      if(cur==='O'){sh.getRange(i+1,5).setValue('');sh.getRange(i+1,6).setValue('일반');sh.getRange(i+1,7).setValue('');}
      return {success:true};
    }
  }
  return {success:false};
}
function adminSetSeat(id, name) {
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  for(let i=1;i<data.length;i++) {
    if(String(data[i][0])===String(id)){ sh.getRange(i+1,5).setValue(name); return {success:true}; }
  }
  return {success:false};
}
function adminShuffleSeat() {
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  let names=getStudents().map(s=>s.name);
  for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  let idx=0;
  for(let i=1;i<data.length;i++) {
    if(String(data[i][3])==='O'){
      sh.getRange(i+1,5).setValue(idx<names.length?names[idx++]:'');
      sh.getRange(i+1,6).setValue('일반'); sh.getRange(i+1,7).setValue('');
    }
  }
  return {success:true,msg:'랜덤 배치 완료'};
}
function adminApproveRealEstate(txId, isApprove) {
  const sh=getSheet(SH.SEAT),data=sh.getDataRange().getValues();
  let txRow=-1,seller='',buyer='',seatId='',price=0;
  for(let i=1;i<data.length;i++) {
    if(String(data[i][8])===String(txId)){
      txRow=i; seatId=data[i][0];
      const txRows=sheetToObj(getSheet(SH.TX_LOG)).filter(r=>r['메타']===String(txId));
      if(txRows.length>0){price=Number(txRows[0]['금액']||0);buyer=txRows[0]['이름'];const parts=String(txRows[0]['사유']).split('→');seller=parts[0]?parts[0].trim():'';}
      break;
    }
  }
  if(txRow===-1) return {success:false,msg:'거래 없음'};
  if(isApprove){
    let bRow=-1,tRow=-1;
    for(let j=1;j<data.length;j++){if(String(data[j][4])===buyer)bRow=j;if(String(data[j][0])===String(seatId))tRow=j;}
    if(tRow!==-1){sh.getRange(tRow+1,5).setValue(buyer);sh.getRange(tRow+1,6).setValue('일반');sh.getRange(tRow+1,7).setValue('');sh.getRange(tRow+1,8).setValue('승인완료');}
    if(bRow!==-1&&bRow!==tRow){sh.getRange(bRow+1,5).setValue(seller);sh.getRange(bRow+1,6).setValue('일반');sh.getRange(bRow+1,7).setValue('');}
    updateCash(seller,price,'부동산 판매 대금');
    logTxRow(buyer,TX.RE_TX,'승인완료',price,'',seatId,`${seller}→${buyer}`,'완료',txId);
    return {success:true,msg:'자리 교체 및 송금 완료'};
  } else {
    if(txRow!==-1){sh.getRange(txRow+1,6).setValue('일반');sh.getRange(txRow+1,7).setValue('');sh.getRange(txRow+1,8).setValue('거절');}
    updateCash(buyer,price,'부동산 거절 환불');
    logTxRow(buyer,TX.RE_TX,'거절',price,'',seatId,`${seller}→${buyer}`,'거절',txId);
    return {success:true,msg:'거절 및 환불 완료'};
  }
}

/* ══════════════════════════════════════════════
   레벨 시스템
══════════════════════════════════════════════ */
function getLevelForAsset(totalAsset, cfg) {
  // 설정에서 레벨 정보 읽기 (최대 10레벨)
  const levels = [];
  for (let i = 1; i <= 10; i++) {
    const name = cfg[`레벨_${i}_이름`];
    const min  = cfg[`레벨_${i}_최소자산`];
    if (name === undefined) break;
    levels.push({ name: String(name), min: Number(min||0) });
  }
  if (!levels.length) return cfg['레벨_기본등급'] || '씨앗';
  // 내림차순 정렬 후 첫 번째 조건 충족 레벨 반환
  levels.sort((a,b)=>b.min-a.min);
  for (const lv of levels) {
    if (totalAsset >= lv.min) return lv.name;
  }
  return levels[levels.length-1].name;
}

function updateStudentLevel(name) {
  const cfg = getSettings();
  const s = getStudentByName(name); if (!s) return;
  const deps = sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.DEPOSIT&&String(r['이름'])===name&&String(r['상태']).trim()==='활성');
  const depTotal = deps.reduce((a,b)=>a+Number(b['금액']||0),0);
  const stockVal = (s.stock||0)*getCurrentStockPrice();
  const totalAsset = s.cash + depTotal + stockVal;
  const level = getLevelForAsset(totalAsset, cfg);
  updateStudentField(name, '레벨', level);
}

function updateAllStudentLevels() {
  const students = getStudents();
  students.forEach(s => updateStudentLevel(s.name));
  return { success: true, msg: `${students.length}명 레벨 업데이트 완료` };
}

/* ══════════════════════════════════════════════
   관리자 권한 위임
══════════════════════════════════════════════ */
function adminGrantPermission(studentName, permissions) {
  updateStudentField(studentName, '권한', permissions || '');
  return { success: true, msg: `${studentName}에게 권한 부여 완료` };
}

function getStudentPermissions(name) {
  const s = getStudentByName(name);
  if (!s) return [];
  const perm = String(s.permission||'').trim();
  return perm ? perm.split(',').map(p=>p.trim()).filter(Boolean) : [];
}

function delegatedPay(actorName, targetName, amount, reason) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('월급배부')) return { success:false, msg:'월급배부 권한 없음' };
  amount = Number(amount);
  if (!targetName || !amount || !reason) return { success:false, msg:'입력 오류' };
  const target = targetName==='all' ? getStudents().map(s=>s.name) : [targetName];
  target.forEach(n => updateCash(n, amount, `[${actorName}] ${reason}`));
  return { success:true, msg:`${target.length}명에게 ${amount.toLocaleString()}원 지급 완료` };
}

function delegatedFine(actorName, targetName, amount, reason) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('벌금징수')) return { success:false, msg:'벌금징수 권한 없음' };
  amount = Number(amount);
  if (!targetName || !amount || !reason) return { success:false, msg:'입력 오류' };
  const s = getStudentByName(targetName);
  if (!s) return { success:false, msg:'학생 없음' };
  const actual = Math.min(amount, s.cash);
  if (actual > 0) {
    updateCash(targetName, -actual, `[벌금][${actorName}] ${reason}`);
    // 벌금을 공공자산 수입으로 기록
    logTxRow('공공자산', '벌금수입', '수입', actual, '', targetName, `[벌금징수] ${reason}`, '완료', '');
  }
  logTxRow(targetName, TX.TAX, '벌금', actual, '', actorName, reason, '완료', '');
  return { success:true, msg:`${targetName}에게 ${actual.toLocaleString()}원 벌금 징수 (국고 편입 완료)` };
}


// 권한 위임 함수들 아래에 추가
function delegatedTax(actorName, targetName, amount, reason) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('세금징수')) return { success:false, msg:'세금징수 권한 없음' };
  amount = Number(amount);
  if (!targetName || !amount || !reason) return { success:false, msg:'입력 오류' };

  const targets = targetName === 'all' ? getStudents().map(s=>s.name) : [targetName];
  let totalCollected = 0;

  targets.forEach(n => {
    const s = getStudentByName(n);
    if(s) {
      const actual = Math.min(amount, s.cash); // 가진 돈까지만 징수
      if(actual > 0) {
        updateCash(n, -actual, `[세금][${actorName}] ${reason}`);
        totalCollected += actual;
      }
    }
  });

  if(totalCollected > 0) {
     // 걷어들인 세금을 국고(공공자산)로 편입
     logTxRow('공공자산', TX.TAX, '수입', totalCollected, '', actorName, `[세금징수] ${reason}`, '완료', '');
  }

  return { success:true, msg:`총 ${totalCollected.toLocaleString()}원 세금 징수 및 국고 편입 완료` };
}




function delegatedAddNotice(actorName, title, content, isUrgent) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('공지작성')) return { success:false, msg:'공지작성 권한 없음' };
  getOrCreate(SH.LEARNING).appendRow([nowStr(),LR.NOTICE,Date.now().toString().slice(-8),title,content,'all','',actorName,'활성',isUrgent?'긴급':'일반']);
  return { success:true, msg:'공지 등록 완료' };
}

function delegatedPraiseCard(actorName, targetName, message) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('칭찬카드')) return { success:false, msg:'칭찬카드 권한 없음' };
  if (!targetName || !message) return { success:false, msg:'입력 오류' };
  getOrCreate(SH.ACTIVITY).appendRow([nowStr(), actorName, '칭찬카드', targetName, message, '', '', '완료', '', '']);
  updateCash(targetName, 200, `칭찬카드 수령 (${actorName})`);
  return { success:true, msg:`${targetName}에게 칭찬카드 전달! (+200원 보상)` };
}

function delegatedWarning(actorName, targetName, reason) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('경고')) return { success:false, msg:'경고 권한 없음' };
  if (!targetName || !reason) return { success:false, msg:'입력 오류' };
  getOrCreate(SH.ACTIVITY).appendRow([nowStr(), actorName, '경고', targetName, reason, '', '', '완료', '', '']);
  logTxRow(targetName, TX.EMPLOY, '경고', 0, '', actorName, reason, '완료', '');
  return { success:true, msg:`${targetName}에게 경고 처분 완료` };
}

function getDelegatedHistory(actorName) {
  const acts = sheetToObj(getSheet(SH.ACTIVITY))
    .filter(r => (r['카테고리']==='칭찬카드'||r['카테고리']==='경고') && String(r['이름'])===actorName)
    .reverse().slice(0,20);
  return acts.map(r=>({날짜:r['날짜'],구분:r['카테고리'],대상:r['내용1'],내용:r['내용2']}));
}

function getPraiseCards(name) {
  return sheetToObj(getSheet(SH.ACTIVITY))
    .filter(r => r['카테고리']==='칭찬카드' && String(r['내용1'])===name)
    .reverse().slice(0,10)
    .map(r=>({날짜:r['날짜'],보낸이:r['이름'],메시지:r['내용2']}));
}

function getJobMarket() {
  const rows = sheetToObj(getSheet(SH.CONFIG)).filter(r=>r['카테고리']==='직업');
  return rows.map(r=>({직업명:r['설정키'],급여:Number(r['설정값']||0),역할:r['설명']||'',모집인원:r['수정일']||1,상태:'모집중'}));
}
function applyJob(name, jobName, msg) {
  const s = getStudentByName(name);
  if (!s) return { success:false, msg:'학생 없음' };
  const currentJob = String(s.job||'무직').trim();
  if (currentJob && currentJob !== '무직' && currentJob !== '') {
    return { success:false, msg:`이미 [${currentJob}] 직업이 있습니다. 현재 직업이 있는 경우 구직할 수 없습니다.` };
  }
  logTxRow(name, TX.JOB_APP, '지원', 0, '', jobName, msg||'', '대기','');
  return {success:true,msg:'지원 완료! 선생님 승인을 기다려주세요.'};
}
function adminAddJob(title, role, salary, count) {
  getOrCreate(SH.CONFIG).appendRow(['직업',title,salary||0,role||'',count||1]);
  return {success:true,msg:'직업 등록됨'};
}
function adminDiscipline(name, type, amount, reason) {
  amount=Number(amount);
  logTxRow(name, TX.EMPLOY, type, amount, '', '', reason, '완료','');
  if(type==='파면'){updateStudentField(name,'상태','해고');updateStudentField(name,'직업명','무직');}
  else if(type==='정직') updateStudentField(name,'상태','정직');
  if(amount>0) {
    updateCash(name, -amount, `징계(${type})`);
    // 징계 벌금을 공공자산 수입으로 기록
    logTxRow('공공자산', '벌금수입', '수입', amount, '', name, `[징계벌금] ${reason}`, '완료', '');
  }
  return {success:true,msg:'완료'};
}

/* ══════════════════════════════════════════════
   랭킹 / 초기 데이터
══════════════════════════════════════════════ */
function getRankingData() {
  const students=getStudents(), curP=getCurrentStockPrice();
  const emos=sheetToObj(getSheet(SH.ACTIVITY)).filter(r=>r['카테고리']===AC.EMOTION), today=todayDate();
  const deps=sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.DEPOSIT&&String(r['상태']).trim()==='활성');
  let rank=students.map(s=>{
    const sDep=deps.filter(d=>d['이름']===s.name).reduce((a,b)=>a+Number(b['금액']),0);
    const sStk=(s.stock||0)*curP;
    const tEmo=emos.slice().reverse().find(e=>e['이름']===s.name&&String(e['날짜']).startsWith(today));
    return {name:s.name,total:s.cash+sDep+sStk,cash:s.cash,stockAmt:sStk,depAmt:sDep,emotion:tEmo?tEmo['내용1']:'미등록',level:s.level||''};
  });
  return {asset:rank.slice().sort((a,b)=>b.total-a.total),stock:rank.slice().sort((a,b)=>b.stockAmt-a.stockAmt),deposit:rank.slice().sort((a,b)=>b.depAmt-a.depAmt),emotion:rank};
}

function getInitData(name) {
  const student=getStudentByName(name); if(!student) return {success:false};
  const deps=getDeposits(name);
  const activeDeps=deps.filter(d=>String(d['상태']).trim()==='활성');
  const depTotal=activeDeps.reduce((a,b)=>a+Number(b['금액']||0),0);
  const depInterest=activeDeps.reduce((a,b)=>a+(b.예상이자||0),0);
  const curP=getCurrentStockPrice();
  const stockAmt=(student.stock||0)*curP;
  const cfg=getSettings();
  const totalAsset=student.cash+depTotal+stockAmt;
  const level=getLevelForAsset(totalAsset,cfg);
  updateStudentField(name,'레벨',level);
  student.level=level;
  const hw=getHomework('미완료');
  const notices=getNotices(); const urgentNotice=notices.find(n=>String(n['중요']).trim()==='긴급')||null;
  // 👇 추가된 부분: 세금과 공공자산을 거래LOG에서 모두 더합니다 👇
  const txRows = sheetToObj(getSheet(SH.TX_LOG));
  const taxTotal = txRows.filter(r => r['카테고리'] === TX.TAX || String(r['사유']).includes('벌금')).reduce((sum, r) => sum + Number(r['금액']||0), 0);
  const publicTotal = txRows.filter(r => String(r['이름']) === '공공자산').reduce((sum, r) => sum + Number(r['금액']||0), 0);
  // 👆 여기까지 👆
  return {success:true,student,depTotal,depInterest,stockAsset:stockAmt,stockQty:student.stock||0,stockPrice:curP,hwCount:hw.length,notices:notices.slice(0,3),urgentNotice,chkDone:!!getTodayChecklist(name),depositRate:getCurrentDepositRate(),rank:getRankingData(),settings:cfg,level, taxTotal:taxTotal, publicTotal:publicTotal};
}

function getTrends(name) {
  const acts=sheetToObj(getSheet(SH.ACTIVITY)).filter(r=>String(r['이름'])===name);
  const emoMap={'🟢 좋음':3,'🟡 보통':2,'🔴 힘듦':1};
  const emotions=acts.filter(r=>r['카테고리']===AC.EMOTION).slice(-14).map(r=>({date:String(r['날짜']).slice(5,10),score:emoMap[r['내용1']]||2}));
  const evals=acts.filter(r=>r['카테고리']===AC.EVAL).slice(-14).map(r=>({date:String(r['날짜']).slice(0,10).slice(5,10),score:({상:3,중:2,하:1})[r['점수']]||0}));
  const hists=acts.filter(r=>r['카테고리']===AC.EVAL).slice(-5).map(r=>({날짜:r['날짜'],점수:r['점수'],소감:r['내용2']}));
  return {emotions,evals,hists};
}

/* ══════════════════════════════════════════════
   관리자 전체 데이터
══════════════════════════════════════════════ */
function adminAuth(pw) { return { success: pw===ADMIN_PASSWORD }; }

function getAdminEmotionStats() {
  const acts=sheetToObj(getSheet(SH.ACTIVITY)).filter(r=>r['카테고리']===AC.EMOTION);
  const today=todayDate();
  let todayStats={'🟢 좋음':0,'🟡 보통':0,'🔴 힘듦':0};
  let detail={'🟢 좋음':[],'🟡 보통':[],'🔴 힘듦':[]};
  let messages=[], warnings=[], stdMap={};
  acts.forEach(e=>{
    const emo=e['내용1'];
    if(!stdMap[e['이름']])stdMap[e['이름']]=[];
    stdMap[e['이름']].push(e);
    if(String(e['날짜']).startsWith(today)){
      if(todayStats[emo]!==undefined){
        todayStats[emo]++;
        if(!detail[emo].includes(e['이름']))detail[emo].push(e['이름']);
      }
      const msg=e['메세지']||'';
      if(String(msg).trim())messages.push({name:e['이름'],emo,msg:String(msg)});
    }
  });
  for(let name in stdMap){let h=stdMap[name].slice().reverse(),bad=0;for(let i=0;i<Math.min(h.length,3);i++){if(h[i]['내용1']==='🔴 힘듦')bad++;else break;}if(bad>=3)warnings.push(name);}
  const weeklyStats=[];
  for(let d=6;d>=0;d--){
    const dt=new Date();dt.setDate(dt.getDate()-d);
    const ds=Utilities.formatDate(dt,'Asia/Seoul','yyyy-MM-dd'),lbl=Utilities.formatDate(dt,'Asia/Seoul','MM/dd');
    const de=acts.filter(e=>String(e['날짜']).startsWith(ds));
    weeklyStats.push({date:lbl,good:de.filter(e=>e['내용1']==='🟢 좋음').length,mid:de.filter(e=>e['내용1']==='🟡 보통').length,bad:de.filter(e=>e['내용1']==='🔴 힘듦').length});
  }
  return {todayStats,detail,messages,warnings,weeklyStats};
}

function adminGetAllData() {
  const students = getStudents();
  const roleTable = [
    {번호:19,이름:'강지인',직업:'환경부 장관(b)',미션:'분리수거함 상태 확인, 보조',부서:'환경정보부'},
    {번호:4,이름:'고설아',직업:'국가정보원장(B)',미션:'번호대로 가정통신문 수거 및 관리',부서:'교육문화부'},
    {번호:25,이름:'김려은',직업:'식품안전부 장관(a)',미션:'급식실 이동시, 떠들지 않게 지도',부서:'법무안전부'},
    {번호:26,이름:'김보영',직업:'보건복지부 장관',미션:'교실 환기, 아픈 친구 보건실 동행 보조',부서:'환경정보부'},
    {번호:18,이름:'김연수',직업:'환경부 장관(a)',미션:'분리수거 봉사위원',부서:'환경정보부'},
    {번호:16,이름:'김예은',직업:'국립도서관장',미션:'사물함 정리 사물함 위 청결 감독',부서:'환경정보부'},
    {번호:13,이름:'김태은',직업:'방송통신위원장(a)',미션:'생일 파티 기획',부서:'국정운영본부'},
    {번호:17,이름:'김현주',직업:'문화체육부 장관/사장',미션:'체육 수업 장소 확인 / 학급 내 마트 운영',부서:'경제금융부'},
    {번호:11,이름:'문지호',직업:'경찰(c)',미션:'복도에서 떠들지 않기 감독',부서:'법무안전부'},
    {번호:10,이름:'박유빈',직업:'경찰(b)',미션:'휴대폰 사용 금지 감독',부서:'법무안전부'},
    {번호:23,이름:'박지아',직업:'한국방송공사 사장(a)',미션:'학급 신문 기사 작성',부서:'교육문화부'},
    {번호:5,이름:'변미노',직업:'기획재정부 장관',미션:'학급 예산 관리, 월말 세금 결정 및 징수',부서:'경제금융부'},
    {번호:7,이름:'서언',직업:'국세청장',미션:'벌금 미납 확인, 불공정 거래 감시',부서:'경제금융부'},
    {번호:20,이름:'안서빈',직업:'자원에너지부 장관',미션:'전등, 에어컨, tv 전원 끄기 점검',부서:'환경정보부'},
    {번호:9,이름:'윤선우',직업:'경찰(a)',미션:'교실 내 위험 행동 감독',부서:'법무안전부'},
    {번호:15,이름:'이세연',직업:'우체국장',미션:'칭찬 카드 배달',부서:'교육문화부'},
    {번호:24,이름:'이시아',직업:'한국방송공사 사장(b)',미션:'학급 신문 기사 작성',부서:'교육문화부'},
    {번호:2,이름:'이채연',직업:'국무총리(부반장)',미션:'대통령 보좌, 갈등 중재, 청소 감독',부서:'국정운영본부'},
    {번호:1,이름:'이하진',직업:'대통령(반장)',미션:'회의 주재, 모든 부서 활동 관리, 청소 감독',부서:'국정운영본부'},
    {번호:6,이름:'정수빈',직업:'은행원',미션:'매월 월급 이체 및 관리',부서:'경제금융부'},
    {번호:22,이름:'정예령',직업:'문화재청장',미션:'교실 문단속 2차 확인, 교실 책상 줄 맞추기',부서:'환경정보부'},
    {번호:21,이름:'조의제',직업:'과학기술부 장관',미션:'수업 시작 전, 교육 시작 전 PC, TV 세팅',부서:'환경정보부'},
    {번호:14,이름:'주예솔',직업:'방송통신위원장(b)',미션:'학급비 사용 방안 기획',부서:'국정운영본부'},
    {번호:12,이름:'최예서',직업:'국회의장',미션:'학급 규칙 개정 사항 기록 및 공표',부서:'국정운영본부'},
    {번호:3,이름:'최지현',직업:'국가정보원장(A)',미션:'알림장 교무실에서 가져오기, 유인물 배부',부서:'교육문화부'},
    {번호:8,이름:'허수연',직업:'법무부 장관',미션:'학급 규칙 위반 시 재판 진행 및 판결',부서:'법무안전부'}
  ];

  const curP = getCurrentStockPrice();
  const cfg = getSettings();
  const rate = Number(cfg['예금_기본이자율']||0.02);
  const deps = sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.DEPOSIT&&String(r['상태']).trim()==='활성');
  const todayMs = new Date().getTime();

  // 학생 종합 자산 데이터 생성
  const assetOverview = students.map(s => {
    let depTotal = 0;
    deps.filter(d => d['이름'] === s.name).forEach(d => {
      const joinDate = new Date(String(d['날짜']).slice(0,19));
      const msElapsed = todayMs - joinDate.getTime();
      const daysPassed = Math.floor(msElapsed / (1000*60*60*24));
      const base = Number(d['금액']||0);
      const dRate = Number(d['이자율']||rate);
      const interest = Math.floor(base * dRate * daysPassed);
      depTotal += (base + interest);
    });
    const stockVal = (s.stock||0) * curP;
    const totalAsset = s.cash + depTotal + stockVal;
    const level = getLevelForAsset(totalAsset, cfg);
    return { id: s.id, name: s.name, cash: s.cash, deposit: depTotal, stock: stockVal, total: totalAsset, level: level };
  });
  assetOverview.sort((a,b)=>Number(a.id)-Number(b.id));

  return {
    students,
    market: getMarketItems(),
    stockInfo: {'현재가':curP},
    depositRate: rate,
    notices: getNotices(),
    calls: sheetToObj(getSheet(SH.ACTIVITY)).filter(r=>r['카테고리']===AC.CALL).reverse().map(r=>({날짜:r['날짜'],이름:r['이름'],구분:r['내용1'],메세지:r['메세지'],답변상태:r['상태'],교사답변:r['답변']})),
    realEstatePending: sheetToObj(getSheet(SH.SEAT)).filter(r=>String(r['거래상태']).trim()==='승인대기').map(r=>({txId:r['txId'],좌석ID:r['좌석ID'],가격:r['매물가격']})),
    emotionStats: getAdminEmotionStats(),
    realEstateGrid: sheetToObj(getSheet(SH.SEAT)),
    settings: cfg,
    roleTable,
    assetOverview
  };
}

function adminUpdateStudent(name, cashDelta, stockDelta) {
  if(Number(cashDelta)!==0) updateCash(name,Number(cashDelta),'교사 권한 조정');
  if(Number(stockDelta)!==0) updateStudentField(name,'주식',Number(stockDelta),true);
  return {success:true,msg:'업데이트됨'};
}

function adminUpdatePublicAsset(amount, reason) {
  amount = Number(amount);
  if (!reason) return { success:false, msg:'사유를 입력하세요.' };
  
  const type = amount >= 0 ? '수입' : '지출';
  // 공공자산 거래 내역을 기록하여 잔액에 반영되도록 함
  logTxRow('공공자산', '국고조정', type, Math.abs(amount), '', '관리자', reason, '완료', '');
  
  return { success:true, msg:`국고 ${amount >= 0 ? '+' : ''}${amount.toLocaleString()}원 조정 완료` };
}



function adminUpdateStock(price, title, content, impact) {
  const sh=getOrCreate(SH.STOCK);
  sh.appendRow([nowStr(),'주가',Number(price),'','','']);
  if(title) sh.appendRow([nowStr(),'뉴스',title,content||'',impact||'','']);
  return {success:true,msg:'적용됨'};
}
function adminUpdateDepositRate(rate) {
  updateSettings({'예금_기본이자율':Number(rate)});
  return {success:true,msg:'이자율 변경됨'};
}
function adminPay(target, amount, reason, isTax) {
  amount=Number(amount); const cfg=getSettings(); const taxRate=Number(cfg['세금율']||0.10);
  const names=target==='all'?getStudents().map(s=>s.name):[target]; let count=0;
  names.forEach(n=>{
    if(isTax&&amount>0){
      const tax=Math.floor(amount*taxRate);
      updateCash(n,amount-tax,`${reason} (세후)`);
      logTxRow(n,TX.TAX,'세금',tax,'','',reason,'완료','');
    }else updateCash(n,amount,reason);
    count++;
  });
  return {success:true,msg:`${count}명 완료`};
}
function adminReplyCall(dateStr, name, reply) {
  const sh=getSheet(SH.ACTIVITY),data=sh.getDataRange().getValues();
  for(let i=data.length-1;i>=1;i--){
    let dv=data[i][0];if(dv instanceof Date)dv=Utilities.formatDate(dv,'Asia/Seoul','yyyy-MM-dd HH:mm:ss');
    if(data[i][2]===AC.CALL&&String(dv).includes(dateStr.slice(0,16))&&String(data[i][1])===name){
      sh.getRange(i+1,8).setValue('완료'); sh.getRange(i+1,10).setValue(reply);
      return {success:true,msg:'답변 완료'};
    }
  }
  return {success:false,msg:'호출 없음'};
}
function adminDeleteRow(sheetName, colIdx, val) {
  const sh=getSheet(sheetName);
  if(!sh) return {success:false,msg:'시트없음'};
  const data=sh.getDataRange().getValues();
  for(let i=data.length-1;i>=1;i--) {
    if(String(data[i][colIdx])===String(val)){ sh.deleteRow(i+1); return {success:true,msg:'삭제됨'}; }
  }
  return {success:false,msg:'없음'};
}

/* ══════════════════════════════════════════════
   학생 종합 프로파일
══════════════════════════════════════════════ */
function getStudentProfile(name) {
  const student=getStudentByName(name);
  if(!student) return {success:false,msg:'학생 없음'};
  const curP=getCurrentStockPrice();
  const deps=getDeposits(name); const actDeps=deps.filter(d=>String(d['상태']).trim()==='활성');
  const depTotal=actDeps.reduce((a,b)=>a+Number(b['금액']||0),0);
  const stockVal=(student.stock||0)*curP;
  const totalAsset=student.cash+depTotal+stockVal;
  const txRows=sheetToObj(getSheet(SH.TX_LOG)).filter(r=>String(r['이름'])===name&&r['카테고리']===TX.CASH);
  const incomeTotal=txRows.filter(r=>r['유형']==='수입').reduce((a,b)=>a+Number(b['금액']||0),0);
  const expenseTotal=txRows.filter(r=>r['유형']==='지출').reduce((a,b)=>a+Number(b['금액']||0),0);
  const txPartners={};
  txRows.forEach(t=>{const r=String(t['사유']||'');let p=null;if(r.includes('에게 송금'))p=r.replace('에게 송금','').trim();if(r.includes('로부터 송금'))p=r.replace('로부터 송금','').trim();if(p)txPartners[p]=(txPartners[p]||0)+1;});
  const topPartners=Object.entries(txPartners).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,c])=>({name:n,count:c}));
  const totalSalaryReceived=sheetToObj(getSheet(SH.TX_LOG)).filter(r=>r['이름']===name&&r['카테고리']===TX.SALARY).reduce((a,b)=>a+Number(b['금액']||0),0);
  const totalTaxPaid=sheetToObj(getSheet(SH.TX_LOG)).filter(r=>r['이름']===name&&r['카테고리']===TX.TAX).reduce((a,b)=>a+Number(b['금액']||0),0);
  const acts=sheetToObj(getSheet(SH.ACTIVITY)).filter(r=>String(r['이름'])===name);
  const emos=acts.filter(r=>r['카테고리']===AC.EMOTION);
  const emoMap={'🟢 좋음':3,'🟡 보통':2,'🔴 힘듦':1};
  const emoCount={'🟢 좋음':0,'🟡 보통':0,'🔴 힘듦':0};
  emos.forEach(e=>{if(emoCount[e['내용1']]!==undefined)emoCount[e['내용1']]++;});
  const emoTimeline=emos.slice(-30).map(e=>({date:String(e['날짜']).slice(5,10),score:emoMap[e['내용1']]||2,raw:e['내용1'],msg:e['메세지']||''}));
  const avgEmo=emos.length?emos.reduce((a,b)=>a+(emoMap[b['내용1']]||2),0)/emos.length:2;
  const evals=acts.filter(r=>r['카테고리']===AC.EVAL);
  const evalMap={상:3,중:2,하:1};
  const evalCount={상:0,중:0,하:0};evals.forEach(e=>{if(evalCount[e['점수']]!==undefined)evalCount[e['점수']]++;});
  const evalTimeline=evals.slice(-30).map(e=>({date:String(e['날짜']).slice(5,10),score:evalMap[e['점수']]||0,grade:e['점수']||'',comment:e['내용2']||''}));
  const avgEval=evals.length?evals.reduce((a,b)=>a+(evalMap[b['점수']]||0),0)/evals.length:0;
  const seats=sheetToObj(getSheet(SH.SEAT));
  const mySeat=seats.find(s=>String(s['이름'])===name&&String(s['활성여부']).trim()==='O')||null;
  let seatNeighbors=[];
  if(mySeat){const mr=Number(mySeat['행']),mc=Number(mySeat['열']);seats.filter(s=>s['이름']&&s['이름']!==name&&String(s['활성여부']).trim()==='O').forEach(s=>{const dr=Math.abs(Number(s['행'])-mr),dc=Math.abs(Number(s['열'])-mc),dist=Math.sqrt(dr*dr+dc*dc);if(dist<=1.5)seatNeighbors.push({name:String(s['이름']),dist:Math.round(dist*10)/10});});}
  seatNeighbors.sort((a,b)=>a.dist-b.dist);
  const callHistory=acts.filter(r=>r['카테고리']===AC.CALL).slice(-10).reverse().map(r=>({날짜:r['날짜'],구분:r['내용1'],메세지:r['메세지'],교사답변:r['답변']}));
  const mktHistory=sheetToObj(getSheet(SH.ASSETS)).filter(r=>r['카테고리']===AS.MARKET&&(String(r['이름'])===name||String(r['구매자'])===name)).slice(-10);
  const allStudents=getStudents().map(s=>s.name).filter(n=>n!==name);
  const allEmos=sheetToObj(getSheet(SH.ACTIVITY)).filter(r=>r['카테고리']===AC.EMOTION);
  const allDates=[...new Set(emoTimeline.map(e=>e.date))];
  const friendScore={};
  allStudents.forEach(other=>{
    let score=0;
    score+=(txPartners[other]||0)*15;
    const nb=seatNeighbors.find(s=>s.name===other);if(nb)score+=Math.round((1-nb.dist/2)*80);
    allDates.forEach(date=>{const me=emoTimeline.find(e=>e.date===date);const ot=allEmos.filter(e=>String(e['이름'])===other).find(e=>String(e['날짜']).slice(5,10)===date);if(me&&ot){const diff=Math.abs(me.score-(emoMap[ot['내용1']]||2));score+=Math.round((1-diff/2)*10);}});
    if(score>0)friendScore[other]=score;
  });
  const friendRank=Object.entries(friendScore).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,s])=>({name:n,score:s}));
  return {
    success:true, student, totalAsset, depTotal, stockVal,
    incomeTotal, expenseTotal, totalSalaryReceived, totalTaxPaid, txCount:txRows.length,
    topPartners, emoCount, emoTimeline, avgEmo, emoStr:avgEmo>=2.6?'🟢 양호':avgEmo>=1.8?'🟡 보통':'🔴 주의',
    evalCount, evalTimeline, avgEval, evalStr:avgEval>=2.5?'상':avgEval>=1.5?'중':'하',
    mySeat:mySeat?`${mySeat['행']}행 ${mySeat['열']}열`:'미배정',
    seatNeighbors, callHistory, mktHistory, friendRank,
    evalDoneCount:evals.length, emoDoneCount:emos.length
  };
}

/* ══════════════════════════════════════════════
   학급 관계 분석
══════════════════════════════════════════════ */
function getClassRelationData() {
  const students=getStudents(); const names=students.map(s=>s.name); if(!names.length) return {success:false,msg:'학생 없음'};
  const txAll=sheetToObj(getSheet(SH.TX_LOG)).filter(r=>r['카테고리']===TX.CASH);
  const actAll=sheetToObj(getSheet(SH.ACTIVITY));
  const emoAll=actAll.filter(r=>r['카테고리']===AC.EMOTION);
  const seats=sheetToObj(getSheet(SH.SEAT)).filter(s=>String(s['활성여부']).trim()==='O'&&s['이름']);
  const emoMap={'🟢 좋음':3,'🟡 보통':2,'🔴 힘듦':1};
  const txEdges={};
  txAll.forEach(t=>{
    const r=String(t['사유']||''),n=String(t['이름']||'');let p=null;
    if(r.includes('에게 송금'))p=r.replace('에게 송금','').trim();
    if(r.includes('로부터 송금'))p=r.replace('로부터 송금','').trim();
    if(!p||!names.includes(n)||!names.includes(p))return;
    const key=[n,p].sort().join('||');
    if(!txEdges[key])txEdges[key]={from:n,to:p,count:0,amt:0};
    txEdges[key].count++;txEdges[key].amt+=Number(t['금액']||0);
  });
  const seatEdges=[];
  for(let i=0;i<seats.length;i++) for(let j=i+1;j<seats.length;j++){
    const a=seats[i],b=seats[j],dr=Math.abs(Number(a['행'])-Number(b['행'])),dc=Math.abs(Number(a['열'])-Number(b['열'])),dist=Math.sqrt(dr*dr+dc*dc);
    if(dist<=1.5)seatEdges.push({from:String(a['이름']),to:String(b['이름']),dist:Math.round(dist*10)/10,score:Math.round((1-dist/2)*100)});
  }
  const emoByDate={};
  emoAll.forEach(e=>{const d=String(e['날짜']).slice(0,10);if(!emoByDate[d])emoByDate[d]={};emoByDate[d][String(e['이름'])]=emoMap[e['내용1']]||2;});
  const emoEdges={};
  Object.values(emoByDate).forEach(dayEmo=>{
    const ns=Object.keys(dayEmo).filter(n=>names.includes(n));
    for(let i=0;i<ns.length;i++) for(let j=i+1;j<ns.length;j++){
      const key=[ns[i],ns[j]].sort().join('||');
      if(!emoEdges[key])emoEdges[key]={from:ns[i],to:ns[j],syncScore:0,days:0};
      const diff=Math.abs(dayEmo[ns[i]]-dayEmo[ns[j]]);emoEdges[key].syncScore+=Math.round((1-diff/2)*10);emoEdges[key].days++;
    }
  });
  const allKeys=new Set([...Object.keys(txEdges),...Object.keys(emoEdges),...seatEdges.map(e=>[e.from,e.to].sort().join('||'))]);
  const combined=[];
  allKeys.forEach(key=>{
    const [a,b]=key.split('||');if(!names.includes(a)||!names.includes(b))return;
    const tx=txEdges[key]||{count:0,amt:0};const emo=emoEdges[key]||{syncScore:0,days:0};const seat=seatEdges.find(e=>([e.from,e.to].sort().join('||'))===key)||{score:0};
    const total=Math.round(tx.count*12+Math.min(tx.amt/1000,80)+seat.score+(emo.days>0?emo.syncScore/emo.days*5:0));
    combined.push({from:a,to:b,total,txCount:tx.count,txAmt:tx.amt,seatScore:seat.score,emoSync:emo.days>0?Math.round(emo.syncScore/emo.days*10)/10:0});
  });
  combined.sort((a,b)=>b.total-a.total);
  const stopWords=['이','가','을','를','은','는','에','의','로','으로','와','과','도','만','에서','하다','있다','없다','그','이다','했다','한다','것','수','있','더','안','못','잘','많이','오늘','그냥','진짜','너무','좀','일','어','게','때','아','나','내','우리','저'];
  const freq={};
  emoAll.forEach(e=>{
    const msg=String(e['메세지']||'');
    if(!msg.trim())return;
    (msg.match(/[가-힣a-zA-Z]{2,}/g)||[]).forEach(w=>{if(!stopWords.includes(w))freq[w]=(freq[w]||0)+1;});
  });
  const wordCloud=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,60).map(([word,count])=>({word,count}));
  const allTexts=[...emoAll.map(e=>String(e['메세지']||'')), ...actAll.filter(r=>r['카테고리']===AC.CALL).map(c=>String(c['메세지']||''))].filter(t=>t.trim().length>1);
  const bigrams={},trigrams={};
  allTexts.forEach(t=>{const ws=(t.match(/[가-힣a-zA-Z]{2,}/g)||[]);for(let i=0;i<=ws.length-2;i++){const g=ws.slice(i,2+i).join(' ');bigrams[g]=(bigrams[g]||0)+1;}for(let i=0;i<=ws.length-3;i++){const g=ws.slice(i,3+i).join(' ');trigrams[g]=(trigrams[g]||0)+1;}});
  const bigramList=Object.entries(bigrams).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([g,c])=>({gram:g,count:c}));
  const trigramList=Object.entries(trigrams).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([g,c])=>({gram:g,count:c}));
  const emoTimeline={};names.forEach(n=>{emoTimeline[n]=[];});
  emoAll.forEach(e=>{const n=String(e['이름']);if(emoTimeline[n]!==undefined)emoTimeline[n].push({date:String(e['날짜']).slice(0,10),score:emoMap[e['내용1']]||2,raw:e['내용1']});});
  const classEmoAvg=Object.entries(emoByDate).sort((a,b)=>a[0]>b[0]?1:-1).slice(-14).map(([date,dayEmo])=>{const vals=Object.values(dayEmo);return{date:date.slice(5),avg:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10:0,count:vals.length};});
  const centrality={};names.forEach(n=>{centrality[n]=0;});
  combined.forEach(e=>{if(e.total>5){centrality[e.from]=(centrality[e.from]||0)+e.total;centrality[e.to]=(centrality[e.to]||0)+e.total;}});
  const centralityRank=Object.entries(centrality).sort((a,b)=>b[1]-a[1]).map(([name,score])=>({name,score}));
  return {success:true,names,combined:combined.slice(0,30),wordCloud,bigramList,trigramList,emoTimeline,classEmoAvg,centralityRank,seatEdges,txEdges:Object.values(txEdges)};
}

/* ══════════════════════════════════════════════
   일일 요약 이메일
══════════════════════════════════════════════ */
function sendDailySummaryEmail() {
  const cfg = getSettings();
  if (Number(cfg['일일요약_활성']) !== 1) return;

  const today = todayDate();
  const students = getStudents();
  const acts = sheetToObj(getSheet(SH.ACTIVITY));

  const todayActs = acts.filter(r => String(r['날짜']).slice(0,10) === today);
  const emotions = todayActs.filter(r => r['카테고리'] === AC.EMOTION);
  const evals = todayActs.filter(r => r['카테고리'] === AC.EVAL);
  
  const emoCount = { '🟢 좋음': 0, '🟡 보통': 0, '🔴 힘듦': 0 };
  const emoNames = { '🟢 좋음': [], '🟡 보통': [], '🔴 힘듦': [] };
  emotions.forEach(e => {
    const em = e['내용1'];
    if (emoCount[em] !== undefined) {
      emoCount[em]++;
      emoNames[em].push(String(e['이름']));
    }
  });
  
  const allEmos = acts.filter(r => r['카테고리'] === AC.EMOTION);
  const warnings = [];
  const stdMap = {};
  allEmos.forEach(e => {
    if (!stdMap[e['이름']]) stdMap[e['이름']] = [];
    stdMap[e['이름']].push(e);
  });
  for (const sName in stdMap) {
    const hist = stdMap[sName].slice().reverse();
    let bad = 0;
    for (let i = 0; i < Math.min(hist.length, 3); i++) {
      if (hist[i]['내용1'] === '🔴 힘듦') bad++;
      else break;
    }
    if (bad >= 3) warnings.push(sName);
  }

  const pendingCalls = acts.filter(r => r['카테고리'] === AC.CALL && String(r['상태']).trim() !== '완료');
  const evalNames = evals.map(e => String(e['이름']));
  const notEval = students.filter(s => !evalNames.includes(s.name)).map(s => s.name);
  const emoSubmitted = emotions.map(e => String(e['이름']));
  const notEmo = students.filter(s => !emoSubmitted.includes(s.name)).map(s => s.name);
  const emoMessages = emotions.filter(e => String(e['메세지']||'').trim());

  const total = students.length;
  const emoTotal = emotions.length;
  const evalTotal = evals.length;

  const warningBlock = warnings.length ? `⚠️ 연속 3일 '힘듦' 주의 학생\n   → ${warnings.join(', ')}\n\n` : '';
  const pendingBlock = pendingCalls.length
    ? `🔔 미답변 호출 (${pendingCalls.length}건)\n` + pendingCalls.slice(0, 5).map(c => `   • ${c['이름']} [${c['내용1']}] : ${String(c['메세지']||'').slice(0, 30)}`).join('\n') + (pendingCalls.length > 5 ? `\n   ... 외 ${pendingCalls.length - 5}건` : '') + '\n\n'
    : '🔔 미답변 호출 없음\n\n';
  const msgBlock = emoMessages.length
    ? `💬 오늘의 감정 메세지 (${emoMessages.length}건)\n` + emoMessages.slice(0, 8).map(e => `   ${e['내용1'].split(' ')[0]} ${e['이름']} : ${String(e['메세지']||'').slice(0, 40)}`).join('\n') + (emoMessages.length > 8 ? `\n   ... 외 ${emoMessages.length - 8}건` : '') + '\n\n'
    : '';
  
  const subject = `[클래스뱅크] 📊 ${today} 학급 활동 일일 요약`;
  const body = [
    `안녕하세요, 선생님.`,
    `${today} 학급 활동 일일 요약입니다.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 감정 신호등  (제출: ${emoTotal}/${total}명)`,
    `   🟢 좋음 : ${emoCount['🟢 좋음']}명   ${emoNames['🟢 좋음'].join(', ') || '-'}`,
    `   🟡 보통 : ${emoCount['🟡 보통']}명   ${emoNames['🟡 보통'].join(', ') || '-'}`,
    `   🔴 힘듦 : ${emoCount['🔴 힘듦']}명   ${emoNames['🔴 힘듦'].join(', ') || '-'}`,
    `   ❓ 미제출 : ${notEmo.join(', ') || '없음'}`,
    ``,
    `✅ 자기평가  (제출: ${evalTotal}/${total}명)`,
    `   미제출 : ${notEval.join(', ') || '없음'}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    warningBlock + pendingBlock + msgBlock
    + `클래스뱅크 LMS에서 자세한 내용을 확인하세요.`
  ].join('\n');
  
  try {
    MailApp.sendEmail({ to: TEACHER_EMAIL, subject, body });
    Logger.log('일일 요약 이메일 발송 완료: ' + today);
  } catch(e) {
    Logger.log('일일 요약 이메일 발송 실패: ' + e.message);
  }
}

function checkAndSendDailySummary() {
  const cfg = getSettings();
  if (Number(cfg['일일요약_활성']) !== 1) return;
  const targetHour = Number(cfg['일일요약_발송시간'] || 16);
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  if (kst.getHours() === targetHour) sendDailySummaryEmail();
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkAndSendDailySummary') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkAndSendDailySummary').timeBased().everyHours(1).create();
  Logger.log('트리거 등록 완료 — checkAndSendDailySummary (매시간)');
}

/* ══════════════════════════════════════════════
   복권 시스템
══════════════════════════════════════════════ */
function getLotteryTickets() {
  const sh = getOrCreate(SH.LOTTERY);
  return sheetToObj(sh).filter(r => r['구분'] && r['제목']);
}

function getLotteryInfo(name) {
  const cfg = getSettings();
  const tickets = getLotteryTickets();
  const price = Number(cfg['복권_가격'] || 500);
  const dailyLimit = Number(cfg['복권_1인당_일일한도'] || 3);
  const today = todayDate();
  const todayBought = sheetToObj(getSheet(SH.ASSETS))
    .filter(r => r['카테고리'] === '복권구매' && String(r['이름']) === name && String(r['날짜']).slice(0,10) === today)
    .length;
  const unscratched = sheetToObj(getSheet(SH.ASSETS))
    .filter(r => r['카테고리'] === '복권구매' && String(r['이름']) === name && String(r['상태']) === '미긁음')
    .map(r => ({ 날짜: r['날짜'], 메타: r['메타'] }));
  const ticketCount = tickets.length;
  return { ticketCount, price, dailyLimit, todayBought, unscratched };
}

function buyLottery(name) {
  const cfg = getSettings();
  const price = Number(cfg['복권_가격'] || 500);
  const dailyLimit = Number(cfg['복권_1인당_일일한도'] || 3);
  const today = todayDate();
  const s = getStudentByName(name);
  if (!s) return { success: false, msg: '학생 없음' };
  if (s.cash < price) return { success: false, msg: `잔액 부족 (복권 가격: ${price.toLocaleString()}원)` };
  const todayBought = sheetToObj(getSheet(SH.ASSETS))
    .filter(r => r['카테고리'] === '복권구매' && String(r['이름']) === name && String(r['날짜']).slice(0,10) === today)
    .length;
  if (todayBought >= dailyLimit) return { success: false, msg: `오늘 구매 한도 초과 (${dailyLimit}장/일)` };
  const tickets = getLotteryTickets();
  if (!tickets.length) return { success: false, msg: '복권 항목이 없습니다. 선생님께 문의하세요.' };
  const txId = Date.now().toString();
  getOrCreate(SH.ASSETS).appendRow([nowStr(), name, '복권구매', '랜덤복권', price, 1, '', '미긁음', '', txId]);
  updateCash(name, -price, `복권 구매`);
  return { success: true, msg: `복권 구매 완료! 긁어서 결과를 확인하세요 🎟️`, txId };
}

function scratchLottery(name, txId) {
  const sh = getSheet(SH.ASSETS);
  const data = sh.getDataRange().getValues();
  let rowNum = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === '복권구매' && String(data[i][1]) === name
        && String(data[i][9]) === String(txId) && String(data[i][7]) === '미긁음') {
      rowNum = i + 1;
      break;
    }
  }
  if (rowNum < 0) return { success: false, msg: '복권을 찾을 수 없거나 이미 긁었습니다.' };

  const tickets = getLotteryTickets();
  if (!tickets.length) return { success: false, msg: '복권 정보 없음' };
  const totalProb = tickets.reduce((a, t) => a + Number(t['확률'] || 0), 0);
  let result;
  if (totalProb <= 0) {
    result = tickets[Math.floor(Math.random() * tickets.length)];
  } else {
    let rand = Math.random() * totalProb;
    result = tickets[tickets.length - 1];
    for (const t of tickets) {
      rand -= Number(t['확률'] || 0);
      if (rand <= 0) { result = t; break; }
    }
  }

  const 구분 = String(result['구분'] || '').trim();
  const 내용 = String(result['내용'] || '').trim();
  const 현금컬럼 = String(result['현금'] || '').trim();
  let rewardMsg = '', rewardDetail = '';

  if (구분 === '현금') {
    const amount = Number(현금컬럼 || 내용) || 0;
    if (amount > 0) {
      updateCash(name, amount, `복권 당첨금: ${result['제목']}`);
      rewardMsg = `💰 현금 ${amount.toLocaleString()}원 당첨!`;
      rewardDetail = `+${amount.toLocaleString()}원이 지급되었습니다.`;
    } else {
      rewardMsg = '💸 꽝!';
      rewardDetail = '다음엔 행운이 따르길!';
    }
  } else if (구분 === '꽝') {
    rewardMsg = '💸 꽝!';
    rewardDetail = '아쉽지만 다음 기회에!';
  } else if (구분 === '주식') {
    const qty = Number(내용) || 1;
    updateStudentField(name, '주식', qty, true);
    logTxRow(name, TX.STOCK_O, '복권당첨', 0, qty, '', `복권 주식 당첨: ${result['제목']}`, '완료', '');
    rewardMsg = `📈 주식 ${qty}주 당첨!`;
    rewardDetail = `주식 ${qty}주가 지급되었습니다.`;
  } else if (구분 === '아이템') {
    getOrCreate(SH.ASSETS).appendRow([nowStr(), name, '인벤토리', 내용, 0, 1, '', '보유', '', '복권당첨']);
    rewardMsg = `🎁 아이템 당첨: ${내용}`;
    rewardDetail = `아이템 [${내용}]이 인벤토리에 추가되었습니다.`;
  } else if (구분 === '벌칙') {
    const penaltyAmt = Number(내용);
    if (!isNaN(penaltyAmt) && penaltyAmt > 0) {
      const actual = Math.min(penaltyAmt, getStudentByName(name).cash);
      if (actual > 0) updateCash(name, -actual, `복권 벌칙: ${result['제목']}`);
      rewardMsg = `😱 벌칙! ${penaltyAmt.toLocaleString()}원 차감!`;
      rewardDetail = `보이스피싱 당했다... ${actual.toLocaleString()}원이 차감됩니다.`;
    } else {
      rewardMsg = `😱 벌칙: ${내용}`;
      rewardDetail = `선생님께 해당 내용을 이행하세요!`;
    }
  } else {
    rewardMsg = `🎉 결과: ${result['제목']}`;
    rewardDetail = 내용;
  }

  sh.getRange(rowNum, 8).setValue('긁음완료');
  sh.getRange(rowNum, 6).setValue(String(result['제목']));
  logTxRow(name, '복권', '결과', 0, 1, result['제목'], `복권결과:${result['제목']}`, '완료', txId);
  return {
    success: true,
    result: result['제목'],
    구분: 구분,
    rewardMsg: rewardMsg,
    rewardDetail: rewardDetail
  };
}

function adminAddLotteryTicket(구분, 제목, 내용, 확률, 현금) {
  getOrCreate(SH.LOTTERY).appendRow([구분, 제목, 내용, Number(확률) || 0, Number(현금||0)]);
  return { success: true, msg: '복권 항목 추가 완료' };
}

function adminDeleteLotteryTicket(제목, 구분) {
  const sh = getSheet(SH.LOTTERY);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(제목) && String(data[i][0]) === String(구분)) {
      sh.deleteRow(i + 1);
      return { success: true, msg: '삭제됨' };
    }
  }
  return { success: false, msg: '항목 없음' };
}

function adminGetLotteryData() {
  return { tickets: getLotteryTickets() };
}

/* ══════════════════════════════════════════════
   과제 제출 시스템
══════════════════════════════════════════════ */
function getAssignments(includeAll) {
  const sh = getOrCreate(SH.ASSIGNMENT);
  const rows = sheetToObj(sh);
  const today = todayDate();
  return rows
    .filter(r => {
      if (!r['과제ID']) return false;
      if (includeAll) return true;
      const start = String(r['기간시작']||'').slice(0,10);
      const end   = String(r['기간종료']||'').slice(0,10);
      const status = String(r['상태']||'').trim();
      if (status === '종료') return false;
      if (end && end < today) return false;
      return true;
    })
    .map(r => ({
      과제ID  : r['과제ID'],
      등록일  : String(r['등록일']||'').slice(0,10),
      제목    : r['제목'],
      내용    : r['내용'],
      기간시작: String(r['기간시작']||'').slice(0,10),
      기간종료: String(r['기간종료']||'').slice(0,10),
      파일유형: r['파일유형'],
      수당    : Number(r['수당']||0),
      상태    : r['상태'],
      작성자  : r['작성자']
    }));
}


// ─── 과제 파일 업로드 ───
function uploadAssignmentFile(name, assignmentId, base64Data, fileName, mimeType) {
  try {
    const ROOT_FOLDER_NAME = '클래스뱅크_과제제출';
    
    // 1. 루트 폴더 찾기 or 생성
    let rootFolder;
    const rootIter = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
    rootFolder = rootIter.hasNext() ? rootIter.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
    
    // 2. 과제명 폴더 찾기 or 생성
    const asgRows = sheetToObj(getOrCreate(SH.ASSIGNMENT));
    const asg = asgRows.find(r => String(r['과제ID']) === String(assignmentId));
    const folderName = asg ? asg['제목'] : assignmentId;
    
    let asgFolder;
    const asgIter = rootFolder.getFoldersByName(folderName);
    asgFolder = asgIter.hasNext() ? asgIter.next() : rootFolder.createFolder(folderName);
    
    // 3. 파일 저장
    const decoded = Utilities.newBlob(
      Utilities.base64Decode(base64Data), mimeType, fileName
    );
    const file = asgFolder.createFile(decoded);
    file.setName(fileName);
    
    // 4. 공유 링크 생성 (뷰어 권한)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { success: true, fileUrl: file.getUrl(), fileName: fileName };
  } catch(e) {
    return { success: false, msg: '파일 업로드 실패: ' + e.message };
  }
}







function getMySubmissions(name) {
  return sheetToObj(getSheet(SH.TX_LOG))
    .filter(r => r['카테고리'] === '과제제출' && String(r['이름']) === name)
    .map(r => ({ 과제ID: String(r['메타']||''), 날짜: r['날짜'], 제목: r['사유']||'' }));
}

function submitAssignment(name, assignmentId, memo) {
  const already = sheetToObj(getSheet(SH.TX_LOG)).some(
    r => r['카테고리'] === '과제제출' && String(r['이름']) === name && String(r['메타']) === String(assignmentId)
  );
  if (already) return { success: false, msg: '이미 제출한 과제입니다.' };

  const asgRows = sheetToObj(getOrCreate(SH.ASSIGNMENT));
  const asg = asgRows.find(r => String(r['과제ID']) === String(assignmentId));
  if (!asg) return { success: false, msg: '과제를 찾을 수 없습니다.' };
  
  const today = todayDate();
  const end = String(asg['기간종료']||'').slice(0,10);
  if (end && end < today) return { success: false, msg: '제출 기간이 종료된 과제입니다.' };

  const cfg = getSettings();
  const 수당 = Number(asg['수당']) > 0 ? Number(asg['수당']) : Number(cfg['과제_제출_수당'] || 2000);
  const useTax = Number(cfg['과제_수당_세금적용'] || 0) === 1;
  const taxRate = Number(cfg['세금율'] || 0.10);

  logTxRow(name, '과제제출', '제출', 수당, '', asg['제목'], `과제제출: ${asg['제목']}`, '완료', String(assignmentId));
  if (수당 > 0) {
    if (useTax) {
      const tax = Math.floor(수당 * taxRate);
      updateCash(name, 수당 - tax, `과제 제출 수당: ${asg['제목']}`, TX.SALARY);
      logTxRow(name, TX.TAX, '세금', tax, '', '', '과제수당세금', '완료', '');
      return { success: true, msg: `과제 제출 완료! 특별수당 ${(수당-tax).toLocaleString()}원 지급 (세후)` };
    } else {
      updateCash(name, 수당, `과제 제출 수당: ${asg['제목']}`, TX.SALARY);
      return { success: true, msg: `과제 제출 완료! 특별수당 ${수당.toLocaleString()}원 지급! 🎉` };
    }
  }
  return { success: true, msg: '과제 제출 완료!' };
}

function adminAddAssignment(제목, 내용, 기간시작, 기간종료, 파일유형, 수당, 작성자) {
  const id = 'ASG' + Date.now().toString().slice(-8);
  getOrCreate(SH.ASSIGNMENT).appendRow([id, nowStr(), 제목, 내용, 기간시작||'', 기간종료||'', 파일유형||'자유', Number(수당||0), '활성', 작성자||'선생님']);
  return { success: true, msg: '과제 등록 완료', id };
}

function adminEndAssignment(assignmentId) {
  const sh = getSheet(SH.ASSIGNMENT);
  if (!sh) return { success: false };
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(assignmentId)) {
      sh.getRange(i+1, 9).setValue('종료');
      return { success: true, msg: '과제 종료 처리됨' };
    }
  }
  return { success: false, msg: '과제 없음' };
}

function adminGetAssignmentSubmissions(assignmentId) {
  const subs = sheetToObj(getSheet(SH.TX_LOG))
    .filter(r => r['카테고리'] === '과제제출' && String(r['메타']) === String(assignmentId));
  return subs.map(r => ({ 이름: r['이름'], 날짜: r['날짜'], 수당: r['금액'] }));
}


/* ══════════════════════════════════════════════
   학급 마트 (제로페이) 시스템
══════════════════════════════════════════════ */
function getMartItems() {
  // 등록된 마트 물품 중 재고가 0보다 큰 것만 가져옵니다.
  return sheetToObj(getSheet(SH.ASSETS)).filter(r => r['카테고리'] === '마트물품' && Number(r['수량'] || 0) > 0)
    .map(r => ({ 아이템명: r['아이템명'], 가격: Number(r['금액'] || 0), 재고: Number(r['수량'] || 0) }));
}

function addMartItem(ownerName, itemName, price, stock) {
  const perms = getStudentPermissions(ownerName);
  if (!perms.includes('마트관리')) return { success: false, msg: '마트 관리 권한이 없습니다.' };
  
  // 자산현황 시트에 '마트물품' 카테고리로 저장합니다.
  getOrCreate(SH.ASSETS).appendRow([nowStr(), ownerName, '마트물품', itemName, price, stock, '', '판매중', '', '']);
  return { success: true, msg: '마트 물품 등록 완료!' };
}

function martPay(buyerName, amount, pw, itemName) {
  amount = Number(amount);
  if (amount <= 0) return { success: false, msg: '올바른 금액을 입력하세요.' };
  
  const s = studentLogin(buyerName, pw);
  if (!s.success) return { success: false, msg: '비밀번호가 틀렸습니다.' };
  if (s.student.cash < amount) return { success: false, msg: '현금 잔액이 부족합니다.' };

  // 마트 사장님(마트관리 권한 보유자) 찾기
  const students = getStudents();
  const owner = students.find(st => String(st.permission || '').includes('마트관리'));
  if (!owner) return { success: false, msg: '현재 학급 마트 사장님이 지정되지 않았습니다.' };

  const targetItem = itemName || '자율결제';

  // 만약 특정 물품을 선택해 결제했다면 재고를 1개 차감합니다.
  if (targetItem !== '자율결제') {
    const sh = getSheet(SH.ASSETS);
    const data = sh.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === '마트물품' && data[i][3] === targetItem && Number(data[i][5]) > 0) {
        sh.getRange(i + 1, 6).setValue(Number(data[i][5]) - 1);
        found = true; 
        break;
      }
    }
    if (!found) return { success: false, msg: '이미 품절되었거나 존재하지 않는 물건입니다.' };
  }

  // 구매자 돈 차감
  updateCash(buyerName, -amount, `[학급마트] ${targetItem}`);
  
  // 거래 내역 기록 및 영수증용 ID 생성
  const txId = 'PAY' + Date.now().toString().slice(-6);
  
  // 마트 사장님 개인 돈을 올리지 않고, '공공자산' 이름으로 LOG 시트에만 수입을 기록합니다.
  logTxRow('공공자산', '마트매출', '수입', amount, '', buyerName, `[마트결제] ${targetItem}`, '완료', txId);
  
  // 구매자의 지출 영수증 기록
  logTxRow(buyerName, '마트결제', '지출', amount, '', owner.name, targetItem, '완료', txId);

  return { 
    success: true, 
    receipt: { id: txId, item: targetItem, amount: amount, date: nowStr(), owner: owner.name } 
  };
}

function getMartStats(ownerName) {
  // 마트 사장님의 매출 통계 계산
  const tx = sheetToObj(getSheet(SH.TX_LOG)).filter(r => r['카테고리'] === '마트결제' && r['대상'] === ownerName);
  const total = tx.reduce((sum, t) => sum + Number(t['금액']), 0);
  return { total: total, count: tx.length, history: tx.slice(-15).reverse() };
}

function deleteMartItem(callerName, itemName) {
  // callerName이 없으면 관리자(선생님), 있으면 마트관리 권한 확인
  if (callerName) {
    const perms = getStudentPermissions(callerName);
    if (!perms.includes('마트관리')) return { success: false, msg: '마트 관리 권한이 없습니다.' };
  }
  const sh = getSheet(SH.ASSETS);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === '마트물품' && data[i][3] === itemName) {
      sh.deleteRow(i + 1);
      return { success: true, msg: `"${itemName}" 삭제 완료!` };
    }
  }
  return { success: false, msg: '해당 물품을 찾을 수 없습니다.' };
}

function updateMartStock(callerName, itemName, newStock) {
  if (callerName) {
    const perms = getStudentPermissions(callerName);
    if (!perms.includes('마트관리')) return { success: false, msg: '마트 관리 권한이 없습니다.' };
  }
  newStock = Number(newStock);
  if (isNaN(newStock) || newStock < 0) return { success: false, msg: '올바른 수량을 입력하세요.' };
  const sh = getSheet(SH.ASSETS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === '마트물품' && data[i][3] === itemName) {
      sh.getRange(i + 1, 6).setValue(newStock);
      return { success: true, msg: `재고 ${newStock}개로 수정 완료!` };
    }
  }
  return { success: false, msg: '해당 물품을 찾을 수 없습니다.' };
}

// 마트 관리자 직접 결제 (POS) 처리 함수
function delegatedMartCharge(actorName, buyerName, amount, itemName) {
  const perms = getStudentPermissions(actorName);
  if (!perms.includes('마트관리')) return { success:false, msg:'마트 관리 권한 없음' };
  amount = Number(amount);
  if (!buyerName || !amount) return { success:false, msg:'입력 오류' };
  
  const s = getStudentByName(buyerName);
  if (!s || s.cash < amount) return { success:false, msg:'학생의 현금 잔액이 부족합니다.' };

  const targetItem = itemName || '직접결제';
  
  // 1. 구매자 돈 차감 (지출 기록)
  updateCash(buyerName, -amount, `[학급마트] ${targetItem}`);
  logTxRow(buyerName, '마트결제', '지출', amount, '', actorName, targetItem, '완료', '');

  // 2. 공공자산 수입 처리 (국고 귀속)
  logTxRow('공공자산', '마트매출', '수입', amount, '', buyerName, `[POS결제] ${targetItem}`, '완료', '');

  return { success:true, msg:`${buyerName} 결제 완료! 공공자산으로 편입되었습니다.` };
}




function dispatch(action, payload) {
  payload = payload || {};
  try {
    switch(action) {
      case 'getStudents':              return getStudents();
      case 'getInitData':              return getInitData(payload.name);
      case 'studentLogin':             return studentLogin(payload.name, payload.pw);
      case 'changePassword':           return changePassword(payload.name, payload.oldPw, payload.newPw);
      case 'transferMoney':            return transferMoney(payload.fromName, payload.toName, payload.amount, payload.pw);
      case 'getTransactions':          return getTransactions(payload.name);
      case 'getTrends':                return getTrends(payload.name);
      case 'getStockData':             return getStockData();
      case 'tradeStock':               return tradeStock(payload.name, payload.type, payload.qty);
      case 'getRealEstateData':        return getRealEstateData();
      case 'sellSeat':                 return sellSeat(payload.name, payload.price);
      case 'buySeat':                  return buySeat(payload.buyer, payload.seatId);
      case 'cancelMySale':             return cancelMySale(payload.name);
      case 'getMarketItems':           return getMarketItems();
      case 'addMarketItem':            return addMarketItem(payload.name, payload.itemName, payload.price);
      case 'buyMarketItem':            return buyMarketItem(payload.buyer, payload.seller, payload.itemName, payload.price);
      case 'getJobMarket':             return getJobMarket();
      case 'applyJob':                 return applyJob(payload.name, payload.jobName, payload.msg);
      case 'getDeposits':              return getDeposits(payload.name);
      case 'depositMoney':             return depositMoney(payload.name, Number(payload.amount));
      case 'withdrawDeposit':          return withdrawDeposit(payload.name, Number(payload.rowIndex||0));
      case 'getShopItems':             return getShopItems();
      case 'buyItem':                  return buyItem(payload.name, payload.itemName);
      case 'getInventory':             return getInventory(payload.name);
      case 'useItem':                  return useItem(payload.name, payload.itemName);
      case 'saveChecklist':            return saveChecklist(payload.name, payload.scores, payload.comment);
      case 'sendCall':                 return sendCall(payload.name, payload.category, payload.message);
      case 'getCalls':                 return getCalls(payload.name);
      case 'logEmotion':               return logEmotion(payload.name, payload.emotion, payload.message);
      case 'getHomework':              return getHomework(payload.status);
      case 'addHomework':              return addHomework(payload.subject, payload.content, payload.dueDate, payload.registrant, payload.importance);
      case 'completeHomework':         return completeHomework(payload.id);
      case 'getNotices':               return getNotices();
      case 'getMeal':                  return getMeal(payload.date);
      case 'getTimetable':             return getTimetable();
      case 'getSettings':              return getSettings();
      case 'updateSettings':           return updateSettings(payload.settings);
      case 'adminAuth':                return adminAuth(payload.pw);
      case 'adminGetAllData':          return adminGetAllData();
      case 'getStudentProfile':        return getStudentProfile(payload.name);
      case 'getClassRelationData':     return getClassRelationData();
      case 'adminUpdateStudent':       return adminUpdateStudent(payload.name, payload.cashDelta, payload.stockDelta);
      case 'adminUpdateStock':         return adminUpdateStock(payload.price, payload.title, payload.content, payload.impact);
      case 'adminUpdateDepositRate':   return adminUpdateDepositRate(payload.rate);
      case 'adminDeleteRow':           return adminDeleteRow(payload.sheetName, payload.colIdx, payload.val);
      case 'adminReplyCall':           return adminReplyCall(payload.dateStr, payload.name, payload.reply);
      case 'adminAddNotice':           return adminAddNotice(payload.title, payload.content, payload.isUrgent);
      case 'adminPay':                 return adminPay(payload.target, payload.amount, payload.reason, payload.isTax);
      case 'adminDiscipline':          return adminDiscipline(payload.name, payload.type, payload.amount, payload.reason);
      case 'adminAddJob':              return adminAddJob(payload.title, payload.role, payload.salary, payload.count);
      case 'adminAddShopItem':         return adminAddShopItem(payload.name, payload.price, payload.stock, payload.emoji, payload.desc);
      case 'adminGenSeat':             return adminGenSeat(payload.rows, payload.cols);
      case 'adminToggleSeat':          return adminToggleSeat(payload.id);
      case 'adminSetSeat':             return adminSetSeat(payload.id, payload.name);
      case 'adminShuffleSeat':         return adminShuffleSeat();
      case 'adminApproveRealEstate':   return adminApproveRealEstate(payload.txId, payload.isApprove);
      case 'adminUpdatePublicAsset': return adminUpdatePublicAsset(payload.amount, payload.reason);
      case 'sendDailySummaryEmail':    return sendDailySummaryEmail();
      case 'getLotteryInfo':           return getLotteryInfo(payload.name);
      case 'buyLottery':               return buyLottery(payload.name);
      case 'scratchLottery':           return scratchLottery(payload.name, payload.txId);
      case 'adminGetLotteryData':      return adminGetLotteryData();
      case 'adminAddLotteryTicket':    return adminAddLotteryTicket(payload.구분, payload.제목, payload.내용, payload.확률, payload.현금);
      case 'adminDeleteLotteryTicket': return adminDeleteLotteryTicket(payload.제목, payload.구분);
      case 'updateAllStudentLevels':   return updateAllStudentLevels();
      case 'adminGrantPermission':     return adminGrantPermission(payload.studentName, payload.permissions);
      case 'delegatedPay':             return delegatedPay(payload.actorName, payload.targetName, payload.amount, payload.reason);
      case 'delegatedFine':            return delegatedFine(payload.actorName, payload.targetName, payload.amount, payload.reason);
      case 'delegatedAddNotice':       return delegatedAddNotice(payload.actorName, payload.title, payload.content, payload.isUrgent);
      case 'delegatedPraiseCard':      return delegatedPraiseCard(payload.actorName, payload.targetName, payload.message);
      case 'delegatedWarning':         return delegatedWarning(payload.actorName, payload.targetName, payload.reason);
      case 'getDelegatedHistory':      return getDelegatedHistory(payload.name);
      case 'getPraiseCards':           return getPraiseCards(payload.name);
      case 'getAssignments':           return getAssignments(false);
      case 'getMySubmissions':         return getMySubmissions(payload.name);
      case 'uploadAssignmentFile':     return uploadAssignmentFile(payload.name, payload.assignmentId, payload.base64Data, payload.fileName, payload.mimeType);
      case 'submitAssignment':         return submitAssignment(payload.name, payload.assignmentId, payload.memo);
      case 'adminGetAssignments':      return getAssignments(true);
      case 'adminAddAssignment':       return adminAddAssignment(payload.제목, payload.내용, payload.기간시작, payload.기간종료, payload.파일유형, payload.수당, payload.작성자);
      case 'adminEndAssignment':       return adminEndAssignment(payload.assignmentId);
      case 'adminGetAssignmentSubmissions': return adminGetAssignmentSubmissions(payload.assignmentId);
      case 'getMartItems':             return getMartItems();
      case 'addMartItem':              return addMartItem(payload.name, payload.itemName, payload.price, payload.stock);
      case 'martPay':                  return martPay(payload.name, payload.amount, payload.pw, payload.itemName);
      case 'getMartStats':             return getMartStats(payload.name);
      case 'delegatedTax': return delegatedTax(payload.actorName, payload.targetName, payload.amount, payload.reason);
      case 'delegatedMartCharge':      return delegatedMartCharge(payload.actorName, payload.buyerName, payload.amount, payload.itemName); // <== 이 줄 추가
      case 'deleteMartItem':              return deleteMartItem(payload.name, payload.itemName);
      case 'updateMartStock':             return updateMartStock(payload.name, payload.itemName, payload.newStock);
      // ─── 하우징 & 미니룸 연동 ───
      case 'saveRoomData':                return saveRoomData(payload.name, payload.roomData);
      case 'getRoomData':                 return getRoomData(payload.name);
      default: return { error: `Unknown action: ${action}` };
    }
  } catch(e) { return { error: String(e.message), stack: String(e.stack) }; }
}

// ─── 하우징/미니룸 데이터 시트 백업 지원 ───
function saveRoomData(name, roomData) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { success: false, error: '서버가 혼잡합니다.' };
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sh = ss.getSheetByName('미니룸');
    if (!sh) {
      sh = ss.insertSheet('미니룸');
      sh.appendRow(['수정일', '이름', '방데이터', '방명록']);
    }
    const data = sh.getDataRange().getValues();
    const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    const dataStr = typeof roomData === 'string' ? roomData : JSON.stringify(roomData);
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(name).trim()) {
        sh.getRange(i + 1, 1).setValue(now);
        sh.getRange(i + 1, 3).setValue(dataStr);
        found = true;
        break;
      }
    }
    if (!found) {
      sh.appendRow([now, name, dataStr, '[]']);
    }
    lock.releaseLock();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getRoomData(name) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('미니룸');
    if (!sh) return { success: true, roomData: null };
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(name).trim()) {
        let parsed = null;
        try { parsed = JSON.parse(data[i][2]); } catch(_) { parsed = data[i][2]; }
        return { success: true, roomData: parsed };
      }
    }
    return { success: true, roomData: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── 외부 웹앱(GitHub Pages 등) 연동을 위한 REST API 게이트웨이 ───
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    const action = body.action || 'healthcheck';
    const payload = body.payload || {};
    const result = action === 'healthcheck' ? { status: 'ok', time: new Date().toISOString() } : dispatch(action, payload);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // GET 요청으로 API 액션을 호출할 경우 대응
  if (e && e.parameter && e.parameter.action) {
    let payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (_) { payload = {}; }
    }
    const result = dispatch(e.parameter.action, payload);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 기존 HtmlService 호환
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('클래스뱅크 LMS v16')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no');
  } catch (_) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'Classbank GAS Web App is running.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}