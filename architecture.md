# trade_sim — Architecture & Design Reference

> Versión: 1.1 · Fecha: 2026-05-16
> Propósito: documento de referencia para futuros chats con Claude. Pasar junto con `backlog.md` al inicio de cada sesión.
> Repositorio: https://github.com/asotomayor86/trade_sim

---

## 1. Visión del producto

PWA de trading social/educativo para un grupo cerrado (~50 usuarios). Los usuarios practican análisis técnico y gestión de operaciones ficticias sobre acciones NYSE reales (precios retrasados ~15 min). No hay dinero real. El objetivo es aprender, comparar estrategias y competir en un ranking interno.

**Restricciones clave:**
- Solo acceso por invitación de admin (sin registro público)
- LOPD ES: solo username + password, sin datos personales adicionales
- Recuperación de contraseña: reset manual por admin
- Despliegue gratuito en Vercel + Neon (free tiers)

---

## 2. Stack tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API routes + Server Actions en un solo deploy |
| Lenguaje | TypeScript estricto | Seguridad de tipos en cliente y servidor |
| UI | Tailwind CSS + shadcn/ui | Desarrollo rápido, accesible, personalizable |
| Gráficos | TradingView `lightweight-charts` | Librería profesional, ligera, sin dependencias |
| Indicadores | `technicalindicators` (npm) | Cálculo en cliente, sin costes de servidor |
| ORM | Prisma | Type-safe, migraciones versionadas |
| BD | Neon Postgres (serverless) | Free tier generoso, branching para dev |
| Auth | Auth.js v5 (NextAuth) + bcrypt | Credentials provider, JWT sessions |
| Datos de mercado | Alpaca Markets API (free) + yahoo-finance2 | Bid/ask delayed 15 min gratis |
| Tareas programadas | Vercel Cron Jobs | Refresco de precios + evaluación de alertas |
| Notificaciones | Web Push (VAPID) + `web-push` | Push nativo sin Firebase |
| PWA | `next-pwa` o SW manual | Instalable en Android/iOS |
| Testing | Vitest + Testing Library | Rápido, compatible con ESM |

---

## 3. Estructura de carpetas

