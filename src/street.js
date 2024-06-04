export class Street {
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
      return values;
    });
  }
}