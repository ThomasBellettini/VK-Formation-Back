FROM node:20 as builder

WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --unsafe-perm
COPY . .
RUN pnpm run build
EXPOSE 5002

CMD ["node", "dist/index.js"]