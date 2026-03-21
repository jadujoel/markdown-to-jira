# Architecture Decision Records

This is a **comprehensive** document that tests _every_ markdown feature in a realistic, long-form context. It includes `inline code`, [links](https://example.com), and ~~deprecated~~ items.

## Table of Contents

1. [Overview](#overview)
2. [Technical Stack](#technical-stack)
3. [API Design](#api-design)
4. [Database Schema](#database-schema)
5. [Deployment](#deployment)

---

## Overview

The system is designed as a **microservices architecture** with the following key principles:

- **Loose coupling** between services
- **High cohesion** within each service
- _Event-driven_ communication via message queues
- `gRPC` for synchronous inter-service calls
  - With **TLS** mutual authentication
  - And `protobuf` schema validation
    - Including backwards compatibility checks
    - And automated migration tooling

> **Important:** All services must be independently deployable and have their own data stores. Cross-service data access is strictly forbidden.

> Nested blockquotes are often used for additional context.
> They can span multiple lines.
>
> And contain **bold**, _italic_, and `code` formatting.

### Key Metrics

| Metric | Target | Current | Status |
| --- | --- | --- | --- |
| **Latency** (p99) | < 200ms | 185ms | ✅ |
| **Throughput** | > 10k rps | 12.5k rps | ✅ |
| `Error Rate` | < 0.1% | 0.08% | ✅ |
| _Availability_ | 99.99% | 99.97% | ⚠️ |

## Technical Stack

### Backend Services

```typescript
interface ServiceConfig {
  name: string;
  port: number;
  dependencies: string[];
  healthCheck: {
    endpoint: string;
    interval: number;
    timeout: number;
  };
  scaling: {
    min: number;
    max: number;
    targetCPU: number;
  };
}

const services: ServiceConfig[] = [
  {
    name: "auth-service",
    port: 3001,
    dependencies: ["redis", "postgres"],
    healthCheck: { endpoint: "/health", interval: 30, timeout: 5 },
    scaling: { min: 2, max: 10, targetCPU: 70 },
  },
  {
    name: "user-service",
    port: 3002,
    dependencies: ["postgres", "auth-service"],
    healthCheck: { endpoint: "/health", interval: 30, timeout: 5 },
    scaling: { min: 2, max: 8, targetCPU: 75 },
  },
];
```

### Infrastructure

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

### Frontend

```javascript
// React component with complex JSX
function Dashboard({ user, metrics, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/metrics');
        // Process response
        setMetrics(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="dashboard">
      <Header user={user} />
      <MetricsGrid data={metrics} />
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
}
```

## API Design

### Authentication Flow

1. Client sends credentials to `/auth/login`
2. Server validates and returns JWT token pair:
   - **Access token** (15 min expiry)
   - **Refresh token** (7 day expiry, stored in `httpOnly` cookie)
3. Client includes access token in `Authorization: Bearer <token>` header
4. On 401 response:
   1. Client sends refresh token to `/auth/refresh`
   2. Server validates refresh token
   3. Returns new token pair
   4. If refresh fails → redirect to login

### Endpoints

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Login with credentials | No |
| `POST` | `/auth/refresh` | Refresh token pair | Cookie |
| `GET` | `/users/me` | Get current user | **Bearer** |
| `PUT` | `/users/me` | Update profile | **Bearer** |
| `GET` | `/metrics` | Get system metrics | **Bearer** + _Admin_ |
| `DELETE` | `/users/:id` | ~~Delete user~~ (deprecated) | **Bearer** + _Admin_ |

### Request/Response Examples

```json
{
  "request": {
    "method": "POST",
    "path": "/auth/login",
    "body": {
      "email": "user@example.com",
      "password": "secure123"
    }
  },
  "response": {
    "status": 200,
    "body": {
      "accessToken": "eyJhbGciOiJSUzI1NiIs...",
      "expiresIn": 900,
      "user": {
        "id": "usr_abc123",
        "email": "user@example.com",
        "roles": ["user", "admin"]
      }
    }
  }
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255),
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

### Migrations

- [x] Initial schema created
- [x] Added `avatar_url` column
- [x] Added soft delete support
- [ ] Add `preferences` JSONB column
- [ ] Add full-text search index

## Deployment

### CI/CD Pipeline

```bash
#!/bin/bash
set -euo pipefail

# Build stage
echo "Building services..."
for service in auth user metrics; do
    docker build \
        --build-arg VERSION="${GIT_SHA}" \
        --tag "registry.example.com/${service}:${GIT_SHA}" \
        --file "services/${service}/Dockerfile" \
        .
    
    # Push to registry
    docker push "registry.example.com/${service}:${GIT_SHA}"
done

# Deploy stage
echo "Deploying to production..."
kubectl apply -f k8s/
kubectl rollout status deployment/auth-service
kubectl rollout status deployment/user-service
kubectl rollout status deployment/metrics-service

echo "Deployment complete ✅"
```

### Environment Configuration

| Variable | Description | Required | Default |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | — |
| `REDIS_URL` | Redis connection string | **Yes** | — |
| `JWT_SECRET` | Secret for JWT signing | **Yes** | — |
| `LOG_LEVEL` | Logging verbosity | No | `info` |
| `PORT` | Service listen port | No | `3000` |

### Monitoring

> **Note:** All services expose Prometheus metrics at `/metrics` endpoint.

#### Health Checks

- **Liveness probe**: `GET /health/live` — returns 200 if process is running
- **Readiness probe**: `GET /health/ready` — returns 200 if dependencies are connected
  - Checks database connectivity
  - Checks Redis connectivity
  - Checks message queue connectivity

#### Alerting Rules

1. **Critical** (`P1`):
   - Error rate > 1% for 5 minutes
   - p99 latency > 1s for 10 minutes
   - Any service pod restart loop
2. **Warning** (`P2`):
   - Error rate > 0.5% for 10 minutes
   - CPU usage > 80% for 15 minutes
   - Disk usage > 85%
3. **Info** (`P3`):
   - Deployment completed
   - Scaling event triggered
   - Certificate expiry < 30 days

---

### Final Notes

This document should be treated as a **living document**. All changes must go through the [RFC process](https://example.com/rfcs) and be approved by at least two _senior engineers_.

For questions, reach out on `#architecture` in Slack or email [arch-team@example.com](mailto:arch-team@example.com).

**Last updated:** 2024-03-15 | **Version:** 2.4.1 | **Status:** _Active_
