module.exports = class Street {
  constructor(street_desc, gfx_repo) {
    this.buildings = street_desc.buildings;
    this.gfx_repo = gfx_repo;
  }

  render_buildings(scene, engagement_level) {
    var x = 100;
    var y = 420;
    var gfx_repo = this.gfx_repo;
    var buildings = this.buildings;
    var result = [];
    var promises = [];
    buildings.forEach(function(building){
      // Get texture for engagement level from graphics repo
      promises.push(gfx_repo.get_texture(building.type, engagement_level).then((texture) => {
          // Keep count / track of x
          x+= 1000; 
          // What about y?
          return result.push(scene.add.image(x, y, texture.name));
        }));
      });
    return Promise.all(promises).then(function(values) {
      var i;
      for (i = 0; i < 10; i++) {
        scene.fg.push(scene.add.image(1500+(i*2000), y, 'foreground')); // .setOrigin(0, 0))  // reset the drawing position of the image to the top-left - default is centre
      }
      return values;
    });
  }
}