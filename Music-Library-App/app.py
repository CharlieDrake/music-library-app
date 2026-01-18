from flask import Flask, request, jsonify, send_file, render_template, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import json
from datetime import datetime
from database import Database
import mimetypes
import time

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'mp3', 'mp4', 'm4a', 'wav', 'flac', 'ogg'}

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db = Database()


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def format_file_size(size_in_bytes):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.2f} TB"


def get_song_duration(file_path):
    """Get duration of audio file"""
    try:
        # For production, use mutagen library
        # from mutagen import File
        # audio = File(file_path)
        # return audio.info.length if audio else 180
        return 180  # Default 3 minutes
    except:
        return 180

# Routes


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/songs', methods=['GET'])
def get_songs():
    sort_by = request.args.get('sort_by', 'title')
    order = request.args.get('order', 'ASC')

    allowed_sort_columns = ['title', 'artist', 'album', 'duration', 'uploaded_at', 'play_count']
    if sort_by not in allowed_sort_columns:
        sort_by = 'title'

    if order not in ['ASC', 'DESC']:
        order = 'ASC'

    songs = db.get_all_songs(sort_by, order)

    for song in songs:
        if song['file_size']:
            song['file_size_display'] = format_file_size(song['file_size'])

        if song['file_path']:
            song['file_url'] = f"/uploads/{song['file_path']}"

    return jsonify(songs)


@app.route('/api/songs/<int:song_id>', methods=['GET'])
def get_song(song_id):
    song = db.get_song(song_id)
    if song:
        if song['file_size']:
            song['file_size_display'] = format_file_size(song['file_size'])

        if song['file_path']:
            song['file_url'] = f"/uploads/{song['file_path']}"

        return jsonify(song)
    return jsonify({'error': 'Song not found'}), 404


@app.route('/api/songs/search', methods=['GET'])
def search_songs():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])

    songs = db.search_songs(query)

    for song in songs:
        if song['file_size']:
            song['file_size_display'] = format_file_size(song['file_size'])

        if song['file_path']:
            song['file_url'] = f"/uploads/{song['file_path']}"

    return jsonify(songs)


@app.route('/api/songs/upload', methods=['POST'])
def upload_song():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    try:
        original_filename = secure_filename(file.filename)
        filename, ext = os.path.splitext(original_filename)

        timestamp = int(time.time())
        unique_filename = f"{filename}_{timestamp}{ext}"

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)

        file_size = os.path.getsize(file_path)
        file_type = mimetypes.guess_type(unique_filename)[0] or 'audio/mpeg'
        duration = get_song_duration(file_path)

        title = filename.replace('_', ' ').title()
        artist = 'Unknown Artist'
        album = ''

        song_id = db.add_song(
            title=title,
            artist=artist,
            album=album,
            duration=duration,
            file_path=unique_filename,
            file_size=file_size,
            file_type=file_type
        )

        return jsonify({
            'success': True,
            'song_id': song_id,
            'message': 'File uploaded successfully',
            'file_url': f"/uploads/{unique_filename}"
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/songs/<int:song_id>/play', methods=['GET'])
def play_song(song_id):
    song = db.get_song(song_id)

    if not song:
        return jsonify({'error': 'Song not found'}), 404

    db.update_play_count(song_id)

    filename = song['file_path']
    if not filename:
        return jsonify({'error': 'File not found'}), 404

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404

    mime_type = song['file_type'] or 'audio/mpeg'

    return send_file(
        file_path,
        mimetype=mime_type,
        as_attachment=False,
        conditional=True
    )


@app.route('/api/songs/<int:song_id>', methods=['DELETE'])
def delete_song(song_id):
    song = db.get_song(song_id)

    if not song:
        return jsonify({'error': 'Song not found'}), 404

    try:
        if song['file_path']:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], song['file_path'])
            if os.path.exists(file_path):
                os.remove(file_path)

        success = db.delete_song(song_id)

        if success:
            return jsonify({'success': True, 'message': 'Song deleted successfully'})
        else:
            return jsonify({'error': 'Failed to delete song'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/playlists', methods=['GET'])
def get_playlists():
    playlists = db.get_all_playlists()
    return jsonify(playlists)


@app.route('/api/playlists', methods=['POST'])
def create_playlist():
    data = request.get_json()

    if not data or 'name' not in data:
        return jsonify({'error': 'Playlist name is required'}), 400

    name = data['name']
    description = data.get('description', '')

    playlist_id = db.create_playlist(name, description)

    return jsonify({
        'success': True,
        'playlist_id': playlist_id,
        'message': 'Playlist created successfully'
    })


@app.route('/api/playlists/<int:playlist_id>', methods=['GET'])
def get_playlist(playlist_id):
    playlist = db.get_playlist(playlist_id)

    if not playlist:
        return jsonify({'error': 'Playlist not found'}), 404

    songs = db.get_playlist_songs(playlist_id)

    for song in songs:
        if song['file_size']:
            song['file_size_display'] = format_file_size(song['file_size'])

        if song['file_path']:
            song['file_url'] = f"/uploads/{song['file_path']}"

    playlist['songs'] = songs
    return jsonify(playlist)


@app.route('/api/playlists/<int:playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    success = db.delete_playlist(playlist_id)

    if success:
        return jsonify({'success': True, 'message': 'Playlist deleted successfully'})
    else:
        return jsonify({'error': 'Playlist not found'}), 404


@app.route('/api/playlists/<int:playlist_id>/songs/<int:song_id>', methods=['POST'])
def add_song_to_playlist(playlist_id, song_id):
    success = db.add_song_to_playlist(playlist_id, song_id)

    if success:
        return jsonify({'success': True, 'message': 'Song added to playlist'})
    else:
        return jsonify({'error': 'Song already in playlist'}), 400


@app.route('/api/playlists/<int:playlist_id>/songs/<int:song_id>', methods=['DELETE'])
def remove_song_from_playlist(playlist_id, song_id):
    success = db.remove_song_from_playlist(playlist_id, song_id)

    if success:
        return jsonify({'success': True, 'message': 'Song removed from playlist'})
    else:
        return jsonify({'error': 'Song not in playlist'}), 404


@app.route('/api/library/stats', methods=['GET'])
def get_library_stats():
    stats = db.get_library_stats()
    return jsonify(stats)

# Error handlers


@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 200MB'}), 413


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    db.init_db()
    print("Starting Music Library Server...")
    print("Access the application at: http://localhost:5000")
    print("Upload folder:", app.config['UPLOAD_FOLDER'])
    app.run(host='0.0.0.0', port=5000, debug=True)
