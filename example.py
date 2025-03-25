import google.generativeai as genai
from config import load_config


def setup_gemini():
    # Load configuration
    config = load_config()

    # Configure the Gemini API
    genai.configure(api_key=config['api_key'])

    return genai


def main():
    try:
        # Setup Gemini
        genai = setup_gemini()

        # List available models
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                print(f"Found model: {model.name}")

        print("\nGemini API configured successfully!")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
