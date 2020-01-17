const express = require('express')
const app = express()
const port = 3000

app.use(express.static('public'))
app.use('/js/phaser', express.static('node_modules/phaser/dist'))
// app.get('/', (req, res) => res.send("<html><head><title>Bezier City</title></head><body><canvas/></body></html>"))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

