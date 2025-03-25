import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from PIL import Image
from io import BytesIO
from google.genai import types


def load_gemini_config():
    # Get the directory containing this file
    base_dir = Path(__file__).resolve().parent

    # Load environment variables from .env file
    env_path = base_dir / '.env'
    load_dotenv(dotenv_path=env_path)

    # Get Gemini API key
    api_key = os.getenv('GEMINI_API_KEY')

    if not api_key or api_key == 'your_api_key_here':
        raise ValueError(
            "Please set your GEMINI_API_KEY in the .env file")

    return api_key


def setup_gemini():
    # Load and configure API key
    api_key = load_gemini_config()
    genai.configure(api_key=api_key)

    # Get the Gemini Pro model
    model = genai.GenerativeModel('gemini-pro')
    return model


def generate_and_inspect_response():
    try:
        # Setup Gemini
        # model = setup_gemini()

        # Create a prompt for generating content
        prompt = """
        Generate an image of an adorable cat.
        The cat should be:
        - Sitting in a cozy position
        - Have fluffy fur
        - Big expressive eyes
        - In a warm, well-lit setting
        Make it look as natural and lifelike as possible.
        """

        print(prompt)

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part(
                        text="Generate an image of an adorable cat. "
                    )
                ]
            )
        ]

        print(contents)

        api_key = load_gemini_config()

        client = genai.Client(api_key=api_key)

        # Generate the content
        response = client.models.generate_content(model="models/gemini-2.0-flash-exp", contents=contents,
                                                  config=types.GenerateContentConfig(response_modalities=["Text", "Image"]))

        print("\nInspecting Response:")
        print("-" * 40)
        print("Response type:", type(response))
        print("\nAvailable attributes:", dir(response))
        print("\nModel version:", response.model_version)
        if hasattr(response, 'usage_metadata'):
            print("\nUsage metadata:", response.usage_metadata)
        print("-" * 40)

        # Inspect candidates
        print("\nCandidates:")
        for i, candidate in enumerate(response.candidates):
            print(f"\nCandidate {i}:")
            print("Content parts:")

            # Print all available attributes of the candidate
            print("\nCandidate attributes:", dir(candidate))
            print("\nCandidate content attributes:", dir(candidate.content))

            for part in candidate.content.parts:
                print("\nPart attributes:", dir(part))

                if hasattr(part, 'text') and part.text is not None:
                    print("\nText content:")
                    print(part.text)

                if hasattr(part, 'inline_data') and part.inline_data is not None:
                    print("\nInline data found!")
                    print("Inline data attributes:", dir(part.inline_data))
                    print("Inline data type:", type(part.inline_data))
                    if hasattr(part.inline_data, 'mime_type'):
                        print("MIME type:", part.inline_data.mime_type)
                    if hasattr(part.inline_data, 'data'):
                        print("Data length:", len(part.inline_data.data))
                        print("Data type:", type(part.inline_data.data))

                        # Try to save the data if it looks like an image
                        try:
                            image_data = BytesIO(part.inline_data.data)
                            image = Image.open(image_data)
                            image.save('generated_image.png')
                            print("Image saved successfully as generated_image.png")
                        except Exception as e:
                            print(f"Could not save image: {e}")

    except Exception as e:
        print(f"Error in generate_and_inspect_response: {e}")


if __name__ == "__main__":
    generate_and_inspect_response()
