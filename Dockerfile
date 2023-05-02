FROM node:19-alpine
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

# port 8080 is the default port for the node server
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
