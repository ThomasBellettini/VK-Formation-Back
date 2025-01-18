FROM node:20 as builder

WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm run build
EXPOSE 5002

CMD ["node", "dist/index.js"]