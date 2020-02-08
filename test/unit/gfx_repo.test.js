const GfxRepo = require("../../src/gfx_repo.js")

describe('Bézier City', () => {
  it('can be stocked with new textures', () => {
    // Given some assets
    var textures = {'sky': {0: {'name': 'petscii-sky', 
                                'src':  'assets/petscii-sky.png'}, 
                            1: {'name': 'raster-sky',
                                'src':  'assets/raster-sky.png'}
                           }
                   };
    // Then what?

  });

  it('can return all the assets for preloading', async () => {
    // Give a populated gfx repo
    var textures = {'sky': {0: {'name': 'petscii-sky', 
                                'src':  'assets/petscii-sky.png'}, 
                            1: {'name': 'raster-sky',
                                'src':  'assets/raster-sky.png'}}};
    let gr = new GfxRepo(textures);
    // When the Phaser preload asks for all the assets
    actual = await gr.get_texture();
    // It gets them
    var expected = [{name: 'petscii-sky',
                     src:  'assets/petscii-sky.png'},
                    {name: 'raster-sky',
                     src:  'assets/raster-sky.png'}];
    expect(actual).toEqual(expected);
  });

  it('return image texture based on graphics level requested', async () => {
    // Given
    var textures = {'sky': {0: 'petscii-sky', 
                            1: 'raster-sky'}};
    let gr = new GfxRepo(textures);
    // When
    var texture_0 = await gr.get_texture('sky', 0);
    var texture_1 = await gr.get_texture('sky', 1);
    // Then
    expect(texture_0).toMatch('petscii-sky');
    expect(texture_1).toMatch('raster-sky');
  });
});
