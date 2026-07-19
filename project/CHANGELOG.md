# 퍼스트물류 프로젝트 CHANGELOG

> 이 문서는 완료된 작업만 기록한다.
> 진행 중인 작업은 TODO.md에서 관리한다.
> 프로젝트 기준은 MASTER.md를 따른다.

Last Update : 2026-07-14
Version : 1.0

# 2026-07-19

## WEBSITE

- [ADD] `/bike/index.html` 바이크탁송 전용 랜딩페이지 제작
- [ADD] 실제 바이크 운송 사진 20장을 사용한 반응형 슬라이드 갤러리 구성
- [ADD] 일반·고가·신차·중고거래·장거리 바이크 운송 서비스 안내
- [ADD] 전화·카카오톡·사진 첨부 견적문의 CTA 연결

## SEO

- [ADD] `/bike/` 전용 title, description, heading, OG, canonical 및 구조화 데이터 구성
- [ADD] sitemap.xml에 `/bike/` URL 등록

## ADS

- [KEEP] 기존 GA4 및 Naver Analytics 추적 코드 유지
- [ADD] `/bike/` 진입 시 `bike_page_view` 이벤트 전송

---

# CHANGELOG 작성 원칙

## 기록 대상

다음 작업이 완료되면 반드시 CHANGELOG.md에 기록한다.

- 홈페이지 기능 추가
- 홈페이지 수정
- SEO 변경
- 광고 설정 변경
- GitHub 구조 변경
- Netlify 설정 변경
- 프로젝트 문서 변경
- 버그 수정
- 신규 기능 개발

---

## 기록하지 않는 내용

다음 내용은 기록하지 않는다.

- 아이디어
- 계획
- 진행 예정 작업
- 심사 대기
- 미완료 작업

위 내용은 TODO.md에서 관리한다.

---

## 기록 형식

모든 작업은 아래 형식을 따른다.

```text
YYYY-MM-DD

[분류]

- 작업 내용
```

분류는 아래 중 하나를 사용한다.

- PROJECT
- WEBSITE
- SEO
- ADS
- GITHUB
- NETLIFY
- DOCUMENT
- FEATURE
- BUG

---

# 2026-07-14

## PROJECT

- [ADD] project 폴더 생성
- [ADD] MASTER.md 생성
- [ADD] TODO.md 생성
- [ADD] CHANGELOG.md 생성
- [ADD] 프로젝트 문서 관리 시스템 구축

---

## WEBSITE

- [DONE] GitHub 저장소 연결 완료
- [DONE] Netlify 자동 배포 연결 완료
- [DONE] firstlogis.co.kr 연결 완료
- [DONE] www 리다이렉트 완료
- [DONE] 퍼스트물류.kr → firstlogis.co.kr 301 리다이렉트 완료
- [DONE] 바이크탁송.shop → firstlogis.co.kr 301 리다이렉트 완료

---

## SEO

- [DONE] sitemap.xml 생성
- [DONE] robots.txt 생성
- [DONE] 네이버 사이트 소유 확인 완료
- [DONE] 네이버 사이트맵 제출 완료
- [PROGRESS] Google Search Console 등록 진행

---

## DOCUMENT

- [ADD] MASTER.md 작성
- [ADD] TODO.md 작성
- [ADD] CHANGELOG.md 작성

---

# 2026-07-19

## ADS

- [ADD] GA4 측정 ID `G-6EL5B8HR0W`를 공개 콘텐츠 페이지에 Google tag 방식으로 설치
- [ADD] 네이버 애널리틱스 ID `17b223d15bdab20`을 공개 콘텐츠 페이지에 설치
- [ADD] 전화, 카카오톡, 견적문의 시작·제출·완료 전환 이벤트 추가
- [ADD] 실제 고객 동작을 막지 않는 메모리 기반 1.5초 중복 이벤트 방지 처리
- [KEEP] 기존 SEO 메타데이터, Netlify Forms 구조 및 301 리다이렉트 유지
- [STATUS] GitHub Push 및 Netlify 운영 배포하지 않음

