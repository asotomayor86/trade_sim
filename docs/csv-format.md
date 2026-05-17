# trade_sim — Especificación del formato CSV de Playbook

> Versión 1.0 · 2026-05-17  
> Este documento describe el formato de intercambio CSV para análisis y estrategias del sistema trade_sim.

---

## 1. Convenciones generales

| Parámetro | Valor |
|-----------|-------|
| Encoding | UTF-8 **sin BOM** |
| Separador | Coma `,` |
| Comillas | Dobles `"` (solo cuando el campo contiene coma, comillas o salto de línea) |
| Escape de comillas | Duplicar: `""` dentro de un campo entrecomillado representa una comilla literal |
| Fin de línea | `\n` (LF) |
| Cabecera | Primera línea, nombres exactos de columnas |
| Filas de datos | Exactamente **una fila** de datos por archivo (cabecera + 1 fila) |
| Nombre de archivo | `analysis_{CODE}.csv` o `strategy_{CODE}.csv` |

Los archivos se pueden descargar individualmente o en un ZIP (`.zip`) que agrupa todos los de un tipo.

---

## 2. Esquema de `analysis_{CODE}.csv`

### Columnas

| Columna | Tipo | Obligatorio | Descripción |
|---------|------|-------------|-------------|
| `code` | string | Sí | Código único del análisis (3-6 letras mayúsculas, ej. `TND`, `TND2`) |
| `name` | string | Sí | Nombre legible único globalmente |
| `description` | string | No | Descripción libre. Puede estar vacía. |
| `bias` | string | Sí | `BULLISH`, `BEARISH` o `NEUTRAL` |
| `isStandard` | boolean | Sí | `true` o `false` |
| `indicators` | JSON | Sí | Array JSON de objetos indicador (ver §4) |

### Ejemplo completo

```csv
code,name,description,bias,isStandard,indicators
TND,"Tendencia clásica","Seguimiento de tendencia con medias móviles y MACD.",NEUTRAL,true,"[{""tipo"":""EMA"",""params"":{""periodo"":20},""color"":""#f59e0b"",""lineWidth"":1,""lineStyle"":0,""pane"":0,""localId"":""abc-001""},{""tipo"":""MACD"",""params"":{""periodo_rapida"":12,""periodo_lenta"":26,""periodo_señal"":9},""color"":""#a855f7"",""lineWidth"":1,""lineStyle"":0,""pane"":1,""localId"":""abc-002""}]"
```

---

## 3. Esquema de `strategy_{CODE}.csv`

### Columnas

| Columna | Tipo | Obligatorio | Descripción |
|---------|------|-------------|-------------|
| `code` | string | Sí | Código único de la estrategia, formato `{ANALYSIS_CODE}-{SUFFIX}`, ej. `TND-LONG` |
| `name` | string | Sí | Nombre legible único globalmente |
| `description` | string | No | Descripción libre |
| `analysisCode` | string | Sí | Código del análisis base (FK por código, no por id) |
| `suffix` | enum | Sí | `LONG`, `SHORT`, `BNC`, `UP` o `DN` |
| `entryRule` | enum | Sí | Ver §5 — Catálogo de reglas de entrada |
| `entryParams` | JSON | Sí | Parámetros de la regla de entrada (ver §5) |
| `exitTargetType` | enum | Sí | `PERCENT_GAIN`, `BOLLINGER_MIDDLE` o `VWAP_TOUCH` |
| `exitTargetValue` | number | Sí | Valor del objetivo (% para PERCENT_GAIN; 0 para los otros tipos) |
| `stopLossType` | enum | Sí | `PERCENT` o `BOLLINGER_MIDDLE` |
| `stopLossValue` | number | Sí | Valor del stop (% para PERCENT; 0 para BOLLINGER_MIDDLE) |
| `isStandard` | boolean | Sí | `true` o `false` |

### Ejemplo completo

