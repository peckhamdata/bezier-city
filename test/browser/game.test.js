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

  // it('should display the sky', async () => {  
  //   const sky = await page.evaluate(() => bezier.game.scene.scenes[1].children.list[0].texture.key.toString());
  //   expect(sky).toMatch('pet-sky');
  // });

  it('it should show the version number', async () => {

    var fs = require('fs');

    revision = fs.readFileSync('revision.txt', 'utf8');
    const ver = await page.$('#ver');
    await expect(ver).toMatch(revision);
  });

  it('should preload all the assets', async() => {
    // Get a count of the number of textures
    const {request} = require ('graphql-request')

    const query = `{
        texture {name src}
      }`

    const graphql_endpoint = PATH + '/graphql';
    return request(graphql_endpoint, query).then(async(data) => {
      const expected = (data.texture.length) + 2
      // Confirm that the game has preloaded that many (plus its defaults) 
      const num_textures = await page.evaluate(() => Object.keys(bezier.game.textures.list).length);
      await expect(num_textures).toEqual(expected)
    });
  });

});
