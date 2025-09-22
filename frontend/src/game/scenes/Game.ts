import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    sky: GameObjects.Image;
    skyline: GameObjects.TileSprite;

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
    currentStreetData: any = null;
    currentEdges: any[] = [];
    lastJunctionSwitchTime: number = 0;
    isCheckingJunction: boolean = false;

    private readonly NPC_SCALE_FACTOR = 2;
    private readonly JUNCTION_SWITCH_COOLDOWN = 1000; // 1 second cooldown
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

    async getStreetView(streetId: number) {
        const response = await fetch(`${this.apiBaseUrl}/street/${streetId}/view`);
        const data = await response.json();
        return data;
    }

    preload() {

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0);
        this.sky.setDisplaySize(this.scale.width, this.scale.height);
        this.sky.setDepth(-1); // Put sky in the back

        // Create skyline as a tiling sprite for parallax effect
        // Position it at the bottom of the screen, behind buildings but in front of sky
        this.skyline = this.add.tileSprite(0, 0, this.scale.width, 200, 'skyline').setOrigin(0, 1);
        this.skyline.y = this.scale.height; // Position at bottom of screen
        this.skyline.setDepth(-0.5); // Behind buildings (default 0) but in front of sky (-1)

    }    

    renderStreetElements(streetData: any) {
        // Clear existing buildings
        this.streetBuildings.forEach(building => building.destroy());
        this.streetBuildings = [];
        
        // Render buildings and junctions
        for (const element of streetData.buildings) {
            if (element.name === 'junction' && element.center !== undefined) {
                // Determine junction asset and depth based on side
                let junctionAsset = element.ascii; // default to '+'
                let junctionDepth = 0; // same layer as buildings by default
                
                if (element.side === 'right') {
                    junctionAsset = 'right-junction';
                    junctionDepth = 10; // in front of buildings
                }
                
                // Junction should be centered at the geometric position
                const junctionImage = this.add.image(element.center, 0, junctionAsset);
                junctionImage.setOrigin(0.5, 0); // Center horizontally, top vertically
                junctionImage.y = this.scale.height - junctionImage.height;
                junctionImage.setDisplaySize(element.width, junctionImage.height);
                junctionImage.setDepth(junctionDepth);
                this.streetBuildings.push(junctionImage);
            } else {
                // Regular building positioned by left edge
                const building = this.add.image(element.position, 0, element.ascii).setOrigin(0);
                building.y = this.scale.height - building.height;
                building.setDisplaySize(element.width, building.height);
                this.streetBuildings.push(building);
            }
        }
        
        // Update sky and skyline sizes
        this.sky.setDisplaySize(streetData.total_pixel_width, this.scale.height);
        
        if (this.skyline) {
            this.skyline.width = streetData.total_pixel_width;
        }
    }

    async create() {
        // Load player data to get current street
        this.playerData = await this.getPlayerData();
        const playerPosition = await this.getPlayerPosition();
        const playerStreetId = playerPosition.street_id || 0; // fallback to street 0
        
        const streetData = await this.getStreetView(playerStreetId);
        this.renderStreetElements(streetData);
        
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
            
            
            // Update or create sprites for all NPCs on current street
            this.manageNPCSprites(npcsOnCurrentStreet, currentStreet, totalStreetPixelWidth);
        }
        
        // Store NPCs for diagnostics
        this.allNPCs = npcs;
        this.currentNPCsOnStreet = npcsOnCurrentStreet;
    }

    calculateNPCStreetPosition(npcData: any, streetData: any): number {
        // Find the edge the NPC is currently on
        const currentEdgeIndex = streetData.edge_ids.indexOf(npcData.current_edge_id);
        if (currentEdgeIndex === -1) return 0;
        
        // Calculate cumulative distance to the start of current edge
        let cumulativeDistance = 0;
        for (let i = 0; i < currentEdgeIndex; i++) {
            const edge = streetData.edges[i];
            const edgeLength = Math.sqrt(
                Math.pow(edge.geometry[1][0] - edge.geometry[0][0], 2) + 
                Math.pow(edge.geometry[1][1] - edge.geometry[0][1], 2)
            );
            cumulativeDistance += edgeLength;
        }
        
        // Add progress through current edge
        const currentEdge = streetData.edges[currentEdgeIndex];
        const currentEdgeLength = Math.sqrt(
            Math.pow(currentEdge.geometry[1][0] - currentEdge.geometry[0][0], 2) + 
            Math.pow(currentEdge.geometry[1][1] - currentEdge.geometry[0][1], 2)
        );
        cumulativeDistance += npcData.progress * currentEdgeLength;
        
        // Calculate total street length
        const totalStreetLength = streetData.edges.reduce((sum: number, edge: any) => {
            const edgeLength = Math.sqrt(
                Math.pow(edge.geometry[1][0] - edge.geometry[0][0], 2) + 
                Math.pow(edge.geometry[1][1] - edge.geometry[0][1], 2)
            );
            return sum + edgeLength;
        }, 0);
        
        // Return position as ratio (0-1) along the street
        return cumulativeDistance / totalStreetLength;
    }

    manageNPCSprites(npcsOnStreet: any[], streetData: any, totalStreetPixelWidth: number) {
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
            const npcPosition = this.calculateNPCStreetPosition(npcData, streetData);
            const newX = npcPosition * totalStreetPixelWidth;
            sprite.x = newX;
        });
    }

    createNPCSprite(npcId: number): Phaser.Physics.Arcade.Sprite {
        const sprite = this.physics.add.sprite(0, 0, 'npc-01');
        sprite.setOrigin(0.5, 1); // Center horizontally, bottom vertically
        sprite.setScale(this.NPC_SCALE_FACTOR);
        sprite.setPosition(0, this.scale.height);
        
        // Apply color tint based on NPC ID
        const colors = [
            0xffffff, // white (original)
            0xff6b6b, // red
            0x4ecdc4, // teal
            0x45b7d1, // blue
            0x96ceb4, // green
            0xfeca57, // yellow
            0xff9ff3, // pink
            0x54a0ff, // light blue
            0x5f27cd, // purple
            0x00d2d3  // cyan
        ];
        sprite.setTint(colors[npcId % colors.length]);
        
        // Fix texture wrapping issue
        const npcTexture = this.textures.get('npc-01');
        if (npcTexture) {
            npcTexture.getSourceImage().style.imageRendering = 'pixelated';
            npcTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        
        sprite.anims.play('npc-idle');
        
        return sprite;
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
            const totalPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            const playerPercent = totalPixelWidth > 0 ? (this.player.x / totalPixelWidth * 100) : 0;
            diagnosticsInfo.push(`Player: X=${this.player.x.toFixed(1)} (${playerPercent.toFixed(1)}% of street)`);
        }
        
        // NPC summary instead of detailed list
        diagnosticsInfo.push(`--- NPCs ---`);
        diagnosticsInfo.push(`Total NPCs: ${this.allNPCs.length}`);
        diagnosticsInfo.push(`On current street: ${npcsOnStreet.length}`);
        diagnosticsInfo.push(`Active sprites: ${this.npcSprites.size}`);
        
        // Zoom info
        diagnosticsInfo.push(`Zoom: ${this.zoomLevel.toFixed(2)}x`);
        
        // Street and edge info
        if (this.currentStreetData && this.currentStreetData.edges) {
            diagnosticsInfo.push(`Street ${this.currentStreetId}: ${this.currentStreetData.edges.length} edges`);
            
            // Calculate geometric street length
            let geometricLength = 0;
            for (const edge of this.currentStreetData.edges) {
                const [start, end] = edge.geometry;
                const edgeLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
                geometricLength += edgeLength;
            }
            
            // Calculate pixel width and ASCII length
            const pixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            const asciiLength = this.streetBuildings.length;
            
            diagnosticsInfo.push(`Geometric length: ${geometricLength.toFixed(1)} units`);
            diagnosticsInfo.push(`ASCII length: ${asciiLength} chars`);
            diagnosticsInfo.push(`Pixel width: ${pixelWidth} px`);
            diagnosticsInfo.push(`Geo→ASCII: ${(asciiLength / geometricLength).toFixed(3)} chars/unit`);
            diagnosticsInfo.push(`ASCII→Pixel: ${(pixelWidth / asciiLength).toFixed(1)} px/char`);
            diagnosticsInfo.push(`Geo→Pixel: ${(pixelWidth / geometricLength).toFixed(2)} px/unit`);
        }
        
        this.diagnosticsText.setText(diagnosticsInfo.join('\n'));
    }

    update() {
        const speed = 10; // Adjust scrolling speed
        let moving = false; // Track if the player is moving
    
        if (this.cursors.left.isDown) {
            // Always move left and play animation
            this.cameras.main.scrollX -= speed; // ✅ Move left
            this.player.x -= speed;
            this.player.anims.play('walk-l', true); // ✅ Play left-walking animation
            moving = true;
            
            // Check if player has moved past the start of the street
            if (this.player.x < 0) {
                this.handleStreetBoundary('start');
            }
        } 
        else if (this.cursors.right.isDown) {
            // Calculate total street width from buildings
            const totalStreetPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            
            // Always move right and play animation
            this.cameras.main.scrollX += speed; // ✅ Move right
            this.player.x += speed;
            this.player.anims.play('walk-r', true); // ✅ Play right-walking animation
            moving = true;
            
            // Check if player has moved past the end of the street
            if (this.player.x > totalStreetPixelWidth) {
                this.handleStreetBoundary('end');
            }
        }
        else if (this.cursors.up.isDown) {
            this.handleJunctionNavigation();
        }

        if (this.player) {
            const relativeX = this.player.x / this.scale.width;
            const relativeY = this.player.y / this.scale.height;
            
            // Calculate position as ratio of geometric street length
            let streetPosition = 0;
            
            if (this.currentStreetData && this.currentStreetData.edges && this.streetBuildings.length > 0) {
                // Calculate total geometric street length
                let totalGeometricLength = 0;
                for (const edge of this.currentStreetData.edges) {
                    const [start, end] = edge.geometry;
                    const edgeLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
                    totalGeometricLength += edgeLength;
                }
                
                // Calculate total pixel width of rendered street
                const totalPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
                
                // Player position as ratio of geometric length
                if (totalPixelWidth > 0) {
                    const pixelRatio = this.player.x / totalPixelWidth;
                    streetPosition = pixelRatio; // This should map directly to geometric ratio
                }
            }
            
            EventBus.emit("playerPosition", { 
                x: relativeX, 
                y: relativeY, 
                streetId: this.currentStreetId,
                streetPosition: Math.max(0, Math.min(1, streetPosition))
            });
            
            // Debug logging
            if (Math.random() < 0.01) { // Only log occasionally to avoid spam
                const totalPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            }
        }

        // ✅ Pause animation when idle
        if (this.player && !moving) {
            this.player.anims.stop();
        }
        
        // Update skyline parallax effect
        if (this.skyline) {
            // Parallax factor: 0.3 means skyline moves at 30% of camera speed
            const parallaxFactor = 0.3;
            this.skyline.tilePositionX = this.cameras.main.scrollX * parallaxFactor;
        }
        
        // Update diagnostics every frame (will show latest player position)
        if (this.diagnosticsText) {
            this.updateDiagnostics(this.currentNPCsOnStreet);
        }
    }

    async handleJunctionNavigation() {
        // Prevent concurrent checks
        if (this.isCheckingJunction) {
            return;
        }
        
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastJunctionSwitchTime < this.JUNCTION_SWITCH_COOLDOWN) {
            console.log('Still in cooldown');
            return; // Still in cooldown
        }
        
        // Check if we have the required data
        if (!this.currentStreetData) {
            console.log('No currentStreetData');
            return;
        }
        if (!this.currentStreetData.edges || this.currentStreetData.edges.length === 0) {
            console.log('No edges in currentStreetData');
            return;
        }
        
        this.isCheckingJunction = true;

        try {
            // Calculate total street pixel width (from buildings)
            const totalStreetPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            
            // Calculate player position as a ratio along the street (0 to 1)
            const playerPosition = totalStreetPixelWidth > 0 ? this.player.x / totalStreetPixelWidth : 0;
            
            // Find if player is near a junction (within threshold)
            const junctionThreshold = 0.02; // 2% of street width tolerance
            const junction = this.findNearbyJunction(playerPosition, junctionThreshold);
            
            if (junction) {
                
                // Get connected streets at this junction
                const connectedStreets = await this.getConnectedStreetsAtJunction(junction.id);
                
                // Check if we're still on the same street (in case of rapid switching)
                if (!this.currentStreetData) {
                    return;
                }
                
                // Filter out current street
                const otherStreets = connectedStreets.filter(streetId => streetId !== this.currentStreetId);
                
                if (otherStreets.length > 0) {
                    // Choose random street if multiple options
                    const targetStreetId = otherStreets[Math.floor(Math.random() * otherStreets.length)];
                    
                    // Update cooldown timer
                    this.lastJunctionSwitchTime = Date.now();
                    
                    // Switch to the new street at the junction
                    this.switchToStreetAtJunction(targetStreetId, junction.id);
                } else {
                }
            }
        } finally {
            this.isCheckingJunction = false;
        }
    }

    async handleStreetBoundary(boundary: 'start' | 'end') {
        // Check cooldown to prevent rapid boundary switching
        const currentTime = Date.now();
        if (currentTime - this.lastJunctionSwitchTime < this.JUNCTION_SWITCH_COOLDOWN) {
            return;
        }

        if (!this.currentStreetData || !this.currentStreetData.edges) {
            return;
        }


        let junctionId: number;
        
        if (boundary === 'start') {
            // At start of street - use first junction of first edge
            const firstEdge = this.currentStreetData.edges[0];
            junctionId = firstEdge.junction_ids[0];
        } else {
            // At end of street - use last junction of last edge
            const lastEdge = this.currentStreetData.edges[this.currentStreetData.edges.length - 1];
            junctionId = lastEdge.junction_ids[1];
        }

        // Get connected streets at this junction
        const connectedStreets = await this.getConnectedStreetsAtJunction(junctionId);
        
        // Filter out current street
        const otherStreets = connectedStreets.filter(streetId => streetId !== this.currentStreetId);
        
        if (otherStreets.length > 0) {
            // Choose random street if multiple options
            const targetStreetId = otherStreets[Math.floor(Math.random() * otherStreets.length)];
            
            // Update cooldown timer
            this.lastJunctionSwitchTime = currentTime;
            
            // Position player at the junction location within the target street
            this.switchToStreetAtJunction(targetStreetId, junctionId);
        } else {
        }
    }

    findNearbyJunction(playerPosition: number, threshold: number): any | null {
        if (!this.currentStreetData || !this.currentStreetData.edges) {
            return null;
        }

        // Calculate total street length
        const totalStreetLength = this.currentStreetData.edges.reduce((sum: number, edge: any) => {
            const edgeLength = Math.sqrt(
                Math.pow(edge.geometry[1][0] - edge.geometry[0][0], 2) + 
                Math.pow(edge.geometry[1][1] - edge.geometry[0][1], 2)
            );
            return sum + edgeLength;
        }, 0);

        // Check junction at the start of the street (first edge, first junction)
        if (Math.abs(playerPosition - 0) < threshold) {
            const firstEdge = this.currentStreetData.edges[0];
            return { id: firstEdge.junction_ids[0], position: 0 };
        }

        // Check junction at the end of the street (last edge, last junction)
        if (Math.abs(playerPosition - 1) < threshold) {
            const lastEdge = this.currentStreetData.edges[this.currentStreetData.edges.length - 1];
            return { id: lastEdge.junction_ids[1], position: 1 };
        }

        // Check junctions between edges (only if there are multiple edges)
        if (this.currentStreetData.edges.length > 1) {
            let cumulativeDistance = 0;
            
            for (let i = 1; i < this.currentStreetData.edges.length; i++) {
                // Add length of previous edge
                const prevEdge = this.currentStreetData.edges[i - 1];
                const edgeLength = Math.sqrt(
                    Math.pow(prevEdge.geometry[1][0] - prevEdge.geometry[0][0], 2) + 
                    Math.pow(prevEdge.geometry[1][1] - prevEdge.geometry[0][1], 2)
                );
                cumulativeDistance += edgeLength;
                
                // Convert to ratio (0-1)
                const junctionPosition = cumulativeDistance / totalStreetLength;
                
                // Check if player is near this junction
                if (Math.abs(playerPosition - junctionPosition) < threshold) {
                    const currentEdge = this.currentStreetData.edges[i - 1];
                    const nextEdge = this.currentStreetData.edges[i];
                    
                    // Find shared junction
                    const sharedJunctions = currentEdge.junction_ids.filter((jId: number) => 
                        nextEdge.junction_ids.includes(jId)
                    );
                    
                    if (sharedJunctions.length > 0) {
                        return { id: sharedJunctions[0], position: junctionPosition };
                    }
                }
            }
        }
        
        return null;
    }

    async getConnectedStreetsAtJunction(junctionId: number): Promise<number[]> {
        try {
            // Fetch junction data from backend
            const response = await fetch(`${this.apiBaseUrl}/edges`);
            const edges = await response.json();
            
            // Find all edges connected to this junction
            const connectedEdges = edges.filter((edge: any) => 
                edge.junction_ids.includes(junctionId)
            );
            
            // Get unique street IDs from connected edges
            const streetIds = [...new Set(connectedEdges.map((edge: any) => edge.street_id))];
            
            return streetIds;
        } catch (error) {
            console.error('Error fetching connected streets:', error);
            return [];
        }
    }

    calculateGeometricJunctionPositions(streetData: any): Map<number, number> {
        const positions = new Map<number, number>();
        
        if (!streetData || !streetData.edges) {
            return positions;
        }
        
        // Calculate total street length
        const totalLength = streetData.edges.reduce((sum: number, edge: any) => {
            const [start, end] = edge.geometry;
            return sum + Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
        }, 0);
        
        // Find positions of junctions
        let cumulative = 0;
        let asciiPosition = 0;
        
        // Track building count before each junction
        for (let i = 0; i < streetData.edges.length; i++) {
            const edge = streetData.edges[i];
            const [start, end] = edge.geometry;
            const edgeLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
            
            // Check for junction at end of this edge (if not last edge)
            if (i < streetData.edges.length - 1) {
                cumulative += edgeLength;
                const nextEdge = streetData.edges[i + 1];
                
                // Check if there's a junction here that connects to other streets
                if (edge.junction_ids && nextEdge.junction_ids) {
                    const shared = edge.junction_ids.filter((jId: number) => 
                        nextEdge.junction_ids.includes(jId));
                    
                    if (shared.length > 0) {
                        // This is where a junction should appear geometrically
                        const geometricRatio = cumulative / totalLength;
                        // Store this for the ASCII position where junction will appear
                        // (We'll match this up with the ASCII string later)
                        positions.set(shared[0], geometricRatio);
                    }
                }
            } else {
                cumulative += edgeLength;
            }
        }
        
        return positions;
    }

    async loadStreetBuildings(streetId: number, playerPosition: 'start' | 'end' = 'start') {
        // Fetch the building positions for the street
        const streetData = await this.getStreetView(streetId);
        
        // Use shared method to render street elements
        this.renderStreetElements(streetData);
        
        // Store total street width
        const totalStreetPixelWidth = streetData.total_pixel_width;
        
        // Position player at end if requested
        if (playerPosition === 'end' && this.player) {
            // Position player near the end of the street
            this.player.x = Math.max(0, totalStreetPixelWidth - 100); // Position near end with margin
            
            // Scroll camera to show the player at the end
            const targetScrollX = Math.max(0, this.player.x - this.scale.width * 0.8); // Show player at 80% of screen width
            this.cameras.main.scrollX = targetScrollX;
            
        }
        
        // Bring player to front if it exists
        if (this.player) {
            this.children.bringToTop(this.player);
        }
        
        // Also bring NPCs to front
        this.npcSprites.forEach(sprite => {
            this.children.bringToTop(sprite);
        });
        
        // Recreate edge visualizers if we have street data
    }

    switchToStreet(targetStreetId: number, playerPosition: 'start' | 'end' = 'start') {
        // Update current street
        this.currentStreetId = targetStreetId;
        
        // Position player based on parameter
        if (playerPosition === 'start') {
            this.player.x = 0;
            this.cameras.main.scrollX = 0;
        }
        // Note: 'end' positioning will be set after buildings are loaded
        
        // Clear existing street buildings
        this.streetBuildings.forEach(building => building.destroy());
        this.streetBuildings = [];
        
        
        // Clear NPC sprites (they'll be recreated for the new street)
        this.npcSprites.forEach(sprite => sprite.destroy());
        this.npcSprites.clear();
        
        // Request new street data and trigger reload
        this.loadStreetBuildings(targetStreetId, playerPosition);
        
        // Request updated data for new street via EventBus
        EventBus.emit('requestStreetSwitch', { streetId: targetStreetId });
        
    }

    async switchToStreetAtJunction(targetStreetId: number, junctionId: number) {
        // Update current street
        this.currentStreetId = targetStreetId;
        
        // Clear existing street buildings and NPCs
        this.streetBuildings.forEach(building => building.destroy());
        this.streetBuildings = [];
        
        
        this.npcSprites.forEach(sprite => sprite.destroy());
        this.npcSprites.clear();
        
        // Load street buildings first
        await this.loadStreetBuildings(targetStreetId, 'start');
        
        // Calculate junction position within the new street
        const junctionInfo = await this.calculateJunctionPositionInStreet(targetStreetId, junctionId);
        
        // Position player at the junction
        const totalStreetPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
        const playerX = junctionInfo.position * totalStreetPixelWidth;
        
        this.player.x = playerX;
        this.cameras.main.scrollX = playerX;
        
        // Set player facing direction based on junction location
        // If junction is at start of street (position ~0), player should face right
        // If junction is at end of street (position ~1), player should face left  
        if (junctionInfo.position < 0.5) {
            this.player.setTexture('figure-lr'); // Face right
        } else {
            this.player.setTexture('figure-rl'); // Face left
        }
        
        // Request updated data for new street via EventBus
        EventBus.emit('requestStreetSwitch', { streetId: targetStreetId });
        
    }

    async calculateJunctionPositionInStreet(streetId: number, junctionId: number): Promise<{position: number, isAtEnd: boolean}> {
        try {
            // Get the street data with edges from the API
            const response = await fetch(`${this.apiBaseUrl}/street/${streetId}`);
            const streetData = await response.json();
            
            if (!streetData || !streetData.edges) {
                return {position: 0, isAtEnd: false};
            }
            
            
            let cumulativeDistance = 0;
            let totalStreetLength = 0;
            
            // Calculate total street length first
            for (const edge of streetData.edges) {
                const [start, end] = edge.geometry;
                const edgeLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
                totalStreetLength += edgeLength;
            }
            
            // Find junction position
            for (let i = 0; i < streetData.edges.length; i++) {
                const edge = streetData.edges[i];
                console.log(`Checking edge ${edge.id} with junction_ids: [${edge.junction_ids[0]}, ${edge.junction_ids[1]}]`);
                
                // Check if junction is at the start of this edge
                if (edge.junction_ids[0] === junctionId) {
                    const position = cumulativeDistance / totalStreetLength;
                    return {position, isAtEnd: position > 0.5};
                }
                
                // Add edge length to cumulative distance
                const [start, end] = edge.geometry;
                const edgeLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
                cumulativeDistance += edgeLength;
                
                // Check if junction is at the end of this edge
                if (edge.junction_ids.length > 1 && edge.junction_ids[1] === junctionId) {
                    const position = cumulativeDistance / totalStreetLength;
                    return {position, isAtEnd: position > 0.5};
                }
            }
            
            // Junction not found, default to start
            return {position: 0, isAtEnd: false};
        } catch (error) {
            console.error('Error calculating junction position:', error);
            return {position: 0, isAtEnd: false};
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
