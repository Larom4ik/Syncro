<p align="center">
  <a href="#">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://capsule-render.vercel.app/api?type=waving&height=200&color=gradient&customColorList=0&text=SYNCRO&fontSize=80&fontColor=d4a853&reversal=false&section=header">
      <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=200&color=gradient&customColorList=0&text=SYNCRO&fontSize=80&fontColor=d4a853&reversal=false&section=header">
    </picture>
  </a>
</p>

<p align="center">
  <b>Смотрите видео вместе. Фильмы, сериалы, YouTube — в реальном времени.</b><br>
  <sub>С E2E-шифрованием и синхронизацией как в RAVE</sub>
</p>

<p align="center">
  <a href="https://github.com/nedzi/syncro/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-emerald?style=flat-square" alt="MIT License">
  </a>
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/encryption-AES--256--GCM-8b5cf6?style=flat-square" alt="Encryption">
  <img src="https://img.shields.io/badge/stack-Next_fs-000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/stack-Express-339933?style=flat-square&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/realtime-Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" alt="Socket.IO">
  <img src="https://img.shields.io/badge/p2p-WebTorrent-76B900?style=flat-square&logo=webtorrent&logoColor=white" alt="WebTorrent">
  <img src="https://img.shields.io/badge/p2p-PeerJS-3B82F6?style=flat-square&logo=webrtc&logoColor=white" alt="PeerJS">
</p>

<br>

---

## ✦ Возможности

<table>
<tr>
<td width="50%">

###Совместный просмотр
Создавайте приватные комнаты и смотрите кино с друзьями в реальном времени. Play/Pause/Seek синхронизируются мгновенно.

###E2E-шифрование
Все события синхронизации шифруются AES-256-GCM на клиенте. Пароль комнаты — ключ. Сервер ничего не знает о том, что вы смотрите.

###P2P-шаринг
Делитесь локальными файлами напрямую между участниками через WebRTC (PeerJS). Без загрузки на сервер.

</td>
<td width="50%">

###Каталог фильмов
Поиск по Кинопоиску и TMDB. Фильтрация по жанрам, годам, рейтингу. Встроенный поиск торрентов и прямых ссылок.

###Любой источник
YouTube, VK Video, .mp4, .m3u8 (HLS) — вставьте ссылку и смотрите вместе. `yt-dlp` достанет лучший доступный формат.

</td>
</tr>
</table>

<br>

## ✦ Скриншоты

<p align="center">
  <i>Скоро здесь будут скриншоты приложения</i>
</p>

<!-- TODO: add screenshots
<p align="center">
  <img src="assets/screenshot-landing.png" width="30%" />
  <img src="assets/screenshot-catalog.png" width="30%" />
  <img src="assets/screenshot-player.png" width="30%" />
</p>
-->

<br>

## ✦ Архитектура

```mermaid
flowchart TB
    subgraph Frontend ["💻 Frontend (Next.js 16)"]
        direction TB
        MC["🎬 Movie Catalog"] --> RM["🔑 Room Manager"]
        RM --> SP["▶️ SyncPlayer<br>(HLS + WebTorr.)"]
        
        RM --> CL["🔒 Crypto Layer<br>(AES-256-GCM + PBKDF2)"]
        SP --> CL
        
        CL --> SC["🔌 Socket.IO Client + PeerJS"]
    end

    subgraph Backend ["⚙️ Backend (Express + Socket.IO)"]
        direction TB
        RA["🌐 REST API<br>(TMDB/KP/yt)"]
        SR["🔄 Socket Relay<br>(sync, signaling)"]
        RS[("💾 Room Store<br>(in-memory)")]
        
        SR <--> RS
    end

    SC ====>|⚡ encrypted sync events| SR

    %% Стилизация блоков для красоты
    style Frontend fill:#1a1b26,stroke:#7aa2f7,stroke-width:2px,color:#fff
    style Backend fill:#1a1b26,stroke:#f7768e,stroke-width:2px,color:#fff
    style CL fill:#24283b,stroke:#e0af68,stroke-width:1px
    style SC fill:#24283b,stroke:#73daca,stroke-width:1px
    style SR fill:#24283b,stroke:#bb9af7,stroke-width:1px
```

