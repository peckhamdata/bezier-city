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
    const sky = await page.evaluate(() => game.scene.scenes[0].children.list[0].texture.key.toString());
    expect(sky).toEqual('sky'); 
  });

  // it('it should show the version number', async () => {
  //   fail();
  // });

});
