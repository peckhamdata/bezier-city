import Game from './game.js';
import GfxRepo from './gfx_repo.js';

export default function bc() {

      var config = {
          type: Phaser.CANVAS,
         scale: {
              mode: Phaser.Scale.FIT,
              parent: 'phaser-example',
              autoCenter: Phaser.Scale.CENTER_BOTH,
              width: 1280,
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
      var bc;
      var cursors;
      var repeat;

      function preload ()
      {
          this.load.image('sky', 'assets/sky-pet.png');
          this.load.image('raster-sky', 'assets/sky.png');
          this.load.image('sky-2012', 'assets/sky-2012.png');
      }

      function create ()
      {
          const gameWidth = this.sys.canvas.width;
          const gameHeight = this.sys.canvas.hight;
          const sky = this.add.image(0, 0, 'sky').setOrigin(0, 0)  // reset the drawing position of the image to the top-left - default is centre
          sky.displayWidth = gameWidth;

          var textures = {'sky': {0: {'name': 'sky', 
                                      'src':  'assets/petscii-sky.png'}, 
                                  1: {'name': 'raster-sky',
                                      'src':  'assets/sky.png'},
                                  2: {'name': 'sky-2012',
                                      'src':  'assets/sky-2012.png'}
                                 }
                         };

          repo = new GfxRepo(textures);
          bc = new Game(repo, sky);
          bc.max_engagement = 2;
          cursors = this.input.keyboard.createCursorKeys();

          this.input.on('pointerdown', function (pointer) {
              bc.inc_engagement();
              console.log(this.game.loop.frame, 'down B');

          }, this);

      }

      function update ()
      {
        if (cursors.left.isDown)
        {
          if (repeat != 'down') {
            console.log('oh');
            repeat = 'down';
          }
        }
        else if (cursors.left.isUp)
        {
          if (repeat != 'up') {
            bc.inc_engagement();
            repeat = 'up';
          }
        }

      }

      function resize ()
      {

      }
      return {
        game:game
      }
}
