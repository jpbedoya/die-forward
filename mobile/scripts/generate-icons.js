const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Brand colors
const BG_COLOR = '#0d0d0d';
const AMBER = '#f59e0b';
const AMBER_DIM = '#78350f';

// Create a simple skull icon using SVG
function createSkullSVG(size, withGlow = true) {
  const scale = size / 1024;
  const glowFilter = withGlow ? `
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${40 * scale}" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="skullGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${AMBER};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${AMBER_DIM};stop-opacity:1" />
      </linearGradient>
    </defs>
  ` : '';

  // Skull design - simplified geometric skull
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${glowFilter}
      
      <!-- Background -->
      <rect width="1024" height="1024" fill="${BG_COLOR}"/>
      
      <!-- Outer glow ring -->
      ${withGlow ? `
      <circle cx="512" cy="512" r="400" fill="none" stroke="${AMBER}" stroke-width="8" opacity="0.3" filter="url(#glow)"/>
      ` : ''}
      
      <!-- Skull group -->
      <g transform="translate(512, 480)" ${withGlow ? 'filter="url(#glow)"' : ''}>
        <!-- Skull dome -->
        <ellipse cx="0" cy="-80" rx="200" ry="220" fill="url(#skullGradient)" stroke="${AMBER}" stroke-width="4"/>
        
        <!-- Left eye socket -->
        <ellipse cx="-70" cy="-100" rx="50" ry="60" fill="${BG_COLOR}"/>
        
        <!-- Right eye socket -->
        <ellipse cx="70" cy="-100" rx="50" ry="60" fill="${BG_COLOR}"/>
        
        <!-- Nose hole (triangle) -->
        <polygon points="0,-20 -25,40 25,40" fill="${BG_COLOR}"/>
        
        <!-- Jaw -->
        <rect x="-140" y="100" width="280" height="80" rx="20" fill="url(#skullGradient)" stroke="${AMBER}" stroke-width="4"/>
        
        <!-- Teeth -->
        <g fill="${BG_COLOR}">
          <rect x="-100" y="110" width="20" height="50" rx="5"/>
          <rect x="-60" y="110" width="20" height="50" rx="5"/>
          <rect x="-20" y="110" width="20" height="50" rx="5"/>
          <rect x="20" y="110" width="20" height="50" rx="5"/>
          <rect x="60" y="110" width="20" height="50" rx="5"/>
          <rect x="100" y="110" width="20" height="50" rx="5"/>
        </g>
      </g>
      
      <!-- "DIE FORWARD" text at bottom -->
      <text x="512" y="920" text-anchor="middle" font-family="monospace" font-size="64" font-weight="bold" fill="${AMBER}" letter-spacing="8">
        DIE FORWARD
      </text>
    </svg>
  `;
}

// Create adaptive icon foreground (just the skull, no background)
function createAdaptiveForegroundSVG(size) {
  const scale = size / 1024;
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${30 * scale}" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="skullGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${AMBER};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${AMBER_DIM};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Skull group - centered for adaptive icon safe zone -->
      <g transform="translate(512, 460)" filter="url(#glow)">
        <!-- Skull dome -->
        <ellipse cx="0" cy="-60" rx="180" ry="200" fill="url(#skullGradient)" stroke="${AMBER}" stroke-width="4"/>
        
        <!-- Left eye socket -->
        <ellipse cx="-65" cy="-80" rx="45" ry="55" fill="${BG_COLOR}"/>
        
        <!-- Right eye socket -->
        <ellipse cx="65" cy="-80" rx="45" ry="55" fill="${BG_COLOR}"/>
        
        <!-- Nose hole -->
        <polygon points="0,-10 -22,35 22,35" fill="${BG_COLOR}"/>
        
        <!-- Jaw -->
        <rect x="-125" y="100" width="250" height="70" rx="18" fill="url(#skullGradient)" stroke="${AMBER}" stroke-width="4"/>
        
        <!-- Teeth -->
        <g fill="${BG_COLOR}">
          <rect x="-90" y="108" width="18" height="45" rx="4"/>
          <rect x="-54" y="108" width="18" height="45" rx="4"/>
          <rect x="-18" y="108" width="18" height="45" rx="4"/>
          <rect x="18" y="108" width="18" height="45" rx="4"/>
          <rect x="54" y="108" width="18" height="45" rx="4"/>
          <rect x="90" y="108" width="18" height="45" rx="4"/>
        </g>
      </g>
    </svg>
  `;
}

// Create splash icon (larger skull, no text)
function createSplashSVG(size) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="50" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="skullGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${AMBER};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${AMBER_DIM};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Skull group - centered -->
      <g transform="translate(512, 512)" filter="url(#glow)">
        <!-- Skull dome -->
        <ellipse cx="0" cy="-80" rx="240" ry="280" fill="url(#skullGradient)" stroke="${AMBER}" stroke-width="6"/>
        
        <!-- Left eye socket -->
        <ellipse cx="-85" cy="-100" rx="60" ry="75" fill="${BG_COLOR}"/>
        
        <!-- Right eye socket -->
        <ellipse cx="85" cy="-100" rx="60" ry="75" fill="${BG_COLOR}"/>
        
        <!-- Nose hole -->
        <polygon points="0,-15 -30,50 30,50" fill="${BG_COLOR}"/>
        
        <!-- Jaw -->
        <rect x="-170" y="140" width="340" height="100" rx="25" fill="url(#skullGradient)" stroke="${AMBER}" stroke-width="6"/>
        
        <!-- Teeth -->
        <g fill="${BG_COLOR}">
          <rect x="-120" y="155" width="25" height="60" rx="6"/>
          <rect x="-75" y="155" width="25" height="60" rx="6"/>
          <rect x="-30" y="155" width="25" height="60" rx="6"/>
          <rect x="15" y="155" width="25" height="60" rx="6"/>
          <rect x="60" y="155" width="25" height="60" rx="6"/>
          <rect x="105" y="155" width="25" height="60" rx="6"/>
        </g>
      </g>
    </svg>
  `;
}

async function generateIcons() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  
  console.log('Generating Die Forward app icons...\n');
  
  // 1. Main app icon (1024x1024) - iOS App Store
  console.log('Creating icon.png (1024x1024)...');
  await sharp(Buffer.from(createSkullSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  
  // 2. Adaptive icon foreground (1024x1024) - Android
  console.log('Creating adaptive-icon.png (1024x1024)...');
  await sharp(Buffer.from(createAdaptiveForegroundSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  
  // 3. Splash icon
  console.log('Creating splash-icon.png (1024x1024)...');
  await sharp(Buffer.from(createSplashSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  
  // 4. Favicon (48x48)
  console.log('Creating favicon.png (48x48)...');
  await sharp(Buffer.from(createSkullSVG(512, false)))
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  
  console.log('\n✅ All icons generated successfully!');
  console.log(`   Output: ${assetsDir}`);
}

generateIcons().catch(console.error);
