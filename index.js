require ('newrelic');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

const GfxRepo = require("./src/gfx_repo.js")

const express = require('express')
const app = express()
const port = process.env.PORT || 3000

var fs = require('fs');
var enforce = require('express-sslify');

revision = fs.readFileSync('revision.txt', 'utf8');

if (app.get('env') !== 'development') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Texture {
    name: String
    src: String
  }

  type Query {
    texture: [Texture]
  }
`);

var textures = {'sky': {0: {'name': 'pet-sky', 
                            'src':  'assets/sky-pet.png'}, 
                        1: {'name': 'raster-sky',
                            'src':  'assets/sky.png'},
                        2: {'name': 'sky',
                            'src':  'assets/sky-2012.png'}
                       }
               };
var gfx = new GfxRepo(textures);

// The root provides a resolver function for each API endpoint
var root = {
  texture: () => {
    return gfx.get_texture();
  }
};

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

app.get('/', function (req, res) {
  res.render('index', { version: revision })
})

app.use('/js/phaser', express.static('node_modules/phaser/dist'))
app.use('/assets', express.static('public/assets'))
app.use('/js', express.static('public/js'))
app.set('view engine', 'pug')

app.listen(port, () => console.log(`listening on port ${port}!`))

