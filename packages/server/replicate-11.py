import os
import time
import replicate
from pathlib import Path
from dotenv import load_dotenv
import datetime

# Load environment variables from .env file
load_dotenv()


def create_video_from_image(image_path, output_dir="output_videos"):
    """
    Takes a generated image and creates a video using Replicate's wan2.1 model.

    Args:
        image_path (str): Path to the input image
        output_dir (str): Directory to save output videos
    """
    # Start timing
    start_time = time.time()
    start_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{start_datetime}] Starting video generation for {image_path}...")

    # Ensure output directory exists
    Path(output_dir).mkdir(exist_ok=True)

    # Prepare the input for the model
    with open(image_path, "rb") as f:
        image_data = f.read()

    # Set the Replicate API token directly
    replicate_api_token = os.getenv('REPLICATE_API_TOKEN')
    if not replicate_api_token:
        raise ValueError(
            "REPLICATE_API_TOKEN not found in .env file. Please add it.")

    # Set the token for the replicate library
    os.environ["REPLICATE_API_TOKEN"] = replicate_api_token

    input_params = {
        "image": open(image_path, "rb"),
        "prompt": "Animate this image in flat color 2d animation style, dynamic scene",
        "lora_url": "https://huggingface.co/motimalu/wan-flat-color-v2/resolve/main/wan_flat_color_v2.safetensors",
        "num_frames": 24,  # You can adjust this for longer/shorter videos
        "guidance_scale": 7.5,
        "fps": 8
    }

    # Call the Replicate API
    print(f"Generating video from {image_path}...")

    # Using base64 encoding for the image
    with open(image_path, "rb") as f:
        import base64
        image_base64 = base64.b64encode(f.read()).decode("utf-8")

    # Log API call start time
    api_start_time = time.time()
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Calling Replicate API...")

    # Using the current replicate API structure
    output = replicate.run(
        "fofr/wan2.1-with-lora:c48fa8ec65b13143cb552ab98ea17984eab9d70e9fe99479117de40a2a7f9ed0",
        input={
            "image": f"data:image/png;base64,{image_base64}",
            "prompt": "Animate this image in flat color 2d animation style, dynamic scene",
            "lora_url": "https://huggingface.co/motimalu/wan-flat-color-v2/resolve/main/wan_flat_color_v2.safetensors",
            "num_frames": 24,
            "guidance_scale": 7.5,
            "fps": 8
        }
    )

    # Log API call completion time
    api_end_time = time.time()
    api_duration = api_end_time - api_start_time
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] API call completed in {api_duration:.2f} seconds")

    # Wait for the prediction to complete
    # output = replicate.predictions.wait(output.id)

    # Get the output URL
    output_url = output.output
    if output_url:
        import requests

        # Log download start time
        download_start_time = time.time()
        print(
            f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Downloading video...")

        response = requests.get(output_url)

        # Log download completion time
        download_end_time = time.time()
        download_duration = download_end_time - download_start_time
        print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Download completed in {download_duration:.2f} seconds")

        # Save the video
        output_path = os.path.join(
            output_dir, f"animated_{Path(image_path).stem}.mp4")
        with open(output_path, "wb") as file:
            file.write(response.content)

        # Calculate total time
        end_time = time.time()
        total_duration = end_time - start_time

        print(f"Video saved to {output_path}")
        print(f"Total processing time: {total_duration:.2f} seconds")
        print(f"  - API processing time: {api_duration:.2f} seconds")
        print(f"  - Download time: {download_duration:.2f} seconds")
        print(
            f"  - Other operations: {(total_duration - api_duration - download_duration):.2f} seconds")
    else:
        # Calculate total time even if there's an error
        end_time = time.time()
        total_duration = end_time - start_time

        print("No output generated or there was an error.")
        print(f"Total time elapsed before error: {total_duration:.2f} seconds")


if __name__ == "__main__":
    # Process both generated images
    try:
        create_video_from_image("generated_image.png")
        # create_video_from_image("gemini-native-image.png")
    except Exception as e:
        print(f"Error: {e}")
