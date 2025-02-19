FROM node:20 as builder

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y ffmpeg
RUN apt-get update && apt-get install -y python3 build-essential

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts=false


RUN pnpm install --unsafe-perm
COPY . .
RUN pnpm run build

EXPOSE 5002
EXPOSE 3010

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
