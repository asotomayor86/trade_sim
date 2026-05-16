# trade_sim — Architecture & Design Reference

> Versión: 1.2 · Fecha: 2026-05-16
> Propósito: documento de referencia para futuros chats con Claude. Pasar junto con `backlog.md` al inicio de cada sesión.
> Repositorio: https://github.com/asotomayor86/trade_sim

---

## 1. Visión del producto

PWA de trading social/educativo para un grupo cerrado (~50 usuarios). Los usuarios practican análisis técnico y gestión de operaciones ficticias sobre acciones NYSE reales (precios retrasados ~15 min). No hay dinero real. El objetivo es aprender, comparar estrategias y competir en un ranking interno.

**Restricciones clave:**
- Solo acceso por invitación de admin (sin registro público)
- LOPD ES: solo username + password, sin datos personales adicionales
- Recuperación de contraseña: reset manual por admin (o cambio propio con contraseña actual)
- Despliegue gratuito en Vercel + Neon (free tiers)

---

## 2. Stack tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR + API routes + Server Actions en un solo deploy |
| Lenguaje | TypeScript estricto | Seguridad de tipos en cliente y servidor |
| UI | Tailwind CSS | Desarrollo rápido, sin dependencias de componentes |
| Gráficos | TradingView `lightweight-charts` v5 | Librería profesional, ligera, sin dependencias |
| Indicadores | `technicalindicators` (npm) | Cálculo en cliente, sin costes de servidor |
| ORM | Prisma 5 | Type-safe, migraciones versionadas |
| BD | Neon Postgres (serverless) | Free tier generoso, branching para dev |
| Auth | Auth.js v5 (NextAuth) + bcrypt | Credentials provider, JWT sessions |
| Datos de mercado | Alpaca Markets API (free) + yahoo-finance2 | Bid/ask delayed 15 min gratis |
| Tareas programadas | GitHub Actions (`*/15 * * * *`) | Vercel Hobby no permite crons < diarios |
| Notificaciones | Web Push (VAPID) + `web-push` | Push nativo sin Firebase |
| PWA | Service Worker manual | Instalable en Android/iOS |
| Testing | Vitest + vite-tsconfig-paths | Rápido, compatible con ESM |

---

## 3. Estructura de carpetas

