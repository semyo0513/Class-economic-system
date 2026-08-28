// ============================================================
// 싸이월드풍 미니룸 & 하우징 시스템 (js/miniroom.js)
// 방 꾸미기, 가구 인벤토리 수량 체크, 친구 방 방문, 방명록, 좋아요
// ============================================================

const MiniroomSystem = (() => {
  let currentRoomOwner = null;
  let isEditing = false;

  // 기본 방 템플릿
  const DEFAULT_ROOM = {
    wallpaper: 'wp_pastel_pink',
    floor: 'fl_wood_parquet',
    statusMsg: '어서오세요! 행복한 나의 방에 놀러오신 것을 환영해요 🌸',
    likes: 5,
    likedBy: [],
    inventory: {
      'fn_cozy_bed': 1,
      'fn_gaming_desk': 1,
      'fn_plant_pot': 1,
      'fn_teddy_bear': 1,
      'pet_shiba_dog': 1
    },
    items: [
      { id: 'fn_cozy_bed', x: 2, y: 3 },
      { id: 'fn_gaming_desk', x: 6, y: 3 },
      { id: 'fn_plant_pot', x: 1, y: 5 },
      { id: 'fn_teddy_bear', x: 4, y: 5 },
      { id: 'pet_shiba_dog', x: 7, y: 6 }
    ],
    guestbook: [
      { author: '선생님', msg: '방이 정말 아늑하고 멋지구나! 좋은 하루 보내렴 😊', date: '2026-08-28 09:00' }
    ]
  };

  // 로컬 저장소 캐시 및 동기화
  function getRoomData(studentName) {
    const key = `classbank_room_${studentName}`;
    const local = localStorage.getItem(key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (!parsed.inventory) parsed.inventory = { ...DEFAULT_ROOM.inventory };
        return parsed;
      } catch (_) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_ROOM));
  }

  function saveRoomData(studentName, data) {
    const key = `classbank_room_${studentName}`;
    localStorage.setItem(key, JSON.stringify(data));

    // GAS 백엔드에 백업 저장 (Google Sheets '미니룸' 시트)
    API.call('saveRoomData', { name: studentName, roomData: data }, true);

    // Firebase RTDB에도 동기화
    if (window.Realtime && window.Realtime.saveRoom) {
      window.Realtime.saveRoom(studentName, data);
    }
  }

  // 가구 구매 시 인벤토리에 추가
  function addFurnitureToInventory(studentName, furnitureId) {
    const room = getRoomData(studentName);
    if (!room.inventory) room.inventory = {};
    room.inventory[furnitureId] = (room.inventory[furnitureId] || 0) + 1;
    saveRoomData(studentName, room);
  }

  // 기숙사 메인 모달 렌더링 (호실 목록)
  async function renderDormitoryList(container) {
    const me = GameState.student ? (GameState.student.name || GameState.student.이름 || '나') : '나';
    
    // 시트에서 미니룸 데이터 가져오기 시도
    const cloudRes = await API.call('getRoomData', { name: me }, true);
    if (cloudRes && cloudRes.success && cloudRes.roomData) {
      localStorage.setItem(`classbank_room_${me}`, JSON.stringify(cloudRes.roomData));
    }

    const students = GameState.rankingList.length > 0
      ? GameState.rankingList
      : [
          { name: me, job: '학생' },
          { name: '김철수', job: '은행원' },
          { name: '이영희', job: '기자' },
          { name: '박민우', job: '환경미화' },
          { name: '최수진', job: '우체부' }
        ];

    let html = `
      <div class="dorm-header" style="background:#fffbeb; border:2px solid #fde68a; padding:12px; border-radius:10px; margin-bottom:14px; text-align:center;">
        <div class="dorm-title" style="font-size:18px; font-weight:bold; color:#b45309;">🏢 학생 기숙사 (싸이월드 미니룸 타운)</div>
        <div class="dorm-subtitle" style="font-size:12px; color:#78350f; margin-top:4px;">친구들의 방에 놀러가서 구경하고, 방명록과 좋아요(❤️)를 남겨보세요!</div>
      </div>
      <div class="dorm-grid">
    `;

    students.forEach((st, idx) => {
      const sName = st.name || st.이름 || `학생${idx+1}`;
      const sJob = st.job || st.직업명 || '학생';
      const room = getRoomData(sName);
      const isMe = sName === me;
      html += `
        <div class="dorm-card ${isMe ? 'my-room-card' : ''}" onclick="MiniroomSystem.openRoom('${sName}')">
          <div class="dorm-card-badge">${idx + 1}호실 ${isMe ? '(내 방 ⭐)' : ''}</div>
          <div class="dorm-card-avatar">🏠</div>
          <div class="dorm-card-name">${sName}</div>
          <div class="dorm-card-job">${sJob}</div>
          <div class="dorm-card-msg">"${(room.statusMsg || '').substring(0, 22)}..."</div>
          <div class="dorm-card-footer">
            <span>❤️ ${room.likes || 0}</span>
            <span>💬 방명록 ${(room.guestbook || []).length}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // 특정 학생의 미니룸 화면 오픈
  function openRoom(ownerName) {
    currentRoomOwner = ownerName;
    isEditing = false;
    SoundEngine.open();

    const st = GameState.student;
    const myName = st ? (st.name || st.이름) : '';
    const isMe = myName === ownerName;
    const room = getRoomData(ownerName);
    const modalBody = document.getElementById('modal-body');
    if (!modalBody) return;

    let wpItem = CONFIG.FURNITURE_CATALOG.find(f => f.id === room.wallpaper) || CONFIG.FURNITURE_CATALOG[0];
    let flItem = CONFIG.FURNITURE_CATALOG.find(f => f.id === room.floor) || CONFIG.FURNITURE_CATALOG[4];

    let html = `
      <div class="miniroom-container">
        <!-- 상단 헤더 바 -->
        <div class="miniroom-header">
          <button class="pixel-btn-secondary" onclick="MiniroomSystem.backToList()">⬅️ 기숙사 목록</button>
          <div class="miniroom-title-box">
            <span class="miniroom-owner-name">🏠 <strong>${ownerName}</strong> 님의 미니룸</span>
            <span class="miniroom-likes-badge" id="room-likes-btn" onclick="MiniroomSystem.likeRoom('${ownerName}')" style="cursor:pointer; background:#fee2e2; padding:4px 8px; border-radius:6px; font-size:12px; margin-left:8px;">
              ❤️ <span id="room-likes-count">${room.likes || 0}</span> 좋아요
            </span>
          </div>
          ${isMe ? `
            <button class="pixel-btn-primary" id="edit-room-toggle-btn" style="width:auto; padding:6px 14px;" onclick="MiniroomSystem.toggleEditMode()">
              🎨 방 꾸미기
            </button>
          ` : `
            <div></div>
          `}
        </div>

        <!-- 상태메시지 -->
        <div class="miniroom-status-bar" style="background:#f1f5f9; padding:8px 12px; border-radius:6px; font-size:12px; display:flex; align-items:center; gap:8px;">
          <span class="status-label" style="font-weight:bold; color:#475569;">Today's Story:</span>
          ${isMe ? `
            <input type="text" id="status-msg-input" class="status-input" value="${room.statusMsg || ''}" onchange="MiniroomSystem.updateStatusMsg(this.value)" style="flex:1; padding:4px 8px; border:1px solid #cbd5e1; border-radius:4px;">
          ` : `
            <span class="status-text">${room.statusMsg || '즐거운 하루 보내세요!'}</span>
          `}
        </div>

        <!-- 미니룸 뷰어 스테이지 -->
        <div class="miniroom-stage-wrap">
          <div class="miniroom-stage" id="miniroom-stage" style="background-color: ${wpItem.color || '#ffd1dc'};">
            <!-- 바닥 레이어 -->
            <div class="miniroom-floor" style="background-color: ${flItem.color || '#d4a373'};"></div>

            <!-- 배치된 가구 오브젝트들 -->
            <div class="miniroom-objects-layer" id="miniroom-objects-layer">
              ${renderPlacedObjects(room.items || [])}
            </div>

            <!-- 주인 아바타 -->
            <div class="miniroom-avatar" style="left: 140px; top: 120px;">
              <div class="avatar-tag">${ownerName}</div>
              <div class="avatar-sprite">🚶‍♂️</div>
            </div>
          </div>
        </div>

        <!-- 방 꾸미기 인벤토리 팔레트 (편집 모드 시 노출) -->
        <div class="miniroom-edit-palette" id="miniroom-edit-palette" style="display: none; background:#f8fafc; border:2px solid #cbd5e1; border-radius:8px; padding:10px;">
          <div class="palette-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; font-weight:bold;">📦 보유 중인 가구 (클릭하여 배치 / 남은 수량 표시)</span>
            <button class="pixel-btn-sm" onclick="MiniroomSystem.saveLayout()">💾 저장 완료</button>
          </div>
          <div class="palette-items" id="palette-items-list">
            ${renderPaletteItems(room)}
          </div>
        </div>

        <!-- 하단: 일촌평 / 방명록 -->
        <div class="miniroom-guestbook-section" style="margin-top:12px; border-top:2px solid #e2e8f0; padding-top:10px;">
          <div class="guestbook-header" style="font-weight:bold; font-size:13px; margin-bottom:8px;">
            <span>📝 방명록 & 일촌평 (${(room.guestbook || []).length})</span>
          </div>
          <div class="guestbook-input-wrap" style="display:flex; gap:6px; margin-bottom:10px;">
            <input type="text" id="guestbook-msg-input" placeholder="친구에게 따뜻한 한마디를 남겨주세요!" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;" onkeydown="if(event.key==='Enter') MiniroomSystem.addGuestbook()">
            <button class="pixel-btn-primary" style="width:auto; padding:8px 16px;" onclick="MiniroomSystem.addGuestbook()">등록</button>
          </div>
          <div class="guestbook-list" id="guestbook-list" style="max-height:150px; overflow-y:auto;">
            ${renderGuestbookList(room.guestbook || [])}
          </div>
        </div>
      </div>
    `;

    modalBody.innerHTML = html;
  }

  // 배치된 가구 렌더링
  function renderPlacedObjects(items) {
    return items.map((it, idx) => {
      const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === it.id);
      if (!def) return '';
      const left = it.x * 40;
      const top = it.y * 30;
      return `
        <div class="placed-furniture ${isEditing ? 'editable-furniture' : ''}"
             id="furn_${idx}"
             style="left: ${left}px; top: ${top}px; font-size: ${def.type === 'prop' ? '32px' : '42px'};"
             onclick="MiniroomSystem.onFurnitureClick(${idx})"
             title="${def.name}">
          ${def.emoji}
          ${isEditing ? `<span class="furn-del-btn" onclick="event.stopPropagation(); MiniroomSystem.removeFurniture(${idx})">❌</span>` : ''}
        </div>
      `;
    }).join('');
  }

  // 가구 팔레트 렌더링 (보유 수량 및 남은 수량 체크)
  function renderPaletteItems(room) {
    const inv = room.inventory || {};
    const placedCounts = {};
    (room.items || []).forEach(it => {
      placedCounts[it.id] = (placedCounts[it.id] || 0) + 1;
    });

    return CONFIG.FURNITURE_CATALOG.map(f => {
      const owned = inv[f.id] || 0;
      const placed = placedCounts[f.id] || 0;
      const remaining = f.type === 'wallpaper' || f.type === 'floor' ? 1 : Math.max(0, owned - placed);
      const isAvailable = remaining > 0 || f.type === 'wallpaper' || f.type === 'floor';

      return `
        <div class="palette-card ${isAvailable ? '' : 'palette-card-disabled'}"
             style="opacity: ${isAvailable ? '1' : '0.4'}; border-color: ${isAvailable ? '#22c55e' : '#cbd5e1'};"
             onclick="MiniroomSystem.addFurnitureToRoom('${f.id}')"
             title="${f.name} (보유: ${owned}개, 남음: ${remaining}개)">
          <div class="palette-emoji">${f.emoji}</div>
          <div class="palette-name">${f.name}</div>
          <div class="palette-type" style="color:${isAvailable ? '#15803d' : '#94a3b8'}; font-weight:bold;">
            ${f.type === 'wallpaper' || f.type === 'floor' ? '스타일' : `남음: ${remaining}개`}
          </div>
        </div>
      `;
    }).join('');
  }

  // 방명록 목록 렌더링
  function renderGuestbookList(list) {
    if (!list || list.length === 0) {
      return `<div class="guestbook-empty" style="text-align:center; padding:15px; color:#64748b; font-size:12px;">아직 등록된 방명록이 없습니다. 첫 번째 응원글을 남겨보세요!</div>`;
    }
    return list.slice().reverse().map(g => `
      <div class="guestbook-item" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:6px; font-size:12px;">
        <div class="gb-meta" style="display:flex; justify-content:space-between; color:#64748b; font-size:11px; margin-bottom:4px;">
          <span class="gb-author">👤 <strong>${g.author}</strong></span>
          <span class="gb-date">${g.date}</span>
        </div>
        <div class="gb-msg" style="color:#1e293b;">${g.msg}</div>
      </div>
    `).join('');
  }

  // 방명록 추가
  function addGuestbook() {
    const input = document.getElementById('guestbook-msg-input');
    if (!input || !input.value.trim()) return;

    const st = GameState.student;
    const myName = st ? (st.name || st.이름 || '익명') : '익명';
    const room = getRoomData(currentRoomOwner);
    if (!room.guestbook) room.guestbook = [];

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    room.guestbook.push({
      author: myName,
      msg: input.value.trim(),
      date: dateStr
    });

    saveRoomData(currentRoomOwner, room);
    SoundEngine.coin();
    input.value = '';

    const listEl = document.getElementById('guestbook-list');
    if (listEl) listEl.innerHTML = renderGuestbookList(room.guestbook);
  }

  // 좋아요 누르기
  function likeRoom(ownerName) {
    const st = GameState.student;
    const myName = st ? (st.name || st.이름 || '나') : '나';
    const room = getRoomData(ownerName);
    if (!room.likedBy) room.likedBy = [];

    if (room.likedBy.includes(myName)) {
      alert('이미 좋아요를 누른 방입니다! ❤️');
      return;
    }

    room.likedBy.push(myName);
    room.likes = (room.likes || 0) + 1;
    saveRoomData(ownerName, room);

    SoundEngine.coin();
    const countEl = document.getElementById('room-likes-count');
    if (countEl) countEl.textContent = room.likes;
  }

  // 편집 모드 토글
  function toggleEditMode() {
    isEditing = !isEditing;
    SoundEngine.click();
    const palette = document.getElementById('miniroom-edit-palette');
    const toggleBtn = document.getElementById('edit-room-toggle-btn');
    if (palette) palette.style.display = isEditing ? 'block' : 'none';
    if (toggleBtn) toggleBtn.textContent = isEditing ? '✅ 꾸미기 완료' : '🎨 방 꾸미기';

    const layer = document.getElementById('miniroom-objects-layer');
    const room = getRoomData(currentRoomOwner);
    if (layer) layer.innerHTML = renderPlacedObjects(room.items || []);

    const palList = document.getElementById('palette-items-list');
    if (palList) palList.innerHTML = renderPaletteItems(room);
  }

  // 가구 추가 (인벤토리 보유 수량 검증)
  function addFurnitureToRoom(furnitureId) {
    if (!isEditing) return;
    const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === furnitureId);
    if (!def) return;

    const room = getRoomData(currentRoomOwner);
    if (!room.items) room.items = [];
    if (!room.inventory) room.inventory = {};

    if (def.type === 'wallpaper') {
      room.wallpaper = def.id;
      const stage = document.getElementById('miniroom-stage');
      if (stage) stage.style.backgroundColor = def.color || '#ffd1dc';
      SoundEngine.snap();
      saveRoomData(currentRoomOwner, room);
      return;
    }

    if (def.type === 'floor') {
      room.floor = def.id;
      const fl = document.querySelector('.miniroom-floor');
      if (fl) fl.style.backgroundColor = def.color || '#d4a373';
      SoundEngine.snap();
      saveRoomData(currentRoomOwner, room);
      return;
    }

    // 일반 가구 수량 검증
    const owned = room.inventory[furnitureId] || 0;
    const placed = room.items.filter(it => it.id === furnitureId).length;

    if (placed >= owned) {
      alert(`[${def.name}] 가구를 모두 배치했습니다! 잡화점에서 추가로 구매할 수 있습니다.`);
      return;
    }

    const newX = 2 + (room.items.length % 6);
    const newY = 3 + (Math.floor(room.items.length / 6) % 4);
    room.items.push({ id: def.id, x: newX, y: newY });

    SoundEngine.snap();
    saveRoomData(currentRoomOwner, room);

    const layer = document.getElementById('miniroom-objects-layer');
    if (layer) layer.innerHTML = renderPlacedObjects(room.items);

    const palList = document.getElementById('palette-items-list');
    if (palList) palList.innerHTML = renderPaletteItems(room);
  }

  // 가구 제거
  function removeFurniture(idx) {
    const room = getRoomData(currentRoomOwner);
    if (!room.items) return;
    room.items.splice(idx, 1);
    saveRoomData(currentRoomOwner, room);
    SoundEngine.click();

    const layer = document.getElementById('miniroom-objects-layer');
    if (layer) layer.innerHTML = renderPlacedObjects(room.items);

    const palList = document.getElementById('palette-items-list');
    if (palList) palList.innerHTML = renderPaletteItems(room);
  }

  function updateStatusMsg(newMsg) {
    const room = getRoomData(currentRoomOwner);
    room.statusMsg = newMsg;
    saveRoomData(currentRoomOwner, room);
  }

  function saveLayout() {
    toggleEditMode();
    SoundEngine.fanfare();
    alert('방 인테리어가 구글 시트와 클라우드에 안전하게 저장되었습니다! ✨');
  }

  function backToList() {
    SoundEngine.click();
    const modalBody = document.getElementById('modal-body');
    if (modalBody) renderDormitoryList(modalBody);
  }

  return {
    renderDormitoryList,
    openRoom,
    backToList,
    toggleEditMode,
    addFurnitureToRoom,
    addFurnitureToInventory,
    removeFurniture,
    updateStatusMsg,
    addGuestbook,
    likeRoom,
    saveLayout,
    onFurnitureClick: (idx) => {
      if (isEditing) {
        const room = getRoomData(currentRoomOwner);
        if (room.items && room.items[idx]) {
          room.items[idx].x = (room.items[idx].x + 1) % 9;
          saveRoomData(currentRoomOwner, room);
          SoundEngine.snap();
          const layer = document.getElementById('miniroom-objects-layer');
          if (layer) layer.innerHTML = renderPlacedObjects(room.items);
        }
      }
    }
  };
})();
