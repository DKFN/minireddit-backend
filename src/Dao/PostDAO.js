const _ = require("lodash");
const { promisify } = require('util');
const Conf = require("../constantes");
const redis = require("redis"),
    client = redis.createClient(Conf.Redis);

const asyncHgetall = promisify(client.hgetall).bind(client);

const _PostDao = () => PostDAO;

// Filtered fields after DB Serialization / Unserialization
const filteredProps = ["body", "parentIds"];

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
        const flog = (message) => console.log(`[getPost]: ${message}`);

        client.hgetall("post:" + postId, (err, response) => {
            flog("ERROR:" + err);

            if (err) {
                console.error("[ERROR] Error met");
                res && res.status(500).send(Conf.Status._500);
                return;
            }

            if (!response) {
                console.error("[ERROR] response met");
                res && res.status(404).send(Conf.Status._404);
                return;
            }

            // Now we create our real Object
            try {
                successCallback(_PostDao().serializeFromRow(response));
            } catch (e) {
                console.error("JSON PARSE ", { trace: e, origin: response });
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
            client.hset("post:" + futureId, "replies", JSON.stringify([]), redis.print);
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
                    const parentParentIds = JSON.parse(parent.parentIds);
                    const z = () => _PostDao();

                    // On recupere ici tous les parents +1 (parents du parent)
                    // Le but ici est de mettre a jour tout l'arbre de reponses
                    const zippedFutures = parentParentIds.map((pId) => z().getParent(pId));

                     Promise.all(zippedFutures)
                        .then((parents) => {

                            // Pour tous les objets a update
                            const finalParents = parents.map((p) => z().serializeFromRow(p));
                            finalParents.map((par) => {

                                // Cette fonction est recursive et permet de trouver dans l'arbre l'emplacement de la reponse
                                // et de mettre a jour le chemin des reponses
                                function attemptPushStruct(searchReplies, originalReplies,  targetStruct) {
                                    const maybeIndex = _.findIndex(searchReplies , {id: Number.parseInt(parent.id)});

                                    // Si on ne trouve pas, on descend un niveau de reponses
                                    // dans toutes les reponses de ce niveau
                                    // Si l'array est vide, map ne s'executera pas et restera [] sans continuer
                                    if (maybeIndex === -1) {
                                        return Object.assign(
                                            originalReplies,
                                            {replies: searchReplies.map((r) => attemptPushStruct(r.replies, r, targetStruct))}
                                        );
                                    }

                                    // Si on trouve cool on retourne notre structure avec la structure de reponse
                                    // de notre nouveau post
                                    searchReplies[maybeIndex].replies.push(targetStruct);
                                    return Object.assign(originalReplies, {replies: [searchReplies[maybeIndex]]});
                                }

                                const repliesSeq = JSON.parse(par.replies);
                                const newReplies = attemptPushStruct(repliesSeq, repliesSeq, {id: futureId, replies: []});

                                client.hset("post:" + par.id, "replies", JSON.stringify(newReplies), redis.print);

                            });
                        });

                    const finalParentIds = _.flatten([parentParentIds, preParentIds]);
                    client.hset("post:" + futureId, "parentIds", JSON.stringify(finalParentIds), redis.print);

                    // L'update du parent direct est un peu facile
                    let repliesSeq = JSON.parse(parent.replies);
                    repliesSeq.push({id: futureId, replies: []});
                    client.hset("post:" + parent.id, "replies", JSON.stringify(repliesSeq), redis.print);
                };

                _PostDao().getPost(maybeParentId, updateParentId);
            }

        });
    },

    getParent: (parentId, handler, previousData) => asyncHgetall("post:" + parentId),

    likeDislikePost: (postId, field, res) => {
        const key = `post:${postId}`;
        const like = () => client.hincrby(key, field, 1, (err, response) => _PostDao().errorHandler(err, response, res));

        _PostDao().exists(key, res, like);
    },

    exists: (key, res, success) => client.hget(key, 'id', (err, response) => _PostDao().errorHandler(err, response, res, success)),

    errorHandler: (err, fnRes, orgRes, cb) => {
        if (err) {
            console.error("[ERROR] Error met");
            orgRes && orgRes.status(500).send(Conf.Status._500);
            return;
        }

        if (!fnRes) {
            console.error("[ERROR] response met");
            orgRes && orgRes.status(404).send(Conf.Status._404);
            return;
        }

        return cb ? cb() : orgRes && orgRes.status(200).send({ message: 'OK' });;
    },

    serializeFromRow: (response) => _.pickBy(
        Object.assign(response, JSON.parse(response.body)),
        (v, k) => k !== "body"
    ),

};

module.exports = PostDAO;