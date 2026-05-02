import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

// Initialize a connection pool with the Neon connection string
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

export default prisma;
