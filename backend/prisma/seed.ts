import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const userPassword = process.env.SEED_USER_PASSWORD ?? 'User@12345';

  const adminHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const userHash = await argon2.hash(userPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@example.com',
      passwordHash: userHash,
      role: Role.USER,
    },
  });

  const demoPage = await prisma.page.upsert({
    where: { slug: 'welcome' },
    update: {},
    create: {
      slug: 'welcome',
      title: 'Welcome to Neon Pages',
      content:
        '## Hello 👋\n\nThis public page was created automatically during seeding.\n\nScan the QR code on your dashboard to share it.',
      ownerId: user.id,
      seoTitle: 'Neon Pages — Welcome',
      description: 'A seeded public page for Neon Pages.',
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  console.log('Seed complete:');
  console.log(`  Admin → ${admin.username} / ${adminPassword}`);
  console.log(`  User  → ${user.username} / ${userPassword}`);
  console.log(`  Page  → /p/${demoPage.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
