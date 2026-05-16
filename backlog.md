# trade_sim — Backlog de implementación

> Estado del proyecto: F1–F9 completadas (2026-05-16)
> Stack: Next.js 16 App Router · TypeScript estricto · Prisma 5 · Neon Postgres · Auth.js v5 · Vercel

---

## Convenciones

- **[AC]** = Criterio de aceptación (Acceptance Criterion)
- **SA** = Server Action
- **RH** = Route Handler
- Cada tarea tiene un ID `FN-XX` para referenciarla fácilmente en futuros chats.
- Marcar completada con `[x]` al terminar cada tarea.

---

## F1 — Scaffold, Auth, BD inicial e invitaciones

> Objetivo: tener una app funcional con login, roles, códigos de invitación y esquema de BD completo.

### F1-01 · Scaffold Next.js 15
- [x] `npx create-next-app@latest trade-sim --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [x] Instalar dependencias base: `prisma@5 @prisma/client@5`, `next-auth@beta`, `bcryptjs`, `zod`, `tsx`, `dotenv`
- [x] Configurar `tsconfig.json` con `strict: true` y paths
- [x] Configurar ESLint + Prettier (`prettier-plugin-tailwindcss`)
- [x] Crear `.env.example` documentado con todas las variables requeridas
- [x] Crear `.env.local` (ignorado en git) con valores de desarrollo
- [AC] `npm run build` pasa sin errores ✓
- **Nota**: Prisma bajado a v5 (v7 requiere Driver Adapters, incompatible con el patrón `new PrismaClient()`). v5 estable, compatible con Auth.js.
- **Nota**: Next.js 16 renombra `middleware.ts` → `proxy.ts` (misma API, solo nombre).

### F1-02 · Prisma + Neon — esquema inicial
- [x] `npx prisma init` y apuntar `DATABASE_URL` a Neon (local: Docker Postgres)
- [x] Definir schema completo en `prisma/schema.prisma` (ver architecture.md §Schema)
- [x] `npx prisma migrate dev --name init` ✓
- [x] Crear `prisma/seed.ts` con usuario admin por defecto
- [x] Script `"db:seed": "tsx prisma/seed.ts"` en package.json
- [AC] Seed corre sin errores ✓

### F1-03 · Auth.js v5 — Credentials provider
- [x] Instalar y configurar `next-auth@beta` en `src/auth.ts`
- [x] Implementar `CredentialsProvider` con validación bcrypt
- [x] Crear `src/lib/auth/session.ts` con helpers `getSession()`, `requireAuth()`, `requireAdmin()`
- [x] Crear `src/proxy.ts` (Next.js 16: `middleware.ts` → `proxy.ts`) para proteger rutas
- [AC] Rutas protegidas redirigen a `/login` sin sesión ✓

### F1-04 · Flujo de registro con código de invitación
- [x] SA `createInvitationCode(note?: string)` — solo admin, genera UUID, guarda en BD como unused
- [x] SA `registerWithCode(username, password, code)` — valida código, crea usuario, marca código como used
- [x] Validaciones con Zod v4: username único, password mínimo 8 chars, código válido
- [x] Página `/register` con formulario y `useActionState`
- [x] Página `/admin/invitations` — lista códigos, genera nuevos, copia link al portapapeles
- [AC] ✓

### F1-05 · Gestión de usuarios (admin)
- [x] SA `resetUserPassword(userId, newPassword)` — solo admin, bcrypt
- [x] SA `setUserActive(userId, active)` — desactivar usuario sin borrarlo
- [x] Página `/admin/users` — lista usuarios, reset password, activar/desactivar
- [AC] ✓

### F1-06 · Layout y navegación base
- [x] Layout `src/app/app/layout.tsx` con sidebar/navbar (carpeta `app/` para URLs `/app/*`)
- [x] Sidebar: Dashboard, Gráficos, Análisis, Operaciones, Alertas, Ranking (user) + Admin (si admin)
- [x] Componente `<UserMenu>` con logout
- [x] Dashboard placeholder `/app/dashboard`
- [AC] Navegación funciona; rutas protegidas redirigen ✓

---

## F2 — Market Data: tickers, precios y Cron

> Objetivo: universo de tickers curado por admin, precios actualizados cada 15 min, interface MarketDataProvider.

### F2-01 · Interfaz MarketDataProvider
- [x] Definir tipos en `src/lib/market-data/types.ts`: `Quote`, `Candle`, `Timeframe`, `SpreadInfo`
- [x] Definir interfaz `MarketDataProvider` en `src/lib/market-data/provider.ts`
- [x] Implementar `MockProvider` en `src/lib/market-data/providers/mock.ts` con datos fijos para tests
- [AC] `MockProvider` implementa la interfaz sin errores de tipos ✓

### F2-02 · Implementación Alpaca
- [x] Implementar `AlpacaProvider` en `src/lib/market-data/providers/alpaca.ts`
  - [x] `getQuotes(symbols[])` → endpoint multi-símbolo `/v2/stocks/quotes/latest?symbols=...&feed=iex`
  - [x] `getCandles(symbol, timeframe, from, to)` → bajo demanda individual
- [x] Variables de entorno: `ALPACA_API_KEY`, `ALPACA_API_SECRET`
- [AC] `AlpacaProvider.getQuotes(["AAPL","MSFT"])` devuelve `Map<symbol, Quote>` en una sola request ✓

### F2-03 · Implementación Yahoo Finance (fallback velas)
- [x] Instalar `yahoo-finance2`
- [x] Implementar `YahooProvider` en `src/lib/market-data/providers/yahoo.ts`
- [x] Factory `src/lib/market-data/index.ts`: exporta proveedor compuesto (Alpaca primario + Yahoo fallback para velas)
- [AC] Si Alpaca falla en `getCandles`, Yahoo responde correctamente ✓

### F2-04 · Gestión de universo de tickers (admin)
- [x] SA `addTicker(symbol, sector)` — valida que existe en Alpaca, guarda
- [x] SA `removeTicker(symbol)` — soft delete (active = false)
- [x] SA `setSpreadOverride(symbol, pct)` — fallback spread manual
- [x] Página `/admin/tickers` — CRUD de tickers con tabla y formulario
- [x] Seed: S&P 100 + 11 ETFs sectoriales SPDR = 112 tickers
- [AC] Admin puede añadir/quitar tickers ✓

### F2-05 · Caché de precios en BD + lógica de spread
- [x] Cron handler `src/app/api/cron/refresh-prices/route.ts` (protegido con `CRON_SECRET`)
- [x] UNA sola request HTTP a Alpaca para todo el universo de símbolos activos
- [x] Upsert en tabla `quotes` con bid/ask/last/timestamp
- [x] Lógica de spread en `src/lib/market-data/spread.ts` (real si hay bid/ask, simulado por sector si no)
- [x] GitHub Actions como scheduler externo (`*/15 * * * *`) — Vercel Hobby solo permite crons diarios
- [AC] Cron completa en < 10 s para 112 tickers ✓

### F2-06 · Caché de velas históricas
- [x] RH `GET /api/market/candles?symbol=X&tf=1D&from=Y&to=Z` — lee de BD si hay datos recientes, si no llama proveedor y cachea
- [ ] Cron de precarga bulk: llama `AlpacaProvider.getCandlesBulk(symbols[], timeframe, from, to)` — endpoint multi-símbolo
- [ ] Precarga inicial: velas diarias de los últimos 2 años para todos los tickers activos
- **Nota**: El RH está implementado y funciona bajo demanda. El cron de precarga masiva fue pospuesto (usuario saltó a F3 directamente). Las velas se cachean progresivamente al abrir el gráfico de cada ticker.

---

## F3 — Gráfico: velas, indicadores y dibujos

> Objetivo: gráfico interactivo con lightweight-charts, indicadores calculados en cliente, dibujos persistentes.

### F3-01 · Componente base de gráfico
- [x] Instalar `lightweight-charts` (v5)
- [x] Crear `src/components/chart/ChartContainer.tsx` — wrapper React con `useEffect` para montar gráfico
- [x] Cargar velas vía RH `/api/market/candles`; soporte timeframes `1D` y `1H`
- [x] Selector de timeframe en UI
- [AC] Gráfico muestra velas OHLCV para cualquier ticker del universo ✓

### F3-02 · Indicadores (calculados en cliente)
- [x] Instalar `technicalindicators`
- [x] Crear `src/lib/indicators/calculations.ts` con: `calcEMA`, `calcSMA`, `calcRSI`, `calcMACD`, `calcBollinger`, `calcATR`, `calcADX`, `calcDonchian`, `calcVolumeSMA`
- [x] Panel de configuración de indicadores (toggle + parámetros)
- [x] Persistir configuración en `localStorage` como `chart_indicators_v1`
- [AC] 9 indicadores funcionando correctamente sobre velas ✓

### F3-03 · Herramientas de dibujo
- [x] SA `saveDrawings(userId, tickerId, analysisId, drawings[])` — upsert en BD
- [x] SA `loadDrawings(userId, tickerId, analysisId)` → `DrawingData[]`
- [x] Tipo `horizontal` — líneas de soporte/resistencia con `createPriceLine`/`removePriceLine`
- [x] Dibujos asociados a (usuario, ticker, análisis) y persistidos en BD
- [ ] Línea de tendencia diagonal
- [ ] Rectángulo
- [ ] Fibonacci retrace
- **Nota**: Solo líneas horizontales implementadas. Los demás tipos de dibujo quedan para una iteración futura si el usuario los solicita.

---

## F4 — Análisis: CRUD, seed, nombres automáticos y snapshots

> Objetivo: análisis como plantillas reutilizables con versionado inmutable al crear operaciones.

### F4-01 · Modelo y CRUD de análisis
- [x] SA `createAnalysis(data)` — crea análisis del usuario con nombre autogenerado si no se proporciona
- [x] SA `updateAnalysis(id, data)` — si hay operaciones abiertas, crea nueva versión en lugar de sobreescribir
- [x] SA `deleteAnalysis(id)` — soft delete; análisis con operaciones no puede borrarse
- [x] SA `cloneAnalysis(id)` — crea copia personal de un análisis estándar/ajeno
- [x] Página `/app/analyses` — lista de análisis del usuario + análisis estándar
- [x] Página `/app/analyses/[id]` — edición de análisis con indicadores y reglas
- [AC] CRUD completo; análisis estándar visibles pero no editables directamente ✓

### F4-02 · Seed de 5 análisis estándar
- [x] `prisma/seedAnalyses.ts` con los 5 análisis (A1–A5) con indicadores y reglas
- [x] Marcados con `isStandard: true`
- [AC] 5 análisis estándar visibles para todos los usuarios ✓

### F4-03 · Autogeneración de nombre de análisis
- [x] Función `generateAnalysisName(bias, indicators, trigger)` en `src/lib/analyses/naming.ts`
- [x] Patrón: `"[Sesgo] · [Indicadores clave] · [Trigger]"`
- [x] El nombre se autogenera on-the-fly en el formulario; usuario puede sobrescribir
- [AC] Nombre autogenerado correcto ✓

### F4-04 · Snapshot inmutable de análisis
- [x] SA `createAnalysisSnapshot(analysisId)` — serializa el estado actual a JSON en `AnalysisSnapshot`
- [x] Snapshot creado automáticamente al abrir una operación
- [AC] Modificar un análisis no afecta operaciones ya abiertas ✓

---

## F5 — Operaciones ficticias: apertura, spread, PnL y cierre

> Objetivo: flujo completo de operación con spread real/simulado y cálculo correcto de PnL.

### F5-01 · Apertura de operación
- [x] SA `openOperation(input)` — lee quote, aplica spread, crea snapshot, guarda `Operation`
- [x] Validación Zod: tickerId cuid, direction enum, tpPrice/slPrice number positive
- [x] Formulario modal con selector de ticker, dirección, análisis, TP/SL opcional y preview de precio
- [AC] Operación guardada con todos los campos; spread correcto; snapshot creado ✓

### F5-02 · Cierre de operación
- [x] SA `closeOperation(operationId, reason)` — lee quote, calcula PnL, guarda cierre
- [x] Auth omitida para razones TP/SL/ALERT (llamadas internas del cron)
- [x] Botón "Cerrar" en tabla de operaciones abiertas
- [AC] PnL calculado correctamente para LONG y SHORT ✓

### F5-03 · Evaluación automática de TP/SL
- [x] Integrado en el cron `refresh-prices` (mismo cron que actualiza precios)
- [x] Por cada operación abierta con TP o SL: compara precio actual vs niveles
- [x] Si se activa → llama `closeOperation(id, 'TP' | 'SL')`
- [AC] Operación con TP/SL se cierra automáticamente en el siguiente ciclo de 15 min ✓

### F5-04 · Historial de operaciones
- [x] Página `/app/operations` — tabla con pestañas abiertas/cerradas
- [x] Operaciones abiertas con PnL no realizado en tiempo real (precio cacheado)
- [x] Operaciones cerradas con PnL%, razón de cierre y timestamps
- [AC] ✓

---

## F6 — Alertas y notificaciones Web Push

> Objetivo: alertas de precio evaluadas en Cron, notificación push + feed in-app.

### F6-01 · Modelo de alertas y evaluación
- [x] SA `createAlert(input)` — condición de precio con Zod validation
- [x] SA `dismissAlert(alertId)` — desactiva alerta manualmente
- [x] Evaluador `src/lib/alerts/evaluator.ts`: operadores >=, <=, >, < sobre precio `last`
- [x] Cron evalúa alertas activas tras actualizar precios; si activa → marca `triggeredAt` + crea notificación + push
- [AC] Alerta de precio se dispara cuando el precio alcanza el nivel definido ✓

### F6-02 · Web Push (VAPID)
- [x] Instalar `web-push`
- [x] Claves VAPID generadas y configuradas en Vercel (producción)
- [x] RH `POST /api/push/subscribe` — guarda `PushSubscription` en BD
- [x] RH `DELETE /api/push/subscribe` — elimina suscripción
- [x] `src/lib/push/sender.ts` — `sendPushToUser(userId, title, body)`
- [x] Service Worker `public/sw.js` maneja evento `push` y muestra notificación nativa
- [AC] Usuario recibe notificación del SO cuando se dispara una alerta ✓

### F6-03 · Feed in-app
- [x] RH `GET /api/notifications` — últimas 30 notificaciones del usuario
- [x] SA `markAllNotificationsRead()` — marca todas como leídas
- [x] Componente `<NotificationBell>` en navbar con badge de no leídas y dropdown
- [x] Página `/app/alerts` — lista de alertas activas, disparadas y desactivadas + formulario de creación
- [AC] Al dispararse una alerta aparece en el feed in-app ✓

---

## F7 — Ranking y métricas

> Objetivo: tabla de ranking con métrica principal + secundarias, filtros por sector/análisis/periodo.

### F7-01 · Cálculo de métricas de usuario
- [x] `src/lib/scoring/metrics.ts`: `computeRanking`, `computeUserMetrics`, `periodToDate`
  - `avgReturnPerTrade`: media aritmética de `pnlPct`
  - `winRate`: % operaciones con pnl > 0
  - `totalTrades`: número de operaciones cerradas
  - `totalPnl`: suma de PnL $
- [AC] Funciones puras con 20+ tests unitarios ✓

### F7-02 · API y página de ranking
- [x] Página `/app/ranking` — server component con filtros por URL params
- [x] Filtros: periodo (7d/30d/90d/all), sector GICS, analysisId
- [x] Tabla: posición (🥇🥈🥉), usuario, retorno medio, win rate, nº ops, PnL total
- [x] Fila del usuario actual resaltada con badge "Tú"
- [x] `<RankingFilters>` — filtros client-side con navegación por URL (compartibles)
- [x] Dashboard `/app/dashboard` actualizado con estadísticas reales del usuario
- [AC] Ranking cambia correctamente al aplicar filtros ✓

---

## F8 — PWA: manifest, service worker e instalación

> Objetivo: app instalable en Android y iOS, experiencia offline básica.

### F8-01 · Web App Manifest
- [x] `public/manifest.json` con: `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, `scope`, `orientation`, `categories`, iconos con `purpose: maskable`
- [x] `<link rel="manifest">` en layout root (vía `metadata.manifest` de Next.js)
- [x] Iconos PNG 192×192 y 512×512 generados con `scripts/generate-icons.js` (sin dependencias externas)
- [AC] Manifest válido para instalación PWA ✓

