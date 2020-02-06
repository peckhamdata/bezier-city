const GfxRepoClient = require("../../src/gfx_repo_client.js")

jest.mock('graphql-request');
var {request} = require('graphql-request');
describe('Bézier City', function () {

  it('can get all textures from a remote graphics repo', async () => {
	request.mockResolvedValue({textures: [{name: "sky", src: "path/to/file"}]});

    // Given the game is set up with a remote repo
    var repo_client = new GfxRepoClient('https://this.thing');

    // When we ask for all textures
    repo_client.get_texture();

    // Then it asks for them via the remote API
    expect(request).toBeCalled();

  });


  it('can get a texture from a remote graphics repo', async () => {
	request.mockResolvedValue({texture: {name: "sky", src: "path/to/file"}});
    // Given the game is set up with a remote repo
    var repo_client = new GfxRepoClient('https://this.thing');

    // When we ask for all textures
    result = repo_client.get_texture("sky", 1);

    // Then it asks for them via the remote API
    expect(request).toBeCalled();
  });

});