# React Native 전환 갭 분석표

작성일: 2026-05-14
대상: 현재 Vite + React(Web) 프로젝트를 React Native(권장: Expo)로 이관

## 1) 요약 판정

- 전환 가능 여부: 가능
- 전환 방식: 점진 이관(공통 로직 분리 + UI/라우팅 재구성)
- 예상 난이도: 중간~높음

## 2) 파일별 분류

| 구분 | 파일 | 상태 | 이유 | 권장 조치 |
|---|---|---|---|---|
| 엔트리 | src/index.jsx | 재작성 | react-dom, document 사용 | RN 엔트리(App.tsx)로 교체 |
| 앱 셸/라우팅 | src/App.jsx | 재작성(핵심) | BrowserRouter/Routes, window/navigator API 사용 | React Navigation 기반으로 재구성 |
| Firebase 초기화 | src/firebase.js | 부분 수정 | import.meta.env, window.location, IndexedDB persistence 분기 필요 | RN 환경변수/플랫폼 분기 처리 |
| 데이터 서비스 | src/services/firebaseService.js | 재사용 가능(거의 그대로) | Firestore CRUD 중심, DOM 의존 없음 | 공통 모듈로 추출 후 그대로 사용 |
| 이미지 처리 | src/utils/imageUpload.js | 재작성 | FileReader/Image/canvas/document API 사용 | expo-image-picker + expo-image-manipulator로 대체 |
| 목록/상세 UI | src/MoviesList.jsx 외 화면들 | 재작성 | HTML/Tailwind className 기반 | RN 컴포넌트 + StyleSheet/NativeWind |
| 웹 스타일 | src/index.css, tailwind.config.js, postcss.config.js | 대체 필요 | 웹 CSS 파이프라인 전용 | RN 스타일 시스템으로 전환 |
| 라우팅 패키지 | react-router-dom | 대체 필요 | 웹 라우터 | @react-navigation/native 계열로 교체 |
| 웹 번들러 | vite, @vitejs/plugin-react | 대체 필요 | 웹 번들러 | Expo/Metro 사용 |
| 배포(웹) | firebase hosting 관련 설정 | 유지(웹용), RN과 분리 | RN 배포와 경로 다름 | 웹/모바일 배포 파이프라인 분리 |

참고: "src/MoviesList.jsx 외 화면들"은 아래 파일들을 의미

- src/MoviesList.jsx
- src/MovieDetail.jsx
- src/BooksList.jsx
- src/BookDetail.jsx
- src/MusicList.jsx
- src/MusicDetail.jsx
- src/SeriesList.jsx
- src/SeriesDetail.jsx
- src/SharePage.jsx
- src/ShareDetailPage.jsx
- src/components/ManualAddModal.jsx

## 3) 우선순위 전환 계획

### Phase 0. 기반 세팅

1. Expo 프로젝트 생성
2. 네비게이션/상태/환경변수 기본 세팅
3. Firebase RN 방식 초기화 확정

완료 기준

- 앱 실행 및 기본 스택 네비게이션 동작
- Firebase 연결 테스트 성공

### Phase 1. 공통 로직 이관

1. 아래 파일을 공통 모듈로 우선 이관
   - src/services/firebaseService.js
2. firebase 초기화 코드(RN 분기) 정리
   - src/firebase.js 기반으로 RN-safe 버전 작성

완료 기준

- RN에서 CRUD(create/read/update/delete) 동작

### Phase 2. 인증/라우팅/핵심 화면

1. 로그인 플로우 이관(웹 popup/redirect 제거)
2. 탭/스택 라우팅 이관
3. 목록 + 상세 화면부터 순차 이관

완료 기준

- 로그인 후 목록/상세 진입 가능

### Phase 3. 공유/이미지/마감

1. 공유 기능을 RN Share API로 대체
2. 이미지 업로드/리사이즈 로직 교체
3. 에러/권한/오프라인 테스트

완료 기준

- 기존 핵심 기능 parity 달성

## 4) 리스크 체크리스트

- Google 로그인 구현체 선택(Expo AuthSession vs 네이티브 SDK)
- Firestore 오프라인 전략(웹 IndexedDB와 RN 구현 차이)
- 이미지 처리 성능(대용량 이미지)
- 웹 공유 링크 흐름(딥링크 정책 재정의 필요)

## 5) 권장 패키지(Expo 기준)

- @react-navigation/native
- @react-navigation/native-stack
- react-native-screens
- react-native-safe-area-context
- expo-constants 또는 react-native-config(환경변수)
- expo-image-picker
- expo-image-manipulator
- @react-native-clipboard/clipboard(필요 시)

## 6) 즉시 실행 가능한 다음 작업

1. RN 신규 앱 스캐폴딩
2. firebaseService 공통 모듈 추출
3. App 라우팅 뼈대 + 로그인 화면 최소 구현
