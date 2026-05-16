# trade_sim — Backlog de implementación

> Estado del proyecto: planificación inicial (2026-05-16)
> Stack: Next.js 15 App Router · TypeScript estricto · Prisma · Neon Postgres · Auth.js v5 · Vercel

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
- [x] Sidebar: Dashboard, Análisis, Operaciones, Ranking (user) + Admin (si admin)
- [x] Componente `<UserMenu>` con logout
- [x] Dashboard placeholder `/app/dashboard`
- [AC] Navegación funciona; rutas protegidas redirigen ✓

---

## F2 — Market Data: tickers, precios y Cron

> Objetivo: universo de tickers curado por admin, precios actualizados cada 15 min, interface MarketDataProvider.

### F2-01 · Interfaz MarketDataProvider
- [ ] Definir tipos en `src/lib/market-data/types.ts`: `Quote`, `Candle`, `Timeframe`, `SpreadInfo`
- [ ] Definir interfaz `MarketDataProvider` en `src/lib/market-data/provider.ts`
- [ ] Implementar `MockProvider` en `src/lib/market-data/providers/mock.ts` con datos fijos para tests
- [AC] `MockProvider` implementa la interfaz sin errores de tipos

### F2-02 · Implementación Alpaca
- [ ] Instalar `node-fetch` o usar `fetch` nativo de Node 18+
- [ ] Implementar `AlpacaProvider` en `src/lib/market-data/providers/alpaca.ts`
  - `getQuotes(symbols[])` → **endpoint multi-símbolo** `/v2/stocks/quotes/latest?symbols=AAPL,MSFT,...` (feed IEX) — UNA sola request para todo el universo en el cron
  - `getQuote(symbol)` → misma URL pero con un símbolo — solo para llamadas bajo demanda (apertura de gráfico)
  - `getCandles(symbol, timeframe, from, to)` → `/v2/stocks/bars?symbols=X` (individual, bajo demanda)
  - `getCandesBulk(symbols[], timeframe, from, to)` → `/v2/stocks/bars?symbols=A,B,...` — para precarga masiva
  - Si bid/ask ausente en la respuesta → devolver `null` en `bid`/`ask` (el caller usará spread fallback)
- [ ] Variables de entorno: `ALPACA_API_KEY`, `ALPACA_API_SECRET`
- [AC] `AlpacaProvider.getQuotes(["AAPL","MSFT"])` devuelve un `Map<symbol, Quote>` en una sola request HTTP; `getQuote("AAPL")` funciona individualmente

### F2-03 · Implementación Yahoo Finance (fallback velas)
- [ ] Instalar `yahoo-finance2`
- [ ] Implementar `YahooProvider` en `src/lib/market-data/providers/yahoo.ts`
  - Solo implementa `getCandles()` (sin bid/ask)
- [ ] Factory `src/lib/market-data/index.ts`: exporta proveedor compuesto (Alpaca primario + Yahoo fallback para velas)
- [AC] Si Alpaca falla en `getCandles`, Yahoo responde correctamente

### F2-04 · Gestión de universo de tickers (admin)
- [ ] Modelo `Ticker` ya en schema; añadir `sector` (GICS), `active`, `spreadOverridePct`
- [ ] SA `addTicker(symbol, sector)` — valida que existe en Alpaca, guarda
- [ ] SA `removeTicker(symbol)` — soft delete (active = false)
- [ ] SA `setSpreadOverride(symbol, pct)` — fallback spread manual
- [ ] SA `importTickersCsv(csv)` — importación masiva
- [ ] Página `/admin/tickers` — CRUD de tickers con tabla y formulario

**Seed inicial del universo (~200 tickers):**
- [ ] S&P 100 completo (pedir listado actualizado al usuario antes de ejecutar el seed — no inventar símbolos)
- [ ] 11 ETFs sectoriales SPDR: XLK, XLF, XLE, XLV, XLY, XLP, XLI, XLB, XLU, XLRE, XLC
- [ ] Complemento sectorial hasta ~200 tickers cubriendo los 11 sectores GICS de forma equilibrada
- [ ] El seed usa `importTickersCsv` o inserta directamente vía Prisma; cada ticker lleva sector GICS
- [ ] Antes de ejecutar el seed del complemento, solicitar confirmación de la lista al usuario

