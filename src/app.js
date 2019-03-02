const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const Conf = require("./constantes");
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
client.get("posts", (err, count) => {
   if (!!err || !count) {
       client.set("posts", 0, redis.print);
       console.warn("I created count of posts");
   }
   if (count) {
       console.log("Counter exists in DB, posts on boot : ", count);
   }
});

app.get("/post/:id", (req, res) => {
    // TODO : This API only gets one document. Ready for tree recursion ?! :D
    console.log("[GET /post/:id] Post fetch id : " + req.params.id);

    const handleSuccess = (response) => {
        try {
            res.send(JSON.parse(response));
        } catch (e) {
            console.error("JSON PARSE ", {trace: e, origin: response});
            res.status(500).send(Conf.Status._500)
        }
    };

    getPost(req.params.id, handleSuccess, res);
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
    client.incr("posts", (err, futureId) => {
        if (!!err) {
            res.status(500).send(Conf.Status._500);
            return;
        }

        client.hset("post:" + futureId, "body", reqBody, (err) => {
            if (!!err) {
                res.status(500).send(Conf.Status._500);
                return;
            }
        });

        // FIXME : For /like && /dislike routes : https://redis.io/commands/HINCRBY
        client.hset("post:" + futureId, "likes", 0);
        client.hset("post:" + futureId, "dislikes", 0);

        // Adding as a reply if parentId is defined
        if (maybeParentId) {
            const updateParentId = (response) => {
                const parent = JSON.parse(response);
                parent.replies.push(Number.parseInt(futureId));
                client.hset("post:" + maybeParentId, "body", JSON.stringify(parent), redis.print);
            };

            getPost(maybeParentId, updateParentId);
            /*parentPosted
                ? OK()
                : res.status(206)
                    .send({message: "Parent Id has not been found ... The post exist in detached state however"});

            return;
            */
        }
        OK();
    });
});

// Gets a post from redis. By not passing res, failure wont't trigger error response (but check retcode)
const getPost = (postId, successCallback, res) => {
    const flog = (message) => console.info("[getPost] " + message);

    // FIXME : Its only getting the body of the post, missing likes and dislikes.
    // FIXME : Use the power of this snippet :

    // FIXME : const {promisify} = require('util');
    // FIXME : const hgetAsync = promisify(client.hget).bind(client);

    // FIXME : Alongside this : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Promise/all
    // FIXME : And make this function a fucking tank !

    // FIXME : Also there is no real way to know when things have fucked without passing the res and killing evry shit
    // FIXME : (so detached state warning might never appear before visiting post ... And seeing its detached :D)

    client.hget("post:" + postId, "body", (err, response) => {
        flog("RESPONSE:" + response);
        flog("ERROR:" + err);

        if (err) {
            console.log("Error met");
            res && res.status(500).send(Conf.Status._500);
            return ;
        }

        if (!response) {
          console.log("ENo response met");
          res && res.status(404).send(Conf.Status._404);
          return ;
        }

        successCallback(response);
    });
};

module.exports = app;

/* routes.forEach((route) => {
  app.use(route.path, route.router);
}); */