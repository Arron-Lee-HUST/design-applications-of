FROM node:22-alpine

ENV NODE_ENV=production
ENV HOST=0.0.0.0
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.html server.js ./
COPY packages ./packages
COPY docs ./docs

USER node
EXPOSE 3000
CMD ["npm", "start"]
