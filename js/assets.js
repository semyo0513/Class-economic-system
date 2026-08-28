// ============================================================
// 2D 픽셀아트 & 프로시저럴 그래픽 에셋 생성기 (js/assets.js)
// 2.5D 입체 타운 맵, 캐릭터 뷰티/패션 살롱 커스터마이징, 아기자기한 파스텔 미니룸
// ============================================================

const AssetGenerator = (() => {
  // 1. 2.5D 고품격 입체 타일셋 생성 (잔디, 흙길, 돌보도블록, 맑은물, 꽃밭, 모래사장 등)
  function generateTileset() {
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 64; // 8개 타일 (32x32)
    const ctx = cvs.getContext('2d');

    // 0: 잔디 (부드러운 에메랄드 그린 + 입체 음영 잔디결)
    ctx.fillStyle = '#68d391'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#48bb78';
    for (let i = 0; i < 16; i++) {
      ctx.fillRect((i * 7) % 30, (i * 11) % 30, 2, 2);
    }
    // 잔디 하이라이트
    ctx.fillStyle = '#9ae6b4';
    ctx.fillRect(4, 6, 2, 1);
    ctx.fillRect(20, 18, 2, 1);

    // 1: 자갈 흙길 (따뜻한 베이지 + 입체 조약돌)
    ctx.fillStyle = '#eddcd2'; ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#ddb892';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(32 + (i * 9) % 28, (i * 13) % 28, 3, 2);
    }
    ctx.fillStyle = '#b08968';
    ctx.fillRect(36, 10, 2, 2);
    ctx.fillRect(52, 22, 2, 2);

    // 2: 돌 보도블록 (중심가 - 2.5D 입체 턱 & 블록 라인)
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(64, 0, 32, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.strokeRect(64.5, 0.5, 31, 31);
    ctx.strokeRect(64.5, 16.5, 31, 0);
    ctx.strokeRect(80.5, 0.5, 0, 16);
    ctx.strokeRect(72.5, 16.5, 0, 16);
    // 상단 하이라이트 / 하단 그림자 (입체감)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(65, 1, 30, 1);
    ctx.fillRect(65, 17, 30, 1);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(65, 15, 30, 1);
    ctx.fillRect(65, 31, 30, 1);

    // 3: 맑은 호수 물 (반짝이는 수면 반사)
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(98, 6, 14, 2);
    ctx.fillRect(112, 18, 12, 2);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(102, 26, 16, 2);

    // 4: 알록달록 꽃밭
    ctx.fillStyle = '#68d391'; ctx.fillRect(128, 0, 32, 32);
    ctx.fillStyle = '#f43f5e'; ctx.fillRect(132, 8, 4, 4);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(146, 18, 4, 4);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(138, 22, 4, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(150, 6, 3, 3);

    // 5: 나무 다리 (2.5D 입체 판자)
    ctx.fillStyle = '#b45309'; ctx.fillRect(160, 0, 32, 32);
    ctx.fillStyle = '#d97706';
    for (let y = 2; y < 32; y += 6) {
      ctx.fillRect(162, y, 28, 4);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(162, y + 4, 28, 1); // 판자 그림자
      ctx.fillStyle = '#d97706';
    }

    // 6: 모래사장 (비치)
    ctx.fillStyle = '#fde68a'; ctx.fillRect(192, 0, 32, 32);
    ctx.fillStyle = '#fcd34d';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(192 + (i * 11) % 30, (i * 7) % 30, 2, 2);
    }

    // 7: 놀이터 우레탄 트랙
    ctx.fillStyle = '#f87171'; ctx.fillRect(224, 0, 32, 32);
    ctx.fillStyle = '#ef4444';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(224 + (i * 13) % 28, (i * 9) % 28, 4, 2);
    }

    return cvs;
  }

  // 2. 캐릭터 커스터마이징 스프라이트시트 (헤어염색, 코스튬, 모자, 오라 지원)
  function generateCharacterSpritesheet(style = {}) {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 192; // 4 cols x 4 rows (32x48 each)
    const ctx = cvs.getContext('2d');

    // 스타일 파라미터 (기본값 설정)
    const hairColor = style.hairColor || '#78350f'; // 기본 갈색 / 핑크 / 골드 / 민트 등
    const costume = style.costume || 'default'; // 'default', 'school', 'pajama', 'magic', 'cyber', 'dress'
    const hat = style.hat || 'none'; // 'cat_ears', 'crown', 'halo', 'magic_hat', 'cap'
    const aura = style.aura || 'none'; // 'gold', 'cherry', 'rainbow', 'lightning'

    const dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach((dir, row) => {
      for (let col = 0; col < 4; col++) {
        const x = col * 32;
        const y = row * 48;
        const step = col % 2 === 1 ? (col === 1 ? -2 : 2) : 0;

        // 1) 바닥 입체 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 44, 11, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2) 특수 오라 효과 (배경 레이어)
        if (aura === 'gold' || aura === 'aura_gold') {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.beginPath(); ctx.arc(x + 16, y + 26, 18, 0, Math.PI * 2); ctx.fill();
        } else if (aura === 'cherry') {
          ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
          ctx.beginPath(); ctx.arc(x + 16, y + 26, 18, 0, Math.PI * 2); ctx.fill();
        } else if (aura === 'rainbow') {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
          ctx.beginPath(); ctx.arc(x + 16, y + 26, 18, 0, Math.PI * 2); ctx.fill();
        }

        // 3) 발 / 신발
        let shoeColor = '#334155';
        if (costume === 'school') shoeColor = '#0f172a';
        else if (costume === 'pajama') shoeColor = '#fbcfe8';
        else if (costume === 'cyber') shoeColor = '#06b6d4';

        ctx.fillStyle = shoeColor;
        ctx.fillRect(x + 10 + step, y + 38, 5, 6);
        ctx.fillRect(x + 17 - step, y + 38, 5, 6);

        // 4) 몸통 및 코스튬 의상
        if (costume === 'school') {
          // 스마트 교복 (감청색 재킷 + 넥타이)
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(x + 9, y + 24, 14, 15);
          ctx.fillStyle = '#ffffff'; // 와이셔츠
          ctx.fillRect(x + 13, y + 23, 6, 6);
          ctx.fillStyle = '#dc2626'; // 빨간 넥타이
          ctx.fillRect(x + 15, y + 25, 2, 5);
        } else if (costume === 'pajama') {
          // 핑크 곰돌이 잠옷
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x + 8, y + 23, 16, 16);
          ctx.fillStyle = '#fdf2f8';
          ctx.fillRect(x + 12, y + 27, 8, 8); // 배 부분
        } else if (costume === 'magic') {
          // 보라색 마법사 로브
          ctx.fillStyle = '#6b21a8';
          ctx.fillRect(x + 8, y + 23, 16, 16);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x + 15, y + 24, 2, 14); // 황금 장식선
        } else if (costume === 'cyber') {
          // 사이버펑크 네온 슈트
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 9, y + 24, 14, 15);
          ctx.fillStyle = '#22d3ee'; // 네온 라인
          ctx.fillRect(x + 10, y + 26, 12, 2);
          ctx.fillRect(x + 15, y + 28, 2, 10);
        } else if (costume === 'dress') {
          // 우아한 공주 드레스
          ctx.fillStyle = '#fb7185';
          ctx.fillRect(x + 9, y + 24, 14, 8);
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 32); ctx.lineTo(x + 25, y + 32); ctx.lineTo(x + 27, y + 40); ctx.lineTo(x + 5, y + 40); ctx.closePath();
          ctx.fill();
        } else {
          // 기본 포근한 청멜빵
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(x + 9, y + 24, 14, 15);
          ctx.fillStyle = '#ef4444'; // 빨간 셔츠
          ctx.fillRect(x + 11, y + 22, 10, 4);
        }

        // 팔 (애니메이션)
        ctx.fillStyle = '#fed7aa'; // 살색
        if (dir === 'left') {
          ctx.fillRect(x + 7, y + 24, 3, 8);
        } else if (dir === 'right') {
          ctx.fillRect(x + 22, y + 24, 3, 8);
        } else {
          ctx.fillRect(x + 6, y + 24, 3, 8);
          ctx.fillRect(x + 23, y + 24, 3, 8);
        }

        // 5) 머리 & 얼굴 (살구빛 큐트 베이스)
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(x + 16, y + 15, 9, 0, Math.PI * 2);
        ctx.fill();

        // 6) 헤어스타일 및 헤어 염색
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(x + 16, y + 12, 9.5, Math.PI, Math.PI * 2);
        ctx.fill();
        // 앞머리 볼륨
        ctx.fillRect(x + 8, y + 9, 16, 5);
        ctx.fillRect(x + 7, y + 11, 4, 7);
        ctx.fillRect(x + 21, y + 11, 4, 7);

        // 7) 얼굴 표정 (방향별)
        if (dir === 'down') {
          // 눈 (초롱초롱)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 12, y + 14, 2, 3);
          ctx.fillRect(x + 18, y + 14, 2, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 12, y + 14, 1, 1);
          ctx.fillRect(x + 18, y + 14, 1, 1);
          // 볼터치 (핑쿠)
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x + 10, y + 17, 2, 2);
          ctx.fillRect(x + 20, y + 17, 2, 2);
          // 입
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(x + 15, y + 18, 2, 1);
        } else if (dir === 'left') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 11, y + 14, 2, 3);
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x + 10, y + 17, 2, 2);
        } else if (dir === 'right') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 19, y + 14, 2, 3);
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x + 20, y + 17, 2, 2);
        }

        // 8) 모자 / 액세서리
        if (hat === 'cat_ears') {
          // 고양이 귀
          ctx.fillStyle = hairColor;
          ctx.beginPath(); ctx.moveTo(x + 9, y + 8); ctx.lineTo(x + 12, y + 2); ctx.lineTo(x + 14, y + 8); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + 18, y + 8); ctx.lineTo(x + 20, y + 2); ctx.lineTo(x + 23, y + 8); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x + 11, y + 4, 2, 3);
          ctx.fillRect(x + 19, y + 4, 2, 3);
        } else if (hat === 'crown') {
          // 황금 왕관
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(x + 10, y + 7); ctx.lineTo(x + 10, y + 1); ctx.lineTo(x + 13, y + 4);
          ctx.lineTo(x + 16, y + 0); ctx.lineTo(x + 19, y + 4); ctx.lineTo(x + 22, y + 1); ctx.lineTo(x + 22, y + 7);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 15, y + 4, 2, 2);
        } else if (hat === 'halo') {
          // 천사 링
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x + 16, y + 2, 7, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (hat === 'magic_hat') {
          // 마법사 꼬깔모자
          ctx.fillStyle = '#4c1d95';
          ctx.beginPath(); ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + 16, y - 4); ctx.lineTo(x + 25, y + 7); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#facc15'; ctx.fillRect(x + 9, y + 5, 14, 2);
        }
      }
    });

    return cvs;
  }

  // 3. 건물 2.5D 입체 텍스처 (타원형 그림자 & 지붕 입체 광택)
  function generateBuildingSprite(name, color, roofColor, width = 96, height = 96, emoji = '🏠', title = '건물') {
    const cvs = document.createElement('canvas');
    cvs.width = width; cvs.height = height + 10;
    const ctx = cvs.getContext('2d');

    // 1) 건물 하단 입체 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(width / 2, height + 2, width / 2 - 4, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2) 벽체 바디
    ctx.fillStyle = color;
    ctx.fillRect(8, 36, width - 16, height - 40);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5;
    ctx.strokeRect(8, 36, width - 16, height - 40);

    // 3) 지붕 (2.5D 입체 박공 지붕)
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(4, 40);
    ctx.lineTo(width / 2, 6);
    ctx.lineTo(width - 4, 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3;
    ctx.stroke();

    // 지붕 입체 하이라이트 & 텍스처 라인
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(8, 38); ctx.lineTo(width / 2, 9); ctx.lineTo(width / 2, 38); ctx.closePath();
    ctx.fill();

    // 4) 문 & 손잡이
    ctx.fillStyle = '#78350f';
    ctx.fillRect(width / 2 - 12, height - 32, 24, 28);
    ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 12, height - 32, 24, 28);
    ctx.fillStyle = '#fde047';
    ctx.beginPath(); ctx.arc(width / 2 + 7, height - 18, 2.5, 0, Math.PI * 2); ctx.fill();

    // 5) 창문 (반사광 효과)
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(16, 48, 18, 18);
    ctx.fillRect(width - 34, 48, 18, 18);
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2;
    ctx.strokeRect(16, 48, 18, 18);
    ctx.strokeRect(width - 34, 48, 18, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(18, 50, 4, 14);
    ctx.fillRect(width - 32, 50, 4, 14);

    // 6) 간판 엠블럼 뱃지
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 40, 24, 80, 22, 6);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${emoji} ${title}`, width / 2, 39);

    return cvs;
  }

  // 4. 화려한 벚꽃나무 스프라이트 (입체 그림자 포함)
  function generateTreeSprite(isPink = true) {
    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 84;
    const ctx = cvs.getContext('2d');

    // 나무 바닥 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(32, 78, 16, 6, 0, 0, Math.PI * 2); ctx.fill();

    // 기둥
    ctx.fillStyle = '#78350f';
    ctx.fillRect(26, 44, 12, 32);
    ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2; ctx.strokeRect(26, 44, 12, 32);

    // 풍성한 나뭇잎 구름
    const leafColor = isPink ? '#ffb7b2' : '#22c55e';
    const darkLeaf = isPink ? '#ff9aa2' : '#15803d';

    ctx.fillStyle = darkLeaf;
    ctx.beginPath(); ctx.arc(32, 36, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = leafColor;
    ctx.beginPath(); ctx.arc(32, 28, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 32, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, 32, 14, 0, Math.PI * 2); ctx.fill();

    // 꽃잎 반짝임
    ctx.fillStyle = isPink ? '#ffffff' : '#86efac';
    ctx.fillRect(28, 20, 3, 3);
    ctx.fillRect(38, 26, 3, 3);
    ctx.fillRect(22, 30, 2, 2);

    return cvs;
  }

  // 5. 대형 분수대 스프라이트
  function generateFountainSprite() {
    const cvs = document.createElement('canvas');
    cvs.width = 96; cvs.height = 84;
    const ctx = cvs.getContext('2d');

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(48, 76, 40, 8, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.ellipse(48, 55, 42, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.ellipse(48, 53, 36, 16, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(44, 25, 8, 30);
    ctx.beginPath(); ctx.ellipse(48, 25, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#bae6fd';
    ctx.beginPath(); ctx.arc(48, 12, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(46, 12, 4, 15);

    return cvs;
  }

  // 6. 놀이동산 어트랙션 (대관람차, 회전목마, 롤러코스터, 서커스텐트, 팝콘)
  function generateAmusementSprite(type) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    if (type === 'ferris_wheel') {
      cvs.width = 120; cvs.height = 135;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(60, 128, 45, 8, 0, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(60, 60, 48, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const rad = (i * Math.PI) / 4;
        ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(60 + Math.cos(rad) * 48, 60 + Math.sin(rad) * 48); ctx.stroke();
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#a855f7';
        ctx.fillRect(60 + Math.cos(rad) * 48 - 6, 60 + Math.sin(rad) * 48 - 6, 12, 12);
      }
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(30, 120); ctx.moveTo(60, 60); ctx.lineTo(90, 120); ctx.stroke();
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(60, 60, 8, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'carousel') {
      cvs.width = 110; cvs.height = 105;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(55, 98, 45, 7, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ec4899';
      ctx.beginPath(); ctx.moveTo(10, 40); ctx.lineTo(55, 10); ctx.lineTo(100, 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047';
      for (let x = 18; x < 100; x += 18) ctx.fillRect(x, 26, 8, 14);

      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(15, 40, 6, 50); ctx.fillRect(52, 40, 6, 50); ctx.fillRect(89, 40, 6, 50);
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.ellipse(55, 90, 45, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(28, 55, 14, 12); ctx.fillRect(68, 55, 14, 12);
    } else if (type === 'roller_coaster') {
      cvs.width = 130; cvs.height = 95;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(65, 88, 55, 7, 0, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(10, 80); ctx.bezierCurveTo(40, 10, 80, 90, 120, 30); ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      for (let x = 20; x <= 110; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 45); ctx.stroke();
      }
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(75, 42, 18, 10);
    } else if (type === 'circus_tent') {
      cvs.width = 100; cvs.height = 100;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(50, 92, 40, 8, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.moveTo(10, 50); ctx.lineTo(50, 15); ctx.lineTo(90, 50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(30, 50); ctx.lineTo(50, 15); ctx.lineTo(40, 50); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(70, 50); ctx.lineTo(50, 15); ctx.lineTo(60, 50); ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#dc2626'; ctx.fillRect(15, 50, 70, 35);
      ctx.fillStyle = '#fde047'; ctx.fillRect(50, 8, 3, 10);
    } else if (type === 'popcorn') {
      cvs.width = 60; cvs.height = 65;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(30, 58, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 25, 40, 30);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(18, 25, 8, 30); ctx.fillRect(34, 25, 8, 30);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(30, 20, 12, 0, Math.PI * 2); ctx.fill();
    }
    return cvs;
  }

  // 7. 동물 주민 NPC (곰돌이 촌장, 토끼 은행원, 야옹 상인, 판다 선생님, 여우 투자가)
  function generateAnimalNpcSprite(type) {
    const cvs = document.createElement('canvas');
    cvs.width = 48; cvs.height = 54;
    const ctx = cvs.getContext('2d');

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(24, 48, 14, 5, 0, 0, Math.PI * 2); ctx.fill();

    if (type === 'bear_mayor') {
      ctx.fillStyle = '#92400e';
      ctx.beginPath(); ctx.arc(24, 20, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(34, 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fed7aa'; ctx.beginPath(); ctx.arc(24, 23, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(23, 20, 2, 2);
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(14, 30, 20, 16);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(23, 30, 2, 6);
    } else if (type === 'rabbit_banker') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(24, 22, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(16, 4, 4, 14); ctx.fillRect(28, 4, 4, 14);
      ctx.fillStyle = '#f472b6'; ctx.fillRect(17, 6, 2, 10); ctx.fillRect(29, 6, 2, 10);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 20, 2, 2); ctx.fillRect(26, 20, 2, 2);
      ctx.fillStyle = '#16a34a'; ctx.fillRect(14, 32, 20, 14);
    } else if (type === 'cat_merchant') {
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(24, 22, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, 14); ctx.lineTo(16, 6); ctx.lineTo(21, 14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(34, 14); ctx.lineTo(32, 6); ctx.lineTo(27, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 20, 2, 2); ctx.fillRect(26, 20, 2, 2);
      ctx.fillStyle = '#eab308'; ctx.fillRect(14, 32, 20, 14);
    } else if (type === 'panda_teacher') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(24, 22, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(14, 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(34, 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(19, 21, 3, 4, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(29, 21, 3, 4, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7c3aed'; ctx.fillRect(14, 32, 20, 14);
    } else if (type === 'fox_investor') {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.arc(24, 22, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(15, 14); ctx.lineTo(17, 4); ctx.lineTo(22, 14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(33, 14); ctx.lineTo(31, 4); ctx.lineTo(26, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(17, 24); ctx.lineTo(24, 28); ctx.lineTo(31, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 20, 2, 2); ctx.fillRect(26, 20, 2, 2);
      ctx.fillStyle = '#334155'; ctx.fillRect(14, 32, 20, 14);
    }
    return cvs;
  }

  return {
    generateTileset,
    generateCharacterSpritesheet,
    generateBuildingSprite,
    generateTreeSprite,
    generateFountainSprite,
    generateAmusementSprite,
    generateAnimalNpcSprite
  };
})();
