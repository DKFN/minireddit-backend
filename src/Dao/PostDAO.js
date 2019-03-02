const _ = require("lodash");

const Conf = require("../constantes");
const redis = require("redis"),
    client = redis.createClient(Conf.Redis);

module.exports = {
    initDb: () => {
        client.get("posts", (err, count) => {
           if (!!err || !count) {
               client.set("posts", 0, redis.print);
               console.warn("I created count of posts");
           }
           if (count) {
               console.log("Counter exists in DB, posts on boot : ", count);
           }
        });
    },

    getPost: (postId, successCallback, res) => {
        const PostDAO = this;
        const flog = (message) => console.info("[getPost] " + message);

        // FIXME : Its only getting the body of the post, missing likes and dislikes.
        // FIXME : Use the power of this snippet :

        // FIXME : const {promisify} = require('util');
        // FIXME : const hgetAsync = promisify(client.hget).bind(client);

        // FIXME : Alongside this : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Promise/all
        // FIXME : And make this function a fucking tank !

        // FIXME : Also there is no real way to know when things have fucked without passing the res and killing evry shit
        // FIXME : (so detached state warning might never appear before visiting post ... And seeing its detached :D)

        client.hgetall("post:" + postId, (err, response) => {
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

            // Now we create our real Object
            try {
                // pickBy allows me to filter technical datas I don't want exposed in the API
                const completePost = _.pickBy(
                    Object.assign(response, {...JSON.parse(response.body)}),
                    (v, k) => k !== "body"
                );

                successCallback(completePost);
            } catch (e) {
                console.error("JSON PARSE ", {trace: e, origin: response});
                res.status(500).send(Conf.Status._500)
            }
        });
    },

    insertPost: (maybeParentId, post) => {
        client.incr("posts", (err, futureId) => {
            if (!!err) {
                res.status(500).send(Conf.Status._500);
                return;
            }

            client.hset("post:" + futureId, "body", post, (err) => {
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
                const updateParentId = (parent) => {
                    parent.replies.push(Number.parseInt(futureId));
                    client.hset("post:" + maybeParentId, "body", JSON.stringify(parent), redis.print);
                };

                PostDAO.getPost(maybeParentId, updateParentId);
                /*parentPosted
                    ? OK()
                    : res.status(206)
                        .send({message: "Parent Id has not been found ... The post exist in detached state however"});

                return;
                */
            }
        });
    }
    /*,


    getParents: (originNode) => {
        const PostDAO = this;
        const maybeParentId = originNode.parentId;
        if () {
            PostDAO.getPost(maybeParentId, (p) => originNode.parents);
        }
    }*/
};
