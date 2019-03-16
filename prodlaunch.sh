#!/bin/sh

# Provisory
docker run --name reddits-redis -d -p 6379:6379 redis --requirepass redispass &

sleep 5;

docker build -t miniredit .
docker logs reddits-redis
docker run -v $(pwd):/data --name miniredit -p 80:8080 -e REDIS_HOST="172.17.0.2" -e REDIS_PASS="redispass" miniredit &
