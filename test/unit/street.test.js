const GfxRepo = require("../../src/gfx_repo.js")
const Street = require("../../src/street.js")

describe('Street', () => {
  it('creates a street in Bezier City', async () => {

    var scene = {add: {image: jest.fn()}}

    var x;
    for(x = 0; x < 7; x++) {
      scene.add.image.mockReturnValueOnce({val:x, setOrigin: jest.fn()});
    }

    // Given a repo with these textures:

    const textures = {'store': {0: {'name': 'petscii-store', 
                                    'src':  'assets/buildings-2.png'}, 
                                1: {'name': 'raster-store',
                                    'src':  'assets/raster-store.png'}},
                      'tower': {0: {'name': 'petscii-tower', 
                                    'src':  'assets/buildings-3.png'}, 
                                1: {'name': 'raster-tower',
                                    'src':  'assets/raster-tower.png'}},
                       'mall': {0: {'name': 'petscii-mall', 
                                    'src':  'assets/buildings-4.png'}, 
                                1: {'name': 'raster-mall',
                                    'src':  'assets/raster-mall.png'}},
                       'bar':  {0: {'name': 'petscii-bar', 
                                    'src':  'assets/buildings-2.png'}, 
                                1: {'name': 'raster-bar',
                                    'src':  'assets/raster-bar.png'}}};

    var repo = new GfxRepo(textures, 'public/');
    // Given a street descriptor

    var street_desc = {
      name: 'thomas street',
      buildings:[
        {type: 'store'},
        {type: 'tower'},
        {type: 'mall'},
        {type: 'store'},
        {type: 'bar'},
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

    var street = new Street(street_desc);
    street.gfx_repo = repo;
    var buildings = await street.render_buildings(scene);
    expect(buildings.sort()).toEqual([1,2,3,4,5,6,7])

    // When we render the street at a given engagement level

    // Then we get a row of buildings

    // An array of images next to each other with the correct
    // image for the engagement level

    // This could be returned as 

    // And some stuff in the foreground to create the
    // illusion of depth

  });
});