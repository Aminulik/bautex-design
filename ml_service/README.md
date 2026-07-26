# ML SegFormer Service

Local FastAPI service for wall segmentation in the visualization pipeline.

Pipeline:

```text
photo -> SegFormer B0 ADE20K -> wall mask PNG -> Express /api/visualize -> wallpaper composite
```

## Setup

Create and activate a Python virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```bash
python -m pip install -r ml_service/requirements.txt
```

Run the service:

```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --app-dir ml_service
```

Then set in `server/.env`:

```env
SEGFORMER_API_URL=http://localhost:8000/segment/wall
```

Restart the Express backend after changing `.env`.

## Endpoints

- `GET /health` - service status and model load state.
- `POST /segment/wall` - accepts multipart `photo`, returns `image/png` mask.

The mask convention is white pixels for wall area and black pixels for everything else.
