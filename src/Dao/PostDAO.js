const _ = require("lodash");
const {promisify} = require('util');
const Conf = require("../constantes");
const redis = require("redis"),
    client = redis.createClient(Conf.Redis);

const asyncHgetall = promisify(client.hgetall).bind(client);

const _PostDao = () => PostDAO;


const PostDAO = {
    initDb: () => {
        client.get("posts", (err, count) => {
           if (!!err || !count) {
               client.set("posts", 0, redis.print);
               console.warn(" > I created count of posts");
           }
           if (count) {
               console.log(" > Counter exists in DB, posts on boot : ", count);
           }
        });
    },

    getPost: (postId, successCallback, res, fetchPronise) => {
        const PostDAO = this;
        const flog = (message) => console.info("[getPost] " + message);

        client.hgetall("post:" + postId, (err, response) => {
            flog("ERROR:" + err);

            if (err) {
                console.error("[ERROR] Error met");
                res && res.status(500).send(Conf.Status._500);
                return ;
            }

            if (!response) {
                console.error("[ERROR] response met");
                res && res.status(404).send(Conf.Status._404);
                return ;
            }

            // Now we create our real Object
            try {
                successCallback(_PostDao().serializeFromRow(response));
            } catch (e) {
                console.error("JSON PARSE ", {trace: e, origin: response});
                res && res.status(500).send(Conf.Status._500)
            }
        });
    },

    insertPost: (maybeParentId, post, res) => {
        client.incr("posts", (err, futureId) => {
            if (!!err) {
                res.status(500).send(Conf.Status._500);
                return;
            }

            // TODO : Check mandatory fields

            // TODO : For /like && /dislike routes : https://redis.io/commands/HINCRBY
            client.hset("post:" + futureId, "likes", 0);
            client.hset("post:" + futureId, "dislikes", 0);

            // First set parentId to param parent id in array
            const preParentIds = maybeParentId ? [maybeParentId] : [];
            client.hset("post:" + futureId, "parentIds", JSON.stringify(preParentIds), redis.print);
            client.hset("post:" + futureId, "replies", JSON.stringify({}), redis.print);
            client.hset("post:" + futureId, "id", futureId, redis.print);


            // Then push with only parent and reply OK
            const setPostBody = (body) => client.hset("post:" + futureId, "body", JSON.stringify(body), (err) => {
                console.log("Setting : ", JSON.stringify(body));
                if (!!err) {
                    console.error("[POST] Unable to set Bdody : ", err);
                    return;
                }
            });

            setPostBody(post);

            // Adding as a reply if parentId is defined
            if (maybeParentId) {
                const updateParentId = (parent) => {

                    // TODO : Update replies again
                    // parent.replies.push(Number.parseInt(futureId));
                    // client.hset("post:" + maybeParentId, "body", JSON.stringify(parent), redis.print);9

                    // Now register previous post parent Ids
                    // console.log("Parent ids : ", parent.parentIds);

                    const finalParentIds = _.flatten([JSON.parse(parent.parentIds), preParentIds]);
                    // console.log("Final parent ids : ", finalParentIds);
                    client.hset("post:" + futureId, "parentIds", JSON.stringify(finalParentIds), redis.print);
                };

                _PostDao().getPost(maybeParentId, updateParentId);
            }

        });
    },

    getParent: (parentId, handler, previousData) => asyncHgetall("post:"+parentId),


    serializeFromRow: (response) => _.pickBy(
        Object.assign(response, JSON.parse(response.body)),
        (v, k) => k !== "body"
    ),

};

module.exports = PostDAO;