### F8-02 · Service Worker
- [x] `public/sw.js` con estrategia de caché: network-first para páginas/API, cache-first para assets estáticos
- [x] Pre-caché de assets críticos en `install`
- [x] Limpieza de cachés antiguas en `activate`
- [x] `public/offline.html` — página de error sin conexión con botón "Reintentar"
- [x] SW maneja evento `push` para notificaciones (F6)
- [AC] App muestra página offline cuando no hay red ✓

### F8-03 · Prompt de instalación y UX móvil
- [x] Componente `<InstallPrompt>` — banner Android con `beforeinstallprompt` y dismiss persistente en localStorage
- [x] Instrucciones manuales para iOS (Safari > Compartir > Añadir a pantalla de inicio)
- [x] `appleWebApp` metadata en layout root para experiencia standalone en iOS
- [x] `viewportFit: cover` para pantallas con notch
- [AC] App instalable en Android; instrucciones claras para iOS ✓

---

## F9 — Calidad, seguridad y despliegue

> Estas tareas se intercalan con las fases anteriores pero se consolidan aquí.

### F9-01 · Tests críticos
- [x] Instalar Vitest + `vite-tsconfig-paths`; script `npm test` en package.json
- [x] `src/lib/operations/pnl.test.ts` — 19 tests: calcEntry, calcExit, calcUnrealizedPnL, checkTpSl para LONG y SHORT
- [x] `src/lib/alerts/evaluator.test.ts` — 12 tests: 4 operadores con casos borde y decimales
- [x] `src/lib/scoring/metrics.test.ts` — 10 tests: computeRanking y computeUserMetrics
- [x] `src/lib/analyses/naming.test.ts` — 8 tests: sesgo, indicadores, trigger, formato
- [AC] 49 tests, 0 fallos, ejecución < 250 ms ✓

