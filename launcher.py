import sys
import logging
import webbrowser
import time
import threading
from app import app, socketio

# Unbuffered output
sys.stdout = open(sys.stdout.fileno(), mode='w', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', buffering=1)

# Configure logging to show Flask & SocketIO startup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)

def open_browsers():
    """Open browser window after server starts"""
    time.sleep(2)
    log.info("Opening browser window...")
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    log.info("Starting Flask Chat App...")
    
    # Start opening browsers in background thread
    browser_thread = threading.Thread(target=open_browsers, daemon=True)
    browser_thread.start()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
