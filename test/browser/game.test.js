var title = "Bézier City"

describe('Bézier City', () => {
  beforeAll(async () => {
    await page.goto(PATH, { waitUntil: 'load' })
  });

  it('should have a sensible title', async () => {
    await expect(page.title()).resolves.toMatch(title);
  });

  it('should display the game window', async () => {  
    await expect(page).toMatchElement('canvas');
  });

  it('should display the sky', async () => {  
    const sky = await page.evaluate(() => bezier.game.scene.scenes[0].children.list[0].texture.key.toString());
    expect(sky).toMatch('sky'); // This is iffy. 
  });

  it('it should show the version number', async () => {

    var fs = require('fs');

    revision = fs.readFileSync('revision.txt', 'utf8');
    const ver = await page.$('#ver');
    await expect(ver).toMatch(revision);
  });

});
