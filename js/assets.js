// ============================================================
// 고품질 픽셀아트 에셋 생성기 (js/assets.js)
// 타일, 건물, 캐릭터, 가구, 놀이동산, 워터파크, 캠핑장, 장착 아이템
// ============================================================

const AssetGenerator = (() => {
  function createCanvas(w, h) {
    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { cvs, ctx };
  }

  // 1. 기본 지형 타일셋
  function generateTileset() {
    const { cvs, ctx } = createCanvas(256, 256);

    // (0,0) 잔디
    ctx.fillStyle = '#88d49e';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#7ac590';
    ctx.fillRect(4, 8, 4, 4);
    ctx.fillRect(20, 14, 4, 4);
    ctx.fillRect(12, 24, 4, 4);
    ctx.fillStyle = '#9be3af';
    ctx.fillRect(14, 4, 3, 3);
    ctx.fillRect(6, 18, 3, 3);

    // (1,0) 흙길
    ctx.fillStyle = '#eddcd2';
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#ddb892';
    ctx.fillRect(36, 6, 6, 4);
    ctx.fillRect(52, 18, 8, 4);

    // (2,0) 석재 보도블록
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(64, 0, 32, 32);
    ctx.strokeStyle = '#ced4da';
    ctx.lineWidth = 2;
    ctx.strokeRect(65, 1, 14, 14);
    ctx.strokeRect(81, 1, 14, 14);
    ctx.strokeRect(65, 17, 14, 14);
    ctx.strokeRect(81, 17, 14, 14);

    // (3,0) 맑은 물
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(100, 8, 12, 3);
    ctx.fillRect(114, 20, 10, 3);

    // (4,0) 꽃밭
    ctx.fillStyle = '#88d49e';
    ctx.fillRect(128, 0, 32, 32);
    ctx.fillStyle = '#ff6b6b'; ctx.fillRect(132, 8, 4, 4);
    ctx.fillStyle = '#feca57'; ctx.fillRect(148, 14, 4, 4);
    ctx.fillStyle = '#ff9ff3'; ctx.fillRect(138, 22, 4, 4);

    // (5,0) 나무 다리
    ctx.fillStyle = '#c68b59';
    ctx.fillRect(160, 0, 32, 32);
    ctx.fillStyle = '#8d5b4c';
    ctx.fillRect(160, 0, 32, 4);
    ctx.fillRect(160, 28, 32, 4);
    ctx.fillRect(174, 4, 4, 24);

    // (6,0) 모래사장 (워터파크/해변)
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(192, 0, 32, 32);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(196, 8, 4, 4);
    ctx.fillRect(212, 20, 4, 4);

    return cvs;
  }

  // 2. 캐릭터 4방향 스프라이트시트
  function generateCharacterSpritesheet(skinColor = '#ffeaa7', hairColor = '#6c5ce7', clothesColor = '#ff7675') {
    const { cvs, ctx } = createCanvas(128, 192);
    const dirs = ['down', 'left', 'right', 'up'];

    dirs.forEach((dir, row) => {
      for (let frame = 0; frame < 4; frame++) {
        const ox = frame * 32;
        const oy = row * 48;
        const bounce = (frame % 2 === 1) ? 2 : 0;
        const legWalk = (frame === 1) ? -2 : (frame === 3 ? 2 : 0);

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(ox + 16, oy + 44, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d3436';
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(ox + 9, oy + 38 + bounce + (legWalk < 0 ? -2 : 0), 5, 5);
          ctx.fillRect(ox + 18, oy + 38 + bounce + (legWalk > 0 ? -2 : 0), 5, 5);
        } else {
          ctx.fillRect(ox + 12 + legWalk, oy + 38 + bounce, 8, 5);
        }

        ctx.fillStyle = clothesColor;
        ctx.fillRect(ox + 8, oy + 24 + bounce, 16, 15);
        if (dir === 'down') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox + 15, oy + 24 + bounce, 2, 8);
        }

        ctx.fillStyle = skinColor;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(ox + 5, oy + 25 + bounce - legWalk, 3, 9);
          ctx.fillRect(ox + 24, oy + 25 + bounce + legWalk, 3, 9);
        } else if (dir === 'left') {
          ctx.fillRect(ox + 10 - legWalk, oy + 25 + bounce, 4, 9);
        } else {
          ctx.fillRect(ox + 18 + legWalk, oy + 25 + bounce, 4, 9);
        }

        ctx.fillStyle = skinColor;
        ctx.fillRect(ox + 7, oy + 10 + bounce, 18, 15);

        ctx.fillStyle = hairColor;
        ctx.fillRect(ox + 6, oy + 6 + bounce, 20, 9);
        ctx.fillRect(ox + 5, oy + 9 + bounce, 4, 9);
        ctx.fillRect(ox + 23, oy + 9 + bounce, 4, 9);

        if (dir === 'down') {
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(ox + 10, oy + 16 + bounce, 3, 3);
          ctx.fillRect(ox + 19, oy + 16 + bounce, 3, 3);
          ctx.fillStyle = '#ff7675';
          ctx.fillRect(ox + 9, oy + 19 + bounce, 3, 2);
          ctx.fillRect(ox + 20, oy + 19 + bounce, 3, 2);
        } else if (dir === 'left') {
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(ox + 9, oy + 16 + bounce, 3, 3);
        } else if (dir === 'right') {
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(ox + 20, oy + 16 + bounce, 3, 3);
        } else if (dir === 'up') {
          ctx.fillStyle = hairColor;
          ctx.fillRect(ox + 6, oy + 10 + bounce, 20, 10);
        }
      }
    });

    return cvs;
  }

  // 3. 건물 스프라이트
  function generateBuildingSprite(colorRoof, signTitle, signEmoji, width = 160, height = 140) {
    const { cvs, ctx } = createCanvas(width, height);

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(width / 2, height - 8, width * 0.45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const wallY = 50;
    const wallH = height - wallY - 14;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(16, wallY, width - 32, wallH);
    ctx.strokeStyle = '#e2d9cc';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, wallY, width - 32, wallH);

    ctx.fillStyle = colorRoof;
    ctx.beginPath();
    ctx.moveTo(width / 2, 4);
    ctx.lineTo(width - 6, wallY + 8);
    ctx.lineTo(6, wallY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 3;
    ctx.stroke();

    const doorW = 28;
    const doorH = 40;
    const doorX = (width - doorW) / 2;
    const doorY = height - doorH - 14;
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(doorX, doorY, doorW, doorH);

    const signW = Math.min(width - 30, 120);
    const signH = 26;
    const signX = (width - signW) / 2;
    const signY = wallY - 14;

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(signX, signY, signW, signH);

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${signEmoji} ${signTitle}`, width / 2, signY + signH / 2);

    return cvs;
  }

  // 4. 놀이동산 오브젝트
  function generateAmusementSprite(type) {
    if (type === 'ferris_wheel') {
      const { cvs, ctx } = createCanvas(130, 140);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(35, 130); ctx.lineTo(65, 65); ctx.lineTo(95, 130); ctx.stroke();
      ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(65, 65, 52, 0, Math.PI * 2); ctx.stroke();
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath(); ctx.moveTo(65, 65); ctx.lineTo(65 + Math.cos(a)*52, 65 + Math.sin(a)*52); ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(65 + Math.cos(a)*52 - 6, 65 + Math.sin(a)*52 - 4, 12, 10);
      }
      return cvs;
    } else if (type === 'carousel') {
      const { cvs, ctx } = createCanvas(110, 110);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(55, 10); ctx.lineTo(105, 45); ctx.lineTo(5, 45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.moveTo(55, 10); ctx.lineTo(85, 45); ctx.lineTo(25, 45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(15, 45, 6, 50); ctx.fillRect(52, 45, 6, 50); ctx.fillRect(89, 45, 6, 50);
      ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🎠', 32, 75); ctx.fillText('🎠', 72, 75);
      ctx.fillStyle = '#d97706'; ctx.fillRect(8, 92, 94, 10);
      return cvs;
    } else if (type === 'roller_coaster') {
      const { cvs, ctx } = createCanvas(140, 100);
      ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(10, 80); ctx.bezierCurveTo(40, 10, 90, 90, 130, 20); ctx.stroke();
      ctx.font = '24px sans-serif'; ctx.fillText('🎢', 50, 45);
      return cvs;
    } else if (type === 'circus_tent') {
      const { cvs, ctx } = createCanvas(120, 100);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.moveTo(60, 8); ctx.lineTo(115, 60); ctx.lineTo(5, 60); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(10, 60, 100, 34);
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(60, 94, 16, Math.PI, 0); ctx.fill();
      return cvs;
    } else if (type === 'popcorn_cart') {
      const { cvs, ctx } = createCanvas(48, 56);
      ctx.fillStyle = '#f43f5e'; ctx.fillRect(8, 20, 32, 24);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(12, 6, 24, 14);
      ctx.font = '12px sans-serif'; ctx.fillText('🍿', 18, 18);
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(16, 46, 6, 0, Math.PI * 2); ctx.arc(32, 46, 6, 0, Math.PI * 2); ctx.fill();
      return cvs;
    }
    return createCanvas(32, 32).cvs;
  }

  // 5. 워터파크 & 해변 특수 오브젝트 (워터 슬라이드, 오리배, 비치 파라솔)
  function generateWaterparkSprite(type) {
    if (type === 'water_slide') {
      const { cvs, ctx } = createCanvas(120, 120);
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(20, 20); ctx.bezierCurveTo(80, 20, 30, 90, 100, 100); ctx.stroke();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(20, 20); ctx.bezierCurveTo(80, 20, 30, 90, 100, 100); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.fillText('🏄‍♂️', 85, 95);
      return cvs;
    } else if (type === 'duck_boat') {
      const { cvs, ctx } = createCanvas(56, 48);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.ellipse(28, 30, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🦆', 28, 26);
      return cvs;
    } else if (type === 'beach_umbrella') {
      const { cvs, ctx } = createCanvas(64, 64);
      ctx.fillStyle = '#64748b'; ctx.fillRect(30, 20, 4, 40);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.arc(32, 22, 28, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(32, 22); ctx.arc(32, 22, 28, Math.PI + 0.8, Math.PI + 1.6); ctx.fill();
      return cvs;
    }
    return createCanvas(32, 32).cvs;
  }

  // 6. 캠핑장 & 피크닉 오브젝트 (캠핑 텐트, 캠프파이어 모닥불, 통나무)
  function generateCampingSprite(type) {
    if (type === 'camp_tent') {
      const { cvs, ctx } = createCanvas(80, 70);
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(75, 60); ctx.lineTo(5, 60); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#065f46';
      ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(55, 60); ctx.lineTo(25, 60); ctx.closePath(); ctx.fill();
      return cvs;
    } else if (type === 'campfire') {
      const { cvs, ctx } = createCanvas(48, 48);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 36, 32, 6);
      ctx.fillRect(14, 30, 20, 6);
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', 24, 26);
      return cvs;
    }
    return createCanvas(32, 32).cvs;
  }

  // 7. 동물 NPC 스프라이트
  function generateAnimalNPCSprite(type) {
    const { cvs, ctx } = createCanvas(32, 48);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(16, 44, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

    let bodyColor = '#d97706';
    let earEmoji = '🐻';

    if (type === 'rabbit') { bodyColor = '#fbcfe8'; earEmoji = '🐰'; }
    if (type === 'cat') { bodyColor = '#fdba74'; earEmoji = '🐱'; }
    if (type === 'panda') { bodyColor = '#ffffff'; earEmoji = '🐼'; }
    if (type === 'fox') { bodyColor = '#ea580c'; earEmoji = '🦊'; }

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(8, 24, 16, 14);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(9, 38, 5, 5);
    ctx.fillRect(18, 38, 5, 5);

    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.arc(16, 16, 10, 0, Math.PI * 2); ctx.fill();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(earEmoji, 16, 15);

    return cvs;
  }

  // 8. 캐릭터 장착 아이템 오버레이 (날개, 킥보드, 아우라)
  function generateEquipOverlay(type) {
    if (type === 'wings_angel') {
      const { cvs, ctx } = createCanvas(48, 32);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(12, 16, 10, 6, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(36, 16, 10, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 1; ctx.stroke();
      return cvs;
    } else if (type === 'mount_kickboard') {
      const { cvs, ctx } = createCanvas(36, 18);
      ctx.fillStyle = '#06b6d4'; ctx.fillRect(2, 8, 32, 4);
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.arc(6, 12, 3, 0, Math.PI * 2); ctx.arc(30, 12, 3, 0, Math.PI * 2); ctx.fill();
      return cvs;
    }
    return createCanvas(16, 16).cvs;
  }

  return {
    generateTileset,
    generateCharacterSpritesheet,
    generateBuildingSprite,
    generateAmusementSprite,
    generateWaterparkSprite,
    generateCampingSprite,
    generateAnimalNPCSprite,
    generateEquipOverlay,
    generateTreeSprite: (isPink) => {
      const { cvs, ctx } = createCanvas(64, 80);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(32, 74, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350f'; ctx.fillRect(26, 44, 12, 30);
      const color = isPink ? '#f472b6' : '#4ade80';
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(32, 32, 22, 0, Math.PI * 2); ctx.arc(22, 26, 14, 0, Math.PI * 2); ctx.arc(42, 26, 14, 0, Math.PI * 2); ctx.fill();
      return cvs;
    },
    generateFountainSprite: () => {
      const { cvs, ctx } = createCanvas(64, 64);
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.ellipse(32, 42, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(32, 40, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(28, 20, 8, 20);
      ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(32, 10, 6, 0, Math.PI * 2); ctx.fill();
      return cvs;
    },
    generatePropSprite: (type) => {
      const { cvs, ctx } = createCanvas(32, 48);
      if (type === 'lamp') {
        ctx.fillStyle = '#334155'; ctx.fillRect(14, 12, 4, 34);
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(16, 12, 7, 0, Math.PI * 2); ctx.fill();
      } else if (type === 'bench') {
        ctx.fillStyle = '#a16207'; ctx.fillRect(4, 24, 24, 6);
        ctx.fillStyle = '#334155'; ctx.fillRect(6, 30, 3, 10); ctx.fillRect(23, 30, 3, 10);
      } else if (type === 'mailbox') {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(8, 16, 16, 18);
        ctx.fillStyle = '#78350f'; ctx.fillRect(14, 34, 4, 12);
      }
      return cvs;
    }
  };
})();
