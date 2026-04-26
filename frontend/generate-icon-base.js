const fs = require('fs');

const origSvg = fs.readFileSync('public/images/beetUs_logo.svg', 'utf8');
const match = origSvg.match(/<g[^>]*>([\s\S]*?)<\/g>/);

if (match) {
  const innerPaths = match[1];

  const newSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#000000" rx="225" />
  <svg x="152" y="152" width="720" height="720" viewBox="150 150 720 720">
    <g transform="translate(0,1024) scale(0.1,-0.1)" fill="#ffffff">
${innerPaths}
    </g>
  </svg>
</svg>`;

  fs.writeFileSync('public/icons/icon_base.svg', newSvg);
  console.log('Created icon_base.svg');
} else {
  console.error('Could not parse original SVG');
}
