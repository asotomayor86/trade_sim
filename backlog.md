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

## F10 — Gestión y perfil de usuarios

> Objetivo: listado público de usuarios con métricas, ficha de perfil con 4 pestañas, acciones admin auditadas y cambio de contraseña propio.
> Diseño completo en `architecture.md` §§14–16.

### F10-01 · Migración de BD

- [ ] Añadir `deactivatedAt DateTime?` y `lastPasswordResetAt DateTime?` al modelo `User`
- [ ] Añadir enum `UserAuditAction` (RESET_PASSWORD, DEACTIVATE, REACTIVATE, ROLE_CHANGE)
- [ ] Crear modelo `UserAuditLog` con relaciones actor/target, índices por `targetId` y `createdAt`
- [ ] `npx prisma migrate dev --name f10_user_profiles`
- [AC] Migración aplicada sin errores en local y producción

### F10-02 · Listado de usuarios `/app/users`

- [ ] RH `GET /api/users` — devuelve todos los usuarios con stats básicas (avgReturn, totalTrades); filtra inactivos si no es admin; ordenación por parámetro `sort` (ranking | alpha | ops | recent)
- [ ] Página `/app/users` — server component; tabla con username, retorno medio (o "—" si < 5 ops), nº ops, estado
- [ ] Usuarios con < 5 ops cerradas → "—" en métrica, aparecen al final ordenados alfabéticamente
- [ ] Usuarios inactivos: ocultos para no-admins; visibles grisados al final para admins
- [ ] Ordenaciones alternativas: toggle en cliente sin reload (o URL params)
- [ ] Click en fila → navega a `/app/users/[id]`
- [ ] Añadir "Usuarios" al sidebar (entre Ranking y Alertas)
- [AC] Lista muestra métricas reales; inactivos ocultos para usuarios normales

### F10-03 · Ficha de usuario — shell y pestaña Resumen

- [ ] Página `/app/users/[id]` — server component; determina modo (yo / otro / admin)
- [ ] `UserCard` — cabecera: username, fecha de alta, rol, badge activo/inactivo
- [ ] `UserTabs` — shell de pestañas (Resumen / Histórico / Análisis / Ajustes)
- [ ] RH `GET /api/users/[id]` — datos del perfil: user info + stats agregadas
- [ ] Stats: avgReturn, winRate, nº ops totales, mejor op (max pnlPct), peor op (min pnlPct)
- [ ] Operaciones abiertas actuales (tabla; siempre visibles)
- [ ] RH `GET /api/users/[id]/stats` — agregados: retorno medio por sector, top 3 análisis más usados, top 5 tickers, distribución LONG/SHORT
- [ ] `ResumenTab` — pinta stats + ops abiertas + indicadores promedio
- [AC] Ficha carga < 500 ms; stats correctas para cualquier usuario

### F10-04 · Ficha de usuario — pestaña Histórico (lazy + paginación cursor)

- [ ] RH `GET /api/users/[id]/operations?status=closed&cursor=X&limit=20` — paginación cursor-based por `(closedAt DESC, id DESC)`; soporta filtros `sector` y `analysisId`
- [ ] `HistoricoTab` — colapsado por defecto; toggle "Ver histórico" dispara primer fetch
- [ ] Botón "Cargar más" (o scroll automático) para páginas siguientes
- [ ] Filtros inline: sector y análisis (actualizan la query sin reiniciar paginación si el cursor se resetea)
- [AC] Primer expand carga ≤ 20 ops en < 300 ms; el histórico completo no se carga si no se expande

### F10-05 · Ficha de usuario — pestaña Análisis

- [ ] Reutilizar datos de `GET /api/users/[id]/stats` (ya incluye top análisis)
- [ ] `AnalisisTab` — tabla: análisis, nº ops, avgReturn, winRate; ordenado por nº ops DESC
- [ ] Distribución sesgo (LONG vs SHORT) por análisis en barra o texto
- [AC] Pestaña muestra métricas reales agrupadas por análisis

### F10-06 · Ficha de usuario — pestaña Ajustes (modo "yo mismo")

- [ ] SA `changeMyPassword(currentPassword, newPassword)` — verifica password actual con bcrypt antes de actualizar; Zod validation (min 8 chars)
- [ ] Formulario de cambio de contraseña en `AjustesTab` (modo yo mismo)
- [ ] Lista de dispositivos push suscritos (endpoints); botón "Revocar" por dispositivo
- [ ] RH `DELETE /api/push/subscribe` existente — reutilizar para revocar dispositivos
- [ ] Botón "Cerrar sesión" (llama `signOut()`)
- [AC] Cambio de contraseña falla si la actual es incorrecta; push devices se listan y revocan

