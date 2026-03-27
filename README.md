# Seoul Culture Map

> **학술제 팀 프로젝트(서울시 문화·여가시설 분석)를 개인 프로젝트로 확장한 인터랙티브 문화시설 탐색 맵**

---

## 프로젝트 배경

### 원본 프로젝트 (학술제 — 팀 프로젝트)

통계 모임 학술제에서 **서울시 25개 자치구의 문화·여가시설 현황**을 분석했습니다.

- **주제**: 외국인에게 관광목적에 맞는 지역구 제안
- **기간**: 2023.09 — 2023.11
- **수상**: 2nd Place
- **데이터**: 서울시 공공데이터 (6개 카테고리)
- **핵심 분석**:
  - 영화관, 공연시설, 박물관/유적지, 방탈출, 공원, 전통사찰 6개 카테고리
  - 25개 자치구별 시설 분포 현황 분석
  - 군집분석을 통한 관광 목적별 지역구 분류
  - R (dplyr, ggplot2) 기반 통계 분석

### 확장 (개인 프로젝트)

팀 프로젝트의 분석 결과를 **인터랙티브 웹 서비스**로 전환했습니다.

| 구분 | 학술제 (팀) | Seoul Culture Map (개인) |
|------|-----------|--------------------------|
| 형태 | R 분석 스크립트 + 보고서 | 풀스택 웹 서비스 |
| 데이터 | CSV 정적 데이터 | 공공 API + DB 실시간 서빙 |
| 시각화 | ggplot2 정적 차트 | Leaflet 인터랙티브 맵 |
| 분석 | R 스크립트 | 지도 위 실시간 분석 시각화 |
| 결과 | PDF 보고서 | React 대시보드 (4개 페이지) |
| 배포 | 로컬 실행 | Render + Vercel 클라우드 |

---

## 핵심 기능

### 1. Culture Map — 인터랙티브 시설 탐색

- Leaflet 기반 서울시 25개 자치구 지도
- **7개 카테고리** 시설 마커 (관광지/문화시설/공연시설/박물관·유적지/공원/레포츠/유적지)
- 카테고리별 색상 원형 아이콘 (관광지: 주황, 문화시설: 인디고, 공연시설: 핑크, 박물관: 보라, 공원: 초록, 레포츠: 노랑)
- 시설 클릭 시 **사진 + 상세 정보 팝업** (한국관광공사 이미지)
- 시설별 **즐겨찾기** (하트 버튼, localStorage 저장)
- 밀집도 히트맵 / K-means 군집분석 토글
- 지하철 19개 노선 필터 + 역 핀 표시
- 자치구 경계선 GeoJSON 오버레이
- 자치구 목록 패널 (5대 권역별 필터: 도심/동북/서북/서남/동남)

### 2. Analytics — 지도 위 데이터 분석

4가지 분석 모드를 지도 위에 직접 시각화:

- **군집분석** — K-means 클러스터별 색상 마커 + 범례
- **권역별** — 서울 5대 권역 색상 분류 + 권역별 시설 요약 카드
- **카테고리 밀도** — 선택 카테고리의 시설 수에 따라 마커 색상/크기 변화 (히트맵)
- **지하철 접근성** — 자치구별 반경 1.5km 내 지하철역 수 시각화 + Top 10 랭킹

사이드바: 자치구 비교 레이더 차트 + 전체 카테고리 분포 파이 차트

### 3. Course — 관광 목적별 코스 추천

5가지 관광 목적 선택 → 맞춤 자치구 Top 5 지도 표시:

- **공연 중심** — 공연시설 + 문화시설 밀집 지역
- **자연 힐링** — 공원 + 레포츠 중심
- **역사 탐방** — 박물관/유적지 + 관광지
- **액티비티** — 레포츠 + 공원
- **문화 예술** — 문화시설 + 공연시설 + 관광지

자치구 선택 후 **AI 코스 추천** (OpenAI 연동, fallback 지원)

### 4. Favorites — 즐겨찾기 관리

- Culture Map에서 저장한 시설이 **지도 위 하트 마커**로 표시
- 클릭 시 해당 위치로 지도 이동 (flyTo)
- 시설 객체(이름, 좌표, 카테고리, 자치구) localStorage 영구 저장

---

## 데이터 소스

| 소스 | 데이터 | 건수 |
|------|--------|------|
| **서울 열린데이터광장** | 문화공간 (공연장, 미술관, 도서관 등) | ~1,039 |
| **서울 열린데이터광장** | 공원 정보 | ~133 |
| **서울 열린데이터광장** | 지하철역 마스터 | ~700+ |
| **한국관광공사 Tour API** | 관광지, 문화시설, 공연, 레포츠 (+이미지) | ~1,200 |
| **학술제 CSV** | 자치구별 시설 집계 (seed data) | 25구 |

총 **2,500+ 개별 시설**, 이 중 **1,177개 시설에 사진** 포함

---

## 기술 스택

### Backend