```
trade-sim/
├── prisma/
│   ├── schema.prisma          # Modelos de BD (fuente de verdad)
│   ├── migrations/            # Migraciones versionadas (git)
│   └── seed.ts                # Admin default + 5 análisis estándar
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── offline.html           # Fallback sin red
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icons/
│
├── scripts/
│   └── generate-icons.js      # Generador de PNG sin deps externas
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── app/               # Carpeta regular para URLs /app/*
│   │   │   ├── layout.tsx     # Sidebar + header (NotificationBell, PushSetup)
│   │   │   ├── dashboard/
│   │   │   ├── chart/[symbol]/
│   │   │   ├── analyses/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── operations/
│   │   │   ├── alerts/
│   │   │   ├── ranking/
│   │   │   └── users/                  ← F10 NUEVO
│   │   │       ├── page.tsx            # Listado de usuarios
│   │   │       └── [id]/
│   │   │           └── page.tsx        # Ficha de usuario (tabs)
│   │   ├── admin/
│   │   │   ├── users/                  # Panel admin existente (simplificado)
│   │   │   ├── invitations/
│   │   │   ├── tickers/
│   │   │   └── audit-log/              ← F10 NUEVO
│   │   │       └── page.tsx            # Log de auditoría (solo admin)
│   │   ├── login/
│   │   ├── register/
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── market/
│   │       │   ├── candles/
│   │       │   └── quote/
│   │       ├── notifications/
│   │       ├── push/subscribe/
│   │       ├── users/                  ← F10 NUEVO
│   │       │   ├── route.ts            # GET /api/users
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET /api/users/:id
│   │       │       ├── operations/
│   │       │       │   └── route.ts    # GET /api/users/:id/operations
│   │       │       └── stats/
│   │       │           └── route.ts    # GET /api/users/:id/stats
│   │       ├── admin/                  ← F10 NUEVO
│   │       │   ├── users/[id]/
│   │       │   │   ├── reset-password/route.ts
│   │       │   │   ├── deactivate/route.ts
│   │       │   │   ├── reactivate/route.ts
│   │       │   │   └── role/route.ts
│   │       │   └── audit-log/route.ts
│   │       └── cron/
│   │           └── refresh-prices/
│   │
│   ├── components/
│   │   ├── chart/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   └── NotificationBell.tsx
│   │   ├── pwa/
│   │   │   └── InstallPrompt.tsx
│   │   ├── push/
│   │   │   └── PushSetup.tsx
│   │   ├── analyses/
│   │   ├── operations/
│   │   ├── alerts/
│   │   ├── ranking/
│   │   └── users/                      ← F10 NUEVO
│   │       ├── UsersList.tsx           # Tabla de listado con ordenaciones
│   │       ├── UserCard.tsx            # Cabecera de ficha (username, stats, estado)
│   │       ├── UserTabs.tsx            # Shell de pestañas (Resumen/Histórico/Análisis/Ajustes)
│   │       ├── tabs/
│   │       │   ├── ResumenTab.tsx      # Stats + ops abiertas + indicadores promedio
│   │       │   ├── HistoricoTab.tsx    # Ops cerradas lazy + paginación cursor
│   │       │   ├── AnalisisTab.tsx     # Top análisis, retorno por análisis
│   │       │   └── AjustesTab.tsx      # Cambio contraseña / push / admin actions
│   │       └── admin/
│   │           ├── ResetPasswordForm.tsx   # (mover de admin/ existente)
│   │           └── RoleSelector.tsx
│   │
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   ├── passwords.ts
│   │   │   └── rateLimit.ts
│   │   ├── db/prisma.ts
│   │   ├── market-data/
│   │   ├── indicators/
│   │   ├── analyses/
│   │   ├── operations/
│   │   ├── alerts/
│   │   ├── scoring/
│   │   │   └── metrics.ts
│   │   └── push/
│   │
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── invitations.ts
│   │   ├── users.ts           # Ampliado: changeMyPassword, adminResetPassword,
│   │   │                      #   setUserActive, changeUserRole
│   │   ├── tickers.ts
│   │   ├── analyses.ts
│   │   ├── drawings.ts
│   │   ├── operations.ts
│   │   └── alerts.ts
│   │
│   └── auth.ts
│
├── vitest.config.ts
├── next.config.ts
├── .env.example
└── .env.local
```

---

## 4. Esquema Prisma completo

> Versión 1.2 — incluye cambios F10: `deactivatedAt`, `lastPasswordResetAt` en User y nueva tabla `UserAuditLog`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
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

// ── F10 NUEVO ──────────────────────────────────────────────────────────────
enum UserAuditAction {
  RESET_PASSWORD
  DEACTIVATE
  REACTIVATE
  ROLE_CHANGE
}
// ──────────────────────────────────────────────────────────────────────────

model User {
  id                  String    @id @default(cuid())
  username            String    @unique
  passwordHash        String
  role                Role      @default(USER)
  active              Boolean   @default(true)
  createdAt           DateTime  @default(now())
  // ── F10 NUEVOS ───────────────────────────────────
  deactivatedAt       DateTime?
  lastPasswordResetAt DateTime?
  // ─────────────────────────────────────────────────

  analyses      Analysis[]
  operations    Operation[]
  alerts        Alert[]
  drawings      Drawing[]
  pushSubs      PushSubscription[]
  notifications Notification[]
  // ── F10 NUEVAS RELACIONES ─────────────────────────
  auditActed    UserAuditLog[] @relation("AuditActor")
  auditReceived UserAuditLog[] @relation("AuditTarget")
  // ─────────────────────────────────────────────────

  @@map("users")
}

