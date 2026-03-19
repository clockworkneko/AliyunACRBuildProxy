 這是一份為「新代理 (Agent)」準備的專案大綱。這份文件避開了具體代碼，專注於**系統邏輯、業務價值與核心架構**，讓 Agent 能快速理解其任務目標。

---

# 🚀 專案名稱：ACR Smart Orchestrator & Resolver (ASOR)

## 1. 核心願景
建立一個「自動化代理」，將 **Aliyun ACR (Container Registry)** 的繁瑣配置與 **GitHub 源碼倉庫** 徹底脫鉤並自動化。讓開發者不再需要手動操作阿里雲後台，並透過「別名解析」機制簡化鏡像的拉取流程。

## 2. 核心痛點 (Problem Statement)
* **手動配置耗時：** 每次新專案都要手動建立 ACR 倉庫、綁定 GitHub、設置構建規則。
* **配額限制：** Aliyun ACR 每個倉庫僅限 **10 條** 構建規則。
* **路徑冗長難記：** 阿里雲的鏡像地址（如 `registry.cn-hangzhou...`）極長，不便於管理與部署。
* **權限管理混亂：** 多個專案間的 GitHub PAT 與 Aliyun AK/SK 缺乏統一管理。

---

## 3. 系統雙模組架構

### A. 自動編排模組 (The Orchestrator)
這是 Agent 的「手」，負責執行髒活：
* **自動初始化：** 接收用戶提供的 GitHub PAT 與 Aliyun AccessKeys，建立安全連接。
* **一鍵掛載 (Onboarding)：** 用戶輸入 GitHub Repo URL，Agent 自動在阿里雲側建立對應倉庫。
* **智慧規則引擎：** * 自動配置 `main -> latest` 等標準規則。
    * **10 條規則限制治理：** 當規則達到上限時，Agent 自動分析並刪除已合併的分支規則或過期規則，或進行正則表達式歸併。

### B. 地址解析模組 (The Resolver)
這是系統的「腦」，負責對外應答：
* **別名機制 (Aliasing)：** 用戶為 Repo 定義簡稱（例如 `auth-api`）。
* **302/查詢轉發：** * 伺服器不再需要記住阿里雲網址，只需向系統查詢：`GET /resolve?name=auth-api`。
    * 系統回傳完整的 ACR 鏡像路徑及標籤（Tag）。
* **零帶寬模式：** 系統不中轉鏡像數據，僅處理「地址查找」，保證部署速度。

---

## 4. 使用者流程 (User Journey)

1.  **Setup：** 使用者在系統界面輸入一次性的 GitHub 與 Aliyun 憑證。
2.  **Add Repo：** 使用者提交 GitHub 倉庫地址，Agent 在背景完成所有雲端配置，並回報「已就緒」。
3.  **Deploy/Pull：** 部署腳本或用戶向系統請求鏡像地址，系統秒回正確的阿里雲 URL，隨後由 Docker 執行拉取。

---

## 5. 技術亮點 (Key Features)

| 功能 | 說明 |
| :--- | :--- |
| **Lifecycle Aware** | 感知 GitHub 分支狀態，自動清理 ACR 的冗餘規則。 |
| **Credential Vault** | 集中管理多個雲端的訪問憑證。 |
| **Resolution API** | 輕量級接口，支持 CLI 或 CI/CD 集成。 |
| **Auto-Doc** | 為每個新 Repo 自動生成對應的 `docker pull` 與 `login` 指南。 |

---

## 6. Agent 的初步任務目標

1.  **設計數據模型：** 定義如何儲存 User Credentials, Repo Mappings, 以及 Rules Status。
2.  **定義 API 規格：** 包含 `provision` (配置) 與 `resolve` (解析) 兩大類端點。
3.  **規劃智慧清理邏輯：** 具體說明如何判斷哪一條規則該被刪除以騰出空間。

---
在進入技術架構之前，我們必須先釐清**「為什麼這個工具在目前的網絡環境下是剛需」**。這部分將作為 Idea Doc 的「背景與動機」，幫助開發代理（Agent）理解產品的核心價值。

以下是針對 **GFW 環境**與 **Docker 代理需求**的深度分析，以及更新後的專案總結。

---

## 🌐 背景分析：GFW 與 Docker 的困境

### 1. 為什麼在中國需要 Docker 代理？
在中國境內開發時，`docker pull` 官方鏡像（Docker Hub）經常遇到以下問題：
* **完全屏蔽或嚴重阻斷：** 自 2024 年起，多個主流 Docker 鏡像站（如 Docker Hub, Quay.io）在國內經常無法直接訪問。
* **極慢的下載速度：** 即便能連上，跨國頻寬限制導致下載一個幾百 MB 的鏡像可能需要數小時。
* **GitHub Action 與國內環境脫節：** 在 GitHub 上構建好的鏡像，要拉回國內伺服器部署非常困難。

