import Game from './game.js';
import Street from './street.js';
import GfxRepoClient from './gfx_repo_client.js';
import { request } from 'graphql-request';
import StreetMaker from './street_maker.js';

const urlPieces = [location.protocol, '//', location.host, location.pathname]
const api_root = urlPieces.join('')

const graphql_endpoint = api_root + 'graphql';


class preloadScene extends Phaser.Scene {

      constructor() {
        super({key : 'preloadScene'});
      }

      preload()
      {
        // HACK
        this.load.image('background', 'assets/bg.png')
        this.load.image('foreground', 'assets/foreground.png')  
        //

        this.load.spritesheet('figure-lr', 
                'assets/figure-lr.png',
                { frameWidth: 153, 
                  frameHeight: 134,
                  startFrame: 0,
                  endFrame: 13 });

        this.load.spritesheet('figure-rl', 
                'assets/figure-rl.png',
                { frameWidth: 153, 
                  frameHeight: 134,
                  startFrame: 0,
                  endFrame: 13 });

        const query = `{
            textures {name src}
          }`

        request(graphql_endpoint, query).then(data => {
            data.textures.forEach(value => {
              this.load.image(value.name, value.src);
            });
            this.load.start();
          });

        this.load.on('progress', this.updateBar);
        this.load.on('complete', this.complete, {scene:this.scene});
      }
      updateBar(percentage) {
        console.log("P:" + percentage);
      }

      complete() {
        console.log("COMPLETE!");
        this.scene.start('gameScene');
      }
}

class gameScene extends Phaser.Scene {

      constructor(bc) {
        super({key : 'gameScene'});
        this.bc = bc
        this.i = 200;
        this.gameWidth = 8000 // this.sys.canvas.width;
        this.canvasWidth = 1280
        this.fg;
        this.bg;
        // Parallax Layers
        this.num_layer_images = 10;
        this.num_parallax_layers = 2;

        this.buildings;
        this.cursors;
        this.player;
        this.walking = false;
        this.facing = 'left';
      }

      create ()
      {
          var repo;
          var repeat;

          
          const gameHeight = this.sys.canvas.hight;
          const sky = this.add.image(0, 0, 'sky').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          sky.displayWidth = this.gameWidth;
          this.physics.world.setBounds();

          var sm = new StreetMaker();
          var building_names = ['store', 'tower', 'mall', 'bar', 'store'];
          var street_desc = {
            buildings: sm.make(building_names, 10, 40)
          };

          repo = new GfxRepoClient(graphql_endpoint);
          this.bc.repo = repo;
          this.bc.sky = sky;
          this.bc.max_engagement = 2;
          this.cursors = this.input.keyboard.createCursorKeys();
          this.cameras.main.setViewport(0, 0, this.sys.canvas.width, this.sys.canvas.height);
          this.cameras.main.setScroll(this.i, 0);

          this.input.on('pointerdown', function () {

              // Camera Fun
              // var cam = this.cameras.main;

              //     cam.pan(this.canvasWidth / 2, this.gameHeight / 2);
              //     cam.zoomTo(2);

          }, this);

          var street = new Street(street_desc);
          street.gfx_repo = repo;

          this.fg = [];
          this.bg = [];

          // Parallax Mountains
          var i;
          var j;
          for (j = 0; j < this.num_parallax_layers; j++) {
            var layer = [];
            for (i = 0; i < this.num_layer_images; i++) {
              layer.push(this.add.image(i*1152, 0, 'background').setOrigin(0, 0));  // reset the drawing position of the image to the top-left - default is centre
            }
            this.bg.push(layer);
          }

          var scene = this;
          this.buildings = street.render_buildings(this).then((texture) => {

            // THIS IS A BIT OF A HACK putting the figure and the foreground items
            // in here. They need to be factored out BUT only be added
            // after ALL the background GFX have been added otherwise
            // Z order gets messed up
            // Figure
            var config_1 = {
                key: 'walk-r',
                frames: scene.anims.generateFrameNumbers('figure-lr'),
                frameRate: 10,
                yoyo: false,
                repeat: -1
            };
            var config_2 = {
                key: 'walk-l',
                frames: scene.anims.generateFrameNumbers('figure-rl'),
                frameRate: 10,
                yoyo: false,
                repeat: -1
            };
            var config_3 = {
              key: 'stand',
              frames: scene.anims.generateFrameNumbers('figure-lr', { frames: [1, 2]}),
              frameRate: 10,
              yoyo: false,
              repeat: -1
          };

            var anim = scene.anims.create(config_1);
            var anim_2 = scene.anims.create(config_2);
            scene.player = scene.physics.add.sprite(400, 584, 'figure').setOrigin(0, 0)
            scene.player.anims.load('walk-r');
            scene.player.anims.load('walk-l');
            scene.player.anims.load('stand');
            scene.player.anims.play('stand');
            this.player.anims.pause();
            var i;
            for (i = 0; i < 10; i++) {
              scene.fg.push(scene.add.image(1500+(i*2000), 0, 'foreground').setOrigin(0, 0));  // reset the drawing position of the image to the top-left - default is centre
            }
          });
      }
      // These two functions can be paramaterised and turned into one
      // lots of duplication here.
      go_left () {
        if (this.i > 0) {
          if (!this.walking) {
            if (this.player.anims.isPaused) {
              if (this.facing == 'right') {
                this.player.anims.play('walk-l');
              } else {
                this.player.anims.resume(this.player.anims.currentFrame);
              }
            } else {
              this.player.anims.play('walk-l');
            }
            this.walking = true;
            this.facing = 'left';
          }
          this.i-=10;
          this.cameras.main.setScroll(this.i, 0);
          this.player.x-=10;
          var i = 0;
          var j = 0;
          for(i = 0; i < 10; i++) {
            this.fg[i].x+=20
            for(j = 0; j < this.num_parallax_layers; j++) {
              this.bg[j][i].x-=(5-j)
            }
          }
        }
      }

