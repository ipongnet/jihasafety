/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");

const plain = process.argv[2];
if (!plain) {
  console.error("사용법: npm run hash-admin-password -- <평문비밀번호>");
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 10);
console.log("");
console.log("아래 한 줄을 .env.local 에 붙여넣으세요:");
console.log("");
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
console.log("");
console.log("(해시에 $가 있으면 반드시 큰따옴표로 감싸야 합니다.)");
console.log("");
