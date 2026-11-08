const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const CATEGORIES = new Set(["clock", "decor", "table", "art"]);
const STATUSES = new Set(["available", "order"]);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class InputError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  return origin === env.ALLOWED_ORIGIN
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : {};
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request, env),
    },
  });
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSession(secret) {
  const payload = base64UrlEncode(
    textEncoder.encode(
      JSON.stringify({
        sub: "resindart-admin",
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      }),
    ),
  );
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), textEncoder.encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifySession(token, secret) {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlDecode(signature),
      textEncoder.encode(payload),
    );
    if (!valid) return false;
    const data = JSON.parse(textDecoder.decode(base64UrlDecode(payload)));
    return data.sub === "resindart-admin" && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function secretEquals(left = "", right = "") {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", textEncoder.encode(left)),
    crypto.subtle.digest("SHA-256", textEncoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function decodeBase64(value) {
  return textDecoder.decode(Uint8Array.from(atob(value.replace(/\n/g, "")), (character) => character.charCodeAt(0)));
}

function encodeBase64(value) {
  const bytes = textEncoder.encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function apiPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest(env, path, options = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${apiPath(path)}`,
    {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "ResiNDart catalog admin",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `GitHub error ${response.status}`);
    error.status = response.status === 409 ? 409 : 502;
    throw error;
  }
  return data;
}

function cleanString(value, field, maxLength, required = false) {
  if (typeof value !== "string") throw new InputError(`Поле «${field}» имеет неверный формат`);
  const result = value.trim();
  if (required && !result) throw new InputError(`Заполните поле «${field}»`);
  if (result.length > maxLength) throw new InputError(`Поле «${field}» слишком длинное`);
  return result;
}

function normalizeProduct(product) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    throw new InputError("Неверный формат товара");
  }
  if (!CATEGORIES.has(product.category)) throw new InputError("Выберите допустимую категорию");
  if (!STATUSES.has(product.status)) throw new InputError("Выберите допустимый статус");
  if (typeof product.published !== "boolean") throw new InputError("Неверное значение публикации");

  const image = cleanString(product.image ?? "", "Фото", 500);
  if (image && !image.startsWith("assets/") && !image.startsWith("/ResiNDart/assets/")) {
    throw new InputError("Недопустимый путь к фотографии");
  }

  return {
    id: Number.isSafeInteger(product.id) && product.id > 0 ? product.id : undefined,
    published: product.published,
    category: product.category,
    name: cleanString(product.name, "Название", 120, true),
    status: product.status,
    price: cleanString(product.price, "Цена", 60, true),
    size: cleanString(product.size ?? "", "Размеры", 120),
    time: cleanString(product.time ?? "", "Срок изготовления", 120),
    image,
    imageAlt: cleanString(product.imageAlt ?? product.name, "Описание фото", 200),
    description: cleanString(product.description, "Описание", 2000, true),
  };
}

function sanitizeImageName(value) {
  const match = String(value).toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match?.[1] ?? "";
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new InputError("Поддерживаются только JPG, PNG и WebP");
  }
  const base = String(value)
    .slice(0, -(extension.length + 1))
    .normalize("NFKD")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "product";
  return `${Date.now()}-${base}.${extension}`;
}

async function requireSession(request, env) {
  const authorization = request.headers.get("Authorization") ?? "";
  return authorization.startsWith("Bearer ") && verifySession(authorization.slice(7), env.SESSION_SECRET);
}

async function handleLogin(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (env.LOGIN_RATE_LIMITER) {
    const { success } = await env.LOGIN_RATE_LIMITER.limit({ key: `login:${ip}` });
    if (!success) return json(request, env, { message: "Слишком много попыток. Повторите через минуту." }, 429);
  }

  const body = await request.json().catch(() => null);
  if (!body) return json(request, env, { message: "Введите логин и пароль." }, 400);

  const [validUsername, validPassword] = await Promise.all([
    secretEquals(body.username, env.ADMIN_USERNAME),
    secretEquals(body.password, env.ADMIN_PASSWORD),
  ]);
  if (!validUsername || !validPassword) {
    return json(request, env, { message: "Неверный логин или пароль." }, 401);
  }

  return json(request, env, { token: await createSession(env.SESSION_SECRET), expiresIn: SESSION_TTL_SECONDS });
}

async function handleCatalogGet(request, env) {
  const file = await githubRequest(env, env.CATALOG_PATH);
  const catalog = JSON.parse(decodeBase64(file.content));
  if (!Array.isArray(catalog.products)) throw new Error("В репозитории повреждён файл каталога");
  return json(request, env, { products: catalog.products, sha: file.sha });
}

async function handleCatalogPut(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.products) || body.products.length > 200) {
    return json(request, env, { message: "Неверный формат каталога." }, 400);
  }
  const products = body.products.map(normalizeProduct);
  const result = await githubRequest(env, env.CATALOG_PATH, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branch: env.GITHUB_BRANCH,
      sha: cleanString(body.sha ?? "", "Версия каталога", 100, true),
      message: cleanString(body.message ?? "Update catalog", "Комментарий", 120, true),
      content: encodeBase64(JSON.stringify({ products }, null, 2) + "\n"),
    }),
  });
  return json(request, env, { sha: result.content.sha });
}

async function handleImage(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.content !== "string") {
    return json(request, env, { message: "Фотография не передана." }, 400);
  }
  const approximateBytes = Math.floor((body.content.length * 3) / 4);
  if (approximateBytes <= 0 || approximateBytes > MAX_IMAGE_BYTES) {
    return json(request, env, { message: "Фотография должна быть не больше 2 МБ." }, 400);
  }
  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(body.content)) {
    return json(request, env, { message: "Фотография повреждена." }, 400);
  }

  const fileName = sanitizeImageName(body.name);
  const repositoryPath = `assets/products/${fileName}`;
  await githubRequest(env, repositoryPath, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branch: env.GITHUB_BRANCH,
      message: `Upload product image ${fileName}`,
      content: body.content,
    }),
  });
  return json(request, env, { path: `/ResiNDart/${repositoryPath}` });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return json(request, env, { message: "Домен не разрешён." }, 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (pathname === "/health" && request.method === "GET") {
      return json(request, env, { ok: true });
    }

    for (const secret of ["ADMIN_USERNAME", "ADMIN_PASSWORD", "SESSION_SECRET", "GITHUB_TOKEN"]) {
      if (!env[secret]) return json(request, env, { message: "Сервер ещё не настроен." }, 503);
    }

    try {
      if (pathname === "/login" && request.method === "POST") return await handleLogin(request, env);
      if (!(await requireSession(request, env))) {
        return json(request, env, { message: "Требуется вход." }, 401);
      }
      if (pathname === "/catalog" && request.method === "GET") return await handleCatalogGet(request, env);
      if (pathname === "/catalog" && request.method === "PUT") return await handleCatalogPut(request, env);
      if (pathname === "/image" && request.method === "POST") return await handleImage(request, env);
      return json(request, env, { message: "Страница не найдена." }, 404);
    } catch (error) {
      const status = Number(error.status) || (error instanceof SyntaxError ? 400 : 500);
      const message =
        status === 409
          ? "Каталог уже изменён в другой вкладке. Обновите страницу и повторите."
          : status >= 500
            ? "Не удалось сохранить данные. Повторите позже."
            : error.message;
      return json(request, env, { message }, status);
    }
  },
};

