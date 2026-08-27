// ============================================================
// Phaser 3 게임 메인 루프 & 타운 씬 (js/game.js)
// ============================================================

// 전역 게임 상태
const GameState = {
  student: null,
  rankingList: [],
  settings: {},
  isAdmin: false,
  remotePlayers: {},
  chatBubbles: {}
};

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 런타임 캔버스 픽셀 에셋 동적 생성 및 등록
    const tilesetImg = AssetGenerator.generateTileset();
    const charImg = AssetGenerator.generateCharacterSpritesheet();
    const treePinkImg = AssetGenerator.generateTreeSprite(true);
    const treeGreenImg = AssetGenerator.generateTreeSprite(false);
    const fountainImg = AssetGenerator.generateFountainSprite();
    const lampImg = AssetGenerator.generatePropSprite('lamp');
    const benchImg = AssetGenerator.generatePropSprite('bench');
    const mailboxImg = AssetGenerator.generatePropSprite('mailbox');

    this.textures.addBase64('tileset', tilesetImg);
    this.textures.addBase64('character', charImg);
    this.textures.addBase64('tree_pink', treePinkImg);
    this.textures.addBase64('tree_green', treeGreenImg);
    this.textures.addBase64('fountain', fountainImg);
    this.textures.addBase64('prop_lamp', lampImg);
    this.textures.addBase64('prop_bench', benchImg);
    this.textures.addBase64('prop_mailbox', mailboxImg);

    // 14개 건물 텍스처 등록
    TownMapData.BUILDINGS.forEach(b => {
      const bImg = AssetGenerator.generateBuildingSprite(b.roofColor, b.signTitle, b.signEmoji, b.w, b.h);
      this.textures.addBase64(`building_${b.id}`, bImg);
    });
  }

  create() {
    // 캐릭터 4방향 애니메이션 정의 (각 4프레임)
    const anims = this.anims;
    const dirs = ['down', 'left', 'right', 'up'];

    dirs.forEach((dir, row) => {
      anims.create({
        key: `walk_${dir}`,
        frames: anims.generateFrameNumbers('character', { start: row * 4, end: row * 4 + 3 }),
        frameRate: 8,
        repeat: -1
      });
      anims.create({
        key: `idle_${dir}`,
        frames: [{ key: 'character', frame: row * 4 }],
        frameRate: 1
      });
    });

    this.scene.start('TownScene');
  }
}

