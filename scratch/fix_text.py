import os
import re

path = r'c:\Users\Admin\Desktop\GST\src\pages\Settings.jsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace any garbled icons with proper ones based on surrounding text
content = re.sub(r'<h1 className="text-xl font-black">.*Settings.*</h1>', '<h1 className="text-xl font-black">{t(\'settings.title\') || \'⚙️ Settings\'}</h1>', content)
content = re.sub(r'<h3 className="font-bold text-\[15px\] mb-2">.*Business Information.*</h3>', '<h3 className="font-bold text-[15px] mb-2">🏪 {t(\'settings.general\') || \'Business Information\'}</h3>', content)
content = re.sub(r'<Label className="text-\[11px\] font-semibold">.*Counter \/ Register \*</Label>', '<Label className="text-[11px] font-semibold">🖥️ Counter / Register *</Label>', content)
content = re.sub(r'<Label className="text-\[11px\] font-semibold">.*Shift</Label>', '<Label className="text-[11px] font-semibold">🕒 Shift</Label>', content)
content = re.sub(r'<SelectItem value="Afternoon">.*Afternoon.*</SelectItem>', '<SelectItem value="Afternoon">☀️ Afternoon (2pm – 10pm)</SelectItem>', content)
content = re.sub(r'<SelectItem value="Custom">.*Custom</SelectItem>', '<SelectItem value="Custom">⚙️ Custom</SelectItem>', content)
content = re.sub(r'.*\{member\.counter\} &nbsp;.*&nbsp;', '                          🖥️ {member.counter} &nbsp;·&nbsp;', content)
content = re.sub(r'\{member\.shift === \'Morning\'.*\{member\.shift\}', '{member.shift === \'Morning\' ? \'🌅\' : member.shift === \'Afternoon\' ? \'☀️\' : member.shift === \'Night\' ? \'🌙\' : \'📅\'} {member.shift}', content)
content = re.sub(r'<h3 className="font-bold text-\[15px\] mb-2">.*Bank Details \(for invoices\).*</h3>', '<h3 className="font-bold text-[15px] mb-2">🏦 {t(\'settings.bank_details\') || \'Bank Details (for invoices)\'}</h3>', content)
content = re.sub(r'<h3 className="font-bold text-\[15px\] mb-2">.*Invoice Configuration.*</h3>', '<h3 className="font-bold text-[15px] mb-2">📄 {t(\'settings.invoice_title\') || \'Invoice Configuration\'}</h3>', content)
content = re.sub(r'<h3 className="font-bold text-\[15px\] mb-2">.*Branding & Logo.*</h3>', '<h3 className="font-bold text-[15px] mb-2">🎨 {t(\'settings.branding\') || \'Branding & Logo\'}</h3>', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Settings.jsx text replacements done!")
