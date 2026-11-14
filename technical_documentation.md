# Technical Dokumentation

 ## LLM Connection (Chat)

 The chat feature talks to a language model through one common interface. The backend does not depend on a specific provider. The endpoint is selected by the user in the settings, so it can be swapped without code changes.

 ### Supported endpoints
 | Endpoint | Use case | Data leaves the machine? |
 |---|---|---|
 | Local LLM (e.g. Ollama, LM Studio) | privacy, offline use | no |
 | Claude (Anthropic API) | cloud, high quality | yes |
 | ChatGPT (OpenAI API) | cloud, high quality | yes |

 ### Common interface
 All providers implement the same `ChatProvider` interface.


