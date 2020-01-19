const express = require('express')
const app = express()
const port = process.env.PORT || 3000

var fs = require('fs');
var enforce = require('express-sslify');

revision = fs.readFileSync('revision.txt', 'utf8');

if (app.get('env') !== 'development') {
	app.use(enforce.HTTPS());
}

app.get('/', function (req, res) {
  res.render('index', { version: revision })
})

app.use('/js/phaser', express.static('node_modules/phaser/dist'))
app.use('/assets', express.static('public/assets'))
app.set('view engine', 'pug')

app.listen(port, () => console.log(`listening on port ${port}!`))

