# 백엔드 + 프론트엔드 배포 가이드

## 프로젝트 구조

```
fav/
├── src/                 (React 프론트엔드)
├── server/              (Express 백엔드)
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── .env.example
├── .env.local
├── .env.example
├── vite.config.js
├── package.json
└── firebase.json
```

---

## 로컬 개발 환경 설정

### 1. 백엔드 설정

```bash
# 백엔드 폴더로 이동
cd server

# 의존성 설치
npm install

# .env 파일 생성
cp .env.example .env
```

**server/.env 파일 작성:**
```env
PORT=5000
NODE_ENV=development

NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret  # ✅ Secret은 여기서만 관리

CLIENT_URL=http://localhost:3000
```

### 2. 프론트엔드 설정

```bash
# 프로젝트 루트로 이동
cd ..

# 의존성 설치
npm install

# .env.local 파일 생성
cp .env.example .env.local
```

**프로젝트 루트/.env.local 파일 작성:**
```env
VITE_NAVER_CLIENT_ID=your_naver_client_id
# Secret은 제거됨! ✅

VITE_API_URL=http://localhost:5000

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. 로컬에서 실행

**터미널 1: 백엔드 시작**
```bash
cd server
npm run dev
# → Server running on http://localhost:5000
```

**터미널 2: 프론트엔드 시작**
```bash
npm run dev
# → Vite server running at http://localhost:3000
```

---

## 프로덕션 배포

### 옵션 1: Railway (추천) 🌟

#### Step 1: Firebase Hosting에 프론트엔드 배포

```bash
# 빌드
npm run build

# Firebase 배포
firebase deploy --only hosting
```

#### Step 2: Railway에 백엔드 배포

1. **Railway 가입**: https://railway.app/
2. **GitHub 연결**: Railway 계정에 GitHub 연동
3. **프로젝트 생성**:
   - "New Project" → "Deploy from GitHub"
   - 이 레포지토리 선택
4. **환경변수 설정**:
   - Railway 대시보드 → Variables
   ```
   PORT=5000
   NODE_ENV=production
   NAVER_CLIENT_ID=your_id
   NAVER_CLIENT_SECRET=your_secret  # ✅ 안전하게 저장됨
   CLIENT_URL=https://favthing.web.app
   ```
5. **Root Directory 설정**:
   - Settings → Root Directory → `server`
6. **Main File**:
   - Settings → Tool → Node → startup command → `npm start`

**Railway 배포 후:**
- 백엔드 URL: `https://your-app-name.up.railway.app`
- 이 URL을 프론트엔드의 VITE_API_URL로 설정

#### Step 3: 프로덕션 환경변수 업데이트

**Firebase 호스팅 환경변수 (프론트엔드)**:
```bash
# firebase.json에 환경변수 설정
firebase functions:config:set env.api_url="https://your-backend.up.railway.app"
firebase deploy
```

또는 프론트엔드 `.env.production`:
```
VITE_API_URL=https://your-backend.up.railway.app
```

---

### 옵션 2: Heroku (무료 플랜 종료됨, 유료만 가능)

```bash
# Heroku CLI 설치 후
heroku login
heroku create your-app-name

# .git 설정
git remote add heroku https://git.heroku.com/your-app-name.git

# Procfile 생성 (server 폴더에)
echo "web: node server.js" > server/Procfile

# 환경변수 설정
heroku config:set NAVER_CLIENT_SECRET=your_secret
heroku config:set CLIENT_URL=https://favthing.web.app

# 배포
git push heroku main
```

---

### 옵션 3: AWS/Azure/GCP

유사한 방식으로 환경변수 설정 후 배포 가능

---

## 보안 체크리스트 ✅

| 항목 | 프론트엔드 | 백엔드 | 상태 |
|------|-----------|--------|------|
| Naver Secret | ❌ 포함 금지 | ✅ 필수 | ✓ |
| API 키 | 공개 가능 | 숨김 | ✓ |
| .env.local | Git 무시 | Git 무시 | ✓ |
| CORS 설정 | - | 백엔드에서만 | ✓ |

---

## 주의사항

### 프론트엔드 배포 시
```diff
- ❌ VITE_NAVER_CLIENT_SECRET 절대 포함 금지
+ ✅ VITE_API_URL = 백엔드 URL로 설정
```

### 백엔드 배포 시
```diff
- ❌ .env 파일 공개 금지
+ ✅ 호스팅 플랫폼 환경변수로 관리
```

---

## 배포 후 테스트

1. **프론트엔드**: https://favthing.web.app
2. **백엔드**: https://your-backend.up.railway.app/health
   ```json
   { "status": "OK", "timestamp": "..." }
   ```
3. **책 검색 테스트**: 북 탭에서 책 추가 버튼 클릭 → 검색

---

## 문제 해결

### CORS 에러
- Railway 백엔드 URL이 `CLIENT_URL`에 올바르게 설정되었는지 확인
- firebase.json 또는 프론트엔드 환경변수의 `VITE_API_URL` 확인

### Naver 검색 실패
- 백엔드 환경변수에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정 확인
- Railway 대시보드에서 로그 확인

### Firebase 데이터 미동기화
- Firebase 환경변수 정상 설정 확인
- Firestore 보안 규칙 점검

---

## 프로덕션 클린 배포

한 번에 모두 배포하기:

```bash
# 1. 프론트엔드 빌드 및 배포
npm run build
firebase deploy --only hosting

# 2. 변경사항 커밋
git add .
git commit -m "prod: update API url"
git push origin main

# 3. Railway가 자동으로 감지하여 백엔드 배포
# (GitHub 연동 시 자동 배포)
```
