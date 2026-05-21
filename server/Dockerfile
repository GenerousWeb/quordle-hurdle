FROM node:20-alpine

# shared/ types are imported by the server via the "../shared/*" path alias
COPY shared/ /app/shared/

COPY server/package.json server/package-lock.json /app/server/
WORKDIR /app/server
RUN npm ci

COPY server/ /app/server/

ENV PORT=3001
CMD ["npx", "tsx", "src/index.ts"]
