const express = require('express')
const app = express()
const port = 3000

app.use(express.static('public'))
app.use('/js/phaser', express.static('node_modules/phaser/dist'))

app.listen(port, () => console.log(`listening on port ${port}!`))

