FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3003

CMD ["npm", "start"]
