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

# Where I'm at with it.

The city is built programatically in the [bc-karte](https://github.com/peckhamdata/bc-karte) project.

It is then turned into Pydantic models and served using FastAPI to the Phaser 3/React frontend.

There are two views in the front end, the map showing streets and the position of the character and NPCs in the city, and the side scrolling street level view.

# Copyright

(C) Copyright 2025 Peckham Data Centre Ltd. All Rights Reserved.
