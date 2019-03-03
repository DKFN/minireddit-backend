# MiniReddit-Backend
MiniReddit School project backend

## Launch the damn thing


You should be able to launch the back by typing: ``./fullstart.sh``


##### Read the below part if you have problems, it is the manual way.

First thing first, get yourself a redis up and running:
```shell
 docker run --name reddits-redis -p 6379:6379  redis
```

You will see this few microseconds later:
```
02 Mar 2019 18:17:30.841 * Ready to accept connections
```

Fine. Now if you encounter no errors (or else it should only be a command away written in the logs)

Plz then find IP of your wonderful docker like this:
```shell
docker inspect reddits-redis | grep "IPAddress"
```

Nice, when you got it, edit the src/constantes.js file of the project and update this with your docker IP:
```javascript
    { 
        Redis: {
            host: "172.17.0.2",
        }
    }
```

Now you have to "compile" the docker file (you will need to do this each time you change something,
as it is copied on build in the Dockerfile. There are alternatives however).

```shell
docker build -t miniredit .
``` 

Then launch the thing !
```shell
docker run -p 80:8080 miniredit 
```

If you are greeted with :
```shell 
> minireddit-backend@1.0.0 start /usr/src/app
> node ./src/index.js

Server listening on port: 8080
I created count of posts
Reply: OK
```

Then node has started wich is good. "I created count of posts" means your redis DB is empty so the app has initialised it
And "REPLY OK" means redis was successful ! (Posts are keeped beetween backend runs, ofc)

So a side note about db, if you stop you redis docker, data will still be saved in container state. So, remove the container if you want to flush it all.

Nice , now lets get to 
## Usage of the API 

(This part needs update on datasources explanation, whole idea is the same but id fetching has quite changed it will come very soon)

Minimum version of a post (To be discussed):
```json
{
	"title": "HelloRedis!",
	"parentId": null,
	"replies": [],
	"message": "Can you see me ? O_o",
	"author": "Deadly :3"
}
```

(For this part, I strongly suggest you use postman)

Kewl, lets see the API to POST a post:
```POST /post/:maybeParentId```

Ok, so call the API with a POST call and this JSON in body (Be carefull, the actual exposed port is 80, so call: http://localhost/post)

Your reply should be a 200 with following content:
```json 
{
    "message": "OK"
}
```

So you can get it now with a get request to GET ``http://localhost/post/1``

Nice ! :D

Now if you want to add a comment to it do this call:
POST ``http://localhost/post/1``

with the following body:
```json 
{
	"title": null,
	"parentId": 1,
	"replies": [],
	"message": "YES",
	"author": "REDIS"
}
```

If you then try to GEt ``http://localhost/post/1`` again you should see that it has quite changed:

```json
{
    "title": "HelloRedis",
    "parentId": 0,
    "replies": [
        2
    ],
    "message": "Can you see me ? O_o",
    "author": "Deadly :3"
}
```

Nice !!!
Actually its not really really the intended behavior of the app (Ouai je suis chafouin).

In reality the Call should render thisnow:
```json
{
    "parents": [],
    "post": {
        "title": "HelloRedis",
        "parentId": 0,
        "replies": [
            2
        ],
        "message": "Can you see me ? O_o",
        "author": "Deadly :3"
    },
    "replies": [
         {
            "title": null,
            "parentId": 1,
            "replies": [],
            "message": "YES",
            "author": "REDIS"
        }     
    ]
}
```

Are you seeing the picture of what I'm thinking ? :)
## Routes

/posts : 
    - get : /:id
    - getAll : /
    - post : (params, one or array of posts)
    - delete : (params)
    - put : /:id (params)