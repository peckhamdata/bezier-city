# bezier-city

`I woke up in Bezier City`

# Background

Video game I'm working on. In my teenage years I spent hours and hours writing games for the Commodore 64.
Eventually I sold [Quota](https://github.com/peckhamdata/quota) to Virgin Mastertronic. It was never released
and the rights reverted to me.

Video games became the work of teams and then studios and I thought this was not for me. Then I saw indie 
games showcased at a games expo and thought why not give it another go.

# The Idea of the game

The idea of the game is you wake up in a strange city. It's all very lo-fi. Like something you might see on
a TRS-80 or a PET. As you wander around the city and try to figure out how and why you are there you
engage with the city more and more.

As your engagment increases the graphics and sound, the richness of your experience, gets better. The idea
is to make it like a journey through the history of video games; from the monochrome character graphics of
the PET through the 8-bit and then 16-bit worlds of the 80s and early 90s and then into the polygon world
of today.

There are a whole load of games from which I take inspiration but Ocean's 'Frankie Goes to Hollywood' and
Nintendo's 'Animal Crossing' are key.

You can see the current state of the game at [beziercity.com](https://www.beziercity.com/).

# Where I'm at with it.

I'd got as far as rendering buildings using PETSCII characters as you can see in the above link.
These are made using the code in [bc-gfx](https://github.com/peckhamdata/bc-gfx).

These buildings were on a single street. Then I thought 'Where is this street' and went off to build
the map of the city which you can find in the [bc-map](https://github.com/peckhamdata/bc-map) repo.

Next step is to join the map and the code here together so you can wander the streets of the city.

It occured to me today that it might be nice if you encountered characters from or related to existing
video games. Danger here is it becomes a bit Wreck it Ralph. No bad thing but I can imagine there are rights
issues to negotiate :-)

## Dependencies

* [node.js](https://nodejs.org/)
* [webpack](https://webpack.js.org/)

## Installation

* Clone this repository

## Testing

Run the tests with `npm run test` or simply `jest`

The browser based tests take a little longer to run. For just the unit tests use:

```
jest --roots test/unit
```

## Deployment

Run locally with:

`npm run start`

Deploy to Heroku by commiting to `master`
