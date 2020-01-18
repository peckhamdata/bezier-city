const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.use(express.static('public'))
app.use('/js/phaser', express.static('node_modules/phaser/dist'))

app.listen(port, () => console.log(`listening on port ${port}!`))

