FROM node:20 as builder

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y ffmpeg
RUN apt-get install -y build-essential
RUN apt-get install -y python3

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --unsafe-perm
COPY . .
RUN pnpm run build
EXPOSE 5002
CMD ["node", "dist/index.js"]
