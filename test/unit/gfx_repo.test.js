const GfxRepo = require("../../gfx_repo.js")

describe('Bézier City', () => {
  it('return image texture based on graphics level requested', () => {
    // given
    var textures = {'sky': {0: 'petscii-sky', 
                            1: 'raster-sky'}}
    let gr = new GfxRepo(textures)
    // when
    var texture = gr.get_texture('sky', 0);
    // then
    expect(texture).toMatch('petscii-sky')
  });
});
