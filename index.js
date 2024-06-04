// require ('newrelic');
// var graphqlHTTP = require('express-graphql');
import {createHandler} from 'graphql-http/lib/use/express';
import {buildSchema} from 'graphql';

import {GfxRepo} from "./src/gfx_repo.js";
import express from 'express';
import winston from 'winston';

const env = process.env.NODE_ENV

//////////////////////////////////////////////////////////////////////////
// This is the vanilla logger to start with 

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
if (env !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
////////////////////////////////////////////////////////////////////////////

const app = express()
const port = process.env.PORT || 3000

import fs from 'fs';
import enforce from 'express-sslify';

const revision = fs.readFileSync('revision.txt', 'utf8');

if (app.get('env') !== 'development') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}

// Construct a schema, using GraphQL schema language
logger.log('info', `Starting Bézier City Server in ${env} environment`);

var schema = buildSchema(`
  type Texture {
    name: String
    src: String
    width: Int
    height: Int
  }

  type Query {
    texture(name: String!, level: Int): Texture
    textures: [Texture]
  }
`);

var textures = {'sky':  {0: {'name': 'pet-sky', 
                             'src':  'assets/sky-pet.png'}, 
                         1: {'name': 'raster-sky',
                             'src':  'assets/sky.png'},
                         2: {'name': 'sky',
                             'src':  'assets/sky-2012.png'}
                        },
                'store':{0: {'name': 'buildings',
                             'src':  'assets/buildings.png'}},
                'tower':{0: {'name': 'tower',
                             'src':  'assets/buildings-2.png'}},        
                'mall' :{0: {'name': 'mall',
                             'src':  'assets/buildings-3.png'}},        
                'bar':  {0: {'name': 'bar',
                             'src':  'assets/buildings-4.png'}}        
               };

logger.log('info', "Creating graphics repo");

var gfx = new GfxRepo(textures, 'public/');

// The root provides a resolver function for each API endpoint
var root = {
  texture: ({name, level}) => {
    return gfx.get_texture(name, level);
  },
  textures: () => {
    return gfx.get_texture();
  }
};

app.use('/graphql', createHandler({
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

