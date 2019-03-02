const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');

const routes = require('./routes');
const Conf = require("./constantes");
const PostDAO = require("./Dao/PostDAO");
const redis = require("redis"),
    client = redis.createClient(Conf.Redis);

client.on("error", function (err) {
    console.log("[REDIS] Error " + err);
});

// Handle CORS
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Nothing here");
});

// On app boot, sets redis counter if not existing in the db
PostDAO.initDb();


app.get("/post/:id", (req, res) => {
    // TODO : This API only gets one document. Ready for tree recursion ?! :D
    console.log("[GET /post/:id] Post fetch id : " + req.params.id);

    // Express somehow needs the req in res.send, so I need a proxy function :'(
    // Ands gets it implicitly T_T
    const f = (x) => res.send(x);

    PostDAO.getPost(req.params.id, f, res);
});

app.post("/post/:maybeParentId?", (req, res) => {
    const maybeParentId = req.params.maybeParentId;

    const OK = () => res.send({message: "OK"});
    const flog = (handler, message) => handler("[POST /post/" + maybeParentId + "]" + message);

    const reqBody = JSON.stringify(req.body);

    flog(console.info,"OK : " + reqBody);

    // FIXME : Check for fields
    // res.status(400).send(Conf.Status._400);

    // We set the body of the post
    // FIXME : We can totally make promises for all the hsets (see below)"count"
    // (Except incr function, letting the block enclosed ensures no one elses picks this data until all work done)

    PostDAO.insertPost(maybeParentId, reqBody);
    OK();
});

module.exports = app;

/* routes.forEach((route) => {
  app.use(route.path, route.router);
}); */