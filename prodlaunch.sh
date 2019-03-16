#!/bin/sh

docker stop miniredit
docker stop reddits-redis
docker rm miniredit
docker rm reddits-redis

docker build -t miniredit .
docker logs reddits-redis
docker run -v $(pwd):/data --name miniredit -p 80:8080 -e REDIS_HOST="perma-8gb01.ovh-grav.infra.tetel.in" -e REDIS_PASS="redispass" -d miniredit
