// ============================================================
// 2D 타운 맵 레이아웃 & 건물 & 놀이동산 & NPC 정의 (js/mapData.js)
// 100 x 80 타일 (3200 x 2560 px)
// ============================================================

const TownMapData = (() => {
  const WIDTH = CONFIG.GAME.MAP_WIDTH;   // 100
  const HEIGHT = CONFIG.GAME.MAP_HEIGHT; // 80
  const TILE_SIZE = CONFIG.GAME.TILE_SIZE; // 32

  // 14개 건물 정의
  const BUILDINGS = [
    // 1. 주거구역 (기숙사 / 미니룸 포털)
    {
      id: 'dormitory',
      name: '학생 기숙사',
      signTitle: '학생 기숙사',
      signEmoji: '🏠',
      desc: '싸이월드풍 미니룸 꾸미기 & 친구 방 놀러가기',
      roofColor: '#ff9f43',
      tileX: 18,
      tileY: 18,
      w: 160,
      h: 140,
      zone: '주거구역'
    },

    // 2. 금융구역
    {
      id: 'bank',
      name: '은행',
      signTitle: '클래스 은행',
      signEmoji: '🏦',
      desc: '예금 가입, 이자 조회 및 만기 해지',
      roofColor: '#3498db',
      tileX: 74,
      tileY: 16,
      w: 160,
      h: 140,
      zone: '금융구역'
    },
    {
      id: 'stock',
      name: '증권거래소',
      signTitle: '증권거래소',
      signEmoji: '📈',
      desc: '학급 주식 시세 확인, 주식 매수/매도',
      roofColor: '#2ecc71',
      tileX: 88,
      tileY: 16,
      w: 160,
      h: 140,
      zone: '금융구역'
    },
    {
      id: 'realestate',
      name: '부동산 중개소',
      signTitle: '부동산 중개소',
      signEmoji: '🏢',
      desc: '교실 자리배치도 확인 및 좌석 매매',
      roofColor: '#e67e22',
      tileX: 81,
      tileY: 28,
      w: 160,
      h: 140,
      zone: '금융구역'
    },

    // 3. 상업구역
    {
      id: 'shop',
      name: '잡화점 & 가구점',
      signTitle: '잡화점 & 가구점',
      signEmoji: '🛋️',
      desc: '학급 아이템 및 미니룸 가구/인테리어 구매',
      roofColor: '#e84393',
      tileX: 18,
      tileY: 54,
      w: 160,
      h: 140,
      zone: '상업구역'
    },
    {
      id: 'mart',
      name: '학급마트',
      signTitle: '학급마트',
      signEmoji: '🛒',
      desc: '마트 간식/학용품 간편 결제',
      roofColor: '#00cec9',
      tileX: 32,
      tileY: 54,
      w: 160,
      h: 140,
      zone: '상업구역'
    },
    {
      id: 'lottery',
      name: '행운의 복권방',
      signTitle: '행운의 복권방',
      signEmoji: '🎰',
      desc: '즉석 긁는 복권 구매 및 당첨금 수령',
      roofColor: '#fdcb6e',
      tileX: 25,
      tileY: 66,
      w: 160,
      h: 140,
      zone: '상업구역'
    },

    // 4. 행정구역
    {
      id: 'cityhall',
      name: '시청',
      signTitle: '시청 (위임관청)',
      signEmoji: '🏛️',
      desc: '학급 임원 전용 상벌점/공지 권한 집행',
      roofColor: '#6c5ce7',
      tileX: 75,
      tileY: 56,
      w: 160,
      h: 140,
      zone: '행정구역',
      requiresPermission: true
    },
    {
      id: 'jobcenter',
      name: '고용센터',
      signTitle: '고용센터',
      signEmoji: '💼',
      desc: '학급 1인 1직업 채용 공고 및 구직 신청',
      roofColor: '#4b6584',
      tileX: 88,
      tileY: 56,
      w: 160,
      h: 140,
      zone: '행정구역'
    },
    {
      id: 'postoffice',
      name: '우체국',
      signTitle: '클래스 우체국',
      signEmoji: '📮',
      desc: '친구 송금하기 및 칭찬카드 우편함',
      roofColor: '#eb3b5a',
      tileX: 82,
      tileY: 68,
      w: 160,
      h: 140,
      zone: '행정구역'
    },

    // 5. 교육구역
    {
      id: 'school',
      name: '학교 본관',
      signTitle: '행복초등학교',
      signEmoji: '🏫',
      desc: 'LMS 포털: 과제 제출, 숙제 체크, 급식표, 시간표, 공지',
      roofColor: '#20bf6b',
      tileX: 50,
      tileY: 12,
      w: 180,
      h: 150,
      zone: '교육구역'
    },
    {
      id: 'counseling',
      name: '상담실',
      signTitle: '마음 상담실',
      signEmoji: '💚',
      desc: '감정 신호등(오늘의 기분) 등록 & 자기평가',
      roofColor: '#a55eea',
      tileX: 36,
      tileY: 14,
      w: 160,
      h: 140,
      zone: '교육구역'
    },
    {
      id: 'principal',
      name: '교장실',
      signTitle: '교장실',
      signEmoji: '👑',
      desc: '관리자(교사) 전용 시스템 제어 패널',
      roofColor: '#2f3542',
      tileX: 64,
      tileY: 14,
      w: 160,
      h: 140,
      zone: '교육구역',
      requiresAdmin: true
    },

    // 6. 공원구역
    {
      id: 'flea_market',
      name: '벼룩시장',
      signTitle: '중고 벼룩시장',
      signEmoji: '🎪',
      desc: '친구들과 안 쓰는 물건을 사고파는 중고 장터',
      roofColor: '#fa8231',
      tileX: 50,
      tileY: 66,
      w: 160,
      h: 140,
      zone: '공원구역'
    }
  ];

  // 놀이동산 특수 어트랙션 배치 (맵 동북쪽 구역)
  const AMUSEMENTS = [
    { type: 'ferris_wheel', x: 86 * TILE_SIZE, y: 38 * TILE_SIZE, name: '🎡 드림 대관람차' },
    { type: 'carousel',    x: 74 * TILE_SIZE, y: 38 * TILE_SIZE, name: '🎠 무지개 회전목마' },
    { type: 'circus_tent', x: 92 * TILE_SIZE, y: 28 * TILE_SIZE, name: '🎪 매직 서커스' },
    { type: 'popcorn_cart',x: 79 * TILE_SIZE, y: 44 * TILE_SIZE, name: '🍿 달콤 팝콘 카트' }
  ];

  // 인터랙티브 동물 주민 NPC 목록
  const NPCS = [
    { id: 'npc_bear',   name: '곰돌이 촌장', type: 'bear',   x: 52 * TILE_SIZE, y: 42 * TILE_SIZE, dialog: '안녕! 우리 클래스 타운에 온 걸 환영해 🐻 기숙사에서 나만의 멋진 미니룸을 꾸며보고 친구 방에도 놀러가보렴!' },
    { id: 'npc_rabbit', name: '토끼 은행원', type: 'rabbit', x: 72 * TILE_SIZE, y: 22 * TILE_SIZE, dialog: '용돈이 생기면 은행에 예금해보세요! 🐰 매일 이자가 쑥쑥 붙는답니다.' },
    { id: 'npc_cat',    name: '야옹 상인',   type: 'cat',    x: 22 * TILE_SIZE, y: 60 * TILE_SIZE, dialog: '잡화점에 예쁜 가구와 귀여운 펫이 새로 들어왔다냥! 🐱' },
    { id: 'npc_panda',  name: '판다 선생님', type: 'panda',  x: 48 * TILE_SIZE, y: 20 * TILE_SIZE, dialog: '오늘의 과제와 공지사항을 확인했나요? 🐼 학교 본관에서 제출할 수 있어요!' },
    { id: 'npc_fox',    name: '여우 투자가', type: 'fox',    x: 92 * TILE_SIZE, y: 22 * TILE_SIZE, dialog: '주식 뉴스를 잘 읽어보면 대박 호재를 찾을 수 있지! 🦊' }
  ];

  // 환경 장식 요소 (분수, 가로등, 벤치, 우체통 등)
  const PROPS = [
    { type: 'fountain', x: 50 * TILE_SIZE, y: 40 * TILE_SIZE },
    { type: 'lamp', x: 46 * TILE_SIZE, y: 38 * TILE_SIZE },
    { type: 'lamp', x: 54 * TILE_SIZE, y: 38 * TILE_SIZE },
    { type: 'bench', x: 45 * TILE_SIZE, y: 43 * TILE_SIZE },
    { type: 'bench', x: 55 * TILE_SIZE, y: 43 * TILE_SIZE },
    { type: 'lamp', x: 26 * TILE_SIZE, y: 22 * TILE_SIZE },
    { type: 'lamp', x: 74 * TILE_SIZE, y: 22 * TILE_SIZE },
    { type: 'lamp', x: 26 * TILE_SIZE, y: 50 * TILE_SIZE },
    { type: 'lamp', x: 74 * TILE_SIZE, y: 50 * TILE_SIZE },
    { type: 'mailbox', x: 79 * TILE_SIZE, y: 71 * TILE_SIZE },
    { type: 'mailbox', x: 15 * TILE_SIZE, y: 21 * TILE_SIZE }
  ];

  // 벚꽃/녹색 나무 배치 목록
  const TREES = [];
  for (let x = 2; x < WIDTH - 2; x += 3) {
    TREES.push({ x: x * TILE_SIZE, y: 3 * TILE_SIZE, isPink: x % 6 === 0 });
    TREES.push({ x: x * TILE_SIZE, y: (HEIGHT - 4) * TILE_SIZE, isPink: x % 4 === 0 });
  }
  for (let y = 5; y < HEIGHT - 5; y += 4) {
    TREES.push({ x: 3 * TILE_SIZE, y: y * TILE_SIZE, isPink: y % 8 === 0 });
    TREES.push({ x: (WIDTH - 4) * TILE_SIZE, y: y * TILE_SIZE, isPink: y % 6 === 0 });
  }
  for (let tx = 42; tx <= 58; tx += 4) {
    TREES.push({ x: tx * TILE_SIZE, y: 54 * TILE_SIZE, isPink: true });
    TREES.push({ x: tx * TILE_SIZE, y: 74 * TILE_SIZE, isPink: true });
  }

  // 타일맵 2차원 배열 생성
  function createTileGrid() {
    const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

    // 호수 구역
    for (let y = 56; y <= 62; y++) {
      for (let x = 42; x <= 58; x++) {
        grid[y][x] = 3; // Water
      }
    }
    // 다리
    for (let x = 48; x <= 52; x++) {
      grid[59][x] = 5; // Bridge
    }

    // 메인 도로망
    for (let y = 8; y <= 72; y++) {
      grid[y][49] = 2; // Stone
      grid[y][50] = 2;
      grid[y][51] = 2;
    }
    for (let x = 12; x <= 88; x++) {
      grid[39][x] = 2;
      grid[40][x] = 2;
      grid[41][x] = 2;
    }

    // 놀이동산 구역 도로
    for (let y = 32; y <= 46; y++) {
      grid[y][80] = 1;
      grid[y][81] = 1;
    }

    // 구역별 보조 흙길
    for (let x = 14; x <= 36; x++) {
      grid[24][x] = 1;
      grid[60][x] = 1;
    }
    for (let x = 70; x <= 92; x++) {
      grid[24][x] = 1;
      grid[64][x] = 1;
    }

    // 꽃밭
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (grid[y][x] === 0 && (x + y * 7) % 13 === 0) {
          grid[y][x] = 4;
        }
      }
    }

    return grid;
  }

  return {
    WIDTH,
    HEIGHT,
    TILE_SIZE,
    SPAWN_X: 50 * TILE_SIZE,
    SPAWN_Y: 42 * TILE_SIZE,
    BUILDINGS,
    AMUSEMENTS,
    NPCS,
    PROPS,
    TREES,
    createTileGrid
  };
})();
