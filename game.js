module.exports = class Game {
  constructor(repo, sky) {
    this.repo = repo;
    this.sky = sky;
    this.engagement = 0;
    this.max_engagement = 5;
  }
  inc_engagement() {
    if(this.engagement == this.max_engagement) {
      this.engagement = -1;
    }
    this.engagement++;
    const texture = this.repo.get_texture('sky', this.engagement);
    this.sky.setTexture(texture);
  }
}
