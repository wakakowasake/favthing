# FAV-THING 🎬📚🎵

내 관심 분야들을 한 곳에 모은 개인 포트폴리오 웹사이트입니다.
영화, 책, 음악, 애니메이션을 관리하고 공유할 수 있습니다.

## 🚀 기술 스택

- **프론트엔드**: React 18, Vite, Tailwind CSS
- **백엔드**: Express.js (Node.js)
- **데이터베이스**: Firebase Firestore
- **API**: Naver Search API (책 검색 - 백엔드에서 프록시)
- **배포**: Firebase Hosting (프론트) + Railway (백엔드)

## ⚙️ 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-username/favthing.git
cd favthing
```

### 2. 백엔드 설정

```bash
cd server
npm install
cp .env.example .env
```

**server/.env 파일 작성:**
```env
PORT=5000
NODE_ENV=development

# Naver API (Secret을 백엔드에서만 관리)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# CORS 설정
CLIENT_URL=http://localhost:3000

# Firebase Configuration (서버에서 동적으로 제공)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# 클라이언트에서 백엔드 API URL
CLIENT_API_URL=http://localhost:5000
```

백엔드 실행:
```bash
npm run dev
# → Server running on http://localhost:5000
```

### 3. 프론트엔드 설정

```bash
# 프로젝트 루트로 이동
cd ..
npm install
```

**프론트엔드 실행:**
```bash
npm run dev
# → Vue.js + Vite App running on http://localhost:3000
```

#### Firebase 설정
1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. 웹앱 추가
3. `server/.env`의 Firebase 설정값 입력

#### Naver API 설정
1. [Naver Developers](https://developers.naver.com/)에 접속
2. 애플리케이션 등록 (검색 API 권한 필요)
3. Client ID와 Client Secret을 `server/.env`에 입력

### 4. 개발 서버 실행

**터미널 1: 백엔드 (5000 포트)**
```bash
cd server
npm run dev
```

**터미널 2: 프론트엔드 (3000 포트)**
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열기

---

## 🔄 Firebase 동적 가져오기

앱 시작 시 백엔드에서 Firebase 설정을 동적으로 로드합니다:

```
클라이언트 시작
  ↓
GET /api/config (백엔드 요청)
  ↓
Firebase 설정 JSON 반환
  ↓
Firebase 초기화
  ↓
로그인 화면 표시
```

**장점:**
- Firebase 설정을 중앙 집중식으로 관리
- 프로덕션 배포 시 쉽게 설정 변경 가능
- 환경별 설정 분리 (개발/프로덕션)
- 더 이상 프론트엔드에 하드코딩 필요 없음

## 📁 폴더 구조

```
fav/
├── src/                          (React 프론트엔드 - Vite)
│   ├── App.jsx                   (메인 앱, Google 인증)
│   ├── BooksList.jsx             (책 관리 + Naver 검색)
│   ├── MoviesList.jsx            (영화 관리)
│   ├── MusicList.jsx             (음악 관리)
│   ├── AnimeList.jsx             (애니 관리)
│   ├── services/
│   │   └── firebaseService.js    (Firestore CRUD)
│   ├── firebase.js               (Firebase 동적 초기화)
│   ├── index.jsx
│   └── index.css                 (Tailwind CSS)
├── server/                       (Express 백엔드)
│   ├── routes/
│   │   └── naver.js              (Naver 검색 API 프록시)
│   ├── server.js
│   ├── package.json
│   ├── .env                      (로컬용 - Git 무시함)
│   └── .env.example              (템플릿)
├── firebase.json                 (Firestore, Hosting, Emulator 설정)
├── firestore.rules               (Firestore 보안 규칙)
├── firestore.indexes.json        (Firestore 인덱스)
├── .gitignore                    (Git 무시 파일)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── FIREBASE_DEPLOYMENT.md        (배포 가이드)
├── README.md
└── SECURITY.md


## ⚡ 주요 기능

- ✅ 영화, 책, 음악, 애니메이션 관리
- 🔍 Naver API를 통한 책 검색 (백엔드 프록시)
- 💾 Firebase Firestore에 데이터 저장
- 🔐 API Secret을 백엔드에서 안전하게 관리
- 📱 반응형 디자인

## 🔒 보안 구조

```
클라이언트 (안전함)
  ├── VITE_NAVER_CLIENT_ID ✅
  ├── Firebase Config (Public Key) ✅
  └── VITE_API_URL (백엔드 URL) ✅

백엔드 (안전함)
  └── NAVER_CLIENT_SECRET ✅ (노출 안 됨)

Firestore (userId 격리)
  ├── books (userId 기반 필터링) ✅
  ├── movies (userId 기반 필터링) ✅
  ├── music (userId 기반 필터링) ✅
  └── anime (userId 기반 필터링) ✅
```

### Firestore 보안 규칙

모든 데이터는 `userId`로 격리되어 있습니다.

```javascript
// firestore.rules 일부
match /books/{document=**} {
  allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

**특징:**
- ✅ 인증된 사용자만 접근 가능
- ✅ 자신의 데이터만 읽기/쓰기 가능
- ✅ 다른 사용자의 데이터 접근 불가능
- ✅ 자동 타임스탬프 추가

자세한 내용은 [SECURITY.md](SECURITY.md)를 참고하세요.

## 🚀 배포

상세한 배포 가이드는 [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md)를 참고하세요.

### 빠른 배포

```bash
# 1. Firestore 보안 규칙 배포
firebase deploy --only firestore:rules

# 2. 프론트엔드 빌드 및 배포
npm run build
firebase deploy --only hosting

# 3. 백엔드는 GitHub 연동 (Railway)
git push origin main  # 자동 배포
```

## 📝 라이선스

MIT

## 👤 작성자

Ji-Hyung
