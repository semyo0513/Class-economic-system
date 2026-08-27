// ============================================================
// Firebase Realtime DB 멀티플레이어 & 채팅 모듈 (js/realtime.js)
// ============================================================

const Realtime = (() => {
  let db = null;
  let myName = null;
  let playerRef = null;
  let lastUpdate = 0;
  let isConnected = false;

  // 원격 플레이어 목록 콜백
  let onPlayersUpdateCb = null;
  let onChatMessageCb = null;

  // 모의 NPC 플레이어 (Firebase 미연동 시 로컬 시뮬레이션)
  const mockNPCs = [
    { name: '김철수', job: '은행원', x: 74 * 32, y: 20 * 32, dir: 'down', moving: false },
    { name: '이영희', job: '기자', x: 50 * 32, y: 44 * 32, dir: 'right', moving: false },
    { name: '박민우', job: '환경미화', x: 20 * 32, y: 58 * 32, dir: 'up', moving: false }
  ];

  function init(studentName, onPlayersUpdate, onChatMessage) {
    myName = studentName;
    onPlayersUpdateCb = onPlayersUpdate;
    onChatMessageCb = onChatMessage;

    // Firebase 초기화 확인
    if (window.firebase && CONFIG.FIREBASE && CONFIG.FIREBASE.apiKey && CONFIG.FIREBASE.apiKey.length > 5) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(CONFIG.FIREBASE);
        }
        db = firebase.database();

        // 익명 인증
        firebase.auth().signInAnonymously().then(() => {
          isConnected = true;
          setupListeners();
        }).catch(err => {
          console.warn('[Firebase Auth Error] 데모 시뮬레이션 모드로 전환합니다:', err);
          startNPCSimulation();
        });
      } catch (err) {
        console.warn('[Firebase Init Error] 데모 시뮬레이션 모드로 전환합니다:', err);
        startNPCSimulation();
      }
    } else {
      console.log('[Realtime] Firebase 설정이 없어 로컬 NPC 시뮬레이션 모드로 구동합니다.');
      startNPCSimulation();
    }
  }

  function setupListeners() {
    if (!db || !myName) return;

    playerRef = db.ref(`players/${myName}`);
    const presenceRef = db.ref(`presence/${myName}`);
    const amOnline = db.ref('.info/connected');

    amOnline.on('value', (snapshot) => {
      if (snapshot.val()) {
        presenceRef.onDisconnect().remove();
        playerRef.onDisconnect().remove();
        presenceRef.set(true);
      }
    });

    // 전체 플레이어 감지
    db.ref('players').on('value', (snapshot) => {
      const data = snapshot.val() || {};
      if (onPlayersUpdateCb) onPlayersUpdateCb(data);
    });

    // 채팅 메시지 수신 (최근 30개)
    db.ref('chat/general').limitToLast(30).on('child_added', (snapshot) => {
      const msg = snapshot.val();
      if (msg && onChatMessageCb) {
        onChatMessageCb(msg);
      }
    });
  }

  function updatePosition(x, y, dir, moving) {
    const now = Date.now();
    if (now - lastUpdate < CONFIG.GAME.SYNC_THROTTLE) return;
    lastUpdate = now;

    if (isConnected && playerRef) {
      playerRef.set({
        name: myName,
        job: GameState.student ? GameState.student.직업명 : '학생',
        x: Math.round(x),
        y: Math.round(y),
        dir: dir,
        moving: moving,
        lastSeen: now
      });
    }
  }

  function sendMessage(text) {
    if (!text || !text.trim()) return;
    const msgData = {
      name: myName || '나',
      job: GameState.student ? GameState.student.직업명 : '학생',
      msg: text.trim(),
      ts: Date.now()
    };

    if (isConnected && db) {
      db.ref('chat/general').push(msgData);
    } else {
      // 로컬 즉시 발송
      if (onChatMessageCb) onChatMessageCb(msgData);
    }
  }

  // 모의 NPC 이동 및 대화 시뮬레이션
  function startNPCSimulation() {
    setInterval(() => {
      mockNPCs.forEach(npc => {
        if (Math.random() < 0.3) {
          const dirs = ['up', 'down', 'left', 'right'];
          npc.dir = dirs[Math.floor(Math.random() * dirs.length)];
          const delta = 16;
          if (npc.dir === 'up') npc.y -= delta;
          if (npc.dir === 'down') npc.y += delta;
          if (npc.dir === 'left') npc.x -= delta;
          if (npc.dir === 'right') npc.x += delta;
        }
      });

      const playersObj = {};
      mockNPCs.forEach(npc => {
        playersObj[npc.name] = npc;
      });
      if (onPlayersUpdateCb) onPlayersUpdateCb(playersObj);
    }, 1500);

    // 가끔 NPC 채팅 메시지 발송
    const npcChats = [
      '오늘 급식 진짜 맛있다 ㅎㅎ',
      '은행에 예금 이자 들어왔네!',
      '기숙사 방에 새로운 게이밍 컴퓨터 놓았어 🖥️',
      '주식 이번 주에 오를 것 같아 📈',
      '상담실에서 감정신호등 등록하고 용돈 받았어요!'
    ];
    setInterval(() => {
      if (Math.random() < 0.4) {
        const npc = mockNPCs[Math.floor(Math.random() * mockNPCs.length)];
        const text = npcChats[Math.floor(Math.random() * npcChats.length)];
        if (onChatMessageCb) {
          onChatMessageCb({
            name: npc.name,
            job: npc.job,
            msg: text,
            ts: Date.now()
          });
        }
      }
    }, 15000);
  }

  return {
    init,
    updatePosition,
    sendMessage,
    saveRoom: (studentName, roomData) => {
      if (isConnected && db) {
        db.ref(`rooms/${studentName}`).set(roomData);
      }
    }
  };
})();
