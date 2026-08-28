// ============================================================
// 동물의 숲 학급 타운 & 미니룸 - 전역 설정 파일 (config.js)
// ============================================================

const CONFIG = {
  // 1. Google Apps Script 배포 URL (doPost/doGet 지원되는 /exec URL)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzOV985jt5GQyU_PSjuyU1cnVgQYRUgYdPVOW1SmVfNlq1y7TGopvfeyzHKqvBODGmVQg/exec',
  API: {
    GAS_URL: 'https://script.google.com/macros/s/AKfycbzOV985jt5GQyU_PSjuyU1cnVgQYRUgYdPVOW1SmVfNlq1y7TGopvfeyzHKqvBODGmVQg/exec'
  },

  // 2. Firebase 설정 (Realtime Database & Anonymous Auth)
  // Firebase 콘솔에서 생성한 웹 앱 설정값을 입력하세요. 미입력 시에도 로컬 시뮬레이션으로 동작합니다.
  FIREBASE: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // 3. 게임 월드 및 디스플레이 설정
  GAME: {
    MAP_WIDTH: 100,     // 가로 타일 수 (100 타일 = 3200px)
    MAP_HEIGHT: 80,     // 세로 타일 수 (80 타일 = 2560px)
    TILE_SIZE: 32,      // 타일당 32x32 px
    MOVE_SPEED: 190,    // 캐릭터 이동 속도
    CAMERA_ZOOM: 1.4,   // 카메라 확대 배율
    SYNC_THROTTLE: 100  // 멀티플레이어 좌표 전송 주기 (ms)
  },

  // 4. 미니룸(싸이월드 스타일 하우징) 가구 카탈로그
  FURNITURE_CATALOG: [
    // [벽지 & 바닥재]
    { id: 'wp_pastel_pink', name: '딸기우유 핑크 벽지', type: 'wallpaper', price: 1500, emoji: '🌸', color: '#ffd1dc' },
    { id: 'wp_sky_blue',    name: '구름송송 하늘 벽지', type: 'wallpaper', price: 1500, emoji: '☁️', color: '#cbe7ff' },
    { id: 'wp_cozy_brick',  name: '포근 벽돌 벽지',     type: 'wallpaper', price: 2000, emoji: '🧱', color: '#e8cbb0' },
    { id: 'wp_mint_green',  name: '민트 그린 벽지',     type: 'wallpaper', price: 1800, emoji: '🌿', color: '#d8f3dc' },
    { id: 'fl_wood_parquet',name: '원목 마루 바닥',     type: 'floor',     price: 2000, emoji: '🪵', color: '#d4a373' },
    { id: 'fl_check_tile',  name: '모던 체크 타일',     type: 'floor',     price: 2500, emoji: '🏁', color: '#f0f0f0' },
    { id: 'fl_green_carpet',name: '잔디 러그 바닥',     type: 'floor',     price: 2200, emoji: '🌱', color: '#b7e4c7' },
    { id: 'fl_pastel_mat',  name: '파스텔 푹신 매트',   type: 'floor',     price: 1800, emoji: '🟨', color: '#fefae0' },

    // [가구 & 가전]
    { id: 'fn_cozy_bed',    name: '푹신한 원목 침대',   type: 'furniture', price: 5000, emoji: '🛏️', size: [2, 2], w: 64, h: 64 },
    { id: 'fn_gaming_desk', name: 'RGB 게이밍 데스크',  type: 'furniture', price: 6500, emoji: '🖥️', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_study_desk',  name: '원목 공부 책상',     type: 'furniture', price: 4000, emoji: '📚', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_comfy_sofa',  name: '포근한 패브릭 소파', type: 'furniture', price: 4500, emoji: '🛋️', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_bookshelf',   name: '마법 도서관 책장',   type: 'furniture', price: 3800, emoji: '📖', size: [1, 2], w: 32, h: 64 },
    { id: 'fn_retro_tv',    name: '레트로 브라운관 TV', type: 'furniture', price: 4200, emoji: '📺', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_turntable',   name: '감성 LP 턴테이블',   type: 'furniture', price: 3500, emoji: '🎵', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_aquarium',    name: '반짝이는 열대어 어항',type: 'furniture', price: 5500, emoji: '🐠', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_refrigerator',name: '파스텔 미니 냉장고', type: 'furniture', price: 4800, emoji: '🧊', size: [1, 2], w: 32, h: 64 },

    // [소품 & 인테리어]
    { id: 'fn_plant_pot',   name: '몬스테라 대형 화분', type: 'prop',      price: 1800, emoji: '🪴', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_teddy_bear',  name: '왕 커다란 곰인형',   type: 'prop',      price: 2500, emoji: '🧸', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_neon_sign',   name: '하트 네온사인 조명', type: 'prop',      price: 3000, emoji: '💖', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_floor_lamp',  name: '스탠드 무드등',     type: 'prop',      price: 2000, emoji: '💡', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_round_rug',   name: '포근 원형 러그',     type: 'prop',      price: 1500, emoji: '🧶', size: [2, 2], w: 64, h: 64 },
    { id: 'fn_wall_clock',  name: '뻐꾸기 벽시계',     type: 'prop',      price: 1200, emoji: '⏰', size: [1, 1], w: 32, h: 32 },

    // [미니룸 펫]
    { id: 'pet_shiba_dog',  name: '시바견 댕댕이',     type: 'pet',       price: 8000, emoji: '🐕', size: [1, 1], w: 32, h: 32 },
    { id: 'pet_calico_cat', name: '삼색이 냥이',       type: 'pet',       price: 8000, emoji: '🐈', size: [1, 1], w: 32, h: 32 },
    { id: 'pet_hamster',    name: '볼빵빵 햄스터',     type: 'pet',       price: 5000, emoji: '🐹', size: [1, 1], w: 32, h: 32 }
  ]
};
