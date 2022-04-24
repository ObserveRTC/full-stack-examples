FROM node:alpine
USER root

ENV TZ=Europe/Helsinki

WORKDIR /app

COPY package.json ./

COPY ./ ./

RUN npm install

RUN npm install typescript -g
RUN npm install webpack webpack-cli --save-dev
RUN npm run prod-compile

CMD ["npm", "run", "start"]