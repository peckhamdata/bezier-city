module.exports = class Street {
  constructor(street_desc, gfx_repo) {
    this.buildings = street_desc.buildings;
    this.gfx_repo = gfx_repo;
  }

  render_buildings(scene, engagement_level) {
    var x = 0;
    var y = 720;
    var gfx_repo = this.gfx_repo;
    var buildings = this.buildings;
    var result = [];
    var promises = [];
    buildings.forEach(function(building){
      // Get texture for engagement level from graphics repo
      promises.push(gfx_repo.get_texture(building.type, engagement_level).then((texture) => {
          // Keep count / track of x
          var this_x = x;
          x+=texture.width; 
          var image = scene.add.image(this_x, y-texture.height, texture.name)
          image.setOrigin(0, 0);
          return result.push(image);
        }));
      });
    return Promise.all(promises).then(function(values) {
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
      var anim = scene.anims.create(config_1);
      var anim_2 = scene.anims.create(config_2);
      scene.player = scene.physics.add.sprite(400, 184, 'figure').setOrigin(0, 0)
      scene.player.anims.load('walk-r');
      scene.player.anims.load('walk-l');
      var i;
      for (i = 0; i < 10; i++) {
        scene.fg.push(scene.add.image(1500+(i*2000), 0, 'foreground').setOrigin(0, 0));  // reset the drawing position of the image to the top-left - default is centre
      }


      return values;
    });
  }
}