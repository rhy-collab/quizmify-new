import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Simple query to verify connection
    const result = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
