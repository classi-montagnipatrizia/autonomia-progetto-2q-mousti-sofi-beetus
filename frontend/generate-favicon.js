const fs = require('fs');
const f = 'public/favicon.svg';
let contents = fs.readFileSync(f, 'utf8');

// Remove the static fill
contents = contents.replace(' fill="#0d0d0d"', '');

const styleTag = `
  <style>
    @media (prefers-color-scheme: dark) {
      g { fill: #ffffff; }
    }
    @media (prefers-color-scheme: light) {
      g { fill: #0d0d0d; }
    }
  </style>
  <g transform="translate(0,1024) scale(0.1,-0.1)">`;

contents = contents.replace('<g transform="translate(0,1024) scale(0.1,-0.1)">', styleTag);

fs.writeFileSync(f, contents);
console.log('Favicon updated with prefers-color-scheme media query.');