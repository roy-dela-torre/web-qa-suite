# Pin to the exact playwright npm version (see package.json) so the bundled
# browser matches — a mismatch here makes Playwright unable to find its
# browser executable at runtime.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production

CMD ["npm", "start"]
