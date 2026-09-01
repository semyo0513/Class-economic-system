// ============================================================
// 싸이월드 감성 사선(Isometric 2.5D) 미니룸 & 기숙사 타운 시스템 (js/miniroom.js)
// 메인룸 에셋(images.jpg) 배경, 방꾸미기 실사 소품 PNG 28종, 캐릭터 아바타,
// 파도타기(랜덤 방문), Today/Total 카운터, BGM 쥬크박스, 일촌평&방명록, 좋아요(❤️)
// ============================================================

const MiniroomSystem = (() => {
  let currentRoomOwner = null;
  let isEditing = false;
  let draggingItemIdx = null;
  let dragOffset = { x: 0, y: 0 };
  let currentBgmAudio = null;
  let currentFilter = 'all'; // 'all', 'top', 'search'
  let searchQuery = '';

  // 기본 싸이월드 감성 미니룸 템플릿 (기본 빈 룸 - 소품은 상점에서 구매하여 배치)
  const DEFAULT_ROOM = {
    wallpaper: 'wp_main_pink',
    floor: 'fl_check_tile',
    statusMsg: '나만의 아늑한 2.5D 미니룸에 오신 것을 환영합니다! 🌸',
    feeling: 'happy', // happy, study, rest, rich, love
    bgm: 'bgm_retro_cyworld',
    todayCount: 1,
    totalCount: 1,
    lastVisitedDate: '',
    likes: 0,
    likedBy: [],
    inventory: {},
    items: [],
    guestbook: []
  };

  const FEELING_MAP = {
    happy: { emoji: '🥰', text: '행복만땅' },
    study: { emoji: '📖', text: '열공모드' },
    rest:  { emoji: '☕', text: '힐링휴식' },
    rich:  { emoji: '💰', text: '부자되는중' },
    love:  { emoji: '💖', text: '두근두근' },
    '🟢 좋음': { emoji: '🥰', text: '행복만땅' },
    '🟡 보통': { emoji: '☕', text: '힐링휴식' },
    '🔴 힘듦': { emoji: '💚', text: '마음치유' }
  };

  function getRoomData(studentName) {
    const key = `classbank_room_${studentName}`;
    const local = localStorage.getItem(key);
    let room = null;
    if (local) {
      try {
        room = JSON.parse(local);
      } catch (_) {}
    }
    if (!room) {
      room = JSON.parse(JSON.stringify(DEFAULT_ROOM));
    }
    if (!room.inventory) room.inventory = { ...DEFAULT_ROOM.inventory };
    if (!room.items) room.items = [...DEFAULT_ROOM.items];
    if (!room.guestbook) room.guestbook = [...DEFAULT_ROOM.guestbook];
    if (room.likes === undefined) room.likes = 0;
    if (room.todayCount === undefined) room.todayCount = 1;
    if (room.totalCount === undefined) room.totalCount = 1;
    if (!room.feeling) room.feeling = 'happy';
    if (!room.bgm) room.bgm = 'bgm_retro_cyworld';

    // 오늘 첫 방문자 카운트 계산
    const todayStr = new Date().toISOString().slice(0, 10);
    if (room.lastVisitedDate !== todayStr) {
      room.lastVisitedDate = todayStr;
      room.todayCount = 1;
      room.totalCount = (room.totalCount || 0) + 1;
      saveRoomData(studentName, room, false);
    }
    return room;
  }

  function saveRoomData(studentName, data, notifyApi = true) {
    const key = `classbank_room_${studentName}`;
    localStorage.setItem(key, JSON.stringify(data));
    if (notifyApi) {
      API.call('saveRoomData', { name: studentName, roomData: data }, true);
    }
    if (window.Realtime && window.Realtime.saveRoom) {
      window.Realtime.saveRoom(studentName, data);
    }
  }

  // 1. 학생 기숙사 타운 허브 뷰
  function renderDormitoryList(container) {
    if (!container) return;
    try {
      const me = GameState.student ? (GameState.student.name || GameState.student.이름 || '나') : '나';
      let students = (GameState.rankingList && GameState.rankingList.length > 0)
        ? [...GameState.rankingList]
        : [
            { name: me, job: '학생' },
            { name: '김현주', job: '문화체육부 장관' },
            { name: '이하진', job: '대통령(반장)' },
            { name: '정수빈', job: '은행원' },
            { name: '서언', job: '국세청장' },
            { name: '고설아', job: '환경부 장관' },
            { name: '강민준', job: '증권사 대표' },
            { name: '윤지우', job: '방송국 PD' }
          ];

      // 중복 제거 및 이름 정제
      const seen = new Set();
      students = students.map(s => typeof s === 'string' ? { name: s, job: '학생' } : s).filter(s => {
        const sName = s.name || s.이름;
        if (!sName || seen.has(sName)) return false;
        seen.add(sName);
        return true;
      });

      // 필터링 및 검색 적용
      let filtered = students;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(s => (s.name || s.이름 || '').toLowerCase().includes(q) || (s.job || s.직업명 || '').toLowerCase().includes(q));
      }
      if (currentFilter === 'top') {
        filtered = [...filtered].sort((a, b) => {
          const aName = a.name || a.이름;
          const bName = b.name || b.이름;
          const rA = getRoomData(aName);
          const rB = getRoomData(bName);
          return (rB.likes || 0) - (rA.likes || 0);
        });
      }

      const myRoom = getRoomData(me);

      let html = `
        <div class="dorm-hub-wrap" style="display:flex; flex-direction:column; gap:10px;">
          <!-- 상단 헤더 배너 -->
          <div class="dorm-header" style="background:linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%); border:3px solid #f472b6; padding:12px 16px; border-radius:12px; box-shadow:0 4px 12px rgba(244,114,182,0.25); text-align:center; position:relative; overflow:hidden;">
            <div style="position:absolute; top:-10px; right:-10px; font-size:48px; opacity:0.25;">🌸</div>
            <div class="dorm-title" style="font-size:18px; font-weight:900; color:#9d174d; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>🏡</span> 싸이월드 감성 학생 기숙사 미니룸 타운 <span>✨</span>
            </div>
            <div class="dorm-subtitle" style="font-size:11px; color:#be185d; margin-top:3px;">
              친구들의 2.5D 미니룸을 구경하고, 파도타기(랜덤 방문) & 일촌평(방명록) & 좋아요(❤️)를 남겨보세요!
            </div>
          </div>

          <!-- 빠른 작업 바 (내 방 바로가기 + 파도타기 버튼) -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <button class="pixel-btn-primary" style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-color:#1d4ed8; padding:10px 14px; font-size:13px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="MiniroomSystem.openRoom('${me}')">
              <span>🛋️</span> <strong>내 미니룸 꾸미기</strong>
              <span style="background:rgba(255,255,255,0.25); font-size:10px; padding:2px 6px; border-radius:10px;">❤️ ${myRoom.likes || 0}</span>
            </button>

            <button class="pixel-btn-primary" style="background:linear-gradient(135deg, #ec4899 0%, #db2777 100%); border-color:#9d174d; padding:10px 14px; font-size:13px; display:flex; align-items:center; justify-content:center; gap:8px; animation:pulse 2s infinite;" onclick="MiniroomSystem.surfRandomRoom()">
              <span>🏄‍♂️</span> <strong>파도타기 (랜덤 방문)</strong>
            </button>
          </div>

          <!-- 검색 및 탭 필터 -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:8px;">
            <div style="display:flex; gap:4px;">
              <button class="tab-btn ${currentFilter === 'all' ? 'active' : ''}" style="padding:4px 10px; font-size:11px;" onclick="MiniroomSystem.setFilter('all')">전체 기숙사</button>
              <button class="tab-btn ${currentFilter === 'top' ? 'active' : ''}" style="padding:4px 10px; font-size:11px;" onclick="MiniroomSystem.setFilter('top')">🏆 인기 랭킹순</button>
            </div>
            <div style="display:flex; gap:4px; flex:1; max-width:200px;">
              <input type="text" id="dorm-search-input" placeholder="친구 이름 검색..." value="${searchQuery}" oninput="MiniroomSystem.handleSearch(this.value)" style="width:100%; padding:4px 8px; font-size:11px; border:1px solid #94a3b8; border-radius:6px; background:#ffffff;">
            </div>
          </div>

          <!-- 기숙사 카드 그리드 -->
          <div class="dorm-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; max-height:260px; overflow-y:auto; padding-right:2px;">
            ${filtered.length === 0 ? '<div style="grid-column:1/3; text-align:center; padding:20px; color:#94a3b8; font-size:12px;">검색된 학생 기숙사 미니룸이 없습니다.</div>' : ''}
            ${filtered.map((s, idx) => {
              const sName = s.name || s.이름 || '학생';
              const sJob = s.job || s.직업명 || '학생';
              const room = getRoomData(sName);
              const isMy = sName === me;
              const feelObj = FEELING_MAP[room.feeling] || FEELING_MAP.happy;
              const feelEmoji = (feelObj && feelObj.emoji) || '🥰';
              return `
                <div class="dorm-card" style="background:#ffffff; border:2px solid ${isMy ? '#3b82f6' : '#e2e8f0'}; border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.15s ease; box-shadow:0 2px 4px rgba(0,0,0,0.04);" onclick="MiniroomSystem.openRoom('${sName}')" onmouseover="this.style.borderColor='#f472b6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='${isMy ? '#3b82f6' : '#e2e8f0'}'; this.style.transform='translateY(0)'">
                  <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <div style="font-size:26px; min-width:32px; text-align:center;">${isMy ? '👑' : feelEmoji}</div>
                    <div style="overflow:hidden;">
                      <div style="font-weight:bold; font-size:12px; color:#1e293b; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                        <span style="overflow:hidden; text-overflow:ellipsis;">${sName}</span>
                        ${isMy ? '<span class="badge badge-primary" style="font-size:9px; padding:1px 4px;">내 방</span>' : ''}
                        ${currentFilter === 'top' && idx < 3 ? `<span style="font-size:10px;">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>` : ''}
                      </div>
                      <div style="font-size:10px; color:#64748b; margin-top:2px;">
                        ${sJob} · <span style="color:#ef4444; font-weight:bold;">❤️ ${room.likes || 0}</span> · <span style="color:#3b82f6;">💬 ${(room.guestbook || []).length}</span>
                      </div>
                      <div style="font-size:9px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; margin-top:1px;">
                        "${room.statusMsg || '행복한 하루 되세요!'}"
                      </div>
                    </div>
                  </div>
                  <button class="pixel-btn-sm" style="width:auto; padding:4px 8px; font-size:10px; ${isMy ? 'background:#3b82f6;' : 'background:#f472b6;'} white-space:nowrap;">
                    방문 🚪
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      console.error('[renderDormitoryList error]', err);
      container.innerHTML = `
        <div style="padding:20px; text-align:center;">
          <h3>🏡 학생 기숙사</h3>
          <p style="color:#64748b; font-size:12px;">기숙사 목록을 불러오는 중 오류가 발생했습니다.</p>
          <button class="pixel-btn-primary" onclick="MiniroomSystem.openRoom('${GameState.student?.name || '나'}')">내 미니룸 바로가기</button>
        </div>
      `;
    }
  }

  // 2. 싸이월드 미니룸 스테이지 렌더링
  function openRoom(ownerName, keepEditState = false) {
    currentRoomOwner = ownerName;
    if (!keepEditState) isEditing = false;
    draggingItemIdx = null;

    const st = GameState.student;
    const myName = st ? (st.name || st.이름) : '';
    const isMe = myName === ownerName;
    const room = getRoomData(ownerName);
    const modalBody = document.getElementById('modal-body');
    if (!modalBody) return;

    const feel = FEELING_MAP[room.feeling || 'happy'] || FEELING_MAP.happy;
    const bgmDef = CONFIG.BGM_PLAYLIST.find(b => b.id === room.bgm) || CONFIG.BGM_PLAYLIST[0];

    let html = `
      <div class="miniroom-container" style="display:flex; flex-direction:column; gap:8px;">
        <!-- 상단 미니룸 타이틀 & 네비게이션 바 -->
        <div class="miniroom-header-bar" style="background:#ffffff; border:2px solid #cbd5e1; border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="pixel-btn-secondary" style="width:auto; padding:4px 10px; font-size:11px;" onclick="MiniroomSystem.backToList()">⬅️ 기숙사 목록</button>
            <button class="pixel-btn-primary" style="background:#ec4899; width:auto; padding:4px 10px; font-size:11px;" onclick="MiniroomSystem.surfRandomRoom()">🏄‍♂️ 파도타기</button>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <!-- Today / Total 카운터 배너 -->
            <div style="background:#f1f5f9; border:1px solid #cbd5e1; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:bold; color:#475569;">
              <span style="color:#ef4444;">TODAY</span> <span id="room-today-val">${room.todayCount || 1}</span> | <span>TOTAL</span> <span id="room-total-val">${room.totalCount || 1}</span>
            </div>

            <!-- 좋아요(❤️) 버튼 -->
            <button id="room-likes-btn" onclick="MiniroomSystem.likeRoom('${ownerName}')" style="cursor:pointer; background:#fee2e2; border:2px solid #f87171; padding:3px 10px; border-radius:8px; font-size:12px; font-weight:bold; color:#dc2626; display:flex; align-items:center; gap:4px; transition:transform 0.1s;">
              ❤️ <span id="room-likes-count">${room.likes || 0}</span>
            </button>

            ${isMe ? `
              <button class="pixel-btn-primary" id="edit-room-toggle-btn" style="width:auto; padding:4px 12px; font-size:11px; background:${isEditing ? '#16a34a' : '#8b5cf6'};" onclick="MiniroomSystem.toggleEditMode()">
                ${isEditing ? '💾 저장 완료' : '🎨 방 꾸미기'}
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 룸 오너 정보 & BGM & 기분 상태 바 -->
        <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1px solid #bfdbfe; padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; font-size:11px; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:6px; font-weight:bold; color:#1e40af;">
            <span>🏠 <strong>${ownerName}</strong> 님의 미니룸</span>
            <span style="background:#ffffff; border:1px solid #93c5fd; padding:1px 6px; border-radius:10px; font-size:10px; color:#2563eb;">
              ${feel.emoji} ${feel.text}
            </span>
          </div>

          <!-- BGM 표시 & 쥬크박스 변경 -->
          <div style="display:flex; align-items:center; gap:4px; color:#475569; font-size:11px;">
            <span style="animation:bounce 1.5s infinite;">🎵</span>
            <span style="font-weight:bold; color:#334155;">${bgmDef.title}</span>
            ${isMe ? `
              <select onchange="MiniroomSystem.changeBgm(this.value)" style="padding:2px 4px; font-size:10px; border:1px solid #94a3b8; border-radius:4px; background:#fff; outline:none; margin-left:4px;">
                ${CONFIG.BGM_PLAYLIST.map(b => `<option value="${b.id}" ${b.id === room.bgm ? 'selected' : ''}>${b.title}</option>`).join('')}
              </select>
            ` : ''}
          </div>
        </div>

        <!-- 한 줄 상태 메시지 & 다이어리 -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:5px 10px; border-radius:6px; font-size:11px; display:flex; align-items:center; gap:6px;">
          <span style="font-weight:bold; color:#ec4899; white-space:nowrap;">💬 Diary:</span>
          ${isMe ? `
            <input type="text" id="status-msg-input" value="${room.statusMsg || ''}" placeholder="오늘의 기분이나 한 줄 일기를 적어보세요!" onchange="MiniroomSystem.updateStatusMsg(this.value)" style="flex:1; padding:3px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; background:#ffffff;">
            <select onchange="MiniroomSystem.changeFeeling(this.value)" style="padding:2px 4px; font-size:10px; border:1px solid #cbd5e1; border-radius:4px; background:#fff;">
              <option value="happy" ${room.feeling === 'happy' ? 'selected' : ''}>🥰 행복만땅</option>
              <option value="study" ${room.feeling === 'study' ? 'selected' : ''}>📖 열공모드</option>
              <option value="rest"  ${room.feeling === 'rest' ? 'selected' : ''}>☕ 힐링휴식</option>
              <option value="rich"  ${room.feeling === 'rich' ? 'selected' : ''}>💰 부자되는중</option>
              <option value="love"  ${room.feeling === 'love' ? 'selected' : ''}>💖 두근두근</option>
            </select>
          ` : `
            <span style="color:#334155; font-style:italic;">"${room.statusMsg || '포근하고 행복한 하루 되세요! 🌸'}"</span>
          `}
        </div>

        <!-- 편집 모드 안내 가이드 -->
        <div id="drag-guide-msg" style="display:${isEditing ? 'block' : 'none'}; font-size:11px; color:#b45309; background:#fef3c7; border:1px solid #fcd34d; padding:4px 8px; border-radius:6px; text-align:center;">
          💡 소품을 마우스나 터치로 드래그하여 원하는 위치에 배치하세요! [🔄 반전] [✕ 회수]
        </div>

        <!-- 🌟 싸이월드 기본룸 에셋(mini-room-default.jpg) 기반 고품격 2.5D 미니룸 스테이지 🌟 -->
        <div class="miniroom-stage-wrap" style="position:relative; width:100%; max-width:512px; height:320px; margin:0 auto; border:4px solid #f472b6; border-radius:12px; overflow:hidden; background:#ffd1dc; box-shadow:inset 0 0 15px rgba(244,114,182,0.3), 0 8px 18px rgba(0,0,0,0.12);">
          <div class="miniroom-stage" id="miniroom-stage"
               style="position:relative; width:100%; height:100%; overflow:hidden; background-image:url('assets/메인룸 에셋/mini-room-default.jpg'); background-size:100% 100%; background-position:center; background-repeat:no-repeat; image-rendering:pixelated;"
               onmousemove="MiniroomSystem.onStageMouseMove(event)"
               onmouseup="MiniroomSystem.onStageMouseUp(event)"
               ontouchmove="MiniroomSystem.onStageTouchMove(event)"
               ontouchend="MiniroomSystem.onStageTouchEnd(event)">

            <!-- 1. 은은한 창문 햇살 효과 오버레이 -->
            <div style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; background:linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%); z-index:10;"></div>

            <!-- 2. 가구 & 소품 오브젝트 레이어 (Z-Index 기반 깊이감 렌더링) -->
            <div class="miniroom-objects-layer" id="miniroom-objects-layer">
              ${renderPlacedObjects(room.items || [])}
            </div>

            <!-- 3. 주인 아바타 미니미 (싸이월드 스타일 커스텀 캐릭터) -->
            <div class="miniroom-avatar" id="miniroom-avatar" style="position:absolute; left: 225px; top: 155px; pointer-events:none; text-align:center; z-index:215; filter:drop-shadow(0 6px 10px rgba(0,0,0,0.35)); transition:transform 0.2s;">
              <!-- 칭호 및 이름 뱃지 -->
              <div style="font-size:10px; font-weight:bold; background:rgba(15, 23, 42, 0.88); color:#fef08a; padding:2px 10px; border-radius:12px; border:1px solid #fbbf24; margin-bottom:4px; white-space:nowrap; display:inline-block; box-shadow:0 2px 4px rgba(0,0,0,0.3);">
                ${ownerName}
              </div>
              <!-- 아바타 캐릭터 비주얼 (풀 커스터마이징 픽셀 아바타) -->
              <div>
                ${getAvatarElement(ownerName)}
              </div>
            </div>

            <!-- 하트 파티클 컨테이너 -->
            <div id="heart-particle-container" style="position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:9999;"></div>
          </div>
        </div>

        <!-- 방 꾸미기 소품 인벤토리 팔레트 (편집 모드 시 노출) -->
        <div class="miniroom-edit-palette" id="miniroom-edit-palette" style="display: ${isEditing ? 'block' : 'none'}; background:#f8fafc; border:2px solid #cbd5e1; border-radius:10px; padding:10px; margin-top:2px;">
          <div class="palette-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <span style="font-size:12px; font-weight:bold; color:#1e293b;">📦 방꾸미기 소품 팔레트 (클릭하여 방에 추가/구매)</span>
            <div style="display:flex; gap:6px;">
              <button class="pixel-btn-sm" style="background:#ec4899; color:#fff; font-size:11px;" onclick="ModalManager.open('shop')">🛍️ 소품 상점 가기</button>
              <button class="pixel-btn-sm" style="background:#16a34a; font-size:11px;" onclick="MiniroomSystem.saveLayout()">💾 저장 완료</button>
            </div>
          </div>
          <div class="palette-items" id="palette-items-list" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; max-height:170px; overflow-y:auto;">
            ${renderPaletteItems(room)}
          </div>
        </div>

        <!-- 방명록 & 일촌평 섹션 -->
        <div class="miniroom-guestbook-section" style="margin-top:4px; border-top:2px solid #e2e8f0; padding-top:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-weight:bold; font-size:12px; color:#334155;">
              📝 일촌평 & 방명록 (<span id="gb-count">${(room.guestbook || []).length}</span>)
            </span>
            <!-- 스티커 퀵 셀렉터 -->
            <div style="display:flex; gap:3px; align-items:center;">
              <span style="font-size:10px; color:#64748b;">스티커:</span>
              ${['🌸', '💖', '⭐', '💌', '🎉', '🍪'].map(stk => `
                <button onclick="MiniroomSystem.insertSticker('${stk}')" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; padding:1px 4px; cursor:pointer;">${stk}</button>
              `).join('')}
            </div>
          </div>

          <div class="guestbook-input-wrap" style="display:flex; gap:6px; margin-bottom:8px;">
            <input type="text" id="guestbook-msg-input" placeholder="친구에게 따뜻한 일촌평을 남겨주세요!" style="flex:1; padding:6px 10px; border:2px solid #94a3b8; border-radius:6px; font-size:11px; background:#fff;" onkeydown="if(event.key==='Enter') MiniroomSystem.addGuestbook()">
            <button class="pixel-btn-primary" style="width:auto; padding:6px 14px; font-size:11px;" onclick="MiniroomSystem.addGuestbook()">등록</button>
          </div>

          <div class="guestbook-list" id="guestbook-list" style="max-height:130px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
            ${renderGuestbookList(room.guestbook || [])}
          </div>
        </div>
      </div>
    `;

    modalBody.innerHTML = html;
  }

  function getAvatarElement(ownerName) {
    const st = GameState.student;
    const isMe = st && (st.name === ownerName || st.이름 === ownerName);
    let style = isMe ? (GameState.characterStyle || {}) : {};
    if (!style || Object.keys(style).length === 0) {
      try {
        const saved = localStorage.getItem(`char_style_${ownerName}`);
        if (saved) style = JSON.parse(saved);
      } catch (_) {}
    }

    if (typeof AssetGenerator !== 'undefined' && AssetGenerator.generateSingleAvatarDataUrl) {
      const dataUrl = AssetGenerator.generateSingleAvatarDataUrl(style);
      return `<img src="${dataUrl}" style="width:64px; height:96px; image-rendering:pixelated; pointer-events:none; filter:drop-shadow(0 6px 10px rgba(0,0,0,0.35)); animation: miniroomAvatarFloat 2.4s ease-in-out infinite;">`;
    }

    return `<div style="font-size:42px;">${getAvatarEmoji(ownerName)}</div>`;
  }

  function getAvatarEmoji(name) {
    const st = GameState.student;
    const isMe = st && (st.name === name || st.이름 === name);
    const style = isMe ? (GameState.characterStyle || {}) : {};
    const costume = style.costume || 'default';
    if (costume === 'school') return '🧑‍🎓';
    if (costume === 'magic') return '🧙';
    if (costume === 'dress') return '👸';
    if (costume === 'cyber') return '⚡';
    if (costume === 'pajama') return '🧸';
    return '🚶‍♂️';
  }

  // 3. 배치된 오브젝트 렌더링 (실사 PNG 에셋 & 자유 크기 조절 Scale 지원)
  function renderPlacedObjects(items) {
    const canDrag = isEditing;

    return items.map((it, idx) => {
      const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === it.id);
      if (!def) return '';
      const left = it.x !== undefined ? it.x : 100;
      const top = it.y !== undefined ? it.y : 100;
      const scale = (it.scale !== undefined && it.scale > 0) ? it.scale : 1.0;
      const flipScale = it.flip ? -scale : scale;
      const baseW = def.w || (def.type === 'prop' ? 45 : 70);
      const baseH = def.h || (def.type === 'prop' ? 45 : 70);

      return `
        <div class="placed-furniture ${canDrag ? 'editable-furniture' : ''}"
             id="furn_${idx}"
             style="position:absolute; left: ${left}px; top: ${top}px; width:${baseW}px; height:${baseH}px; cursor:${canDrag ? 'grab' : 'default'}; user-select:none; z-index:${Math.floor(top + 30)}; filter:drop-shadow(0 6px 8px rgba(0,0,0,0.3)); display:flex; align-items:center; justify-content:center; touch-action:none;"
             ${canDrag ? `onmousedown="MiniroomSystem.startDrag(event, ${idx})" ontouchstart="MiniroomSystem.startTouchDrag(event, ${idx})"` : ''}
             title="${def.name}">
          ${def.image ? `
            <img src="${def.image}" draggable="false" style="width:100%; height:100%; object-fit:contain; transform: scaleX(${flipScale}) scaleY(${scale}); pointer-events:none; image-rendering:pixelated; -webkit-user-drag:none;">
          ` : `
            <div style="font-size:${def.type === 'prop' ? '30px' : '42px'}; transform: scaleX(${flipScale}) scaleY(${scale}); pointer-events:none;">${def.emoji}</div>
          `}
          ${canDrag ? `
            <div class="furn-control-btns" style="position:absolute; top:-16px; right:-16px; display:flex; gap:3px; z-index:9999; background:rgba(15,23,42,0.92); padding:3px 6px; border-radius:12px; border:1px solid #94a3b8; box-shadow:0 4px 8px rgba(0,0,0,0.45);">
              <span class="furn-ctrl-btn" style="color:#38bdf8; font-size:11px; font-weight:bold; cursor:pointer; padding:0 3px;" onclick="event.stopPropagation(); MiniroomSystem.scaleFurniture(${idx}, 0.25)" title="크기 대폭 확대 (최대 5배)">🔍+</span>
              <span class="furn-ctrl-btn" style="color:#fbbf24; font-size:11px; font-weight:bold; cursor:pointer; padding:0 3px;" onclick="event.stopPropagation(); MiniroomSystem.scaleFurniture(${idx}, -0.25)" title="크기 축소">🔍-</span>
              <span class="furn-ctrl-btn" style="color:#a855f7; font-size:11px; cursor:pointer; padding:0 3px;" onclick="event.stopPropagation(); MiniroomSystem.flipFurniture(${idx})" title="좌우 반전">🔄</span>
              <span class="furn-ctrl-btn" style="color:#f87171; font-size:11px; font-weight:bold; cursor:pointer; padding:0 3px;" onclick="event.stopPropagation(); MiniroomSystem.removeFurniture(${idx})" title="회수 (보관함으로)">✕</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // 4. 인벤토리 팔레트 아이템 리스트
  function renderPaletteItems(room) {
    const inv = room.inventory || {};
    const placedCounts = {};
    (room.items || []).forEach(it => {
      placedCounts[it.id] = (placedCounts[it.id] || 0) + 1;
    });

    return CONFIG.FURNITURE_CATALOG.filter(f => f.type !== 'wallpaper' && f.type !== 'floor').map(f => {
      const owned = inv[f.id] || 0;
      const placed = placedCounts[f.id] || 0;
      const remaining = Math.max(0, owned - placed);
      const isAvailable = remaining > 0;

      return `
        <div class="palette-card"
             style="background:#fff; border:2px solid ${isAvailable ? '#86efac' : '#cbd5e1'}; border-radius:8px; padding:6px; text-align:center; opacity: ${isAvailable ? '1' : '0.85'}; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:space-between; transition:transform 0.1s;"
             onclick="${isAvailable ? `MiniroomSystem.addFurnitureToRoom('${f.id}')` : `MiniroomSystem.promptBuyInPalette('${f.id}', ${f.price}, '${f.name}')`}"
             title="${f.name}">
          <div style="width:42px; height:42px; display:flex; align-items:center; justify-content:center;">
            ${f.image ? `<img src="${f.image}" style="max-width:100%; max-height:100%; object-fit:contain;">` : `<span style="font-size:24px;">${f.emoji}</span>`}
          </div>
          <div style="font-size:10px; font-weight:bold; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#1e293b;">${f.name}</div>
          <div style="font-size:9px; font-weight:bold; color:${isAvailable ? '#15803d' : '#0284c7'}; margin-top:1px;">
            ${isAvailable ? `남음: ${remaining}개` : `💰 ${f.price.toLocaleString()}원`}
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. 드래그 앤 드롭 시스템 (방꾸미기 편집 모드 활성화 시에만 동작)
  function startDrag(e, idx) {
    if (!isEditing) return;

    e.preventDefault();
    e.stopPropagation();
    draggingItemIdx = idx;

    const el = document.getElementById(`furn_${idx}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      el.style.cursor = 'grabbing';
      el.style.zIndex = '9999';
    }

    window.removeEventListener('mousemove', onStageMouseMove);
    window.removeEventListener('mouseup', onStageMouseUp);
    window.addEventListener('mousemove', onStageMouseMove);
    window.addEventListener('mouseup', onStageMouseUp);
  }

  function startTouchDrag(e, idx) {
    if (!isEditing) return;

    if (e.touches && e.touches[0]) {
      e.preventDefault();
      e.stopPropagation();
      draggingItemIdx = idx;
      const touch = e.touches[0];
      const el = document.getElementById(`furn_${idx}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;
        el.style.zIndex = '9999';
      }

      window.removeEventListener('touchmove', onStageTouchMove);
      window.removeEventListener('touchend', onStageTouchEnd);
      window.addEventListener('touchmove', onStageTouchMove, { passive: false });
      window.addEventListener('touchend', onStageTouchEnd);
    }
  }

  function onStageMouseMove(e) {
    if (draggingItemIdx === null) return;
    e.preventDefault();
    moveItemTo(e.clientX, e.clientY);
  }

  function onStageTouchMove(e) {
    if (draggingItemIdx === null) return;
    if (e.touches && e.touches[0]) {
      e.preventDefault();
      moveItemTo(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function moveItemTo(clientX, clientY) {
    const stage = document.getElementById('miniroom-stage');
    if (!stage || draggingItemIdx === null) return;
    const rect = stage.getBoundingClientRect();

    let x = clientX - rect.left - dragOffset.x;
    let y = clientY - rect.top - dragOffset.y;

    const el = document.getElementById(`furn_${draggingItemIdx}`);
    if (el) {
      const elW = el.offsetWidth || 50;
      const elH = el.offsetHeight || 50;
      x = Math.max(0, Math.min(rect.width - elW, x));
      y = Math.max(0, Math.min(rect.height - elH, y));

      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
    }
  }

  function onStageMouseUp() { finishDrag(); }
  function onStageTouchEnd() { finishDrag(); }

  function finishDrag() {
    window.removeEventListener('mousemove', onStageMouseMove);
    window.removeEventListener('mouseup', onStageMouseUp);
    window.removeEventListener('touchmove', onStageTouchMove);
    window.removeEventListener('touchend', onStageTouchEnd);

    if (draggingItemIdx === null) return;
    const el = document.getElementById(`furn_${draggingItemIdx}`);
    if (el && currentRoomOwner) {
      el.style.cursor = 'grab';
      const top = parseInt(el.style.top, 10) || 0;
      el.style.zIndex = `${Math.floor(top + 30)}`;

      const room = getRoomData(currentRoomOwner);
      if (room.items && room.items[draggingItemIdx]) {
        room.items[draggingItemIdx].x = parseInt(el.style.left, 10);
        room.items[draggingItemIdx].y = parseInt(el.style.top, 10);
        saveRoomData(currentRoomOwner, room);
      }
    }
    draggingItemIdx = null;
  }

  // 6. 방명록 목록 렌더링
  function renderGuestbookList(list) {
    if (!list || list.length === 0) {
      return '<div style="text-align:center; padding:16px; color:#94a3b8; font-size:11px;">아직 일촌평이 없습니다. 첫 따뜻한 메시지를 남겨보세요! 🌸</div>';
    }
    const me = GameState.student ? (GameState.student.name || GameState.student.이름 || '') : '';
    const isRoomOwner = currentRoomOwner === me;

    return list.map((item, idx) => `
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:11px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:14px;">${item.sticker || '💬'}</span>
            <strong style="color:#1e40af;">${item.author}</strong>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:#94a3b8; font-size:10px;">${item.date}</span>
            ${(isRoomOwner || item.author === me) ? `
              <button onclick="MiniroomSystem.deleteGuestbook(${idx})" style="background:none; border:none; color:#ef4444; font-size:10px; cursor:pointer;" title="삭제">✕</button>
            ` : ''}
          </div>
        </div>
        <div style="color:#334155; line-height:1.4; padding-left:18px;">${item.msg}</div>
      </div>
    `).join('');
  }

  // 7. 하트 파티클 애니메이션
  function spawnHeartEffect() {
    const container = document.getElementById('heart-particle-container');
    if (!container) return;
    for (let i = 0; i < 7; i++) {
      const heart = document.createElement('div');
      heart.textContent = '❤️';
      heart.style.position = 'absolute';
      heart.style.left = `${120 + Math.random() * 80}px`;
      heart.style.bottom = '40px';
      heart.style.fontSize = `${16 + Math.random() * 16}px`;
      heart.style.transition = 'all 1s ease-out';
      heart.style.opacity = '1';
      container.appendChild(heart);

      setTimeout(() => {
        heart.style.transform = `translate(${(Math.random() - 0.5) * 120}px, -${100 + Math.random() * 100}px) scale(1.4)`;
        heart.style.opacity = '0';
      }, 20);

      setTimeout(() => heart.remove(), 1100);
    }
  }

  return {
    renderDormitoryList,
    openRoom,
    backToList: () => {
      const modalBody = document.getElementById('modal-body');
      if (modalBody) renderDormitoryList(modalBody);
      SoundEngine.click();
    },
    setFilter: (f) => {
      currentFilter = f;
      const modalBody = document.getElementById('modal-body');
      if (modalBody) renderDormitoryList(modalBody);
      SoundEngine.click();
    },
    handleSearch: (val) => {
      searchQuery = val;
      const modalBody = document.getElementById('modal-body');
      if (modalBody) renderDormitoryList(modalBody);
    },
    surfRandomRoom: () => {
      const me = GameState.student ? (GameState.student.name || GameState.student.이름 || '나') : '나';
      let list = (GameState.rankingList && GameState.rankingList.length > 0)
        ? GameState.rankingList.map(s => s.name)
        : [me, '김현주', '이하진', '정수빈', '서언', '고설아', '강민준', '윤지우'];
      list = list.filter(n => n && n !== currentRoomOwner);
      if (list.length === 0) list = [me];
      const target = list[Math.floor(Math.random() * list.length)];
      SoundEngine.coin();
      openRoom(target);
    },
    toggleEditMode: () => {
      isEditing = !isEditing;
      if (currentRoomOwner) openRoom(currentRoomOwner, true);
      SoundEngine.snap();
    },
    saveLayout: () => {
      isEditing = false;
      if (currentRoomOwner) openRoom(currentRoomOwner, false);
      SoundEngine.fanfare();
      alert('미니룸 인테리어가 성공적으로 저장되었습니다! ✨');
    },
    addFurnitureToRoom: (id) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === id);
      if (!def) return;

      if (!room.items) room.items = [];
      room.items.push({
        id,
        x: 100 + Math.floor(Math.random() * 80),
        y: 120 + Math.floor(Math.random() * 60),
        flip: false
      });
      saveRoomData(currentRoomOwner, room);
      openRoom(currentRoomOwner, true);
      SoundEngine.coin();
    },
    removeFurniture: (idx) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      if (room.items && room.items[idx]) {
        room.items.splice(idx, 1);
        saveRoomData(currentRoomOwner, room);
        openRoom(currentRoomOwner, true);
        SoundEngine.snap();
      }
    },
    flipFurniture: (idx) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      if (room.items && room.items[idx]) {
        room.items[idx].flip = !room.items[idx].flip;
        saveRoomData(currentRoomOwner, room);
        openRoom(currentRoomOwner, true);
        SoundEngine.snap();
      }
    },
    scaleFurniture: (idx, delta) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      if (room.items && room.items[idx]) {
        const cur = (room.items[idx].scale !== undefined && room.items[idx].scale > 0) ? room.items[idx].scale : 1.0;
        const next = Math.max(0.3, Math.min(5.0, parseFloat((cur + delta).toFixed(2))));
        room.items[idx].scale = next;
        saveRoomData(currentRoomOwner, room);
        openRoom(currentRoomOwner, true);
        SoundEngine.snap();
      }
    },
    likeRoom: (ownerName) => {
      const st = GameState.student;
      const myName = st ? (st.name || st.이름) : '익명';
      const room = getRoomData(ownerName);
      if (!room.likedBy) room.likedBy = [];
      if (room.likedBy.includes(myName)) return alert('이미 좋아요를 눌렀습니다! ❤️');

      room.likes = (room.likes || 0) + 1;
      room.likedBy.push(myName);
      saveRoomData(ownerName, room);
      const countEl = document.getElementById('room-likes-count');
      if (countEl) countEl.textContent = room.likes;
      spawnHeartEffect();
      SoundEngine.fanfare();
    },
    updateStatusMsg: (msg) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      room.statusMsg = msg;
      saveRoomData(currentRoomOwner, room);
    },
    changeFeeling: (feelKey) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      room.feeling = feelKey;
      saveRoomData(currentRoomOwner, room);
      openRoom(currentRoomOwner, isEditing);
    },
    changeBgm: (bgmId) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      room.bgm = bgmId;
      saveRoomData(currentRoomOwner, room);
      SoundEngine.coin();
      openRoom(currentRoomOwner, isEditing);
    },
    insertSticker: (stk) => {
      const input = document.getElementById('guestbook-msg-input');
      if (input) {
        input.value = `${stk} ${input.value}`;
        input.focus();
      }
    },
    addGuestbook: () => {
      const input = document.getElementById('guestbook-msg-input');
      if (!input || !input.value.trim() || !currentRoomOwner) return;
      const msg = input.value.trim();
      const st = GameState.student;
      const author = st ? (st.name || st.이름) : '익명';

      const room = getRoomData(currentRoomOwner);
      if (!room.guestbook) room.guestbook = [];
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const stickerMatch = msg.match(/^(\p{Extended_Pictographic})/u);
      const sticker = stickerMatch ? stickerMatch[1] : '💌';

      room.guestbook.unshift({ id: `gb_${Date.now()}`, author, sticker, msg, date: dateStr });
      saveRoomData(currentRoomOwner, room);
      openRoom(currentRoomOwner, isEditing);
      SoundEngine.coin();
    },
    deleteGuestbook: (idx) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      if (room.guestbook && room.guestbook[idx]) {
        room.guestbook.splice(idx, 1);
        saveRoomData(currentRoomOwner, room);
        openRoom(currentRoomOwner, isEditing);
        SoundEngine.snap();
      }
    },
    promptBuyInPalette: async (id, price, name) => {
      const ok = await AppDialog.confirm(`[${name}] 소품을 ${price.toLocaleString()}원에 구매하시겠습니까?`, '🛍️ 소품 구매');
      if (ok) {
        await ModalManager.buyFurniture(id, price, name);
        if (currentRoomOwner) openRoom(currentRoomOwner, true);
      }
    },
    addFurnitureToInventory: (studentName, itemId) => {
      const room = getRoomData(studentName);
      if (!room.inventory) room.inventory = {};
      room.inventory[itemId] = (room.inventory[itemId] || 0) + 1;
      saveRoomData(studentName, room);
      if (currentRoomOwner === studentName) {
        const pList = document.getElementById('palette-items-list');
        if (pList) pList.innerHTML = renderPaletteItems(room);
      }
    },
    getFurnitureInventory: (studentName) => {
      const room = getRoomData(studentName);
      return room.inventory || {};
    },
    startDrag,
    startTouchDrag,
    onStageMouseMove,
    onStageTouchMove,
    onStageMouseUp,
    onStageTouchEnd
  };
})();


