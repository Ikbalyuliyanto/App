FROM node:20-bookworm

WORKDIR /usr/src/app

# copy package.json & package-lock.json dulu
COPY app/package*.json ./

# install dependency
RUN npm install

# copy seluruh source code
COPY app/ .

# generate prisma client (di dalam Linux container)
RUN npx prisma generate

EXPOSE 9876

# pastikan prisma bisa membaca env di runtime
CMD ["node", "src/server.js"]
