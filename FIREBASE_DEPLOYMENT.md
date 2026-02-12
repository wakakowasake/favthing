# Firebase 배포 가이드

## 1. Firebase CLI 설치

```bash
npm install -g firebase-tools
```

## 2. Firebase 로그인

```bash
firebase login
```

## 3. 프로젝트 초기화 (이미 완료됨)

Firebase 콘솔에서 생성한 프로젝트와 연결:
- Project ID: `favthing-cb626`
- Hosting Site: `favthing`

## 4. Firestore 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
```

이 명령어는 `firestore.rules` 파일을 배포합니다.

## 5. 인덱스 배포 (필요시)

```bash
firebase deploy --only firestore:indexes
```

복합 쿼리를 위한 인덱스를 배포합니다.

## 6. 프론트엔드 빌드 및 배포

### 6.1 개발 서버 실행
```bash
npm run dev
```

### 6.2 프로덕션 빌드
```bash
npm run build
```

### 6.3 Firebase Hosting 배포
```bash
firebase deploy --only hosting
```

또는 전체 배포:
```bash
firebase deploy
```

## 7. 배포 확인

```bash
firebase hosting:list
```

또는 브라우저에서 확인:
- https://favthing.web.app
- https://favthing.firebaseapp.com

## 📋 완전한 배포 프로세스

```bash
# 1. 로그인
firebase login

# 2. 프로젝트 선택 (초기 설정 시)
firebase projects:list
firebase use favthing-cb626

# 3. 보안 규칙 배포
firebase deploy --only firestore:rules

# 4. 프론트엔드 빌드
npm run build

# 5. 전체 배포
firebase deploy
```

## 🔒 보안 규칙 테스트 (로컬)

에뮬레이터를 사용하여 규칙 테스트:

```bash
# 에뮬레이터 실행
firebase emulators:start

# 다른 터미널에서 앱 실행
npm run dev
```

## ⚠️ 주의사항

1. **Firebase 키**: 현재 프론트엔드에 하드코딩되어 있으나 public 키이므로 문제없음
2. **백엔드 Secret**: `server/.env`에만 저장 (GitHub에 업로드하지 않기)
3. **Firestore 규칙**: 모든 쓰기 작업에서 `userId` 필드를 필수로 확인
4. **인덱스**: 복합 쿼리 시 자동으로 생성되거나 수동 추가 가능

## 🚀 지속적 배포 (CI/CD - 선택사항)

GitHub Actions를 사용한 자동 배포 설정 가능:
- `.github/workflows/deploy.yml` 생성
- 테스트 통과 후 자동 배포

더 자세한 내용: https://firebase.google.com/docs/hosting/github-integration
