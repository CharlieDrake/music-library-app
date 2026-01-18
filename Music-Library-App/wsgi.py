import sys
import os

# Add your project directory to the sys.path
project_home = '/home/YourUsername/music-library-app'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set environment variable to use our app
os.environ['PYTHONPATH'] = project_home

# Import the Flask app
from app import app as application
