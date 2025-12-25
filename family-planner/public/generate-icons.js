const fs = require('fs');

function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4CAF50"/>
  <text x="50%" y="50%" font-size="${size/3}" font-family="Arial, sans-serif" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">FP</text>
</svg>`;
}

const sizes = [152, 167, 180, 192, 512];
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  fs.writeFileSync(`icon-${size}.svg`, svg);
  console.log(`Created icon-${size}.svg`);
});

console.log('\n✅ Icons created! These are SVG files that will work as placeholders.');
console.log('   You can convert them to PNG later or use a design tool to create proper icons.\n');
