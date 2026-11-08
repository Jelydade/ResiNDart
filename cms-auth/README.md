# Вход в CMS

`worker.js` основан на [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth), MIT License. Для публичного репозитория ResiNDart запрос прав сокращён до `public_repo,read:user`.

Worker `resindart-cms-auth` уже привязан к GitHub OAuth приложению `ResiNDart CMS`. Callback URL: `https://resindart-cms-auth.jelydade-resindart.workers.dev/callback`.

Для работы входа в настройках Worker должен быть секрет `GITHUB_CLIENT_SECRET` из этого OAuth приложения. Client ID и допустимый домен указаны в `wrangler.toml`. Не сохраняйте секрет в Git.

Развёртывание из этой папки: `npx wrangler deploy`. После входа редактирование `data/catalog.json` и загрузка фото в `assets/products` создают коммит в `main`.