### F10-07 · Acciones admin sobre usuarios

- [ ] RH `POST /api/admin/users/[id]/reset-password` — genera contraseña aleatoria (16 chars), hashea, actualiza BD, registra audit log, devuelve plaintext **una sola vez** en la respuesta
- [ ] RH `POST /api/admin/users/[id]/deactivate` — `active=false`, `deactivatedAt=now()`, audit log
- [ ] RH `POST /api/admin/users/[id]/reactivate` — `active=true`, `deactivatedAt=null`, audit log
- [ ] RH `POST /api/admin/users/[id]/role` — cambia rol en **transacción** con check `≥1 admin activo`; audit log con `metadata: { from, to }`
- [ ] `AjustesTab` modo admin — formulario con las 4 acciones; contraseña temporal se muestra en modal una sola vez tras reset
- [ ] Proteger todos los RH con `requireAdmin()`; verificar que `targetId !== actorId` en deactivate/role
- [AC] Role change bloqueado si dejaría sistema sin admins; contraseña temporal mostrada solo en la respuesta inmediata

### F10-08 · Log de auditoría admin

- [ ] RH `GET /api/admin/audit-log?cursor=X&limit=50&targetId=Y` — log paginado cursor-based por `createdAt DESC`
- [ ] Página `/admin/audit-log` — tabla: fecha, actor, target, acción, metadata relevante
- [ ] Enlace en sidebar del admin (bajo sección Admin)
- [AC] Toda acción de F10-07 aparece en el log; paginación funciona correctamente

### F10-09 · Ajustes de navegación y UX

- [ ] Añadir "Usuarios" al sidebar entre Ranking y Alertas
- [ ] Desde ficha de usuario, click en nombre del análisis → navega a `/app/analyses/[id]`
- [ ] Desde ficha de usuario, click en ticker → navega a `/app/chart/[symbol]`
- [ ] Responsive: pestaña Histórico en móvil colapsa columnas secundarias
- [AC] Navegación coherente con el resto de la app

### F10-10 · Tests

- [ ] Test unitario: regla `≥1 admin activo` (función pura que recibe lista de usuarios y valida)
- [ ] Test unitario: `changeMyPassword` — verifica que falla con contraseña actual incorrecta
- [ ] Test unitario: `computeRanking` con umbral de 5 ops (ya cubierto parcialmente en metrics.test.ts — ampliar)
- [AC] Nuevos tests pasan sin errores; `npm test` sigue verde

---

## F11 — Sistema de Análisis Técnico

> F11 completada (2026-05-17). Ver architecture.md §18 para decisiones completas.
> Motor de indicadores desacoplado, UltimoAnalisisAplicado, permisos abiertos, límite 15.
> Nuevos tipos: VWAP, STOCH. Selector de análisis en gráfico reemplaza IndicatorPanel manual.

---

## F12 — Playbook, Estrategias y Trading Ficticio

> Objetivo: nueva sección Playbook con Análisis + Estrategias. Órdenes ficticias con entrada automática a precio objetivo (validez 7 días), cierre automático por TP/SL a granularidad 1 min.
> Importe fijo 1.000$/orden. Permisos abiertos en estrategias. Sin límite numérico de estrategias.
> Diseño completo en `architecture.md` §19.

### F12-01 · Migración Prisma

- [x] Añadir `code String? @unique` a `Analysis`
- [x] Añadir enums: `StrategySuffix` (LONG/SHORT/BNC/UP/DN), `OrderStatus` (PENDING/EXECUTED/EXPIRED), `UnexecutedReason` (EXPIRED), `StrategyEntryRule` (7 reglas), `ExitTargetType` (3 tipos), `StopLossType` (2 tipos)
- [x] Crear modelo `Strategy` con FK analysisId, `@@unique([analysisId, suffix])`, code único global
- [x] Crear modelo `Order` (PENDING→EXECUTED|EXPIRED, targetPrice, expiresAt, amount 1000)
- [x] Crear modelo `UnexecutedOrder` (registro de órdenes expiradas)
- [x] Extender `Operation`: `orderId String? @unique`, `strategyId String?`, `targetPriceExit Float?`, `closedByStrategy Boolean @default(false)`
- [x] Añadir relaciones en User, Ticker, Analysis, Operation
- [x] Crear migración SQL manual `prisma/migrations/20260517_f12_playbook/`
- [x] `npx prisma generate`
- [AC] `tsc --noEmit` sin errores ✓

