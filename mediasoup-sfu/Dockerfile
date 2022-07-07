FROM node:latest

USER root

ENV TZ=Europe/Helsinki

WORKDIR /app

COPY package.json ./

COPY ./ ./

# RUN apk add --no-cache git make bash python3 py3-pip net-tools gcc alpine-sdk iproute2 linux-headers
RUN apt-get update && apt-get install -y build-essential python3 python3-pip iproute2 net-tools make
RUN npm install
RUN npm install typescript -g
RUN tsc

# for throttling traffic
# RUN apt-get install -y net-tools iproute2 

# ENV DEBUG="mediasoup*"
CMD [ "node", "dist/main.js" ]
