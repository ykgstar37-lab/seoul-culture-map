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
| 데이터 | CSV 정적 데이터 | API + DB 서빙 |
| 시각화 | ggplot2 정적 차트 | Leaflet 인터랙티브 맵 |
| 결과 | PDF 보고서 | React 대시보드 |
| 배포 | 로컬 실행 | Render + Vercel 클라우드 |

---

## 핵심 기능

### 1. 인터랙티브 서울 문화시설 맵
Leaflet 기반 서울시 25개 자치구 지도에 6개 카테고리 문화시설을 마커로 표시합니다.

### 2. 6개 카테고리 필터
- 영화관 / 공연시설 / 박물관·유적지 / 방탈출 / 공원 / 전통사찰
- 카테고리별 토글로 지도 마커 필터링

### 3. 자치구별 통계 대시보드
- 총 시설 수, 카테고리별 시설 수 통계 카드
- 자치구별 시설 밀집도 시각화

### 4. 자치구 시설 목록
- 자치구 클릭 시 해당 지역 시설 목록 카드 표시
- 카테고리별 아이콘 + 시설 수 정보

### 5. 검색 기능
- 자치구명 / 시설 유형으로 검색
- 검색 결과 지도 위치 이동

### 6. 밀집도 히트맵
- 카테고리별 시설 밀집도를 히트맵으로 시각화

---

## 기술 스택

### Backend
| 기술 | 용도 |
|------|------|
| **FastAPI** | REST API 서버 |
| **SQLAlchemy** | ORM (SQLite) |
| **pandas** | 데이터 처리 |

### Frontend
| 기술 | 용도 |
|------|------|
| **React 19** | UI 프레임워크 |
| **Vite** | 빌드 도구 |
| **Tailwind CSS v4** | 스타일링 |
| **Leaflet** | 인터랙티브 지도 |
| **React-Leaflet** | React 래퍼 |
| **Recharts** | 차트 시각화 |

### Infra
| 기술 | 용도 |
|------|------|
| **Render** | 백엔드 배포 |
| **Vercel** | 프론트엔드 배포 |
| **SQLite** | 데이터베이스 |

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
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/
│       ├── schemas/
│       ├── services/
│       └── routers/
│
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── api/
│       ├── components/
│       └── pages/
│
└── data/                # 원본 CSV 데이터
```

---

## 빠른 시작

### Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 개발자

**윤경은 (Yoon Gyeongeun)**
- 학술제 팀 프로젝트 참여 → 개인 프로젝트로 확장
- GitHub: [@ykgstar37-lab](https://github.com/ykgstar37-lab)
