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
                    const zippedFutures = parentParentIds.map((pId) => z().getPostAsync(pId));

                    Promise.all(zippedFutures)
                        .then((parents) => {

                            // Pour tous les objets a update
                            const finalParents = parents.map((p) => z().serializeFromRow(p));
                            finalParents.map((par) => {

                                // Cette fonction est recursive et permet de trouver dans l'arbre l'emplacement de la reponse
                                // et de mettre a jour le chemin des reponses
                                function attemptPushStruct(searchReplies, originalReplies, targetStruct) {
                                    const maybeIndex = _.findIndex(searchReplies, { id: Number.parseInt(parent.id) });

                                    // Si on ne trouve pas, on descend un niveau de reponses
                                    // dans toutes les reponses de ce niveau
                                    // Si l'array est vide, map ne s'executera pas et restera [] sans continuer
                                    if (maybeIndex === -1) {
                                        return Object.assign(
                                            originalReplies,
                                            { replies: searchReplies.map((r) => attemptPushStruct(r.replies, r, targetStruct)) }
                                        );
                                    }

                                    // Si on trouve cool on retourne notre structure avec la structure de reponse
                                    // de notre nouveau post
                                    searchReplies[maybeIndex].replies.push(targetStruct);
                                    return Object.assign(originalReplies, { replies: [searchReplies[maybeIndex]] });
                                }

                                const repliesSeq = JSON.parse(par.replies);
                                const newReplies = attemptPushStruct(repliesSeq, repliesSeq, { id: futureId, replies: [] });

                                client.hset("post:" + par.id, "replies", JSON.stringify(newReplies), redis.print);

                            });
                        });

                    const finalParentIds = _.flatten([parentParentIds, preParentIds]);
                    client.hset("post:" + futureId, "parentIds", JSON.stringify(finalParentIds), redis.print);

                    // L'update du parent direct est un peu facile
                    let repliesSeq = JSON.parse(parent.replies);
                    repliesSeq.push({ id: futureId, replies: [] });
                    client.hset("post:" + parent.id, "replies", JSON.stringify(repliesSeq), redis.print);
                };

                _PostDao().getPost(maybeParentId, updateParentId);
            }

        });
    },

    setPostReplies: (post, next) => {
        const mapIds = (arr) => arr.map(p => p.id);
        const repliesIds = mapIds(JSON.parse(post.replies))

        const getRepliesIds = (posts) => {
            const allReplies = posts.map(p => p.replies)
            const rep = JSON.parse(p.replies)


            const reps = [...rep, ...allReplies].map(r => r.id);

            if (allReplies.replies.length > 0) return getRepliesIds()

            return allRepliesn;

        }

        const repliesFromArray = (ids, next) => {
            const futures = ids.map(id => _PostDao().getPostAsync(id))

            Promise.all(futures)
                .then(posts => {
                    posts.map(p => {
                        const replies = JSON.parse(p.replies)

                        if (replies.length > 0) _PostsetPostReplies(replies.map(rep => rep.id))
                        else {
                            post.replies = replies;
                            next(post);
                        }
                    })
                    posts.forEach(p => postsFromArray(p.replies.map(r => r.id)))
                })
        }

        repliesFromArray(repliesIds, next);
    },

    getTree: (post, res) => {

        const toFlatArray = (arr) => {
            const flattener = (arr) =>
                arr.map(elt => {
                    if (elt.replies && elt.replies.length > 0) elt.replies = flattener(elt.replies)
                    return _.flatten(Object.values(elt))
                })

            return _.flattenDeep(flattener(arr))
        }

        const flattenReplies = toFlatArray(JSON.parse(post.replies));

        const futures = flattenReplies.map(rep => _PostDao().getPostAsync(rep));

        Promise.all(futures).then(replies => {
            const buildReplies = (arr) => arr.map(rep => replies.find(r => Number.parseInt(r.id) === rep.id));

            const finalReplies = (arr) => {
                return buildReplies(JSON.parse(arr)).map(rep => {
                    if (rep.replies && rep.replies.length > 0) rep.replies = finalReplies(rep.replies)
                    return rep;
                })
            }

            post.replies = finalReplies(post.replies)
            res.send(post);
        })


    },

    getPostAsync: (id, handler, previousData) => asyncHgetall("post:" + id),

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