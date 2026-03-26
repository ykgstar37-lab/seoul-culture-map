# DEVLOG — Seoul Culture Map

> 개발 진행 로그. 각 단계별 구현 내용과 기술적 의사결정을 기록합니다.

---

## v0.1.0 — Initial Setup (작업 중)

**프로젝트 초기 셋업 및 MVP**

### Backend
- FastAPI REST API 서버 구축
- SQLAlchemy + SQLite 데이터 저장소
- 학술제 CSV 데이터 → DB 마이그레이션
- 6개 카테고리 시설 데이터 API 서빙
- 자치구별 통계 API

### Frontend
- React + Vite + Tailwind CSS 기반 SPA
- Leaflet 인터랙티브 서울시 지도
- 6개 카테고리 필터 사이드바
- 자치구별 통계 카드
- 시설 목록 패널

### 인프라
- 데이터: 학술제 CSV → SQLite
- API: FastAPI (Render 배포 대상)
- 프론트: Vite dev proxy `/api` → `localhost:8000`
