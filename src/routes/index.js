var routes = [];

[].forEach(f => {
  const file = require('./' + f);
  if (Array.isArray(file)) routes = [ ...routes, ...file];
  else routes = [ ...routes, file ]
});

module.exports = routes;