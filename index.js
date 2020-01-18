const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.get('/', function (req, res) {
  res.render('index', { version: 'foo' })
})

app.use('/js/phaser', express.static('node_modules/phaser/dist'))
app.use('/assets', express.static('public/assets'))
app.set('view engine', 'pug')

app.listen(port, () => console.log(`listening on port ${port}!`))

