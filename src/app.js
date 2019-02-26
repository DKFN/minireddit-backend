const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');

// Handle CORS
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

module.exports = app;

routes.forEach((route) => {
  app.use(route.path, route.router);
});