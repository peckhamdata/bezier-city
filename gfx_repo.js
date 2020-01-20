module.exports = class GfxRepo {
  constructor(gfx_data) {
    this.gfx_data = gfx_data;
  }
  get_texture(key, level) {
    return 'petscii-sky';
  }
}