<br>

## ✦ Технологии

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/PeerJS-3B82F6?style=for-the-badge&logo=webrtc&logoColor=white" />
  <img src="https://img.shields.io/badge/WebTorrent-76B900?style=for-the-badge&logo=webtorrent&logoColor=white" />
  <img src="https://img.shields.io/badge/HLS.js-FF6B35?style=for-the-badge&logo=hls.js&logoColor=white" />
  <img src="https://img.shields.io/badge/yt--dlp-FF0000?style=for-the-badge&logo=youtube&logoColor=white" />
</p>

| Frontend | Backend |
|---|---|
| Next.js 16 (App Router) | Express + TypeScript |
| React 19 | Socket.IO |
| Tailwind CSS v4 | yt-dlp (youtube-dl-exec) |
| Framer Motion | Axios |
| PeerJS (WebRTC) | Cheerio |
| WebTorrent | — |
| HLS.js | — |

<br>

## ✦ Быстрый старт

### Предварительно

- Node.js v18+
- npm / pnpm / yarn
- Windows: `yt-dlp.exe` в `backend/` (для извлечения медиа-ссылок)

### Backend

```bash
cd backend
cp .env.example .env
# Отредактируйте .env — добавьте TMDB_API_KEY при необходимости
npm install
npm run dev
# → http://localhost:3001
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

### Переменные окружения

<details>
<summary><b>Backend (<code>backend/.env</code>)</b></summary>

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3001` | Порт сервера |
| `CORS_ORIGIN` | `http://localhost:3000` | Разрешённый CORS-источник |
| `TMDB_API_KEY` | — | API-ключ TMDB |
| `KINOPOISK_API_KEY` | встроенный fallback | API-ключ Кинопоиска |
| `TORRENT_PROVIDER` | `both` | Предпочитаемый источник торрентов |

</details>

<details>
<summary><b>Frontend (<code>frontend/.env.local</code>)</b></summary>

| Переменная | По умолчанию | Описание |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL бэкенда (REST) |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | URL бэкенда (Socket.IO) |

</details>

<br>

## ✦ API Endpoints

<details>
<summary><b>REST API</b></summary>

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/ping` | Health check |
| `GET` | `/api/catalog/discover` | Каталог (Кинопоиск) |
| `GET` | `/api/catalog/search` | Поиск (Кинопоиск) |
| `GET` | `/api/catalog/movie/:id` | Детали фильма (Кинопоиск) |
| `GET` | `/api/tmdb/discover` | Каталог (TMDB) |
| `GET` | `/api/tmdb/search` | Поиск (TMDB) |
| `GET` | `/api/tmdb/movie/:id` | Детали фильма (TMDB) |
| `GET` | `/api/tmdb/genres` | Жанры (TMDB) |
| `GET` | `/api/torrents/search` | Поиск торрентов |
| `GET` | `/api/torrents/extract-url` | Извлечение видео-ссылки |
| `GET` | `/api/torrents/extract-formats` | Список форматов |
| `GET` | `/api/torrents/room-stream` | Поток комнаты |
| `POST` | `/api/torrents/select-quality` | Сменить качество |

</details>

<details>
<summary><b>Socket.IO Events</b></summary>

**Client → Server:** `create_room`, `join_room`, `leave_room`, `sync_encrypted`, `bootstrap_encrypted`, `webrtc_signal`, `p2p_peer_ready`

**Server → Client:** `init_data`, `rooms_list_update`, `room_created`, `join_ok`, `join_denied`, `room_error`, `room_users`, `user_joined`, `sync_encrypted`, `bootstrap_encrypted`, `webrtc_signal`, `p2p_peer_ready`

</details>

<br>

## ✦ Лицензия

MIT © [nedzi](https://github.com/nedzi)

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/nedzi">nedzi</a></sub>
</p>
