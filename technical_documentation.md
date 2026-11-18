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
 | `ChatProvider.name`, `ChatProvider.label` | Registry key (e.g. `"gemini"`) and display name for the UI |
 | `ChatProvider.is_configured()` | Class method: is the provider usable (API key / server URL set)? Callable without creating a client |
 | `ChatProvider.reply(history, system_prompt)` | Returns the assistant's answer; the last item of `history` is the new user message, `system_prompt` holds the document context |
 | `ProviderMessage` | Provider-neutral message (`role`: `user` or `assistant`, `content`) |
 | `ProviderInfo` | `name`, `label`, `available` for the provider list in the UI |
 | `ChatProviderError` | Single error type; each provider translates SDK/HTTP errors into it |

 The API layer only knows this interface. Switching the endpoint means choosing another registered provider by name. Adding an endpoint means one new class implementing `ChatProvider` plus one registry entry.

 ### Gemini provider
 Gemini is connected through Google AI Studio (https://aistudio.google.com/docs/get-started).

 - **API key:** created in Google AI Studio (https://aistudio.google.com/apikey). New users get a project and key automatically; a free tier exists (limits not checked yet, billing raises rate limits). The key is set via the environment variable `GEMINI_API_KEY`.
 - **SDK:** Python package `google-genai` (`from google import genai`, `client = genai.Client()`; the client reads `GEMINI_API_KEY`).
 - **API:** the current documentation uses the Interactions API (`client.interactions.create(model=..., input=...)`) and reads the answer from `interaction.output_text`. The system prompt is passed as `system_instruction`.
 - **Conversation history:** our backend already stores every message in the database, so the provider runs stateless (`store=False`) and sends the full history on every call. History entries are steps with a `type` (e.g. `user_input` with a `content` list of text parts) instead of a `role`. Mapping `ProviderMessage` to these steps is the job of `GeminiProvider`, not of the API layer.
 - **Model:** configured via `GEMINI_MODEL` (the examples in the documentation use `gemini-4-hydrogen`).
 - **Errors:** all SDK errors (invalid key, quota, network) are translated into `ChatProviderError`.
 - **Security:** same rule as for every cloud provider: the key lives only in the backend and is never sent to or stored in the browser. Requests always go browser → our backend → Gemini.

 To verify during implementation: exact structure of the model's answer steps in stateless mode, exact placement of `system_instruction`, and the free-tier limits.
