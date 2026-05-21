const fs = require('fs');

const transcriptPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\dbb2f19c-530d-4f79-9136-a29b373b08d9\\.system_generated\\logs\\transcript.jsonl';
const outPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\dbb2f19c-530d-4f79-9136-a29b373b08d9\\scratch\\first_prompt.txt';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const step = JSON.parse(line);
    if (step.type === 'USER_INPUT' && step.content) {
      fs.writeFileSync(outPath, step.content, 'utf8');
      console.log('Successfully wrote first prompt to ' + outPath);
      break;
    }
  } catch(e) {}
}
