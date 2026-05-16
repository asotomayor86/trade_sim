import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Sector normalisation: CSV uses "Communication", GICS standard is "Communication Services"
function normaliseSector(s: string): string {
  if (s === "Communication") return "Communication Services"
  return s
}

// S&P 100 equities (source: iShares OEF holdings, May 2026)
// BRKB mapped to BRK.B (Alpaca ticker format)
const SP100: { symbol: string; name: string; sector: string }[] = [
  { symbol: "NVDA",  name: "NVIDIA Corp",                        sector: "Information Technology" },
  { symbol: "AAPL",  name: "Apple Inc",                          sector: "Information Technology" },
  { symbol: "MSFT",  name: "Microsoft Corp",                     sector: "Information Technology" },
  { symbol: "AMZN",  name: "Amazon.com Inc",                     sector: "Consumer Discretionary" },
  { symbol: "GOOGL", name: "Alphabet Inc Class A",               sector: "Communication Services" },
  { symbol: "AVGO",  name: "Broadcom Inc",                       sector: "Information Technology" },
  { symbol: "GOOG",  name: "Alphabet Inc Class C",               sector: "Communication Services" },
  { symbol: "META",  name: "Meta Platforms Inc",                 sector: "Communication Services" },
  { symbol: "TSLA",  name: "Tesla Inc",                          sector: "Consumer Discretionary" },
  { symbol: "BRK.B", name: "Berkshire Hathaway Class B",         sector: "Financials" },
  { symbol: "MU",    name: "Micron Technology Inc",              sector: "Information Technology" },
  { symbol: "JPM",   name: "JPMorgan Chase & Co",                sector: "Financials" },
  { symbol: "LLY",   name: "Eli Lilly",                          sector: "Health Care" },
  { symbol: "AMD",   name: "Advanced Micro Devices Inc",         sector: "Information Technology" },
  { symbol: "XOM",   name: "Exxon Mobil Corp",                   sector: "Energy" },
  { symbol: "WMT",   name: "Walmart Inc",                        sector: "Consumer Staples" },
  { symbol: "JNJ",   name: "Johnson & Johnson",                  sector: "Health Care" },
  { symbol: "INTC",  name: "Intel Corp",                         sector: "Information Technology" },
  { symbol: "V",     name: "Visa Inc Class A",                   sector: "Financials" },
  { symbol: "COST",  name: "Costco Wholesale Corp",              sector: "Consumer Staples" },
  { symbol: "CSCO",  name: "Cisco Systems Inc",                  sector: "Information Technology" },
  { symbol: "CAT",   name: "Caterpillar Inc",                    sector: "Industrials" },
  { symbol: "MA",    name: "Mastercard Inc Class A",             sector: "Financials" },
  { symbol: "LRCX",  name: "Lam Research Corp",                  sector: "Information Technology" },
  { symbol: "ABBV",  name: "AbbVie Inc",                         sector: "Health Care" },
  { symbol: "NFLX",  name: "Netflix Inc",                        sector: "Communication Services" },
  { symbol: "UNH",   name: "UnitedHealth Group Inc",             sector: "Health Care" },
  { symbol: "CVX",   name: "Chevron Corp",                       sector: "Energy" },
  { symbol: "AMAT",  name: "Applied Materials Inc",              sector: "Information Technology" },
  { symbol: "ORCL",  name: "Oracle Corp",                        sector: "Information Technology" },
  { symbol: "PG",    name: "Procter & Gamble",                   sector: "Consumer Staples" },
  { symbol: "BAC",   name: "Bank of America Corp",               sector: "Financials" },
  { symbol: "KO",    name: "Coca-Cola",                          sector: "Consumer Staples" },
  { symbol: "GE",    name: "GE Aerospace",                       sector: "Industrials" },
  { symbol: "PLTR",  name: "Palantir Technologies Inc",          sector: "Information Technology" },
  { symbol: "HD",    name: "Home Depot Inc",                     sector: "Consumer Discretionary" },
  { symbol: "PM",    name: "Philip Morris International Inc",    sector: "Consumer Staples" },
  { symbol: "GEV",   name: "GE Vernova Inc",                     sector: "Industrials" },
  { symbol: "GS",    name: "Goldman Sachs Group Inc",            sector: "Financials" },
  { symbol: "MRK",   name: "Merck & Co Inc",                     sector: "Health Care" },
  { symbol: "TXN",   name: "Texas Instruments Inc",              sector: "Information Technology" },
  { symbol: "LIN",   name: "Linde PLC",                          sector: "Materials" },
  { symbol: "RTX",   name: "RTX Corp",                           sector: "Industrials" },
  { symbol: "MS",    name: "Morgan Stanley",                     sector: "Financials" },
  { symbol: "WFC",   name: "Wells Fargo",                        sector: "Financials" },
  { symbol: "C",     name: "Citigroup Inc",                      sector: "Financials" },
  { symbol: "QCOM",  name: "Qualcomm Inc",                       sector: "Information Technology" },
  { symbol: "IBM",   name: "IBM Corp",                           sector: "Information Technology" },
  { symbol: "PEP",   name: "PepsiCo Inc",                        sector: "Consumer Staples" },
  { symbol: "NEE",   name: "NextEra Energy Inc",                 sector: "Utilities" },
  { symbol: "VZ",    name: "Verizon Communications Inc",         sector: "Communication Services" },
  { symbol: "MCD",   name: "McDonald's Corp",                    sector: "Consumer Discretionary" },
  { symbol: "DIS",   name: "Walt Disney",                        sector: "Communication Services" },
  { symbol: "AMGN",  name: "Amgen Inc",                          sector: "Health Care" },
  { symbol: "BA",    name: "Boeing",                             sector: "Industrials" },
  { symbol: "T",     name: "AT&T Inc",                           sector: "Communication Services" },
  { symbol: "TMO",   name: "Thermo Fisher Scientific Inc",       sector: "Health Care" },
  { symbol: "AXP",   name: "American Express",                   sector: "Financials" },
  { symbol: "GILD",  name: "Gilead Sciences Inc",                sector: "Health Care" },
  { symbol: "UNP",   name: "Union Pacific Corp",                 sector: "Industrials" },
  { symbol: "BLK",   name: "BlackRock Inc",                      sector: "Financials" },
  { symbol: "CRM",   name: "Salesforce Inc",                     sector: "Information Technology" },
  { symbol: "UBER",  name: "Uber Technologies Inc",              sector: "Industrials" },
  { symbol: "ISRG",  name: "Intuitive Surgical Inc",             sector: "Health Care" },
  { symbol: "SCHW",  name: "Charles Schwab Corp",                sector: "Financials" },
  { symbol: "ABT",   name: "Abbott Laboratories",                sector: "Health Care" },
  { symbol: "PFE",   name: "Pfizer Inc",                         sector: "Health Care" },
  { symbol: "COP",   name: "ConocoPhillips",                     sector: "Energy" },
  { symbol: "DE",    name: "Deere & Company",                    sector: "Industrials" },
  { symbol: "HON",   name: "Honeywell International Inc",        sector: "Industrials" },
  { symbol: "LOW",   name: "Lowe's Companies Inc",               sector: "Consumer Discretionary" },
  { symbol: "BKNG",  name: "Booking Holdings Inc",               sector: "Consumer Discretionary" },
  { symbol: "CVS",   name: "CVS Health Corp",                    sector: "Health Care" },
  { symbol: "MO",    name: "Altria Group Inc",                   sector: "Consumer Staples" },
  { symbol: "SBUX",  name: "Starbucks Corp",                     sector: "Consumer Discretionary" },
  { symbol: "COF",   name: "Capital One Financial Corp",         sector: "Financials" },
  { symbol: "BMY",   name: "Bristol-Myers Squibb",               sector: "Health Care" },
  { symbol: "LMT",   name: "Lockheed Martin Corp",               sector: "Industrials" },
  { symbol: "INTU",  name: "Intuit Inc",                         sector: "Information Technology" },
  { symbol: "DHR",   name: "Danaher Corp",                       sector: "Health Care" },
  { symbol: "SO",    name: "Southern Company",                   sector: "Utilities" },
  { symbol: "ACN",   name: "Accenture PLC",                      sector: "Information Technology" },
  { symbol: "MDT",   name: "Medtronic PLC",                      sector: "Health Care" },
  { symbol: "ADBE",  name: "Adobe Inc",                          sector: "Information Technology" },
  { symbol: "DUK",   name: "Duke Energy Corp",                   sector: "Utilities" },
  { symbol: "NOW",   name: "ServiceNow Inc",                     sector: "Information Technology" },
  { symbol: "BK",    name: "Bank of New York Mellon Corp",       sector: "Financials" },
  { symbol: "CMCSA", name: "Comcast Corp",                       sector: "Communication Services" },
  { symbol: "TMUS",  name: "T-Mobile US Inc",                    sector: "Communication Services" },
  { symbol: "GD",    name: "General Dynamics Corp",              sector: "Industrials" },
  { symbol: "USB",   name: "US Bancorp",                         sector: "Financials" },
  { symbol: "FDX",   name: "FedEx Corp",                         sector: "Industrials" },
  { symbol: "AMT",   name: "American Tower Corp",                sector: "Real Estate" },
  { symbol: "MDLZ",  name: "Mondelez International Inc",         sector: "Consumer Staples" },
  { symbol: "EMR",   name: "Emerson Electric",                   sector: "Industrials" },
  { symbol: "MMM",   name: "3M",                                 sector: "Industrials" },
  { symbol: "UPS",   name: "United Parcel Service Inc",          sector: "Industrials" },
  { symbol: "CL",    name: "Colgate-Palmolive",                  sector: "Consumer Staples" },
  { symbol: "GM",    name: "General Motors",                     sector: "Consumer Discretionary" },
  { symbol: "SPG",   name: "Simon Property Group",               sector: "Real Estate" },
  { symbol: "NKE",   name: "Nike Inc",                           sector: "Consumer Discretionary" },
]