// ── F10 NUEVO ──────────────────────────────────────────────────────────────
model UserAuditLog {
  id        String          @id @default(cuid())
  actorId   String
  targetId  String
  action    UserAuditAction
  metadata  Json?           // { newRole, tempPassword (hashed), etc. }
  createdAt DateTime        @default(now())

  actor  User @relation("AuditActor",  fields: [actorId],  references: [id])
  target User @relation("AuditTarget", fields: [targetId], references: [id])

  @@index([targetId, createdAt(sort: Desc)])
  @@index([actorId,  createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("user_audit_log")
}
// ──────────────────────────────────────────────────────────────────────────

model InvitationCode {
  id        String    @id @default(cuid())
  code      String    @unique @default(uuid())
  note      String?
  usedAt    DateTime?
  usedBy    String?
  createdAt DateTime  @default(now())
  expiresAt DateTime?

  @@map("invitation_codes")
}

model Ticker {
  id                String  @id @default(cuid())
  symbol            String  @unique
  name              String
  sector            String
  active            Boolean @default(true)
  spreadOverridePct Float?

  quotes     Quote[]
  candles    Candle[]
  operations Operation[]
  drawings   Drawing[]
  alerts     Alert[]

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
  source    String

  ticker Ticker @relation(fields: [tickerId], references: [id])

  @@unique([tickerId, timestamp])
  @@index([tickerId, timestamp(sort: Desc)])
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

  ticker Ticker @relation(fields: [tickerId], references: [id])

  @@unique([tickerId, timeframe, timestamp])
  @@index([tickerId, timeframe, timestamp(sort: Desc)])
  @@map("candles")
}

model Analysis {
  id         String   @id @default(cuid())
  userId     String?
  name       String
  nameCustom Boolean  @default(false)
  bias       String
  isStandard Boolean  @default(false)
  deleted    Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User?               @relation(fields: [userId], references: [id])
  indicators AnalysisIndicator[]
  rules      AnalysisRule[]
  snapshots  AnalysisSnapshot[]
  operations Operation[]
  drawings   Drawing[]
  alerts     Alert[]

  @@map("analyses")
}

model AnalysisIndicator {
  id         String  @id @default(cuid())
  analysisId String
  type       String
  params     Json
  color      String?
  pane       Int     @default(0)

  analysis Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("analysis_indicators")
}

model AnalysisRule {
  id          String     @id @default(cuid())
  analysisId  String
  type        String
  direction   Direction?
  condition   Json
  description String?

  analysis Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("analysis_rules")
}

model AnalysisSnapshot {
  id         String   @id @default(cuid())
  analysisId String
  data       Json
  createdAt  DateTime @default(now())

  analysis   Analysis    @relation(fields: [analysisId], references: [id])
  operations Operation[]

  @@map("analysis_snapshots")
}

model Drawing {
  id         String   @id @default(cuid())
  userId     String
  tickerId   String
  analysisId String?
  data       Json
  updatedAt  DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id])
  ticker   Ticker    @relation(fields: [tickerId], references: [id])
  analysis Analysis? @relation(fields: [analysisId], references: [id])

  @@unique([userId, tickerId, analysisId])
  @@map("drawings")
}

model Operation {
  id            String       @id @default(cuid())
  userId        String
  tickerId      String
  analysisId    String
  snapshotId    String
  direction     Direction
  entryPrice    Float
  exitPrice     Float?
  quantity      Float
  nominal       Float        @default(100)
  spreadApplied Float
  spreadSource  String
  tpPrice       Float?
  slPrice       Float?
  pnl           Float?
  pnlPct        Float?
  closeReason   CloseReason?
  openedAt      DateTime     @default(now())
  closedAt      DateTime?

  user     User             @relation(fields: [userId], references: [id])
  ticker   Ticker           @relation(fields: [tickerId], references: [id])
  analysis Analysis         @relation(fields: [analysisId], references: [id])
  snapshot AnalysisSnapshot @relation(fields: [snapshotId], references: [id])

  @@index([userId, closedAt])
  @@index([userId, openedAt(sort: Desc)])
  @@map("operations")
}