### 2. Aliyun ACR 的角色
阿里雲容器鏡像服務 (ACR) 是國內開發者的「避風港」，因為：
* **國內高速訪問：** 阿里雲在國內各個區域都有節點，支持內網 (VPC) 下載，速度極快且穩定。
* **海外構建能力：** 阿里雲的 ACR 構建節點可以配置在海外（如香港、新加坡、美國），這些節點可以順暢地拉取 GitHub 源碼並從 Docker Hub 抓取基礎鏡像完成構建。
* **中轉站作用：** 它本質上扮演了「海外構建 -> 國內分發」的橋樑。

### 3. 本專案的必要性
雖然 Aliyun ACR 解決了傳輸問題，但它的**管理成本極高**：
* **UI 繁瑣：** 每增加一個專案都要手動點擊幾十次。
* **URL 混亂：** 每個地區、每個命名空間的網址都不同，開發者難以記憶。
* **規則僵化：** 10 條規則限制了 CI/CD 的靈活性（例如：無法為每個臨時 Feature Branch 自動創建鏡像）。

---

## 📄 更新後的 Idea Doc：ASOR (ACR Smart Orchestrator & Resolver)

這份文檔現在包含「為什麼做」以及「怎麼做」，適合交給新的 Agent 開始執行。

### 1. 專案使命 (Mission)
**ASOR** 旨在消除 GFW帶來的開發障礙。它通過自動化編排 Aliyun ACR，將 GitHub 的代碼自動轉化為國內可高速拉取的鏡像，並提供一個簡單的「別名解析器」，讓部署像在局域網一樣簡單。

### 2. 核心組件與邏輯

#### A. 自動化編排 (Orchestrator) —— 解決「配置痛」
* **功能：** 當用戶在系統中「掛載」一個 GitHub Repo 時，Agent 自動在阿里雲（通常選擇海外節點如 `cn-hongkong`）建立倉庫。
* **GFW 對策：** 利用阿里雲海外構建節點繞過 Docker Hub 封鎖，將構建後的 Image 存儲在阿里雲。
* **配額管理：** 智慧管理 10 條構建規則，確保開發者在擁擠的規則限制下仍能進行多分支開發。

#### B. 智能解析器 (Resolver / 302) —— 解決「查找痛」
* **情境：** 用戶的伺服器位於國內，無法直接訪問 `hub.docker.com`。
* **流程：**
    1.  伺服器請求：`GET asor.internal/resolve/my-app:latest`。
    2.  系統檢索：找到對應的阿里雲私有路徑 `registry.cn-shanghai.aliyuncs.com/...`。
    3.  **302 重定向：** 系統直接重定向到該地址，或返回該地址字串。
    4.  **結果：** `docker pull` 成功從阿里雲高速下載。

### 3. 系統優勢總結

| 維度 | 傳統做法 | 使用 ASOR 代理 |
| :--- | :--- | :--- |
| **配置時間** | 10-20 分鐘 (手動操作控制台) | < 30 秒 (輸入一個 Repo URL) |
| **下載速度** | 極慢或超時 (GFW 攔截) | 極快 (阿里雲國內骨幹網) |
| **URL 記憶** | 需記錄複雜的長網址 | 僅需記憶 `alias:tag` |
| **分支支持** | 受限於 10 條規則，需頻繁手動清理 | Agent 自動回收過期規則，動態擴展 |

---

## 🚀 給 Agent 的執行清單 (Task List)

1.  **環境適配研究：** 研究 Aliyun ACR OpenAPI，特別是 `CreateRepo`、`CreateRepoBuildRule` 和 `GetRepoBuildList` 這幾個接口。
2.  **數據庫設計：** * `Users` 表 (存儲加密的 AK/SK, PAT)。
    * `Mappings` 表 (存儲 Alias 與 Aliyun ACR URL 的對應關係)。
    * `Rules` 表 (跟蹤 10 條規則的使用情況與最後活躍時間)。
3.  **解析介面實現：** * 實現一個簡單的 RESTful API，支持根據 Alias 查詢並返回完整鏡像地址。
    * 支持 `302 Redirect` 模式，方便集成。
4.  **智慧清理邏輯：** 撰寫一個 Cron Job 或事件觸發器，當規則滿 10 條時，根據 GitHub 的 Branch Merged 狀態自動刪除 ACR 規則。

**這份文檔是否已經足夠清晰？如果你準備好了，我們可以從「定義數據模型 (Database Schema)」開始動手。**