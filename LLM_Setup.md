# LLM chat and transcription setup

This guide explains how Ultron's LLM features work, what data each provider receives, and how to set them up.

## How the LLM features fit into Ultron

When a user uploads an image, Ultron saves it and runs the OCR pipeline. TrOCR produces the editable transcription; Ultron stores it with the image and creates a machine translation when possible. The user can then ask questions about that document or compare TrOCR with a second image-based transcription.

The LLM is not the source of truth for the document. Manuscript handwriting, OCR, translation, and LLM responses can all contain errors. Users should inspect the image and review any proposed transcription before saving it.

## What each provider receives

| Feature | Local Qwen | Gemini |
| --- | --- | --- |
| Chat | Current image, current TrOCR transcription, current machine translation, and recent chat turns | Current TrOCR transcription and recent chat turns |
| Compare transcription | Image only for the candidate transcription | Image only for the candidate transcription |
| Where the request runs | Local llama.cpp server on this computer | Google Gemini API |

The local Qwen chat prompt asks the model to answer from the supplied document sources and use the image to check uncertain OCR. It is instructed not to invent facts outside the source. Gemini chat is currently text-only: it receives the TrOCR transcription, not the image or machine translation. Gemini can still be selected for Compare transcription, which sends it the manuscript image.

## Source revisions and chat history

Transcription and translation are saved as versioned source material. Changing either one, regenerating a translation to different text, or accepting a comparison result that changes the transcription creates a new source revision. Existing chat messages remain in the database, but each message is tagged with the revision it used. The chat endpoint returns only messages for the current revision, and the local model receives only that current conversation history. An answer being generated when the source changes is rejected so it cannot be saved against outdated text.

Transcription history lets users inspect earlier versions and restore one. Restoring creates a new current revision, then Ultron refreshes the translation when possible.

## Option A: Run local Qwen3-VL

Local Qwen is the default provider. It runs through llama.cpp's OpenAI-compatible server.

### 1. Install llama.cpp

Follow the official [llama.cpp installation instructions](https://github.com/ggml-org/llama.cpp). The project currently uses the llama command that provides the serve subcommand.

macOS or Linux installation shortcut from the llama.cpp project:

    curl -LsSf https://llama.app/install.sh | sh

Windows PowerShell installation shortcut:

    irm https://llama.app/install.ps1 | iex

After installation, open a new terminal and check that llama is available:

    llama --help

### 2. Start the model server

In its own terminal, run:

    llama serve -hf Qwen/Qwen3-VL-4B-Instruct-GGUF:Q4_K_M --port 8080 --image-min-tokens 1024

The first start downloads the model and its multimodal image component. Leave this terminal running while using local chat or Compare transcription. The backend checks the server at http://127.0.0.1:9931/v1.

### 3. Start Ultron

In another terminal, start PostgreSQL and the backend, then start the frontend. The full steps are in the project README. In the chat provider selector, choose Local LLM. The setup dialog should show the provider as available once the model server is ready.

No API key is required for local Qwen.

### Optional local settings

Defaults are already set in backend/chat/local_provider.py. To change them, add the desired values to backend/.env:

    ULTRON_LLM_BASE_URL=http://127.0.0.1:9931/v1
    ULTRON_LLM_MODEL=Qwen/Qwen3-VL-4B-Instruct-GGUF:Q4_K_M
    ULTRON_LLM_TIMEOUT_SECONDS=180

Only localhost URLs are allowed for the local provider. If you change the port in the llama serve command, set ULTRON_LLM_BASE_URL to the matching port.

### Apple Silicon memory note

TrOCR and llama.cpp can both use Apple's Metal GPU and unified memory. On a Mac that reports Metal/MPS out-of-memory errors while uploading or running OCR, stop the llama server, upload the document, then start the llama server again for chat. This keeps the OCR and chat model from competing for GPU memory.

## Option B: Use Gemini

Gemini is optional and sends data to Google's API. Chat sends the transcription and recent chat turns. Compare transcription sends the manuscript image. Do not choose Gemini if the document must remain on the computer.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. From the project root, copy the example file.

   macOS or Linux:

       cp backend/.env.example backend/.env

   Windows PowerShell:

       Copy-Item backend/.env.example backend/.env

3. Open backend/.env and replace the placeholder:

       GEMINI_API_KEY=your-real-key

4. Save the file. The backend reads the key from backend/.env; select Gemini in the chat provider menu. The setup dialog can be used to check whether Gemini is configured.

Keep backend/.env private. It is ignored by Git. Never put the key in frontend code, commit it, or share it in screenshots. Google may apply account limits or charges depending on the account and usage.

If you need to choose a different Gemini model, add GEMINI_MODEL with the model name supported by your Google AI Studio project. The application uses its configured default if this setting is omitted.

## Compare transcription flow

Compare transcription is separate from the normal chat. Ultron sends the image to the selected provider and receives candidate line text and positions. It shows those candidates for review alongside TrOCR. Nothing replaces the saved transcription until the user accepts and saves the selected changes. If the saved text changes, Ultron advances the source revision and refreshes the translation.

Selecting Gemini sends the image to Google for this comparison. Selecting Local LLM keeps the image request on the local llama.cpp server.

## Troubleshooting

- **Local LLM is unavailable:** Start the llama serve command and wait until the server finishes loading. Confirm the command uses port 9931, or set ULTRON_LLM_BASE_URL to the port you selected.
- **The local model cannot process an image:** Use a multimodal Qwen3-VL GGUF that includes the image projector. The Hugging Face model used above provides the matching multimodal files.
- **Metal/MPS out-of-memory errors:** Stop llama.cpp while OCR is processing the upload, then restart it for chat.
- **Gemini is unavailable:** Check that backend/.env exists, the key is valid, and it was not left as your-key. Then use the provider selector's setup check.
- **Chat reflects an earlier source:** Save the transcription or translation edit and allow the page to refresh. Old turns are retained for history but are not sent as evidence for the new source revision.
- **Comparison cannot be saved:** If the transcription changed after comparison began, close the comparison and run it again so its candidates are based on the current text.
