const express = require('express')
const app = express()
const port = process.env.PORT || 3000

var fs = require('fs');

revision = fs.readFileSync('revision.txt', 'utf8');

// https://stackoverflow.com/questions/7450940/automatic-https-connection-redirect-with-node-js-express
console.log(app.get('env'))

if (app.get('env') !== 'development') {

	app.get('*', function(req, res) {  
	    res.redirect('https://' + req.headers.host + req.url);

	    // Or, if you don't want to automatically detect the domain name from the request header, you can hard code it:
	    // res.redirect('https://example.com' + req.url);
	})
}

app.get('/', function (req, res) {
  res.render('index', { version: revision })
})

app.use('/js/phaser', express.static('node_modules/phaser/dist'))
app.use('/assets', express.static('public/assets'))
app.set('view engine', 'pug')

app.listen(port, () => console.log(`listening on port ${port}!`))