- [AC] Admin puede añadir/quitar tickers; tickers inactivos no aparecen en el selector de operaciones; seed siembra ~200 tickers sin símbolos inventados

### F2-05 · Caché de precios en BD + lógica de spread
- [ ] Cron handler `src/app/api/cron/refresh-prices/route.ts` (protegido con `CRON_SECRET`)
- [ ] Obtener lista de símbolos activos de BD → llamar `AlpacaProvider.getQuotes(symbols)` — **UNA sola request HTTP** para todo el universo
- [ ] Iterar el `Map<symbol, Quote>` resultante y upsert en BD (batch insert con `createMany` o transacción)
- [ ] Lógica de spread en `src/lib/market-data/spread.ts`:
  1. Si Alpaca devuelve bid/ask → usar directamente
  2. Si no → `mid = lastPrice; bid = mid * (1 - spreadPct/2); ask = mid * (1 + spreadPct/2)`
  3. `spreadPct` viene de `Ticker.spreadOverridePct` o tabla por defecto según sector
- [ ] Vercel Cron schedule: `*/15 * * * *` en `vercel.json`
- [ ] Documentar en README: el intervalo de 15 min funciona en Vercel Hobby pero va justo (el job debe completarse antes del siguiente disparo). Para producción estable recomendar plan Pro o GitHub Actions como scheduler externo de respaldo.
- [AC] Cron completa en < 10 s para 200 tickers (una sola llamada HTTP a Alpaca); `Quote` en BD tiene timestamp reciente; spread siempre calculable

### F2-06 · Caché de velas históricas
- [ ] RH `GET /api/market/candles?symbol=X&tf=1D&from=Y&to=Z` — lee de BD si hay datos recientes, si no llama proveedor y cachea
- [ ] Cron de precarga: llama `AlpacaProvider.getCandlesBulk(symbols[], timeframe, from, to)` — **multi-símbolo**, no N requests individuales
- [ ] Precarga inicial: velas diarias de los últimos 2 años para todos los tickers activos
- [AC] Respuesta de velas en < 200ms para datos cacheados; precarga usa endpoint bulk de Alpaca

---

## F3 — Gráfico: velas, indicadores y dibujos

> Objetivo: gráfico interactivo con lightweight-charts, indicadores calculados en cliente, dibujos persistentes.

### F3-01 · Componente base de gráfico
- [ ] Instalar `lightweight-charts`
- [ ] Crear `src/components/chart/Chart.tsx` — wrapper React con `useEffect` para montar gráfico
- [ ] Cargar velas vía RH `/api/market/candles`; soporte timeframes `1D` y `1H`
- [ ] Selector de timeframe en UI
- [AC] Gráfico muestra velas OHLCV para cualquier ticker del universo

### F3-02 · Indicadores (calculados en cliente)
- [ ] Instalar `technicalindicators`
- [ ] Crear `src/lib/indicators/` con módulos individuales:
  - `sma.ts`, `ema.ts` — Moving averages
  - `rsi.ts`, `macd.ts` — Momentum
  - `bollinger.ts`, `atr.ts` — Volatilidad
  - `adx.ts` — Tendencia
  - `donchian.ts` — Canal
  - `volume.ts` — Media de volumen
- [ ] Hook `useIndicators(candles, config[])` que retorna series listas para lightweight-charts
- [ ] Panel de configuración de indicadores (toggle + parámetros)
- [ ] Persistir configuración de indicadores por usuario en `localStorage` (no en BD, es preferencia de visualización)
- [AC] Cada indicador muestra la línea/histograma correctamente superpuesta sobre velas; parámetros editables en tiempo real

### F3-03 · Herramientas de dibujo
- [ ] Instalar/usar plugin de dibujo de lightweight-charts o implementar custom overlay con Canvas
- [ ] Tipos de dibujo: línea de tendencia, horizontal (soporte/resistencia), rectángulo, Fibonacci retrace
- [ ] SA `saveDrawings(userId, tickerId, analysisId | null, drawings: DrawingData[])` — upsert
- [ ] SA `loadDrawings(userId, tickerId, analysisId | null)` → `DrawingData[]`
- [ ] Los dibujos se asocian a (usuario, ticker, análisis); sin análisis seleccionado → contexto global del ticker
- [AC] Dibujos persisten al recargar la página; cambiar de análisis carga sus dibujos específicos

