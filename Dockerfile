FROM node:20-bookworm

WORKDIR /usr/src/app

# copy package.json dulu
COPY app/package*.json ./

# install dependency
RUN npm install

# copy source code
COPY app/ .

# generate prisma client
RUN npx prisma generate

EXPOSE 4000

CMD ["node", "src/server.js"]
