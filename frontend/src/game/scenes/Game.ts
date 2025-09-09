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
            
            // Create edge visualizers if needed (recreate after street switch)
            if (this.edgeVisualizers.length === 0 && currentStreet.edges) {
                this.createEdgeVisualizers(currentStreet, totalStreetPixelWidth);
            }
            
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
        
        // Fix texture wrapping issue
        const npcTexture = this.textures.get('npc-01');
        if (npcTexture) {
            npcTexture.getSourceImage().style.imageRendering = 'pixelated';
            npcTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        
        sprite.anims.play('npc-idle');
        
        return sprite;
    }

    createEdgeVisualizers(streetData: any, totalStreetPixelWidth: number) {
        // Clear existing visualizers
        this.edgeVisualizers.forEach(rect => rect.destroy());
        this.edgeVisualizers = [];
        
        // Different colors for each edge
        const edgeColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0x800080];
        
        // Calculate total street length from edges
        const totalStreetLength = streetData.edges.reduce((sum: number, edge: any) => {
            const edgeLength = Math.sqrt(
                Math.pow(edge.geometry[1][0] - edge.geometry[0][0], 2) + 
                Math.pow(edge.geometry[1][1] - edge.geometry[0][1], 2)
            );
            return sum + edgeLength;
        }, 0);
        
        // Create a visualizer for each edge
        let cumulativeDistance = 0;
        streetData.edges.forEach((edge: any, index: number) => {
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
            
            // Store both rectangle and text
            this.edgeVisualizers.push(rect);
            this.edgeVisualizers.push(edgeText as any);
            
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
            const totalPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            const playerPercent = totalPixelWidth > 0 ? (this.player.x / totalPixelWidth * 100) : 0;
            diagnosticsInfo.push(`Player: X=${this.player.x.toFixed(1)} (${playerPercent.toFixed(1)}% of street)`);
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
            console.log('Up arrow pressed');
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
                console.log(`Player on street ${this.currentStreetId}, position ${streetPosition.toFixed(3)} (${this.player.x}/${totalPixelWidth})`);
            }
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
        
        console.log('Checking for junction...');
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
                console.log(`Player at junction ${junction.id}, finding connected streets...`);
                
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
                    console.log(`Switching from street ${this.currentStreetId} to street ${targetStreetId}`);
                    
                    // Update cooldown timer
                    this.lastJunctionSwitchTime = Date.now();
                    
                    // Switch to the new street at the junction
                    this.switchToStreetAtJunction(targetStreetId, junction.id);
                } else {
                    console.log('No other streets available at this junction');
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

        console.log(`Player reached ${boundary} of street ${this.currentStreetId}`);

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
            console.log(`Auto-switching from street ${this.currentStreetId} to street ${targetStreetId} (reached ${boundary})`);
            
            // Update cooldown timer
            this.lastJunctionSwitchTime = currentTime;
            
            // Position player at the junction location within the target street
            this.switchToStreetAtJunction(targetStreetId, junctionId);
        } else {
            console.log(`No other streets available at ${boundary} of street ${this.currentStreetId}`);
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

    async loadStreetBuildings(streetId: number, playerPosition: 'start' | 'end' = 'start') {
        // Fetch the ASCII representation of the street
        const street = await this.getStreet(streetId);
        
        // Clear any existing buildings
        this.streetBuildings.forEach(building => building.destroy());
        this.streetBuildings = [];
        
        // Create new buildings from ASCII
        let x = 0;
        for (const char of street) {
            console.log(`Loading building character: '${char}'`);
            const building = this.add.image(x, 0, char).setOrigin(0);
            building.y = this.scale.height - building.height;
            x += building.width;
            this.streetBuildings.push(building);
        }
        
        // Update sky size to match street width
        this.sky.setDisplaySize(x, this.scale.height);
        
        // Position player at end if requested
        if (playerPosition === 'end' && this.player) {
            const totalStreetPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            // Position player near the end of the street
            this.player.x = Math.max(0, totalStreetPixelWidth - 100); // Position near end with margin
            
            // Scroll camera to show the player at the end
            const targetScrollX = Math.max(0, this.player.x - this.scale.width * 0.8); // Show player at 80% of screen width
            this.cameras.main.scrollX = targetScrollX;
            
            console.log(`Positioned player at end: playerX=${this.player.x}, cameraScrollX=${this.cameras.main.scrollX}, streetWidth=${totalStreetPixelWidth}`);
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
        if (this.currentStreetData && this.currentStreetData.edges) {
            // Clear and recreate edge visualizers
            this.edgeVisualizers.forEach(viz => viz.destroy());
            this.edgeVisualizers = [];
            
            const totalStreetPixelWidth = this.streetBuildings.reduce((sum, building) => sum + building.width, 0);
            if (totalStreetPixelWidth > 0) {
                this.createEdgeVisualizers(this.currentStreetData, totalStreetPixelWidth);
            }
        }
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
        
        // Clear existing visualizers
        this.edgeVisualizers.forEach(viz => viz.destroy());
        this.edgeVisualizers = [];
        
        // Clear NPC sprites (they'll be recreated for the new street)
        this.npcSprites.forEach(sprite => sprite.destroy());
        this.npcSprites.clear();
        
        // Request new street data and trigger reload
        this.loadStreetBuildings(targetStreetId, playerPosition);
        
        // Request updated data for new street via EventBus
        EventBus.emit('requestStreetSwitch', { streetId: targetStreetId });
        
        console.log(`Switched to street ${targetStreetId}`);
    }

    async switchToStreetAtJunction(targetStreetId: number, junctionId: number) {
        // Update current street
        this.currentStreetId = targetStreetId;
        
        // Clear existing street buildings and NPCs
        this.streetBuildings.forEach(building => building.destroy());
        this.streetBuildings = [];
        
        this.edgeVisualizers.forEach(viz => viz.destroy());
        this.edgeVisualizers = [];
        
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
        
        console.log(`Switched to street ${targetStreetId} at junction ${junctionId} (position ${junctionInfo.position.toFixed(2)}, isAtEnd: ${junctionInfo.isAtEnd})`);
        console.log(`Player positioned at x=${playerX}, facing=${junctionInfo.position > 0.5 ? 'left' : 'right'}`);
    }

    async calculateJunctionPositionInStreet(streetId: number, junctionId: number): Promise<{position: number, isAtEnd: boolean}> {
        try {
            console.log(`Calculating position for junction ${junctionId} in street ${streetId}`);
            // Get the street data with edges from the API
            const response = await fetch(`${this.apiBaseUrl}/street/${streetId}`);
            const streetData = await response.json();
            console.log(`Retrieved street data:`, streetData);
            
            if (!streetData || !streetData.edges) {
                console.log(`No street data or edges found for street ${streetId}`);
                return {position: 0, isAtEnd: false};
            }
            
            console.log(`Street ${streetId} has ${streetData.edges.length} edges`);
            
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
                    console.log(`Junction ${junctionId} found at START of edge ${edge.id}, position: ${position.toFixed(3)}`);
                    return {position, isAtEnd: position > 0.5};
                }
                
                // Add edge length to cumulative distance
                const [start, end] = edge.geometry;
                const edgeLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
                cumulativeDistance += edgeLength;
                
                // Check if junction is at the end of this edge
                if (edge.junction_ids.length > 1 && edge.junction_ids[1] === junctionId) {
                    const position = cumulativeDistance / totalStreetLength;
                    console.log(`Junction ${junctionId} found at END of edge ${edge.id}, position: ${position.toFixed(3)}`);
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
