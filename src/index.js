import Game from './game.js';
import Street from './street.js';
import GfxRepoClient from './gfx_repo_client.js';
import { request } from 'graphql-request';
import StreetMaker from './street_maker.js';


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

        const query = `{
            textures {name src}
          }`
        const graphql_endpoint = window.location.href + 'graphql';
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
        this.i = 0;
        this.gameWidth = 8000 // this.sys.canvas.width;
        this.canvasWidth = 1280
        this.fg;
        this.bg;
        // Parallax Layers
        this.num_layer_images = 10;
        this.num_parallax_layers = 2;

        this.buildings;
        this.cursors;
      }

      create ()
      {
          var repo;
          var repeat;

          console.log('in create');
          const gameHeight = this.sys.canvas.hight;
          const sky = this.add.image(0, 0, 'sky').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          sky.displayWidth = this.gameWidth;

          var sm = new StreetMaker();
          var building_names = ['store', 'tower', 'mall', 'bar'];
          var street_desc = {
            buildings: sm.make(building_names, 10, 40)
          };

          const graphql_endpoint = window.location.href + 'graphql';
          repo = new GfxRepoClient(graphql_endpoint);
          this.bc.repo = repo;
          this.bc.sky = sky;
          this.bc.max_engagement = 2;
          this.cursors = this.input.keyboard.createCursorKeys();
          this.cameras.main.setViewport(0, 0, this.sys.canvas.width, this.sys.canvas.height);

          this.input.on('pointerdown', function (pointer) {
              this.bc.inc_engagement(); 
          }, this);

          var street = new Street(street_desc);
          street.gfx_repo = repo;

          this.fg = [];
          this.bg = [];

          var i;
          var j;
          for (j = 0; j < this.num_parallax_layers; j++) {
            var layer = [];
            for (i = 0; i < this.num_layer_images; i++) {
              layer.push(this.add.image(i*1152, 0, 'background').setOrigin(0, 0));  // reset the drawing position of the image to the top-left - default is centre
            }
            this.bg.push(layer);
          }
          console.log(this.bg);
          this.buildings = street.render_buildings(this);
      }

      go_left () {
        if (this.i > 0) {
          this.i-=10;
          this.cameras.main.setScroll(this.i, 0);
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
          this.i+=10;
          this.cameras.main.setScroll(this.i, 0);
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
        }

        if (this.cursors.left.isDown)
        {
          this.go_left();
        }
        else if (this.cursors.right.isDown)
        {
          this.go_right();
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