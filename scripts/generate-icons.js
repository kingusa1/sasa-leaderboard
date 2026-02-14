const sharp = require('sharp');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo', 'sasa-logo-color.png');
const outputDir = path.join(__dirname, '..', 'public');

const NAVY = { r: 0, g: 46, b: 89, alpha: 1 };

async function generateIcon(size, filename) {
  const metadata = await sharp(logoPath).metadata();

  // Calculate logo size with padding
  const padding = Math.round(size * 0.12);
  const maxLogoWidth = size - padding * 2;
  const maxLogoHeight = size - padding * 2;

  const scale = Math.min(maxLogoWidth / metadata.width, maxLogoHeight / metadata.height);
  const logoWidth = Math.round(metadata.width * scale);
  const logoHeight = Math.round(metadata.height * scale);

  // Resize and make logo white (brighten + tint)
  const whiteLogo = await sharp(logoPath)
    .resize(logoWidth, logoHeight, { fit: 'inside' })
    .modulate({ brightness: 5 })
    .tint({ r: 255, g: 255, b: 255 })
    .png()
    .toBuffer();

  // Create navy background with centered white logo
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: NAVY,
    },
  })
    .composite([{
      input: whiteLogo,
      left: Math.round((size - logoWidth) / 2),
      top: Math.round((size - logoHeight) / 2),
    }])
    .png()
    .toFile(path.join(outputDir, filename));

  console.log(`Generated ${filename} (${size}x${size})`);
}

async function main() {
  await generateIcon(180, 'apple-touch-icon.png');
  await generateIcon(192, 'icon-192.png');
  await generateIcon(512, 'icon-512.png');
  await generateIcon(32, 'favicon-32x32.png');
  await generateIcon(16, 'favicon-16x16.png');
  console.log('All icons generated!');
}

main().catch(console.error);
