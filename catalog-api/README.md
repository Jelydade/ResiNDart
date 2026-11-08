# ResiNDart catalog API

Cloudflare Worker used by `admin.html`. It keeps GitHub credentials out of the browser and exposes
only catalog and product-image operations.

Required Cloudflare secrets:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` — a random value of at least 32 bytes
- `GITHUB_TOKEN` — a fine-grained token restricted to `Jelydade/ResiNDart` with
  **Contents: Read and write**

Do not commit secret values. Configure them in **Workers & Pages → resindart-catalog-api → Settings
→ Variables and Secrets**.

