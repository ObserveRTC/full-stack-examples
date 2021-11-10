FROM node:16

EXPOSE 5080

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "main.js" ]