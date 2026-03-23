# JihaSafety - 지하매설물 통합 안전 플랫폼

## 프로젝트 개요
시공업체가 도로굴착 시 해당 지역의 지하매설물 담당자에게 자동으로 알림 메일을 보내는 웹 플랫폼.

## 기술 스택
- **프레임워크**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **지도**: Kakao Maps API + Daum Postcode API (API 키 필요: `NEXT_PUBLIC_KAKAO_APP_KEY`)
- **이메일**: Nodemailer (Gmail SMTP)
- **DB**: Prisma 6 + PostgreSQL (Vercel Postgres / Neon)
- **인증**: 쿠키 기반 관리자 인증 (bcryptjs)
- **배포**: Vercel (GitHub 연동 자동 배포)
- **추가 의존성**: `nodemailer`, `bcryptjs`, `@types/nodemailer`, `ts-node`

## 워크플로우
- 코드 수정 후 **자동으로 git commit + push** (Stop 훅 설정됨)
- Vercel이 GitHub push 감지 → 자동 빌드/배포

## 프로젝트 구조

```
JihaSafety/
├── .env.local                          # 환경변수 (gitignore)
├── prisma/
│   ├── schema.prisma                   # PostgreSQL (Neon)
│   └── seed.ts                         # 테스트용 담당자 데이터
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃 (한국어 폰트)
│   │   ├── page.tsx                    # 메인 페이지 (SubmissionForm 포함)
│   │   ├── globals.css
│   │   ├── request/
│   │   │   └── complete/page.tsx       # 제출 완료 페이지 (수신자 메일·담당자 정보 표시)
│   │   ├── sibum_bundang/              # 관리자 영역 (비공개 경로)
│   │   │   ├── page.tsx                # 관리자 로그인
│   │   │   ├── layout.tsx              # 인증 가드
│   │   │   └── dashboard/page.tsx      # 담당자 CRUD + 요청 이력 (탭 2개)
│   │   └── api/
│   │       ├── request/route.ts        # 굴착 요청 처리 + 이메일 발송 (multipart/form-data)
│   │       ├── contacts/route.ts       # 담당자 목록/추가
│   │       ├── contacts/[id]/route.ts  # 담당자 수정/삭제
│   │       ├── departments/route.ts    # 부서 목록/추가
│   │       ├── departments/[id]/route.ts # 부서 삭제
│   │       ├── submissions/route.ts    # 요청 이력 조회
│   │       └── auth/route.ts           # 관리자 로그인/로그아웃
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── KakaoAddressSearch.tsx      # Daum Postcode 팝업 + Kakao Maps 지도 확인 통합
│   │   ├── SubmissionForm.tsx          # 굴착 요청 폼 (공사정보 + 주소검색 + 파일첨부 + 동의)
│   │   ├── ContactTable.tsx            # 관리자 담당자 테이블 (인라인 편집, 부서 드롭다운)
│   │   ├── SubmissionTable.tsx         # 관리자 요청 이력 테이블 (상태별 필터)
│   │   └── LogoutButton.tsx
│   ├── lib/
│   │   ├── db.ts                       # Prisma 클라이언트 싱글톤
│   │   ├── mailer.ts                   # Nodemailer 설정 + 첨부파일 처리
│   │   ├── email-template.ts           # 이메일 HTML 템플릿
│   │   ├── csv-generator.ts            # CSV 생성 (이메일 첨부용)
│   │   ├── city-matcher.ts             # 시/도 이름 정규화 + 담당자 매칭 (3단계)
│   │   └── auth.ts                     # 관리자 인증 (쿠키 기반)
│   └── types/index.ts
```

## DB 스키마

### CityContact (시/군/구 담당자)
- `id`: Int (PK)
- `sido`: String - 시/도 (서울특별시, 경기도 등 **정식명칭**)
- `sigungu`: String - 시/군/구 (시 단위 등록 가능: 예 `수원시`)
- `personName`: String - 담당자 이름
- `email`: String - 담당자 이메일
- `phone`: String - 전화번호
- `department`: String? - 담당 부서 (Department 테이블 값 사용)
- `@@unique([sido, sigungu])` - 시/군/구당 1명

### Department (부서)
- `id`: Int (PK)
- `name`: String (unique) - 부서명
- 관리자 대시보드에서 추가/삭제 가능
- 기본값: 경기지역본부, 분당지사

### Submission (굴착 요청 이력)
- `id`: Int (PK)
- `projectName`, `companyName`: String
- `constructionStartDate`, `constructionEndDate`: DateTime
- `fullAddress`, `sido`, `sigungu`: String
- `latitude`, `longitude`: Float?
- `emailSentTo`: String? - 발송 대상 이메일
- `status`: String - `sent` / `failed` / `no_contact`
- `consentGiven`: Boolean
- `cityContactId`: Int? (FK → CityContact)

