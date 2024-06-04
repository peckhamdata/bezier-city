import {jest} from '@jest/globals';

// jest.mock('graphql-request');
// import {request} from 'graphql-request';

jest.unstable_mockModule('graphql-request', () => ({
  request: jest.fn()
}));

const {request} = await import('graphql-request');
const {GfxRepoClient} = await import("../../src/gfx_repo_client.js");

describe('Bézier City', function () {

  it('can get all textures from a remote graphics repo', async () => {
	  request.mockResolvedValueOnce({textures: [{name: "sky", src: "path/to/file"}]});

    // Given the game is set up with a remote repo
    var repo_client = new GfxRepoClient('https://this.thing');

    // When we ask for all textures
    var result = repo_client.get_texture();

    // Then it asks for them via the remote API
    expect(request).toBeCalled();

  });


  it('can get a texture from a remote graphics repo', async () => {
	  request.mockResolvedValueOnce({texture: {name: "sky", src: "path/to/file"}});
    // Given the game is set up with a remote repo
    var repo_client = new GfxRepoClient('https://this.thing');

    // When we ask for all textures
    var result = repo_client.get_texture("sky", 1);

    // Then it asks for them via the remote API
    expect(request).toBeCalled();
  });

});