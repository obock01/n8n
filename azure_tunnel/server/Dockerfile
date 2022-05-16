FROM node:10.1.0-alpine

WORKDIR /app

COPY package.json /app/
COPY yarn.lock /app/

RUN yarn install --production && yarn cache clean

COPY ../../../../Downloads/server-master /app

ENV NODE_ENV production
ENTRYPOINT ["node", "-r", "esm", "./bin/server"]
