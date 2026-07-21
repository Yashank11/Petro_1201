"""
Test script to verify Gemini API key is working
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ ERROR: GEMINI_API_KEY not found in .env file")
    exit(1)

print(f"✓ Found API key: {GEMINI_API_KEY[:20]}...")

# Test the key
try:
    from google import genai
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # Try a simple API call
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents="Say 'Hello, Gemini API is working!'"
    )
    
    print("✓ API Key is VALID ✓")
    print(f"Response: {response.text}")
    
except ImportError:
    print("❌ ERROR: google-genai package not installed")
    print("Install it with: pip install google-genai")
    exit(1)
    
except Exception as e:
    print(f"❌ ERROR: API Key is INVALID or API call failed")
    print(f"Details: {str(e)}")
    exit(1)