class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
    this.player = null;
    this.cursors = null;
    this.wasd = null;
    this.interactKey = null;
    this.currentDirection = 'down';
    this.nearBuilding = null;
    this.otherPlayerSprites = {};
    this.interactPrompt = null;
  }

  create() {
    const TILE_SIZE = CONFIG.GAME.TILE_SIZE;
    const mapGrid = TownMapData.createTileGrid();

    // 1. 타일맵 생성
    const map = this.make.tilemap({
      data: mapGrid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE
    });
    const tiles = map.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0);
    this.groundLayer = map.createLayer(0, tiles, 0, 0);

    // 물 타일(3) 충돌 설정
    this.groundLayer.setCollision([3]);

    // 월드 경계 설정
    const worldW = TownMapData.WIDTH * TILE_SIZE;
    const worldH = TownMapData.HEIGHT * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // 2. 환경 오브젝트 (분수, 가로등, 벤치, 나무)
    TownMapData.PROPS.forEach(p => {
      let key = 'fountain';
      if (p.type === 'lamp') key = 'prop_lamp';
      if (p.type === 'bench') key = 'prop_bench';
      if (p.type === 'mailbox') key = 'prop_mailbox';
      const spr = this.physics.add.staticSprite(p.x, p.y, key);
      spr.setDepth(p.y);
    });

    TownMapData.TREES.forEach(t => {
      const key = t.isPink ? 'tree_pink' : 'tree_green';
      const tree = this.physics.add.staticSprite(t.x, t.y, key);
      tree.body.setSize(24, 20);
      tree.body.setOffset(20, 56);
      tree.setDepth(t.y + 40);
    });

    // 3. 14개 건물 오브젝트 및 충돌체 배치
    this.buildingGroup = this.physics.add.staticGroup();
    this.buildingZones = [];

    TownMapData.BUILDINGS.forEach(b => {
      const bx = b.tileX * TILE_SIZE;
      const by = b.tileY * TILE_SIZE;
      const bSpr = this.buildingGroup.create(bx + b.w / 2, by + b.h / 2, `building_${b.id}`);
      bSpr.setDepth(by + b.h);

      // 충돌 바운딩 박스 (하단 벽면)
      bSpr.body.setSize(b.w - 20, 60);
      bSpr.body.setOffset(10, b.h - 60);

      // 상호작용 트리거 영역 (문 앞)
      const triggerZone = {
        id: b.id,
        name: b.name,
        emoji: b.signEmoji,
        x: bx + b.w / 2,
        y: by + b.h + 10,
        radius: 65
      };
      this.buildingZones.push(triggerZone);
    });

    // 4. 플레이어 캐릭터 생성
    const spawnX = TownMapData.SPAWN_X;
    const spawnY = TownMapData.SPAWN_Y;

    this.player = this.physics.add.sprite(spawnX, spawnY, 'character', 0);
    this.player.body.setSize(20, 18);
    this.player.body.setOffset(6, 28);
    this.player.setCollideWorldBounds(true);

    // 충돌 처리
    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.buildingGroup);

    // 플레이어 닉네임 / 직업 태그
    this.playerNameTag = this.add.text(spawnX, spawnY - 32, GameState.student ? `${GameState.student.이름} (${GameState.student.직업명})` : '나', {
      fontSize: '11px',
      fill: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(9999);

    // 플레이어 머리 위 말풍선 텍스트
    this.playerBubble = this.add.text(spawnX, spawnY - 52, '', {
      fontSize: '12px',
      fill: '#1e293b',
      backgroundColor: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      padding: { x: 6, y: 4 }
    }).setOrigin(0.5).setDepth(10000).setVisible(false);

    // 건물 상호작용 프롬프트 안내창 ([E] 키를 눌러 입장)
    this.interactPrompt = this.add.text(spawnX, spawnY - 45, '', {
      fontSize: '12px',
      fontWeight: 'bold',
      fill: '#fef08a',
      backgroundColor: '#1e293b',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(10001).setVisible(false);

    // 5. 카메라 설정
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setZoom(CONFIG.GAME.CAMERA_ZOOM);

    // 6. 입력 키 설정
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 벚꽃 잎 파티클 효과
    this.createCherryBlossomParticles();

    // 멀티플레이어 리스너 초기화
    if (GameState.student) {
      Realtime.init(
        GameState.student.이름,
        (players) => this.handleRemotePlayers(players),
        (chat) => this.handleChatMessage(chat)
      );
    }
  }

  createCherryBlossomParticles() {
    // 가벼운 꽃잎 떨어지는 애니메이션
    const cvs = document.createElement('canvas');
    cvs.width = 8; cvs.height = 8;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#ffb7b2';
    ctx.beginPath(); ctx.ellipse(4, 4, 3, 2, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    this.textures.addBase64('petal', cvs.toDataURL());

    this.add.particles(0, 0, 'petal', {
      x: { min: 0, max: TownMapData.WIDTH * 32 },
      y: 0,
      lifespan: 6000,
      speedY: { min: 40, max: 80 },
      speedX: { min: -20, max: 20 },
      scale: { start: 1, end: 0.5 },
      rotate: { min: 0, max: 360 },
      quantity: 1,
      frequency: 300
    }).setDepth(15000);
  }

  update() {
    if (!this.player) return;

    // 모달창 오픈 중일 때는 이동 일시 중지
    const modal = document.getElementById('modal-overlay');
    if (modal && modal.style.display === 'flex') {
      this.player.body.setVelocity(0);
      this.player.anims.play(`idle_${this.currentDirection}`, true);
      return;
    }

    const speed = CONFIG.GAME.MOVE_SPEED;
    let vx = 0;
    let vy = 0;
    let moving = false;

    // 키보드 입력 체크
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      vx = -speed;
      this.currentDirection = 'left';
      moving = true;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      vx = speed;
      this.currentDirection = 'right';
      moving = true;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      vy = -speed;
      this.currentDirection = 'up';
      moving = true;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      vy = speed;
      this.currentDirection = 'down';
      moving = true;
    }

    // 모바일 가상 조이스틱 연동
    if (window.MobileJoystickVector && (window.MobileJoystickVector.x !== 0 || window.MobileJoystickVector.y !== 0)) {
      vx = window.MobileJoystickVector.x * speed;
      vy = window.MobileJoystickVector.y * speed;
      moving = true;
      if (Math.abs(vx) > Math.abs(vy)) {
        this.currentDirection = vx > 0 ? 'right' : 'left';
      } else {
        this.currentDirection = vy > 0 ? 'down' : 'up';
      }
    }

    // 대각선 이동 속도 정규화
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.body.setVelocity(vx, vy);

    if (moving) {
      this.player.anims.play(`walk_${this.currentDirection}`, true);
      if (Math.random() < 0.05) SoundEngine.step();
    } else {
      this.player.anims.play(`idle_${this.currentDirection}`, true);
    }

    this.player.setDepth(this.player.y + 20);

    // 닉네임 태그 & 말풍선 위치 동기화
    this.playerNameTag.setPosition(this.player.x, this.player.y - 30);
    this.playerBubble.setPosition(this.player.x, this.player.y - 50);

    // 실시간 좌표 전송
    Realtime.updatePosition(this.player.x, this.player.y, this.currentDirection, moving);

    // 건물 근접 상호작용 검사
    this.checkBuildingInteraction();
  }

  checkBuildingInteraction() {
    const px = this.player.x;
    const py = this.player.y;
    let found = null;

    for (const b of this.buildingZones) {
      const dist = Phaser.Math.Distance.Between(px, py, b.x, b.y);
      if (dist <= b.radius) {
        found = b;
        break;
      }
    }

    this.nearBuilding = found;

    if (found) {
      this.interactPrompt.setText(`${found.emoji} [E] ${found.name} 입장`);
      this.interactPrompt.setPosition(px, py - 45);
      this.interactPrompt.setVisible(true);

      // E 키 또는 Space 키로 입장
      if (Phaser.Input.Keyboard.JustDown(this.interactKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        ModalManager.open(found.id);
      }
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  // 원격 플레이어 렌더링 동기화
  handleRemotePlayers(players) {
    const myName = GameState.student ? GameState.student.이름 : '';

    Object.keys(players).forEach(name => {
      if (name === myName) return;
      const p = players[name];

      if (!this.otherPlayerSprites[name]) {
        // 새 플레이어 생성
        const spr = this.physics.add.sprite(p.x, p.y, 'character', 0);
        spr.body.setImmovable(true);
        const tag = this.add.text(p.x, p.y - 30, `${p.name} (${p.job || '학생'})`, {
          fontSize: '11px',
          fill: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(9999);

        const bubble = this.add.text(p.x, p.y - 50, '', {
          fontSize: '12px',
          fill: '#1e293b',
          backgroundColor: '#ffffff',
          stroke: '#000000',
          strokeThickness: 1,
          padding: { x: 6, y: 4 }
        }).setOrigin(0.5).setDepth(10000).setVisible(false);

        this.otherPlayerSprites[name] = { spr, tag, bubble };
      }

      const remote = this.otherPlayerSprites[name];
      if (remote) {
        // 위치 보간
        remote.spr.setPosition(p.x, p.y);
        remote.spr.setDepth(p.y + 20);
        remote.tag.setPosition(p.x, p.y - 30);
        remote.bubble.setPosition(p.x, p.y - 50);

        if (p.moving) {
          remote.spr.anims.play(`walk_${p.dir || 'down'}`, true);
        } else {
          remote.spr.anims.play(`idle_${p.dir || 'down'}`, true);
        }
      }
    });
  }

  // 채팅 메시지 수신 및 말풍선 팝업
  handleChatMessage(chat) {
    // 하단 채팅창에 로그 추가
    const chatList = document.getElementById('chat-messages-list');
    if (chatList) {
      const el = document.createElement('div');
      el.className = 'chat-item';
      el.innerHTML = `<strong>${chat.name}</strong>: ${chat.msg}`;
      chatList.appendChild(el);
      chatList.scrollTop = chatList.scrollHeight;
    }

    // 캐릭터 머리 위 말풍선 렌더링
    const myName = GameState.student ? GameState.student.이름 : '';
    let targetBubble = null;

    if (chat.name === myName) {
      targetBubble = this.playerBubble;
    } else if (this.otherPlayerSprites[chat.name]) {
      targetBubble = this.otherPlayerSprites[chat.name].bubble;
    }

    if (targetBubble) {
      targetBubble.setText(chat.msg);
      targetBubble.setVisible(true);
      if (targetBubble.hideTimer) clearTimeout(targetBubble.hideTimer);
      targetBubble.hideTimer = setTimeout(() => {
        targetBubble.setVisible(false);
      }, 5000);
    }
  }
}

// 게임 인스턴스 초기화 함수
function initPhaserGame() {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-canvas-wrap',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [BootScene, TownScene],
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };

  window.GameApp = new Phaser.Game(config);
}
