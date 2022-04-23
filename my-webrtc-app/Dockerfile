FROM ubuntu:20.04

USER root

ENV TZ=Europe/Helsinki

RUN npm install
RUN npm install typescript -g
RUN tsc
# ENV DEBUG="mediasoup*"
CMD [ "node", "dist/main.js" ]
