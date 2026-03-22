import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const contacts = [
  { sido: "서울특별시", sigungu: "강남구", personName: "김철수", email: "gangnam@example.com", phone: "02-1234-5678", department: "도로관리과" },
  { sido: "서울특별시", sigungu: "종로구", personName: "이영희", email: "jongno@example.com", phone: "02-2345-6789", department: "지하시설과" },
  { sido: "경기도", sigungu: "수원시", personName: "박민수", email: "suwon@example.com", phone: "031-345-6789", department: "안전관리과" },
  { sido: "경기도", sigungu: "성남시", personName: "정지혜", email: "seongnam@example.com", phone: "031-456-7890", department: "도로과" },
  { sido: "부산광역시", sigungu: "해운대구", personName: "최동원", email: "haeundae@example.com", phone: "051-567-8901", department: "시설관리과" },
  { sido: "인천광역시", sigungu: "남동구", personName: "강서윤", email: "namdong@example.com", phone: "032-678-9012", department: "도로관리과" },
  { sido: "대전광역시", sigungu: "유성구", personName: "윤재호", email: "yuseong@example.com", phone: "042-789-0123", department: "지하안전과" },
  { sido: "대구광역시", sigungu: "수성구", personName: "한미래", email: "suseong@example.com", phone: "053-890-1234", department: "시설과" },
];

async function main() {
  for (const c of contacts) {
    await prisma.cityContact.upsert({
      where: { sido_sigungu: { sido: c.sido, sigungu: c.sigungu } },
      update: c,
      create: c,
    });
  }
  console.log(`Seeded ${contacts.length} contacts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
