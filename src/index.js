'use strict';

const App = require('./app');
const http = require('http').Server(App);

const PORT = 8080;

http.listen(PORT, () => console.log('Server listening on port: ' + PORT));