---

## F4 — Análisis: CRUD, seed, nombres automáticos y snapshots

> Objetivo: análisis como plantillas reutilizables con versionado inmutable al crear operaciones.

### F4-01 · Modelo y CRUD de análisis
- [ ] Verificar modelos `Analysis`, `AnalysisIndicator`, `AnalysisRule` en schema
- [ ] SA `createAnalysis(data)` — crea análisis del usuario con nombre autogenerado si no se proporciona
- [ ] SA `updateAnalysis(id, data)` — solo si no hay operaciones abiertas con ese análisis; si las hay, crea nueva versión
- [ ] SA `deleteAnalysis(id)` — soft delete; análisis con operaciones no puede borrarse
- [ ] SA `cloneAnalysis(id)` — crea copia personal de un análisis estándar/ajeno
- [ ] Página `/app/analyses` — lista de análisis del usuario + análisis estándar
- [ ] Página `/app/analyses/[id]` — edición de análisis con preview de indicadores
- [AC] CRUD completo funciona; análisis estándar son visibles pero no editables directamente (solo clonables)

### F4-02 · Seed de 5 análisis estándar
- [ ] Completar `prisma/seed.ts` con los 5 análisis (A1–A5) con todos los indicadores y reglas
- [ ] Marcarlos con `isStandard: true` y `createdBy: null` (o usuario system)
- [AC] `npm run db:seed` siembra los 5 análisis; son visibles para todos los usuarios

### F4-03 · Autogeneración de nombre de análisis
- [ ] Función `generateAnalysisName(indicators[], rules[])` en `src/lib/analyses/naming.ts`
- [ ] Patrón: `"[Sesgo] · [Indicadores clave] · [Trigger]"`
- [ ] Sesgo se deriva de si hay reglas largo/corto/ambas
- [ ] Indicadores clave: los 2-3 primeros configurados
- [ ] Trigger: primer evento de entrada definido en reglas
- [ ] El nombre se autogenera on-the-fly en el formulario; usuario puede sobrescribir
- [ ] Si usuario borra su nombre personalizado → vuelve a autogenerar
- [AC] Al añadir EMA(50) + RSI(14) con regla de rebote, el nombre generado incluye esos términos

### F4-04 · Snapshot inmutable de análisis
- [ ] Modelo `AnalysisSnapshot` ya en schema (JSON blob del análisis en ese momento)
- [ ] SA `createAnalysisSnapshot(analysisId)` — serializa el estado actual del análisis a JSON
- [ ] Snapshot se crea automáticamente al abrir una operación (ver F5)
- [AC] Modificar un análisis no afecta operaciones ya abiertas con su snapshot anterior

---

## F5 — Operaciones ficticias: apertura, spread, PnL y cierre

> Objetivo: flujo completo de operación con spread real/simulado y cálculo correcto de PnL.

### F5-01 · Apertura de operación
- [ ] SA `openOperation(tickerId, analysisId, direction: 'LONG' | 'SHORT')`:
  1. Leer quote actual de BD (o forzar refresh si > 15 min)
  2. Aplicar spread: si LONG → `entryPrice = ask`; si SHORT → `entryPrice = bid`
  3. Crear `AnalysisSnapshot` del análisis seleccionado
  4. Guardar `Operation` con: entryPrice, spreadApplied, snapshotId, nominal $100
  5. Calcular `quantity = 100 / entryPrice` (fraccionario)
- [ ] Leer TP/SL si el análisis los define (opcionales al abrir)
- [ ] Formulario de apertura: selector de ticker → selector de análisis → dirección → confirmar (con preview de precio, spread, cantidad)
- [AC] Operación guardada en BD con todos los campos; spread correcto aplicado; snapshot creado

### F5-02 · Cierre de operación
- [ ] SA `closeOperation(operationId, reason: 'MANUAL' | 'TP' | 'SL' | 'ALERT')`:
  1. Leer quote actual
  2. Si LONG → `exitPrice = bid`; si SHORT → `exitPrice = ask`
  3. Calcular PnL: `LONG: (exitPrice - entryPrice) * qty - spreadCost`; `SHORT: (entryPrice - exitPrice) * qty - spreadCost`
  4. Guardar `closedAt`, `exitPrice`, `pnl`, `pnlPct`, `reason`