model Alert {
  id          String    @id @default(cuid())
  userId      String
  analysisId  String?
  tickerId    String?
  condition   Json
  message     String?
  active      Boolean   @default(true)
  triggeredAt DateTime?
  createdAt   DateTime  @default(now())

  user     User      @relation(fields: [userId], references: [id])
  analysis Analysis? @relation(fields: [analysisId], references: [id])
  ticker   Ticker?   @relation(fields: [tickerId], references: [id])

  @@map("alerts")
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  keys      Json
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("push_subscriptions")
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("notifications")
}
```

---

## 5. Route Handlers y Server Actions

### Route Handlers — completos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | Público | Auth.js handler |
| GET | `/api/market/candles` | AUTH | Velas con caché en BD |
| GET | `/api/market/quote` | AUTH | Quote bajo demanda |
| GET | `/api/notifications` | AUTH | Últimas 30 notificaciones |
| POST | `/api/push/subscribe` | AUTH | Registrar suscripción push |
| DELETE | `/api/push/subscribe` | AUTH | Eliminar suscripción push |
| GET | `/api/cron/refresh-prices` | CRON_SECRET | Refresco precios + TP/SL + alertas |
| GET | `/api/users` | AUTH | Lista usuarios activos (inactivos visibles solo para ADMIN) |
| GET | `/api/users/[id]` | AUTH | Perfil público: datos + stats agregadas |
| GET | `/api/users/[id]/operations` | AUTH | Ops del usuario; `?status=open\|closed&cursor=X&limit=20` |
| GET | `/api/users/[id]/stats` | AUTH | Agregados: por sector, por análisis, top tickers |
| POST | `/api/admin/users/[id]/reset-password` | ADMIN | Reset; devuelve contraseña temporal (plaintext, una vez) |
| POST | `/api/admin/users/[id]/deactivate` | ADMIN | Desactiva usuario + registra audit log |
| POST | `/api/admin/users/[id]/reactivate` | ADMIN | Reactiva usuario + registra audit log |
| POST | `/api/admin/users/[id]/role` | ADMIN | Cambia rol (con check ≥1 admin en transacción) |
| GET | `/api/admin/audit-log` | ADMIN | Log paginado; `?targetId=X&limit=50&cursor=Y` |

### Server Actions — completas

| Función | Archivo | Rol |
|---|---|---|
| `createInvitationCode(note?)` | `actions/invitations.ts` | ADMIN |
| `registerWithCode(username, password, code)` | `actions/invitations.ts` | Público |
| `changeMyPassword(currentPassword, newPassword)` | `actions/users.ts` | AUTH (self) |
| `resetUserPassword(userId)` — genera temporal | `actions/users.ts` | ADMIN |
| `setUserActive(userId, active)` | `actions/users.ts` | ADMIN |
| `changeUserRole(userId, newRole)` | `actions/users.ts` | ADMIN |
| `addTicker / removeTicker / setSpreadOverride` | `actions/tickers.ts` | ADMIN |
| `createAnalysis / updateAnalysis / deleteAnalysis / cloneAnalysis` | `actions/analyses.ts` | AUTH |
| `saveDrawings / loadDrawings` | `actions/drawings.ts` | AUTH |
| `openOperation / closeOperation / previewOperation` | `actions/operations.ts` | AUTH |
| `createAlert / dismissAlert / markAllNotificationsRead` | `actions/alerts.ts` | AUTH |

> **Nota SA vs RH en F10:** las mutaciones de admin (reset password, deactivate, role change) se implementan como **Route Handlers POST** (no Server Actions) porque necesitan devolver datos en la respuesta (p.ej. la contraseña temporal generada) y hacer redirect condicional. Las lecturas paginadas siempre son Route Handlers.

---

## 6. Variables de entorno (.env.example)

```bash
# Base de datos
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."   # para prisma migrate

# Auth.js
AUTH_SECRET="..."                          # openssl rand -base64 32
AUTH_TRUST_HOST=1                          # requerido en Vercel

# Alpaca Markets
ALPACA_API_KEY="..."
ALPACA_API_SECRET="..."
ALPACA_BASE_URL="https://data.alpaca.markets"

# Vercel Cron
CRON_SECRET="..."

# Web Push (VAPID)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@example.com"

