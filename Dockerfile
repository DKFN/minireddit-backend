FROM node:11

RUN mkdir -p /usr/src/app/

WORKDIR /usr/src/app/

COPY package*.json /usr/src/app/

RUN npm install
RUN npm i npm@latest

COPY . /usr/src/app/

EXPOSE 8080

ENTRYPOINT [ "npm", "start" ]