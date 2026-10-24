FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /app
COPY package.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
COPY index.html ./index.html
RUN mkdir -p public && cp index.html public/index.html
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
