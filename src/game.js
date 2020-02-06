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
    return this.repo.get_texture('sky', this.engagement).then(data => {
      console.log(data);
      console.log('Setting sky to:', data.name);
      this.sky.setTexture(data.name);
      return this.engagement;
    });
  }
}
