import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Serve skill.md as plain text
    const skillPath = join(process.cwd(), 'public', 'skill.md');
    const content = readFileSync(skillPath, 'utf-8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to serve skill.md:', error);
    return NextResponse.json({ error: 'Skill file not found' }, { status: 404 });
  }
}