## 환경변수 (.env.local)
```
# Vercel Postgres (Neon) - vercel env pull로 자동 설정됨
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."

# Gmail SMTP
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"

# Kakao Maps (Kakao Developers에서 JavaScript 키 발급)
NEXT_PUBLIC_KAKAO_APP_KEY="your-kakao-js-key"

# 관리자 인증
ADMIN_PASSWORD_HASH="\$2b\$10\$..."   # $ 앞에 \ 이스케이프 필요 (.env.local 한정)
SESSION_SECRET="random-secret-string"
```

> **주의**: `.env.local`에서 bcrypt 해시의 `$` 기호는 `\$`로 이스케이프 필요 (dotenv-expand 오작동 방지).
> Vercel 대시보드에 직접 입력할 때는 이스케이프 없이 원본 값 그대로 입력.

## Kakao Maps 설정
1. https://developers.kakao.com 에서 앱 생성
2. **JavaScript 키** 복사 → `NEXT_PUBLIC_KAKAO_APP_KEY`
3. 플랫폼 등록 (Web): `http://localhost:3000`, Vercel 배포 주소
4. **카카오맵 서비스 활성화** 필수: 앱 → 카카오맵 → 활성화 ON
5. `NEXT_PUBLIC_KAKAO_APP_KEY`는 빌드 시 번들에 내장 → 변경 시 Vercel Redeploy 필요

## 파일 첨부 기능 (시공업체 → 담당자)
- 허용 형식: 이미지(jpg, png), PDF, 문서(hwp, doc, docx, xlsx)
- **최대 파일 크기: 파일당 5MB, 총 10MB**
- API에서 `multipart/form-data`로 수신 → 메모리 버퍼로 처리 (파일 시스템 저장 없음)
- 이메일 attachments:
  1. CSV (`굴착확인요청_시군구_YYYYMMDD_업체명.csv`) — 자동 생성, 업체명·회신주소 포함
  2. 시공업체 첨부 파일들 — 원본 그대로 전달

## 담당자 매칭 로직 (city-matcher.ts)
Daum Postcode API 축약형 → DB 정식명칭 변환 후 3단계 매칭:
1. **sido + sigungu 정확 매칭** (예: 경기도 + 수원시 영통구)
2. **sigungu만 정확 매칭** (sido 무관)
3. **시 단위 prefix 매칭**: `수원시 영통구` → `수원시`로 등록된 담당자 매칭

## 보안 요구사항
- **입력값 검증**: 모든 API에서 서버 사이드 검증 (길이, 형식)
- **XSS 방지**: 이메일 템플릿 포함 HTML 이스케이프
- **SQL Injection 방지**: Prisma ORM만 사용, raw query 금지
- **인증**: bcryptjs 해싱, HttpOnly+Secure+SameSite=Lax 쿠키
- **세션**: HMAC-SHA256 서명 토큰, 2시간 만료
- **에러 처리**: 내부 스택 트레이스 노출 금지
- **관리자 경로**: `/sibum_bundang` (비공개, 헤더 링크 없음)
- **보안 헤더** (next.config.ts): CSP — `*.kakao.com`, `*.daum.net`, `*.daumcdn.net` 전체 허용, `'unsafe-eval'` 포함 (Kakao Maps SDK 요구사항)

## 관리자 기능 (ContactTable)
- 전국 시/군/구 드롭다운 (시도 선택 → 시군구 자동 필터)
- 시 단위 등록 가능 (예: `수원시` → 수원시 전체 담당)
- 부서 드롭다운 + 부서 추가/삭제 관리 패널
- 등록 현황 통계 카드: 전체 시/군/구 수 · 등록 수 · 미등록 수

## 사용자 플로우
1. 메인 페이지에서 바로 굴착 요청 폼 표시
2. 주소 검색 (Daum Postcode) → Kakao Maps로 위치 확인 + 체크박스 확인
3. 공사명, 시공업체명, 공사예정기간 입력 + 파일 첨부 (선택)
4. 개인정보 동의 후 "접수하기" → 해당 시/군/구 담당자에게 이메일 자동 발송
5. 완료 페이지: 수신자 메일, 담당자명, 부서, 연락처 표시

## 개발 명령어
```bash
npm run dev              # 개발 서버
npx prisma db push       # DB 스키마 적용 (Neon)
npx prisma db seed       # 시드 데이터 삽입
npx prisma studio        # DB GUI
vercel env pull          # Vercel 환경변수 로컬로 가져오기
```
