# Release Notes v4.2.0

## 🚀 New Features

### Authentication & Authorization
- **OAuth 2.0 PKCE Flow** — Added support for Proof Key for Code Exchange
  - Configurable via `auth.pkce.enabled` in `config.yaml`
  - Backwards compatible with existing OAuth flows
  - See [RFC 7636](https://tools.ietf.org/html/rfc7636) for details
- **RBAC Overhaul** — Role-Based Access Control completely rewritten
  - New `Permission` and `Role` entities
  - Wildcard permissions: `resource:*:read`
  - Time-limited role assignments
  - Audit log for all permission changes

### Performance Improvements
1. **Query Optimizer** — 40% faster complex joins
   ```sql
   -- Before: 450ms avg
   SELECT u.*, COUNT(o.id) as order_count
   FROM users u
   LEFT JOIN orders o ON o.user_id = u.id
   WHERE u.created_at > '2024-01-01'
   GROUP BY u.id
   HAVING COUNT(o.id) > 5;
   
   -- After: 270ms avg (uses new materialized view)
   SELECT * FROM user_order_summary
   WHERE created_at > '2024-01-01'
   AND order_count > 5;
   ```
2. **Connection Pooling** — Upgraded to PgBouncer 1.22
   - Transaction-level pooling by default
   - Reduced idle connections from ~500 to ~50
3. **Caching Layer** — Redis cluster with read replicas
   - Cache-aside pattern for frequently accessed entities
   - TTL-based invalidation with jitter
   - Circuit breaker for Redis failures

### Developer Experience
- New CLI tool: `mycli`
  ```bash
  # Initialize a new project
  mycli init my-project --template=typescript
  
  # Generate boilerplate
  mycli generate model User --fields="name:string,email:string"
  mycli generate controller UserController --crud
  
  # Run migrations
  mycli db:migrate --env=production
  mycli db:seed --env=development
  
  # Deploy
  mycli deploy --target=staging --tag=v4.2.0
  ```
- **Hot Module Replacement** for development server
- **TypeScript 5.4** support with `NoInfer` utility type

## 🐛 Bug Fixes

| Issue | Description | Severity | Fixed By |
| --- | --- | --- | --- |
| [#1234](https://github.com/example/issues/1234) | Memory leak in WebSocket handler | **Critical** | @alice |
| [#1256](https://github.com/example/issues/1256) | Race condition in batch processor | **High** | @bob |
| [#1278](https://github.com/example/issues/1278) | Incorrect timezone in `created_at` | _Medium_ | @charlie |
| [#1290](https://github.com/example/issues/1290) | ~~CSS overflow on mobile~~ | Low | @diana |
| [#1301](https://github.com/example/issues/1301) | Missing `Content-Type` header | _Medium_ | @eve |

## ⚠️ Breaking Changes

> **Migration Required:** The following changes require database migrations and config updates.

### Database Changes

```diff
- ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
+ ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);
+ CREATE INDEX idx_users_role ON users(role_id);
```

### Configuration Changes

```yaml
# Old format (deprecated)
auth:
  secret: "my-secret"
  expiry: 3600

# New format (required)
auth:
  jwt:
    algorithm: RS256
    publicKey: /keys/public.pem
    privateKey: /keys/private.pem
    accessTokenExpiry: 900
    refreshTokenExpiry: 604800
  sessions:
    store: redis
    prefix: "sess:"
```

### API Changes

- `POST /api/login` → `POST /api/v2/auth/token`
- `GET /api/user` → `GET /api/v2/users/me`
- Response envelope changed:
  ```json
  {
    "data": { ... },
    "meta": {
      "requestId": "req_abc123",
      "timestamp": "2024-03-15T10:30:00Z"
    }
  }
  ```

## 📦 Dependencies

| Package | Old | New | Notes |
| --- | --- | --- | --- |
| `typescript` | 5.3.3 | 5.4.2 | New `NoInfer` type |
| `express` | 4.18.2 | 4.19.0 | Security patch |
| `pg` | 8.11.3 | 8.12.0 | Connection improvements |
| ~~`moment`~~ | 2.30.1 | — | **Removed** (use `dayjs`) |
| `dayjs` | — | 1.11.10 | **Added** (replaces moment) |
| `zod` | 3.22.4 | 3.23.0 | Transform improvements |

## 🔧 Upgrade Guide

1. **Backup your database**
   ```bash
   pg_dump -h localhost -U admin myapp > backup_$(date +%Y%m%d).sql
   ```

2. **Update environment variables**
   - Remove: `AUTH_SECRET`, `AUTH_EXPIRY`
   - Add: `JWT_ALGORITHM`, `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY`

3. **Run migrations**
   ```bash
   mycli db:migrate --env=production
   ```

4. **Update API clients**
   - Search for `/api/login` → replace with `/api/v2/auth/token`
   - Search for `/api/user` → replace with `/api/v2/users/me`
   - Update response parsing for new envelope format

5. **Replace moment.js**
   ```typescript
   // Before
   import moment from 'moment';
   const formatted = moment(date).format('YYYY-MM-DD');
   
   // After
   import dayjs from 'dayjs';
   const formatted = dayjs(date).format('YYYY-MM-DD');
   ```

6. **Test thoroughly**
   - [ ] Authentication flow works
   - [ ] Existing sessions are valid
   - [ ] RBAC permissions are correctly migrated
   - [ ] API responses match new envelope format
   - [x] Database migrations complete without errors
   - [x] All unit tests pass
   - [x] Integration tests pass

---

_This release was prepared by the **Platform Team**. For issues, file a [bug report](https://github.com/example/issues/new) or ping `#platform-support` on Slack._
