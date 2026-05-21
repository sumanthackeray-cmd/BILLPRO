const fs = require('fs');

const emojiRegex = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g;

function removeEmojis(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(emojiRegex, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Cleaned emojis from ${filePath}`);
}

removeEmojis('C:\\Users\\Admin\\Desktop\\GST\\src\\pages\\POS.jsx');
removeEmojis('C:\\Users\\Admin\\Desktop\\GST\\src\\lib\\LanguageContext.jsx');
