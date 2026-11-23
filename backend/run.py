import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
ML_DIR = BACKEND_DIR / "diabetes_ml"
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

import uvicorn
from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

try:
    from .diabetes_ml.api import app
except ImportError:
    from api import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
