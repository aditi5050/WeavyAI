import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    url: "https://via.placeholder.com/150",
    message: "File uploaded successfully (Stub)"
  });
}
