document.addEventListener('DOMContentLoaded', () => {
    // ===================== ПАРАМЕТРЫ СИНХРОНИЗАЦИИ =====================
    let isRemoteSync = false;
    let previousTime = 0;
    const SEEK_THRESHOLD = 3;
    let previousPlayerState = null;
    const STATE_CHECK_INTERVAL = 500;
    
    // В начале скрипта внутри DOMContentLoaded:
    let initialSyncSuppressed = true;
    setTimeout(() => {
        initialSyncSuppressed = false;
        console.log("Синхронизация включена");
    }, 2000);

    // --------------------- Функция отслеживания состояния play/pause ---------------------
    function checkLocalPlayerState() {
        if (player && typeof player.getPlayerState === 'function') {
          // Если первые 2 секунды, не отправляем синхронизацию
          if (initialSyncSuppressed) return;
          const currentState = player.getPlayerState(); // 1 = PLAYING, 2 = PAUSED, ...
          if (previousPlayerState === null) {
            previousPlayerState = currentState;
            return;
          }
          if ((currentState === 1 || currentState === 2) && currentState !== previousPlayerState) {
            console.log(`Local state change: from ${previousPlayerState} to ${currentState}`);
            const action = (currentState === 1) ? 'play' : 'pause';
            socket.emit('playerAction', { roomId, action, timestamp: player.getCurrentTime() });
            previousPlayerState = currentState;
          }
        }
      }
      
    setInterval(checkLocalPlayerState, STATE_CHECK_INTERVAL);
    
    // --------------------- Функция отслеживания seek ---------------------
    function checkSeek() {
        if (player && typeof player.getCurrentTime === 'function') {
          // Если первые 2 секунды, не отправляем синхронизацию
          if (initialSyncSuppressed) return;
          const currentTime = player.getCurrentTime();
          if (previousTime !== 0 && Math.abs(currentTime - previousTime) > SEEK_THRESHOLD) {
            console.log(`Seek detected locally: Prev ${previousTime}, Current ${currentTime}`);
            socket.emit('playerAction', { roomId, action: 'seek', timestamp: currentTime });
          }
          previousTime = currentTime;
        }
      }
      
    setInterval(checkSeek, 1000);
    
    // --------------------- Извлечение roomId ---------------------
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    
    // --------------------- ИНИЦИАЛИЗАЦИЯ SOCKET.IO ---------------------
    const socket = io();
    socket.emit('joinRoom', roomId);
    socket.on('userJoined', (data) => {
      console.log(`Пользователь ${data.socketId} присоединился`);
    });
    
    // --------------------- Обработка синхронизации от сервера ---------------------
    socket.on('syncPlayer', (data) => {
      if (player && typeof player.seekTo === 'function') {
        isRemoteSync = true;
        if (data.action === 'play') {
          player.seekTo(data.timestamp, true);
          player.playVideo();
        } else if (data.action === 'pause') {
          player.seekTo(data.timestamp, true);
          player.pauseVideo();
        } else if (data.action === 'rewind' || data.action === 'seek') {
          player.seekTo(data.timestamp, true);
        }
      }
    });
    
    socket.on('videoChanged', (data) => {
      if (data && data.videoId) {
        let videoId = data.videoId;
        if (videoId.includes('youtube.com')) {
          try {
            const urlObj = new URL(videoId);
            videoId = urlObj.searchParams.get('v') || videoId;
          } catch (e) {
            console.error('Ошибка при разборе URL', e);
          }
        }
        player.loadVideoById(videoId);
      } else {
        player.stopVideo();
      }
    });
    
    // --------------------- ИНИЦИАЛИЗАЦИЯ YOUTUBE PЛЕЕРА ---------------------
    let player;
    function onYouTubeIframeAPIReady() {
      if (player && typeof player.destroy === 'function') {
        player.destroy();
        document.getElementById('player').innerHTML = '';
      }
      player = new YT.Player('player', {
        height: '390',
        width: '100%', // ширина задается через контейнер (player-container)
        videoId: 'dQw4w9WgXcQ', // Дефолтное видео (RickRoll)
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    }
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    
    function onPlayerReady(event) {
      if (window.currentRoomVideoId) {
        player.loadVideoById(window.currentRoomVideoId);
      }
      player.playVideo();
      document.getElementById('playBtn').addEventListener('click', () => {
        player.playVideo();
        socket.emit('playerAction', { roomId, action: 'play', timestamp: player.getCurrentTime() });
      });
      document.getElementById('pauseBtn').addEventListener('click', () => {
        player.pauseVideo();
        socket.emit('playerAction', { roomId, action: 'pause', timestamp: player.getCurrentTime() });
      });
      document.getElementById('rewindBtn').addEventListener('click', () => {
        const newTime = Math.max(player.getCurrentTime() - 10, 0);
        player.seekTo(newTime, true);
        socket.emit('playerAction', { roomId, action: 'rewind', timestamp: newTime });
      });
    }
    
    function onPlayerStateChange(event) {
        if (isRemoteSync) {
          isRemoteSync = false;
          return;
        }
        if (event.data === YT.PlayerState.ENDED) {
          console.log("Видео завершилось");
          if (window.isHost && window.autoNext) {
            fetchNextVideo();
          } else {
            console.log("AutoNext не включён или пользователь не является хостом");
          }
        }
      }
      
    
    // --------------------- Функция переключения на следующее видео ---------------------
    async function fetchNextVideo() {
        const token = getToken();
        try {
          const res = await fetch(`/api/rooms/${roomId}/next`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
          });
          const result = await res.json();
          alert(result.msg);
          if (result.currentVideo && result.currentVideo.url) {
            let videoId = result.currentVideo.url;
            if (videoId.includes('youtube.com')) {
              try {
                const urlObj = new URL(videoId);
                videoId = urlObj.searchParams.get('v') || videoId;
              } catch (e) {
                console.error('Ошибка при разборе URL', e);
              }
            }
            player.loadVideoById(videoId);
            loadQueue();
            socket.emit('videoChanged', { roomId, videoId: result.currentVideo.url });
          } else {
            player.stopVideo();
            socket.emit('videoChanged', { roomId, videoId: null });
            alert("Очередь пуста");
          }
        } catch (err) {
          console.error(err);
        }
      }
      
    
    // --------------------- Получение токена из localStorage ---------------------
    function getToken() {
      return localStorage.getItem('token');
    }
    
    // --------------------- Функция загрузки информации о комнате ---------------------
    async function loadRoomInfo() {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        const room = await res.json();
        document.getElementById('roomInfo').innerHTML = `<h2>${room.name}</h2><p>Хост: ${room.host.username}</p>`;
        window.autoNext = room.settings.autoNext;
        window.allowAllControl = room.settings.allowAllControl;
        if (room.playerStatus && room.playerStatus.currentVideo) {
          let currentVideoId = '';
          if (typeof room.playerStatus.currentVideo === 'object' && room.playerStatus.currentVideo.url) {
            currentVideoId = room.playerStatus.currentVideo.url;
          } else {
            currentVideoId = room.playerStatus.currentVideo;
          }
          if (currentVideoId && currentVideoId.includes('youtube.com')) {
            try {
              const urlObj = new URL(currentVideoId);
              currentVideoId = urlObj.searchParams.get('v') || currentVideoId;
            } catch (e) {
              console.error('Ошибка при разборе URL', e);
            }
          }
          window.currentRoomVideoId = currentVideoId;
          if (player && currentVideoId) {
            player.loadVideoById(currentVideoId);
          }
        }
        const token = getToken();
        if (token) {
          const userRes = await fetch('/api/auth/me', { headers: { 'x-auth-token': token } });
          if (userRes.ok) {
            const user = await userRes.json();
            if (user._id === room.host._id) {
              window.isHost = true;
              const controlsDiv = document.getElementById('userControls');
              controlsDiv.innerHTML = `
                <button id="configRoomBtn">Конфигурация комнаты</button>
                <button id="deleteRoomBtn">Удалить комнату</button>
                <button id="nextVideoBtn">Следующее видео</button>
              `;
              document.getElementById('nextVideoBtn').addEventListener('click', async () => {
                const resNext = await fetch(`/api/rooms/${roomId}/next`, {
                  method: 'POST',
                  headers: { 'x-auth-token': token }
                });
                const resultNext = await resNext.json();
                alert(resultNext.msg);
                loadQueue();
                if (resultNext.currentVideo && resultNext.currentVideo.url) {
                  socket.emit('videoChanged', { roomId, videoId: resultNext.currentVideo.url });
                } else {
                  socket.emit('videoChanged', { roomId, videoId: null });
                }
              });
              document.getElementById('configRoomBtn').addEventListener('click', () => {
                document.getElementById('roomNameInput').value = document.querySelector('#roomInfo h2').textContent;
                document.getElementById('autoNextCheckbox').checked = window.autoNext;
                document.getElementById('allowAllControlCheckbox').checked = window.allowAllControl;
                document.getElementById('configModal').style.display = 'block';
              });
              document.getElementById('closeConfigModal').addEventListener('click', () => {
                document.getElementById('configModal').style.display = 'none';
              });
              window.addEventListener('click', (event) => {
                const configModal = document.getElementById('configModal');
                if (event.target === configModal) {
                  configModal.style.display = 'none';
                }
              });
              document.getElementById('configForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = {
                  name: formData.get('name'),
                  autoNext: formData.get('autoNext') === 'on' || formData.get('autoNext') === 'true',
                  allowAllControl: formData.get('allowAllControl') === 'on'
                };
                const token = getToken();
                try {
                  const res = await fetch(`/api/rooms/${roomId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-auth-token': token
                    },
                    body: JSON.stringify(data)
                  });
                  const result = await res.json();
                  alert(result.msg);
                  document.getElementById('configModal').style.display = 'none';
                  loadRoomInfo();
                } catch (err) {
                  console.error(err);
                }
              });
              document.getElementById('deleteRoomBtn').addEventListener('click', async () => {
                const confirmDelete = confirm("Вы уверены, что хотите удалить комнату?");
                if (confirmDelete) {
                  const resDelete = await fetch(`/api/rooms/${roomId}`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': token }
                  });
                  const resultDelete = await resDelete.json();
                  if (resDelete.ok) {
                    alert(resultDelete.msg);
                    window.location.href = '/';
                  } else {
                    alert(resultDelete.msg);
                  }
                }
              });
            }
          }
        }
        loadQueue();
      } catch (err) {
        console.error(err);
      }
    }
    
    // --------------------- Функция создания карточки видео ---------------------
    function createVideoCard(video) {
        let videoId = video.url;
        if (videoId.includes('youtube.com')) {
          try {
            const urlObj = new URL(videoId);
            videoId = urlObj.searchParams.get('v') || videoId;
          } catch (e) {
            console.error('Ошибка при разборе URL', e);
          }
        }
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
        const card = document.createElement('div');
        card.className = 'video-card';
      
        const thumbnail = document.createElement('div');
        thumbnail.className = 'video-thumbnail';
        thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
        card.appendChild(thumbnail);
      
        const info = document.createElement('div');
        info.className = 'video-info';
      
        const title = document.createElement('div');
        title.className = 'video-title';
        title.textContent = video.title || video.url;
        info.appendChild(title);
      
        const actions = document.createElement('div');
        actions.className = 'video-actions';
      
        // Зеленая кнопка «Play»
        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn';
        playBtn.textContent = 'Play';
        playBtn.addEventListener('click', async () => {
          // Загружаем выбранное видео в плеер
          player.loadVideoById(videoId);
          socket.emit('videoChanged', { roomId, videoId: video.url });
      
          // Если пользователь — хост, обновляем текущее видео и удаляем его из очереди
          if (window.isHost) {
            const token = getToken();
            if (token) {
              try {
                // 1. Обновляем поле currentVideo через endpoint updateCurrentVideo
                await fetch(`/api/rooms/${roomId}/updateCurrentVideo`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                  },
                  body: JSON.stringify({ currentVideo: video._id })
                });
                // 2. Удаляем видео из очереди (без подтверждения)
                await fetch(`/api/rooms/${roomId}/video/${video._id}`, {
                  method: 'DELETE',
                  headers: { 'x-auth-token': token }
                });
                // Ждем небольшую задержку, затем обновляем очередь
                setTimeout(loadQueue, 500);
              } catch (err) {
                console.error('Ошибка при обновлении текущего видео или удалении из очереди', err);
              }
            }
          }
        });
        actions.appendChild(playBtn);
      
        // Кнопка удаления видео (с подтверждением)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', async () => {
          const token = getToken();
          const confirmDel = confirm('Удалить это видео из очереди?');
          if (confirmDel && token) {
            try {
              const delRes = await fetch(`/api/rooms/${roomId}/video/${video._id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
              });
              const delResult = await delRes.json();
              alert(delResult.msg);
              loadQueue();
            } catch (err) {
              console.error('Ошибка при удалении видео', err);
            }
          }
        });
        actions.appendChild(deleteBtn);
      
        info.appendChild(actions);
        card.appendChild(info);
      
        return card;
      }
      
  
    
    // --------------------- Обновлённая функция loadQueue() ---------------------
    async function loadQueue() {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        const room = await res.json();
        const queueContainer = document.getElementById('queue');
        queueContainer.innerHTML = '';
        if (room.queue && room.queue.length > 0) {
          room.queue.forEach(video => {
            const card = createVideoCard(video);
            queueContainer.appendChild(card);
          });
        } else {
          queueContainer.innerHTML = '<p>Очередь пуста</p>';
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    loadRoomInfo();
    
    // Полезно обновлять очередь каждые 2 секунды для динамичности
    setInterval(loadQueue, 2000);
    
    // --------------------- Обработчики модальных окон ---------------------
    const videoModal = document.getElementById('videoModal');
    const closeVideoModal = document.getElementById('closeVideoModal');
    closeVideoModal.addEventListener('click', () => {
        videoModal.style.display = 'none';
      });
    
      // Закрытие по нажатию клавиши Esc
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          videoModal.style.display = 'none';
        }
      });
    document.getElementById('proposeVideoBtn').addEventListener('click', () => {
      videoModal.style.display = 'block';
    });
    
    document.getElementById('videoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const videoUrl = formData.get('videoUrl');
      const token = getToken();
      if (!token) {
        alert('Для предложения видео необходимо войти в систему');
        return;
      }
      const res = await fetch('/api/videos/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          roomId,
          type: 'youtube',
          url: videoUrl
        })
      });
      const result = await res.json();
      if (result.video) {
        alert('Видео добавлено в очередь');
        videoModal.style.display = 'none';
        loadQueue();
      } else {
        alert(result.msg || 'Ошибка при добавлении видео');
      }
    });
    
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = '/';
    });
  });
  