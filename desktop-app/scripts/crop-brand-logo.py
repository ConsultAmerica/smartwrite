from PIL import Image
import os

src = r"C:\Users\nazia\.cursor\projects\e-projects-AI-Projects-smartwrite\assets\c__Users_nazia_AppData_Roaming_Cursor_User_workspaceStorage_3cb7d4097535ede2bf945174fccbeb12_images_image-0aa8cee5-cb7a-4e97-b791-4d139057f6a3.jpg"
im = Image.open(src).convert("RGBA")
w, h = im.size
print("size", w, h)

out = os.path.join(os.path.dirname(__file__), "..", "public", "images", "_crop_preview")
os.makedirs(out, exist_ok=True)

crops = {
    "top_logo": (20, 20, 720, 210),
    "top_icon": (20, 40, 220, 200),
    "favicon": (700, 200, 1000, 450),
    "app_icon": (360, 200, 640, 460),
    "stacked": (20, 200, 340, 460),
}

for name, box in crops.items():
    path = os.path.join(out, f"{name}.png")
    im.crop(box).save(path)
    print(name, box, "->", path)
