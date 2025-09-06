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
    npcSprites: Map<number, Phaser.Physics.Arcade.Sprite> = new Map();
    npcUpdateTimer: Phaser.Time.TimerEvent;
    currentStreetId: number = 0; // Start with street 0 where all NPCs are
    zoomLevel: number = 1;
    panX: number = 0;
    diagnosticsText: Phaser.GameObjects.Text;
    currentNPCsOnStreet: any[] = [];
    allNPCs: any[] = [];
    edgeVisualizers: Phaser.GameObjects.Rectangle[] = [];
    currentStreetData: any = null;
    currentEdges: any[] = [];

    private readonly NPC_SCALE_FACTOR = 2;
    private readonly NPC_UPDATE_INTERVAL = 200; // ms
    private readonly MIN_ZOOM = 0.1;
    private readonly MAX_ZOOM = 3;

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
        const playerStreetId = playerPosition.street_id || 0; // fallback to street 0
        
        const street = await this.getStreet(playerStreetId);
        let x:number = 0;
        for (const char of street) {
            console.log(`Loading building character: '${char}'`);
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

        // NPCs will be created dynamically when NPC data is received

        // Listen for NPC updates from the map component
        EventBus.on('npcUpdate', this.handleNPCUpdate, this);

        // Add zoom controls
        this.setupZoomControls();

        // Add diagnostics text
        this.setupDiagnostics();
    }

    handleNPCUpdate(data: { npcs: any[], streets: any[], edges: any[] }) {
        const { npcs, streets, edges } = data;
        
        // Filter NPCs to only those on the current street
        const npcsOnCurrentStreet = npcs.filter((npcData: any) => {
            return npcData.current_street_id === this.currentStreetId;
        });
        
        if (streets.length > 0 && edges.length > 0) {
            // Find the current street data
            const currentStreet = streets.find((street: any) => street.id === this.currentStreetId);
            if (!currentStreet) return;
            
            // Store for later use
            this.currentStreetData = currentStreet;
            this.currentEdges = edges;
            
            // Calculate total street width in pixels (sum of building widths)
            const totalStreetPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            
            // Create edge visualizers if needed
            if (this.edgeVisualizers.length === 0 && currentStreet.segments) {
                this.createEdgeVisualizers(currentStreet, edges, totalStreetPixelWidth);
            }
            
            // Update or create sprites for all NPCs on current street
            this.manageNPCSprites(npcsOnCurrentStreet, edges, currentStreet, totalStreetPixelWidth);
        }
        
        // Store NPCs for diagnostics
        this.allNPCs = npcs;
        this.currentNPCsOnStreet = npcsOnCurrentStreet;
    }

    calculateNPCStreetPosition(npcData: any, edges: any[], streetData: any): number {
        // Find the edge the NPC is currently on
        const currentEdge = edges.find((edge: any) => edge.id === npcData.current_edge_id);
        if (!currentEdge) return 0;
        
        // Calculate cumulative distance to the start of current edge
        let cumulativeDistance = 0;
        for (const segment of streetData.segments) {
            const segmentEdge = edges.find((edge: any) => 
                edge.geometry[0][0] === segment.start.x && 
                edge.geometry[0][1] === segment.start.y
            );
            
            if (segmentEdge && segmentEdge.id === npcData.current_edge_id) {
                break;
            }
            
            // Add this segment's length to cumulative distance
            const segmentLength = Math.sqrt(
                Math.pow(segment.end.x - segment.start.x, 2) + 
                Math.pow(segment.end.y - segment.start.y, 2)
            );
            cumulativeDistance += segmentLength;
        }
        
        // Add progress through current edge
        const currentEdgeLength = Math.sqrt(
            Math.pow(currentEdge.geometry[1][0] - currentEdge.geometry[0][0], 2) + 
            Math.pow(currentEdge.geometry[1][1] - currentEdge.geometry[0][1], 2)
        );
        cumulativeDistance += npcData.progress * currentEdgeLength;
        
        // Calculate total street length
        const totalStreetLength = streetData.segments.reduce((sum: number, segment: any) => {
            const segmentLength = Math.sqrt(
                Math.pow(segment.end.x - segment.start.x, 2) + 
                Math.pow(segment.end.y - segment.start.y, 2)
            );
            return sum + segmentLength;
        }, 0);
        
        // Return position as ratio (0-1) along the street
        return cumulativeDistance / totalStreetLength;
    }

    manageNPCSprites(npcsOnStreet: any[], edges: any[], streetData: any, totalStreetPixelWidth: number) {
        // Get current NPC IDs on street
        const currentNPCIds = new Set(npcsOnStreet.map(npc => npc.id));
        
        // Remove sprites for NPCs no longer on this street
        for (const [npcId, sprite] of this.npcSprites) {
            if (!currentNPCIds.has(npcId)) {
                sprite.destroy();
                this.npcSprites.delete(npcId);
            }
        }
        
        // Create or update sprites for NPCs on current street
        npcsOnStreet.forEach((npcData: any) => {
            let sprite = this.npcSprites.get(npcData.id);
            
            // Create sprite if it doesn't exist
            if (!sprite) {
                sprite = this.createNPCSprite(npcData.id);
                this.npcSprites.set(npcData.id, sprite);
            }
            
            // Update sprite position
            const npcPosition = this.calculateNPCStreetPosition(npcData, edges, streetData);
            const newX = npcPosition * totalStreetPixelWidth;
            sprite.x = newX;
        });
    }

    createNPCSprite(npcId: number): Phaser.Physics.Arcade.Sprite {
        const sprite = this.physics.add.sprite(0, 0, 'npc-01');
        sprite.setOrigin(0.5, 1); // Center horizontally, bottom vertically
        sprite.setScale(this.NPC_SCALE_FACTOR);
        sprite.setPosition(0, this.scale.height);
        
        // Fix texture wrapping issue
        const npcTexture = this.textures.get('npc-01');
        if (npcTexture) {
            npcTexture.getSourceImage().style.imageRendering = 'pixelated';
            npcTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        
        sprite.anims.play('npc-idle');
        
        return sprite;
    }

    createEdgeVisualizers(streetData: any, edges: any[], totalStreetPixelWidth: number) {
        // Clear existing visualizers
        this.edgeVisualizers.forEach(rect => rect.destroy());
        this.edgeVisualizers = [];
        
        // Different colors for each edge
        const edgeColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0x800080];
        
        // Calculate total street length
        const totalStreetLength = streetData.segments.reduce((sum: number, segment: any) => {
            const segmentLength = Math.sqrt(
                Math.pow(segment.end.x - segment.start.x, 2) + 
                Math.pow(segment.end.y - segment.start.y, 2)
            );
            return sum + segmentLength;
        }, 0);
        
        // Get edges for this street
        const streetEdges = edges.filter((edge: any) => edge.street_id === this.currentStreetId);
        
        // Create a visualizer for each edge
        let cumulativeDistance = 0;
        streetEdges.forEach((edge: any, index: number) => {
            const edgeLength = Math.sqrt(
                Math.pow(edge.geometry[1][0] - edge.geometry[0][0], 2) + 
                Math.pow(edge.geometry[1][1] - edge.geometry[0][1], 2)
            );
            
            // Calculate pixel width and position for this edge
            const edgePixelWidth = (edgeLength / totalStreetLength) * totalStreetPixelWidth;
            const edgePixelX = (cumulativeDistance / totalStreetLength) * totalStreetPixelWidth;
            
            // Create a semi-transparent rectangle for this edge
            const rect = this.add.rectangle(
                edgePixelX + edgePixelWidth / 2,
                this.scale.height - 20,
                edgePixelWidth,
                40,
                edgeColors[index % edgeColors.length],
                0.3
            );
            
            // Add edge ID text
            const edgeText = this.add.text(
                edgePixelX + edgePixelWidth / 2,
                this.scale.height - 20,
                `E${edge.id}`,
                { fontSize: '12px', color: '#ffffff' }
            );
            edgeText.setOrigin(0.5);
            
            this.edgeVisualizers.push(rect);
            
            cumulativeDistance += edgeLength;
            
            // Log edge info only if there's an issue
            if (isNaN(edgeLength) || isNaN(edgePixelWidth)) {
                console.error(`Edge ${edge.id} calculation error: length=${edgeLength}, pixels=${edgePixelWidth}`);
            }
        });
    }

    setupZoomControls() {
        // Mouse wheel zoom
        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Phaser.Math.Clamp(this.zoomLevel * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM);
            
            if (newZoom !== this.zoomLevel) {
                this.zoomLevel = newZoom;
                this.updateCameraZoom();
            }
        });

        // Keyboard zoom controls
        const zoomInKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
        const zoomOutKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);

        zoomInKey.on('down', () => {
            this.zoomLevel = Phaser.Math.Clamp(this.zoomLevel * 1.1, this.MIN_ZOOM, this.MAX_ZOOM);
            this.updateCameraZoom();
        });

        zoomOutKey.on('down', () => {
            this.zoomLevel = Phaser.Math.Clamp(this.zoomLevel * 0.9, this.MIN_ZOOM, this.MAX_ZOOM);
            this.updateCameraZoom();
        });
    }

    updateCameraZoom() {
        this.cameras.main.setZoom(this.zoomLevel);
        
        // Emit zoom level to UI
        EventBus.emit('zoomUpdate', this.zoomLevel);
    }

    setupDiagnostics() {
        this.diagnosticsText = this.add.text(10, 10, '', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.diagnosticsText.setScrollFactor(0); // Keep text fixed on screen during camera movement
        this.diagnosticsText.setDepth(1000); // Ensure it's on top
    }

    updateDiagnostics(npcsOnStreet: any[] = []) {
        let diagnosticsInfo = [];
        
        // Player info
        if (this.player) {
            diagnosticsInfo.push(`Player: Y=${this.player.y.toFixed(1)}, X=${this.player.x.toFixed(1)}`);
        }
        
        // All NPCs data
        diagnosticsInfo.push(`--- All NPCs (${this.allNPCs.length}) ---`);
        this.allNPCs.forEach((npcData: any) => {
            const sprite = this.npcSprites.get(npcData.id);
            const spriteInfo = sprite ? ` | Sprite X=${sprite.x.toFixed(1)}` : '';
            const isOnCurrentStreet = npcData.current_street_id === this.currentStreetId ? ' 🔹' : '';
            diagnosticsInfo.push(`${npcData.name}: street=${npcData.current_street_id}, edge=${npcData.current_edge_id}, ${(npcData.progress * 100).toFixed(1)}%${spriteInfo}${isOnCurrentStreet}`);
        });
        
        // Zoom info
        diagnosticsInfo.push(`Zoom: ${this.zoomLevel.toFixed(2)}x`);
        
        // Street and edge info
        if (this.currentStreetData && this.currentEdges.length > 0) {
            const streetEdges = this.currentEdges.filter((edge: any) => edge.street_id === this.currentStreetId);
            diagnosticsInfo.push(`Street ${this.currentStreetId}: ${streetEdges.length} edges`);
        }
        
        this.diagnosticsText.setText(diagnosticsInfo.join('\n'));
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
        
        // Update diagnostics every frame (will show latest player position)
        if (this.diagnosticsText) {
            this.updateDiagnostics(this.currentNPCsOnStreet);
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }

    destroy() {
        // Clean up EventBus listeners
        EventBus.off('npcUpdate', this.handleNPCUpdate, this);
        
        // Clean up NPC sprites
        for (const [npcId, sprite] of this.npcSprites) {
            sprite.destroy();
        }
        this.npcSprites.clear();
        
        super.destroy();
    }
}
