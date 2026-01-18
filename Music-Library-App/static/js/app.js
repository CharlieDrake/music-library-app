// Music Library Application - Frontend JavaScript
let musicLibrary = null;

class MusicLibrary {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.isRepeated = false;
        this.currentPlaylist = 'all';
        this.songs = [];
        this.playlists = [];
        this.filteredSongs = [];
        this.currentSongForPlaylist = null;
        this.currentVolume = 80;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('Initializing Music Library...');

        try {
            // Initialize DOM elements
            this.cacheDomElements();
            this.bindEvents();

            // Load initial data
            await this.loadLibraryStats();
            await this.loadPlaylists();
            await this.loadSongs();

            // Set initial volume
            this.audioPlayer.volume = this.currentVolume / 100;

            console.log('Music Library initialized successfully');

            // Hide loading indicator
            this.hideLoadingIndicator();

            // Show welcome notification
            setTimeout(() => {
                this.showNotification('Music Library Ready! Upload songs to get started.');
            }, 1000);

        } catch (error) {
            console.error('Failed to initialize Music Library:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 300);
        }
    }

    cacheDomElements() {
        console.log('Caching DOM elements...');

        // Audio player
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playIcon = document.getElementById('playIcon');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progress = document.getElementById('progress');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volumeSlider');

        // Song info
        this.currentSongTitle = document.getElementById('currentSongTitle');
        this.currentSongArtist = document.getElementById('currentSongArtist');
        this.currentSongAlbum = document.getElementById('currentSongAlbum');
        this.currentSongDuration = document.getElementById('currentSongDuration');
        this.currentSongPlays = document.getElementById('currentSongPlays');
        this.albumArt = document.getElementById('albumArt');

        // Tables and lists
        this.songsTableBody = document.getElementById('songsTableBody');
        this.playlistList = document.getElementById('playlistList');
        this.songsListTitle = document.getElementById('songsListTitle');

        // Search and sort
        this.searchBox = document.getElementById('searchBox');
        this.searchBtn = document.getElementById('searchBtn');
        this.sortSelect = document.getElementById('sortSelect');

        // Buttons
        this.uploadBtn = document.getElementById('uploadBtn');
        this.uploadBtn2 = document.getElementById('uploadBtn2');
        this.createPlaylistBtn = document.getElementById('createPlaylistBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');

        // Modals
        this.uploadModal = document.getElementById('uploadModal');
        this.playlistModal = document.getElementById('playlistModal');
        this.addToPlaylistModal = document.getElementById('addToPlaylistModal');
        this.closeUploadModal = document.getElementById('closeUploadModal');
        this.closePlaylistModal = document.getElementById('closePlaylistModal');
        this.closeAddToPlaylistModal = document.getElementById('closeAddToPlaylistModal');

        // Forms
        this.uploadForm = document.getElementById('uploadForm');
        this.playlistForm = document.getElementById('playlistForm');
        this.fileInput = document.getElementById('fileInput');
        this.playlistSelect = document.getElementById('playlistSelect');
        this.addToPlaylistSelect = document.getElementById('addToPlaylistSelect');

        // Progress
        this.uploadProgress = document.getElementById('uploadProgress');
        this.uploadProgressBar = document.getElementById('uploadProgressBar');
        this.uploadProgressText = document.getElementById('uploadProgressText');
        this.uploadSubmitBtn = document.getElementById('uploadSubmitBtn');

        // Confirmation buttons
        this.confirmAddToPlaylist = document.getElementById('confirmAddToPlaylist');
        this.cancelAddToPlaylist = document.getElementById('cancelAddToPlaylist');

        // Navigation
        this.navLinks = document.getElementById('navLinks');

        // Stats
        this.totalSongsEl = document.getElementById('totalSongs');
        this.totalPlaylistsEl = document.getElementById('totalPlaylists');
        this.storageUsedEl = document.getElementById('storageUsed');
        this.currentPlaylistEl = document.getElementById('currentPlaylist');

        // Notification
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notificationText');

        console.log('DOM elements cached successfully');
    }

