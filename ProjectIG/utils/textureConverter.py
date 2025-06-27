from PIL import Image
import os

input_folder = "./assets/Various/"
output_folder = "./assets/Various/"

for filename in os.listdir(input_folder):
    if filename.lower().endswith(".tga"):
        img = Image.open(os.path.join(input_folder, filename))
        new_filename = filename.rsplit('.', 1)[0] + ".png"
        img.save(os.path.join(output_folder, new_filename))
        print(f"Converted {filename} to {new_filename}")
