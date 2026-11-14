# Ultron - Historical Manuscripts Analysis and Transcription Tool.

 ## Overview
 Ultron is a web application that makes historical (medieval) manuscripts easier to read and understand.
 A user uploads a photo of a manuscript page; Ultron transcribes the handwriting, translates the text into English and lets the user review, correct and ask questions about the document.

 Developed in the course *Advanced Software Engineering* (HS2026) by Elisa, Hans, Jules, Richmond, Valery and Viola.

## Problem and Motivation
Medieval manuscripts are hard to read: unusual scripts, abbreviations and historical languages. Reading them takes expert knowledge and a lot of time.
Ultron lowers this barrier by automating transcription and translation, while keeping the results editable.

 ## Language Focus
 Ultron focuses on medieval manuscripts written in **Castilian** and **Latin**.
 These two languages define the scope of the project.

  ## Objectives
 - Provide an end-to-end workflow: upload → transcribe → translate → review.
 - Reach usable transcription and translation quality for Castilian and Latin manuscripts.
 - Keep the human in the loop: every result can be corrected manually.
 - Let users explore a document by asking questions about it, with full control over where their data goes (local or cloud LLM).

 - ## Features
 - **Upload** a photo of a manuscript page.
 - **Transcription** of the handwritten text.
 - **Translation** into English, started automatically after upload.
 - **Records overview** of all uploaded manuscripts.
 - **Detail view** with zoomable original image, transcription and translation.
 - **Edit mode** to rename a record and correct transcription and translation.
 - **Chat** about a document (in progress, currently mocked). Users choose the LLM endpoint themselves in an interface:
   - a **local LLM**, so everything stays within the project and no data leaves the user's machine, or
   - an interface to a cloud provider such as **Claude** or **ChatGPT**.
  

 ## Scope
 In scope: single-page images, Castilian and Latin, transcription and English translation.
 Out of scope (for now): user accounts, multi-page manuscripts, deployment/hosting.

 ## More Information
 Setup and usage: see [README.md](README.md). Technical details: see the technical documentation.
