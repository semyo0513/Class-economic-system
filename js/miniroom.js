// ============================================================
// 아기자기한 파스텔 감성 미니룸 & 인테리어 시스템 (js/miniroom.js)
// 가구 드래그 & 드롭 자유 배치, 햇살 창문 효과, 방명록, 좋아요(❤️)
// ============================================================

const MiniroomSystem = (() => {
  let currentRoomOwner = null;
  let isEditing = false;
  let draggingItemIdx = null;
  let dragOffset = { x: 0, y: 0 };

  // 기본 아기자기한 방 템플릿
  const DEFAULT_ROOM = {
    wallpaper: 'wp_pastel_pink',
    floor: 'fl_wood_parquet',
    statusMsg: '어서오세요! 따뜻하고 포근한 나의 방에 오신 걸 환영해요 🌸',
    likes: 8,
    likedBy: [],
    inventory: {
      'fn_cozy_bed': 1,
      'fn_gaming_desk': 1,
      'fn_plant_pot': 1,
      'fn_teddy_bear': 1,
      'pet_shiba_dog': 1,
      'fn_fluffy_rug': 1,
      'fn_window_sun': 1
    },
    items: [
      { id: 'fn_window_sun', x: 180, y: 40 },
      { id: 'fn_cozy_bed', x: 60, y: 80 },
      { id: 'fn_gaming_desk', x: 260, y: 80 },
      { id: 'fn_fluffy_rug', x: 160, y: 150 },
      { id: 'fn_plant_pot', x: 30, y: 160 },
      { id: 'fn_teddy_bear', x: 140, y: 165 },
      { id: 'pet_shiba_dog', x: 280, y: 175 }
    ],
    guestbook: [
      { author: '선생님', msg: '방이 정말 아기자기하고 예쁘구나! 멋진 인테리어야 ✨', date: '2026-08-28 09:30' }
    ]
  };

  function getRoomData(studentName) {
    const key = `classbank_room_${studentName}`;
    const local = localStorage.getItem(key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (!parsed.inventory) parsed.inventory = { ...DEFAULT_ROOM.inventory };
        if (parsed.items) {
          parsed.items.forEach(it => {
            if (it.x < 15) it.x = it.x * 40;
            if (it.y < 15) it.y = it.y * 30;
          });
        }
        return parsed;
      } catch (_) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_ROOM));
  }

  function saveRoomData(studentName, data) {
    const key = `classbank_room_${studentName}`;
    localStorage.setItem(key, JSON.stringify(data));
    API.call('saveRoomData', { name: studentName, roomData: data }, true);
    if (window.Realtime && window.Realtime.saveRoom) {
      window.Realtime.saveRoom(studentName, data);
    }
  }

  function addFurnitureToInventory(studentName, furnitureId) {
    const room = getRoomData(studentName);
    if (!room.inventory) room.inventory = {};
    room.inventory[furnitureId] = (room.inventory[furnitureId] || 0) + 1;
    saveRoomData(studentName, room);
  }

  function renderDormitoryList(container) {
    const me = GameState.student ? (GameState.student.name || GameState.student.이름 || '나') : '나';
    const students = (GameState.rankingList && GameState.rankingList.length > 0)
      ? GameState.rankingList
      : [
          { name: me, job: '학생' },
          { name: '김현주', job: '문화체육부 장관' },
          { name: '이하진', job: '대통령(반장)' },
          { name: '정수빈', job: '은행원' },
          { name: '서언', job: '국세청장' },
          { name: '고설아', job: '학생' }
        ];

    let html = `
      <div class="dorm-header" style="background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border:2px solid #fcd34d; padding:14px; border-radius:12px; margin-bottom:14px; text-align:center;">
        <div class="dorm-title" style="font-size:18px; font-weight:900; color:#b45309;">🏡 학생 아기자기 기숙사 타운</div>
        <div class="dorm-subtitle" style="font-size:12px; color:#78350f; margin-top:4px;">친구들의 미니룸에 놀러가서 구경하고, 방명록과 좋아요(❤️)를 남겨보세요!</div>
      </div>

      <div class="my-room-banner" style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:2px solid #93c5fd; padding:14px; border-radius:10px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:32px;">🛋️</div>
          <div>
            <div style="font-size:15px; font-weight:bold; color:#1e40af;">내 아기자기 미니룸 입장하기</div>
            <div style="font-size:12px; color:#3b82f6;">내 취향대로 벽지와 가구를 배치해보세요.</div>
          </div>
        </div>
        <button class="pixel-btn-primary" style="width:auto; padding:8px 18px;" onclick="MiniroomSystem.openRoom('${me}')">
          🚪 내 방 꾸미기
        </button>
      </div>

      <h4 style="margin-bottom:10px; font-size:14px; color:#334155;">👥 친구들의 미니룸 목록</h4>
      <div class="dorm-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; max-height:260px; overflow-y:auto;">
        ${students.map((s, idx) => {
          const room = getRoomData(s.name);
          const isMy = s.name === me;
          return `
            <div class="dorm-card" style="background:#ffffff; border:2px solid ${isMy ? '#3b82f6' : '#cbd5e1'}; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="MiniroomSystem.openRoom('${s.name}')">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="font-size:26px;">${isMy ? '👑' : '🚪'}</div>
                <div>
                  <div style="font-weight:bold; font-size:13px; color:#1e293b;">${s.name} ${isMy ? '<span class="badge badge-primary">내 방</span>' : ''}</div>
                  <div style="font-size:11px; color:#64748b;">${s.job || '학생'} · ❤️ ${room.likes || 0}</div>
                </div>
              </div>
              <button class="pixel-btn-sm" style="${isMy ? 'background:#3b82f6;' : ''}">방문</button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  function openRoom(ownerName) {
    currentRoomOwner = ownerName;
    isEditing = false;
    draggingItemIdx = null;

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
        <div class="miniroom-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <button class="pixel-btn-secondary" style="width:auto; padding:6px 12px;" onclick="MiniroomSystem.backToList()">⬅️ 목록</button>
          <div class="miniroom-title-box" style="display:flex; align-items:center;">
            <span class="miniroom-owner-name" style="font-size:15px; font-weight:bold;">🏠 <strong>${ownerName}</strong> 님의 미니룸</span>
            <span class="miniroom-likes-badge" id="room-likes-btn" onclick="MiniroomSystem.likeRoom('${ownerName}')" style="cursor:pointer; background:#fee2e2; border:1px solid #fca5a5; padding:3px 8px; border-radius:6px; font-size:12px; margin-left:8px;">
              ❤️ <span id="room-likes-count">${room.likes || 0}</span>
            </span>
          </div>
          ${isMe ? `
            <button class="pixel-btn-primary" id="edit-room-toggle-btn" style="width:auto; padding:6px 14px; background:#8b5cf6;" onclick="MiniroomSystem.toggleEditMode()">
              🎨 방 꾸미기
            </button>
          ` : `
            <div></div>
          `}
        </div>

        <!-- 상태메시지 -->
        <div class="miniroom-status-bar" style="background:#f8fafc; border:1px solid #e2e8f0; padding:8px 12px; border-radius:8px; font-size:12px; display:flex; align-items:center; gap:8px; margin-bottom:10px;">
          <span style="font-weight:bold; color:#6366f1;">Today:</span>
          ${isMe ? `
            <input type="text" id="status-msg-input" value="${room.statusMsg || ''}" onchange="MiniroomSystem.updateStatusMsg(this.value)" style="flex:1; padding:4px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px;">
          ` : `
            <span style="color:#334155;">${room.statusMsg || '포근한 하루 되세요!'}</span>
          `}
        </div>

        <!-- 안내 문구 (편집 모드 시) -->
        <div id="drag-guide-msg" style="display:none; font-size:12px; color:#b45309; background:#fef3c7; border:1px solid #fcd34d; padding:6px 10px; border-radius:6px; text-align:center; margin-bottom:10px;">
          💡 가구를 터치하거나 마우스로 드래그하여 원하는 위치로 자유롭게 이동하세요!
        </div>

        <!-- 미니룸 뷰어 스테이지 -->
        <div class="miniroom-stage-wrap" style="position:relative; width:100%; height:280px; border:3px solid #64748b; border-radius:12px; overflow:hidden; box-shadow:0 6px 16px rgba(0,0,0,0.15);">
          <div class="miniroom-stage" id="miniroom-stage" style="position:relative; width:100%; height:100%; background-color: ${wpItem.color || '#fed7aa'};" onmousemove="MiniroomSystem.onStageMouseMove(event)" onmouseup="MiniroomSystem.onStageMouseUp(event)" ontouchmove="MiniroomSystem.onStageTouchMove(event)" ontouchend="MiniroomSystem.onStageTouchEnd(event)">
            
            <!-- 벽면 장식 (창문 햇살 효과) -->
            <div style="position:absolute; top:15px; left:180px; width:90px; height:70px; background:rgba(255,255,255,0.7); border:3px solid #94a3b8; border-radius:6px; pointer-events:none; box-shadow:0 0 25px rgba(254, 240, 138, 0.8);">
              <div style="position:absolute; top:0; left:50%; width:2px; height:100%; background:#94a3b8;"></div>
              <div style="position:absolute; top:50%; left:0; width:100%; height:2px; background:#94a3b8;"></div>
              <!-- 햇살 줄기 -->
              <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, rgba(254,240,138,0.5) 0%, transparent 80%);"></div>
            </div>

            <!-- 바닥 레이어 (2.5D 헤링본/원목 마루) -->
            <div class="miniroom-floor" style="position:absolute; bottom:0; left:0; width:100%; height:120px; background-color: ${flItem.color || '#d4a373'}; border-top:3px solid #78350f; pointer-events:none; background-image: repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,0.04) 15px, rgba(0,0,0,0.04) 30px);"></div>

            <!-- 가구 오브젝트 레이어 -->
            <div class="miniroom-objects-layer" id="miniroom-objects-layer">
              ${renderPlacedObjects(room.items || [])}
            </div>

            <!-- 주인 아바타 -->
            <div class="miniroom-avatar" style="position:absolute; left: 160px; top: 140px; pointer-events:none; text-align:center;">
              <div style="font-size:10px; background:rgba(0,0,0,0.6); color:#fff; padding:1px 5px; border-radius:4px; margin-bottom:2px;">${ownerName}</div>
              <div style="font-size:36px;">🚶‍♂️</div>
            </div>
          </div>
        </div>

        <!-- 방 꾸미기 인벤토리 팔레트 (편집 모드 시 노출) -->
        <div class="miniroom-edit-palette" id="miniroom-edit-palette" style="display: none; background:#f8fafc; border:2px solid #cbd5e1; border-radius:10px; padding:12px; margin-top:12px;">
          <div class="palette-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:13px; font-weight:bold; color:#1e293b;">📦 보유 중인 가구 (클릭하여 방에 추가)</span>
            <button class="pixel-btn-sm" style="background:#16a34a;" onclick="MiniroomSystem.saveLayout()">💾 저장 완료</button>
          </div>
          <div class="palette-items" id="palette-items-list" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; max-height:160px; overflow-y:auto;">
            ${renderPaletteItems(room)}
          </div>
        </div>

        <!-- 방명록 & 일촌평 -->
        <div class="miniroom-guestbook-section" style="margin-top:14px; border-top:2px solid #e2e8f0; padding-top:10px;">
          <div style="font-weight:bold; font-size:13px; color:#334155; margin-bottom:8px;">
            <span>📝 방명록 & 일촌평 (${(room.guestbook || []).length})</span>
          </div>
          <div class="guestbook-input-wrap" style="display:flex; gap:6px; margin-bottom:10px;">
            <input type="text" id="guestbook-msg-input" placeholder="친구에게 따뜻한 한마디를 남겨주세요!" style="flex:1; padding:8px; border:2px solid #94a3b8; border-radius:6px; font-size:12px;" onkeydown="if(event.key==='Enter') MiniroomSystem.addGuestbook()">
            <button class="pixel-btn-primary" style="width:auto; padding:8px 16px;" onclick="MiniroomSystem.addGuestbook()">등록</button>
          </div>
          <div class="guestbook-list" id="guestbook-list" style="max-height:130px; overflow-y:auto;">
            ${renderGuestbookList(room.guestbook || [])}
          </div>
        </div>
      </div>
    `;

    modalBody.innerHTML = html;
  }

  function renderPlacedObjects(items) {
    return items.map((it, idx) => {
      const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === it.id);
      if (!def) return '';
      const left = it.x || 100;
      const top = it.y || 100;
      return `
        <div class="placed-furniture ${isEditing ? 'editable-furniture' : ''}"
             id="furn_${idx}"
             style="position:absolute; left: ${left}px; top: ${top}px; font-size: ${def.type === 'prop' ? '32px' : '44px'}; cursor:${isEditing ? 'grab' : 'default'}; user-select:none; z-index:${Math.floor(top)};"
             onmousedown="MiniroomSystem.startDrag(event, ${idx})"
             ontouchstart="MiniroomSystem.startTouchDrag(event, ${idx})"
             title="${def.name}">
          ${def.emoji}
          ${isEditing ? `<span class="furn-del-btn" style="position:absolute; top:-6px; right:-6px; background:#ef4444; color:#fff; border-radius:50%; width:16px; height:16px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="event.stopPropagation(); MiniroomSystem.removeFurniture(${idx})">✕</span>` : ''}
        </div>
      `;
    }).join('');
  }

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
        <div class="palette-card"
             style="background:#fff; border:2px solid ${isAvailable ? '#86efac' : '#cbd5e1'}; border-radius:8px; padding:6px; text-align:center; opacity: ${isAvailable ? '1' : '0.4'}; cursor:${isAvailable ? 'pointer' : 'not-allowed'};"
             onclick="MiniroomSystem.addFurnitureToRoom('${f.id}')"
             title="${f.name}">
          <div style="font-size:24px;">${f.emoji}</div>
          <div style="font-size:11px; font-weight:bold; margin-top:2px;">${f.name}</div>
          <div style="font-size:9px; color:${isAvailable ? '#15803d' : '#94a3b8'};">
            ${f.type === 'wallpaper' || f.type === 'floor' ? '스타일' : `남음: ${remaining}개`}
          </div>
        </div>
      `;
    }).join('');
  }

  function startDrag(e, idx) {
    if (!isEditing) return;
    e.preventDefault();
    draggingItemIdx = idx;
    const el = document.getElementById(`furn_${idx}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left - rect.width / 2;
      dragOffset.y = e.clientY - rect.top - rect.height / 2;
    }
  }

  function startTouchDrag(e, idx) {
    if (!isEditing) return;
    if (e.touches && e.touches[0]) {
      draggingItemIdx = idx;
      const touch = e.touches[0];
      const el = document.getElementById(`furn_${idx}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left - rect.width / 2;
        dragOffset.y = touch.clientY - rect.top - rect.height / 2;
      }
    }
  }

  function onStageMouseMove(e) {
    if (draggingItemIdx === null) return;
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
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    let x = clientX - rect.left - dragOffset.x;
    let y = clientY - rect.top - dragOffset.y;

    x = Math.max(20, Math.min(rect.width - 40, x));
    y = Math.max(20, Math.min(rect.height - 40, y));

    const el = document.getElementById(`furn_${draggingItemIdx}`);
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.zIndex = `${Math.floor(y)}`;
    }
  }

  function onStageMouseUp() { finishDrag(); }
  function onStageTouchEnd() { finishDrag(); }

  function finishDrag() {
    if (draggingItemIdx === null) return;
    const el = document.getElementById(`furn_${draggingItemIdx}`);
    if (el && currentRoomOwner) {
      const room = getRoomData(currentRoomOwner);
      if (room.items && room.items[draggingItemIdx]) {
        room.items[draggingItemIdx].x = parseInt(el.style.left, 10);
        room.items[draggingItemIdx].y = parseInt(el.style.top, 10);
        saveRoomData(currentRoomOwner, room);
      }
    }
    draggingItemIdx = null;
  }

  function renderGuestbookList(list) {
    if (!list || list.length === 0) {
      return '<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">첫 방명록을 남겨보세요! ✨</div>';
    }
    return list.map(item => `
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin-bottom:6px; font-size:12px;">
        <div style="display:flex; justify-content:space-between; color:#64748b; font-size:11px; margin-bottom:3px;">
          <strong>👤 ${item.author}</strong>
          <span>${item.date}</span>
        </div>
        <div style="color:#1e293b;">${item.msg}</div>
      </div>
    `).join('');
  }

  return {
    renderDormitoryList,
    openRoom,
    backToList: () => {
      const modalBody = document.getElementById('modal-body');
      if (modalBody) renderDormitoryList(modalBody);
      SoundEngine.click();
    },
    toggleEditMode: () => {
      isEditing = !isEditing;
      const palette = document.getElementById('miniroom-edit-palette');
      const guide = document.getElementById('drag-guide-msg');
      const btn = document.getElementById('edit-room-toggle-btn');
      if (palette) palette.style.display = isEditing ? 'block' : 'none';
      if (guide) guide.style.display = isEditing ? 'block' : 'none';
      if (btn) btn.textContent = isEditing ? '💾 꾸미기 완료' : '🎨 방 꾸미기';
      if (currentRoomOwner) openRoom(currentRoomOwner);
      SoundEngine.snap();
    },
    saveLayout: () => {
      isEditing = false;
      if (currentRoomOwner) openRoom(currentRoomOwner);
      SoundEngine.fanfare();
      alert('방 인테리어가 저장되었습니다! ✨');
    },
    addFurnitureToRoom: (id) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      const def = CONFIG.FURNITURE_CATALOG.find(f => f.id === id);
      if (!def) return;

      if (def.type === 'wallpaper') {
        room.wallpaper = id;
      } else if (def.type === 'floor') {
        room.floor = id;
      } else {
        if (!room.items) room.items = [];
        room.items.push({ id, x: 150 + Math.floor(Math.random() * 40), y: 120 + Math.floor(Math.random() * 40) });
      }
      saveRoomData(currentRoomOwner, room);
      openRoom(currentRoomOwner);
      SoundEngine.coin();
    },
    removeFurniture: (idx) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      if (room.items && room.items[idx]) {
        room.items.splice(idx, 1);
        saveRoomData(currentRoomOwner, room);
        openRoom(currentRoomOwner);
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
      SoundEngine.fanfare();
    },
    updateStatusMsg: (msg) => {
      if (!currentRoomOwner) return;
      const room = getRoomData(currentRoomOwner);
      room.statusMsg = msg;
      saveRoomData(currentRoomOwner, room);
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
      room.guestbook.unshift({ author, msg, date: dateStr });
      saveRoomData(currentRoomOwner, room);
      openRoom(currentRoomOwner);
      SoundEngine.coin();
    },
    startDrag,
    startTouchDrag,
    onStageMouseMove,
    onStageTouchMove,
    onStageMouseUp,
    onStageTouchEnd
  };
})();