- [ ] Botón "Cerrar" en lista de operaciones abiertas
- [AC] PnL calculado correctamente para largo y corto; spread descontado en entrada y salida

### F5-03 · Evaluación automática de TP/SL
- [ ] Cron handler `src/app/api/cron/evaluate-tpsl/route.ts` (puede ser el mismo cron de precios)
- [ ] Por cada operación abierta con TP o SL definidos: comparar precio actual vs TP/SL
- [ ] Si se activa → llamar `closeOperation(id, 'TP' | 'SL')`
- [AC] Operación con TP se cierra automáticamente cuando el precio lo alcanza en el siguiente ciclo de 15 min

### F5-04 · Historial de operaciones
- [ ] RH `GET /api/operations` — lista con filtros (abierta/cerrada, ticker, análisis, fecha)
- [ ] Página `/app/operations` — tabla con operaciones abiertas y cerradas
- [ ] Card de operación: ticker, análisis, dirección, entrada, salida, PnL, estado
- [AC] Operaciones cerradas muestran PnL y PnL%; operaciones abiertas muestran PnL no realizado en tiempo "real" (con precio cacheado)

---

## F6 — Alertas y notificaciones Web Push

> Objetivo: alertas de precio evaluadas en Cron, notificación push + feed in-app.

### F6-01 · Modelo de alertas y evaluación
- [ ] Modelo `Alert` ya en schema: `condition` (JSON), `triggeredAt`, `dismissed`
- [ ] SA `createAlert(analysisId, condition)` — condición expresada como objeto evaluable
- [ ] Condición evaluable: `{ indicator: 'RSI', op: '<', value: 30 }` o `{ price: 'cross_above', level: 150 }`
- [ ] Evaluador en `src/lib/alerts/evaluator.ts`: recibe quote + candles + condición → boolean
- [ ] Cron llama evaluador por cada alerta activa; si activa → marcar `triggeredAt` + disparar push
- [AC] Alerta de precio se dispara cuando el precio alcanza el nivel definido

### F6-02 · Web Push (VAPID)
- [ ] Instalar `web-push`
- [ ] Generar par de claves VAPID (documentado en `.env.example`)
- [ ] RH `POST /api/push/subscribe` — guarda `PushSubscription` en BD
- [ ] RH `DELETE /api/push/subscribe` — elimina suscripción
- [ ] Función `sendPushNotification(userId, payload)` en `src/lib/push/sender.ts`
- [ ] Service Worker maneja evento `push` y muestra notificación nativa
- [AC] Usuario logado con SW registrado recibe notificación del sistema operativo cuando se dispara una alerta

### F6-03 · Feed in-app
- [ ] Modelo `Notification` en BD (o usar tabla `Alert` con campo `read`)
- [ ] RH `GET /api/notifications` — notificaciones del usuario, no leídas primero
- [ ] SA `markNotificationRead(id)`
- [ ] Componente `<NotificationBell>` en navbar con badge de no leídas
- [ ] Página o dropdown con lista de notificaciones
- [AC] Al dispararse una alerta, aparece en el feed in-app aunque el push esté desactivado

---

## F7 — Ranking y métricas

> Objetivo: tabla de ranking con métrica principal + secundarias, filtros por sector/análisis/periodo.

### F7-01 · Cálculo de métricas de usuario
- [ ] Función `calculateUserMetrics(userId, filters)` en `src/lib/scoring/metrics.ts`:
  - `avgReturnPerTrade`: media aritmética de `pnlPct` de operaciones cerradas
  - `winRate`: % operaciones con PnL > 0
  - `totalTrades`: número de operaciones cerradas
  - `totalPnl`: suma de PnL $
- [ ] Tests unitarios para esta función (casos: sin operaciones, una operación, mix ganadoras/perdedoras)
- [AC] Tests pasan; `avgReturnPerTrade` correcto con datos conocidos

### F7-02 · API y página de ranking
- [ ] RH `GET /api/ranking?sector=X&analysisId=Y&period=30d` — calcula y devuelve ranking ordenado
- [ ] Filtros: sector (enum de sectores), analysisId, period (7d/30d/90d/all)
- [ ] Página `/app/ranking` con tabla: posición, avatar, username, avg return, win rate, nº ops
- [ ] Resaltado de la fila del usuario actual
- [ ] Filtros visibles en UI con URL params para compartir
- [AC] Ranking cambia correctamente al aplicar filtros; usuario con 0 operaciones cerradas no aparece o aparece al fondo

