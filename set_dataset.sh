echo "SET DATASET: Waiting for server. Timeout 5s"
sleep 5;

curl -X POST \
  http://localhost/post \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "Have you feel strange",
	"message": "I am wondering is the sky blue ?",
	"author": "Admin"
}';

curl -X POST \
  http://localhost/post/1 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "I guess for a fact.",
	"author": "Admin"
}';

curl -X POST \
  http://localhost/post/2 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "You have to take in account it is relative for example daltoninans who dont see blue ?",
	"author": "Admin"
}';

curl -X POST \
  http://localhost/post/3 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "I am daltonian and I see blue, but I dont know about orthers.",
	"author": "Admin"
}';


curl -X POST \
  http://localhost/post/1 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "I never see the sky",
	"author": "Admin"
}';
