const fs = require('fs');
const f = 'c:/projects/ai-workflow/Comp-bot/frontend/src/features/landing/view/components/LandingSections.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');
console.log('Total lines:', lines.length);
// Keep lines 1-146 (index 0-145) and lines 298+ (index 297+)
const out = lines.slice(0, 146).concat(lines.slice(297));
fs.writeFileSync(f, out.join('\n'));
console.log('Done, new lines:', out.length);