```
trade-sim/
├── prisma/
│   ├── schema.prisma          # Modelos de BD
│   ├── migrations/            # Migraciones versionadas (git)
│   └── seed.ts                # Admin default + 5 análisis estándar
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (si manual)
│   └── icons/                 # 192×192, 512×512 PNG
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Grupo sin layout protegido
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (app)/             # Grupo con layout autenticado
│   │   │   ├── layout.tsx     # Sidebar + navbar
│   │   │   ├── dashboard/
│   │   │   ├── chart/[symbol]/
│   │   │   ├── analyses/
│   │   │   │   ├── page.tsx   # Lista análisis
│   │   │   │   └── [id]/
│   │   │   ├── operations/
│   │   │   └── ranking/
│   │   ├── admin/             # Solo rol ADMIN
│   │   │   ├── users/
│   │   │   ├── invitations/
│   │   │   └── tickers/
│   │   └── api/               # Route Handlers
│   │       ├── auth/[...nextauth]/
│   │       ├── market/
│   │       │   ├── candles/   # GET /api/market/candles
│   │       │   └── quote/     # GET /api/market/quote
│   │       ├── operations/    # GET /api/operations
│   │       ├── ranking/       # GET /api/ranking
│   │       ├── notifications/ # GET /api/notifications
│   │       ├── push/
│   │       │   └── subscribe/ # POST/DELETE
│   │       └── cron/
│   │           ├── refresh-prices/
│   │           └── evaluate-tpsl/
│   │
│   ├── components/
│   │   ├── chart/
│   │   │   ├── Chart.tsx      # Wrapper lightweight-charts
│   │   │   ├── IndicatorPanel.tsx
│   │   │   └── DrawingToolbar.tsx
│   │   ├── ui/                # shadcn/ui components (auto-generado)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   └── NotificationBell.tsx
│   │   ├── analyses/
│   │   ├── operations/
│   │   └── ranking/
│   │
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── session.ts     # getSession, requireAuth, requireAdmin
│   │   │   └── passwords.ts   # bcrypt helpers
│   │   ├── db/
│   │   │   └── prisma.ts      # Singleton PrismaClient
│   │   ├── market-data/
│   │   │   ├── types.ts       # Quote, Candle, Timeframe, SpreadInfo
│   │   │   ├── provider.ts    # Interfaz MarketDataProvider
│   │   │   ├── index.ts       # Factory: compuesto Alpaca + Yahoo
│   │   │   ├── spread.ts      # Lógica de spread real/simulado
│   │   │   └── providers/
│   │   │       ├── alpaca.ts
│   │   │       ├── yahoo.ts
│   │   │       └── mock.ts    # Para tests
│   │   ├── indicators/
│   │   │   ├── index.ts       # Re-exports + hook useIndicators
│   │   │   ├── sma.ts
│   │   │   ├── ema.ts
│   │   │   ├── rsi.ts
│   │   │   ├── macd.ts
│   │   │   ├── bollinger.ts
│   │   │   ├── atr.ts
│   │   │   ├── adx.ts
│   │   │   ├── donchian.ts
│   │   │   └── volume.ts
│   │   ├── analyses/
│   │   │   ├── naming.ts      # Autogeneración de nombre
│   │   │   └── snapshot.ts    # Serialización/deserialización
│   │   ├── operations/
│   │   │   └── pnl.ts         # Cálculo de PnL con spread
│   │   ├── alerts/
│   │   │   └── evaluator.ts   # Evaluador de condiciones de alerta
│   │   ├── scoring/
│   │   │   └── metrics.ts     # avgReturn, winRate, etc.
│   │   └── push/
│   │       └── sender.ts      # sendPushNotification(userId, payload)
│   │
│   ├── actions/               # Server Actions (separadas por dominio)
│   │   ├── auth.ts            # login, register, logout
│   │   ├── invitations.ts     # createInvitationCode, registerWithCode
│   │   ├── users.ts           # resetPassword, setUserActive
│   │   ├── tickers.ts         # addTicker, removeTicker, setSpreadOverride
│   │   ├── analyses.ts        # createAnalysis, updateAnalysis, deleteAnalysis, cloneAnalysis
│   │   ├── drawings.ts        # saveDrawings, loadDrawings
│   │   ├── operations.ts      # openOperation, closeOperation
│   │   └── alerts.ts          # createAlert, dismissAlert
│   │
│   ├── types/
│   │   └── index.ts           # Tipos compartidos cliente/servidor
│   │
│   └── auth.ts                # Auth.js config principal
│
├── vercel.json                # Cron schedules
├── .env.example               # Variables de entorno documentadas
├── .env.local                 # Valores locales (ignorado en git)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── backlog.md                 # Tareas de implementación
└── architecture.md            # Este archivo
```

---

## 4. Esquema Prisma completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum Direction {
  LONG
  SHORT
}

enum CloseReason {
  MANUAL
  TP
  SL
  ALERT
}

enum Timeframe {
  ONE_HOUR
  ONE_DAY
}

model User {
  id             String    @id @default(cuid())
  username       String    @unique
  passwordHash   String
  role           Role      @default(USER)
  active         Boolean   @default(true)
  createdAt      DateTime  @default(now())

  analyses       Analysis[]
  operations     Operation[]
  alerts         Alert[]
  drawings       Drawing[]
  pushSubs       PushSubscription[]
  notifications  Notification[]

  @@map("users")
}

model InvitationCode {
  id         String    @id @default(cuid())
  code       String    @unique @default(uuid())
  note       String?
  usedAt     DateTime?
  usedBy     String?   // username del registrado
  createdAt  DateTime  @default(now())
  expiresAt  DateTime?

  @@map("invitation_codes")
}

model Ticker {
  id               String   @id @default(cuid())
  symbol           String   @unique
  name             String
  sector           String
  active           Boolean  @default(true)
  spreadOverridePct Float?  // null = usar tabla por defecto de sector

  quotes     Quote[]
  candles    Candle[]
  operations Operation[]
  drawings   Drawing[]

  @@map("tickers")
}

model Quote {
  id        String   @id @default(cuid())
  tickerId  String
  bid       Float?
  ask       Float?
  last      Float
  volume    BigInt?
  timestamp DateTime
  source    String   // "alpaca" | "yahoo" | "mock"

  ticker    Ticker   @relation(fields: [tickerId], references: [id])

  @@unique([tickerId, timestamp])
  @@map("quotes")
}