---

## F8 — PWA: manifest, service worker e instalación

> Objetivo: app instalable en Android y iOS, experiencia offline básica.

### F8-01 · Web App Manifest
- [ ] Crear `public/manifest.json` con: `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, iconos 192×192 y 512×512
- [ ] Añadir `<link rel="manifest">` en layout root
- [ ] Diseñar y exportar iconos PNG (logo trade_sim)
- [AC] Chrome DevTools > Application > Manifest muestra todo verde; Lighthouse PWA ≥ 90

### F8-02 · Service Worker
- [ ] Instalar `next-pwa` o configurar SW manual en `public/sw.js`
- [ ] Estrategia de caché: `network-first` para API routes, `cache-first` para assets estáticos
- [ ] SW maneja evento `push` para notificaciones
- [ ] SW muestra página offline si no hay red
- [AC] App instalada funciona offline mostrando datos cacheados; push notifications funcionan con app cerrada

### F8-03 · Prompt de instalación y UX móvil
- [ ] Componente `<InstallPrompt>` que detecta `beforeinstallprompt` (Android) y muestra banner
- [ ] Instrucciones manuales para iOS (Safari > Compartir > Añadir a pantalla de inicio)
- [ ] Viewport y touch targets correctos para móvil (min 44px)
- [ ] Probar en Android (Chrome) e iOS (Safari) en dispositivos físicos o emulador
- [AC] App instalable en Android con un tap; UX móvil sin scroll horizontal

---

## F9 — Calidad, seguridad y despliegue

> Estas tareas se intercalan con las fases anteriores pero se consolidan aquí.

### F9-01 · Tests críticos
- [ ] Test: cálculo de PnL con spread para LONG y SHORT (`src/lib/operations/pnl.test.ts`)
- [ ] Test: evaluación de reglas de alerta (`src/lib/alerts/evaluator.test.ts`)
- [ ] Test: cálculo de ranking / métricas (`src/lib/scoring/metrics.test.ts`)
- [ ] Test: autogeneración de nombre de análisis (`src/lib/analyses/naming.test.ts`)
- [ ] Configurar Vitest (o Jest) + `@testing-library/react` para componentes si hace falta

### F9-02 · Seguridad
- [ ] Verificar que todas las SA comprueban sesión y rol antes de actuar
- [ ] CRON_SECRET en todas las rutas de cron (cabecera `Authorization: Bearer`)
- [ ] Cabeceras de seguridad en `next.config.ts` (CSP, X-Frame-Options, etc.)
- [ ] Rate limiting en endpoints de auth (middleware o Vercel Edge Config)
- [ ] Inputs sanitizados con zod en todas las SA y RH

### F9-03 · Despliegue en Vercel + Neon
- [ ] Crear proyecto en Vercel, conectar repo GitHub
- [ ] Configurar variables de entorno en Vercel Dashboard
- [ ] Ejecutar migración de producción: `npx prisma migrate deploy`
- [ ] Ejecutar seed en producción: `npx prisma db seed`
- [ ] Configurar `vercel.json` con crons
- [ ] Verificar logs de cron en Vercel Dashboard
- [AC] App accesible en dominio Vercel; crons ejecutan correctamente; sin errores en logs de producción

---

## Orden de ejecución recomendado

```
F1 (completa) → F2-01..04 → F3-01 → F2-05..06 → F3-02..03 →
F4 (completa) → F5 (completa) → F6 (completa) → F7 (completa) →
F8 (completa) → F9 (intercalada con todo lo anterior)
```

Los tests de F9-01 se escriben en paralelo con la lógica que prueban.
La seguridad de F9-02 se revisa al terminar cada fase.

---

## Notas para futuros chats

- Pasar `architecture.md` + este `backlog.md` al inicio de cada sesión
- Indicar qué tarea `FN-XX` se empieza a trabajar
- Al terminar una tarea, marcarla `[x]` y hacer commit del backlog actualizado
- Si una tarea se divide o cambia de alcance, actualizar aquí y anotar la razón