### F12-02 · Generador de códigos automáticos + tests

- [x] Crear `src/lib/playbook/codes.ts`
  - [x] `generateAnalysisCode(name, existingCodes[])` → 3 letras, consonantes del nombre normalizado, resolución colisiones TND2/TND3
  - [x] `generateStrategyCode(analysisCode, suffix)` → "RSB-BNC"
- [x] Tests unitarios en `src/lib/playbook/codes.test.ts`
  - [x] Casos base: "Tendencia clásica" → "TND", "Breakout" → "BRK"
  - [x] Colisión: si "TND" existe, devuelve "TND2"
  - [x] `generateStrategyCode("RSB", "BNC")` → "RSB-BNC"
- [AC] Todos los tests pasan ✓

### F12-03 · Seed F12 — análisis con codes + 7 estrategias

- [x] Crear `prisma/seedAnalysesV2.ts` — upsert 5 análisis estándar con codes (TND/RSB/BRK/SCP/VWP), indicadores F11-compatible
- [x] Crear `prisma/seedStrategies.ts` — 7 estrategias predefinidas (`isStandard: true`)
- [x] Añadir scripts `"db:seed-analyses-v2"` y `"db:seed-strategies"` a package.json
- [AC] Seeds corren sin errores; 5 análisis con code + 7 estrategias con isStandard=true en BD ✓

### F12-04 · Server Actions de Estrategia — CRUD

- [x] Crear `src/actions/strategies.ts`
  - [x] `createStrategy(input)` — genera code, valida unicidad nombre y `(analysisId, suffix)`, sin límite numérico
  - [x] `updateStrategy(id, input)` — edición viva; bloquea si hay órdenes PENDING
  - [x] `deleteStrategy(id)` — soft delete; bloquea si hay órdenes PENDING u operaciones OPEN vinculadas
  - [x] `cloneStrategy(id)` — duplica con nuevo code (nuevo sufijo o análisis)
- [x] Validación Zod en todas las entradas
- [AC] CRUD completo; unicidades enforced ✓

### F12-05 · Páginas `/app/playbook/strategies`

- [x] `/app/playbook/strategies/page.tsx` — lista todas las estrategias (no borradas); código, nombre, análisis, regla, objetivo, stop, badge predefinida
- [x] `/app/playbook/strategies/new/page.tsx` + `StrategyEditor` — formulario con análisis (dropdown), suffix, entryRule (dropdown + params dinámicos), exitTargetType + valor, stopLossType + valor
- [x] `/app/playbook/strategies/[id]/page.tsx` — edición; botón Duplicar y Borrar
- [x] `/app/playbook/analyses/page.tsx` — redirect a `/app/analyses` (reutilización)
- [AC] CRUD UI funcional; validaciones de negocio muestran mensajes claros ✓

### F12-06 · Sidebar — sección Playbook

- [x] Reemplazar entrada "Análisis" por grupo "Playbook" con dos sub-ítems: "Análisis" (→ `/app/analyses`) y "Estrategias" (→ `/app/playbook/strategies`)
- [x] Añadir "Órdenes" al sidebar (→ `/app/orders`)
- [AC] Navegación coherente; sub-ítems con indentación visual ✓

### F12-07 · SA `createOrder` + selector de estrategia + modal "Lanzar orden"

- [x] Crear `src/actions/orders.ts`
  - [x] `createOrder(tickerId, strategyId, targetPrice, direction)` — crea Order PENDING, `expiresAt = now + 7d`, amount=1000, Zod validation
- [x] Actualizar `src/app/app/chart/[symbol]/page.tsx` — pasar estrategias filtradas por análisis activo
- [x] Crear `src/components/chart/StrategySelector.tsx` — dropdown de estrategias del análisis activo
- [x] Crear `src/components/chart/LaunchOrderModal.tsx` — modal con preview (estrategia, símbolo, 1000$, 7 días), input precio objetivo, cálculo automático TP/SL según estrategia
- [AC] Modal muestra preview correcto; orden creada en BD con expiresAt = now + 7d ✓

### F12-08 · Motor de evaluación de órdenes y operaciones