model Candle {
  id        String    @id @default(cuid())
  tickerId  String
  timeframe Timeframe
  open      Float
  high      Float
  low       Float
  close     Float
  volume    BigInt
  timestamp DateTime
  source    String

  ticker    Ticker    @relation(fields: [tickerId], references: [id])

  @@unique([tickerId, timeframe, timestamp])
  @@map("candles")
}

model Analysis {
  id           String   @id @default(cuid())
  userId       String?  // null = análisis estándar del sistema
  name         String
  nameCustom   Boolean  @default(false) // true si el usuario editó el nombre
  bias         String   // "BULLISH" | "BEARISH" | "NEUTRAL"
  isStandard   Boolean  @default(false)
  deleted      Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User?    @relation(fields: [userId], references: [id])
  indicators   AnalysisIndicator[]
  rules        AnalysisRule[]
  snapshots    AnalysisSnapshot[]
  operations   Operation[]
  drawings     Drawing[]
  alerts       Alert[]

  @@map("analyses")
}

model AnalysisIndicator {
  id         String   @id @default(cuid())
  analysisId String
  type       String   // "EMA" | "SMA" | "RSI" | "MACD" | "BOLLINGER" | "ATR" | "ADX" | "DONCHIAN"
  params     Json     // { period: 50 } | { fast: 12, slow: 26, signal: 9 } | etc.
  color      String?
  pane       Int      @default(0) // 0 = precio, 1 = panel inferior

  analysis   Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("analysis_indicators")
}

model AnalysisRule {
  id         String   @id @default(cuid())
  analysisId String
  type       String   // "ENTRY" | "EXIT_TP" | "EXIT_SL"
  direction  Direction?
  condition  Json     // expresión evaluable: { indicator: "RSI", op: "<", value: 35 }
  description String?

  analysis   Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("analysis_rules")
}

model AnalysisSnapshot {
  id         String   @id @default(cuid())
  analysisId String
  data       Json     // snapshot completo del análisis en el momento de apertura
  createdAt  DateTime @default(now())

  analysis   Analysis  @relation(fields: [analysisId], references: [id])
  operations Operation[]

  @@map("analysis_snapshots")
}

model Drawing {
  id         String   @id @default(cuid())
  userId     String
  tickerId   String
  analysisId String?  // null = contexto global del ticker
  data       Json     // array de DrawingData serializado
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id])
  ticker     Ticker   @relation(fields: [tickerId], references: [id])
  analysis   Analysis? @relation(fields: [analysisId], references: [id])

  @@unique([userId, tickerId, analysisId])
  @@map("drawings")
}

model Operation {
  id               String      @id @default(cuid())
  userId           String
  tickerId         String
  analysisId       String
  snapshotId       String
  direction        Direction
  entryPrice       Float
  exitPrice        Float?
  quantity         Float       // fraccionario
  nominal          Float       @default(100)
  spreadApplied    Float       // spread en $ aplicado en entrada
  spreadSource     String      // "alpaca" | "simulated"
  tpPrice          Float?
  slPrice          Float?
  pnl              Float?
  pnlPct           Float?
  closeReason      CloseReason?
  openedAt         DateTime    @default(now())
  closedAt         DateTime?

  user             User              @relation(fields: [userId], references: [id])
  ticker           Ticker            @relation(fields: [tickerId], references: [id])
  analysis         Analysis          @relation(fields: [analysisId], references: [id])
  snapshot         AnalysisSnapshot  @relation(fields: [snapshotId], references: [id])

  @@map("operations")
}

model Alert {
  id          String    @id @default(cuid())
  userId      String
  analysisId  String?
  tickerId    String?
  condition   Json      // { indicator: "PRICE", op: ">=", value: 150 }
  message     String?
  active      Boolean   @default(true)
  triggeredAt DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])
  analysis    Analysis? @relation(fields: [analysisId], references: [id])

  @@map("alerts")
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  keys      Json     // { p256dh, auth }
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@map("push_subscriptions")
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "ALERT" | "TP" | "SL" | "SYSTEM"
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@map("notifications")
}
```

---

## 5. Route Handlers y Server Actions — Fase 1

### Route Handlers (F1)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/[...nextauth]` | Auth.js handler (login/logout) |
| GET | `/api/auth/session` | Sesión actual (Auth.js interno) |

### Server Actions (F1)

