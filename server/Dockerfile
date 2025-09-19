FROM node:trixie-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN useradd --user-group --create-home --shell /bin/false appuser

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 4001

CMD ["node", "index.cjs"]