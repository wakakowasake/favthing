# FAV-THING Mobile (Expo)

현재 웹 프로젝트를 기준으로 React Native 앱 골격과 핵심 기능을 이관한 모바일 앱입니다.

## 포함된 기능

- Firebase 인증(기본: 익명 로그인)
- Google 로그인(클라이언트 ID 설정 시 활성화)
- 영화/도서/음악/시리즈 목록 조회
- KMDB/TMDB/Naver/Melona 검색 후 항목 추가
- 항목 수동 추가(이미지 선택 포함)
- 항목 상세 보기/평점/코멘트 수정
- 항목 삭제
- 공유 userId 텍스트 공유
- 공유 읽기 전용 API 조회 탭

## 실행 방법

1. 환경변수 준비

```bash
cp .env.example .env
```

`.env`에 Firebase 값(EXPO_PUBLIC_FIREBASE_*)을 입력합니다.
Google 로그인을 쓰려면 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`를 함께 입력합니다.

2. 의존성 설치

```bash
npm install
```

3. 실행

```bash
npm run start
```

Expo QR로 iOS/Android에서 실행하거나 시뮬레이터를 사용하세요.

## 폴더 구조

```text
mobile/
  App.js
  index.js
  src/
    config/
    lib/
    navigation/
    screens/
    services/
    theme/
    utils/
```

## 주의사항

- Google OAuth 클라이언트 ID가 비어 있으면 익명 로그인 fallback만 동작합니다.
- 공유 조회 탭은 Cloud Functions API 엔드포인트를 사용합니다.
- 에뮬레이터 사용 시 `.env`에서 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`로 설정하세요.
