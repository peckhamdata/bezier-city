const StreetMaker = require("../../src/street_maker.js")

describe('Street Maker', () => {
  it('Make a street from an LCG sequence and a set of buildings', () => {

  // Make a street from an LCG sequence and a set of buildings

  // Given a set of buildings

  var building_names = ['one', 'two', 'three', 'four', 'five'];

  // And a seed number
  var seed = 200;

  // And a street length
  var length = 10;

  // When we ask for a street descriptor to be made
  var sm = new StreetMaker();
  var street_desc = sm.make(building_names, seed, length);

  // Then we get this
  var expected = [
    { type: 'five' },
    { type: 'two' },
    { type: 'three' },
    { type: 'four' },
    { type: 'two' },
    { type: 'three' },
    { type: 'five' },
    { type: 'three' },
    { type: 'two' },
    { type: 'five' }
  ];

  expect(street_desc).toEqual(expected);
  });
});