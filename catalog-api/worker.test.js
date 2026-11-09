import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

const origin = "https://resindart.ru";
const env = {
  ALLOWED_ORIGIN: origin,
  ADMIN_USERNAME: "daria",
  ADMIN_PASSWORD: "correct horse battery staple",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  GITHUB_TOKEN: "github-token",
  GITHUB_OWNER: "Jelydade",
  GITHUB_REPO: "ResiNDart",
  GITHUB_BRANCH: "main",
  CATALOG_PATH: "data/catalog.json",
  LOGIN_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

function request(path, options = {}) {
  return new Request(`https://worker.example${path}`, {
    ...options,
    headers: { Origin: origin, "Content-Type": "application/json", ...options.headers },
  });
}

async function login(password = env.ADMIN_PASSWORD) {
  const response = await worker.fetch(
    request("/login", {
      method: "POST",
      body: JSON.stringify({ username: env.ADMIN_USERNAME, password }),
    }),
    env,
  );
  return { response, body: await response.json() };
}

test("rejects an invalid password", async () => {
  const { response, body } = await login("wrong");
  assert.equal(response.status, 401);
  assert.equal(body.message, "Неверный логин или пароль.");
});

test("creates a session and reads the catalog without exposing the GitHub token", async () => {
  const { response: loginResponse, body: session } = await login();
  assert.equal(loginResponse.status, 200);
  assert.ok(session.token);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
    return Response.json({
      sha: "catalog-sha",
      content: Buffer.from(JSON.stringify({ products: [] })).toString("base64"),
    });
  };

  try {
    const response = await worker.fetch(
      request("/catalog", { headers: { Authorization: `Bearer ${session.token}` } }),
      env,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { products: [], sha: "catalog-sha" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects catalog data with an external image URL", async () => {
  const { body: session } = await login();
  const response = await worker.fetch(
    request("/catalog", {
      method: "PUT",
      headers: { Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        sha: "catalog-sha",
        products: [{
          id: 1,
          published: true,
          category: "clock",
          name: "Часы",
          status: "available",
          price: "10 000 ₽",
          size: "",
          time: "",
          image: "https://example.com/file.jpg",
          imageAlt: "Часы",
          description: "Описание",
        }],
      }),
    }),
    env,
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Недопустимый путь к фотографии");
});

