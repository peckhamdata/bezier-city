require ('newrelic');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

const GfxRepo = require("./src/gfx_repo.js")

const express = require('express')

const winston = require('winston');

//////////////////////////////////////////////////////////////////////////
// This is the vanilla logger to stat with 

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
////////////////////////////////////////////////////////////////////////////

const app = express()
const port = process.env.PORT || 3000

var fs = require('fs');
var enforce = require('express-sslify');

revision = fs.readFileSync('revision.txt', 'utf8');

if (app.get('env') !== 'development') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}

// Construct a schema, using GraphQL schema language
logger.log('info', "Starting Bézier City Server");

var schema = buildSchema(`
  type Texture {
    name: String
    src: String
  }

  type Query {
    texture(name: String!, level: Int): Texture
    textures: [Texture]
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

logger.log('info', "Creating graphics repo");

var gfx = new GfxRepo(textures);

// The root provides a resolver function for each API endpoint
var root = {
  texture: ({name, level}) => {
    return gfx.get_texture(name, level);
  },
  textures: () => {
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

app.listen(port, () => logger.log('info', `listening on port ${port}`))

