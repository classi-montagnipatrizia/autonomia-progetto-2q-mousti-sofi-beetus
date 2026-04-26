const fs = require('fs');

const origSvg = fs.readFileSync('public/images/beetUs_logo.svg', 'utf8');
const match = origSvg.match(/<g[^>]*>([\s\S]*?)<\/g>/);

if (match) {
  const innerPaths = match[1];

  // Let's stretch the logo inside the icon. Less border, more meat.
  const newSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#000000" rx="180" />
  <svg x="64" y="64" width="896" height="896" viewBox="150 150 720 720">
    <g transform="translate(0,1024) scale(0.1,-0.1)" fill="#ffffff">
${innerPaths}
    </g>
  </svg>
</svg>`;

  fs.writeFileSync('public/icons/icon_base.svg', newSvg);
  fs.writeFileSync('public/favicon.svg', newSvg);
  console.log('Created expanded icon_base.svg and favicon.svg');
} else {
  console.error('Could not parse original SVG');
}
