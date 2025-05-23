import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: { name: 'staff' },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'client' },
    update: {},
    create: { name: 'client' },
  });

  await prisma.role.upsert({
    where: { name: 'doctor' },
    update: {},
    create: { name: 'doctor' },
  });

  // Create admin user
  const existingRoles = await prisma.role.findMany();
  const adminRoleExist = existingRoles.find((r) => r.name === 'admin');

  if (!adminRoleExist) {
    throw new Error(
      "Role 'admin' not found. Make sure roles are seeded before users.",
    );
  }
  const hashedPassword = await bcrypt.hash('password@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@cuddlemind.com' },
    update: {},
    create: {
      email: 'admin@cuddlemind.com',
      name: 'Admin',
      password: hashedPassword,
      role: { connect: { id: adminRoleExist.id } },
      status: 'active',
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
