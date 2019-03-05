const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const _ = require("lodash");

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

// FIXME: Move to utils file
const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
            promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]));

app.get("/post/:id", (req, res) => {
    // TODO : This API only gets one document. Ready for tree recursion ?! :D
    console.log("[GET /post/:id] Post fetch id : " + req.params.id);

    // Express somehow needs the req in res.send, so I need a proxy function :'(
    // Ands gets it implicitly T_T
    const f = (x) =>  {
        const parentIds = JSON.parse(x.parentIds);
        if (parentIds.length !== 0) {
            Promise.all(parentIds.map((pId) => PostDAO.getParent(pId)))
                .then((parents) => {
                    res.send(Object.assign(x, {parents: parents}));
                });
        } else
            res.send(x);
    };


    PostDAO.getPost(req.params.id, f, res);
});

app.post("/post/:maybeParentId?", (req, res) => {
    const maybeParentId = req.params.maybeParentId;

    const OK = () => res.send({ message: "OK"});
    const flog = (handler, message) => handler("[POST /post/" + maybeParentId + "]" + message);

    flog(console.info,"OK : "  ,req.body);

    // FIXME : Check for fields
    // res.status(400).send(Conf.Status._400);

    // We set the body of the post
    // FIXME : We can totally make promises for all the hsets (see below)"count"
    // (Except incr function, letting the block enclosed ensures no one elses picks this data until all work done)

    PostDAO.insertPost(maybeParentId, req.body, res);
    OK();
});

app.put("/like/:postId", (req, res) => {
  const postId = req.params.postId;
  PostDAO.likeDislikePost(postId, 'likes', res);
});

app.put("/dislike/:postId", (req, res) => {
  const postId = req.params.postId;
  PostDAO.likeDislikePost(postId, 'dislikes', res);
});



module.exports = app;

/* routes.forEach((route) => {
  app.use(route.path, route.router);
}); */