| Función | Archivo | Rol requerido |
|---|---|---|
| `createInvitationCode(note?)` | `actions/invitations.ts` | ADMIN |
| `registerWithCode(username, password, code)` | `actions/invitations.ts` | Público |
| `resetUserPassword(userId, newPassword)` | `actions/users.ts` | ADMIN |
| `setUserActive(userId, active)` | `actions/users.ts` | ADMIN |
| `login(username, password)` | `actions/auth.ts` | Público |
| `logout()` | `actions/auth.ts` | AUTH |

---

## 6. Variables de entorno (.env.example)

```bash
# Base de datos
DATABASE_URL="postgresql://..."           # Neon connection string

# Auth.js
AUTH_SECRET="..."                         # openssl rand -base64 32
AUTH_URL="http://localhost:3000"          # URL base de la app

# Alpaca Markets
ALPACA_API_KEY="..."
ALPACA_API_SECRET="..."
ALPACA_BASE_URL="https://data.alpaca.markets"

# Vercel Cron (protección de endpoints de cron)
CRON_SECRET="..."                         # string aleatorio seguro

# Web Push (VAPID)
VAPID_PUBLIC_KEY="..."                    # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@example.com"

# Admin por defecto (solo para seed inicial)
SEED_ADMIN_USERNAME="admin"
SEED_ADMIN_PASSWORD="..."                 # Cambiar tras primer login
```

---

## 7. Decisiones de diseño clave

### 7.0 Decisiones surgidas en implementación (F1)

**Prisma v5 en lugar de v7**: Prisma 7 eliminó el constructor `new PrismaClient()` sin argumentos y requiere Driver Adapters para conexión directa a BD. Incompatible con el patrón singleton estándar. Usamos Prisma 5 (estable, compatible con Auth.js v5, `@prisma/client` como import).

**`proxy.ts` en lugar de `middleware.ts`**: Next.js 16 renombra la convención `middleware.ts` → `proxy.ts`. La API es idéntica. El archivo vive en `src/proxy.ts`. Auth.js v5 funciona con `export default auth(...)` como default export.

**Carpeta `app/` regular en lugar de grupo `(app)/`**: Los route groups `(name)` no añaden el nombre a la URL. Para obtener `/app/dashboard`, `/app/analyses`, etc., se usa una carpeta regular `src/app/app/`.

---

### 7.1 Next.js App Router en lugar de Vite + Fastify
Permite tener frontend + API routes + Server Actions en un único deploy en Vercel. Las Server Actions eliminan boilerplate de endpoints para mutaciones simples. El código TypeScript es compartido entre cliente y servidor.

### 7.2 Server Actions vs Route Handlers
- **Server Actions**: mutaciones (crear, editar, borrar). Se usan con `<form action={...}>` o `await action(data)` desde cliente.
- **Route Handlers**: lecturas con query params, webhooks externos, endpoints de cron, push subscriptions.

### 7.3 MarketDataProvider como interfaz
Las implementaciones (Alpaca, Yahoo, Mock) son intercambiables. El factory en `src/lib/market-data/index.ts` devuelve la implementación correcta según entorno (`NODE_ENV === 'test'` → Mock; producción → Alpaca+Yahoo). Esto permite tests deterministas sin llamadas reales a APIs.

### 7.10 Alpaca: endpoint multi-símbolo obligatorio en el cron
El cron de refresco de precios (cada 15 min) **debe hacer UNA sola request HTTP** a Alpaca pasando toda la lista de símbolos activos:
```
GET /v2/stocks/quotes/latest?symbols=AAPL,MSFT,XLK,...&feed=iex
```
Prohibido hacer N llamadas individuales en el refresco periódico (límite de rate de Alpaca free y tiempo de ejecución del cron).

Lo mismo aplica a la precarga de velas históricas:
```
GET /v2/stocks/bars?symbols=AAPL,MSFT,...&timeframe=1Day&start=...&end=...
```

Las llamadas **bajo demanda** (usuario abre un gráfico) sí pueden ser por ticker individual.

### 7.4 Spread: real vs simulado
```
Si Alpaca devuelve bid Y ask:
  → spread real; bid = bid, ask = ask

Si Alpaca no devuelve bid/ask (ticker fuera de IEX):
  → mid = lastPrice
  → spreadPct = Ticker.spreadOverridePct ?? DEFAULT_SPREAD_BY_SECTOR[sector]
  → bid = mid * (1 - spreadPct / 2)
  → ask = mid * (1 + spreadPct / 2)
```
El spread se descuenta en entrada y en salida de cada operación.

