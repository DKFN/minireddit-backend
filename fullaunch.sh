docker pull redis
docker rm -f reddits-redis
docker rm -f miniredit
docker run --name reddits-redis -d -p 6379:6379 redis &
docker build -t miniredit .
docker logs reddits-redis
docker run -v $(pwd):/data --name miniredit -p 80:8080 miniredit &
./set_dataset.sh
docker logs -f miniredit
