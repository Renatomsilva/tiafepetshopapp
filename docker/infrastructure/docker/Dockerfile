FROM node:6.9.2-wheezy

RUN mkdir /opt/tiafepetshop-app

WORKDIR /opt/tiafepetshop-app

COPY package.json .

RUN npm install --production

COPY ./app ./app

COPY ./app_v2 ./app_v2

COPY ./app_v1 ./app_v1

COPY ./config ./config

COPY ./libs ./libs

COPY ./pdf_process ./pdf_process

COPY ./public ./public

COPY ./templates ./templates

COPY ./upload ./upload

COPY ./views ./views

COPY .env-test .env

COPY app.json .

COPY index.js .

ENV NODE_ENV=test

EXPOSE 4000

EXPOSE 5858

CMD ["node", "--debug=5858","index.js"]