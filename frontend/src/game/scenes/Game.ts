import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    sky: GameObjects.Image;

    apiBaseUrl: string;
    startStreetId: number;
    streetBuildings: GameObjects.Image[] = [];
    player: Phaser.Physics.Arcade.Sprite;
    playerData: any;
    npc: Phaser.Physics.Arcade.Sprite;

    private readonly NPC_SCALE_FACTOR = 2;

    constructor ()
    {
        super('Game');

        this.apiBaseUrl = 'http://localhost:9000';
    }

    async getPlayerData() {
        const response = await fetch(`${this.apiBaseUrl}/player`);
        const data = await response.json();
        return data;
    }

    async getPlayerPosition() {
        const response = await fetch(`${this.apiBaseUrl}/player/position`);
        const data = await response.json();
        return data;
    }

    async getStreet(streetId: number) {
        const response = await fetch(`${this.apiBaseUrl}/street/${streetId}/ascii`);
        const data = await response.json();
        return data.ascii;
    }

    preload() {

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0);
        this.sky.setDisplaySize(this.scale.width, this.scale.height);

    }    

    async create() {
        // Load player data to get current street
        this.playerData = await this.getPlayerData();
        const playerPosition = await this.getPlayerPosition();
        const playerStreetId = playerPosition.street_id || 1; // fallback to street 1
        
        const street = await this.getStreet(playerStreetId);
        let x:number = 0;
        for (const char of street) {
            const building = this.add.image(x, 0, char).setOrigin(0);
            building.y = this.scale.height - building.height;
            x += building.width;
            this.streetBuildings.push(building);    
        }
        this.sky.setDisplaySize(x, this.scale.height);
        EventBus.emit('current-scene-ready', this);

        // Add the HM Sign
        const hm = this.add.image(0, 0, 'hm').setOrigin(0)
        hm.x = this.streetBuildings[2].x
        hm.y = this.streetBuildings[2].y  - this.streetBuildings[2].height + hm.height;

        const animations = [
            { key: 'walk-r', spriteKey: 'figure-lr' },
            { key: 'walk-l', spriteKey: 'figure-rl' }
        ];
        
        animations.forEach(anim => {
            this.anims.create({
                key: anim.key,
                frames: this.anims.generateFrameNumbers(anim.spriteKey),
                frameRate: 10,
                yoyo: false,
                repeat: -1
            });
        });

        this.anims.create({
            key: 'npc-idle',
            frames: this.anims.generateFrameNumbers('npc-01'),
            frameRate: 2,
            yoyo: false,
            repeat: -1
        });
        
        // ✅ Create player and play animation
        const startPosition = 200;
        this.player = this.physics.add.sprite(startPosition, 0, 'figure-lr').setOrigin(0, 1);
        this.player.setPosition(startPosition, this.scale.height);
        this.player.anims.play('walk-r');
        this.cameras.main.scrollX += startPosition;

        // Create NPC on the starting street
        const npcPosition = 400;
        this.npc = this.physics.add.sprite(npcPosition, 0, 'npc-01').setOrigin(0, 1);
        this.npc.setScale(this.NPC_SCALE_FACTOR);
        this.npc.setPosition(npcPosition, this.scale.height);
        
        // Fix texture wrapping issue
        const npcTexture = this.textures.get('npc-01');
        npcTexture.getSourceImage().style.imageRendering = 'pixelated';
        npcTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        
        // this.npc.setGravityY(0); // Disable gravity for NPC
        this.npc.anims.play('npc-idle');
    }    

    update() {
        const speed = 10; // Adjust scrolling speed
        let moving = false; // Track if the player is moving
    
        if (this.cursors.left.isDown) {
            this.cameras.main.scrollX -= speed; // ✅ Move left
            this.player.x -= speed;
            this.player.anims.play('walk-l', true); // ✅ Play left-walking animation
            moving = true;
        } 
        else if (this.cursors.right.isDown) {
            this.cameras.main.scrollX += speed; // ✅ Move right
            this.player.x += speed;
            this.player.anims.play('walk-r', true); // ✅ Play right-walking animation
            moving = true;
        }

        if (this.player) {
            const relativeX = this.player.x / this.scale.width;
            const relativeY = this.player.y / this.scale.height;
            
            EventBus.emit("playerPosition", { x: relativeX, y: relativeY });
        }

        // ✅ Pause animation when idle
        if (this.player && !moving) {
            this.player.anims.stop();
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
