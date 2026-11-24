# Technical Dokumentation

 ## LLM Connection (Chat)

 The chat feature talks to a language model through one common interface. The backend does not depend on a specific provider. The endpoint is selected by the user in the settings, so it can be swapped without code changes.

 ### Supported endpoints
 | Endpoint | Use case | Data leaves the machine? |
 |---|---|---|
 | Local LLM (e.g. Ollama, LM Studio) | privacy, offline use | no |
 | Gemini (Google AI Studio API) | cloud | yes |

 Further endpoints (e.g. Claude, ChatGPT) can be added later as additional providers without changing the rest of the backend.

 ### Common interface
 All providers implement the same `ChatProvider` interface (`backend/chat/base.py`):

 | Element | Purpose |
 |---|---|
 | `ChatProvider` | Abstract base class every provider implements |
 | `ChatProvider.name` | Registry key (e.g. `"gemini"`). Label and setup steps are in `backend/chat/providers.toml` |
 | `ChatProvider.is_configured()` | Class method: is the provider usable (API key / server URL set)? Callable without creating a client |
 | `ChatProvider.reply(history, system_prompt)` | Returns the assistant's answer; the last item of `history` is the new user message, `system_prompt` holds the document context |
 | `ChatProvider.transcribe(image_path)` | Optional: returns the provider's own transcription of the image as lines with positions. Gemini and the local LLM support it |
 | `ProviderMessage` | Provider-neutral message (`role`: `user` or `assistant`, `content`) |
 | `ProviderInfo` | `name`, `label`, `available`, `external`, `setup` for the provider list in the UI |
 | `ChatProviderError` | Single error type; each provider translates SDK/HTTP errors into it |

 The API layer only knows this interface. Switching the endpoint means choosing another registered provider by name.

 ### Adding a provider
 1. Write a class implementing `ChatProvider` (`name`, `is_configured()`, `reply()`, optionally `transcribe()`).
 2. Add it to `PROVIDER_CLASSES` in `backend/chat/registry.py`.
 3. Add an entry to `backend/chat/providers.toml`: `label`, `external` (does document content leave the computer?) and `setup` (`title`, `steps`, optionally `link`, `copy_line`, `placeholder`).

 Nothing else changes: `GET /chat/providers` lists it, the chat dropdown shows it, and its setup dialog is built from the config. The backend refuses to start if a class has no config entry or the other way round.

 ### Gemini provider
 Gemini is connected through Google AI Studio (https://aistudio.google.com/docs/get-started).

 - **API key:** created in Google AI Studio (https://aistudio.google.com/apikey). New users get a project and key automatically; a free tier exists (limits not checked yet, billing raises rate limits). The key is set via the environment variable `GEMINI_API_KEY` or in `backend/.env`. The environment takes precedence. The file is read on every call, so a new key works without a restart. `backend/.env.example` is the committed template; its placeholder `your-key` counts as no key.
 - **SDK:** Python package `google-genai` (`from google import genai`, `client = genai.Client(api_key=...)`; a client is created per request with the current key).
 - **API:** the current documentation uses the Interactions API (`client.interactions.create(model=..., input=...)`) and reads the answer from `interaction.output_text`. The system prompt is passed as `system_instruction`. For the chat it is `CHAT_PROMPT` plus the OCR text: answer the message, transcribe only if asked.
 - **Conversation history:** our backend already stores every message in the database, so the provider runs stateless (`store=False`) and sends the full history on every call. History entries are steps with a `type` (e.g. `user_input` with a `content` list of text parts) instead of a `role`. Mapping `ProviderMessage` to these steps is the job of `GeminiProvider`, not of the API layer.
 - **Model:** configured via `GEMINI_MODEL` (the examples in the documentation use `gemini-4-hydrogen`).
 - **Errors:** all SDK errors (invalid key, quota, network) are translated into `ChatProviderError`. The API returns them as 503 with the reason in `detail`, with the key redacted, and the UI shows that reason.
 - **Security:** same rule as for every cloud provider: the key lives only in the backend and is never sent to or stored in the browser. Requests always go browser → our backend → Gemini.

 ### Provider setup
 `GET /chat/providers` returns `default` and, for each provider, `name`, `label`, `available`, `external` and `setup` (never credentials). `available` means: Gemini has a key (not necessarily a valid one), the local model server answers on `/models` within one second. If it is false, the UI opens the provider's setup dialog instead of selecting it.

 ### Compare transcription
 `POST /historical_records/{id}/compare-transcription` with `{"provider": "local"}` or `{"provider": "gemini"}` sends the source image (upright JPEG, at most 2048 px per side) and a fixed prompt to the provider. The OCR text, translation, file name and chat history are not sent, so the result is independent of the OCR.

 - The model answers in JSON with the text and box of each written line (same schema for both providers; the local server gets it as an OpenAI `json_schema` response format). The backend matches these lines to the current ones by position (`backend/transcription_review.py`), because the OCR may merge several lines into one. If the boxes no longer fit the text (after a manual edit that changed the number of lines), the whole text is one row.
 - The endpoint returns `current_text`, `rows` (`current`, `proposed`) and `image` (stored file name, width, height) and saves nothing. On failure it returns 404 (no record or image) or 503 (provider error).
 - The UI shows a bar in the chat with View diff and Discard. View diff opens "Review transcription": a table with the current version on the left, the proposal on the right and the result in the middle. The result column shows the part of the page of each row (all boxes of the row plus a small margin, the whole page if the positions are unknown); the version chosen with the arrows, or "Both", appears below it and can be undone. Unresolved rows keep the current text. An unsaved review is lost on page reload.
 - "Overwrite transcription" replaces `extracted_text` and the line boxes through `PUT /historical_records/{id}` and then translates again. There are no versions and no undo. `expected_text` makes the update fail with 409 if the transcription was edited during the review.
 - **Privacy:** the provider selected in the chat is used. With the local LLM the image stays on the machine, with Gemini it is sent to Google.

 To verify during implementation: exact structure of the model's answer steps in stateless mode, exact placement of `system_instruction`, and the free-tier limits.
