## syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
ENV NODE_ENV=development

WORKDIR /app

COPY ./package*.json /app

RUN npm install

COPY . .

RUN npm run build