FROM node:20 as builder

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y ffmpeg

# Installer PNPM globalement
RUN npm install -g pnpm

# Configurer PNPM pour autoriser les scripts de build
RUN pnpm config set enable-pre-post-scripts true

# Copier les fichiers package.json et pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Approuver bcrypt avant d'installer
RUN pnpm approve-builds bcrypt

# Installer les dépendances avec les scripts de build autorisés
RUN pnpm install --unsafe-perm

# Copier tout le code source
COPY . .

# Builder l'application
RUN pnpm run build

EXPOSE 5002

CMD ["node", "dist/index.js"]
