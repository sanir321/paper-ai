import os
import sys
from dotenv import load_dotenv

load_dotenv()

EXPERIENTIAL_API_KEY = os.environ.get("EXPERIENTIAL_API_KEY", "")
EXPERIENTIAL_BASE_URL = os.environ.get("EXPERIENTIAL_BASE_URL", "https://api.kilo.ai/api/gateway")
LLM_MODEL = os.environ.get("LLM_MODEL", "kilo-auto/free")
MAX_FILE_SIZE = 10 * 1024 * 1024

if not EXPERIENTIAL_API_KEY:
    print("INFO: No API key set. Using Kilo Auto Free (anonymous, rate-limited).", file=sys.stderr)
