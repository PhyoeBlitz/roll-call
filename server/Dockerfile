FROM node:20-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN useradd --user-group --create-home --shell /bin/false appuser
USER appuser

EXPOSE 4001

CMD ["node", "index.cjs"]