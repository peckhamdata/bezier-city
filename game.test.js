var title = "Bezier City"

describe('Bezier City', () => {
  beforeAll(async () => {
    await page.goto(PATH, { waitUntil: 'load' })
  });

  it('should have a sensible title', async () => {
    await expect(page.title()).resolves.toMatch(title);
  });

  it('should display the game window', async () => {
    await page.$eval('canvas', el => el); // Replace this second arg with something meaningful
  });

  // it('the background should be the sky', async () => {
  //   fail();
  // });

  // it('it should show the version number', async () => {
  //   fail();
  // });

});
