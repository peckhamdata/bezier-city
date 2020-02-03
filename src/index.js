import Game from './game.js';
import GfxRepo from './gfx_repo.js';
import { request } from 'graphql-request'

class preloadScene extends Phaser.Scene {

      constructor() {
        super({key : 'preloadScene'});
      }

      preload()
      {
        const query = `{
            texture {name src}
          }`
        const graphql_endpoint = window.location.href + 'graphql';
        request(graphql_endpoint, query).then(data => {
            data.texture.forEach(value => {
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
      }

      create ()
      {
          var repo;
          var cursors;
          var repeat;

          console.log('in create');
          const gameHeight = this.sys.canvas.hight;
          const sky = this.add.image(0, 0, 'sky').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          sky.displayWidth = this.gameWidth;

          const bld = this.add.image(1800, 100, 'buildings').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          const bl2 = this.add.image(3800, 100, 'buildings').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre

          var textures = {'sky': {0: {'name': 'pet-sky', 
                                      'src':  'assets/petscii-sky.png'}, 
                                  1: {'name': 'raster-sky',
                                      'src':  'assets/sky.png'},
                                  2: {'name': 'sky',
                                      'src':  'assets/sky-2012.png'}
                                 }
                         };

          repo = new GfxRepo(textures);
          this.bc.repo = repo;
          this.bc.sky = sky;
          this.bc.max_engagement = 2;
          this.cursors = this.input.keyboard.createCursorKeys();

          this.cameras.main.setViewport(0, 0, this.sys.canvas.width, this.sys.canvas.height);

          this.input.on('pointerdown', function (pointer) {
              this.bc.inc_engagement();
          }, this);       
      }

      update ()
      {

        if (this.cursors.left.isDown)
        {
          if (this.i > 0) {
            this.i-=10;
            console.log(this.i)
            this.cameras.main.setScroll(this.i, 0);
          }
        }
        else if (this.cursors.right.isDown)
        {
          if (this.i < this.gameWidth - this.canvasWidth ) {
            this.i+=10;
            console.log(this.i)
            this.cameras.main.setScroll(this.i, 0);
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