      go_right () {
        if (this.i < this.gameWidth - this.canvasWidth ) {
          if (!this.walking) {
            if (this.player.anims.isPaused) {
              if (this.facing == 'left') {
                this.player.anims.play('walk-r');
              } else {
                this.player.anims.resume(this.player.anims.currentFrame);
              }
            } else {
              this.player.anims.play('walk-r');
            }
            this.walking = true;
            this.facing = 'right';
          }
          this.i+=10;
          this.cameras.main.setScroll(this.i, 0);
          this.player.x+=10;
          var i = 0;
          var j = 0;
          for(i = 0; i < 10; i++) {
            this.fg[i].x-=20
            for(j = 0; j < this.num_parallax_layers; j++) {
              this.bg[j][i].x+=(5-j)
            }
          }
        }
      }
      update ()
      {
        var pointer = this.input.activePointer;
        if (pointer.isDown) {
            console.log(pointer.position.x);
            if(pointer.position.x > (650)) {
              this.go_right();
            } else {
              this.go_left();
            };
        } else {
          if (this.cursors.left.isDown)
          {
            this.go_left();
          }
          else if (this.cursors.right.isDown)
          {
            this.go_right();
          }
          else if (this.cursors.right.isUp)
          {
            if (this.walking) {
              this.player.anims.pause();
              this.walking = false;
            }
          }
        }
      }
      resize ()
      {

      }
}

export default function bc() {

      const canvasWidth = 1280

      var config = {
          type: Phaser.CANVAS,
          scale: {
              mode: Phaser.Scale.FIT,  // Try with none
              // parent: 'phaser-example',
              autoCenter: Phaser.Scale.CENTER_BOTH,
              width: canvasWidth,
              height: 720
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 0 },
              debug: false
            }
          },
          canvas: document.getElementById("game")
      };
      var bc = new Game();

      var game = new Phaser.Game(config);
      // load scenes
      game.scene.add('preloadScene', new preloadScene());
      game.scene.add('gameScene', new gameScene(bc));
      game.scene.start('preloadScene');

return {
    game:game,
    bc:bc
  }
}