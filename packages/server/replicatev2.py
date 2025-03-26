import replicate
from pathlib import Path
from dotenv import load_dotenv
import os
load_dotenv()

replicate_api_token = os.getenv('REPLICATE_API_TOKEN')
if not replicate_api_token:
    raise ValueError(
        "REPLICATE_API_TOKEN not found in .env file. Please add it.")

 # Set the token for the replicate library
os.environ["REPLICATE_API_TOKEN"] = replicate_api_token

input = {
    "prompt": "flat color 2d animation of a portrait of woman with white hair and green eyes, dynamic scene",
    "lora_url": "https://huggingface.co/motimalu/wan-flat-color-v2/resolve/main/wan_flat_color_v2.safetensors"
}

print(replicate)
# print(replicate.api_token)

output = replicate.run(
    "fofr/wan2.1-with-lora:c48fa8ec65b13143cb552ab98ea17984eab9d70e9fe99479117de40a2a7f9ed0",
    input=input
)
for index, item in enumerate(output):
    with open(f"output_{index}.mp4", "wb") as file:
        file.write(item.read())