### 7.5 Análisis vs Operación (snapshot pattern)
Un `Analysis` es mutable (el usuario puede editarlo). Una `Operation` guarda un `AnalysisSnapshot` (JSON blob) en el momento de apertura. Así, modificar un análisis nunca afecta operaciones ya abiertas. El snapshot incluye todos los indicadores y reglas en vigor en ese momento.

### 7.6 Nombre autogenerado de análisis
Patrón: `"[Sesgo] · [Indicadores clave] · [Trigger]"`
- Sesgo: derivado de las reglas de entrada (LONG → Alcista, SHORT → Bajista, ambas → Neutro)
- Indicadores clave: primeros 2-3 tipos únicos en `AnalysisIndicator[]`
- Trigger: descripción del primer `AnalysisRule` de tipo ENTRY

Si `nameCustom = true`, el nombre no se regenera aunque cambien los indicadores.

### 7.7 Autenticación y sesiones
Auth.js v5 con JWT sessions (sin adaptador de BD para sesiones, para simplificar). El JWT incluye `{ id, username, role }`. Se verifica en middleware y en Server Actions/Route Handlers con `requireAuth()`.

### 7.8 Crons de Vercel
Dos crons configurados en `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/refresh-prices", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/evaluate-tpsl",  "schedule": "*/15 * * * *" }
  ]
}
```
Ambos protegidos con cabecera `Authorization: Bearer ${CRON_SECRET}`.

**Nota operativa — Vercel Hobby:** el intervalo de 15 min funciona en Hobby pero va justo. El cron debe completarse (200 tickers, 1 request Alpaca + upsert BD) bien dentro de los 15 min para no solaparse con el siguiente disparo. Si el tiempo de ejecución supera ~10 s de forma consistente, migrar a Vercel Pro o usar GitHub Actions como scheduler externo de respaldo (llamando al mismo endpoint protegido con `CRON_SECRET`). Documentar esto en README.

### 7.9 PWA y notificaciones
- Android (Chrome): push nativo funciona perfectamente con VAPID.
- iOS (Safari 16.4+): push web disponible pero requiere que la PWA esté instalada.
- El service worker gestiona el evento `push` y muestra notificaciones del OS.
- Feed in-app como fallback para usuarios que no tienen push activo.

---

## 8. Flujo de datos: precios en tiempo real

```
Vercel Cron (*/15 min)
  → /api/cron/refresh-prices
    → Leer lista de símbolos activos de BD
    → AlpacaProvider.getQuotes(symbols[])          ← UNA sola request HTTP
        GET /v2/stocks/quotes/latest?symbols=A,B,...&feed=iex
      → Devuelve Map<symbol, Quote>
    → Por cada entrada del Map:
        → Si bid/ask presentes → source="alpaca"
        → Si no → calcular bid/ask con spread.ts (simulado)
    → Batch upsert en tabla quotes (createMany o transacción)

  → /api/cron/evaluate-tpsl  (puede correr justo después, en el mismo cron o separado)
      → Por cada Operation abierta con TP o SL:
          → Leer Quote reciente de BD (ya actualizado)
          → Comparar ask/bid vs TP/SL
          → Si activado → closeOperation() + createNotification() + sendPushNotification()
```

**Universo de tickers (seed inicial ~200):**
- S&P 100 completo (listado confirmado por el usuario antes del seed)
- 11 ETFs sectoriales SPDR: XLK, XLF, XLE, XLV, XLY, XLP, XLI, XLB, XLU, XLRE, XLC
- Complemento sectorial hasta ~200 cubriendo los 11 sectores GICS equitativamente
- Admin puede añadir/quitar tickers desde panel en cualquier momento

---

## 9. Flujo de apertura de operación

```
Usuario:
  1. Selecciona ticker en selector
  2. Selecciona análisis de su lista
  3. Elige dirección (LONG / SHORT)
  4. Ve preview: precio entrada (bid/ask), spread, cantidad, TP/SL opcionales
  5. Confirma

Server Action openOperation():
  1. Leer Quote más reciente de BD para el ticker
  2. Calcular entryPrice: LONG → ask, SHORT → bid
  3. Calcular spreadApplied = ask - bid (o 2 * (mid - bid) si simulado)
  4. createAnalysisSnapshot(analysisId) → guarda JSON blob
  5. Insertar Operation con: entryPrice, spreadApplied, snapshotId, quantity = 100 / entryPrice
  6. Retornar operación creada
```

