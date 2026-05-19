import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Neon HTTP connection ko Drizzle schema ke saath app-wide DB client banata hai.
const sql = neon(process.env.DATABASE_URL!);
 export const db = drizzle(sql,{schema});
 
