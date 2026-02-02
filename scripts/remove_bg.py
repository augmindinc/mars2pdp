import sys
import os
from rembg import remove
from PIL import Image

def process_image(input_path, output_path):
    try:
        input_image = Image.open(input_path)
        # remove background
        output_image = remove(input_image)
        # convert to RGB if needed or keep RGBA
        output_image.save(output_path)
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 remove_bg.py <input_path> <output_path>")
        sys.exit(1)
    
    input_p = sys.argv[1]
    output_p = sys.argv[2]
    
    if process_image(input_p, output_p):
        print("SUCCESS")
    else:
        sys.exit(1)