// 11 SPDR Sector ETFs
const ETFS: { symbol: string; name: string; sector: string }[] = [
  { symbol: "XLK",  name: "Technology Select Sector SPDR",              sector: "ETF" },
  { symbol: "XLF",  name: "Financial Select Sector SPDR",               sector: "ETF" },
  { symbol: "XLE",  name: "Energy Select Sector SPDR",                  sector: "ETF" },
  { symbol: "XLV",  name: "Health Care Select Sector SPDR",             sector: "ETF" },
  { symbol: "XLY",  name: "Consumer Discretionary Select Sector SPDR",  sector: "ETF" },
  { symbol: "XLP",  name: "Consumer Staples Select Sector SPDR",        sector: "ETF" },
  { symbol: "XLI",  name: "Industrial Select Sector SPDR",              sector: "ETF" },
  { symbol: "XLB",  name: "Materials Select Sector SPDR",               sector: "ETF" },
  { symbol: "XLU",  name: "Utilities Select Sector SPDR",               sector: "ETF" },
  { symbol: "XLRE", name: "Real Estate Select Sector SPDR",             sector: "ETF" },
  { symbol: "XLC",  name: "Communication Services Select Sector SPDR",  sector: "ETF" },
]

async function main() {
  const all = [...SP100, ...ETFS]

  let created = 0
  let updated = 0

  for (const t of all) {
    const result = await prisma.ticker.upsert({
      where: { symbol: t.symbol },
      create: { symbol: t.symbol, name: t.name, sector: t.sector, active: true },
      update: { name: t.name, sector: t.sector, active: true },
    })
    if (result.name === t.name) updated++
    else created++
  }

  console.log(`✓ Tickers sembrados: ${all.length} total (S&P 100: ${SP100.length}, ETFs: ${ETFS.length})`)

  // Count by sector
  const bySector = all.reduce<Record<string, number>>((acc, t) => {
    acc[t.sector] = (acc[t.sector] ?? 0) + 1
    return acc
  }, {})
  console.table(bySector)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
