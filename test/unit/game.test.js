const GfxRepo = require("../../src/gfx_repo.js");

// To Mock Phaser objects like the Sky we can't
// refer to Phaser itself as it will throw errors
// when it can't see the browser objects it is expecting

const Game = require("../../src/game.js")

var repo;
var game;
var sky = {};
// Given some textures
var textures = {};

describe('Game', () => {
 

  it('Can be started empty and then added to', () => {
    var empty_game = new(Game);
    game.repo = new GfxRepo(textures);
    game.sky = sky;
  });

  beforeEach(() => {

	// When we start up 
	repo = new GfxRepo(textures);
	repo.get_texture = jest.fn();
	repo.get_texture.mockReturnValue({'name': 'petscii-sky', 
                                	  'src':  'assets/petscii-sky.png'});
	sky.setTexture = jest.fn();
	game = new Game(repo, sky);
  });

  it('It preloads all the graphics in the gfx repo', () => {
 
	// Then the assets are put in the gfx repo
  	expect(game.repo).toEqual(repo);

  });

  it('It sets the engagement level to zero', () => {
  	expect(game.engagement).toEqual(0);

  });

  it('Changes the background gfx when you go up an engagement level', () => {
  	// Given the game knows where the sky is

  	game.inc_engagement();
  	// When the engagement level increases
  	expect(game.engagement).toEqual(1);
  	// Then the new sky texture comes out of the gfx repo...
  	// debugger;	
  	expect(game.repo.get_texture).toBeCalledWith('sky', 1);
  	// ...and is applied to the sky
  	expect(game.sky.setTexture).toBeCalledWith('petscii-sky');
  });

  it('wraps round to zero, for now, when you go over the max engagement level', () => {
  	game.engagement = game.max_engagement;
  	game.inc_engagement();
  	expect(game.engagement).toEqual(0);
  });

});

// Linter!!!