```csv
code,name,description,analysisCode,suffix,entryRule,entryParams,exitTargetType,exitTargetValue,stopLossType,stopLossValue,isStandard
TND-LONG,"Tendencia clásica - Largo","Compra cuando EMA20 cruza al alza EMA50 con MACD positivo.",TND,LONG,EMA_CROSS_UP,"{""ema_fast"":20,""ema_slow"":50}",PERCENT_GAIN,3,PERCENT,1.5,true
```

---

## 4. Estructura JSON del campo `indicators` (análisis)

El campo `indicators` es un array JSON serializado. Cada elemento tiene la estructura:

```json
{
  "localId": "string-uuid",
  "tipo": "SMA|EMA|BB|VWAP|RSI|MACD|STOCH|VOL",
  "params": { ... },
  "color": "#hexcolor",
  "lineWidth": 1,
  "lineStyle": 0,
  "pane": 0
}
```

### Tipos de indicador y sus params

| tipo | params | pane |
|------|--------|------|
| `SMA` | `{ "periodo": 20 }` | 0 (overlay) |
| `EMA` | `{ "periodo": 20 }` | 0 |
| `BB` | `{ "periodo": 20, "desviaciones": 2.0 }` | 0 |
| `VWAP` | `{ "periodo_reset": "sesion\|diario\|semanal" }` | 0 |
| `RSI` | `{ "periodo": 14, "nivel_sobrecompra": 70, "nivel_sobreventa": 30 }` | 1+ |
| `MACD` | `{ "periodo_rapida": 12, "periodo_lenta": 26, "periodo_señal": 9 }` | 1+ |
| `STOCH` | `{ "periodo_k": 14, "periodo_d": 3, "suavizado": 3, "nivel_sobrecompra": 80, "nivel_sobreventa": 20 }` | 1+ |
| `VOL` | `{ "mostrar_media": false, "periodo_media": 20 }` | 1+ |

- `pane: 0` = overlay sobre el precio. `pane >= 1` = sub-panel separado.
- `lineStyle`: 0 = sólido, 1 = punteado, 2 = discontinuo.
- `lineWidth`: 1–4.

---

## 5. Catálogo de reglas de entrada (`entryRule`) y sus `entryParams`

| entryRule | Descripción | entryParams |
|-----------|-------------|-------------|
| `EMA_CROSS_UP` | EMA rápida cruza al alza EMA lenta | `{ "ema_fast": 20, "ema_slow": 50 }` |
| `EMA_CROSS_DOWN` | EMA rápida cruza a la baja EMA lenta | `{ "ema_fast": 20, "ema_slow": 50 }` |
| `RSI_OVERSOLD_BB_LOWER` | RSI < umbral y precio toca banda inferior Bollinger | `{ "rsi_threshold": 30, "bb_period": 20 }` |
| `BB_BREAKOUT_UP_VOLUME` | Ruptura banda superior con volumen > multiplier × media | `{ "bb_period": 20, "volume_multiplier": 1.5 }` |
| `BB_BREAKOUT_DOWN_VOLUME` | Ruptura banda inferior con volumen > multiplier × media | `{ "bb_period": 20, "volume_multiplier": 1.5 }` |
| `EMA_STOCH_CROSS` | Precio sobre EMA y Estocástico cruza al alza desde sobreventa | `{ "ema_period": 9, "stoch_oversold": 20 }` |
| `VWAP_DEVIATION_RSI` | Precio < VWAP en pct% y RSI < umbral | `{ "vwap_deviation_pct": 1, "rsi_threshold": 40 }` |

---

## 6. Reglas de importación

### 6.1 Detección de tipo por nombre de archivo

- `analysis_{CODE}.csv` → análisis
- `strategy_{CODE}.csv` → estrategia
- Cualquier otro nombre → error bloqueante

### 6.2 Skip silencioso por code repetido

Si el `code` del CSV ya existe en la base de datos → la fila se **ignora** silenciosamente (no actualiza, no error). La pantalla de preview marcará la fila como "skip" con razón "code ya existe en BD".

### 6.3 Validación de FK por analysisCode

El `analysisCode` de una estrategia debe:
- Existir en la base de datos, **o**
- Estar presente en el mismo lote de archivos subidos.

Si no se cumple ninguna condición → error bloqueante que impide la importación.

