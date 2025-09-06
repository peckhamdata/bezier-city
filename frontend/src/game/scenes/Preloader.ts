import { Scene } from 'phaser';
import { getBuildings } from '../api';

export class Preloader extends Scene {
    private buildings: Record<string, Building> = {};
    private loadingBar!: Phaser.GameObjects.Rectangle;

    constructor() {
        super({ key: "Preloader" });
    }

    preload() {
        this.createLoadingBar(); // ✅ Setup progress bar
    }

    async create() {
        try {
            this.buildings = await getBuildings(); // ✅ Fetch API data asynchronously
            this.registry.set("buildings", this.buildings); // ✅ Store buildings in registry

            const level = "1";
            let assetsToLoad = 0;

            for (const [id, building] of Object.entries(this.buildings)) {
                const assetUrl = building.assets[level];
                if (assetUrl) {
                    this.load.image(id, assetUrl);
                    assetsToLoad++;
                }
            }

            const spritesheets = [
                { key: 'figure-lr', path: 'assets/figure-lr.png' },
                { key: 'figure-rl', path: 'assets/figure-rl.png' }
            ];
            
            spritesheets.forEach(sheet => {
                this.load.spritesheet(sheet.key, sheet.path, {
                    frameWidth: 153,
                    frameHeight: 134,
                    startFrame: 0,
                    endFrame: 13
                });
            });

            this.load.spritesheet('npc-01', 'assets/npcs/01_npc.png', {
                frameWidth: 32,
                frameHeight: 64,
                startFrame: 0,
                endFrame: 1,
                margin: 0,
                spacing: 0
            });
    
            this.load.image('hm', 'assets/01_hm.png');


            if (assetsToLoad > 0) {
                this.load.on("progress", (value: number) => {
                    this.updateLoadingBar(value);
                });

                this.load.once("complete", () => {
                    this.scene.start("Game"); // ✅ Transition to `Game` when assets are loaded
                });

                this.load.start(); // ✅ Start loading assets after API response
            } else {
                this.scene.start("Game"); // ✅ No assets to load, transition immediately
            }
        } catch (error) {
            console.error("Error loading buildings:", error);
        }
    }

    private createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.rectangle(width / 2, height / 2, 320, 50, 0x222222).setOrigin(0.5);

        this.loadingBar = this.add.rectangle(width / 2 - 160, height / 2, 0, 50, 0xffffff)
            .setOrigin(0, 0.5);
    }

    private updateLoadingBar(progress: number) {
        this.loadingBar.width = progress * 320; // ✅ Scale bar width based on progress
    }
}