- [x] Crear `src/lib/orders/evaluator.ts`
  - [x] `evaluateOrder(order, candle)` → `"EXECUTE" | "EXPIRE" | "WAIT"`: precio en [low,high] → EXECUTE; expiresAt < now → EXPIRE; else WAIT
  - [x] `evaluateOperation(op, candle)` → `"CLOSE_SL" | "CLOSE_TP" | "HOLD"`: SL gana si ambos en misma vela
  - [x] `computeExitPrices(strategy, entryPrice, candles)` → `{ tpPrice, slPrice }` — calcula TP/SL concretos desde la definición de la estrategia
- [x] Tests unitarios en `src/lib/orders/evaluator.test.ts`
  - [x] Order EXECUTE cuando targetPrice en [low, high]
  - [x] Order WAIT cuando precio fuera de rango
  - [x] Order EXPIRE cuando expiresAt pasado
  - [x] Operation CLOSE_SL cuando SL en rango (aunque TP también lo esté → SL gana)
  - [x] Operation CLOSE_TP cuando solo TP en rango
  - [x] Operation HOLD cuando ninguno en rango
- [AC] Todos los tests pasan; la regla SL > TP misma vela se verifica explícitamente ✓

### F12-09 · RH `/api/cron/evaluate-orders` + GitHub Action

- [x] Crear `src/app/api/cron/evaluate-orders/route.ts` — protegido con CRON_SECRET
  - [x] Fetch vela 1 min más reciente de Alpaca para cada ticker con órdenes PENDING u operaciones de estrategia OPEN
  - [x] Para cada Order PENDING no expirada: `evaluateOrder` → si EXECUTE → crear Operation + marcar Order EXECUTED
  - [x] Para cada Order PENDING expirada: marcar EXPIRED + crear UnexecutedOrder
  - [x] Para cada Operation OPEN con orderId: `evaluateOperation` → cerrar si TP/SL hit
  - [x] Implementar `computeExitPrices` al crear Operation desde Order
- [x] Crear `.github/workflows/evaluate-orders.yml` con schedule `*/5 * * * *` (fallback conservador)
- [AC] Cron procesa correctamente órdenes y operaciones; responde 200 con stats ✓

### F12-10 · Página `/app/orders` (3 pestañas)

- [x] `/app/orders/page.tsx` — tabs: Pendientes / Ejecutadas / No ejecutadas
- [x] Pendientes: Orders con status=PENDING del usuario; columnas: estrategia, ticker, precio objetivo, dirección, expira en (countdown)
- [x] Ejecutadas: enlace a `/app/operations?filter=playbook` con operaciones de Playbook
- [x] No ejecutadas: UnexecutedOrders del usuario; columnas: estrategia, ticker, precio objetivo, motivo, fecha
- [AC] Tres tabs funcionan; countdown de expiración visible ✓

### F12-11 · Extensión `/app/operations`

- [x] Añadir columna "Estrategia" en tabla de operaciones (code si `strategyId` no nulo, "—" si manual)
- [x] Añadir filtro URL param `?filter=playbook` (solo ops con `orderId IS NOT NULL`)
- [x] Link desde `/app/orders` tab Ejecutadas pasa el parámetro
- [AC] Operaciones de Playbook identificables; filtro funciona ✓

### F12-12 · Actualizar architecture.md §19

- [x] Nueva sección §19 F12 con todas las decisiones (importe 1000$, validez 7 días, granularidad 5 min, SL gana, permisos abiertos, sin límite estrategias, códigos inmutables)
- [x] Actualizar §3 carpetas, §4 schema, §5 RH/SA, §13 fases
- [x] Tabla de estrategias predefinidas de referencia
- [AC] Documento actualizado y coherente con la implementación ✓

---

## Orden de ejecución recomendado

```
F1 ✓ → F2-01..05 ✓ → F3-01 ✓ → F2-06 (parcial) → F3-02..03 ✓ →
F4 ✓ → F5 ✓ → F6 ✓ → F7 ✓ → F8 ✓ → F9 ✓ →
F10: F10-01 → ... → F10-10 →
F11 ✓ →
F12: F12-01 → F12-02 → F12-03 → F12-04 → F12-05 → F12-06 → F12-07 →
     F12-08 → F12-09 → F12-10 → F12-11 → F12-12
```

---

## Notas para futuros chats

- Pasar `architecture.md` + este `backlog.md` al inicio de cada sesión
- Indicar qué tarea `FN-XX` se empieza a trabajar
- Al terminar una tarea, marcarla `[x]` y hacer commit del backlog actualizado
- Si una tarea se divide o cambia de alcance, actualizar aquí y anotar la razón
