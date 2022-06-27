# FROM ubuntu:20.04
FROM ubuntu:jammy-20220531
# FROM sitespeedio/node:ubuntu-20.04-nodejs-16.13.2

USER root

ENV TZ=Europe/Helsinki

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update && apt-get -y --no-install-recommends install \
    sudo \
    vim \
    wget \
    build-essential \
    pkg-config \
    gdb 
    
RUN echo "deb http://archive.ubuntu.com/ubuntu/ focal main restricted universe multiverse" >> /etc/apt/sources.list && \
    echo "deb-src http://archive.ubuntu.com/ubuntu/ focal main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb http://archive.ubuntu.com/ubuntu/ focal-updates main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb-src http://archive.ubuntu.com/ubuntu/ focal-updates main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb http://archive.ubuntu.com/ubuntu/ focal-security main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb-src http://archive.ubuntu.com/ubuntu/ focal-security main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb http://archive.ubuntu.com/ubuntu/ focal-backports main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb-src http://archive.ubuntu.com/ubuntu/ focal-backports main restricted universe multiverse"  >> /etc/apt/sources.list && \
    echo "deb http://archive.canonical.com/ubuntu focal partner"  >> /etc/apt/sources.list && \
    echo "deb-src http://archive.canonical.com/ubuntu focal partner"  >> /etc/apt/sources.list 


RUN apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - && \
    sudo dpkg --configure -a && \
    printf 'y\n1\n\1n' | apt upgrade


RUN apt-get install -y aptitude && \
    aptitude install -y nodejs &&  \
    aptitude install -y npm && \
    apt install -y python3-pip

WORKDIR /app

COPY [ \
    "package.json", \
    "tsconfig.json", \
    "src/*", \
    "*.js", \
    "./" \
    ]

RUN npm install
RUN npm install typescript -g
RUN tsc

# for throttling traffic
RUN apt-get install -y net-tools iproute2 

# ENV DEBUG="mediasoup*"
CMD [ "node", "dist/main.js" ]
