# Frontend Integration Guide - GROWW Backend

Complete documentation for building a frontend against the GROWW Finance Dashboard Backend.

---

## 📋 Table of Contents
1. [Backend Overview](#backend-overview)
2. [API Endpoints](#api-endpoints)
3. [Response Formats](#response-formats)
4. [Error Handling](#error-handling)
5. [Frontend Setup](#frontend-setup)
6. [Code Examples](#code-examples)
7. [Best Practices](#best-practices)

---

## Backend Overview

**Server Details:**
- **Type:** Node.js + Express.js
- **Port:** `4001`
- **Base URL:** `http://localhost:4001`
- **API Documentation:** `http://localhost:4001/api-docs` (Swagger UI)

**Key Features:**
- ✅ CORS enabled (all origins allowed)
- ✅ Rate limiting: 60 requests per minute (per IP)
- ✅ In-memory caching: 300 seconds TTL
- ✅ Fallback providers: Alpha Vantage → Finnhub
- ✅ Exponential backoff retry logic
- ✅ Request logging (Morgan)
- ✅ Security headers (Helmet)

**External APIs:**
- **Primary:** Alpha Vantage (Rate limit: 5 req/min free tier)
- **Fallback:** Finnhub (higher limits)

---

## API Endpoints

### 1. Get Stock Quote (Alpha Vantage with Finnhub Fallback)

**Endpoint:** `GET /api/proxy/alpha/quote`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | ✅ Yes | Stock ticker symbol (e.g., "AAPL", "GOOGL", "MSFT") |

**Example Request:**
```
GET http://localhost:4001/api/proxy/alpha/quote?symbol=AAPL
```

**Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success (returned from cache or API) |
| 304 | Not Modified (returned from cache) |
| 429 | Rate Limited (retried automatically, falls back to Finnhub) |
| 400 | Missing required parameters |
| 500 | Server error |

**Success Response (200/304):**
```json
{
  "symbol": "AAPL",
  "price": 189.95,
  "change": 2.45,
  "changePercent": 1.31,
  "timestamp": 1703451600000
}
```

**Field Descriptions:**
- `symbol` (string): Stock ticker symbol
- `price` (number): Current/latest price in USD
- `change` (number): Absolute price change
- `changePercent` (number): Percentage price change (already multiplied by 100, e.g., 1.31 = 1.31%)
- `timestamp` (number): Unix timestamp in milliseconds

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid symbol or API error"
  }
}
```

---

### 2. Get Historical Prices

**Endpoint:** `GET /api/proxy/alpha/history`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | ✅ Yes | - | Stock ticker symbol |
| `days` | number | ❌ No | 30 | Number of days of historical data (1-365) |

**Example Request:**
```
GET http://localhost:4001/api/proxy/alpha/history?symbol=AAPL&days=7
```

**Success Response (200):**
```json
[
  {
    "timestamp": 1703347200000,
    "price": 185.50
  },
  {
    "timestamp": 1703433600000,
    "price": 187.20
  },
  {
    "timestamp": 1703520000000,
    "price": 189.95
  }
]
```

**Field Descriptions:**
- `timestamp` (number): Unix timestamp in milliseconds (60-min interval data)
- `price` (number): Price at that timestamp

**Notes:**
- Returns 60-minute interval data
- Data is filtered by the requested number of days
- Cached for 300 seconds

---

### 3. Direct Finnhub Quote

**Endpoint:** `GET /api/proxy/finnhub/quote`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | ✅ Yes | Stock ticker symbol |

**Example Request:**
```
GET http://localhost:4001/api/proxy/finnhub/quote?symbol=AAPL
```

**Response Format:** (Same as Alpha endpoint)
```json
{
  "symbol": "AAPL",
  "price": 189.95,
  "change": 2.45,
  "changePercent": 1.31,
  "timestamp": 1703451600000
}
```

---

## Response Formats

### Successful Quote Response
```json
{
  "symbol": "string",
  "price": "number",
  "change": "number",
  "changePercent": "number",
  "timestamp": "number"
}
```

### Successful History Response
```json
[
  {
    "timestamp": "number",
    "price": "number"
  }
]
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "string describing the error"
  }
}
```

### Supported Error Types
| Status | Message | Action |
|--------|---------|--------|
| 400 | "Missing symbol parameter" | Add `?symbol=ABC` |
| 429 | "Rate limited by external API" | Wait 60+ seconds or retry |
| 500 | "Internal server error" | Check server logs |

---

## Error Handling

### Client-Side Retry Strategy

The backend supports automatic retries for:
- **Rate limit errors (429):** Waits according to `Retry-After` header or exponential backoff
- **Network errors:** Exponential backoff with jitter

**Recommended Frontend Retry Logic:**
```javascript
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const requestWithRetry = async (url, maxRetries = 3) => {
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          attempt++;
          if (attempt > maxRetries) throw new Error("Rate limited");
          
          const retryAfter = response.headers.get("Retry-After");
          const waitMs = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.min(1000 * Math.pow(2, attempt), 10000);
          
          console.warn(`Rate limited. Retrying in ${waitMs}ms`);
          await wait(waitMs);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) throw error;
      
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.warn(`Error: ${error.message}. Retrying in ${waitMs}ms`);
      await wait(waitMs);
    }
  }
};
```

### Rate Limiting Mitigation

**Backend Caching:**
- All successful responses cached for **300 seconds**
- Same symbol requested twice within 300s returns cached data
- This dramatically reduces API calls to external providers

**Frontend Strategy:**
1. Display loading state while fetching
2. Show cached/stale data if available
3. Implement exponential backoff for retries
4. Cache responses client-side (localStorage or state management)

---

## Frontend Setup

### Environment Variables

Create a `.env.local` file in your frontend root:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4001
```

