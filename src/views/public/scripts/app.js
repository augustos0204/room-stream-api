function socketTester() {
    return {
        // Connection state
        socket: null,
        isConnected: false,
        connecting: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 2000,
        reconnectTimer: null,
        intentionalDisconnect: false,

        // Form data
        baseUrl: window.location.origin,
        wsNamespace: '/ws/rooms',
        apiKey: '', // API Key for authentication
        newRoomName: '',
        deleteRoomId: '',
        roomId: 'test-room',
        participantName: '',
        message: '',

        // Current room state
        currentRoomId: null,
        currentRoomName: null,

        // Data
        rooms: [],
        roomParticipants: [],
        logs: [], // Global logs
        roomLogs: [], // Room-specific logs
        autoScroll: true,

        // Loading states
        isCreatingRoom: false,
        isSendingMessage: false,
        isLoadingRooms: false,

        // Mobile navigation
        mobileSection: 'rooms', // 'rooms', 'chat', 'participants'
        urlInputExpanded: false, // Control mobile URL input expansion

        // Desktop config expansion states
        configExpanded: {
            apiKey: false,
            baseUrl: false,
            namespace: false
        },

        // Initialize
        init() {
            // Load saved participant name from localStorage
            const savedName = localStorage.getItem('participantName');
            if (savedName) {
                this.participantName = savedName;
            }

            this.log('🚀 Socket.IO Tester carregado', 'success');
            this.log('💡 Clique em "Conectar" para começar', 'info');
            this.listRooms();

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Show welcome toast
            if (typeof Toast !== 'undefined') {
                Toast.info('Bem-vindo ao RoomStream! Configure a URL e conecte-se.');
            }
        },

        // Save participant name to localStorage
        saveParticipantName() {
            if (this.participantName?.trim()) {
                localStorage.setItem('participantName', this.participantName.trim());
            } else {
                localStorage.removeItem('participantName');
            }
        },

        // Get fetch headers with API key if provided
        getFetchHeaders() {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.apiKey && this.apiKey.trim()) {
                headers['x-api-key'] = this.apiKey.trim();
            }

            return headers;
        },

        // Room management
        openRoom(roomId, roomName) {
            if (!this.isConnected) {
                this.roomLog('❌ Conecte-se primeiro ao WebSocket', 'error');
                if (typeof Toast !== 'undefined') {
                    Toast.error('Conecte-se ao WebSocket primeiro');
                }
                return;
            }

            // Validate participant name
            const trimmedName = this.participantName?.trim();
            if (!trimmedName) {
                if (typeof Toast !== 'undefined') {
                    Toast.warning('Entrando como usuário anônimo');
                }
            }

            // Leave current room if any
            if (this.currentRoomId) {
                this.socket.emit('leaveRoom', { roomId: this.currentRoomId });
            }

            // Set new room
            this.currentRoomId = roomId;
            this.currentRoomName = roomName;
            this.roomLogs = [];
            this.roomParticipants = [];

            // Join new room with validated name
            this.roomLog(`🚪 Abrindo sala: <strong>${Sanitizer.escapeHtml(roomName)}</strong> como <strong>${Sanitizer.escapeHtml(trimmedName || 'Anônimo')}</strong>`, 'info');
            this.socket.emit('joinRoom', {
                roomId: roomId,
                participantName: trimmedName || null
            });

            // Auto-navigate to chat section on mobile
            if (window.innerWidth < 1024) {
                this.mobileSection = 'chat';
            }
        },

        // Update participant name in current room
        updateMyName() {
            if (!this.isConnected || !this.currentRoomId) {
                this.roomLog('❌ Você precisa estar conectado e em uma sala para atualizar seu nome', 'error');
                if (typeof Toast !== 'undefined') {
                    Toast.error('Entre em uma sala primeiro');
                }
                return;
            }

            const trimmedName = this.participantName?.trim();
            this.saveParticipantName();

            this.socket.emit('updateParticipantName', {
                roomId: this.currentRoomId,
                participantName: trimmedName || null
            });

            this.roomLog(`📝 Atualizando nome para: <strong>${Sanitizer.escapeHtml(trimmedName || 'Anônimo')}</strong>`, 'info');
        },

        leaveCurrentRoom() {
            if (!this.currentRoomId) return;

            this.socket.emit('leaveRoom', { roomId: this.currentRoomId });
            this.currentRoomId = null;
            this.currentRoomName = null;
            this.roomLogs = [];
            this.roomParticipants = [];

            if (typeof Toast !== 'undefined') {
                Toast.info('Você saiu da sala');
            }
        },

        // Room-specific logging with sanitization
        roomLog(message, type = 'info', sender = null, originalTimestamp = null, displayName = null, clientId = null) {
            const timestamp = originalTimestamp ? new Date(originalTimestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
            const fullTimestamp = originalTimestamp ? new Date(originalTimestamp).toLocaleString() : new Date().toLocaleString();

            // Store the log entry
            this.roomLogs.push({
                message,
                type,
                timestamp,
                fullTimestamp,
                sender,
                displayName: displayName || sender,
                clientId,
                isMe: clientId === this.socket?.id
            });

            // Auto-scroll to bottom
            if (this.autoScroll) {
                this.$nextTick(() => {
                    const container = this.$refs.roomLogContainer;
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                });
            }
        },

        clearRoomLogs() {
            this.roomLogs = [];
            if (typeof Toast !== 'undefined') {
                Toast.info('Chat limpo');
            }
        },

        // Logging
        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            this.logs.push({ message, type, timestamp });

            if (this.autoScroll) {
                this.$nextTick(() => {
                    const container = this.$refs.logContainer;
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                });
            }
        },

        clearLog() {
            this.logs = [];
        },

        getLogClass(type) {
            const classes = {
                connected: 'text-green-400',
                disconnected: 'text-red-400',
                message: 'text-yellow-400',
                error: 'text-red-400',
                info: 'text-blue-400',
                success: 'text-green-300'
            };
            return classes[type] || 'text-gray-300';
        },

        getLogIcon(type) {
            const icons = {
                connected: 'wifi',
                disconnected: 'wifi-off',
                message: 'message-circle',
                error: 'alert-circle',
                info: 'info',
                success: 'check-circle'
            };
            return icons[type] || 'circle';
        },

        // Connection methods with auto-reconnect
        toggleConnection() {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        },

        connect() {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }

            this.intentionalDisconnect = false;
            this.connecting = true;
            this.isConnected = false;
            this.reconnectAttempts = 0;

            try {
                // Remove trailing slash from baseUrl
                const baseUrl = this.baseUrl.trim().replace(/\/$/, '');

                // Ensure namespace starts with /
                const namespace = this.wsNamespace.trim().startsWith('/')
                    ? this.wsNamespace.trim()
                    : `/${this.wsNamespace.trim()}`;

                const fullUrl = baseUrl + namespace;

                this.log(`Conectando ao WebSocket: ${fullUrl}`, 'info');
                console.log('Connecting to:', fullUrl);

                // Prepare socket.io options
                const socketOptions = {
                    forceNew: true,
                    timeout: 5000,
                    transports: ['websocket', 'polling'],
                    reconnection: false // We handle reconnection manually
                };

                // Add API key if provided
                if (this.apiKey && this.apiKey.trim()) {
                    socketOptions.auth = {
                        apiKey: this.apiKey.trim()
                    };
                    this.log('🔐 Usando autenticação via API Key', 'info');
                }

                // Connect to namespace directly
                this.socket = io(fullUrl, socketOptions);

                this.setupSocketListeners();

            } catch (e) {
                this.connecting = false;
                this.log('❌ URL inválida. Verifique a Base URL e o namespace', 'error');
                console.error('Connection error:', e);

                if (typeof Toast !== 'undefined') {
                    Toast.error('URL inválida');
                }
                return;
            }

            // Timeout de segurança para evitar loading infinito
            setTimeout(() => {
                if (this.connecting && !this.isConnected) {
                    this.connecting = false;
                    this.log('❌ Timeout na conexão - verifique a URL', 'error');
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Tempo de conexão esgotado');
                    }
                }
            }, 10000); // 10 segundos
        },

        setupSocketListeners() {
            if (!this.socket) return;

            this.socket.on('connect', () => {
                this.isConnected = true;
                this.connecting = false;
                this.reconnectAttempts = 0;
                this.log(`✅ Conectado! Socket ID: ${this.socket.id}`, 'connected');

                if (typeof Toast !== 'undefined') {
                    Toast.success('Conectado ao WebSocket!');
                }
            });

            this.socket.on('disconnect', (reason) => {
                this.isConnected = false;
                this.connecting = false;
                this.log(`❌ Desconectado: ${reason}`, 'disconnected');

                if (typeof Toast !== 'undefined') {
                    Toast.warning('Desconectado do WebSocket');
                }

                if (this.intentionalDisconnect) {
                    this.log('ℹ️ Desconexão manual - reconexão automática desabilitada', 'info');
                    return;
                }

                if (reason === 'io server disconnect') {
                    return;
                }

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect();
                }
            });

            this.socket.on('connect_error', (error) => {
                this.isConnected = false;
                this.connecting = false;
                this.log(`❌ Erro de conexão: ${error.message}`, 'error');
                console.error('Connection error:', error);

                if (typeof Toast !== 'undefined') {
                    Toast.error('Erro ao conectar');
                }
            });

            this.socket.on('error', (error) => {
                this.connecting = false;
                this.log(`❌ Erro: ${JSON.stringify(error)}`, 'error');
            });

            // Room events
            this.socket.on('joinedRoom', (data) => {
                this.log(`🚪 Entrou na room: <strong>${Sanitizer.escapeHtml(data.roomName)}</strong> (ID: ${Sanitizer.escapeHtml(data.roomId)})<br>Participantes: ${data.participants.length}<br>Mensagens recentes: ${data.recentMessages.length}`, 'success');

                // Room-specific log
                this.roomLog(`✅ Conectado à sala <strong>${Sanitizer.escapeHtml(data.roomName)}</strong>`, 'success');
                this.roomLog(`👥 ${data.participants.length} participantes na sala`, 'info');

                // Update participants with proper structure
                console.log('Participants received:', data.participants);
                this.roomParticipants = data.participants || [];

                // Log participant names for debugging
                if (data.participants && data.participants.length > 0) {
                    const participantList = data.participants
                        .map(p => `• ${Sanitizer.escapeHtml(p.name || 'Anônimo')} (${Sanitizer.escapeHtml(p.clientId)})`)
                        .join('<br>');
                    this.roomLog(`📋 <strong>Participantes:</strong><br>${participantList}`, 'info');
                }

                // Show recent messages
                if (data.recentMessages && data.recentMessages.length > 0) {
                    this.roomLog(`📜 Carregando ${data.recentMessages.length} mensagens recentes...`, 'info');
                    data.recentMessages.forEach(msg => {
                        // Find sender name from participants
                        const sender = data.participants.find(p => p.clientId === msg.clientId);
                        let senderName, displayName;

                        if (sender?.name) {
                            senderName = sender.name;
                            displayName = sender.name;
                        } else {
                            senderName = 'Usuário Anônimo';
                            displayName = `Usuário Anônimo • ${msg.clientId}`;
                        }

                        this.roomLog(Sanitizer.sanitizeMessage(msg.message), 'user_message', senderName, msg.timestamp, displayName, msg.clientId);
                    });
                }

                if (typeof Toast !== 'undefined') {
                    Toast.success(`Entrou na sala ${data.roomName}`);
                }
            });

            this.socket.on('leftRoom', (data) => {
                this.log(`🚪 Saiu da room: ${Sanitizer.escapeHtml(data.roomId)}`, 'info');
                if (this.currentRoomId === data.roomId) {
                    this.roomLog(`👋 Você saiu da sala`, 'info');
                }
            });

            this.socket.on('userJoined', (data) => {
                this.log(`👤 <strong>${Sanitizer.escapeHtml(data.participantName || 'Usuário anônimo')}</strong> entrou na room <strong>${Sanitizer.escapeHtml(data.roomName)}</strong>`, 'message');

                if (this.currentRoomId === data.roomId) {
                    this.roomLog(`👤 <strong>${Sanitizer.escapeHtml(data.participantName || 'Usuário anônimo')}</strong> entrou na sala`, 'success');
                    // Refresh participants when someone joins
                    this.getRoomInfo();
                }
            });

            this.socket.on('userLeft', (data) => {
                this.log(`👤 <strong>${Sanitizer.escapeHtml(data.participantName || 'Usuário anônimo')}</strong> saiu da room <strong>${Sanitizer.escapeHtml(data.roomName)}</strong>`, 'message');

                if (this.currentRoomId === data.roomId) {
                    this.roomLog(`👋 <strong>${Sanitizer.escapeHtml(data.participantName || 'Usuário anônimo')}</strong> saiu da sala`, 'info');
                    // Refresh participants when someone leaves
                    this.getRoomInfo();
                }
            });

            this.socket.on('newMessage', (data) => {
                this.log(`💬 <strong>Nova mensagem</strong> na room ${Sanitizer.escapeHtml(data.roomId)}:<br><em>"${Sanitizer.escapeHtml(data.message)}"</em>`, 'message');

                if (this.currentRoomId === data.roomId) {
                    const isMyMessage = data.clientId === this.socket.id;
                    let senderName;
                    let displayName;

                    if (isMyMessage) {
                        senderName = 'Você';
                        displayName = 'Você';
                    } else {
                        // Find sender name from participants list
                        const sender = this.roomParticipants.find(p => p.clientId === data.clientId);
                        if (sender?.name) {
                            senderName = sender.name;
                            displayName = sender.name;
                        } else {
                            senderName = 'Usuário Anônimo';
                            displayName = `Usuário Anônimo • ${data.clientId}`;
                        }
                    }

                    this.roomLog(Sanitizer.sanitizeMessage(data.message), 'user_message', senderName, data.timestamp, displayName, data.clientId);
                }
            });

            this.socket.on('roomInfo', (data) => {
                this.log(`ℹ️ <strong>Info da Room:</strong><br>Nome: ${Sanitizer.escapeHtml(data.name)}<br>Participantes: ${data.participantCount}<br>Mensagens: ${data.messageCount}<br>Criada em: ${new Date(data.createdAt).toLocaleString()}`, 'info');

                // Update participants list
                if (this.currentRoomId === data.id) {
                    console.log('Room info participants:', data.participants);
                    this.roomParticipants = data.participants || [];
                    this.roomLog(`ℹ️ <strong>Informações atualizadas:</strong><br>Participantes: ${data.participantCount}<br>Mensagens: ${data.messageCount}`, 'info');

                    // Debug participants structure
                    if (data.participants && data.participants.length > 0) {
                        const participantList = data.participants
                            .map(p => `• ${Sanitizer.escapeHtml(p.name || 'Anônimo')} (${Sanitizer.escapeHtml(p.clientId)})`)
                            .join('<br>');
                        this.roomLog(`📋 <strong>Lista atualizada:</strong><br>${participantList}`, 'info');
                    }
                }
            });

            this.socket.on('participantNameUpdated', (data) => {
                this.log(`📝 Nome atualizado: ${Sanitizer.escapeHtml(data.participantName || 'Anônimo')} (${Sanitizer.escapeHtml(data.clientId)})`, 'info');

                if (this.currentRoomId === data.roomId) {
                    const isMe = data.clientId === this.socket.id;
                    this.roomLog(`📝 <strong>${isMe ? 'Você' : 'Usuário'}</strong> alterou nome para: <strong>${Sanitizer.escapeHtml(data.participantName || 'Anônimo')}</strong>`, isMe ? 'success' : 'info');

                    if (isMe && typeof Toast !== 'undefined') {
                        Toast.success('Nome atualizado!');
                    }

                    // Refresh participants list to reflect name change
                    this.getRoomInfo();
                }
            });
        },

        attemptReconnect() {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;

            this.log(`🔄 Tentando reconectar em ${delay / 1000}s (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'info');

            if (typeof Toast !== 'undefined') {
                Toast.info(`Reconectando em ${delay / 1000}s...`);
            }

            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, delay);
        },

        disconnect() {
            this.intentionalDisconnect = true;

            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
            this.isConnected = false;
            this.connecting = false;
            this.reconnectAttempts = 0;
        },

        // Room management
        async createRoom() {
            if (!this.newRoomName.trim()) {
                this.log('❌ Nome da sala é obrigatório', 'error');
                if (typeof Toast !== 'undefined') {
                    Toast.error('Digite um nome para a sala');
                }
                return;
            }

            this.isCreatingRoom = true;

            try {
                const baseUrl = this.baseUrl.trim().replace(/\/$/, '');
                const response = await fetch(`${baseUrl}/room`, {
                    method: 'POST',
                    headers: this.getFetchHeaders(),
                    body: JSON.stringify({ name: this.newRoomName.trim() })
                });

                if (response.ok) {
                    const room = await response.json();
                    this.log(`✅ Sala criada com sucesso!<br>Nome: <strong>${Sanitizer.escapeHtml(room.name)}</strong><br>ID: <strong>${Sanitizer.escapeHtml(room.id)}</strong>`, 'success');
                    this.newRoomName = '';
                    this.listRooms();

                    if (typeof Toast !== 'undefined') {
                        Toast.success(`Sala "${room.name}" criada!`);
                    }
                } else {
                    const error = await response.json();
                    this.log(`❌ Erro ao criar sala: ${Sanitizer.escapeHtml(error.message)}`, 'error');

                    if (typeof Toast !== 'undefined') {
                        Toast.error('Erro ao criar sala');
                    }
                }
            } catch (error) {
                this.log(`❌ Erro de rede: ${Sanitizer.escapeHtml(error.message)}`, 'error');

                if (typeof Toast !== 'undefined') {
                    Toast.error('Erro de conexão');
                }
            } finally {
                this.isCreatingRoom = false;
            }
        },

        async listRooms() {
            this.isLoadingRooms = true;

            try {
                const baseUrl = this.baseUrl.trim().replace(/\/$/, '');
                const response = await fetch(`${baseUrl}/room`, {
                    headers: this.getFetchHeaders()
                });
                if (response.ok) {
                    this.rooms = await response.json();
                    this.log(`📋 Listadas ${this.rooms.length} salas`, 'info');

                    // Reinitialize Lucide icons after DOM update
                    this.$nextTick(() => {
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
                    });
                } else {
                    this.log('❌ Erro ao listar salas', 'error');
                }
            } catch (error) {
                this.log(`❌ Erro de rede: ${Sanitizer.escapeHtml(error.message)}`, 'error');
            } finally {
                this.isLoadingRooms = false;
            }
        },

        async deleteRoom(roomId = null) {
            // Use provided roomId or fallback to deleteRoomId input field
            const targetRoomId = roomId || this.deleteRoomId.trim();

            if (!targetRoomId) {
                this.log('❌ ID da sala é obrigatório', 'error');
                if (typeof Toast !== 'undefined') {
                    Toast.error('ID da sala é obrigatório');
                }
                return { success: false, error: 'ID da sala é obrigatório' };
            }

            // Only show confirmation dialog if called from the form (no roomId parameter)
            if (!roomId && !confirm(`Tem certeza que deseja deletar a sala ${targetRoomId}?`)) {
                return { success: false, error: 'Ação cancelada pelo usuário' };
            }

            try {
                const baseUrl = this.baseUrl.trim().replace(/\/$/, '');
                const response = await fetch(`${baseUrl}/room/${targetRoomId}`, {
                    method: 'DELETE',
                    headers: this.getFetchHeaders()
                });

                if (response.ok) {
                    const result = await response.json();
                    this.log(`✅ ${result.message}`, 'success');

                    // Clear the input field only if called from form
                    if (!roomId) {
                        this.deleteRoomId = '';
                    }

                    // Refresh rooms list
                    this.listRooms();

                    // Close room if we're deleting the current room
                    if (this.currentRoomId === targetRoomId) {
                        this.leaveCurrentRoom();
                    }

                    if (typeof Toast !== 'undefined') {
                        Toast.success('Sala deletada com sucesso');
                    }

                    return { success: true, message: result.message };
                } else {
                    const error = await response.json();
                    const errorMessage = error.message || 'Erro ao deletar sala';

                    this.log(`❌ Erro ao deletar sala: ${Sanitizer.escapeHtml(errorMessage)}`, 'error');

                    if (typeof Toast !== 'undefined') {
                        Toast.error(errorMessage);
                    }

                    return { success: false, error: errorMessage, statusCode: response.status };
                }
            } catch (error) {
                const errorMessage = `Erro de rede: ${error.message}`;
                this.log(`❌ ${Sanitizer.escapeHtml(errorMessage)}`, 'error');

                if (typeof Toast !== 'undefined') {
                    Toast.error('Erro de conexão');
                }

                return { success: false, error: errorMessage };
            }
        },

        // Room actions
        joinRoom() {
            if (!this.socket || !this.socket.connected) {
                this.log('❌ Socket não conectado', 'error');
                return;
            }

            if (!this.roomId.trim()) {
                this.log('❌ Room ID é obrigatório', 'error');
                return;
            }

            this.log(`🚪 Entrando na room: <strong>${Sanitizer.escapeHtml(this.roomId)}</strong> como <strong>${Sanitizer.escapeHtml(this.participantName || 'Anônimo')}</strong>`, 'info');
            this.socket.emit('joinRoom', {
                roomId: this.roomId,
                participantName: this.participantName || null
            });
        },

        leaveRoom() {
            if (!this.socket || !this.socket.connected) {
                this.log('❌ Socket não conectado', 'error');
                return;
            }

            if (!this.roomId.trim()) {
                this.log('❌ Room ID é obrigatório', 'error');
                return;
            }

            this.log(`🚪 Saindo da room: <strong>${Sanitizer.escapeHtml(this.roomId)}</strong>`, 'info');
            this.socket.emit('leaveRoom', { roomId: this.roomId });
        },

        getRoomInfo() {
            if (!this.socket || !this.socket.connected) {
                this.log('❌ Socket não conectado', 'error');
                return;
            }

            const targetRoomId = this.currentRoomId || this.roomId.trim();
            if (!targetRoomId) {
                this.log('❌ Room ID é obrigatório', 'error');
                return;
            }

            this.log(`ℹ️ Obtendo info da room: <strong>${Sanitizer.escapeHtml(targetRoomId)}</strong>`, 'info');
            this.socket.emit('getRoomInfo', { roomId: targetRoomId });
        },

        sendMessage() {
            if (!this.socket || !this.socket.connected) {
                this.roomLog('❌ Socket não conectado', 'error');
                if (typeof Toast !== 'undefined') {
                    Toast.error('Desconectado do WebSocket');
                }
                return;
            }

            if (!this.currentRoomId || !this.message.trim()) {
                this.roomLog('❌ Selecione uma sala e digite uma mensagem', 'error');
                return;
            }

            this.isSendingMessage = true;

            this.log(`💬 Enviando mensagem para room <strong>${Sanitizer.escapeHtml(this.currentRoomId)}</strong>: <em>"${Sanitizer.escapeHtml(this.message)}"</em>`, 'info');
            this.socket.emit('sendMessage', {
                roomId: this.currentRoomId,
                message: this.message
            });
            this.message = '';

            // Reset sending state after a short delay
            setTimeout(() => {
                this.isSendingMessage = false;
            }, 500);
        },

        // Mobile navigation
        setMobileSection(section) {
            this.mobileSection = section;

            // Auto-switch to chat when opening a room on mobile
            if (section === 'chat' && !this.currentRoomId) {
                this.mobileSection = 'rooms';
            }
        },

        // URL input expansion for mobile
        expandUrlInput() {
            this.urlInputExpanded = true;
            this.$nextTick(() => {
                const input = this.$refs.urlInput;
                if (input) {
                    input.focus();
                }
            });
        },

        closeUrlInput() {
            this.urlInputExpanded = false;
        }
    }
}

// Initialize Lucide icons after Alpine loads
document.addEventListener('alpine:init', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
});

// Re-initialize icons when Alpine finishes rendering
document.addEventListener('alpine:initialized', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 200);
});
