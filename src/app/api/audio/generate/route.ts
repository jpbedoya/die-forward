import { NextRequest, NextResponse } from 'next/server';
import { writeFile, rename, access, mkdir } from 'fs/promises';
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
  
  // Use timestamp for backup name: old-YYYYMMDD-HHMM
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2');
  const backupName = `${filename}-old-${timestamp}.mp3`;
  
  const backupPath = path.join(audioDir, backupName);
  await rename(currentPath, backupPath);
  
  return backupName;
}

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { prompt, filename, duration = 2, subdir } = body;

    if (!prompt || !filename) {
      return NextResponse.json({ error: 'Missing prompt or filename' }, { status: 400 });
    }

    // Determine target directory
    const baseAudioDir = path.join(process.cwd(), 'public', 'audio');
    const audioDir = subdir
      ? path.join(baseAudioDir, subdir)
      : baseAudioDir;

    // Create directory if it doesn't exist (handles subdir case)
    await mkdir(audioDir, { recursive: true });

    // Backup existing file if present
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
    
    // Save to target directory
    const audioPath = path.join(audioDir, `${filename}.mp3`);
    await writeFile(audioPath, Buffer.from(audioBuffer));

    // Build public path
    const publicPath = subdir
      ? `/audio/${subdir}/${filename}.mp3`
      : `/audio/${filename}.mp3`;

    return NextResponse.json({
      success: true,
      filename: `${filename}.mp3`,
      path: publicPath,
      size: audioBuffer.byteLength,
      backedUpAs,
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