| 기술 | 용도 |
|------|------|
| **FastAPI** | REST API 서버 |
| **SQLAlchemy** | ORM |
| **SQLite** | 데이터베이스 |
| **scikit-learn** | K-means 군집분석 |
| **OpenAI API** | AI 코스 추천 (선택) |
| **httpx** | 외부 API 비동기 호출 |

### Frontend

| 기술 | 용도 |
|------|------|
| **React 19** | UI 프레임워크 |
| **Vite** | 빌드 도구 |
| **Tailwind CSS v4** | 스타일링 (글래스모피즘 UI) |
| **Leaflet / React-Leaflet** | 인터랙티브 지도 |
| **Recharts** | 차트 (레이더, 파이, 바) |
| **Axios** | API 통신 |

### Infra

| 기술 | 용도 |
|------|------|
| **Render** | 백엔드 배포 |
| **Vercel** | 프론트엔드 배포 |

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/facilities/stats` | 전체 통계 (카테고리별 시설 수) |
| GET | `/api/facilities/districts` | 자치구별 시설 분포 |
| GET | `/api/facilities/districts/{name}` | 자치구 상세 |
| GET | `/api/facilities/search?q=` | 시설 검색 |
| GET | `/api/places?district=&category=&limit=` | 개별 시설 목록 (이미지 포함) |
| GET | `/api/places/{id}` | 시설 상세 |
| GET | `/api/subway` | 전체 지하철역 |
| GET | `/api/subway/nearest?lat=&lng=` | 최근접 역 |
| GET | `/api/clusters` | K-means 군집분석 결과 |
| GET | `/api/recommend?district=&lang=` | AI 코스 추천 |
| POST | `/api/sync` | 공공데이터 API 수동 동기화 |

---

## 프로젝트 구조

```
seoul-culture-map/
├── README.md
├── DEVLOG.md
├── .gitignore
│
├── backend/
│   ├── requirements.txt
│   ├── .env                  # API 키 (TOUR_API_KEY, SEOUL_DATA_API_KEY 등)
│   └── app/
│       ├── main.py           # FastAPI 앱 + lifespan
│       ├── config.py         # 환경변수 설정
│       ├── database.py       # SQLAlchemy 엔진
│       ├── models/
│       │   ├── facility.py   # 자치구별 집계 모델
│       │   ├── place.py      # 개별 시설 모델 (좌표, 이미지)
│       │   └── subway.py     # 지하철역 모델
│       ├── schemas/
│       │   └── facility.py   # Pydantic 응답 스키마
│       ├── services/
│       │   ├── data_loader.py    # CSV seed
│       │   ├── clustering.py     # K-means
│       │   ├── seoul_api.py      # 서울 공공데이터 API
│       │   └── tour_api.py       # 한국관광공사 API
│       └── routers/
│           ├── facility.py   # 시설/통계/지하철 라우터
│           └── recommend.py  # AI 추천 라우터
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js        # 포트 5173, 프록시 → :8000
│   └── src/
│       ├── App.jsx           # 라우터 (/, /analytics, /course, /favorites)
│       ├── main.jsx
│       ├── api/
│       │   └── client.js     # API 함수 + mock fallback
│       ├── hooks/
│       │   └── useFavorites.js   # 즐겨찾기 (localStorage v2)
│       ├── components/
│       │   ├── SeoulMap.jsx      # 메인 지도 (마커, 히트맵, 팝업)
│       │   ├── CategoryFilter.jsx
│       │   ├── SubwayFilter.jsx
│       │   ├── DistrictList.jsx  # 5대 권역 필터
│       │   ├── DistrictPopup.jsx
│       │   ├── StatCards.jsx
│       │   ├── Navbar.jsx
│       │   ├── RangeSlider.jsx
│       │   ├── FavoritesPanel.jsx
│       │   └── AiMascot.jsx
│       └── pages/
│           ├── Dashboard.jsx     # Culture Map 페이지
│           ├── AnalyticsPage.jsx # 4모드 분석 (지도 위)
│           ├── CoursePage.jsx    # 목적별 코스 추천
│           └── FavoritesPage.jsx # 즐겨찾기 (지도 + 패널)
│
└── data/                     # 원본 CSV 데이터
```

---

## 빠른 시작

### 환경변수 설정

```bash
# backend/.env
SEOUL_DATA_API_KEY=your_seoul_api_key
TOUR_API_KEY=your_tour_api_key
OPENAI_API_KEY=your_openai_key    # 선택 (AI 추천용)
```

### Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

### 데이터 동기화 (최신 공공데이터 반영)

```bash
curl -X POST http://localhost:8000/api/sync
```

---

## 포트 배정

| 프로젝트 | 프론트엔드 | 백엔드 |
|----------|-----------|--------|
| seoul-culture-map | `:5173` | `:8000` |
| crypto-volatility-dashboard | `:5174` | `:8001` |
| portfolio | `:5175` | — |

---

## 개발자

**윤경은 (Yoon Gyeongeun)**
- 학술제 팀 프로젝트 참여 → 개인 프로젝트로 확장
- GitHub: [@ykgstar37-lab](https://github.com/ykgstar37-lab)