    bindEvents() {
        console.log('Binding events...');

        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());

        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seekSong(e));

        // Volume control
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Audio player events
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioPlayer.addEventListener('ended', () => this.onSongEnded());
        this.audioPlayer.addEventListener('error', (e) => this.handleAudioError(e));

        // Navigation
        this.uploadBtn.addEventListener('click', () => this.openModal(this.uploadModal));
        this.uploadBtn2.addEventListener('click', () => this.openModal(this.uploadModal));
        this.createPlaylistBtn.addEventListener('click', () => this.openModal(this.playlistModal));
        this.refreshBtn.addEventListener('click', () => this.refreshLibrary());
        this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());

        // Search and sort
        this.searchBox.addEventListener('input', () => this.searchSongs());
        this.searchBtn.addEventListener('click', () => this.searchSongs());
        this.sortSelect.addEventListener('change', () => this.loadSongs());

        // Modal close buttons
        this.closeUploadModal.addEventListener('click', () => this.closeModal(this.uploadModal));
        this.closePlaylistModal.addEventListener('click', () => this.closeModal(this.playlistModal));
        this.closeAddToPlaylistModal.addEventListener('click', () => this.closeModal(this.addToPlaylistModal));

        // Forms
        this.uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpload(e);
        });

        this.playlistForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreatePlaylist(e);
        });

        // Playlist actions
        this.confirmAddToPlaylist.addEventListener('click', () => this.confirmAddToPlaylistAction());
        this.cancelAddToPlaylist.addEventListener('click', () => this.closeModal(this.addToPlaylistModal));

        console.log('Events bound successfully');
    }

    async loadLibraryStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/library/stats`);
            if (response.ok) {
                const stats = await response.json();
                this.updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error('Error loading library stats:', error);
        }
    }

    updateStatsDisplay(stats) {
        this.totalSongsEl.textContent = stats.total_songs;
        this.totalPlaylistsEl.textContent = stats.total_playlists;

        // Format storage
        const storageMB = stats.total_storage / (1024 * 1024);
        if (storageMB < 1024) {
            this.storageUsedEl.textContent = `${storageMB.toFixed(2)} MB`;
        } else {
            this.storageUsedEl.textContent = `${(storageMB / 1024).toFixed(2)} GB`;
        }
    }

    async loadPlaylists() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/playlists`);
            if (response.ok) {
                this.playlists = await response.json();
                this.renderPlaylists();
                this.updatePlaylistSelects();
            }
        } catch (error) {
            console.error('Error loading playlists:', error);
            this.showNotification('Failed to load playlists', 'error');
        }
    }

    renderPlaylists() {
        this.playlistList.innerHTML = '';

        // Add "All Songs" playlist
        const allSongsItem = this.createPlaylistItem({
            id: 'all',
            name: 'All Songs',
            song_count: this.songs.length
        }, true);
        this.playlistList.appendChild(allSongsItem);

        // Add user playlists
        this.playlists.forEach(playlist => {
            const playlistItem = this.createPlaylistItem(playlist, false);
            this.playlistList.appendChild(playlistItem);
        });
    }

    createPlaylistItem(playlist, isAllSongs) {
        const li = document.createElement('li');
        li.className = `playlist-item ${this.currentPlaylist === playlist.id.toString() ? 'active' : ''}`;
        li.dataset.id = playlist.id;

        if (isAllSongs) {
            li.innerHTML = `
                <span>${playlist.name}</span>
                <span class="playlist-item-count">${playlist.song_count}</span>
            `;
            li.addEventListener('click', () => this.switchPlaylist('all'));
        } else {
            li.innerHTML = `
                <span>${playlist.name}</span>
                <span class="playlist-item-count">${playlist.song_count}</span>
                <div class="playlist-actions">
                    <button class="playlist-action-btn delete" data-id="${playlist.id}" title="Delete Playlist">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.playlist-action-btn')) {
                    this.switchPlaylist(playlist.id.toString());
                }
            });

            const deleteBtn = li.querySelector('.playlist-action-btn.delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePlaylist(playlist.id);
            });
        }

        return li;
    }

    updatePlaylistSelects() {
        this.playlistSelect.innerHTML = '<option value="">Select a playlist</option>';
        this.addToPlaylistSelect.innerHTML = '<option value="">Select a playlist</option>';

        this.playlists.forEach(playlist => {
            const option1 = document.createElement('option');
            option1.value = playlist.id;
            option1.textContent = playlist.name;
            this.playlistSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = playlist.id;
            option2.textContent = playlist.name;
            this.addToPlaylistSelect.appendChild(option2);
        });
    }

    async loadSongs() {
        try {
            const sortBy = this.sortSelect.value;
            const response = await fetch(`${this.apiBaseUrl}/api/songs?sort_by=${sortBy}&order=ASC`);
            if (response.ok) {
                this.songs = await response.json();
                this.filteredSongs = [...this.songs];
                this.renderSongs();

                // Update "All Songs" count
                const allSongsCount = document.querySelector('.playlist-item[data-id="all"] .playlist-item-count');
                if (allSongsCount) {
                    allSongsCount.textContent = this.songs.length;
                }
            }
        } catch (error) {
            console.error('Error loading songs:', error);
            this.showNotification('Failed to load songs', 'error');
        }
    }

    renderSongs() {
        this.songsTableBody.innerHTML = '';

        if (this.filteredSongs.length === 0) {
            this.songsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 50px;">
                        <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 20px; display: block; color: var(--gray-color);"></i>
                        <p style="font-size: 1.1rem; color: var(--gray-color);">
                            ${this.currentPlaylist === 'all' ?
                                'No songs in library. Upload some music to get started!' :
                                'No songs in this playlist. Add some songs to get started!'}
                        </p>
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredSongs.forEach((song, index) => {
            const row = this.createSongRow(song, index);
            this.songsTableBody.appendChild(row);
        });
    }

    createSongRow(song, index) {
        const row = document.createElement('tr');
        row.className = `song-row ${this.currentSongIndex === index && this.isPlaying ? 'playing' : ''}`;

        // Format duration
        const duration = this.formatTime(song.duration || 0);

        // Create action buttons based on context
        let actionButtons = '';
        if (this.currentPlaylist === 'all') {
            actionButtons = `
                <button class="action-btn play" data-index="${index}" title="Play">
                    <i class="fas fa-play"></i>
                </button>
                <button class="action-btn add-to-playlist" data-id="${song.id}" title="Add to Playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="action-btn delete" data-id="${song.id}" title="Delete Song">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        } else {
            actionButtons = `
                <button class="action-btn play" data-index="${index}" title="Play">
                    <i class="fas fa-play"></i>
                </button>
                <button class="action-btn remove-from-playlist" data-id="${song.id}" title="Remove from Playlist">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="action-btn delete" data-id="${song.id}" title="Delete Song">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="song-title">${song.title}</div>
                ${song.file_size_display ? `<div class="song-size">${song.file_size_display}</div>` : ''}
            </td>
            <td>${song.artist || 'Unknown Artist'}</td>
            <td>${song.album || '-'}</td>
            <td>${duration}</td>
            <td>${song.play_count || 0}</td>
            <td>
                <div class="song-actions">
                    ${actionButtons}
                </div>
            </td>
        `;

        // Add event listeners
        const playBtn = row.querySelector('.action-btn.play');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playSong(index);
        });

        if (this.currentPlaylist === 'all') {
            const addBtn = row.querySelector('.action-btn.add-to-playlist');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAddToPlaylistDialog(song.id);
            });
        } else {
            const removeBtn = row.querySelector('.action-btn.remove-from-playlist');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeSongFromPlaylist(song.id);
            });
        }

        const deleteBtn = row.querySelector('.action-btn.delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSong(song.id);
        });

        // Play on row click
        row.addEventListener('click', () => this.playSong(index));

        return row;
    }

    async playSong(index) {
        if (this.filteredSongs.length === 0) return;

        this.currentSongIndex = index;
        const song = this.filteredSongs[index];

        try {
            // Update UI
            this.updateNowPlaying(song);

            // Play the song
            const audioUrl = `${this.apiBaseUrl}/api/songs/${song.id}/play`;
            this.audioPlayer.src = audioUrl;

            // Update play count
            await fetch(`${this.apiBaseUrl}/api/songs/${song.id}/play`, {
                method: 'POST'
            });

            this.audioPlayer.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updatePlayPauseButton();
                    this.renderSongs();
                })
                .catch(error => {
                    console.error('Playback error:', error);
                    this.showNotification('Failed to play song', 'error');
                });

        } catch (error) {
            console.error('Error playing song:', error);
            this.showNotification('Failed to play song', 'error');
        }
    }

    updateNowPlaying(song) {
        this.currentSongTitle.textContent = song.title;
        this.currentSongArtist.textContent = song.artist || 'Unknown Artist';
        this.currentSongAlbum.textContent = song.album || 'Unknown Album';
        this.currentSongDuration.textContent = this.formatTime(song.duration || 0);
        this.currentSongPlays.textContent = `${song.play_count || 0} plays`;

        // Update album art with gradient based on song title hash
        const hash = this.hashString(song.title);
        const hue = hash % 360;
        this.albumArt.style.background = `linear-gradient(45deg, hsl(${hue}, 70%, 50%), hsl(${hue + 60}, 70%, 50%))`;
        this.albumArt.innerHTML = `<i class="fas fa-music"></i>`;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    }

    togglePlayPause() {
        if (this.filteredSongs.length === 0) return;

        if (this.audioPlayer.paused) {
            if (!this.audioPlayer.src) {
                this.playSong(0);
            } else {
                this.audioPlayer.play()
                    .then(() => {
                        this.isPlaying = true;
                        this.updatePlayPauseButton();
                        this.renderSongs();
                    })
                    .catch(error => {
                        console.error('Playback error:', error);
                        this.showNotification('Failed to play song', 'error');
                    });
            }
        } else {
            this.audioPlayer.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton();
            this.renderSongs();
        }
    }

    updatePlayPauseButton() {
        if (this.isPlaying) {
            this.playIcon.className = 'fas fa-pause';
        } else {
            this.playIcon.className = 'fas fa-play';
        }
    }

    playPrevious() {
        if (this.filteredSongs.length === 0) return;

        this.currentSongIndex--;
        if (this.currentSongIndex < 0) {
            this.currentSongIndex = this.filteredSongs.length - 1;
        }

        this.playSong(this.currentSongIndex);
    }

    playNext() {
        if (this.filteredSongs.length === 0) return;

        if (this.isShuffled) {
            this.currentSongIndex = Math.floor(Math.random() * this.filteredSongs.length);
        } else {
            this.currentSongIndex++;
            if (this.currentSongIndex >= this.filteredSongs.length) {
                this.currentSongIndex = 0;
            }
        }

        this.playSong(this.currentSongIndex);
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.style.color = this.isShuffled ? 'var(--accent-color)' : 'var(--light-color)';
        this.showNotification(this.isShuffled ? 'Shuffle enabled' : 'Shuffle disabled');
    }

    toggleRepeat() {
        this.isRepeated = !this.isRepeated;
        this.repeatBtn.style.color = this.isRepeated ? 'var(--accent-color)' : 'var(--light-color)';
        this.showNotification(this.isRepeated ? 'Repeat enabled' : 'Repeat disabled');
    }

    seekSong(e) {
        if (!this.audioPlayer.duration) return;

        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audioPlayer.currentTime = percent * this.audioPlayer.duration;
    }

    updateProgress() {
        if (this.audioPlayer.duration) {
            const percent = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            this.progress.style.width = `${percent}%`;
            this.currentTimeEl.textContent = this.formatTime(this.audioPlayer.currentTime);
        }
    }

    updateDuration() {
        if (this.audioPlayer.duration) {
            this.durationEl.textContent = this.formatTime(this.audioPlayer.duration);
        }
    }

    onSongEnded() {
        if (this.isRepeated) {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
        } else {
            this.playNext();
        }
    }

    setVolume(value) {
        this.currentVolume = value;
        this.audioPlayer.volume = value / 100;

        // Update volume icon
        const volumeIcon = document.querySelector('.volume-control i');
        if (value == 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (value < 50) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }

    handleAudioError(e) {
        console.error('Audio error:', e);
        this.showNotification('Error playing audio file', 'error');
    }

    async switchPlaylist(playlistId) {
        this.currentPlaylist = playlistId;

        // Update UI
        if (playlistId === 'all') {
            this.currentPlaylistEl.textContent = 'All Songs';
            this.songsListTitle.textContent = 'All Songs';
            await this.loadSongs();
        } else {
            const playlist = this.playlists.find(p => p.id.toString() === playlistId);
            if (playlist) {
                this.currentPlaylistEl.textContent = playlist.name;
                this.songsListTitle.textContent = playlist.name;
                await this.loadPlaylistSongs(playlistId);
            }
        }

        // Update active playlist in sidebar
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`.playlist-item[data-id="${playlistId}"]`) ||
            document.querySelector('.playlist-item:first-child');
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Close mobile menu
        this.navLinks.classList.remove('active');
    }

    async loadPlaylistSongs(playlistId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/playlists/${playlistId}`);
            if (response.ok) {
                const playlist = await response.json();
                this.filteredSongs = playlist.songs || [];
                this.renderSongs();
            }
        } catch (error) {
            console.error('Error loading playlist songs:', error);
            this.showNotification('Failed to load playlist songs', 'error');
        }
    }

    async searchSongs() {
        const query = this.searchBox.value.trim();

        if (!query) {
            if (this.currentPlaylist === 'all') {
                await this.loadSongs();
            } else {
                await this.loadPlaylistSongs(this.currentPlaylist);
            }
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/songs/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                this.filteredSongs = await response.json();
                this.renderSongs();
            }
        } catch (error) {
            console.error('Error searching songs:', error);
            this.showNotification('Failed to search songs', 'error');
        }
    }

    async handleUpload(e) {
        e.preventDefault();

        const files = this.fileInput.files;
        const playlistId = this.playlistSelect.value;

        if (files.length === 0) {
            this.showNotification('Please select at least one file', 'error');
            return;
        }

        // Show progress bar
        this.uploadProgress.classList.add('active');
        this.uploadSubmitBtn.disabled = true;
        this.uploadSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        let uploadedCount = 0;
        const totalFiles = files.length;
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/songs/upload`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    uploadedCount++;

                    // Update progress
                    const progress = (uploadedCount / totalFiles) * 100;
                    this.uploadProgressBar.style.width = `${progress}%`;
                    this.uploadProgressText.textContent = `${Math.round(progress)}%`;

                    // If playlist selected, add song to playlist
                    if (playlistId && result.song_id) {
                        try {
                            await this.addSongToPlaylist(playlistId, result.song_id);
                        } catch (playlistError) {
                            console.error('Error adding to playlist:', playlistError);
                        }
                    }
                } else {
                    errors.push(`${file.name}: ${result.error || 'Upload failed'}`);
                }
            } catch (error) {
                errors.push(`${file.name}: Network error`);
            }
        }

        // Reset form and hide progress
        this.uploadForm.reset();
        this.uploadProgress.classList.remove('active');
        this.uploadSubmitBtn.disabled = false;
        this.uploadSubmitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Files';
        this.uploadProgressBar.style.width = '0%';
        this.uploadProgressText.textContent = '0%';

        // Close modal
        this.closeModal(this.uploadModal);

        // Refresh data
        await this.refreshLibrary();

        // Show result message
        if (errors.length > 0) {
            const errorMsg = errors.slice(0, 3).join(', ');
            const more = errors.length > 3 ? ` and ${errors.length - 3} more` : '';
            this.showNotification(`Uploaded ${uploadedCount}/${totalFiles} files. Errors: ${errorMsg}${more}`, 'warning');
        } else {
            this.showNotification(`Successfully uploaded ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}`);
        }
    }

    async handleCreatePlaylist(e) {
        e.preventDefault();

        const name = document.getElementById('playlistName').value;
        const description = document.getElementById('playlistDescription').value;

        if (!name) {
            this.showNotification('Please enter a playlist name', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/playlists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description
                })
            });

            if (response.ok) {
                this.closeModal(this.playlistModal);
                this.playlistForm.reset();
                await this.refreshLibrary();
                this.showNotification(`Playlist "${name}" created successfully`);
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            this.showNotification('Failed to create playlist', 'error');
        }
    }

    showAddToPlaylistDialog(songId) {
        this.currentSongForPlaylist = songId;
        this.openModal(this.addToPlaylistModal);
    }

    async confirmAddToPlaylistAction() {
        const playlistId = this.addToPlaylistSelect.value;

        if (!playlistId) {
            this.showNotification('Please select a playlist', 'error');
            return;
        }

        if (!this.currentSongForPlaylist) return;

        try {
            await this.addSongToPlaylist(playlistId, this.currentSongForPlaylist);
            this.closeModal(this.addToPlaylistModal);
            this.addToPlaylistSelect.value = '';
            this.currentSongForPlaylist = null;
        } catch (error) {
            this.showNotification('Failed to add song to playlist', 'error');
        }
    }

    async addSongToPlaylist(playlistId, songId) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/api/playlists/${playlistId}/songs/${songId}`, {
                    method: 'POST'
                }
            );

            if (response.ok) {
                const playlist = this.playlists.find(p => p.id.toString() === playlistId.toString());
                this.showNotification(`Song added to "${playlist?.name || 'playlist'}"`);

                // Update playlist count in sidebar
                const playlistItem = document.querySelector(`.playlist-item[data-id="${playlistId}"]`);
                if (playlistItem) {
                    const countSpan = playlistItem.querySelector('.playlist-item-count');
                    if (countSpan) {
                        const currentCount = parseInt(countSpan.textContent) || 0;
                        countSpan.textContent = currentCount + 1;
                    }
                }
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            throw error;
        }
    }

    async removeSongFromPlaylist(songId) {
        if (!confirm('Remove this song from the playlist?')) return;

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/api/playlists/${this.currentPlaylist}/songs/${songId}`, {
                    method: 'DELETE'
                }
            );

            if (response.ok) {
                await this.loadPlaylistSongs(this.currentPlaylist);
                this.showNotification('Song removed from playlist');

                // Update playlist count
                await this.loadPlaylists();
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Error removing song from playlist:', error);
            this.showNotification('Failed to remove song from playlist', 'error');
        }
    }

    async deleteSong(songId) {
        if (!confirm('Are you sure you want to delete this song? This action cannot be undone.')) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/songs/${songId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.refreshLibrary();
                this.showNotification('Song deleted successfully');

                // Stop playback if deleted song was playing
                const deletedSong = this.songs.find(s => s.id === songId);
                if (deletedSong && this.currentSongTitle.textContent === deletedSong.title) {
                    this.audioPlayer.pause();
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                    this.currentSongTitle.textContent = 'No song selected';
                    this.currentSongArtist.textContent = 'Select a song to play';
                }
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting song:', error);
            this.showNotification('Failed to delete song', 'error');
        }
    }

    async deletePlaylist(playlistId) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        if (!confirm(`Delete playlist "${playlist.name}"? Songs will not be deleted from the library.`)) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/playlists/${playlistId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // If deleting current playlist, switch to All Songs
                if (this.currentPlaylist === playlistId.toString()) {
                    await this.switchPlaylist('all');
                }

                await this.refreshLibrary();
                this.showNotification(`Playlist "${playlist.name}" deleted`);
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            this.showNotification('Failed to delete playlist', 'error');
        }
    }

    async refreshLibrary() {
        await Promise.all([
            this.loadLibraryStats(),
            this.loadPlaylists(),
            this.loadSongs()
        ]);
    }

    openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    toggleMobileMenu() {
        this.navLinks.classList.toggle('active');
    }

    showNotification(message, type = 'success') {
        this.notificationText.textContent = message;

        // Set icon and color
        if (type === 'error') {
            this.notification.style.background = 'var(--danger-color)';
            this.notification.querySelector('i').className = 'fas fa-exclamation-circle';
        } else if (type === 'warning') {
            this.notification.style.background = 'var(--warning-color)';
            this.notification.querySelector('i').className = 'fas fa-exclamation-triangle';
        } else {
            this.notification.style.background = 'var(--success-color)';
            this.notification.querySelector('i').className = 'fas fa-check-circle';
        }

        this.notification.classList.add('active');

        setTimeout(() => {
            this.notification.classList.remove('active');
        }, 3000);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');

    // Check if browser supports necessary features
    if (!window.fetch || !window.Audio) {
        alert('Your browser does not support all required features. Please update to a modern browser.');
        return;
    }

    // Initialize the music library app
    try {
        musicLibrary = new MusicLibrary();
        window.musicLibrary = musicLibrary;

    } catch (error) {
        console.error('Failed to initialize Music Library:', error);
        alert('Failed to initialize the application. Please check the console for errors.');
    }
});
