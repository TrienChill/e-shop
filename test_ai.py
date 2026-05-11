import os
from gradio_client import Client, handle_file

client = Client("yisol/IDM-VTON")

img_path = r"d:\Code\React-native\e_shop\assets\images\react-logo.png"

try:
    result = client.predict(
            dict={"background": handle_file(img_path), "layers": [], "composite": None},
            garm_img=handle_file(img_path),
            garment_des="",
            is_checked=True,
            is_checked_crop=False, 
            denoise_steps=30,
            seed=42,
            api_name="/tryon"
    )
    print("Success:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
