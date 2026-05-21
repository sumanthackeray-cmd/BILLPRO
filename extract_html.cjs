const fs = require('fs');

const transcriptPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\dbb2f19c-530d-4f79-9136-a29b373b08d9\\.system_generated\\logs\\transcript.jsonl';
const outPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\dbb2f19c-530d-4f79-9136-a29b373b08d9\\scratch\\html_prompt.html';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
let htmlContent = '';

for (const line of lines) {
  if (!line) continue;
  try {
    const step = JSON.parse(line);
    if (step.type === 'USER_INPUT' && step.content && step.content.includes('<!DOCTYPE html>')) {
      const startIdx = step.content.indexOf('<!DOCTYPE html>');
      htmlContent = step.content.substring(startIdx);
      break;
    }
  } catch(e) {}
}

if (htmlContent) {
  // Ensure the scratch directory exists
  fs.mkdirSync('C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\dbb2f19c-530d-4f79-9136-a29b373b08d9\\scratch', { recursive: true });
  fs.writeFileSync(outPath, htmlContent, 'utf8');
  console.log('Successfully wrote HTML to ' + outPath);
} else {
  console.log('HTML not found in logs.');
}