---

## FEATURE

- [UPDATE] `transport-quote`, `transport-quote-popup` 필수 입력 설정 일치
- [UPDATE] 연락처 숫자 길이 8~12자리 기본 검증 및 입력 편의 속성 적용
- [UPDATE] Netlify Forms 호환 방식으로 사진 첨부 필드를 폼당 최대 3개로 확장
- [UPDATE] JPG·PNG·WEBP 파일 형식 로컬 검증 및 접근 가능한 오류 안내 추가
- [ADD] 개인정보를 포함하지 않는 `FL-YYYYMMDD-HHMMSS-XXXX` 형식의 `quote_id` 생성
- [ADD] 정상 제출 시 해당 폼 버튼 중복 클릭 방지 및 bfcache 복원 처리
- [UPDATE] 고유 input id와 label 연결, 모달 첫 입력 포커스 및 닫기 후 포커스 복귀

## TEST

- [DONE] JavaScript 문법 검사
- [DONE] 중복 id, label 연결, form-name 일치 및 필수 필드 정적 검사
- [DONE] EmailJS, fetch, FormData, API 키 및 이메일 주소 미추가 확인
- [DONE] Live Server에서 필수값, 짧은 연락처, 사진 1장·3장, 개인정보 미동의 검증 확인
- [DONE] 정상 제출 시 `/thanks.html` POST 이동 및 정적 Live Server의 예상된 HTTP 405 응답 확인
- [PENDING] Netlify Forms 실제 접수, 사진 업로드 및 이메일 알림은 배포 후 확인 필요

## NETLIFY

- [KEEP] 기존 Netlify Forms 이름, hidden form-name, POST, action, honeypot 및 multipart 설정 유지
- [KEEP] 관리자 이메일은 코드에 추가하지 않고 Netlify 대시보드 알림 설정 방식 유지
- [STATUS] GitHub Push 및 Netlify 배포 전

---

# 작업 완료 절차

작업이 완료되면 반드시 아래 순서를 따른다.

1. 기능 테스트 완료
2. TODO.md 상태 변경
3. CHANGELOG.md 기록
4. Git 커밋
5. GitHub Push
6. Netlify 자동 배포 확인
7. 홈페이지 최종 확인

---

# AI 작업 원칙

ChatGPT 또는 Codex는 작업 완료 후 반드시 다음을 수행한다.

- CHANGELOG.md를 업데이트한다.
- 변경된 파일을 알려준다.
- 변경 이유를 설명한다.
- 테스트 방법을 안내한다.
- 적절한 커밋 메시지를 제안한다.

---

# 수정 이력

## v1.0 (2026-07-14)

- CHANGELOG.md 최초 작성
- 프로젝트 기록 규칙 수립
- 작업 완료 절차 추가
- AI 작업 규칙 추가
## v1.1 (2026-07-18)

### 카카오 비즈채널 상담 기능 연결

#### 변경 내용
- 카카오 비즈채널 공식 URL 연결
  - https://pf.kakao.com/_xdTxhfX
- config.js에서 카카오 URL 중앙 관리 적용
- PC 우측 고정 카카오 상담 버튼 연결
- 모바일 하단 고정 카카오 상담 버튼 연결
- 홈페이지 카카오 CTA가 공통 설정(config.js)을 사용하도록 수정
- 준비 중 토스트 문구 제거

#### 테스트
- Live Server(127.0.0.1:5500)에서 로컬 테스트 완료
- 카카오 상담 버튼 정상 동작 확인
- 기존 전화 문의 버튼 정상 동작 확인
- 견적 문의 기능 정상 유지

#### 수정 파일
- index.html
- css/style.css
- js/app.js
- js/config.js

#### 상태
- 로컬 테스트 완료
- GitHub 배포 전
