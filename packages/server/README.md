# Google Gemini Image Generation Demo

This directory contains scripts that demonstrate how to use Google's Gemini API for both text generation and image generation.

## Setup

1. **Install Dependencies**

   This project uses `pipenv` for dependency management. Navigate to the `packages/server` directory and run:

   ```bash
   pipenv install
   ```

   This will install all required dependencies from the Pipfile.

2. **Configure API Key**

   Create a `.env` file in the `packages/server` directory (if not already present) with your Gemini API key:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Scripts

### 1. gemini_experiment_v1.py

This script demonstrates basic image generation capabilities with Gemini.

#### How to Run:

```bash
pipenv run python gemini_experiment_v1.py
```

#### What It Does:

- Connects to the Gemini API using your API key
- Sends a prompt requesting a 3D rendered image of a flying pig with a top hat over a futuristic city
- Saves the generated image as `gemini-native-image.png`
- Displays the image (if running in an environment with GUI capabilities)

#### Example Output:

The script will print any text responses from the model and save the generated image. The resulting `gemini-native-image.png` shows a creative rendering of the requested scene.

### 2. gemini_experimental.py

This script provides a more detailed exploration of the Gemini API's response structure.

#### How to Run:

```bash
pipenv run python gemini_experimental.py
```

#### What It Does:

- Connects to the Gemini API using your API key
- Sends a prompt requesting an image of a cat
- Inspects and prints detailed information about the API response
- Attempts to save any image data in the response as `generated_image.png`

#### Example Output:

The script provides a comprehensive analysis of the API response, including:
- Response type and available attributes
- Model version and usage metadata
- Detailed breakdown of response candidates and their content
- Any text content and inline data properties

## Generated Files

- **gemini-native-image.png**: Image generated by the `gemini_experiment_v1.py` script
- **generated_image.png**: Any image data extracted from the `gemini_experimental.py` script

## Troubleshooting

- **API Key Issues**: Ensure your Gemini API key is valid and correctly set in the `.env` file
- **Import Errors**: Make sure all dependencies are installed via `pipenv install`
- **Module Not Found**: Activate the virtual environment with `pipenv shell` before running scripts directly

## Notes

The experimental models used in these scripts (such as `gemini-2.0-flash-exp-image-generation`) are subject to change, and their availability depends on your API access level and geographic location.