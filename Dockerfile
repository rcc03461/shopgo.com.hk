FROM oven/bun:1.2.22 AS base
WORKDIR /app

# 先安裝依賴以提升快取命中率
COPY package.json bun.lock ./
# 你的 VPS 在 bun install 會於 esbuild postinstall 失敗，改用 npm 安裝可避開該相容性問題
RUN npm install

# 複製完整專案並建置 Nuxt 產物
COPY . .
RUN npm run build

FROM oven/bun:1.2.22 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# 保留 migration 所需腳本與設定；服務啟動只依賴 .output
COPY --from=base /app/.output ./.output
COPY --from=base /app/server ./server
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=base /app/server/database/migrations ./server/database/migrations
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/bun.lock ./bun.lock

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
