echo "SET DATASET: Waiting for server. Timeout 5s"
sleep 5;

curl -X POST \
  http://localhost/post \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "O",
	"message": "Original !",
	"author": "Admin"
}';

curl -X POST \
  http://localhost/post/1 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "Reply 2!",
	"author": "Admin"
}';

curl -X POST \
  http://localhost/post/2 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "Reply 3!",
	"author": "Admin"
}';

curl -X POST \
  http://localhost/post/3 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "Reply 4!",
	"author": "Admin"
}';


curl -X POST \
  http://localhost/post/1 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
	"title": "R",
	"message": "Diverging /o/",
	"author": "Admin"
}';
