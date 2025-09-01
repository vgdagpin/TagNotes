cd..

docker build -t tagnotes -f Src/Dockerfile .
docker stop tagnotes || true
docker rm tagnotes || true
docker run -d -p 3000:80 --name tagnotes tagnotes