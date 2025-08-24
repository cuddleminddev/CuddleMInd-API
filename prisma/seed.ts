import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  // Create affirmations
  const affirmationsData = [
    {
      quote: 'Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.',
      author: 'Christian D. Larson',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'The only impossible journey is the one you never begin.',
      author: 'Tony Robbins',
      backgroundImage: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'Your mind is a powerful thing. When you fill it with positive thoughts, your life will start to change.',
      author: 'Buddha',
      backgroundImage: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'You are never too old to set another goal or to dream a new dream.',
      author: 'C.S. Lewis',
      backgroundImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80'
    },
    {
      quote: 'The future belongs to those who believe in the beauty of their dreams.',
      author: 'Eleanor Roosevelt',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
      author: 'Winston Churchill',
      backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80'
    },
    {
      quote: 'The way to get started is to quit talking and begin doing.',
      author: 'Walt Disney',
      backgroundImage: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'Don\'t be pushed around by the fears in your mind. Be led by the dreams in your heart.',
      author: 'Roy T. Bennett',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'Life is 10% what happens to you and 90% how you react to it.',
      author: 'Charles R. Swindoll',
      backgroundImage: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'The only person you are destined to become is the person you decide to be.',
      author: 'Ralph Waldo Emerson',
      backgroundImage: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    },
    {
      quote: 'Keep your face always toward the sunshine—and shadows will fall behind you.',
      author: 'Walt Whitman',
      backgroundImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80'
    },
    {
      quote: 'You have been assigned this mountain to show others it can be moved.',
      author: 'Mel Robbins',
      backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80'
    }
  ];

  console.log('Seeding affirmations...');
  // Check if affirmations already exist
  const existingAffirmationsCount = await prisma.affirmation.count();
  
  if (existingAffirmationsCount === 0) {
    await prisma.affirmation.createMany({
      data: affirmationsData
    });
    console.log(`Seeded ${affirmationsData.length} affirmations`);
  } else {
    console.log(`Affirmations already exist (${existingAffirmationsCount} found), skipping...`);
  }

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