---

## 10. Cálculo de PnL

```
LONG:
  entrySpread = ask_entry - mid_entry   (coste al comprar)
  exitSpread  = mid_exit - bid_exit     (coste al vender)
  grossPnl    = (exitMid - entryMid) * quantity
  netPnl      = grossPnl - (entrySpread + exitSpread) * quantity
  pnlPct      = netPnl / nominal * 100

SHORT:
  entrySpread = mid_entry - bid_entry   (coste al vender)
  exitSpread  = ask_exit - mid_exit     (coste al recomprar)
  grossPnl    = (entryMid - exitMid) * quantity
  netPnl      = grossPnl - (entrySpread + exitSpread) * quantity
  pnlPct      = netPnl / nominal * 100
```

Simplificado en la implementación usando los precios directos (bid/ask) ya guardados.

---

## 11. Ranking — fórmula de métrica principal

```
avgReturnPerTrade = Σ(pnlPct_i) / N   donde N = total operaciones cerradas del usuario
```

Se muestra junto a:
- `winRate = (operaciones con pnl > 0) / N * 100`
- `totalTrades = N`

El ranking no aplica ningún factor de penalización por pocas operaciones (transparente al usuario). El filtro visual deja claro que alguien con 2 operaciones tiene menos significancia estadística.

---

## 12. Los 5 análisis estándar (seed)

| ID | Nombre | Sesgo | Indicadores | Trigger |
|---|---|---|---|---|
| A1 | Alcista · EMA50/EMA200 + RSI14 · Rebote en soporte | BULLISH | EMA(50), EMA(200), RSI(14), Vol | RSI < 35 AND precio > EMA(200) AND toca soporte |
| A2 | Bajista · MACD + Bollinger20,2 + Volumen · Ruptura de canal | BEARISH | MACD(12,26,9), Bollinger(20,2), Vol | Cruce bajista MACD AND cierre bajo línea AND Vol > SMA(20) |
| A3 | Alcista · EMA20/EMA50 + ADX14 · Continuación de tendencia | BULLISH | EMA(20), EMA(50), ADX(14) | Retroceso a EMA(20) AND EMA(20) > EMA(50) AND ADX > 20 |
| A4 | Neutro · Bollinger20,2 + RSI14 · Reversión a la media | NEUTRAL | Bollinger(20,2), RSI(14) | Toque banda inferior AND RSI < 30 (largo) / banda superior AND RSI > 70 (corto) |
| A5 | Alcista · Ruptura · Donchian20 + Volumen | BULLISH | Donchian(20), Vol, ATR(14) | Cierre > máximo Donchian(20) AND Vol > 1.5× SMA(20) |

Detalles completos de TP/SL en el prompt original del proyecto.

---

## 13. Fases del proyecto (resumen)

| Fase | Contenido | Estado |
|---|---|---|
| F1 | Scaffold + Auth + BD + Invitaciones + Roles | Pendiente |
| F2 | MarketDataProvider + Tickers + Cron + Caché | Pendiente |
| F3 | Gráfico + Indicadores + Dibujos persistentes | Pendiente |
| F4 | Análisis CRUD + Seed + Nombres + Snapshots | Pendiente |
| F5 | Operaciones + Spread + PnL + Cierre | Pendiente |
| F6 | Alertas + Web Push + Feed in-app | Pendiente |
| F7 | Ranking + Métricas + Filtros | Pendiente |
| F8 | PWA: Manifest + SW + Instalación | Pendiente |
| F9 | Tests críticos + Seguridad + Despliegue | Intercalado |

Ver `backlog.md` para tareas detalladas con IDs `FN-XX`.

---

## 14. Notas para futuros chats

1. **Pasar este archivo + backlog.md al inicio de cada sesión** para dar contexto completo.
2. **Indicar la tarea FN-XX** con la que se empieza.
3. Las decisiones de diseño de §7 son finales salvo que se indique lo contrario.
4. El schema Prisma de §4 es la fuente de verdad; si se modifica el schema, actualizar aquí.
5. Si se cambia el stack en alguna fase, documentar el motivo en §7 con nueva subsección.
6. Las variables de entorno de §6 deben mantenerse sincronizadas con `.env.example`.
