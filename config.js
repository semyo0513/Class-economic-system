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

  // 4. 미니룸(싸이월드 스타일 하우징) 가구 & 소품 카탈로그
  FURNITURE_CATALOG: [
    // [벽지 & 바닥재]
    { id: 'wp_main_pink',   name: '체크핑크 시그니처 룸', type: 'wallpaper', price: 2000, emoji: '🏠', color: '#fed7aa', image: 'assets/메인룸 에셋/mini-room-default.jpg', desc: '싸이월드 감성 사선 핑크 타일 룸' },
    { id: 'wp_pastel_pink', name: '딸기우유 핑크 벽지', type: 'wallpaper', price: 1500, emoji: '🌸', color: '#ffd1dc', desc: '화사하고 달콤한 파스텔 핑크' },
    { id: 'wp_sky_blue',    name: '구름송송 하늘 벽지', type: 'wallpaper', price: 1500, emoji: '☁️', color: '#cbe7ff', desc: '청명한 하늘과 뭉게구름' },
    { id: 'wp_cozy_brick',  name: '포근 벽돌 벽지',     type: 'wallpaper', price: 2000, emoji: '🧱', color: '#e8cbb0', desc: '아늑한 앤틱 감성 벽돌' },
    { id: 'wp_mint_green',  name: '민트 그린 벽지',     type: 'wallpaper', price: 1800, emoji: '🌿', color: '#d8f3dc', desc: '싱그럽고 쾌적한 민트' },
    { id: 'fl_wood_parquet',name: '원목 마루 바닥',     type: 'floor',     price: 2000, emoji: '🪵', color: '#d4a373', desc: '따뜻한 내추럴 우드' },
    { id: 'fl_check_tile',  name: '모던 체크 타일',     type: 'floor',     price: 2500, emoji: '🏁', color: '#f0f0f0', desc: '클래식 핑크&화이트 격자 바닥' },
    { id: 'fl_green_carpet',name: '잔디 러그 바닥',     type: 'floor',     price: 2200, emoji: '🌱', color: '#b7e4c7', desc: '푹신한 잔디 카펫' },
    { id: 'fl_pastel_mat',  name: '파스텔 푹신 매트',   type: 'floor',     price: 1800, emoji: '🟨', color: '#fefae0', desc: '포근한 파스텔 바닥 매트' },

    // [🌟 실사에셋 가구 & 대형 오브젝트]
    { id: 'decor_pink_closet',        name: '러블리 핑크 하트 옷장',   type: 'furniture', price: 5500, emoji: '🚪', image: 'assets/방꾸미기 소품 에셋/0ca04c7768525c876c6285894205021c2a28875c.png', w: 75, h: 110, desc: '거울과 옷걸이가 달린 앤틱 핑크 옷장' },
    { id: 'decor_princess_bed',       name: '프린세스 캐노피 침대',     type: 'furniture', price: 7800, emoji: '🛏️', image: 'assets/방꾸미기 소품 에셋/0cf935626878105589793ecb928e228cf6fe0cea.png', w: 100, h: 90, desc: '로맨틱한 프릴 레이스 캐노피 침대' },
    { id: 'decor_pink_sofa',          name: '딸기 도트 분홍 소파',     type: 'furniture', price: 4800, emoji: '🛋️', image: 'assets/방꾸미기 소품 에셋/9999820ae64fe3b63ea0c206f0e5990f6b635e3e.png', w: 85, h: 60, desc: '푹신하고 귀여운 도트 리본 소파' },
    { id: 'decor_ribbon_car',         name: '웨딩 리본 오픈카',       type: 'furniture', price: 8500, emoji: '🚗', image: 'assets/방꾸미기 소품 에셋/0a708dc6043e25030e343cd8647c151b1174a78b.png', w: 90, h: 70, desc: '풍선과 꽃이 가득한 화려한 오픈카' },
    { id: 'decor_gingerbread_house',  name: '달콤 과자집 미니어처',     type: 'furniture', price: 7500, emoji: '🏠', image: 'assets/방꾸미기 소품 에셋/6335aa1471911cf1290fa64afccab8fc9532e918.png', w: 85, h: 85, desc: '젤리와 쿠키로 지은 달콤한 과자집' },
    { id: 'decor_piano',              name: '클래식 앤틱 피아노',       type: 'furniture', price: 9000, emoji: '🎹', image: 'assets/방꾸미기 소품 에셋/7d49127297dc0147f39d003558359b0c36258160.png', w: 85, h: 80, desc: '아름다운 선율이 흐르는 그랜드 피아노' },
    { id: 'decor_vanity_table',       name: '프린세스 분홍 화장대',     type: 'furniture', price: 5800, emoji: '💄', image: 'assets/방꾸미기 소품 에셋/7eee561966a316f2949f745575c223db1dbb45c8.png', w: 75, h: 85, desc: '향수와 거울이 놓인 럭셔리 화장대' },
    { id: 'decor_study_desk_set',     name: '스마트 공부 책상 세트',   type: 'furniture', price: 5200, emoji: '🖥️', image: 'assets/방꾸미기 소품 에셋/c097e2f07a2653b7d7a9cbf3266e017ed499d772.png', w: 80, h: 70, desc: '모니터와 스탠드가 구비된 열공 책상' },
    { id: 'decor_white_bookshelf',    name: '화이트 모던 책장',       type: 'furniture', price: 4900, emoji: '📚', image: 'assets/방꾸미기 소품 에셋/8f7f0f48586d8f85a975c9652502ece201d1522f.png', w: 75, h: 100, desc: '책과 소품이 단정히 정돈된 책장' },
    { id: 'decor_lovely_dresser',     name: '러블리 화이트 서랍장',     type: 'furniture', price: 4600, emoji: '🗄️', image: 'assets/방꾸미기 소품 에셋/f4f71438067982ad8c93ccd9bd62aacf515c735d.png', w: 70, h: 75, desc: '화병과 인형이 장식된 예쁜 서랍장' },
    { id: 'decor_cozy_fireplace',     name: '벽돌 감성 벽난로',       type: 'furniture', price: 6800, emoji: '🪵', image: 'assets/방꾸미기 소품 에셋/b8af601fe1cb4583da34305f65fca03e6baaf712.png', w: 85, h: 85, desc: '타닥타닥 따뜻한 장작 불꽃 벽난로' },
    { id: 'decor_flower_table',       name: '플라워 티 테이블',       type: 'furniture', price: 4200, emoji: '☕', image: 'assets/방꾸미기 소품 에셋/82a5aa14f1d794a374efe1fd37014290e540c6ba.png', w: 70, h: 60, desc: '화사한 꽃장식 레이스 티테이블' },
    { id: 'decor_tea_party_set',      name: '애프터눈 티파티 세트',     type: 'furniture', price: 5400, emoji: '🫖', image: 'assets/방꾸미기 소품 에셋/ffb5f1946c73af0c6873fc4e80cd3492f5fcd7db.png', w: 80, h: 65, desc: '달콤한 디저트와 홍차가 가득한 식탁' },
    { id: 'decor_wood_bench',         name: '정원 원목 벤치',         type: 'furniture', price: 3500, emoji: '🪑', image: 'assets/방꾸미기 소품 에셋/561b1618097ab9d2a611016f9b6671c191949c84.png', w: 75, h: 55, desc: '감성 가득한 우드 공원 벤치' },

    // [🌟 실사에셋 소품 & 장식 인테리어]
    { id: 'decor_flower_pillar',      name: '오렌지 플라워 폴',       type: 'prop',      price: 2000, emoji: '🌼', image: 'assets/방꾸미기 소품 에셋/048183735ef90d502c9a2718043b757e58ada1e7.png', w: 60, h: 100, desc: '상큼한 꽃줄기가 올라가는 장식 기둥' },
    { id: 'decor_teddy_bear',         name: '점보 리본 곰인형',       type: 'prop',      price: 3200, emoji: '🧸', image: 'assets/방꾸미기 소품 에셋/dd3d58bc180894c21c9661caf3a4218492b3ebfd.png', w: 60, h: 60, desc: '품에 안기 좋은 커다란 곰인형' },
    { id: 'decor_sweet_cake',         name: '3단 딸기 생크림 케이크',   type: 'prop',      price: 2500, emoji: '🎂', image: 'assets/방꾸미기 소품 에셋/3b8070d6ea978c6d83f83caf66c2511af278208b.png', w: 50, h: 50, desc: '축하 파티용 달콤한 생크림 케이크' },
    { id: 'decor_party_balloon',      name: '러브 하트 풍선 다발',     type: 'prop',      price: 1800, emoji: '🎈', image: 'assets/방꾸미기 소품 에셋/44db7cb7dfb4340867ad0cf2a031fd7e1e320b12.png', w: 55, h: 80, desc: '둥실둥실 파스텔 헬륨 풍선' },
    { id: 'decor_rabbit_mirror',      name: '토끼 손거울 & 브러쉬 세트',type: 'prop',     price: 2200, emoji: '🪞', image: 'assets/방꾸미기 소품 에셋/543e254be5a68b23ad921b7073a7a4b2e6eeced6.png', w: 60, h: 60, desc: '귀여운 토끼 모티브 뷰티 소품' },
    { id: 'decor_cozy_cushion',       name: '폭신 하트 쿠션',         type: 'prop',      price: 1200, emoji: '💖', image: 'assets/방꾸미기 소품 에셋/5766c01dad43266d30db6a964f67f2f873d5be9f.png', w: 45, h: 45, desc: '폭신폭신한 사랑스런 하트 쿠션' },
    { id: 'decor_crystal_chandelier', name: '크리스탈 샹들리에 조명', type: 'prop',      price: 6000, emoji: '✨', image: 'assets/방꾸미기 소품 에셋/5dda7016628062f99bf3c181dd0e577945d7dad5.png', w: 70, h: 70, desc: '영롱하게 반짝이는 천장 조명' },
    { id: 'decor_flower_pot',         name: '봄꽃 테라코타 화분',     type: 'prop',      price: 1600, emoji: '🪴', image: 'assets/방꾸미기 소품 에셋/8737e31618d7fba6d91ab32b683709c75bc26c4a.png', w: 45, h: 60, desc: '싱그러운 꽃과 화분' },
    { id: 'decor_retro_phone',        name: '다이얼 레트로 전화기',   type: 'prop',      price: 2000, emoji: '☎️', image: 'assets/방꾸미기 소품 에셋/9bbbcd174c2c8deed47c153a53463660a61c694c.png', w: 45, h: 45, desc: '추억의 앤틱 다이얼 전화기' },
    { id: 'decor_round_rug',          name: '파스텔 레이스 러그',     type: 'prop',      price: 2200, emoji: '🧶', image: 'assets/방꾸미기 소품 에셋/c1336ebbf12dabbd67e956c94fe3d6b065d21e38.png', w: 80, h: 50, desc: '바닥을 감싸는 로맨틱한 레이스 러그' },
    { id: 'decor_vintage_lamp',       name: '앤틱 스탠드 무드등',     type: 'prop',      price: 2400, emoji: '💡', image: 'assets/방꾸미기 소품 에셋/da1af40cc1b9c8de3af123a40229bfd21ab57cb2.png', w: 45, h: 75, desc: '은은한 밤 분위기를 주는 스탠드 조명' },
    { id: 'decor_retro_radio',        name: '빈티지 라디오 오디오',   type: 'prop',      price: 2800, emoji: '📻', image: 'assets/방꾸미기 소품 에셋/fd28e29f9240c87ede58e10afe14c087d1681fc5.png', w: 50, h: 45, desc: '음악이 흘러나오는 레트로 우드 라디오' },

    // [기본 가구 & 가전]
    { id: 'fn_cozy_bed',    name: '푹신한 원목 침대',   type: 'furniture', price: 5000, emoji: '🛏️', size: [2, 2], w: 64, h: 64 },
    { id: 'fn_gaming_desk', name: 'RGB 게이밍 데스크',  type: 'furniture', price: 6500, emoji: '🖥️', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_study_desk',  name: '원목 공부 책상',     type: 'furniture', price: 4000, emoji: '📚', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_comfy_sofa',  name: '포근한 패브릭 소파', type: 'furniture', price: 4500, emoji: '🛋️', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_bookshelf',   name: '마법 도서관 책장',   type: 'furniture', price: 3800, emoji: '📖', size: [1, 2], w: 32, h: 64 },
    { id: 'fn_retro_tv',    name: '레트로 브라운관 TV', type: 'furniture', price: 4200, emoji: '📺', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_turntable',   name: '감성 LP 턴테이블',   type: 'furniture', price: 3500, emoji: '🎵', size: [1, 1], w: 32, h: 32 },
    { id: 'fn_aquarium',    name: '반짝이는 열대어 어항',type: 'furniture', price: 5500, emoji: '🐠', size: [2, 1], w: 64, h: 32 },
    { id: 'fn_refrigerator',name: '파스텔 미니 냉장고', type: 'furniture', price: 4800, emoji: '🧊', size: [1, 2], w: 32, h: 64 },

    // [미니룸 펫]
    { id: 'pet_shiba_dog',  name: '시바견 댕댕이',     type: 'pet',       price: 8000, emoji: '🐕', size: [1, 1], w: 32, h: 32 },
    { id: 'pet_calico_cat', name: '삼색이 냥이',       type: 'pet',       price: 8000, emoji: '🐈', size: [1, 1], w: 32, h: 32 },
    { id: 'pet_hamster',    name: '볼빵빵 햄스터',     type: 'pet',       price: 5000, emoji: '🐹', size: [1, 1], w: 32, h: 32 }
  ],

  // 5. 미니룸 BGM 쥬크박스 플레이리스트
  BGM_PLAYLIST: [
    { id: 'bgm_cozy_town',  title: '🌸 아늑한 클래스타운 테마', note: '마을의 따스한 아침 햇살' },
    { id: 'bgm_retro_cyworld', title: '💖 프리스타일 Y (싸이월드 감성 BGM)', note: '그 시절 감성 명곡' },
    { id: 'bgm_lofi_study', title: '☕ 카페 로파이 빗소리', note: '집중과 힐링을 위한 비트' },
    { id: 'bgm_amusement',  title: '🎡 판타지 드림 놀이동산', note: '신나고 경쾌한 멜로디' },
    { id: 'bgm_night_calm', title: '🌙 고요한 별빛 밤하늘', note: '차분한 자장가 피아노' }
  ]
};

// 관리자 설정 소품 가격 동기화
try {
  const customPrices = JSON.parse(localStorage.getItem('classbank_custom_furn_prices') || '{}');
  CONFIG.FURNITURE_CATALOG.forEach(f => {
    if (customPrices[f.id] !== undefined && !isNaN(customPrices[f.id])) {
      f.price = Number(customPrices[f.id]);
    }
  });
} catch (_) {}
