const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => res.send("<html><head><title>Bezier City</title></head><body><canvas/></body></html>"))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

