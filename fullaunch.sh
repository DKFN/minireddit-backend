docker pull redis
docker rm -f reddits-redis
docker rm -f miniredit
docker run --name reddits-redis -d -p 6379:6379 redis --requirepass redispass &

if [ -z $1 ]; then 
	sleep 1;
	echo "######################";
	echo "## YOUR REDIS DOCKER IP IS:#";
	docker inspect reddits-redis | grep "IPAddress";
	echo "######################";
	sleep 2;
	echo "## CHANGE IT IN CONSTANTES.JS";
	sleep 1;
	echo "pass any parameter to skip this advice"
	sleep 1;
	echo "( There is still time during node image building)";
	sleep 5;
fi;

docker build -t miniredit .
docker logs reddits-redis
docker run -v $(pwd):/data --name miniredit -p 80:8080 -e REDIS_HOST="172.17.0.3" -e REDIS_PASS="redispass" miniredit &
./set_dataset.sh
docker logs -f miniredit
