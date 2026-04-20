## Bugs Found and Fixed

**Bug 1 — product findOne() missing tenantId scope**
Any tenant could read, update, or delete another tenant's product by ID.
Fixed by adding tenantId to the WHERE clause in findOne(). Since update()
and delete() both call findOne() internally, this covers all three operations.

**Bug 2 — Status filter returning inverted results**
Filtering by ACTIVE returned INACTIVE products and vice versa. The code was
deliberately swapping the status value before filtering. Fixed by removing
the swap and using the filter value directly.

**Bug 3 — Pagination off by one page**
skip = page _ pageSize caused page 1 to skip the first 10 rows and return
page 2 data. Fixed to (page - 1) _ pageSize.

**Bug 4 — Product price stored as integer**
The TypeORM column type was int, truncating decimal values (e.g. 9.99 → 9).  
Fixed by updating the column type to decimal(10,2).

Note: synchronize:true is still enabled during seeding, so schema updates are
applied automatically.

**Bug 5 — Image priority default was 0, spec says 100**
Fixed in both the entity column default and the DTO defaultValue.

**Bug 6 — Missing records returned 500 instead of null**
Resolvers were declared non-nullable so NotFoundException caused internal
server errors. Changed to nullable resolvers returning null cleanly.

**Bug 7 — Missing x-tenant-id header silently allowed through**
The TenantId decorator had a || 'default' fallback, so requests without
the header ran as 'default' tenant instead of being rejected. Removed the
fallback and added TenantGuard to reject missing headers explicitly.

**Bug 8 — ValidationPipe not registered**
All DTO validation decorators (@Min, @Max, @IsNotEmpty) were completely
ignored at runtime. Registered ValidationPipe globally in main.ts and
added @Min(1) @Max(1000) to image priority fields.

## Assumptions

- The API runs locally on http://localhost:3000/graphql before running tests
- Tests require both tenant-a and tenant-b seed data to exist
- docker-compose up --build followed by docker-compose run --rm seed is
  run before the test suite
