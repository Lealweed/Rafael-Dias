import os
import re
from pathlib import Path

def adjust_file_fonts(file_path: Path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Perform font class updates
    content = content.replace("text-[8px]", "text-[11px]")
    content = content.replace("text-[9px]", "text-[12px]")
    content = content.replace("text-[10px]", "text-[13px]")
    content = content.replace("text-[11px]", "text-[13px]")
    content = content.replace("text-[12px]", "text-[14px]")

    # Check if anything changed
    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

def main():
    src_dir = Path("src")
    if not src_dir.exists():
        print("ERROR: src/ folder not found.")
        return

    modified_files = 0
    total_files = 0

    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".tsx", ".ts", ".css")):
                file_path = Path(root) / file
                total_files += 1
                if adjust_file_fonts(file_path):
                    print(f"Modified: {file_path.relative_to(src_dir)}")
                    modified_files += 1

    print(f"\nSummary: Adjusted fonts in {modified_files} of {total_files} files.")

if __name__ == "__main__":
    main()