### 6.4 Límite de 15 análisis

El sistema tiene un máximo de **15 análisis** (borrados excluidos). Antes de aplicar:
```
análisis actuales en BD + análisis nuevos del lote ≤ 15
```
Si se supera → **rechazo total**: ningún análisis ni estrategia del lote se crea. El error indica cuántos huecos quedan disponibles.

### 6.5 Transacción todo-o-nada

La importación se ejecuta en una **transacción Prisma**. Si falla la creación de cualquier entidad, se hace rollback completo y nada se persiste.

### 6.6 Orden de creación en transacción

1. Se crean todos los análisis del lote.
2. Se crean todas las estrategias (una vez que los análisis ya existen para resolver las FKs).

---

## 7. Reglas de exportación

- Se exportan **todos** los análisis y estrategias no borrados (`deleted: false`), incluidos los marcados como `isStandard: true`.
- Sin filtros adicionales.
- Si solo hay 1 entidad del tipo solicitado, se descarga directamente el CSV sin ZIP.
- Si hay 2 o más, se empaquetan en un ZIP con un archivo CSV por entidad.

---

## 8. Ejemplos de archivos bien formados

### analysis_RSB.csv

```csv
code,name,description,bias,isStandard,indicators
RSB,"Rebote sobreventa","Reversal en zonas de sobreventa extrema con RSI y Bollinger.",NEUTRAL,true,"[{""tipo"":""BB"",""params"":{""periodo"":20,""desviaciones"":2},""color"":""#7c3aed"",""lineWidth"":1,""lineStyle"":0,""pane"":0,""localId"":""rsb-001""},{""tipo"":""RSI"",""params"":{""periodo"":14,""nivel_sobrecompra"":70,""nivel_sobreventa"":30},""color"":""#10b981"",""lineWidth"":1,""lineStyle"":0,""pane"":1,""localId"":""rsb-002""}]"
```

### strategy_RSB-BNC.csv

```csv
code,name,description,analysisCode,suffix,entryRule,entryParams,exitTargetType,exitTargetValue,stopLossType,stopLossValue,isStandard
RSB-BNC,"Rebote sobreventa - Bounce","Compra en zona de sobreventa cuando RSI < 30 y precio toca BB inferior.",RSB,BNC,RSI_OVERSOLD_BB_LOWER,"{""rsi_threshold"":30,""bb_period"":20}",BOLLINGER_MIDDLE,0,PERCENT,2,true
```

### analysis_CUSTOM.csv (análisis personalizado, sin descripción, sin indicadores)

```csv
code,name,description,bias,isStandard,indicators
CUS,"Mi estrategia custom",,BULLISH,false,[]
```

### strategy_CUS-LONG.csv (referencia a análisis del mismo lote)

```csv
code,name,description,analysisCode,suffix,entryRule,entryParams,exitTargetType,exitTargetValue,stopLossType,stopLossValue,isStandard
CUS-LONG,"Custom largo",,CUS,LONG,EMA_CROSS_UP,"{""ema_fast"":9,""ema_slow"":21}",PERCENT_GAIN,2,PERCENT,1,false
```

---

## 9. Errores comunes y cómo resolverlos

| Error | Causa | Solución |
|-------|-------|----------|
| `Columna faltante: "code"` | El CSV no tiene la columna requerida | Revisar que la cabecera tenga exactamente los nombres de §2 o §3 |
| `Campo 'indicators' contiene JSON inválido` | JSON malformado en el campo | Verificar que las comillas internas estén duplicadas (`""`) |
| `analysisCode "XYZ" no existe en BD ni en el lote` | FK rota | Subir también el archivo `analysis_XYZ.csv` en el mismo lote |
| `Límite de 15 análisis superado` | Hay 15 análisis y el lote añadiría más | Borrar análisis existentes o reducir el lote |
| `Nombre de archivo no reconocido` | El archivo no empieza por `analysis_` o `strategy_` | Renombrar el archivo según la convención |

---

*Generado automáticamente por trade_sim v1.5 — F13 Import/Export CSV*
