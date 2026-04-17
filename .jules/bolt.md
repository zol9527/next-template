## 2024-05-23 - N+1 Query Pattern in Service Layer Enrichment
**Learning:** The service layer (e.g., `PublicProductService`) manually enriches entities with related data (like media assets) by iterating over the list and calling other repositories one by one. This leads to severe N+1 query issues.
**Action:** When enriching lists of entities, always collect all foreign keys first and perform a single batch query (e.g., `getMediaAssetsByIds`) instead of iterating and fetching individually. Ensure repositories support batch retrieval methods.

## 2024-05-23 - AdminProductService N+1 Optimization
**Learning:** The 'list' pattern in services often suffers from N+1 enrichment issues. Batch fetching IDs using methods like `getMediaAssetsByIds` and mapping in memory significantly reduces DB calls.
**Action:** Audit other list services (e.g. Order, User) for similar enrichment patterns and apply batch fetching.

## 2025-01-22 - AdminProductService Detail View N+1 Optimization
**Learning:** Even detail views (e.g., `getProductById`) can suffer from N+1 issues when fetching related collections (like 10 gallery images) if they use sequential fetching loops.
**Action:** Implement batch fetching logic in helper functions (like `enrichProductWithMediaUrls`) that are used by both list and detail views. This ensures consistent performance optimization across the service.
