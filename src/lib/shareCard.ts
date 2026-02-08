// Generate shareable death/victory cards as images

export interface DeathCardData {
  playerName: string;
  room: number;
  totalRooms: number;
  killedBy: string | null;
  epitaph: string;
  stakeLost: number;
}

export interface VictoryCardData {
  playerName: string;
  roomsCleared: number;
  stakeWon: number;
  enemiesDefeated: number;
}

// Create canvas and draw death card
export async function generateDeathCard(data: DeathCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  
  // Background gradient (dark red)
  const gradient = ctx.createLinearGradient(0, 0, 0, 800);
  gradient.addColorStop(0, '#1a0505');
  gradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 800);
  
  // Border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 560, 760);
  
  // Inner border
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1;
  ctx.strokeRect(35, 35, 530, 730);
  
  // Skull emoji (as text)
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.fillText('💀', 300, 120);
  
  // Title
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText('YOU DIED', 300, 190);
  
  // Subtitle
  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('in THE SUNKEN CRYPT', 300, 225);
  
  // Player name
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`@${data.playerName}`, 300, 290);
  
  // Progress
  ctx.font = '20px "Courier New", monospace';
  ctx.fillStyle = '#e5e5e5';
  ctx.fillText(`Reached Room ${data.room} of ${data.totalRooms}`, 300, 340);
  
  // Killed by
  if (data.killedBy) {
    ctx.font = 'italic 18px "Courier New", monospace';
    ctx.fillStyle = '#991b1b';
    ctx.fillText(`Slain by ${data.killedBy}`, 300, 375);
  }
  
  // Epitaph box
  ctx.fillStyle = '#111111';
  ctx.fillRect(50, 410, 500, 120);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.strokeRect(50, 410, 500, 120);
  
  // Epitaph label
  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#666666';
  ctx.fillText('FINAL WORDS', 300, 435);
  
  // Epitaph text (wrap if needed)
  ctx.font = 'italic 20px "Courier New", monospace';
  ctx.fillStyle = '#e5e5e5';
  const words = data.epitaph.split(' ');
  let line = '';
  let y = 475;
  for (const word of words) {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > 460) {
      ctx.fillText(`"${line.trim()}"`, 300, y);
      line = word + ' ';
      y += 28;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(`"${line.trim()}"`, 300, y);
  }
  
  // Stake lost
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`◎ ${data.stakeLost} SOL LOST`, 300, 580);
  
  // Divider
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  ctx.moveTo(100, 620);
  ctx.lineTo(500, 620);
  ctx.stroke();
  
  // Game title
  ctx.font = 'bold 32px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('DIE FORWARD', 300, 680);
  
  // Tagline
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('Your death feeds the depths.', 300, 710);
  
  // URL
  ctx.font = '16px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('die-forward.vercel.app', 300, 750);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

// Create canvas and draw victory card
export async function generateVictoryCard(data: VictoryCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  
  // Background gradient (dark green/gold)
  const gradient = ctx.createLinearGradient(0, 0, 0, 800);
  gradient.addColorStop(0, '#0a1a05');
  gradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 800);
  
  // Border
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 560, 760);
  
  // Inner border
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 1;
  ctx.strokeRect(35, 35, 530, 730);
  
  // Trophy emoji
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', 300, 120);
  
  // Title
  ctx.font = 'bold 38px "Courier New", monospace';
  ctx.fillStyle = '#22c55e';
  ctx.textAlign = 'center';
  ctx.fillText('ESCAPED', 300, 190);
  
  // Subtitle
  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('THE SUNKEN CRYPT', 300, 225);
  
  // Player name
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`@${data.playerName}`, 300, 300);
  
  // Stats box
  ctx.fillStyle = '#111111';
  ctx.fillRect(100, 340, 400, 180);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.strokeRect(100, 340, 400, 180);
  
  // Stats
  ctx.font = '20px "Courier New", monospace';
  ctx.fillStyle = '#e5e5e5';
  ctx.textAlign = 'left';
  ctx.fillText('Rooms Cleared:', 130, 390);
  ctx.fillText('Enemies Slain:', 130, 430);
  ctx.fillText('SOL Won:', 130, 470);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = '#22c55e';
  ctx.fillText(`${data.roomsCleared}`, 470, 390);
  ctx.fillStyle = '#ef4444';
  ctx.fillText(`${data.enemiesDefeated}`, 470, 430);
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillText(`◎ ${data.stakeWon.toFixed(3)}`, 470, 470);
  
  // Victory message
  ctx.textAlign = 'center';
  ctx.font = 'italic 18px "Courier New", monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('You conquered the depths.', 300, 570);
  ctx.fillText('Few can claim the same.', 300, 600);
  
  // Divider
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  ctx.moveTo(100, 650);
  ctx.lineTo(500, 650);
  ctx.stroke();
  
  // Game title
  ctx.font = 'bold 32px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('DIE FORWARD', 300, 710);
  
  // Tagline
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('Your death feeds the depths.', 300, 740);
  
  // URL
  ctx.font = '16px "Courier New", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('die-forward.vercel.app', 300, 770);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

// Download the card image
export function downloadCard(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Share via Web Share API if available, otherwise download
export async function shareCard(blob: Blob, title: string, text: string): Promise<boolean> {
  const file = new File([blob], 'die-forward.png', { type: 'image/png' });
  
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    } catch (err) {
      // User cancelled or share failed
      console.log('Share cancelled or failed:', err);
      return false;
    }
  }
  
  // Fallback to download
  downloadCard(blob, 'die-forward.png');
  return true;
}
