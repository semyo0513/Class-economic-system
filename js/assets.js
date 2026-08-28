// ============================================================
// 2D 픽셀아트 & 프로시저럴 그래픽 에셋 생성기 (js/assets.js)
// 6대 테마 타운 & 놀이동산 & 워터파크 & 캠핑장 & 동물 NPC & 장착 아이템
// ============================================================

const AssetGenerator = (() => {
  // 1. 타일셋 생성 (잔디, 흙길, 돌보도블록, 물, 꽃밭, 모래사장 등)
  function generateTileset() {
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 64; // 8개 타일 (32x32)
    const ctx = cvs.getContext('2d');

    // 0: 잔디 (부드러운 에메랄드 그린)
    ctx.fillStyle = '#68d391'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#48bb78';
    for (let i = 0; i < 16; i++) {
      ctx.fillRect((i * 7) % 30, (i * 11) % 30, 2, 2);
    }

    // 1: 자갈 흙길 (따뜻한 베이지)
    ctx.fillStyle = '#eddcd2'; ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#ddb892';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(32 + (i * 9) % 28, (i * 13) % 28, 3, 2);
    }

    // 2: 돌 보도블록 (중심가)
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(64, 0, 32, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.strokeRect(64.5, 0.5, 31, 31);
    ctx.strokeRect(64.5, 16.5, 31, 0);
    ctx.strokeRect(80.5, 0.5, 0, 16);
    ctx.strokeRect(72.5, 16.5, 0, 16);

    // 3: 맑은 호수 물
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(98, 8, 12, 2);
    ctx.fillRect(112, 20, 10, 2);

    // 4: 알록달록 꽃밭
    ctx.fillStyle = '#68d391'; ctx.fillRect(128, 0, 32, 32);
    ctx.fillStyle = '#f43f5e'; ctx.fillRect(132, 8, 4, 4);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(146, 18, 4, 4);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(138, 22, 4, 4);

    // 5: 나무 다리
    ctx.fillStyle = '#b45309'; ctx.fillRect(160, 0, 32, 32);
    ctx.fillStyle = '#d97706';
    for (let y = 2; y < 32; y += 6) {
      ctx.fillRect(162, y, 28, 4);
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

  // 2. 캐릭터 스프라이트시트 (4방향 4프레임)
  function generateCharacterSpritesheet() {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 192; // 4 cols x 4 rows (32x48 each)
    const ctx = cvs.getContext('2d');

    const dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach((dir, row) => {
      for (let col = 0; col < 4; col++) {
        const x = col * 32;
        const y = row * 48;
        const step = col % 2 === 1 ? (col === 1 ? -2 : 2) : 0;

        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 44, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 발/신발
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 10 + step, y + 38, 5, 6);
        ctx.fillRect(x + 17 - step, y + 38, 5, 6);

        // 몸통/멜빵 옷 (포근한 청멜빵)
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x + 9, y + 24, 14, 15);
        ctx.fillStyle = '#ef4444'; // 빨간 셔츠
        ctx.fillRect(x + 11, y + 22, 10, 4);

        // 머리 (둥근 얼굴)
        ctx.fillStyle = '#ffedd5';
        ctx.fillRect(x + 8, y + 8, 16, 15);

        // 헤어스타일 (도토리 갈색 머리)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 7, y + 5, 18, 7);
        ctx.fillRect(x + 6, y + 8, 4, 8);
        ctx.fillRect(x + 22, y + 8, 4, 8);

        // 눈 & 볼터치
        if (dir === 'down') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 11, y + 14, 2, 3);
          ctx.fillRect(x + 19, y + 14, 2, 3);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(x + 9, y + 17, 3, 2);
          ctx.fillRect(x + 20, y + 17, 3, 2);
        } else if (dir === 'left') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 9, y + 14, 2, 3);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(x + 8, y + 17, 3, 2);
        } else if (dir === 'right') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 21, y + 14, 2, 3);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(x + 21, y + 17, 3, 2);
        }
      }
    });

    return cvs;
  }

  // 3. 14개 건물 프로시저럴 그래픽
  function generateBuildingSprite(roofColor, title, emoji, width = 160, height = 140) {
    const cvs = document.createElement('canvas');
    cvs.width = width; cvs.height = height;
    const ctx = cvs.getContext('2d');

    // 벽체
    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(10, 45, width - 20, height - 50);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 45, width - 20, height - 50);

    // 지붕 (입체 경사)
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(width / 2, 10);
    ctx.lineTo(width, 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 지붕 테두리 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(width / 2, 10);
    ctx.lineTo(0, 48);
    ctx.lineTo(6, 48);
    ctx.lineTo(width / 2, 14);
    ctx.fill();

    // 굴뚝
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(width - 36, 12, 14, 22);
    ctx.strokeRect(width - 36, 12, 14, 22);

    // 문
    const doorW = 34, doorH = 46;
    const doorX = (width - doorW) / 2;
    const doorY = height - doorH - 3;
    ctx.fillStyle = '#b45309';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(doorX + doorW - 8, doorY + doorH / 2, 3, 0, Math.PI * 2); ctx.fill();

    // 창문 (양쪽)
    const winY = 60, winSize = 24;
    [24, width - 24 - winSize].forEach(wx => {
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(wx, winY, winSize, winSize);
      ctx.strokeRect(wx, winY, winSize, winSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx + 2, winY + 2, 6, 6);
    });

    // 화려한 간판
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, 26, width - 32, 24);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 26, width - 32, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${emoji} ${title}`, width / 2, 42);

    return cvs;
  }

  // 4. 화려한 벚꽃나무 스프라이트
  function generateTreeSprite(isPink = true) {
    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 80;
    const ctx = cvs.getContext('2d');

    // 나무 기둥
    ctx.fillStyle = '#78350f';
    ctx.fillRect(26, 44, 12, 30);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 44, 12, 30);

    // 풍성한 나뭇잎 구름 (벚꽃 / 일반)
    const leafColor = isPink ? '#ffb7b2' : '#22c55e';
    const darkLeaf = isPink ? '#ff9aa2' : '#15803d';

    ctx.fillStyle = darkLeaf;
    ctx.beginPath(); ctx.arc(32, 36, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = leafColor;
    ctx.beginPath(); ctx.arc(32, 28, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 32, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, 32, 14, 0, Math.PI * 2); ctx.fill();

    // 반짝임 꽃잎
    ctx.fillStyle = isPink ? '#ffffff' : '#86efac';
    ctx.fillRect(28, 20, 3, 3);
    ctx.fillRect(38, 26, 3, 3);
    ctx.fillRect(22, 30, 2, 2);

    return cvs;
  }

  // 5. 대형 분수대 스프라이트
  function generateFountainSprite() {
    const cvs = document.createElement('canvas');
    cvs.width = 96; cvs.height = 80;
    const ctx = cvs.getContext('2d');

    // 하단 수조
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.ellipse(48, 55, 42, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.stroke();

    // 맑은 물
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.ellipse(48, 53, 36, 16, 0, 0, Math.PI * 2); ctx.fill();

    // 중앙 기둥
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(44, 25, 8, 30);
    ctx.beginPath(); ctx.ellipse(48, 25, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

    // 뿜어져 나오는 물줄기
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath(); ctx.arc(48, 12, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(46, 12, 4, 15);

    return cvs;
  }

  // 6. 놀이동산 어트랙션 (대관람차, 회전목마, 롤러코스터, 서커스텐트, 팝콘가판대)
  function generateAmusementSprite(type) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    if (type === 'ferris_wheel') {
      cvs.width = 120; cvs.height = 130;
      // 대관람차
      ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(60, 60, 48, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const rad = (i * Math.PI) / 4;
        ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(60 + Math.cos(rad) * 48, 60 + Math.sin(rad) * 48); ctx.stroke();
        // 곤돌라
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#a855f7';
        ctx.fillRect(60 + Math.cos(rad) * 48 - 6, 60 + Math.sin(rad) * 48 - 6, 12, 12);
      }
      // 지지대
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(30, 120); ctx.moveTo(60, 60); ctx.lineTo(90, 120); ctx.stroke();
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(60, 60, 8, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'carousel') {
      cvs.width = 110; cvs.height = 100;
      // 지붕
      ctx.fillStyle = '#ec4899';
      ctx.beginPath(); ctx.moveTo(10, 40); ctx.lineTo(55, 10); ctx.lineTo(100, 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047';
      for (let x = 18; x < 100; x += 18) {
        ctx.fillRect(x, 26, 8, 14);
      }
      // 기둥 및 회전목마 말
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(20, 40, 6, 45); ctx.fillRect(52, 40, 6, 45); ctx.fillRect(84, 40, 6, 45);
      ctx.font = '22px sans-serif'; ctx.fillText('🎠', 24, 75); ctx.fillText('🎠', 56, 75);
      ctx.fillStyle = '#334155'; ctx.fillRect(8, 85, 94, 10);
    } else if (type === 'roller_coaster') {
      cvs.width = 130; cvs.height = 90;
      ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, 80); ctx.bezierCurveTo(40, 10, 80, 90, 120, 30); ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(60, 35, 20, 14);
      ctx.font = '16px sans-serif'; ctx.fillText('🎢', 62, 48);
    } else if (type === 'circus_tent') {
      cvs.width = 120; cvs.height = 110;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.moveTo(10, 55); ctx.lineTo(60, 15); ctx.lineTo(110, 55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 25; i < 100; i += 24) { ctx.fillRect(i, 35, 10, 20); }
      ctx.fillStyle = '#fef08a'; ctx.fillRect(15, 55, 90, 45);
      ctx.fillStyle = '#7c3aed'; ctx.fillRect(45, 65, 30, 35);
      ctx.font = '18px sans-serif'; ctx.fillText('🎪', 50, 50);
    } else {
      // 팝콘 왜건
      cvs.width = 60; cvs.height = 60;
      ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 20, 40, 25);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(15, 10, 30, 10);
      ctx.font = '20px sans-serif'; ctx.fillText('🍿', 18, 38);
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.arc(20, 48, 8, 0, Math.PI * 2); ctx.arc(40, 48, 8, 0, Math.PI * 2); ctx.fill();
    }

    return cvs;
  }

  // 7. 워터파크 어트랙션 (워터슬라이드, 오리배, 비치파라솔)
  function generateWaterparkSprite(type) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    if (type === 'water_slide') {
      cvs.width = 120; cvs.height = 110;
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(100, 20); ctx.bezierCurveTo(40, 30, 100, 70, 20, 95); ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(88, 15, 24, 80);
      ctx.font = '24px sans-serif'; ctx.fillText('🏄‍♂️', 45, 65);
    } else if (type === 'duck_boat') {
      cvs.width = 60; cvs.height = 50;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.ellipse(30, 30, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '26px sans-serif'; ctx.fillText('🦆', 18, 36);
    } else {
      // 비치 파라솔 & 선베드
      cvs.width = 70; cvs.height = 70;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.arc(35, 25, 24, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(33, 25, 4, 35);
      ctx.font = '22px sans-serif'; ctx.fillText('⛱️', 24, 45);
    }

    return cvs;
  }

  // 8. 캠핑장 어트랙션 (텐트, 캠프파이어)
  function generateCampingSprite(type) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    if (type === 'camp_tent') {
      cvs.width = 90; cvs.height = 80;
      ctx.fillStyle = '#059669';
      ctx.beginPath(); ctx.moveTo(15, 70); ctx.lineTo(45, 15); ctx.lineTo(75, 70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.moveTo(35, 70); ctx.lineTo(45, 35); ctx.lineTo(55, 70); ctx.closePath(); ctx.fill();
      ctx.font = '24px sans-serif'; ctx.fillText('⛺', 33, 60);
    } else {
      // 캠프파이어
      cvs.width = 50; cvs.height = 50;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(10, 35, 30, 8);
      ctx.font = '24px sans-serif'; ctx.fillText('🔥', 14, 34);
    }

    return cvs;
  }

  // 9. 동물 NPC 주민 스프라이트 (곰, 토끼, 고양이, 판다, 여우)
  function generateAnimalNPCSprite(type) {
    const cvs = document.createElement('canvas');
    cvs.width = 36; cvs.height = 42;
    const ctx = cvs.getContext('2d');

    const emojiMap = {
      bear: '🐻', rabbit: '🐰', cat: '🐱', panda: '🐼', fox: '🦊'
    };

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(18, 38, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(emojiMap[type] || '🐻', 18, 32);

    return cvs;
  }

  // 10. 캐릭터 장착 아이템 오버레이 스프라이트
  function generateEquipOverlay(type) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    if (type === 'wings_angel') {
      cvs.width = 48; cvs.height = 32;
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪽', 24, 24);
    } else if (type === 'mount_kickboard') {
      cvs.width = 40; cvs.height = 24;
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛴', 20, 18);
    }

    return cvs;
  }

  // 11. 환경 소품
  function generatePropSprite(type) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');

    if (type === 'lamp') {
      cvs.width = 24; cvs.height = 48;
      ctx.fillStyle = '#334155'; ctx.fillRect(10, 10, 4, 36);
      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(12, 10, 8, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'bench') {
      cvs.width = 48; cvs.height = 28;
      ctx.fillStyle = '#b45309'; ctx.fillRect(4, 8, 40, 12);
      ctx.fillStyle = '#334155'; ctx.fillRect(8, 20, 4, 8); ctx.fillRect(36, 20, 4, 8);
    } else if (type === 'mailbox') {
      cvs.width = 28; cvs.height = 36;
      ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 6, 16, 20);
      ctx.fillStyle = '#334155'; ctx.fillRect(12, 26, 4, 10);
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
    generateWaterparkSprite,
    generateCampingSprite,
    generateAnimalNPCSprite,
    generateEquipOverlay,
    generatePropSprite
  };
})();
