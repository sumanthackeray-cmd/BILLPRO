import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update the text
    content = content.replace(
        "Join thousands of businesses managing their finances, inventory, and GST compliance with unparalleled precision.",
        "Trusted by modern businesses for smart GST billing, inventory control, and seamless financial management."
    )
    
    # 2. Add Theme Toggle button to the top right of the right panel
    # The right panel starts with:
    # <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 sm:px-12 md:px-24 relative overflow-y-auto">
    # We will insert a button at the top right of the right panel container
    
    # Need to add useTheme hook if not present
    if "import { useTheme } from" not in content:
        content = content.replace(
            'import { Link',
            'import { useTheme } from "next-themes";\nimport { Link'
        )
    
    if "const { theme, setTheme } = useTheme();" not in content:
        # insert after `const [isProcessing, setIsProcessing] = useState(false);` or similar state declaration
        content = re.sub(
            r'(const \[error, setError\] = useState\(""\);)',
            r'\1\n  const { theme, setTheme } = useTheme();',
            content
        )
        # handle Login.jsx difference
        content = re.sub(
            r'(const \[loading, setLoading\] = useState\(false\);)',
            r'\1\n  const { theme, setTheme } = useTheme();',
            content
        )

    # Need to import Moon, Sun from lucide-react
    if "Moon" not in content:
        content = content.replace('Lucide icons', 'Lucide icons') # dummy
        content = re.sub(
            r'import \{(.*?)\} from "lucide-react";',
            r'import {\1, Moon, Sun} from "lucide-react";',
            content
        )

    # Insert the toggle button inside the right panel
    # <div className="max-w-[440px] w-full mx-auto py-12 relative">
    right_panel_start = '<div className="max-w-[440px] w-full mx-auto py-12">'
    right_panel_new = '<div className="max-w-[440px] w-full mx-auto py-12 relative">'
    content = content.replace(right_panel_start, right_panel_new)

    toggle_btn = """
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="absolute top-4 right-0 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
"""
    if toggle_btn.strip() not in content:
        content = content.replace(right_panel_new, right_panel_new + "\n" + toggle_btn)

    # 3. Strip dark: classes from the right panel
    # We will just strip all dark: classes from the file entirely! Because the left panel is hardcoded dark anyway,
    # and the user wants the form (which is the right panel, or full width on mobile) to ALWAYS be light mode.
    # The root div has dark:bg-[#0B0B0F] dark:text-[#D1D1E0], we can remove those so it's always light, but wait...
    # If the user toggles dark mode, they might want the surrounding app to change. 
    # But for this specific page, they said: "always dispaly the form in light mode, for all the devicess".
    # This means the form box is light mode. Let's just strip all `dark:...` classes from the file.
    
    content = re.sub(r'\bdark:[a-zA-Z0-9\-\/\[\]#]+\b', '', content)
    
    # fix multiple spaces
    content = re.sub(r' +', ' ', content)
    content = content.replace(' className=" ', ' className="')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

update_file('C:\\Users\\Admin\\Desktop\\GST\\src\\pages\\Login.jsx')
update_file('C:\\Users\\Admin\\Desktop\\GST\\src\\pages\\Register.jsx')
