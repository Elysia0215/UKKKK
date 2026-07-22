import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
FILE_PATH = BASE_DIR / "frontend" / "src" / "data" / "seoulData.ts"

def main():
    print("=" * 60)
    # Read the file
    content = FILE_PATH.read_text(encoding="utf-8")
    
    # 1. Update interface property births2024: number; -> births2025: number;
    content = content.replace("births2024: number;", "births2025: number;")
    
    # 2. Update all births2024: <val> to births2025: <int(val * 1.094)>
    pattern = re.compile(r"births2024:\s*(\d+)")
    
    def repl(match):
        val = int(match.group(1))
        # Scale births by 9.4% rebound (multiply by 1.094)
        new_val = round(val * 1.094)
        return f"births2025: {new_val}"
    
    updated_content = pattern.sub(repl, content)
    
    # Write back
    FILE_PATH.write_text(updated_content, encoding="utf-8")
    print("Updated births data in seoulData.ts successfully to 2025 values!")
    print("=" * 60)

if __name__ == "__main__":
    main()
