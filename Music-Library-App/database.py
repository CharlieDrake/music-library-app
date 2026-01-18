import sqlite3
import os
from datetime import datetime


class Database:
    def __init__(self, db_path='music_library.db'):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Create songs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    artist TEXT DEFAULT 'Unknown Artist',
                    album TEXT,
                    duration INTEGER,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    file_type TEXT,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    play_count INTEGER DEFAULT 0,
                    last_played TIMESTAMP
                )
            ''')

            # Create playlists table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    song_count INTEGER DEFAULT 0
                )
            ''')

            # Create playlist_songs junction table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS playlist_songs (
                    playlist_id INTEGER,
                    song_id INTEGER,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    position INTEGER,
                    PRIMARY KEY (playlist_id, song_id),
                    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
                )
            ''')

            conn.commit()

    def add_song(self, title, artist, album, duration, file_path, file_size, file_type):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO songs (title, artist, album, duration, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (title, artist, album, duration, file_path, file_size, file_type))
            conn.commit()
            return cursor.lastrowid

    def get_all_songs(self, sort_by='title', order='ASC'):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(f'''
                SELECT * FROM songs
                ORDER BY {sort_by} {order}
            ''')
            return [dict(row) for row in cursor.fetchall()]

    def get_song(self, song_id):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM songs WHERE id = ?', (song_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def search_songs(self, query):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM songs
                WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
                ORDER BY title ASC
            ''', (f'%{query}%', f'%{query}%', f'%{query}%'))
            return [dict(row) for row in cursor.fetchall()]

    def update_play_count(self, song_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE songs
                SET play_count = play_count + 1, last_played = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (song_id,))
            conn.commit()

    def delete_song(self, song_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM playlist_songs WHERE song_id = ?', (song_id,))
            cursor.execute('DELETE FROM songs WHERE id = ?', (song_id,))
            conn.commit()
            return cursor.rowcount > 0

    def create_playlist(self, name, description=''):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO playlists (name, description)
                VALUES (?, ?)
            ''', (name, description))
            conn.commit()
            return cursor.lastrowid

    def get_all_playlists(self):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM playlists ORDER BY name ASC')
            return [dict(row) for row in cursor.fetchall()]

    def get_playlist(self, playlist_id):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM playlists WHERE id = ?', (playlist_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def delete_playlist(self, playlist_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM playlists WHERE id = ?', (playlist_id,))
            conn.commit()
            return cursor.rowcount > 0

    def add_song_to_playlist(self, playlist_id, song_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 1 FROM playlist_songs
                WHERE playlist_id = ? AND song_id = ?
            ''', (playlist_id, song_id))

            if cursor.fetchone():
                return False

            cursor.execute('''
                SELECT COALESCE(MAX(position), 0) + 1
                FROM playlist_songs
                WHERE playlist_id = ?
            ''', (playlist_id,))
            position = cursor.fetchone()[0]

            cursor.execute('''
                INSERT INTO playlist_songs (playlist_id, song_id, position)
                VALUES (?, ?, ?)
            ''', (playlist_id, song_id, position))

            cursor.execute('''
                UPDATE playlists
                SET song_count = song_count + 1
                WHERE id = ?
            ''', (playlist_id,))

            conn.commit()
            return True

    def remove_song_from_playlist(self, playlist_id, song_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM playlist_songs
                WHERE playlist_id = ? AND song_id = ?
            ''', (playlist_id, song_id))

            cursor.execute('''
                UPDATE playlists
                SET song_count = song_count - 1
                WHERE id = ?
            ''', (playlist_id,))

            cursor.execute('''
                UPDATE playlist_songs
                SET position = position - 1
                WHERE playlist_id = ? AND position > (
                    SELECT position FROM playlist_songs
                    WHERE playlist_id = ? AND song_id = ?
                )
            ''', (playlist_id, playlist_id, song_id))

            conn.commit()
            return cursor.rowcount > 0

    def get_playlist_songs(self, playlist_id):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT s.*, ps.position
                FROM songs s
                JOIN playlist_songs ps ON s.id = ps.song_id
                WHERE ps.playlist_id = ?
                ORDER BY ps.position
            ''', (playlist_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_library_stats(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('SELECT COUNT(*) FROM songs')
            total_songs = cursor.fetchone()[0]

            cursor.execute('SELECT COUNT(*) FROM playlists')
            total_playlists = cursor.fetchone()[0]

            cursor.execute('SELECT COALESCE(SUM(file_size), 0) FROM songs')
            total_storage = cursor.fetchone()[0]

            cursor.execute('''
                SELECT title, artist, play_count
                FROM songs
                ORDER BY play_count DESC
                LIMIT 5
            ''')
            most_played = cursor.fetchall()

            return {
                'total_songs': total_songs,
                'total_playlists': total_playlists,
                'total_storage': total_storage,
                'most_played': most_played
            }