**For Production:**
```env
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### Installation & Configuration

**For Next.js/React:**

1. **Create API client (`services/api.ts`):**
```typescript
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

export default apiClient;
```

2. **Create service layer (`services/stockService.ts`):**
```typescript
import apiClient from './api';

export const fetchStockQuote = async (symbol: string) => {
  const response = await apiClient.get('/api/proxy/alpha/quote', {
    params: { symbol: symbol.toUpperCase() }
  });
  return response.data;
};

export const fetchHistoricalPrices = async (symbol: string, days: number = 30) => {
  const response = await apiClient.get('/api/proxy/alpha/history', {
    params: { symbol: symbol.toUpperCase(), days }
  });
  return response.data;
};

export const fetchFinnhubQuote = async (symbol: string) => {
  const response = await apiClient.get('/api/proxy/finnhub/quote', {
    params: { symbol: symbol.toUpperCase() }
  });
  return response.data;
};
```

---

## Code Examples

### React Component - Stock Quote Display

```typescript
import React, { useState, useEffect } from 'react';
import { fetchStockQuote } from '../services/stockService';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export const StockCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getQuote = async () => {
      try {
        setLoading(true);
        const data = await fetchStockQuote(symbol);
        setQuote(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch quote');
      } finally {
        setLoading(false);
      }
    };

    getQuote();
    const interval = setInterval(getQuote, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!quote) return <div>No data</div>;

  const isPositive = quote.change >= 0;
  const color = isPositive ? 'green' : 'red';

  return (
    <div style={{ borderRadius: '8px', padding: '16px', border: '1px solid #ddd' }}>
      <h2>{quote.symbol}</h2>
      <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
        ${quote.price.toFixed(2)}
      </p>
      <p style={{ color }}>
        {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
      </p>
      <small>{new Date(quote.timestamp).toLocaleString()}</small>
    </div>
  );
};
```

### Chart Component - Historical Prices

```typescript
import React, { useState, useEffect } from 'react';
import { fetchHistoricalPrices } from '../services/stockService';

export const PriceChart: React.FC<{ symbol: string; days?: number }> = ({ symbol, days = 30 }) => {
  const [data, setData] = useState<Array<{ timestamp: number; price: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getHistory = async () => {
      try {
        const history = await fetchHistoricalPrices(symbol, days);
        setData(history);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    getHistory();
  }, [symbol, days]);

  if (loading) return <div>Loading chart...</div>;
  if (!data || data.length === 0) return <div>No historical data</div>;

  // Use a charting library like Chart.js, Recharts, or Apache ECharts
  return (
    <div>
      {/* Map data to your preferred charting library */}
      {data.map((point, idx) => (
        <div key={idx}>
          {new Date(point.timestamp).toLocaleDateString()}: ${point.price.toFixed(2)}
        </div>
      ))}
    </div>
  );
};
```

### Search Component with Debounce

```typescript
import React, { useState, useCallback } from 'react';
import { fetchStockQuote } from '../services/stockService';

export const StockSearch: React.FC = () => {
  const [input, setInput] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    async (symbol: string) => {
      if (!symbol || symbol.length < 1) return;

      try {
        setLoading(true);
        const data = await fetchStockQuote(symbol);
        setQuote(data);
      } catch (error) {
        console.error('Search failed:', error);
        setQuote(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounce with 500ms delay
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(value), delay);
    };
  };

  const debouncedSearch = debounce(handleSearch, 500);

  return (
    <div>
      <input
        type="text"
        placeholder="Enter stock symbol (e.g., AAPL)"
        value={input}
        onChange={(e) => {
          setInput(e.target.value.toUpperCase());
          debouncedSearch(e.target.value.toUpperCase());
        }}
      />
      {loading && <p>Searching...</p>}
      {quote && (
        <div>
          <h3>{quote.symbol}</h3>
          <p>${quote.price.toFixed(2)}</p>
          <p>{quote.changePercent.toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
};
```

---

## Best Practices

### 1. **Caching Strategy**
```typescript
// Store quotes in browser cache/localStorage
const getCachedQuote = (symbol: string) => {
  const cached = localStorage.getItem(`quote_${symbol}`);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 300000) { // 5 minutes
      return data;
    }
  }
  return null;
};

const cacheQuote = (symbol: string, data: Quote) => {
  localStorage.setItem(`quote_${symbol}`, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
};
```

### 2. **Error Boundary**
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class QuoteErrorBoundary extends React.Component<any, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>Error loading quote: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}
```

### 3. **Loading States**
```typescript
const QuoteWithLoading = ({ symbol }: { symbol: string }) => {
  const { data, loading, error } = useQuote(symbol);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <QuoteDisplay quote={data} />;
};
```

### 4. **Polling for Real-time Updates**
```typescript
useEffect(() => {
  const fetchQuote = async () => {
    try {
      const data = await fetchStockQuote(symbol);
      setQuote(data);
    } catch (error) {
      console.error('Poll failed:', error);
    }
  };

  fetchQuote(); // Initial fetch

  // Poll every 60 seconds (respects backend cache)
  const interval = setInterval(fetchQuote, 60000);

  return () => clearInterval(interval);
}, [symbol]);
```

### 5. **Validation**
```typescript
const validateSymbol = (symbol: string): boolean => {
  // Only alphanumeric, 1-5 characters
  return /^[A-Z0-9]{1,5}$/.test(symbol.toUpperCase());
};

const handleSearch = async (symbol: string) => {
  if (!validateSymbol(symbol)) {
    setError('Invalid symbol format');
    return;
  }
  // Proceed with API call
};
```

### 6. **Performance Optimization**
```typescript
// Memoize quote component
const MemoizedQuoteCard = React.memo(
  ({ quote }: { quote: Quote }) => (
    <div>
      <p>${quote.price.toFixed(2)}</p>
      <p>{quote.changePercent.toFixed(2)}%</p>
    </div>
  ),
  (prev, next) => prev.quote.symbol === next.quote.symbol
);
```

---

## Testing Checklist

- [ ] Fetch single quote: `GET /api/proxy/alpha/quote?symbol=AAPL`
- [ ] Fetch multiple quotes (test caching behavior)
- [ ] Fetch historical prices: `GET /api/proxy/alpha/history?symbol=AAPL&days=7`
- [ ] Test with invalid symbol: `?symbol=INVALID123`
- [ ] Test rate limiting by rapid requests
- [ ] Verify fallback to Finnhub during Alpha rate limit
- [ ] Check timestamp formatting in UI
- [ ] Verify percentage display (e.g., 1.31 displays as "1.31%")
- [ ] Test error messages display correctly

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors | Backend has CORS enabled; check `http://localhost:4001` is correct |
| 404 errors | Verify URL includes `/api/proxy/` prefix |
| Empty responses | Check `?symbol=ABC` parameter is included and uppercase |
| 429 rate limit | Wait 60+ seconds; use caching; implement exponential backoff |
| Timestamp format | Divide by 1000 if converting to seconds; use `new Date(timestamp)` |
| Percent display | Already multiplied by 100 in backend; display directly |

---

## Support & Monitoring

**API Documentation:** `http://localhost:4001/api-docs`

**Backend Logs:** Check server console for rate limit info and fallback triggers

**Common Log Patterns:**
```
✅ Cache hit:     "304 Not Modified"
✅ Alpha success: "GET /api/proxy/alpha/quote 200"
⚠️  Rate limited: "429 Too Many Requests" → Falls back to Finnhub
🔄 Finnhub used:  "GET /api/proxy/alpha/quote 200" (data from Finnhub)
```

---

**Last Updated:** December 24, 2025
**Backend Version:** 1.0.0
