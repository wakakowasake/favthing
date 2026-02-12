# API 蹂댁븞 媛?대뱶

## ?꾩옱 蹂댁븞 援ъ“ ??

### 1. Naver API - 諛깆뿏???꾨줉?쒕줈 ?꾨꼍 蹂댄샇

**援ъ“:**
```
?대씪?댁뼵??(?꾨줎?몄뿏??
  ??VITE_NAVER_CLIENT_ID (PUBLIC)
諛깆뿏???쒕쾭 (Express)
  ??NAVER_CLIENT_SECRET (PRIVATE)
Naver API
```

**援ы쁽:**
- `server/routes/naver.js`: `/api/naver/search/book` ?붾뱶?ъ씤??
- Client Secret? `server/.env`?먮쭔 ???
- ?대씪?댁뼵?몃뒗 Client ID留??뚯쓬 (PUBLIC)
- ?꾨줈?뺤뀡 鍮뚮뱶??Secret???ы븿?섏? ?딆쓬

**?뚯씪:**
```
server/
?쒋?? .env (濡쒖뺄?? Git 臾댁떆)
??  ?붴?? NAVER_CLIENT_SECRET=xxxxx
?쒋?? .env.example (?쒗뵆由?
?붴?? routes/naver.js (API ?꾨줉??
```

### 2. Firebase - Firestore 蹂댁븞 洹쒖튃?쇰줈 ?곗씠??寃⑸━

**援ъ“:**
```
?ъ슜??1 (uid: user1)
  ??books, movies, music, anime (userId=user1留??묎렐 媛??

?ъ슜??2 (uid: user2)
  ??books, movies, music, anime (userId=user2留??묎렐 媛??
```

**蹂댁븞 洹쒖튃 (`firestore.rules`):**
```javascript
match /books/{document=**} {
  // ?몄쬆???ъ슜?먮쭔 ?묎렐 媛??
  allow read, write: if request.auth != null && 
                        resource.data.userId == request.auth.uid;
  
  // ?앹꽦 ?쒖뿉??userId ?꾨뱶 寃利?
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
}
```

**?뱀쭠:**
- ??怨듦컻 API ???ъ슜 (?섎룄???ㅺ퀎)
- ??`userId` ?꾨뱶濡??곗씠??寃⑸━
- ??Google ?몄쬆 ?꾩닔
- ???먮룞 ??꾩뒪?ы봽

### 3. ?섍꼍 蹂??愿由?

**Git 臾댁떆 ?뚯씪:**
```
.gitignore
?쒋?? server/.env (Naver Secret)
?붴?? .env.local (?꾨줎?몄뿏?? 誘몄궗??
```

**怨듭쑀 ?뚯씪 (Git ?ы븿):**
```
?쒋?? server/.env.example (諛깆뿏???쒗뵆由?
?쒋?? FIREBASE_DEPLOYMENT.md
?쒋?? SECURITY.md (???뚯씪)
?붴?? README.md
```

---

## ?뵍 泥댄겕由ъ뒪??

諛고룷 ???뺤씤 ?ы빆:

- [ ] `server/.env`??NAVER_CLIENT_SECRET ?덉쓬
- [ ] `server/.env`媛 `.gitignore`???ы븿??
- [ ] `firestore.rules` 諛고룷??
- [ ] Firebase ?꾨줈?앺듃 蹂댁븞 洹쒖튃 ?쒖꽦?붾맖
- [ ] Backend CLIENT_URL ?ㅼ젙 ?뺤씤
- [ ] Firestore 而щ젆?섏뿉 `userId` ?꾨뱶 ?덉쓬

---

## ?? 諛고룷 媛?대뱶

?곸꽭??諛고룷 諛⑸쾿? [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md)瑜?李멸퀬?섏꽭??

**Firestore 蹂댁븞 洹쒖튃 諛고룷:**
```bash
firebase deploy --only firestore:rules
```

---

## ?뱤 ?곗씠???먮쫫

### 梨?寃??(Naver API ?ъ슜)

```
[Client] 
  ??GET /api/naver/search/book?query=harry
[Backend] (NAVER_CLIENT_SECRET ?ы븿)
  ??GET https://openapi.naver.com/v1/search/book (Secret ?ы븿)
[Naver API]
  ??寃??寃곌낵
[Backend] (寃곌낵 ?꾪꽣留?
  ??JSON ?묐떟
[Client] (寃곌낵 ?쒖떆)
```

### ?곗씠?????(Firebase Firestore ?ъ슜)

```
[Client] (userId=user123)
  ??addBook(bookData, user123)
[Firestore] (蹂댁븞 洹쒖튃 寃利?
  ??request.auth.uid == user123
  ??request.resource.data.userId == user123
  ??????깃났
[Firestore Document]
{
  id: "book_123",
  title: "Harry Potter",
  userId: "user123",
  createdAt: 2026-02-09
}
```

---

## ?좑툘 二쇱쓽?ы빆



### 2. Naver Client Secret ?덈? ?몄텧 湲덉?

```javascript
// ???덈? 湲덉?
const naver = {
  clientId: "xxxxx",           // PUBLIC
  clientSecret: "yyyyy",       // PRIVATE - 諛깆뿏?쒖뿉留?
};

// ???щ컮瑜?諛⑸쾿
// ?대씪?댁뼵?? clientId留??ъ슜
// 諛깆뿏?? ?묒そ 紐⑤몢 ?ъ슜
```

