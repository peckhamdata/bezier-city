const GfxRepo = require("../../gfx_repo.js")

describe('Bézier City', () => {
  it('return image texture based on graphics level requested', () => {
    // given
    var textures = {'sky': {0: 'petscii-sky', 
                            1: 'raster-sky'}}
    let gr = new GfxRepo(textures)
    // when
    var texture_0 = gr.get_texture('sky', 0);
    var texture_1 = gr.get_texture('sky', 1);
    // then
    expect(texture_0).toMatch('petscii-sky')
    expect(texture_1).toMatch('raster-sky')
  });
});
