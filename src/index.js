import Game from './game.js';
import GfxRepo from './gfx_repo.js';

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
          canvas: document.getElementById("game"),
          scene: {
              preload: preload,
              create: create,
              update: update
          }
      };

      var game = new Phaser.Game(config);
      var repo;
      var bc = new Game();
      var cursors;
      var repeat;
      var i = 0;

      const gameWidth = 8000 // this.sys.canvas.width;

      function preload ()
      {
          this.load.image('petscii-sky', 'assets/sky-pet.png');
          this.load.image('raster-sky', 'assets/sky.png');
          this.load.image('sky-2012', 'assets/sky-2012.png');

          this.load.image('buildings', 'assets/buildings.png');

      }

      function create ()
      {
          const gameHeight = this.sys.canvas.hight;
          const sky = this.add.image(0, 0, 'petscii-sky').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          sky.displayWidth = gameWidth;

          const bld = this.add.image(1800, 100, 'buildings').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          const bl2 = this.add.image(3800, 100, 'buildings').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre


          var textures = {'sky': {0: {'name': 'petscii-sky', 
                                      'src':  'assets/petscii-sky.png'}, 
                                  1: {'name': 'raster-sky',
                                      'src':  'assets/sky.png'},
                                  2: {'name': 'sky-2012',
                                      'src':  'assets/sky-2012.png'}
                                 }
                         };

          repo = new GfxRepo(textures);
          bc.repo = repo;
          bc.sky = sky;
          bc.max_engagement = 2;
          cursors = this.input.keyboard.createCursorKeys();

          this.cameras.main.setViewport(0, 0, this.sys.canvas.width, this.sys.canvas.height);

          this.input.on('pointerdown', function (pointer) {
              bc.inc_engagement();
          }, this);

      }

      function update ()
      {

        if (cursors.left.isDown)
        {
          if (i > 0) {
            i-=10;
            console.log(i)
            this.cameras.main.setScroll(i, 0);
          }
        }
        else if (cursors.right.isDown)
        {
          if (i < gameWidth - canvasWidth ) {
            i+=10;
            console.log(i)
            this.cameras.main.setScroll(i, 0);
          }
        }


      }

      function resize ()
      {

      }
      return {
        game:game,
        bc:bc
      }
}