### F9-02 · Seguridad
- [x] CSP completo en `next.config.ts` (script/style/img/font/connect/worker-src, frame-ancestors 'none')
- [x] HSTS (`max-age=63072000; includeSubDomains; preload`)
- [x] `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- [x] Rate limiting en login: 5 intentos / 10 min por username (`src/lib/auth/rateLimit.ts`)
- [x] Validación Zod en `openOperation` (tickerId cuid, direction enum, TP/SL positive)
- [x] Validación Zod en `createAlert` (tickerId cuid, indicator/op/value, message max 200)
- [x] Todas las SA comprueban `requireAuth()` o `requireAdmin()` antes de actuar
- [x] `CRON_SECRET` Bearer token en todas las rutas de cron

### F9-03 · Despliegue en Vercel + Neon
- [x] Proyecto Vercel conectado al repo GitHub (CI/CD automático en push a master)
- [x] Variables de entorno configuradas en Vercel: DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, AUTH_TRUST_HOST, ALPACA_*, CRON_SECRET, VAPID_*
- [x] Migraciones ejecutadas en producción Neon
- [x] Seeds ejecutados en producción: admin, 112 tickers, 5 análisis estándar
- [x] GitHub Actions como scheduler externo del cron (`*/15 * * * *`) — Vercel Hobby no permite frecuencia < diaria
- [x] App accesible en https://trade-sim-eight.vercel.app ✓

---

## Orden de ejecución recomendado

```
F1 ✓ → F2-01..05 ✓ → F3-01 ✓ → F2-06 (parcial) → F3-02..03 ✓ →
F4 ✓ → F5 ✓ → F6 ✓ → F7 ✓ → F8 ✓ → F9 ✓
```

**Pendiente para futuras iteraciones:**
- F2-06: Cron de precarga bulk de velas históricas (2 años) — las velas se cachean bajo demanda actualmente
- F3-03: Tipos de dibujo adicionales (tendencia, rectángulo, fibonacci)

---

## Notas para futuros chats

- Pasar `architecture.md` + este `backlog.md` al inicio de cada sesión
- Indicar qué tarea `FN-XX` se empieza a trabajar
- Al terminar una tarea, marcarla `[x]` y hacer commit del backlog actualizado
- Si una tarea se divide o cambia de alcance, actualizar aquí y anotar la razón
