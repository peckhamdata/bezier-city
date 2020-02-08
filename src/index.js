import Game from './game.js';
import Street from './street.js';
import GfxRepoClient from './gfx_repo_client.js';
import { request } from 'graphql-request'

class preloadScene extends Phaser.Scene {

      constructor() {
        super({key : 'preloadScene'});
      }

      preload()
      {
        // HACK
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

          // vvv HACK vvv

          var street_desc = {
            name: 'thomas street',
            buildings:[
              {type: 'store'},
              // {type: 'tower'},
              // {type: 'mall'},
              // {type: 'store'},
              // {type: 'bar'},
              {type: 'store'},
              {type: 'store'}
            ],
            // Foreground street furniture - how distributed?
            foreground:[
            ],
            path: // Each street is a bezier curve defined by three sets of co-ords
              [{x: 1,  y:  1},
               {x: 5 , y: 10},
               {x: 10, y: 15}]
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
            this.buildings = street.render_buildings(this);
      }

      update ()
      {

        if (this.cursors.left.isDown)
        {
          if (this.i > 0) {
            this.i-=10;
            this.cameras.main.setScroll(this.i, 0);
            var i = 0;
            for(i = 0; i < 10; i++) {
              this.fg[i].x+=20
            }
          }
        }
        else if (this.cursors.right.isDown)
        {
          if (this.i < this.gameWidth - this.canvasWidth ) {
            this.i+=10;
            this.cameras.main.setScroll(this.i, 0);
            var i = 0;
            for(i = 0; i < 10; i++) {
              this.fg[i].x-=20
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