### 3. ?몃뜳??理쒖쟻??

蹂듯빀 荑쇰━ ??Firestore媛 ?먮룞?쇰줈 ?몃뜳???앹꽦???쒖븞?⑸땲??
`firestore.indexes.json`?먯꽌 ?섎룞?쇰줈 ?뺤쓽?????덉뒿?덈떎.

```json
{
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## ?뵇 蹂댁븞 媛먯궗 (Self-Check)

**?대씪?댁뼵??踰덈뱾 寃利?**
```bash
# 鍮뚮뱶 ??Secret???녿뒗吏 ?뺤씤
npm run build
grep -r "NAVER_CLIENT_SECRET" dist/  # 寃곌낵 ?놁뼱??????
```

**Firestore ?뚯뒪??**
```bash
# ?먮??덉씠?곕줈 蹂댁븞 洹쒖튃 ?뚯뒪??
firebase emulators:start
```

---

## ?뱴 李멸퀬 ?먮즺

- [Firebase Security Rules 臾몄꽌](https://firebase.google.com/docs/firestore/security)
- [Naver API 媛?대뱶](https://developers.naver.com/)
- [Express.js 蹂댁븞](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 臾몄젣 ?닿껐

**Q: Firestore???곗씠?곌? ??λ릺吏 ?딆쓬**
- A: 蹂댁븞 洹쒖튃 ?뺤씤, `userId` ?꾨뱶媛 ?덈뒗吏 ?뺤씤

**Q: Naver 寃?됱씠 ?묐룞?섏? ?딆쓬**
- A: `server/.env`??CLIENT_ID, CLIENT_SECRET ?뺤씤, 諛깆뿏???ㅽ뻾 ?뺤씤

**Q: CORS ?먮윭 諛쒖깮**
- A: `server/server.js`??CLIENT_URL ?뺤씤


# .env.local?먯꽌留?蹂닿? (諛고룷 X)
VITE_NAVER_CLIENT_ID=your_naver_client_id

# Secret? 蹂꾨룄??諛깆뿏?쒕굹 AWS Lambda ?ъ슜
```

#### Step 2: ?泥?諛⑹븞
1. **AWS Lambda ?ъ슜** (?쒕쾭由ъ뒪)
   - API Gateway ?ㅼ젙
   - Lambda?먯꽌 Secret 愿由?
   - ?대씪?댁뼵?몃뒗 Lambda ?몄텧留?

2. **Supabase Edge Functions ?ъ슜**
   - Firebase? ?좎궗??援ъ“
   - ?댁옣 ?쒕쾭由ъ뒪 ?⑥닔
   - Secret 愿由??댁옣

3. **Vercel Serverless Functions ?ъ슜**
   - Vite + Vercel 諛고룷 ???듯빀
   - `/api` ?대뜑濡?諛깆뿏??肄붾뱶 ?묒꽦
   - ?먮룞 CORS 泥섎━

---

## 異붿쿇 援ы쁽: Vercel Serverless + Vite

### 1. ?꾨줈?앺듃 援ъ“
```
src/
?쒋?? ... (湲곗〈 肄붾뱶)
api/
?쒋?? naver-search.js  (Naver API ?꾨줉??
?붴?? ...
```

### 2. API ?쇱슦???앹꽦
```javascript
// api/naver-search.js
export default async (req, res) => {
  const { query } = req.query;
  
  const response = await fetch(
    `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=20`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
    }
  );
  
  const data = await response.json();
  res.status(200).json(data);
};
```

### 3. ?대씪?댁뼵?몄뿉???몄텧
```javascript
// BooksList.jsx?먯꽌
const response = await fetch('/api/naver-search?query=梨?);
```

---

## ?꾩옱 諛고룷 ??理쒖냼?쒖쓽 蹂댁븞 議곗튂

1. **Secret ?쒓굅**
```env
VITE_NAVER_CLIENT_ID=your_naver_client_id
# Secret? 諛고룷 ?섍꼍???ы븿 X
```

2. **API ?붿껌 ?쒗븳**
   - Firebase 肄섏넄?먯꽌 DDoS 諛⑹? ?ㅼ젙
   - Naver API 愿由ъ옄 ?섏씠吏?먯꽌 IP ?쒗븳

3. **?섍꼍蹂??愿由?*
   - Firebase ?몄뒪???섍꼍蹂???ㅼ젙
   - `.env.local` ?덈? 而ㅻ컠 湲덉?

---

## 寃곕줎

| 諛⑹븞 | 蹂댁븞 | 鍮꾩슜 | 蹂듭옟??| 異붿쿇 |
|------|------|------|--------|------|
| ?꾩옱 援ъ“ (Secret ?몄텧) | ??쓬 | 臾대즺 | ??쓬 | ??|
| Backend ?쒕쾭 異붽? | ?믪쓬 | 以묎컙 | 以묎컙 | ??(沅뚯옣) |
| Vercel Serverless | ?믪쓬 | ?媛 | ??쓬 | ??(?ъ?) |

**異붿쿇**: Vercel Serverless Functions ?ъ슜 ??Secret ?④? + ???+ 媛꾪렪

