<p align="center">
  <a href="#">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://capsule-render.vercel.app/api?type=waving&height=220&color=gradient&customColorList=30&text=SYNCRO&fontSize=86&fontColor=d4a853&reversal=false&section=header">
      <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=220&color=gradient&customColorList=30&text=SYNCRO&fontSize=86&fontColor=d4a853&reversal=false&section=header">
    </picture>
  </a>
</p>

<p align="center">
  <b>Сквозное E2E-шифрование сессий и умная P2P-синхронизация мультимедиа.</b><br>
  <sub>Полная независимость от централизованных сервисов, сторонних API и цензуры.</sub>
</p>

<p align="center">
  <a href="https://github.com/nedzi/syncro/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-emerald?style=for-the-badge" alt="MIT License">
  </a>
  <img src="https://img.shields.io/badge/status-active-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/encryption-AES--256--GCM-8b5cf6?style=for-the-badge" alt="Encryption">
</p>

<br>

---

## ✦ Возможности

⚡ **Высокоточная синхронизация** — управление состоянием плеера (`Play`, `Pause`, `Seek`) транслируется всем участникам комнаты с точностью до миллисекунд благодаря оптимизированному WebSocket-слою.

🔒 **Полная приватность (Zero-Knowledge)** — все метаданные и команды управления шифруются на клиенте алгоритмом **AES-256-GCM** с деривацией ключа через **PBKDF2**. Сервер выступает как слепой ретранслятор и понятия не имеет, какой контент запущен в комнате.

🌐 **Децентрализованный стриминг** — смотрите раздачи напрямую с торрент-трекеров (через WebTorrent) или делитесь локальными файлами с ПК прямо в плееры друзей без промежуточных серверов благодаря WebRTC дата-каналам.

🎬 **Автономный каталог** — собственный парсер трекеров (RuTor и др.) собирает актуальные новинки с постерами и описанием, полностью избавляя проект от необходимости интеграции тяжелых внешних баз данных вроде TMDB или Кинопоиска.

<br>

## ✦ Архитектура системы

Детальная схема сквозного прохождения данных. Она разделена на логические слои внутри клиента и бэкенда, показывая, как именно изолируется крипто-слой и как распределяются потоки данных.

```mermaid
flowchart TB
    %% --- НАСТРОЙКА КЛАССОВ СТИЛЕЙ (Tokyo Night Theme) ---
    classDef clientLayer fill:#1a1b26,stroke:#7aa2f7,stroke-width:2px,color:#fff;
    classDef serverLayer fill:#1f2335,stroke:#f7768e,stroke-width:2px,color:#fff;
    classDef uiNode fill:#24283b,stroke:#7bd5f5,stroke-width:1px,color:#c0caf5;
    classDef coreNode fill:#24283b,stroke:#bb9af7,stroke-width:2px,color:#c0caf5;
    classDef cryptoNode fill:#2e3047,stroke:#e0af68,stroke-width:2px,color:#ff9e64;
    classDef netNode fill:#1a1b26,stroke:#73daca,stroke-width:1px,color:#73daca;
    classDef dbNode fill:#363b54,stroke:#ff5555,stroke-width:1px,color:#ff79c6;

    %% --- КЛИЕНТСКАЯ ЧАСТЬ ---
    subgraph Frontend ["💻 FRONTEND APPLICATION (Next.js 16 App Router)"]
        direction TB
        
        subgraph FE_UI ["🎨 Слой Представления & UI"]
            MC["🎬 Movie Catalog<br><i>(Интерфейс витрины)</i>"]
            RM["🔑 Room Manager<br><i>(Лобби & Контроль сессий)</i>"]
        end

        subgraph FE_CORE ["🧠 Ядро & Обработка Контента"]
            SP["▶️ SyncPlayer<br><i>(HLS.js + WebTorrent Engine)</i>"]
        end

        subgraph FE_CRYPTO ["🔒 Криптографический Изолятор"]
            CL[["⚙️ Crypto Layer<br><b>AES-256-GCM + PBKDF2</b>"]]
        end

        subgraph FE_NET ["🔌 Сетевые Транспорты"]
            SC["⚡ Socket.IO Client<br><i>(Управление)</i>"]
            P2P["🌐 PeerJS (WebRTC)<br><i>(P2P Шаринг)</i>"]
        end
    end
    
    class Frontend,FE_UI,FE_CORE,FE_NET clientLayer;
    class MC,RM uiNode
