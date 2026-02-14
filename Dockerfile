FROM node:20-bookworm

WORKDIR /usr/src/app

# Copy package.json dulu (biar cache install optimal)
COPY app/package*.json ./

# Install dependency
RUN npm install

# Copy source code
COPY app/ .

# Copy folder uploads
# COPY uploads ./uploads

# Generate prisma client
RUN npx prisma generate

EXPOSE 9876

CMD ["node", "src/server.js"]