# Seed
SEED_ADMIN_USERNAME="admin"
SEED_ADMIN_PASSWORD="..."
```

---

## 7. Decisiones de diseño clave

### 7.0 Decisiones de implementación (F1)

**Prisma v5**: Prisma 7 requiere Driver Adapters para `new PrismaClient()`. Incompatible con el patrón singleton estándar. Usamos Prisma 5.

**`proxy.ts`**: Next.js 16 renombra `middleware.ts` → `proxy.ts`. API idéntica.

**Carpeta `app/` regular**: Los route groups `(name)` no añaden el nombre a la URL. Para `/app/*` se usa carpeta regular `src/app/app/`.

### 7.1 Next.js App Router
SSR + API routes + Server Actions en un único deploy. Server Actions eliminan boilerplate para mutaciones simples.

### 7.2 Server Actions vs Route Handlers
- **SA**: mutaciones sin respuesta de datos compleja; invocadas desde cliente con `useTransition`.
- **RH**: lecturas con query params; mutaciones que necesitan devolver datos en la respuesta (ej. contraseña temporal generada).

### 7.3 MarketDataProvider como interfaz
Implementaciones intercambiables: Alpaca (producción), Yahoo (fallback velas), Mock (tests). Factory en `src/lib/market-data/index.ts`.

### 7.4 Spread: real vs simulado
```
Si Alpaca devuelve bid Y ask → spread real
Si no → mid = lastPrice; spreadPct por sector; bid/ask = mid ± (mid * spreadPct / 2)
```

### 7.5 Snapshot pattern para análisis
`Analysis` es mutable. `Operation` guarda un `AnalysisSnapshot` (JSON blob) en el momento de apertura. Modificar un análisis no afecta operaciones ya abiertas.

### 7.6 Nombre autogenerado de análisis
`"[Sesgo] · [Indicadores clave] · [Trigger]"`. Si `nameCustom = true`, no se regenera.

### 7.7 Autenticación y sesiones
Auth.js v5, JWT sessions, sin adaptador de BD. JWT incluye `{ id, username, role }`. Rate limit: 5 intentos/10 min por username (in-memory, suficiente para 50 usuarios).

### 7.8 Scheduler externo (GitHub Actions)
Vercel Hobby solo permite crons diarios. GitHub Actions llama al endpoint `refresh-prices` cada 15 min con `CRON_SECRET`.

### 7.9 PWA y notificaciones
SW manual en `public/sw.js`. Push VAPID. Feed in-app como fallback.

### 7.10 Alpaca: endpoint multi-símbolo en cron
UNA sola request HTTP para todo el universo: `GET /v2/stocks/quotes/latest?symbols=A,B,...&feed=iex`.

### 7.11 Stats de usuario: on-the-fly (F10)
**Decisión: calcular on-the-fly con índices DB, sin precomputar.**

Razonamiento: 50 usuarios × cientos de operaciones → volumen máximo ~5.000 filas en `operations`. Una query agregada con `GROUP BY` sobre ese volumen tarda < 10 ms. No justifica la complejidad de una tabla de stats precomputadas ni un job de refresh.

Índices necesarios (ya existen o se añaden):
```
@@index([userId, closedAt])       -- filtra ops cerradas por usuario
@@index([userId, openedAt(sort:Desc)])  -- ops abiertas recientes
```
Si en el futuro el nº de usuarios o operaciones crece significativamente, se puede añadir una tabla `user_stats_cache` con refresh periódico. Por ahora no es necesario.

### 7.12 Paginación cursor-based para histórico cerrado (F10)
Las operaciones cerradas en la ficha de usuario se cargan de forma lazy con paginación cursor-based:
- Cursor = `{ closedAt: DateTime, id: string }` (orden estable)
- `GET /api/users/:id/operations?status=closed&cursor=X&limit=20`
- El cliente pide la siguiente página solo si el usuario expande el histórico y hace scroll

Esto evita cargar cientos de operaciones de golce y es compatible con el modelo serverless de Vercel (sin streaming de BD).

### 7.13 Regla "≥1 admin activo" en transacción (F10)
Al cambiar rol o desactivar un usuario, la validación y la mutación se ejecutan en una **transacción Prisma** para evitar race conditions entre dos admins actuando simultáneamente:

```ts
await prisma.$transaction(async (tx) => {
  const activeAdmins = await tx.user.count({
    where: { role: "ADMIN", active: true, id: { not: targetId } }
  })
  if (activeAdmins < 1) throw new Error("Debe quedar al menos un admin activo")
  await tx.user.update({ where: { id: targetId }, data: { role: newRole } })
  await tx.userAuditLog.create({ ... })
})
```

### 7.14 Contraseña temporal en reset admin (F10)
El admin genera una contraseña temporal que se muestra **una sola vez** en la respuesta del endpoint. Flujo:
1. Endpoint genera password aleatorio (16 chars, alphanumérico)
2. Hashea con bcrypt y actualiza `passwordHash` + `lastPasswordResetAt`
3. Devuelve el plaintext en la respuesta JSON (solo en esa llamada)
4. Registra en `UserAuditLog` con `metadata: { hint: "temp password set" }` (NO guarda el plaintext)
5. El admin comparte la contraseña por canal externo; el usuario la cambia en su próximo login

### 7.15 Username inmutable (F10)
El `username` no es editable. Razón: se usa como clave de visualización en ranking, histórico de operaciones y logs de auditoría. Cambiar el username rompería la trazabilidad. Los usuarios que quieran cambiar de alias deben contactar al admin, que puede crear una nueva cuenta (con nueva invitación) y desactivar la antigua.

---

## 8. Flujo de datos: precios en tiempo real

```
GitHub Actions (*/15 min)
  → GET /api/cron/refresh-prices  [Bearer CRON_SECRET]
    → Leer símbolos activos de BD
    → AlpacaProvider.getQuotes(symbols[])   ← UNA sola request HTTP
    → Upsert en tabla quotes
    → Evaluar TP/SL de operaciones abiertas
    → Evaluar alertas de precio activas
    → Crear notificaciones + push si hay disparos
