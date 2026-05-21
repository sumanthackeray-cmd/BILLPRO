import sys

with open(r'c:\Users\Admin\Desktop\GST\src\pages\Settings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'âš™ï¸ ': '⚙️',
    'ðŸ ª': '🏪',
    'âœ¨': '✨',
    'ðŸ‘¤': '👤',
    'ðŸ–¥ï¸ ': '🖥️',
    'ðŸ• ': '🕒',
    'ðŸŒ…': '🌅',
    'â€“': '–',
    'â˜€ï¸ ': '☀️',
    'ðŸŒ™': '🌙',
    'ðŸ“…': '📅',
    'Â·': '·',
    'ðŸ’¡': '💡',
    'ðŸ ¦': '🏦',
    'ðŸ“„': '📄',
    'ðŸŽ¨': '🎨',
    'Ã—': '×',
    'âž•': '➕',
    'â€¢': '•'
}

new_content = content
for k, v in replacements.items():
    new_content = new_content.replace(k, v)

with open(r'c:\Users\Admin\Desktop\GST\src\pages\Settings.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Successfully fixed mojibake characters.')
