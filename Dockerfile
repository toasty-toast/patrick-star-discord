FROM node:16-slim
WORKDIR /app

RUN apt-get update && \
    apt-get install -y build-essential ffmpeg python3 && \
    apt-get clean

ENV DISCORD_BOT_TOKEN=""

COPY package.json package-lock.json ./
RUN npm install

COPY res/ ./res/
COPY index.js .

ENTRYPOINT ["node", "./index.js"]