```

---

## 9. Flujo de apertura de operación

```
Usuario: ticker → análisis → dirección → (TP/SL opcionales) → confirmar
openOperation():
  1. Zod validate input
  2. requireAuth()
  3. getLatestQuote(tickerId)
  4. calcEntry(direction, quote, nominal=100)
  5. createAnalysisSnapshot(analysisId)
  6. prisma.operation.create(...)
  7. revalidatePath
```

---

## 10. Cálculo de PnL

```
LONG: entryPrice = ask; exitPrice = bid
  pnl    = (exitPrice - entryPrice) * quantity
  pnlPct = pnl / nominal * 100

SHORT: entryPrice = bid; exitPrice = ask
  pnl    = (entryPrice - exitPrice) * quantity
  pnlPct = pnl / nominal * 100
```

---

## 11. Ranking — fórmula de métrica principal

```
avgReturnPerTrade = Σ(pnlPct_i) / N   (N = operaciones cerradas)
winRate = (ops con pnl > 0) / N * 100
```

En el listado de usuarios (F10), usuarios con N < 5 aparecen al final sin métrica ("—").

---

## 12. Los 5 análisis estándar (seed)

| ID | Nombre | Sesgo | Indicadores |
|---|---|---|---|
| A1 | Alcista · EMA50/EMA200 + RSI14 · Rebote en soporte | BULLISH | EMA(50), EMA(200), RSI(14), Vol |
| A2 | Bajista · MACD + Bollinger20,2 + Volumen · Ruptura de canal | BEARISH | MACD(12,26,9), Bollinger(20,2), Vol |
| A3 | Alcista · EMA20/EMA50 + ADX14 · Continuación de tendencia | BULLISH | EMA(20), EMA(50), ADX(14) |
| A4 | Neutro · Bollinger20,2 + RSI14 · Reversión a la media | NEUTRAL | Bollinger(20,2), RSI(14) |
| A5 | Alcista · Ruptura · Donchian20 + Volumen | BULLISH | Donchian(20), Vol, ATR(14) |

---

## 13. Fases del proyecto

| Fase | Contenido | Estado |
|---|---|---|
| F1 | Scaffold + Auth + BD + Invitaciones + Roles | ✅ Completa |
| F2 | MarketDataProvider + Tickers + Cron + Caché | ✅ Completa (bulk preload pendiente) |
| F3 | Gráfico + Indicadores + Dibujos persistentes | ✅ Completa (solo líneas horizontales) |
| F4 | Análisis CRUD + Seed + Nombres + Snapshots | ✅ Completa |
| F5 | Operaciones + Spread + PnL + Cierre | ✅ Completa |
| F6 | Alertas + Web Push + Feed in-app | ✅ Completa |
| F7 | Ranking + Métricas + Filtros | ✅ Completa |
| F8 | PWA: Manifest + SW + Instalación | ✅ Completa |
| F9 | Tests críticos + Seguridad + Despliegue | ✅ Completa |
| F10 | Gestión y perfil de usuarios | 🔲 Pendiente |

---

## 14. F10 — Gestión y perfil de usuarios: diseño detallado

### 14.1 Pantallas nuevas

| Ruta | Descripción |
|---|---|
| `/app/users` | Listado de todos los usuarios activos (+ inactivos al final para admin) con métricas de ranking |
| `/app/users/[id]` | Ficha de usuario con 4 pestañas |
| `/admin/audit-log` | Log de auditoría paginado (solo admin) |

### 14.2 Ficha de usuario — pestañas

**Pestaña Resumen** (visible siempre):
- Username, fecha de alta, rol, estado activo/inactivo
- Stats: avgReturn, winRate, nº ops totales, mejor y peor operación
- Operaciones abiertas actuales (tabla completa, sin ocultar)
- Indicadores promedio de ops cerradas: retorno medio por sector, top 3 análisis más usados, top tickers operados, distribución por sector

**Pestaña Histórico** (visible siempre, colapsado por defecto):
- Toggle "Ver histórico" → carga lazy la primera página
- Paginación cursor-based (20 ops/página, orden `closedAt DESC`)
- Filtros: sector, analysisId
- Mientras colapsado, no se hace ninguna fetch

**Pestaña Análisis** (visible siempre):
- Top análisis usados (nº de operaciones y avgReturn por análisis)
- Distribución sesgo LONG/SHORT por análisis

**Pestaña Ajustes** (visible solo en modo "yo mismo" y "admin sobre otro"):
- Modo yo mismo: cambio contraseña (requiere actual), gestión dispositivos push, cerrar sesión
- Modo admin: reset contraseña (muestra temporal una vez), activar/desactivar, cambiar rol

### 14.3 Ordenaciones del listado `/app/users`

| Clave | Descripción |
|---|---|
| `ranking` (default) | avgReturn DESC, usuarios sin 5 ops al final (alfabético) |
| `alpha` | username ASC |
| `ops` | totalTrades DESC |
| `recent` | última operación abierta o cerrada DESC |

### 14.4 Reglas de visibilidad

| Entidad | Quién puede ver |
|---|---|
| Usuarios inactivos en listado | Solo admins (grisados/tachados al final) |
| Operaciones abiertas de cualquier usuario | Todos los usuarios activos |
| Operaciones cerradas de cualquier usuario | Todos los usuarios activos (bajo expand) |
| Pestaña Ajustes | Solo el propio usuario o admin |
| Log de auditoría | Solo admins |

### 14.5 Matriz de permisos completa

| Acción | Yo | Otro user | Admin/otro | Admin/sí mismo |
|---|---|---|---|---|
| Ver stats y operaciones | ✓ | ✓ | ✓ | ✓ |
| Cambiar contraseña propia | ✓ | — | — | ✓ |
| Reset contraseña ajena | — | ✗ | ✓ | — |
| Desactivar / reactivar | ✗ | ✗ | ✓ | ✗ |
| Cambiar rol | ✗ | ✗ | ✓ (*) | ✗ |
| Gestionar push devices | ✓ | ✗ | ✗ | ✓ |

(*) Sujeto a regla transaccional: ≥1 admin activo debe quedar tras el cambio.

---

## 15. Reglas de privacidad de operaciones

**Diseño público deliberado**: en este sistema educativo con usuarios conocidos entre sí (grupo cerrado), la transparencia de operaciones es un pilar del aprendizaje colectivo.

| Tipo | Visibilidad |
|---|---|
| Operaciones abiertas | Públicas — visibles para cualquier usuario autenticado |
| Operaciones cerradas | Públicas — accesibles bajo expand del histórico |
| Análisis usados en ops | Públicos (se ven en la pestaña Análisis de la ficha) |

No existe modo "privado" ni configuración por usuario. El username es el único dato de identidad almacenado (LOPD ES).

---

## 16. Auditoría de acciones administrativas

Toda acción de admin sobre un usuario queda registrada en `user_audit_log`:

| Action | Cuándo | metadata |
|---|---|---|
| `RESET_PASSWORD` | Admin genera contraseña temporal | `{ hint: "temp password set" }` |
| `DEACTIVATE` | Admin desactiva usuario | `{}` |
| `REACTIVATE` | Admin reactiva usuario | `{}` |
| `ROLE_CHANGE` | Admin cambia rol | `{ from: "USER", to: "ADMIN" }` |

El log es visible solo en `/admin/audit-log` (requiere `requireAdmin()`). Se pagina con cursor sobre `createdAt DESC`.

---

## 17. Notas para futuros chats

1. **Pasar este archivo + backlog.md** al inicio de cada sesión.
2. El schema Prisma de §4 es la fuente de verdad.
3. Las decisiones de §7 son finales salvo que se indique lo contrario.
4. Para F10: los Route Handlers POST de admin devuelven JSON (no usan `redirect()`), para poder recibir la contraseña temporal en el cliente antes de navegar.
5. La regla ≥1 admin (§7.13) se valida siempre en transacción, no antes.
