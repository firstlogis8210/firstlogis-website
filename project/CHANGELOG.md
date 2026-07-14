# 퍼스트물류 프로젝트 CHANGELOG

> 이 문서는 완료된 작업만 기록한다.
> 진행 중인 작업은 TODO.md에서 관리한다.
> 프로젝트 기준은 MASTER.md를 따른다.

Last Update : 2026-07-14
Version : 1.0

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
