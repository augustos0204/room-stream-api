/**
 * RoomStream Platform - Modern SPA Application
 * Baseado no socketTester() mas com navegação por páginas
 */
function platformApp() {
    return {
        // ==================== NAVIGATION & ROUTING ====================
        currentPage: 'dashboard', // 'dashboard', 'rooms', 'settings'
        sidebarExpanded: false, // Sidebar começa fechada
        sidebarPinned: false, // Se está fixada (não fecha com hover out)
        metricsInterval: null, // Interval for auto-updating metrics

        // ==================== CONNECTION STATE ====================
        socket: null,
        isConnected: false,
        connecting: false,

        // ==================== CONFIG & FORM DATA ====================
        baseUrl: window.location.origin,
        wsNamespace: '/ws/rooms',
        apiKey: '',
        apiKeyInput: '',
        newApiKeyInput: '',
        newRoomName: '',
        participantName: '',
        message: '',
        loginMethod: 'supabase', // 'supabase' or 'apikey'

        // ==================== MULTIPLE ROOMS STATE ====================
        activeRooms: [], // Array of active room objects: { id, name, logs, participants, unreadCount, joined }
        currentActiveRoomId: null, // Currently displayed room tab
        
        // Legacy support (deprecated)
        currentRoomId: null,
        currentRoomName: null,
        isInRoom: false,

        // ==================== DATA ====================
        rooms: [],
        roomParticipants: [], // Deprecated - use activeRoom.participants
        logs: [],
        roomLogs: [], // Deprecated - use activeRoom.logs
        autoScroll: true,
        metrics: {
            connections: { total: 0, active: 0 },
            rooms: { total: 0, active: 0 },
            messages: { total: 0 },
            uptime: { seconds: 0, formatted: '0s' }
        },
        lastMetricsUpdate: null, // Timestamp of last metrics update

        // ==================== LOADING STATES ====================
        isCreatingRoom: false,
        isSendingMessage: false,
        isLoadingRooms: false,
        isLoadingMetrics: false,

        // ==================== MOBILE ====================
        mobileSection: 'rooms',
        urlInputExpanded: false,

        // ==================== CONFIG EXPANSION ====================
        configExpanded: {
            apiKey: false,
            baseUrl: false,
            namespace: false
        },

        // ==================== MODALS ====================
        showProfileModal: false,
        showChatModal: false,
        showShortcutsModal: false,
        showCreateRoomModal: false,
        showApiKey: false,
        showChangeApiKeyForm: false,

        // ==================== SUPABASE ====================
        supabaseClient: null,
        supabaseToken: null,
        supabaseUser: null,
        supabaseEmail: '',
        supabasePassword: '',
        supabaseError: null,
        supabaseLoading: false,

        // ==================== DASHBOARD STATS ====================
        stats: {
            totalRooms: 0,
            activeRooms: 0,
            totalParticipants: 0,
            myActiveRooms: []
        },

        // ==================== INITIALIZE ====================
        async init() {
            // Load configuration from window.ENV (NOT API_KEY)
            if (window.ENV) {
                this.wsNamespace = window.ENV.wsNamespace || this.wsNamespace;
                // API_KEY não é mais carregada do servidor
            }

            // Load API Key from localStorage
            const savedApiKey = localStorage.getItem('apiKey');
            if (savedApiKey) {
                this.apiKey = savedApiKey;
                this.log('🔑 API Key carregada do localStorage', 'success');
            }

            // Load pre-loaded initial data
            if (window.INITIAL_DATA?.rooms) {
                this.rooms = window.INITIAL_DATA.rooms;
                this.updateStats();
                this.log(`✅ ${this.rooms.length} salas pré-carregadas do servidor`, 'success');
            }

            // Load saved participant name from localStorage
            const savedName = localStorage.getItem('participantName');
            if (savedName) {
                this.participantName = savedName;
            }

            // Initialize Supabase if configured (await to load session before fetching metrics)
            await this.initializeSupabase();

            this.log('🚀 RoomStream Platform carregada', 'success');
            this.log('💡 Use o menu lateral para navegar', 'info');

            // Only fetch rooms if not pre-loaded
            if (!window.INITIAL_DATA?.rooms) {
                this.listRooms();
            }

            // Fetch metrics on init (after auth is loaded)
            this.fetchMetrics();

            // Start metrics auto-update (every 30 seconds)
            this.startMetricsAutoUpdate();

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Show welcome toast
            if (typeof Toast !== 'undefined') {
                Toast.info('Bem-vindo à Plataforma RoomStream!');
            }

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Setup ESC key to close modals
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.showProfileModal = false;
                    this.showChatModal = false;
                    this.showShortcutsModal = false;
                    this.showCreateRoomModal = false;
                }
            });
        },

        // ==================== NAVIGATION ====================
        navigateTo(page) {
            this.currentPage = page;

            // Update metrics immediately when navigating to dashboard
            if (page === 'dashboard') {
                this.fetchMetrics();
            }

            // Update icons
            this.$nextTick(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            });

            // Auto-connect when going to chat
            if (page === 'chat' && !this.isConnected) {
                Toast.info('Conectando ao WebSocket...');
                this.toggleConnection();
            }

            // Collapse sidebar on mobile after navigation
            if (window.innerWidth < 1024) {
                this.sidebarExpanded = false;
            }
        },

        toggleSidebar() {
            this.sidebarPinned = !this.sidebarPinned;
            this.sidebarExpanded = this.sidebarPinned;
        },

        // Hover handlers para sidebar
        handleSidebarMouseEnter() {
            this.sidebarExpanded = true;
        },

        handleSidebarMouseLeave() {
            // Só fecha se não estiver fixada
            if (!this.sidebarPinned) {
                this.sidebarExpanded = false;
            }
        },

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + keys para navegar
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                    switch(e.key) {
                        case '1':
                            e.preventDefault();
                            this.navigateTo('dashboard');
                            break;
                        case '2':
                            e.preventDefault();
                            this.navigateTo('rooms');
                            break;
                        case '3':
                            e.preventDefault();
                            this.navigateTo('settings');
                            break;
                        case 'b':
                        case 'B':
                            e.preventDefault();
                            this.toggleSidebar();
                            break;
                        case 'k':
                        case 'K':
                            e.preventDefault();
                            this.showShortcutsModal = !this.showShortcutsModal;
                            break;
                        case 'r':
                        case 'R':
                            e.preventDefault();
                            this.listRooms();
                            break;
                        case 'w':
                        case 'W':
                            e.preventDefault();
                            this.toggleConnection();
                            break;
                        case 'm':
                        case 'M':
                            e.preventDefault();
                            // Focus message input if in chat modal
                            if (this.showChatModal) {
                                document.querySelector('input[x-model="message"]')?.focus();
                            }
                            break;
                    }
                }
            });
        },

        // ==================== STATS ====================
        updateStats() {
            this.stats.totalRooms = this.rooms.length;
            this.stats.activeRooms = this.rooms.filter(r => r.participants.length > 0).length;
            this.stats.totalParticipants = this.rooms.reduce((sum, r) => sum + r.participants.length, 0);
            // Check if user is in room using hybrid key (userId or clientId)
            const myKey = this.supabaseUser?.id || this.socket?.id;
            this.stats.myActiveRooms = this.rooms.filter(r =>
                r.participants.some(p => p.clientId === myKey)
            );
        },

        // ==================== SUPABASE (imported from original) ====================
        async initializeSupabase() {
            if (window.ENV?.supabaseUrl && window.ENV?.supabaseAnonKey && typeof supabase !== 'undefined') {
                try {
                    this.supabaseClient = supabase.createClient(
                        window.ENV.supabaseUrl,
                        window.ENV.supabaseAnonKey
                    );
                    this.log('✅ Supabase inicializado', 'success');
                    await this.checkSupabaseSession();
                } catch (error) {
                    console.error('Failed to initialize Supabase:', error);
                    this.log('❌ Erro ao inicializar Supabase: ' + error.message, 'error');
                }
            }
        },

        async checkSupabaseSession() {
            if (!this.supabaseClient) return;

            try {
                const { data: { session } } = await this.supabaseClient.auth.getSession();
                if (session) {
                    this.supabaseToken = session.access_token;
                    this.supabaseUser = session.user;
                    this.participantName = session.user.email || session.user.user_metadata?.name || 'Usuário';
                    this.log('✅ Sessão Supabase restaurada', 'success');
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        },

        async handleSupabaseLogin() {
            if (!this.supabaseClient) {
                Toast.error('Supabase não está configurado');
                return;
            }

            this.supabaseLoading = true;
            this.supabaseError = null;

            try {
                const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                    email: this.supabaseEmail,
                    password: this.supabasePassword,
                });

                if (error) throw error;

                this.supabaseToken = data.session.access_token;
                this.supabaseUser = data.user;
                this.participantName = data.user.email || data.user.user_metadata?.name || 'Usuário';

                this.supabaseEmail = '';
                this.supabasePassword = '';
                this.showProfileModal = false;

                Toast.success('Login realizado com sucesso!');
                this.log('✅ Autenticado via Supabase: ' + this.participantName, 'success');

            } catch (error) {
                console.error('Login error:', error);
                this.supabaseError = error.message || 'Erro ao fazer login';
                Toast.error(this.supabaseError);
            } finally {
                this.supabaseLoading = false;
            }
        },

        async handleSupabaseLogout() {
            if (!this.supabaseClient) return;

            try {
                await this.supabaseClient.auth.signOut();
                this.supabaseToken = null;
                this.supabaseUser = null;
                this.participantName = '';
                this.showProfileModal = false;
                Toast.success('Logout realizado com sucesso!');
                this.log('✅ Desconectado do Supabase', 'success');
            } catch (error) {
                console.error('Logout error:', error);
                Toast.error('Erro ao fazer logout');
            }
        },

        // ==================== API KEY AUTH ====================
        handleApiKeyLogin() {
            if (!this.apiKeyInput.trim()) {
                Toast.error('Digite a API Key');
                return;
            }

            // Save API Key to localStorage
            this.apiKey = this.apiKeyInput.trim();
            localStorage.setItem('apiKey', this.apiKey);

            // Save participant name if provided
            if (this.participantName.trim()) {
                localStorage.setItem('participantName', this.participantName);
            }

            this.apiKeyInput = '';
            this.showProfileModal = false;

            Toast.success('Login realizado com sucesso!');
            this.log('🔑 Autenticado via API Key', 'success');
        },

        handleApiKeyLogout() {
            this.apiKey = '';
            this.participantName = '';
            localStorage.removeItem('apiKey');
            localStorage.removeItem('participantName');
            this.showProfileModal = false;

            Toast.success('Logout realizado com sucesso!');
            this.log('✅ Desconectado (API Key removida)', 'success');
        },

        handleChangeApiKey() {
            if (!this.newApiKeyInput.trim()) {
                Toast.error('Digite a nova API Key');
                return;
            }

            this.apiKey = this.newApiKeyInput.trim();
            localStorage.setItem('apiKey', this.apiKey);
            this.newApiKeyInput = '';
            this.showChangeApiKeyForm = false;

            Toast.success('API Key atualizada com sucesso!');
            this.log('🔑 API Key atualizada', 'success');
        },

        // ==================== ROOMS & WEBSOCKET (from original app.js) ====================
        // Import all the original socketTester() methods here
        // (Connection, rooms, messages, etc.)

        async listRooms() {
            this.isLoadingRooms = true;
            try {
                const params = new URLSearchParams();
                if (this.apiKey) params.append('apiKey', this.apiKey);

                const headers = {};
                if (this.apiKey) headers['x-api-key'] = this.apiKey;
                if (this.supabaseToken) headers['Authorization'] = `Bearer ${this.supabaseToken}`;

                const url = `${this.baseUrl}/room${params.toString() ? '?' + params.toString() : ''}`;
                const response = await fetch(url, { headers });

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const data = await response.json();
                this.rooms = Array.isArray(data) ? data : [];
                this.updateStats();
                this.log(`✅ ${this.rooms.length} salas carregadas`, 'success');

                if (typeof Toast !== 'undefined') {
                    Toast.success(`${this.rooms.length} salas encontradas`);
                }
            } catch (error) {
                this.log(`❌ Erro ao listar salas: ${error.message}`, 'error');
                if (typeof Toast !== 'undefined') {
                    Toast.error('Erro ao carregar salas');
                }
            } finally {
                this.isLoadingRooms = false;
            }
        },

        toggleConnection() {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        },

        connect() {
            if (this.connecting || this.isConnected) {
                this.log('⚠️ Já conectado ou conectando...', 'warning');
                return;
            }

            this.connecting = true;
            this.intentionalDisconnect = false;
            this.log(`🔌 Conectando em ${this.baseUrl}${this.wsNamespace}...`, 'info');

            try {
                const socketOptions = {
                    transports: ['websocket', 'polling'],
                    reconnection: false, // Manual reconnection
                };

                // Auth
                if (this.apiKey || this.supabaseToken) {
                    socketOptions.auth = {};
                    if (this.apiKey) socketOptions.auth.apiKey = this.apiKey;
                    if (this.supabaseToken) socketOptions.auth.token = this.supabaseToken;
                }

                this.socket = io(`${this.baseUrl}${this.wsNamespace}`, socketOptions);

                this.socket.on('connect', () => {
                    this.isConnected = true;
                    this.connecting = false;
                    this.log(`✅ Conectado! Socket ID: ${this.socket.id}`, 'success');
                    Toast.success('Conectado ao WebSocket!');
                });

                this.socket.on('disconnect', (reason) => {
                    this.isConnected = false;
                    this.log(`❌ Desconectado: ${reason}`, 'error');
                });

                this.socket.on('connect_error', (error) => {
                    this.connecting = false;
                    this.isConnected = false;
                    this.log(`❌ Erro de conexão: ${error.message}`, 'error');
                    Toast.error('Erro ao conectar');
                });

                // Room events
                this.socket.on('joinedRoom', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    if (!activeRoom) return;

                    activeRoom.joined = true;
                    activeRoom.participants = data.participants || [];
                    
                    // Update legacy properties if this is the current room
                    if (this.currentActiveRoomId === data.roomId) {
                        this.isInRoom = true;
                        this.roomParticipants = activeRoom.participants;
                    }

                    this.roomLog(`✅ Entrou na sala ${data.roomName}`, 'success', null, null, null, null, null, data.roomId);
                    this.roomLog(`👥 ${data.participants.length} participantes na sala`, 'info', null, null, null, null, null, data.roomId);

                    // Load recent messages
                    if (data.recentMessages && data.recentMessages.length > 0) {
                        this.roomLog(`📜 Carregando ${data.recentMessages.length} mensagens recentes...`, 'info', null, null, null, null, null, data.roomId);
                        data.recentMessages.forEach(msg => {
                            let senderName, displayName;

                            // Check if message is from current user (by Supabase userId or clientId)
                            const isMyMessage = (msg.userId && this.supabaseUser?.id === msg.userId) ||
                                              (msg.clientId === this.socket.id);

                            if (isMyMessage) {
                                senderName = 'Você';
                                displayName = 'Você';
                            } else if (msg.supabaseUser) {
                                // Other authenticated user
                                senderName = msg.supabaseUser.email || msg.supabaseUser.name || 'Usuário Supabase';
                                displayName = `${senderName} 🔒`;
                            } else {
                                // Anonymous user - find by userId (if available) or clientId
                                const messageKey = msg.userId || msg.clientId;
                                const sender = data.participants.find(p => p.clientId === messageKey);
                                if (sender?.name) {
                                    senderName = sender.name;
                                    displayName = sender.name;
                                } else {
                                    senderName = 'Usuário Anônimo';
                                    displayName = `Usuário Anônimo • ${msg.clientId}`;
                                }
                            }

                            // Sanitize message if Sanitizer is available
                            const sanitizedMessage = typeof Sanitizer !== 'undefined'
                                ? Sanitizer.sanitizeMessage(msg.message)
                                : msg.message;

                            this.roomLog(
                                sanitizedMessage,
                                'user_message',
                                senderName,
                                msg.timestamp,
                                displayName,
                                msg.clientId,
                                msg.supabaseUser,
                                data.roomId
                            );
                        });
                    }

                    Toast.success(`Entrou na sala ${data.roomName}!`);
                    this.log(`✅ Entrou na sala ${data.roomName}`, 'success');
                });

                this.socket.on('leftRoom', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    if (activeRoom) {
                        activeRoom.joined = false;
                        this.roomLog(`👋 Você saiu da sala`, 'info', null, null, null, null, null, data.roomId);
                    }
                    
                    // Update legacy property if this is the current room
                    if (this.currentActiveRoomId === data.roomId) {
                        this.isInRoom = false;
                    }
                    
                    Toast.info('Você saiu da sala');
                });

                this.socket.on('newMessage', (data) => {
                    // Check if message is from current user (by Supabase userId or clientId)
                    const isMyMessage = (data.userId && this.supabaseUser?.id === data.userId) ||
                                      (data.clientId === this.socket.id);
                    let senderName;
                    let displayName;

                    if (isMyMessage) {
                        senderName = 'Você';
                        displayName = 'Você';
                    } else {
                        // Prefer Supabase user data if available
                        if (data.supabaseUser) {
                            senderName = data.supabaseUser.email || data.supabaseUser.name || 'Usuário Supabase';
                            displayName = `${senderName} 🔒`;
                        } else {
                            // Find sender name from participants list using hybrid key
                            const activeRoom = this.getActiveRoom(data.roomId);
                            const messageKey = data.userId || data.clientId;
                            const sender = activeRoom?.participants.find(p => p.clientId === messageKey);
                            if (sender?.name) {
                                senderName = sender.name;
                                displayName = sender.name;
                            } else {
                                senderName = 'Usuário Anônimo';
                                displayName = `Usuário Anônimo • ${data.clientId}`;
                            }
                        }
                    }

                    // Sanitize message if Sanitizer is available
                    const sanitizedMessage = typeof Sanitizer !== 'undefined'
                        ? Sanitizer.sanitizeMessage(data.message)
                        : data.message;

                    this.roomLog(
                        sanitizedMessage,
                        'user_message',
                        senderName,
                        data.timestamp,
                        displayName,
                        data.clientId,
                        data.supabaseUser,
                        data.roomId
                    );

                    // Auto scroll to bottom only for current room
                    if (this.currentActiveRoomId === data.roomId) {
                        this.$nextTick(() => {
                            const chatMessages = this.$refs.chatMessages;
                            if (chatMessages && this.autoScroll) {
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        });
                    }
                });

                this.socket.on('userJoined', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    if (activeRoom) {
                        this.roomLog(`👤 ${data.participantName || 'Anônimo'} entrou na sala`, 'info', null, null, null, null, null, data.roomId);
                        // Refresh room info to get updated participant list
                        this.socket.emit('getRoomInfo', { roomId: data.roomId });
                    }
                });

                this.socket.on('userLeft', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    if (activeRoom) {
                        this.roomLog(`👋 ${data.participantName || 'Anônimo'} saiu da sala`, 'info', null, null, null, null, null, data.roomId);
                        // Refresh room info to get updated participant list
                        this.socket.emit('getRoomInfo', { roomId: data.roomId });
                    }
                });

                this.socket.on('participantNameUpdated', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    if (activeRoom) {
                        this.roomLog(`✏️ ${data.oldName || 'Anônimo'} agora é ${data.newName}`, 'info', null, null, null, null, null, data.roomId);
                        if (data.participants) {
                            activeRoom.participants = data.participants;
                            if (this.currentActiveRoomId === data.roomId) {
                                this.roomParticipants = data.participants;
                            }
                        }
                    }
                });

                this.socket.on('roomInfo', (data) => {
                    const activeRoom = this.getActiveRoom(data.id);
                    if (activeRoom) {
                        activeRoom.participants = data.participants || [];
                        if (this.currentActiveRoomId === data.id) {
                            this.roomParticipants = data.participants || [];
                        }
                    }
                });

                this.socket.on('roomDeleted', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    
                    if (activeRoom) {
                        this.roomLog(`🗑️ ${data.message}`, 'error', null, null, null, null, null, data.roomId);
                        Toast.error(data.message);
                        
                        // Close the room tab
                        this.closeRoomTab(data.roomId);
                    }

                    // Refresh room list to remove deleted room
                    if (this.currentPage === 'rooms') {
                        this.listRooms();
                    }
                    
                    this.log(`❌ Sala deletada: ${data.roomName}`, 'error');
                });

            } catch (error) {
                this.connecting = false;
                this.log(`❌ Erro ao criar socket: ${error.message}`, 'error');
                Toast.error('Erro ao criar conexão');
            }
        },

        disconnect() {
            if (!this.socket) return;

            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            
            // Mark all rooms as not joined
            this.activeRooms.forEach(room => {
                room.joined = false;
            });
            
            // Update legacy properties
            this.isInRoom = false;
            
            this.log('🔌 Desconectado manualmente', 'info');
            Toast.info('Desconectado');
        },

        // ==================== UTILITIES ====================
        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString('pt-BR');
            const fullTimestamp = new Date().toLocaleString('pt-BR');

            this.logs.push({
                message,
                type,
                timestamp,
                fullTimestamp
            });

            // Keep last 100 logs
            if (this.logs.length > 100) {
                this.logs = this.logs.slice(-100);
            }

            console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        },

        clearLogs() {
            this.logs = [];
        },

        // ==================== PAGE-SPECIFIC ACTIONS ====================
        async createRoom() {
            if (!this.newRoomName.trim()) {
                Toast.error('Digite um nome para a sala');
                return;
            }

            this.isCreatingRoom = true;
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (this.apiKey) headers['x-api-key'] = this.apiKey;
                if (this.supabaseToken) headers['Authorization'] = `Bearer ${this.supabaseToken}`;

                const response = await fetch(`${this.baseUrl}/room`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: this.newRoomName })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const room = await response.json();
                this.rooms.unshift(room);
                this.updateStats();
                this.log(`✅ Sala criada: ${room.name}`, 'success');
                this.newRoomName = '';
                this.showCreateRoomModal = false;
                Toast.success('Sala criada com sucesso!');
            } catch (error) {
                this.log(`❌ Erro ao criar sala: ${error.message}`, 'error');
                Toast.error('Erro ao criar sala');
            } finally {
                this.isCreatingRoom = false;
            }
        },

        async deleteRoom(roomId) {
            if (!confirm('Tem certeza que deseja excluir esta sala?')) return;

            try {
                const headers = {};
                if (this.apiKey) headers['x-api-key'] = this.apiKey;
                if (this.supabaseToken) headers['Authorization'] = `Bearer ${this.supabaseToken}`;

                const response = await fetch(`${this.baseUrl}/room/${roomId}`, {
                    method: 'DELETE',
                    headers
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                this.rooms = this.rooms.filter(r => r.id !== roomId);
                this.updateStats();
                this.log(`✅ Sala excluída`, 'success');
                Toast.success('Sala excluída');

                // Close the room tab if open
                const activeRoom = this.getActiveRoom(roomId);
                if (activeRoom) {
                    this.closeRoomTab(roomId);
                }
            } catch (error) {
                this.log(`❌ Erro ao excluir sala: ${error.message}`, 'error');
                Toast.error('Erro ao excluir sala');
            }
        },

        // ==================== MULTIPLE ROOMS MANAGEMENT ====================
        getActiveRoom(roomId) {
            return this.activeRooms.find(r => r.id === roomId);
        },

        getCurrentActiveRoom() {
            return this.getActiveRoom(this.currentActiveRoomId);
        },

        openRoom(roomId, roomName) {
            // Check if room is already open
            let activeRoom = this.getActiveRoom(roomId);
            
            if (!activeRoom) {
                // Create new active room
                activeRoom = {
                    id: roomId,
                    name: roomName,
                    logs: [],
                    participants: [],
                    unreadCount: 0,
                    joined: false
                };
                this.activeRooms.push(activeRoom);
                this.log(`📂 Sala ${roomName} adicionada às abas`, 'info');
            }

            // Switch to this room
            this.currentActiveRoomId = roomId;
            
            // Update legacy properties for backward compatibility
            this.currentRoomId = roomId;
            this.currentRoomName = roomName;
            this.roomLogs = activeRoom.logs;
            this.roomParticipants = activeRoom.participants;
            this.isInRoom = activeRoom.joined;

            // Reset unread count
            activeRoom.unreadCount = 0;

            // Open chat modal
            this.showChatModal = true;

            // Auto join if connected and not already joined
            if (this.isConnected && this.socket && !activeRoom.joined) {
                this.joinRoom(roomId);
            }

            Toast.info(`Sala: ${roomName}`);
        },

        joinRoom(roomId = null) {
            if (!this.socket || !this.isConnected) {
                Toast.error('Conecte ao WebSocket primeiro');
                return;
            }

            const targetRoomId = roomId || this.currentActiveRoomId;
            if (!targetRoomId) {
                Toast.error('Selecione uma sala primeiro');
                return;
            }

            const activeRoom = this.getActiveRoom(targetRoomId);
            if (!activeRoom) {
                Toast.error('Sala não encontrada nas abas ativas');
                return;
            }

            this.socket.emit('joinRoom', {
                roomId: targetRoomId,
                participantName: this.participantName || null
            });

            this.log(`🔌 Entrando na sala ${activeRoom.name}...`, 'info');
        },

        leaveRoom(roomId = null) {
            const targetRoomId = roomId || this.currentActiveRoomId;
            if (!this.socket || !targetRoomId) return;

            const activeRoom = this.getActiveRoom(targetRoomId);
            if (!activeRoom) return;

            this.socket.emit('leaveRoom', { roomId: targetRoomId });
            activeRoom.joined = false;
            
            this.log(`👋 Saiu da sala ${activeRoom.name}`, 'info');
        },

        closeRoomTab(roomId) {
            const activeRoom = this.getActiveRoom(roomId);
            if (!activeRoom) return;

            // Leave room if joined
            if (activeRoom.joined) {
                this.leaveRoom(roomId);
            }

            // Remove from active rooms
            this.activeRooms = this.activeRooms.filter(r => r.id !== roomId);
            
            // If this was the current room, switch to another or close modal
            if (this.currentActiveRoomId === roomId) {
                if (this.activeRooms.length > 0) {
                    // Switch to first available room
                    const nextRoom = this.activeRooms[0];
                    this.currentActiveRoomId = nextRoom.id;
                    this.currentRoomId = nextRoom.id;
                    this.currentRoomName = nextRoom.name;
                    this.roomLogs = nextRoom.logs;
                    this.roomParticipants = nextRoom.participants;
                    this.isInRoom = nextRoom.joined;
                } else {
                    // No more rooms, close modal
                    this.currentActiveRoomId = null;
                    this.currentRoomId = null;
                    this.currentRoomName = null;
                    this.roomLogs = [];
                    this.roomParticipants = [];
                    this.isInRoom = false;
                    this.showChatModal = false;
                }
            }

            Toast.info(`Aba ${activeRoom.name} fechada`);
        },

        switchToRoom(roomId) {
            const activeRoom = this.getActiveRoom(roomId);
            if (!activeRoom) return;

            this.currentActiveRoomId = roomId;
            this.currentRoomId = roomId;
            this.currentRoomName = activeRoom.name;
            this.roomLogs = activeRoom.logs;
            this.roomParticipants = activeRoom.participants;
            this.isInRoom = activeRoom.joined;

            // Reset unread count
            activeRoom.unreadCount = 0;

            // Auto-scroll to bottom
            this.$nextTick(() => {
                const chatMessages = this.$refs.chatMessages;
                if (chatMessages && this.autoScroll) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            });
        },

        sendMessage() {
            if (!this.message.trim()) return;
            if (!this.socket || !this.currentActiveRoomId) {
                Toast.error('Não está conectado a uma sala');
                return;
            }

            this.socket.emit('sendMessage', {
                roomId: this.currentActiveRoomId,
                message: this.message
            });

            this.message = '';
        },

        updateParticipantName() {
            if (!this.participantName.trim()) {
                Toast.error('Digite um nome');
                return;
            }

            localStorage.setItem('participantName', this.participantName);

            // Update name in all joined rooms
            if (this.socket && this.isConnected) {
                this.activeRooms.forEach(room => {
                    if (room.joined) {
                        this.socket.emit('updateParticipantName', {
                            roomId: room.id,
                            name: this.participantName
                        });
                    }
                });
            }

            Toast.success('Nome atualizado');
        },

        roomLog(message, type = 'info', senderName = null, timestamp = null, displayName = null, senderId = null, supabaseUser = null, roomId = null) {
            const targetRoomId = roomId || this.currentActiveRoomId;
            const activeRoom = this.getActiveRoom(targetRoomId);
            
            if (!activeRoom) {
                // Fallback to legacy roomLogs if room not found
                this.roomLogs.push({
                    message,
                    type,
                    senderName,
                    timestamp: timestamp || new Date().toISOString(),
                    displayName,
                    senderId,
                    supabaseUser
                });
                if (this.roomLogs.length > 100) {
                    this.roomLogs = this.roomLogs.slice(-100);
                }
                return;
            }

            activeRoom.logs.push({
                message,
                type,
                senderName,
                timestamp: timestamp || new Date().toISOString(),
                displayName,
                senderId,
                supabaseUser
            });

            if (activeRoom.logs.length > 100) {
                activeRoom.logs = activeRoom.logs.slice(-100);
            }

            // Update unread count if not currently viewing this room
            if (type === 'user_message' && this.currentActiveRoomId !== targetRoomId) {
                activeRoom.unreadCount = (activeRoom.unreadCount || 0) + 1;
            }

            // Update legacy roomLogs if this is the current room
            if (targetRoomId === this.currentActiveRoomId) {
                this.roomLogs = activeRoom.logs;
            }
        },

        // ==================== METRICS ====================
        async fetchMetrics() {
            this.isLoadingMetrics = true;
            try {
                const headers = {};
                if (this.apiKey) headers['x-api-key'] = this.apiKey;
                if (this.supabaseToken) headers['Authorization'] = `Bearer ${this.supabaseToken}`;

                // Log authentication method being used
                if (!this.apiKey && !this.supabaseToken) {
                    this.log('⚠️ Buscando métricas sem autenticação', 'warning');
                } else if (this.apiKey) {
                    this.log('🔑 Buscando métricas com API Key', 'info');
                } else if (this.supabaseToken) {
                    this.log('🔑 Buscando métricas com Supabase Token', 'info');
                }

                const response = await fetch(`${this.baseUrl}/metrics`, { headers });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const rawMetrics = await response.json();

                // Transform backend response to match frontend structure
                this.metrics = {
                    connections: {
                        total: rawMetrics.totalClients || 0,
                        active: rawMetrics.totalClients || 0 // Backend doesn't distinguish, use same value
                    },
                    rooms: {
                        total: rawMetrics.totalRooms || 0,
                        active: rawMetrics.rooms?.filter(r => r.connections > 0).length || 0
                    },
                    messages: {
                        total: rawMetrics.totalMessages || 0
                    },
                    uptime: {
                        seconds: rawMetrics.uptime || 0,
                        formatted: this.formatUptime(rawMetrics.uptime || 0)
                    }
                };

                this.lastMetricsUpdate = new Date(); // Update timestamp
                this.log(`✅ Métricas atualizadas`, 'success');
            } catch (error) {
                this.log(`❌ Erro ao carregar métricas: ${error.message}`, 'error');
                // Don't show toast on auto-update errors to avoid spam
                if (!this.metricsInterval) {
                    Toast.error('Erro ao carregar métricas');
                }
            } finally {
                this.isLoadingMetrics = false;
            }
        },

        // Start auto-updating metrics every 30 seconds
        startMetricsAutoUpdate() {
            // Clear any existing interval
            if (this.metricsInterval) {
                clearInterval(this.metricsInterval);
            }

            // Set up new interval
            this.metricsInterval = setInterval(() => {
                // Only auto-update if we're on the dashboard page
                if (this.currentPage === 'dashboard') {
                    this.fetchMetrics();
                }
            }, 30000); // 30 seconds

            this.log('⏱️ Auto-atualização de métricas iniciada (30s)', 'info');
        },

        // Stop auto-updating metrics
        stopMetricsAutoUpdate() {
            if (this.metricsInterval) {
                clearInterval(this.metricsInterval);
                this.metricsInterval = null;
                this.log('⏱️ Auto-atualização de métricas pausada', 'info');
            }
        },

        // Format uptime from milliseconds to human-readable format
        formatUptime(ms) {
            if (!ms) return '0s';

            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                return `${days}d ${hours % 24}h ${minutes % 60}m`;
            } else if (hours > 0) {
                return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },

        // Check if a message is from the same Supabase user (even with different clientId)
        isSameSupabaseUser(supabaseUserId) {
            return this.supabaseUser?.id === supabaseUserId;
        },

        // Get a friendly identifier for display
        getUserIdentifier(participant) {
            if (participant.supabaseUser) {
                return {
                    type: 'authenticated',
                    display: participant.supabaseUser.email || participant.supabaseUser.name || 'Usuário Supabase',
                    icon: '🔒',
                    supabaseId: participant.supabaseUser.id
                };
            } else if (participant.name) {
                return {
                    type: 'named',
                    display: participant.name,
                    icon: '👤',
                    supabaseId: null
                };
            } else {
                return {
                    type: 'anonymous',
                    display: `Anônimo • ${participant.clientId.slice(0, 8)}`,
                    icon: '👻',
                    supabaseId: null
                };
            }
        }
    };
}
