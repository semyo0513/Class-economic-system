// ============================================================
// Phaser 3 메인 루프 & 6대 테마 타운 & 캐릭터 장착 아이템 시스템 (js/game.js)
// ============================================================

const GameState = {
  student: null,
  rankingList: [],
  settings: {},
  isAdmin: false,
  equippedItems: {},
  remotePlayers: {},
  chatBubbles: {}
};

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    try {
      // 1. 타일 및 캐릭터 스프라이트 (저장된 스타일 적용)
      const tilesetCvs = AssetGenerator.generateTileset();
      this.textures.addCanvas('tileset', tilesetCvs);

      const myName = GameState.student ? (GameState.student.name || GameState.student.이름 || '') : '';
      let savedStyle = {};
      try {
        savedStyle = JSON.parse(localStorage.getItem(`char_style_${myName}`) || '{}');
      } catch (_) {}
      GameState.characterStyle = savedStyle;

      const charCvs = AssetGenerator.generateCharacterSpritesheet(savedStyle);
      const charTexture = this.textures.addCanvas('character', charCvs);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const frameIndex = row * 4 + col;
          charTexture.add(frameIndex, 0, col * 32, row * 48, 32, 48);
        }
      }

      // 2. 환경 소품
      this.textures.addCanvas('tree_pink', AssetGenerator.generateTreeSprite(true));
      this.textures.addCanvas('tree_green', AssetGenerator.generateTreeSprite(false));
      this.textures.addCanvas('fountain', AssetGenerator.generateFountainSprite());
      this.textures.addCanvas('prop_lamp', AssetGenerator.generatePropSprite('lamp'));
      this.textures.addCanvas('prop_bench', AssetGenerator.generatePropSprite('bench'));
      this.textures.addCanvas('prop_mailbox', AssetGenerator.generatePropSprite('mailbox'));

      // 3. 14개 건물 (2.5D 입체 텍스처)
      TownMapData.BUILDINGS.forEach(b => {
        try {
          const bCvs = AssetGenerator.generateBuildingSprite(b);
          this.textures.addCanvas(`building_${b.id}`, bCvs);
        } catch (err) {
          console.error(`Failed to create texture for building_${b.id}:`, err);
        }
      });

      // 4. 놀이동산 오브젝트
      this.textures.addCanvas('amuse_ferris_wheel', AssetGenerator.generateAmusementSprite('ferris_wheel'));
      this.textures.addCanvas('amuse_carousel', AssetGenerator.generateAmusementSprite('carousel'));
      this.textures.addCanvas('amuse_roller_coaster', AssetGenerator.generateAmusementSprite('roller_coaster'));
      this.textures.addCanvas('amuse_circus_tent', AssetGenerator.generateAmusementSprite('circus_tent'));
      this.textures.addCanvas('amuse_popcorn_cart', AssetGenerator.generateAmusementSprite('popcorn_cart'));

      // 5. 워터파크 & 캠핑장 오브젝트
      this.textures.addCanvas('wp_water_slide', AssetGenerator.generateWaterparkSprite('water_slide'));
      this.textures.addCanvas('wp_duck_boat', AssetGenerator.generateWaterparkSprite('duck_boat'));
      this.textures.addCanvas('wp_beach_umbrella', AssetGenerator.generateWaterparkSprite('beach_umbrella'));
      this.textures.addCanvas('camp_tent', AssetGenerator.generateCampingSprite('camp_tent'));
      this.textures.addCanvas('campfire', AssetGenerator.generateCampingSprite('campfire'));

      // 6. 동물 NPC
      this.textures.addCanvas('npc_bear', AssetGenerator.generateAnimalNPCSprite('bear'));
      this.textures.addCanvas('npc_rabbit', AssetGenerator.generateAnimalNPCSprite('rabbit'));
      this.textures.addCanvas('npc_cat', AssetGenerator.generateAnimalNPCSprite('cat'));
      this.textures.addCanvas('npc_panda', AssetGenerator.generateAnimalNPCSprite('panda'));
      this.textures.addCanvas('npc_fox', AssetGenerator.generateAnimalNPCSprite('fox'));

      // 7. 장착 아이템 오버레이
      this.textures.addCanvas('equip_wings', AssetGenerator.generateEquipOverlay('wings_angel'));
      this.textures.addCanvas('equip_kickboard', AssetGenerator.generateEquipOverlay('mount_kickboard'));

    } catch (e) {
      console.error('[BootScene Error]', e);
    }
  }

  create() {
    const anims = this.anims;
    const dirs = ['down', 'left', 'right', 'up'];

    dirs.forEach((dir, row) => {
      anims.create({
        key: `walk_${dir}`,
        frames: [
          { key: 'character', frame: row * 4 },
          { key: 'character', frame: row * 4 + 1 },
          { key: 'character', frame: row * 4 + 2 },
          { key: 'character', frame: row * 4 + 3 }
        ],
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
    this.wingsSprite = null;
    this.mountSprite = null;
    this.auraEmitter = null;
    this.cursors = null;
    this.wasd = null;
    this.interactKey = null;
    this.currentDirection = 'down';
    this.nearTarget = null;
    this.otherPlayerSprites = {};
    this.interactPrompt = null;
    this.lastMinimapUpdate = 0;
  }

  create() {
    window.MainGameScene = this;
    const TILE_SIZE = CONFIG.GAME.TILE_SIZE;
    const mapGrid = TownMapData.createTileGrid();

    // 1. 타일맵
    const map = this.make.tilemap({
      data: mapGrid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE
    });
    const tiles = map.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0);
    this.groundLayer = map.createLayer(0, tiles, 0, 0);
    this.groundLayer.setCollision([3]);

    const worldW = TownMapData.WIDTH * TILE_SIZE;
    const worldH = TownMapData.HEIGHT * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.interactTargets = [];

    // 2. 환경 소품 (인터랙티브 클릭 & 접근 지원)
    TownMapData.PROPS.forEach(p => {
      let key = 'fountain';
      if (p.type === 'lamp') key = 'prop_lamp';
      if (p.type === 'bench') key = 'prop_bench';
      if (p.type === 'mailbox') key = 'prop_mailbox';
      const spr = this.physics.add.staticSprite(p.x, p.y, key);
      spr.setDepth(p.y);
      spr.setInteractive({ cursor: 'pointer' });
      spr.on('pointerdown', () => this.executeInteraction({ type: 'prop', data: p, name: p.name || p.type, emoji: p.emoji || '✨' }));

      this.interactTargets.push({
        type: 'prop',
        data: p,
        name: p.name || p.type,
        emoji: p.emoji || '✨',
        x: p.x,
        y: p.y + 10,
        radius: p.radius || 50
      });
    });

    TownMapData.TREES.forEach(t => {
      const key = t.isPink ? 'tree_pink' : 'tree_green';
      const tree = this.physics.add.staticSprite(t.x, t.y, key);
      tree.body.setSize(24, 20);
      tree.body.setOffset(20, 56);
      tree.setDepth(t.y + 40);
    });

    // 3. 14개 건물 (클릭 & 접근 인터랙션)
    this.buildingGroup = this.physics.add.staticGroup();

    TownMapData.BUILDINGS.forEach(b => {
      const bx = b.tileX * TILE_SIZE;
      const by = b.tileY * TILE_SIZE;
      const bSpr = this.buildingGroup.create(bx + b.w / 2, by + b.h / 2, `building_${b.id}`);
      bSpr.setDepth(by + b.h);
      bSpr.body.setSize(b.w - 20, 60);
      bSpr.body.setOffset(10, b.h - 60);
      bSpr.setInteractive({ cursor: 'pointer' });
      bSpr.on('pointerdown', () => this.executeInteraction({ type: 'building', id: b.id, name: b.name, emoji: b.signEmoji }));

      this.interactTargets.push({
        type: 'building',
        id: b.id,
        name: b.name,
        emoji: b.signEmoji,
        x: bx + b.w / 2,
        y: by + b.h + 10,
        radius: 65
      });
    });

    // 4. 놀이동산 어트랙션 (클릭 & 접근 인터랙션)
    TownMapData.AMUSEMENTS.forEach(a => {
      const aSpr = this.physics.add.staticSprite(a.x, a.y, `amuse_${a.type}`);
      aSpr.setDepth(a.y + 20);
      aSpr.setInteractive({ cursor: 'pointer' });
      aSpr.on('pointerdown', () => this.executeInteraction({ type: 'ride', data: a, name: a.name, emoji: a.emoji }));

      this.interactTargets.push({
        type: 'ride',
        data: a,
        name: a.name,
        emoji: a.emoji,
        x: a.x,
        y: a.y + 30,
        radius: 65
      });
    });

    // 5. 워터파크 & 캠핑장 (클릭 & 접근 인터랙션)
    TownMapData.WATERPARK.forEach(w => {
      const wSpr = this.physics.add.staticSprite(w.x, w.y, `wp_${w.type}`);
      wSpr.setDepth(w.y + 20);
      wSpr.setInteractive({ cursor: 'pointer' });
      wSpr.on('pointerdown', () => this.executeInteraction({
        type: 'ride',
        data: { name: w.name, emoji: w.emoji, rideTitle: w.name, rideColor: '#0284c7' },
        name: w.name,
        emoji: w.emoji
      }));

      this.interactTargets.push({
        type: 'ride',
        data: { name: w.name, emoji: w.emoji, rideTitle: w.name, rideColor: '#0284c7' },
        name: w.name,
        emoji: w.emoji,
        x: w.x,
        y: w.y + 20,
        radius: 60
      });
    });

    TownMapData.CAMPING.forEach(c => {
      const cSpr = this.physics.add.staticSprite(c.x, c.y, c.type);
      cSpr.setDepth(c.y + 20);
      cSpr.setInteractive({ cursor: 'pointer' });
      cSpr.on('pointerdown', () => this.executeInteraction({
        type: 'prop',
        data: { type: c.type, name: c.name },
        name: c.name,
        emoji: c.emoji
      }));

      this.interactTargets.push({
        type: 'prop',
        data: { type: c.type, name: c.name },
        name: c.name,
        emoji: c.emoji,
        x: c.x,
        y: c.y + 20,
        radius: 55
      });
    });

    // 6. 동물 NPC (클릭 & 접근 대화 모달 연동)
    TownMapData.NPCS.forEach(n => {
      const npcSpr = this.physics.add.staticSprite(n.x, n.y, `npc_${n.type}`);
      npcSpr.setDepth(n.y + 15);
      npcSpr.setInteractive({ cursor: 'pointer' });
      npcSpr.on('pointerdown', () => this.executeInteraction({ type: 'npc', data: n, name: n.name, emoji: '💬' }));

      this.add.text(n.x, n.y - 30, n.name, {
        fontSize: '10px',
        fill: '#fef08a',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(9999);

      this.interactTargets.push({
        type: 'npc',
        data: n,
        name: n.name,
        emoji: '💬',
        x: n.x,
        y: n.y + 10,
        radius: 55
      });
    });

    // 7. 플레이어 생성 & 장착 오버레이
    const spawnX = TownMapData.SPAWN_X;
    const spawnY = TownMapData.SPAWN_Y;

    this.player = this.physics.add.sprite(spawnX, spawnY, 'character', 0);
    this.player.body.setSize(20, 18);
    this.player.body.setOffset(6, 28);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.buildingGroup);

    // 날개 & 킥보드 오버레이 스프라이트 & 특수 오라 그래픽스
    this.wingsSprite = this.add.sprite(spawnX, spawnY - 10, 'equip_wings').setDepth(9990).setVisible(false);
    this.mountSprite = this.add.sprite(spawnX, spawnY + 14, 'equip_kickboard').setDepth(9991).setVisible(false);
    this.auraGraphics = this.add.graphics().setDepth(9980);
    this.auraAngle = 0;

    const st = GameState.student;
    const myDispName = st ? `${st.name || st.이름} (${st.job || st.직업명 || '학생'})` : '나';
    this.playerNameTag = this.add.text(spawnX, spawnY - 32, myDispName, {
      fontSize: '11px',
      fill: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(9999);

    this.playerBubble = this.add.text(spawnX, spawnY - 52, '', {
      fontSize: '12px',
      fill: '#1e293b',
      backgroundColor: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      padding: { x: 6, y: 4 }
    }).setOrigin(0.5).setDepth(10000).setVisible(false);

    this.interactPrompt = this.add.text(spawnX, spawnY - 45, '', {
      fontSize: '12px',
      fontWeight: 'bold',
      fill: '#fef08a',
      backgroundColor: '#1e293b',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(10001).setVisible(false);

    // 8. 카메라 & 입력 키
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setZoom(CONFIG.GAME.CAMERA_ZOOM);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.createCherryBlossomParticles();

    // 멀티플레이어
    if (GameState.student) {
      const studentName = GameState.student.name || GameState.student.이름;
      Realtime.init(
        studentName,
        (players) => this.handleRemotePlayers(players),
        (chat) => this.handleChatMessage(chat)
      );
    }
  }

  createCherryBlossomParticles() {
    const cvs = document.createElement('canvas');
    cvs.width = 8; cvs.height = 8;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#ffb7b2';
    ctx.beginPath(); ctx.ellipse(4, 4, 3, 2, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    this.textures.addCanvas('petal', cvs);

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

    const modal = document.getElementById('modal-overlay');
    if (modal && modal.style.display === 'flex') {
      this.player.body.setVelocity(0);
      this.player.anims.play(`idle_${this.currentDirection}`, true);
      return;
    }

    // ─── 캐릭터 장착 아이템 효과 실시간 반영 ───
    const equips = GameState.equippedItems || {};
    let speedMult = 1.0;

    if (equips.speed_shoes) speedMult = 1.8;
    if (equips.giant_grow) this.player.setScale(1.5);
    else this.player.setScale(1.0);

    if (this.wingsSprite) {
      this.wingsSprite.setVisible(!!equips.angel_wings);
      this.wingsSprite.setPosition(this.player.x, this.player.y - (equips.giant_grow ? 15 : 10));
      this.wingsSprite.setDepth(this.player.depth - 1);
    }

    if (this.mountSprite) {
      this.mountSprite.setVisible(!!equips.kickboard);
      this.mountSprite.setPosition(this.player.x, this.player.y + (equips.giant_grow ? 20 : 14));
      this.mountSprite.setDepth(this.player.depth + 1);
    }

    // ─── 특수 오라(Aura) 실시간 시각 효과 렌더링 ───
    if (this.auraGraphics) {
      this.auraGraphics.clear();
      const auraType = (GameState.characterStyle && GameState.characterStyle.aura) || null;
      if (auraType && auraType !== 'none') {
        this.auraAngle = (this.auraAngle || 0) + 0.05;
        const px = this.player.x, py = this.player.y + 6;
        const radius = (equips.giant_grow ? 30 : 20);

        if (auraType === 'gold') {
          // 황금빛 회전 링 & 반짝임 오라
          this.auraGraphics.lineStyle(3, 0xf59e0b, 0.85);
          this.auraGraphics.strokeCircle(px, py, radius + Math.sin(this.auraAngle * 2) * 3);
          this.auraGraphics.fillStyle(0xfbbf24, 0.25);
          this.auraGraphics.fillCircle(px, py, radius);

          // 회전하는 4개의 황금 파티클
          for (let i = 0; i < 4; i++) {
            const ang = this.auraAngle + (i * Math.PI / 2);
            const ox = px + Math.cos(ang) * (radius + 4);
            const oy = py + Math.sin(ang) * (radius + 4) * 0.6;
            this.auraGraphics.fillStyle(0xfffbeb, 0.9);
            this.auraGraphics.fillCircle(ox, oy, 3);
          }
        } else if (auraType === 'cherry') {
          // 벚꽃 잎사귀 휘날림 오라
          this.auraGraphics.lineStyle(2, 0xf472b6, 0.8);
          this.auraGraphics.strokeCircle(px, py, radius + Math.sin(this.auraAngle) * 2);
          this.auraGraphics.fillStyle(0xfbcfe8, 0.3);
          this.auraGraphics.fillCircle(px, py, radius);

          for (let i = 0; i < 5; i++) {
            const ang = this.auraAngle * 1.5 + (i * Math.PI * 2 / 5);
            const ox = px + Math.cos(ang) * (radius + 6);
            const oy = py + Math.sin(ang) * (radius + 6) * 0.7;
            this.auraGraphics.fillStyle(0xf43f5e, 0.85);
            this.auraGraphics.fillCircle(ox, oy, 3.5);
          }
        } else if (auraType === 'rainbow') {
          // 7색 네온 무지개 회전 오라
          const colors = [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7];
          const colorIdx = Math.floor(Date.now() / 150) % colors.length;
          this.auraGraphics.lineStyle(3.5, colors[colorIdx], 0.9);
          this.auraGraphics.strokeCircle(px, py, radius + 2);
          this.auraGraphics.fillStyle(colors[(colorIdx + 2) % colors.length], 0.25);
          this.auraGraphics.fillCircle(px, py, radius);

          for (let i = 0; i < 6; i++) {
            const ang = -this.auraAngle * 2 + (i * Math.PI / 3);
            const ox = px + Math.cos(ang) * (radius + 8);
            const oy = py + Math.sin(ang) * (radius + 8) * 0.6;
            this.auraGraphics.fillStyle(colors[(colorIdx + i) % colors.length], 0.95);
            this.auraGraphics.fillCircle(ox, oy, 3);
          }
        }
        this.auraGraphics.setDepth(this.player.depth - 1);
      }
    }

    const speed = CONFIG.GAME.MOVE_SPEED * speedMult;
    let vx = 0, vy = 0, moving = false;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      vx = -speed; this.currentDirection = 'left'; moving = true;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      vx = speed; this.currentDirection = 'right'; moving = true;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      vy = -speed; this.currentDirection = 'up'; moving = true;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      vy = speed; this.currentDirection = 'down'; moving = true;
    }

    if (window.MobileJoystickVector && (window.MobileJoystickVector.x !== 0 || window.MobileJoystickVector.y !== 0)) {
      vx = window.MobileJoystickVector.x * speed;
      vy = window.MobileJoystickVector.y * speed;
      moving = true;
      if (Math.abs(vx) > Math.abs(vy)) this.currentDirection = vx > 0 ? 'right' : 'left';
      else this.currentDirection = vy > 0 ? 'down' : 'up';
    }

    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    this.player.body.setVelocity(vx, vy);

    if (moving) {
      this.player.anims.play(`walk_${this.currentDirection}`, true);
      if (Math.random() < 0.05) SoundEngine.step();
    } else {
      this.player.anims.play(`idle_${this.currentDirection}`, true);
    }

    this.player.setDepth(this.player.y + 20);
    this.playerNameTag.setPosition(this.player.x, this.player.y - (equips.giant_grow ? 40 : 30));
    this.playerBubble.setPosition(this.player.x, this.player.y - (equips.giant_grow ? 60 : 50));

    Realtime.updatePosition(this.player.x, this.player.y, this.currentDirection, moving);

    this.checkInteractions();
    this.updateMinimap();
  }

  checkInteractions() {
    const px = this.player.x;
    const py = this.player.y;
    let found = null;

    for (const t of this.interactTargets) {
      const dist = Phaser.Math.Distance.Between(px, py, t.x, t.y);
      if (dist <= t.radius) {
        found = t;
        break;
      }
    }

    this.nearTarget = found;

    if (found) {
      let actionText = `${found.emoji} [E] ${found.name} 입장`;
      if (found.type === 'ride') actionText = `${found.emoji} [E] ${found.name} 탑승하기`;
      if (found.type === 'npc') actionText = `${found.emoji} [E] ${found.name} 대화하기`;
      if (found.type === 'prop') actionText = `${found.emoji} [E] ${found.name} 살펴보기`;

      this.interactPrompt.setText(actionText);
      this.interactPrompt.setPosition(px, py - 45);
      this.interactPrompt.setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.executeInteraction(found);
      }
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  executeInteraction(target) {
    if (!target) return;
    if (target.type === 'building') {
      ModalManager.open(target.id);
    } else if (target.type === 'ride') {
      ModalManager.open('ride_modal', target.data);
    } else if (target.type === 'npc') {
      ModalManager.open('npc_modal', target.data);
    } else if (target.type === 'prop') {
      ModalManager.open('structure_modal', target.data);
    }
  }

  // 실시간 미니맵 레이더
  updateMinimap() {
    const now = Date.now();
    if (now - this.lastMinimapUpdate < 150) return;
    this.lastMinimapUpdate = now;

    const cvs = document.getElementById('minimap-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const W = cvs.width, H = cvs.height;
    const worldW = TownMapData.WIDTH * 32, worldH = TownMapData.HEIGHT * 32;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#88d49e'; ctx.fillRect(0, 0, W, H);

    // 워터파크 호수
    const lakeX = (38 / 100) * W, lakeY = (55 / 80) * H, lakeW = (24 / 100) * W, lakeH = (9 / 80) * H;
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(lakeX, lakeY, lakeW, lakeH);

    // 건물 (노란 점)
    TownMapData.BUILDINGS.forEach(b => {
      const bx = (b.tileX / 100) * W, by = (b.tileY / 80) * H;
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx - 2, by - 2, 4, 4);
    });

    // NPC & 놀이기구 (초록 점)
    TownMapData.NPCS.forEach(n => {
      const nx = (n.x / worldW) * W, ny = (n.y / worldH) * H;
      ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(nx, ny, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 다른 플레이어 (파란 점)
    Object.values(this.otherPlayerSprites).forEach(p => {
      if (p.spr) {
        const ox = (p.spr.x / worldW) * W, oy = (p.spr.y / worldH) * H;
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(ox, oy, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    });

    // 내 위치 (빨간 점)
    if (this.player) {
      const px = (this.player.x / worldW) * W, py = (this.player.y / worldH) * H;
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  handleRemotePlayers(players) {
    const st = GameState.student;
    const myName = st ? (st.name || st.이름) : '';

    Object.keys(players).forEach(name => {
      if (name === myName) return;
      const p = players[name];

      if (!this.otherPlayerSprites[name]) {
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
        remote.spr.setPosition(p.x, p.y);
        remote.spr.setDepth(p.y + 20);
        remote.tag.setPosition(p.x, p.y - 30);
        remote.bubble.setPosition(p.x, p.y - 50);

        if (p.moving) remote.spr.anims.play(`walk_${p.dir || 'down'}`, true);
        else remote.spr.anims.play(`idle_${p.dir || 'down'}`, true);
      }
    });
  }

  handleChatMessage(chat) {
    const chatList = document.getElementById('chat-messages-list');
    if (chatList) {
      const el = document.createElement('div');
      el.className = 'chat-item';
      el.innerHTML = `<strong>${chat.name}</strong>: ${chat.msg}`;
      chatList.appendChild(el);
      chatList.scrollTop = chatList.scrollHeight;
    }

    const st = GameState.student;
    const myName = st ? (st.name || st.이름) : '';
    let targetBubble = null;

    if (chat.name === myName) targetBubble = this.playerBubble;
    else if (this.otherPlayerSprites[chat.name]) targetBubble = this.otherPlayerSprites[chat.name].bubble;

    if (targetBubble) {
      targetBubble.setText(chat.msg);
      targetBubble.setVisible(true);
      if (targetBubble.hideTimer) clearTimeout(targetBubble.hideTimer);
      targetBubble.hideTimer = setTimeout(() => {
        targetBubble.setVisible(false);
      }, 5000);
    }
  }

  reloadPlayerTexture() {
    try {
      const style = GameState.characterStyle || {};
      const newCharCvs = AssetGenerator.generateCharacterSpritesheet(style);
      const newTexKey = 'character_' + Date.now();

      const charTexture = this.textures.addCanvas(newTexKey, newCharCvs);
      if (charTexture) {
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            const frameIndex = row * 4 + col;
            charTexture.add(frameIndex, 0, col * 32, row * 48, 32, 48);
          }
        }
      }

      if (this.player) {
        this.player.setTexture(newTexKey, 0);
      }
    } catch (e) {
      console.warn('reloadPlayerTexture safe update error:', e);
    }
  }
}

function initPhaserGame() {
  if (window.GameApp) window.GameApp.destroy(true);

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
