import { NextRequest, NextResponse } from 'next/server';
import { writeFile, rename, access } from 'fs/promises';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function backupExistingFile(audioDir: string, filename: string): Promise<string | null> {
  const currentPath = path.join(audioDir, `${filename}.mp3`);
  
  if (!await fileExists(currentPath)) {
    return null;
  }
  
  // Find next version number
  let version = 1;
  while (await fileExists(path.join(audioDir, `${filename}-v${version}.mp3`))) {
    version++;
  }
  
  const backupPath = path.join(audioDir, `${filename}-v${version}.mp3`);
  await rename(currentPath, backupPath);
  
  return `${filename}-v${version}.mp3`;
}

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { prompt, filename, duration = 2 } = body;

    if (!prompt || !filename) {
      return NextResponse.json({ error: 'Missing prompt or filename' }, { status: 400 });
    }

    // Backup existing file if present
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const backedUpAs = await backupExistingFile(audioDir, filename);

    // Generate sound effect
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: duration,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', error);
      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Save to public/audio/
    const audioPath = path.join(process.cwd(), 'public', 'audio', `${filename}.mp3`);
    await writeFile(audioPath, Buffer.from(audioBuffer));

    return NextResponse.json({
      success: true,
      filename: `${filename}.mp3`,
      path: `/audio/${filename}.mp3`,
      size: audioBuffer.byteLength,
      backedUpAs,
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
