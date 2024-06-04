import fs from 'fs';
import {request} from 'graphql-request';

var title = "Bézier City"

describe('Bézier City', () => {
  beforeAll(async () => {
    await page.goto(PATH, { waitUntil: 'networkidle0' })
  });

  it('should have a sensible title', async () => {
    await expect(page.title()).resolves.toMatch(title);
  });

  it('should display the game window', async () => {  
    await expect(page).toMatchElement('canvas');
  });

  it('should display the sky', async () => {  
    const sky = await page.evaluate(() => bezier.game.scene.scenes[1].children.list[0].texture.key.toString());
    expect(sky).toMatch('pet-sky');
  });

  it('it should show the version number', async () => {

    var revision = fs.readFileSync('revision.txt', 'utf8');
    const ver = await page.$('#ver');
    await expect(ver).toMatch(revision);
  });

  it('should preload all the assets', async() => {
    // Get a count of the number of textures

    const query = `{
        textures {name src}
      }`

    const graphql_endpoint = PATH + '/graphql';
    return request(graphql_endpoint, query).then(async(data) => {
      const expected = (data.textures.length) + 2
      // Confirm that the game has preloaded that many (plus its defaults) 
      const num_textures = await page.evaluate(() => Object.keys(bezier.game.textures.list).length);
      await expect(num_textures).toEqual(expected)
    });
  });

});
