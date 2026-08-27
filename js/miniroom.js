// ============================================================
// 싸이월드풍 미니룸 & 하우징 시스템 (js/miniroom.js)
// 방 꾸미기, 가구 드래그배치, 친구 방 방문, 방명록, 좋아요
// ============================================================

const MiniroomSystem = (() => {
  let currentRoomOwner = null;
  let isEditing = false;
  let selectedFurniture = null;

  // 기본 기본 방 템플릿
  const DEFAULT_ROOM = {
    wallpaper: 'wp_pastel_pink',
    floor: 'fl_wood_parquet',
    statusMsg: '어서오세요! 행복한 나의 방에 놀러오신 것을 환영해요 🌸',
    likes: 5,
    likedBy: [],
    items: [
      { id: 'fn_cozy_bed', x: 2, y: 3 },
      { id: 'fn_gaming_desk', x: 6, y: 3 },
      { id: 'fn_plant_pot', x: 1, y: 5 },
      { id: 'fn_teddy_bear', x: 4, y: 5 },
      { id: 'pet_shiba_dog', x: 7, y: 6 }
    ],
    guestbook: [
      { author: '선생님', msg: '방이 정말 아늑하고 멋지구나! 좋은 하루 보내렴 😊', date: '2026-08-28 09:00' },
      { author: '김철수', msg: '우와 게이밍 컴퓨터 부럽다 ㅋㅋ', date: '2026-08-28 10:15' }
    ]
  };

  // 로컬 저장소 캐시 및 동기화
  function getRoomData(studentName) {
    const key = `classbank_room_${studentName}`;
    const local = localStorage.getItem(key);
    if (local) {
      try { return JSON.parse(local); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_ROOM));
  }

  function saveRoomData(studentName, data) {
    const key = `classbank_room_${studentName}`;
    localStorage.setItem(key, JSON.stringify(data));

    // GAS 백엔드에 백업 저장
    API.call('saveRoomData', { name: studentName, roomData: data }, true);

    // Firebase RTDB에도 동기화 (설정된 경우)
    if (window.Realtime && window.Realtime.saveRoom) {
      window.Realtime.saveRoom(studentName, data);
    }
  }

  // 기숙사 메인 모달 렌더링 (호실 목록)
  function renderDormitoryList(container) {
    const me = GameState.student ? GameState.student.이름 : '나';
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
      <div class="dorm-header">
        <div class="dorm-title">🏢 학생 기숙사 (미니룸 타운)</div>
        <div class="dorm-subtitle">친구들의 방에 놀러가서 구경하고, 방명록과 좋아요(❤️)를 남겨보세요!</div>
      </div>
      <div class="dorm-grid">
    `;

    students.forEach((st, idx) => {
      const room = getRoomData(st.name);
      const isMe = st.name === me;
      html += `
        <div class="dorm-card ${isMe ? 'my-room-card' : ''}" onclick="MiniroomSystem.openRoom('${st.name}')">
          <div class="dorm-card-badge">${idx + 1}호실 ${isMe ? '(내 방 ⭐)' : ''}</div>
          <div class="dorm-card-avatar">🏠</div>
          <div class="dorm-card-name">${st.name}</div>
          <div class="dorm-card-job">${st.job || '학생'}</div>
          <div class="dorm-card-msg">"${room.statusMsg.substring(0, 22)}..."</div>
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

    const isMe = GameState.student && GameState.student.이름 === ownerName;
    const room = getRoomData(ownerName);
    const modalBody = document.getElementById('modal-body-dormitory');
    if (!modalBody) return;

    let wpItem = CONFIG.FURNITURE_CATALOG.find(f => f.id === room.wallpaper) || CONFIG.FURNITURE_CATALOG[0];
    let flItem = CONFIG.FURNITURE_CATALOG.find(f => f.id === room.floor) || CONFIG.FURNITURE_CATALOG[4];

    let html = `
      <div class="miniroom-container">
        <!-- 상단 헤더 바 -->
        <div class="miniroom-header">
          <button class="pixel-btn-secondary" onclick="MiniroomSystem.backToList()">⬅️ 기숙사 목록</button>
          <div class="miniroom-title-box">
            <span class="miniroom-owner-name">🏠 ${ownerName} 님의 미니룸</span>
            <span class="miniroom-likes-badge" id="room-likes-btn" onclick="MiniroomSystem.likeRoom('${ownerName}')">
              ❤️ <span id="room-likes-count">${room.likes || 0}</span> 좋아요
            </span>
          </div>
          ${isMe ? `
            <button class="pixel-btn-primary" id="edit-room-toggle-btn" onclick="MiniroomSystem.toggleEditMode()">
              🎨 방 꾸미기
            </button>
          ` : `
            <div></div>
          `}
        </div>

        <!-- 상태메시지 -->
        <div class="miniroom-status-bar">
          <span class="status-label">Today's Story:</span>
          ${isMe ? `
            <input type="text" id="status-msg-input" class="status-input" value="${room.statusMsg}" onchange="MiniroomSystem.updateStatusMsg(this.value)">
          ` : `
            <span class="status-text">${room.statusMsg}</span>
          `}
        </div>

        <!-- 3D 아이소메트릭 / 2D 싸이월드 미니룸 뷰어 -->
        <div class="miniroom-stage-wrap">
          <div class="miniroom-stage" id="miniroom-stage" style="background-color: ${wpItem.color || '#ffd1dc'};">
            <!-- 바닥 레이어 -->
            <div class="miniroom-floor" style="background-color: ${flItem.color || '#d4a373'};"></div>

            <!-- 배치된 가구 오브젝트들 -->
            <div class="miniroom-objects-layer" id="miniroom-objects-layer">
              ${renderPlacedObjects(room.items)}
            </div>

            <!-- 주인 아바타 -->
            <div class="miniroom-avatar" style="left: 140px; top: 120px;">
              <div class="avatar-tag">${ownerName}</div>
              <div class="avatar-sprite">🚶‍♂️</div>
            </div>
          </div>
        </div>

        <!-- 방 꾸미기 인벤토리 드래그 팔레트 (편집 모드 시 노출) -->
        <div class="miniroom-edit-palette" id="miniroom-edit-palette" style="display: none;">
          <div class="palette-header">
            <span>📦 보유 중인 가구 & 인테리어 (클릭하여 방에 배치)</span>
            <button class="pixel-btn-sm" onclick="MiniroomSystem.saveLayout()">💾 배치 저장</button>
          </div>
          <div class="palette-items" id="palette-items-list">
            ${renderPaletteItems()}
          </div>
        </div>

        <!-- 하단: 싸이월드 일촌평 / 방명록 -->
        <div class="miniroom-guestbook-section">
          <div class="guestbook-header">
            <span>📝 방명록 & 일촌평 (${(room.guestbook || []).length})</span>
          </div>
          <div class="guestbook-input-wrap">
            <input type="text" id="guestbook-msg-input" placeholder="친구에게 따뜻한 한마디를 남겨주세요!" onkeydown="if(event.key==='Enter') MiniroomSystem.addGuestbook()">
            <button class="pixel-btn-primary" onclick="MiniroomSystem.addGuestbook()">등록</button>
          </div>
          <div class="guestbook-list" id="guestbook-list">
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

  // 가구 팔레트 렌더링
  function renderPaletteItems() {
    return CONFIG.FURNITURE_CATALOG.map(f => {
      return `
        <div class="palette-card" onclick="MiniroomSystem.addFurnitureToRoom('${f.id}')" title="${f.name}">
          <div class="palette-emoji">${f.emoji}</div>
          <div class="palette-name">${f.name}</div>
          <div class="palette-type">${f.type}</div>
        </div>
      `;
    }).join('');
  }

  // 방명록 목록 렌더링
  function renderGuestbookList(list) {
    if (list.length === 0) {
      return `<div class="guestbook-empty">아직 등록된 방명록이 없습니다. 첫 번째 응원글을 남겨보세요!</div>`;
    }
    return list.slice().reverse().map(g => `
      <div class="guestbook-item">
        <div class="gb-meta">
          <span class="gb-author">👤 ${g.author}</span>
          <span class="gb-date">${g.date}</span>
        </div>
        <div class="gb-msg">${g.msg}</div>
      </div>
    `).join('');
  }

  // 방명록 추가
  function addGuestbook() {
    const input = document.getElementById('guestbook-msg-input');
    if (!input || !input.value.trim()) return;

    const myName = GameState.student ? GameState.student.이름 : '익명';
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
    const myName = GameState.student ? GameState.student.이름 : '나';
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
    if (layer) layer.innerHTML = renderPlacedObjects(room.items);
  }

  // 가구 추가
  function addFurnitureToRoom(furnitureId) {
    if (!isEditing) return;
    const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === furnitureId);
    if (!def) return;

    const room = getRoomData(currentRoomOwner);

    if (def.type === 'wallpaper') {
      room.wallpaper = def.id;
      const stage = document.getElementById('miniroom-stage');
      if (stage) stage.style.backgroundColor = def.color || '#ffd1dc';
    } else if (def.type === 'floor') {
      room.floor = def.id;
      const fl = document.querySelector('.miniroom-floor');
      if (fl) fl.style.backgroundColor = def.color || '#d4a373';
    } else {
      // 일반 가구 / 소품 / 펫 배치
      const newX = 2 + (room.items.length % 6);
      const newY = 3 + (Math.floor(room.items.length / 6) % 4);
      room.items.push({ id: def.id, x: newX, y: newY });
      const layer = document.getElementById('miniroom-objects-layer');
      if (layer) layer.innerHTML = renderPlacedObjects(room.items);
    }

    SoundEngine.snap();
    saveRoomData(currentRoomOwner, room);
  }

  // 가구 제거
  function removeFurniture(idx) {
    const room = getRoomData(currentRoomOwner);
    room.items.splice(idx, 1);
    saveRoomData(currentRoomOwner, room);
    SoundEngine.click();
    const layer = document.getElementById('miniroom-objects-layer');
    if (layer) layer.innerHTML = renderPlacedObjects(room.items);
  }

  // 상태메시지 갱신
  function updateStatusMsg(newMsg) {
    const room = getRoomData(currentRoomOwner);
    room.statusMsg = newMsg;
    saveRoomData(currentRoomOwner, room);
  }

  // 배치 저장
  function saveLayout() {
    toggleEditMode();
    SoundEngine.fanfare();
    alert('방 인테리어가 멋지게 저장되었습니다! ✨');
  }

  function backToList() {
    SoundEngine.click();
    const modalBody = document.getElementById('modal-body-dormitory');
    if (modalBody) renderDormitoryList(modalBody);
  }

  return {
    renderDormitoryList,
    openRoom,
    backToList,
    toggleEditMode,
    addFurnitureToRoom,
    removeFurniture,
    updateStatusMsg,
    addGuestbook,
    likeRoom,
    saveLayout,
    onFurnitureClick: (idx) => {
      if (isEditing) {
        // 간단한 위치 이동 시프트
        const room = getRoomData(currentRoomOwner);
        if (room.items[idx]) {
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
