/**
 * RoomStream Platform - Modern SPA Application
 * Baseado no socketTester() mas com navegação por páginas
 */
function platformApp() {
    return {
        // ==================== INITIALIZATION ====================
        isInitializing: true, // True até o init() completar

        // ==================== NAVIGATION & ROUTING ====================
        currentPage: 'dashboard', // 'dashboard', 'rooms', 'applications', 'settings'
        validPages: ['dashboard', 'rooms', 'applications', 'settings'], // Valid page names
        sidebarExpanded: false, // Sidebar começa fechada
        sidebarPinned: false, // Se está fixada (não fecha com hover out)
        metricsInterval: null, // Interval for auto-updating metrics
        tokenRefreshInterval: null, // Interval for checking/refreshing Supabase token

        // ==================== CONNECTION STATE ====================
        socket: null,
        isConnected: false,
        connecting: false,
        pendingRoomToOpen: null, // {roomId, roomName} - sala para abrir após conexão

        // ==================== CONFIG & FORM DATA ====================
        baseUrl: window.location.origin,
        wsNamespace: '/ws/rooms',
        apiKey: '',
        apiKeyInput: '',
        newApiKeyInput: '',
        newRoomName: '',
        participantName: '',
        message: '',
        currentEvent: 'message', // Evento atual para envio (default: 'message')
        showEventMenu: false, // Controla visibilidade do menu de eventos
        customEventInput: '', // Input para evento customizado
        recentEvents: ['message'], // Histórico de eventos usados recentemente
        loginMethod: '', // 'supabase' or 'apikey' - será definido dinamicamente baseado nas opções disponíveis

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
        unreadWhileScrolled: 0, // Contador de mensagens novas enquanto autoScroll está desabilitado
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
        
        // Profile Modal Mode
        profileMode: 'own', // 'own' = viewing own profile, 'viewing' = viewing another participant
        viewingParticipant: null, // Stores participant data when viewing another user's profile
        
        // Bottom Sheet Swipe State (for mobile modals)
        swipeStartY: 0,
        swipeCurrentY: 0,
        swipeDelta: 0,
        swipeThreshold: 100, // pixels to swipe down to close

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

        // ==================== APPLICATIONS ====================
        applications: [],
        selectedApplication: null,
        applicationForm: {
            name: '',
            description: '',
            isActive: true
        },
        showCreateApplicationModal: false,
        showEditApplicationModal: false,
        showApiKeyModal: false,
        showDeleteApplicationModal: false,
        showRegenerateKeyModal: false,
        isLoadingApplications: false,
        isSavingApplication: false,
        isDeletingApplication: false,
        isRegeneratingKey: false,

        // ==================== ROOM APPLICATIONS ====================
        showRoomApplicationsModal: false,
        selectedRoomForApplications: null,
        roomApplicationIds: [],
        roomApplicationMeta: {},
        isLoadingRoomApplications: false,
        savingRoomApplicationId: null,

        // ==================== INITIALIZE ====================
        async init() {
            // Load configuration from window.ENV (NOT API_KEY)
            if (window.ENV) {
                this.wsNamespace = window.ENV.wsNamespace || this.wsNamespace;
                // API_KEY não é mais carregada do servidor
            }

            // Load valid pages from server (SPA pages only)
            if (window.SPA_PAGES) {
                this.validPages = window.SPA_PAGES;
            } else if (window.VALID_PAGES) {
                this.validPages = window.VALID_PAGES;
            }

            // Initialize SPA routing (reads page from URL or server)
            this.initializeRouting();

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

            // Determina qual método de login mostrar baseado nas opções disponíveis
            // window.AUTH_FEATURES contém: { supabaseAuth: boolean, apiKeyAuth: boolean }
            const hasSupabase = window.AUTH_FEATURES?.supabaseAuth || false;
            const hasApiKey = window.AUTH_FEATURES?.apiKeyAuth || false;
            
            // Se houver apenas uma opção disponível, seleciona automaticamente
            if (hasSupabase && !hasApiKey) {
                this.loginMethod = 'supabase';
                this.log('🔑 Apenas autenticação Supabase disponível', 'info');
            } else if (!hasSupabase && hasApiKey) {
                this.loginMethod = 'apikey';
                this.log('🔑 Apenas autenticação API Key disponível', 'info');
            } else if (hasSupabase && hasApiKey) {
                this.loginMethod = 'supabase'; // Supabase como padrão
                this.log('🔑 Ambos métodos de autenticação disponíveis (Supabase selecionado)', 'info');
            } else {
                this.loginMethod = 'apikey'; // Fallback para API Key
                this.log('⚠️ Nenhum método de autenticação configurado no servidor', 'warning');
            }

            this.log('🚀 RoomStream Platform carregada', 'success');

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Só inicializa features da plataforma se usuário estiver autenticado
            if (this.isAuthenticated()) {
                this.log('💡 Use o menu lateral para navegar', 'info');

                // Only fetch rooms if not pre-loaded
                if (!window.INITIAL_DATA?.rooms) {
                    this.listRooms();
                }

                // Setup keyboard shortcuts
                this.setupKeyboardShortcuts();

                // Setup ESC key to close modals (apenas quando autenticado)
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.isAuthenticated()) {
                        this.showProfileModal = false;
                        this.showChatModal = false;
                        this.showShortcutsModal = false;
                        this.showCreateRoomModal = false;
                        this.showRoomApplicationsModal = false;
                    }
                });
            } else {
                this.log('👋 Bem-vindo! Faça login para começar', 'info');
            }

            // Initialization complete - hide loader
            this.isInitializing = false;
        },

        // ==================== AUTH HELPER ====================
        isAuthenticated() {
            return !!(this.apiKey || this.supabaseUser);
        },

        initializePlatformFeatures() {
            // Só inicializa se ainda não foi inicializado
            if (this.metricsInterval) {
                return; // Já inicializado
            }

            this.log('💡 Inicializando features da plataforma...', 'info');

            // Fetch initial data
            this.listRooms();
            
            // Start Supabase token refresh check (if using Supabase)
            this.startTokenRefreshCheck();

            this.log('✅ Plataforma pronta para uso', 'success');
        },

        // ==================== NAVIGATION ====================
        
        /**
         * Initialize SPA routing
         * Reads page from URL path, hash, or server-provided initial page
         */
        initializeRouting() {
            // Priority: 1) URL path, 2) Hash, 3) Server-provided, 4) Default
            const urlPage = this.getPageFromUrl();
            const hashPage = window.location.hash.slice(1);
            const serverPage = window.INITIAL_PAGE;
            
            if (urlPage && this.validPages.includes(urlPage)) {
                this.currentPage = urlPage;
            } else if (hashPage && this.validPages.includes(hashPage)) {
                this.currentPage = hashPage;
                // Update URL to use path instead of hash
                this.updateUrl(false);
            } else if (serverPage && this.validPages.includes(serverPage)) {
                this.currentPage = serverPage;
            }
            
            // Listen for browser back/forward navigation
            window.addEventListener('popstate', (event) => {
                if (event.state?.page) {
                    this.currentPage = event.state.page;
                } else {
                    this.currentPage = this.getPageFromUrl() || 'dashboard';
                }
                this.onPageChange();
            });
            
            this.log(`📍 Página inicial: ${this.currentPage}`, 'info');
        },
        
        /**
         * Extract page name from current URL path
         */
        getPageFromUrl() {
            const path = window.location.pathname;
            // Match /platform/pageName pattern
            const match = path.match(/^\/platform\/([a-z-]+)$/);
            return match ? match[1] : null;
        },
        
        /**
         * Update URL without reloading
         * @param {boolean} pushState - Whether to push a new history state
         */
        updateUrl(pushState = true) {
            const newPath = this.currentPage === 'dashboard' 
                ? '/platform' 
                : `/platform/${this.currentPage}`;
            
            if (window.location.pathname !== newPath) {
                if (pushState) {
                    history.pushState({ page: this.currentPage }, '', newPath);
                } else {
                    history.replaceState({ page: this.currentPage }, '', newPath);
                }
            }
        },
        
        /**
         * Called when page changes (for side effects)
         */
        onPageChange() {
            // Update icons
            this.$nextTick(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            });
        },

        navigateTo(page) {
            if (!this.validPages.includes(page)) {
                this.log(`⚠️ Página inválida: ${page}`, 'warning');
                return;
            }
            
            this.currentPage = page;
            
            // Update URL
            this.updateUrl();

            // Load applications when navigating to applications page
            if (page === 'applications') {
                this.loadApplications();
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
            // Mobile: apenas toggle expand (não usa pin)
            if (window.innerWidth < 1024) {
                this.sidebarExpanded = !this.sidebarExpanded;
            } 
            // Desktop: toggle pin e expand juntos
            else {
                this.sidebarPinned = !this.sidebarPinned;
                this.sidebarExpanded = this.sidebarPinned;
            }
        },

        // Hover handlers para sidebar (apenas desktop)
        handleSidebarMouseEnter() {
            // Só funciona em desktop (>= 1024px)
            if (window.innerWidth >= 1024) {
                this.sidebarExpanded = true;
            }
        },

        handleSidebarMouseLeave() {
            // Só funciona em desktop (>= 1024px)
            // Só fecha se não estiver fixada
            if (window.innerWidth >= 1024 && !this.sidebarPinned) {
                this.sidebarExpanded = false;
            }
        },

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Não processa atalhos se não estiver autenticado
                if (!this.isAuthenticated()) {
                    return;
                }

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
                        case 'q':
                        case 'Q':
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

                // Inicializar features da plataforma após login
                this.$nextTick(() => {
                    this.initializePlatformFeatures();
                });

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

            // Inicializar features da plataforma após login
            this.$nextTick(() => {
                this.initializePlatformFeatures();
            });
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

        // ==================== TOKEN VALIDATION & REFRESH ====================
        
        /**
         * Centraliza lógica de logout por token inválido/expirado
         * Limpa todas as credenciais e estado, desconecta WebSocket, para polling
         */
        handleUnauthorized() {
            this.log('❌ Sessão expirada ou inválida', 'error');
            Toast.error('Sessão expirada. Faça login novamente.');
            
            // Limpa credenciais
            this.apiKey = '';
            this.supabaseToken = null;
            this.supabaseUser = null;
            this.participantName = '';
            
            // Limpa localStorage
            localStorage.removeItem('apiKey');
            localStorage.removeItem('supabaseToken');
            localStorage.removeItem('supabaseUser');
            localStorage.removeItem('participantName');
            
            // Desconecta WebSocket
            if (this.socket && this.isConnected) {
                this.disconnect();
            }
            
            // Para polling de métricas e refresh de token
            this.stopMetricsAutoUpdate();
            this.stopTokenRefreshCheck();
            
            // Fecha modais
            this.showProfileModal = false;
            this.showChatModal = false;
            this.showShortcutsModal = false;
            this.showCreateRoomModal = false;
            this.showRoomApplicationsModal = false;
            
            // Limpa estado
            this.rooms = [];
            this.activeRooms = [];
            this.currentRoomId = null;
            this.isInRoom = false;
            
            this.log('🔓 Deslogado automaticamente', 'info');
        },

        /**
         * Verifica e renova token Supabase antes de expirar
         * Previne desconexão desnecessária mantendo sessão ativa
         */
        async ensureValidToken() {
            if (!this.supabaseClient || !this.supabaseToken) {
                return; // Não usa Supabase
            }
            
            try {
                // Pega sessão atual
                const { data: { session }, error } = await this.supabaseClient.auth.getSession();
                
                if (error || !session) {
                    // Sessão inválida
                    this.log('❌ Sessão Supabase inválida', 'error');
                    this.handleUnauthorized();
                    return;
                }
                
                // Verifica se token vai expirar em breve (< 5 minutos)
                const expiresAt = session.expires_at * 1000; // Converte para ms
                const now = Date.now();
                const fiveMinutes = 5 * 60 * 1000;
                
                if (expiresAt - now < fiveMinutes) {
                    // Token expirando, faz refresh
                    this.log('🔄 Renovando token Supabase...', 'info');
                    
                    const { data: refreshed, error: refreshError } = 
                        await this.supabaseClient.auth.refreshSession();
                    
                    if (refreshError || !refreshed.session) {
                        this.log('❌ Falha ao renovar token', 'error');
                        this.handleUnauthorized();
                        return;
                    }
                    
                    // Atualiza token
                    this.supabaseToken = refreshed.session.access_token;
                    this.supabaseUser = refreshed.session.user;
                    localStorage.setItem('supabaseToken', this.supabaseToken);
                    localStorage.setItem('supabaseUser', JSON.stringify(this.supabaseUser));
                    
                    this.log('✅ Token renovado com sucesso', 'success');
                    Toast.success('Sessão renovada automaticamente');
                    
                    // Reconecta WebSocket com novo token
                    if (this.isConnected) {
                        this.log('🔄 Reconectando WebSocket com novo token...', 'info');
                        this.disconnect();
                        // Aguarda um pouco antes de reconectar
                        setTimeout(() => {
                            this.connect();
                        }, 500);
                    }
                }
            } catch (error) {
                console.error('Token refresh error:', error);
                this.log(`❌ Erro ao verificar token: ${error.message}`, 'error');
                this.handleUnauthorized();
            }
        },

        /**
         * Inicia verificação periódica de token Supabase (a cada 1 minuto)
         */
        startTokenRefreshCheck() {
            if (!this.supabaseClient || this.tokenRefreshInterval) {
                return; // Não usa Supabase ou já está rodando
            }
            
            this.log('🔄 Iniciando verificação periódica de token...', 'info');
            
            // Verifica imediatamente
            this.ensureValidToken();
            
            // Depois verifica a cada 1 minuto
            this.tokenRefreshInterval = setInterval(() => {
                this.ensureValidToken();
            }, 60000); // 60 segundos
        },

        /**
         * Para verificação periódica de token
         */
        stopTokenRefreshCheck() {
            if (this.tokenRefreshInterval) {
                clearInterval(this.tokenRefreshInterval);
                this.tokenRefreshInterval = null;
                this.log('⏹️ Verificação de token parada', 'info');
            }
        },

        /**
         * Wrapper para fetch que:
         * - Garante token válido antes de fazer requisição
         * - Adiciona headers de autenticação automaticamente
         * - Trata 401 (Unauthorized) automaticamente
         */
        async authenticatedFetch(url, options = {}) {
            // Garante token válido antes de fazer requisição
            await this.ensureValidToken();
            
            // Adiciona headers de autenticação
            const headers = { ...options.headers };
            if (this.apiKey) {
                headers['x-api-key'] = this.apiKey;
            }
            if (this.supabaseToken) {
                headers['Authorization'] = `Bearer ${this.supabaseToken}`;
            }
            
            // Faz requisição
            const response = await fetch(url, { ...options, headers });
            
            // Trata 401 especificamente
            if (response.status === 401) {
                this.log('❌ Requisição rejeitada: 401 Unauthorized', 'error');
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }
            
            return response;
        },

        // ==================== ROOMS & WEBSOCKET (from original app.js) ====================
        // Import all the original socketTester() methods here
        // (Connection, rooms, messages, etc.)

        async listRooms() {
            this.isLoadingRooms = true;
            try {
                const response = await this.authenticatedFetch(`${this.baseUrl}/rooms`);

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const data = await response.json();
                this.rooms = Array.isArray(data) ? data : [];
                this.updateStats();
                this.log(`✅ ${this.rooms.length} salas carregadas`, 'success');
            } catch (error) {
                // Se erro for 'Unauthorized', já foi tratado pelo authenticatedFetch
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao listar salas: ${error.message}`, 'error');
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Erro ao carregar salas');
                    }
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
                    
                    // Abrir sala pendente após conexão
                    if (this.pendingRoomToOpen) {
                        const { roomId, roomName } = this.pendingRoomToOpen;
                        this.pendingRoomToOpen = null; // Limpa a fila
                        this.log(`🚪 Abrindo sala pendente: ${roomName}`, 'info');
                        // Usar setTimeout para garantir que o socket está totalmente pronto
                        setTimeout(() => {
                            this.openRoom(roomId, roomName);
                        }, 100);
                    }
                });

                this.socket.on('disconnect', (reason) => {
                    this.isConnected = false;
                    this.pendingRoomToOpen = null; // Limpa sala pendente ao desconectar
                    this.log(`❌ Desconectado: ${reason}`, 'error');
                });

                this.socket.on('connect_error', (error) => {
                    this.connecting = false;
                    this.isConnected = false;
                    this.pendingRoomToOpen = null; // Limpa sala pendente em caso de erro
                    this.log(`❌ Erro de conexão: ${error.message}`, 'error');
                    Toast.error('Erro ao conectar');
                });

                // Authentication error events
                this.socket.on('tokenExpired', (data) => {
                    this.log(`❌ Token expirado: ${data.message}`, 'error');
                    Toast.error('Sua sessão expirou. Faça login novamente.');
                    this.handleUnauthorized();
                });

                this.socket.on('error', (data) => {
                    this.log(`❌ Erro de autenticação: ${data.message || 'Unknown error'}`, 'error');
                    // Verifica se é erro relacionado a autenticação
                    const authErrorKeywords = ['token', 'authentication', 'auth', 'unauthorized', 'api key'];
                    const isAuthError = authErrorKeywords.some(keyword => 
                        (data.message || '').toLowerCase().includes(keyword)
                    );
                    
                    if (isAuthError) {
                        Toast.error(data.message || 'Erro de autenticação');
                        this.handleUnauthorized();
                    } else {
                        // Erro genérico, não desloga
                        Toast.error(data.message || 'Erro no WebSocket');
                    }
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
                        
                        // Temporarily disable auto-scroll counter for history messages
                        const originalAutoScroll = this.autoScroll;
                        this.autoScroll = false;
                        
                        data.recentMessages.forEach(msg => {
                            // Reutiliza o handler de mensagens, adicionando roomId
                            this.handleIncomingMessage({ ...msg, roomId: data.roomId });
                        });
                        
                        // Restore auto-scroll and scroll to bottom
                        this.autoScroll = originalAutoScroll;
                        if (this.currentActiveRoomId === data.roomId) {
                            this.scrollToBottom();
                        }
                    }

                    Toast.success(`Entrou na sala ${data.roomName}!`);
                    this.log(`✅ Entrou na sala ${data.roomName}`, 'success');
                });

                this.socket.on('leftRoom', (data) => {
                    const activeRoom = this.getActiveRoom(data.roomId);
                    if (activeRoom) {
                        activeRoom.joined = false;
                        // Limpa o histórico de mensagens ao sair da sala
                        activeRoom.logs = [];
                        activeRoom.participants = [];
                    }
                    
                    // Update legacy properties if this is the current room
                    if (this.currentActiveRoomId === data.roomId) {
                        this.isInRoom = false;
                        this.roomLogs = [];
                        this.roomParticipants = [];
                    }
                    
                    this.log(`👋 Saiu da sala ${data.roomId}`, 'info');
                });

                // Lista de eventos do sistema que NÃO são eventos de sala customizados
                const systemEvents = [
                    'connect', 'disconnect', 'error', 'connect_error',
                    'joinedRoom', 'leftRoom', 'userJoined', 'userLeft',
                    'roomInfo', 'roomDeleted', 'participantNameUpdated',
                    'tokenExpired'
                ];

                // Handler universal para TODOS os eventos (incluindo customizados)
                this.socket.onAny((eventName, data) => {
                    // Ignora eventos do sistema
                    if (systemEvents.includes(eventName)) {
                        return;
                    }

                    // Verifica se é um evento de sala (tem roomId)
                    if (data && data.roomId) {
                        this.handleIncomingMessage(data, eventName);
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
        
        /**
         * Scroll para o final das mensagens do chat
         * Usa $nextTick para garantir que o DOM foi atualizado
         */
        scrollToBottom(force = false) {
            if (!this.autoScroll && !force) return;
            
            this.$nextTick(() => {
                const chatMessages = this.$refs.chatMessages;
                if (chatMessages) {
                    chatMessages.scrollTo({
                        top: chatMessages.scrollHeight,
                        behavior: 'smooth'
                    });
                    // Reabilita autoScroll e reseta contador quando forçado
                    if (force) {
                        this.autoScroll = true;
                        this.unreadWhileScrolled = 0;
                    }
                }
            });
        },

        /**
         * Handler de scroll do chat
         * Detecta se o usuário está no final da lista para controlar autoScroll
         */
        handleChatScroll(event) {
            const el = event.target;
            // Margem de tolerância de 50px para considerar "no final"
            const threshold = 50;
            const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
            
            // Se voltou ao final, reseta o contador de mensagens não lidas
            if (isAtBottom && !this.autoScroll) {
                this.unreadWhileScrolled = 0;
            }
            
            // Atualiza autoScroll baseado na posição
            this.autoScroll = isAtBottom;
        },

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
                const response = await this.authenticatedFetch(`${this.baseUrl}/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                // Se erro for 'Unauthorized', já foi tratado pelo authenticatedFetch
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao criar sala: ${error.message}`, 'error');
                    Toast.error('Erro ao criar sala');
                }
            } finally {
                this.isCreatingRoom = false;
            }
        },

        async deleteRoom(roomId) {
            if (!confirm('Tem certeza que deseja excluir esta sala?')) return;

            try {
                const response = await this.authenticatedFetch(`${this.baseUrl}/rooms/${roomId}`, {
                    method: 'DELETE'
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
                // Se erro for 'Unauthorized', já foi tratado pelo authenticatedFetch
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao excluir sala: ${error.message}`, 'error');
                    Toast.error('Erro ao excluir sala');
                }
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
            // Auto-connect WebSocket if not connected
            if (!this.isConnected && !this.connecting) {
                Toast.info('Conectando ao WebSocket...');
                // Armazena a sala para abrir após conexão
                this.pendingRoomToOpen = { roomId, roomName };
                this.connect();
                return; // Espera conexão ser estabelecida
            }

            // Se ainda está conectando, armazena a sala pendente
            if (this.connecting) {
                this.pendingRoomToOpen = { roomId, roomName };
                Toast.info('Aguardando conexão...');
                return;
            }

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
            
            // Auto scroll ao abrir o modal
            this.scrollToBottom();

            // Auto join if connected and not already joined
            if (this.isConnected && this.socket && !activeRoom.joined) {
                this.joinRoom(roomId);
            }
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
            this.scrollToBottom();
        },

        sendMessage() {
            if (!this.message.trim()) return;
            if (!this.socket || !this.currentActiveRoomId) {
                Toast.error('Não está conectado a uma sala');
                return;
            }

            this.emitToRoom(this.currentActiveRoomId, this.message, this.currentEvent);
            this.message = '';
            
            // Adiciona ao histórico de eventos recentes (se não for 'message' e não existir)
            if (this.currentEvent !== 'message' && !this.recentEvents.includes(this.currentEvent)) {
                this.recentEvents.unshift(this.currentEvent);
                // Mantém apenas os últimos 5 eventos
                if (this.recentEvents.length > 6) {
                    this.recentEvents = this.recentEvents.slice(0, 6);
                }
            }
            
            // Auto scroll após enviar mensagem
            this.scrollToBottom();
        },

        /**
         * Define o evento atual para envio de mensagens
         * @param {string} event - Nome do evento
         */
        setCurrentEvent(event) {
            if (!event || !event.trim()) return;
            this.currentEvent = event.trim();
            this.showEventMenu = false;
            this.customEventInput = '';
            Toast.success(`Evento alterado para: ${this.currentEvent}`);
        },

        /**
         * Define um evento customizado a partir do input
         */
        setCustomEvent() {
            if (!this.customEventInput.trim()) {
                Toast.error('Digite o nome do evento');
                return;
            }
            // Valida o formato do evento
            const eventName = this.customEventInput.trim();
            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(eventName)) {
                Toast.error('Evento inválido. Use apenas letras, números, _ ou -');
                return;
            }
            this.setCurrentEvent(eventName);
        },

        /**
         * Emite um evento customizado para uma sala
         * @param {string} roomId - ID da sala
         * @param {string} message - Conteúdo da mensagem/evento
         * @param {string} event - Nome do evento (default: 'message')
         */
        emitToRoom(roomId, message, event = 'message') {
            if (!this.socket || !this.isConnected) {
                Toast.error('Não está conectado ao WebSocket');
                return;
            }

            this.socket.emit('emit', {
                roomId,
                message,
                event
            });
        },

        /**
         * Handler centralizado para mensagens/eventos recebidos
         * Processa eventos de sala e exibe no chat
         * @param {Object} data - Dados do evento
         * @param {string} eventName - Nome do evento (default: 'message' ou data.event)
         */
        handleIncomingMessage(data, eventName = null) {
            // Determina o nome do evento (prioridade: parâmetro > data.event > 'message')
            const event = eventName || data.event || 'message';
            
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
                    // Check if message already has participantName (backend field)
                    if (data.participantName) {
                        senderName = data.participantName;
                        displayName = data.participantName;
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
                data.roomId,
                event // Passa o nome do evento para o roomLog
            );

            // Auto scroll to bottom only for current room
            if (this.currentActiveRoomId === data.roomId) {
                // Incrementa contador se autoScroll está desabilitado
                if (!this.autoScroll) {
                    this.unreadWhileScrolled++;
                }
                this.scrollToBottom();
            }
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

        roomLog(message, type = 'info', senderName = null, timestamp = null, displayName = null, senderId = null, supabaseUser = null, roomId = null, eventName = null) {
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
                    supabaseUser,
                    eventName // Nome do evento customizado
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
                supabaseUser,
                eventName // Nome do evento customizado
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
                const response = await this.authenticatedFetch(`${this.baseUrl}/metrics`);

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
                // Se erro for 'Unauthorized', já foi tratado pelo authenticatedFetch
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao carregar métricas: ${error.message}`, 'error');
                    // Don't show toast on auto-update errors to avoid spam
                    if (!this.metricsInterval) {
                        Toast.error('Erro ao carregar métricas');
                    }
                }
            } finally {
                this.isLoadingMetrics = false;
            }
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
        },

        // ==================== PROFILE MODAL FUNCTIONS ====================
        
        // Open profile modal to view own profile
        viewOwnProfile() {
            this.profileMode = 'own';
            this.viewingParticipant = null;
            this.showProfileModal = true;
        },

        // Open profile modal to view another participant's profile
        viewParticipantProfile(participant) {
            // Don't allow viewing own profile this way (should use viewOwnProfile)
            // Check both socket.id (for anonymous users) and supabaseUser.id (for authenticated users)
            const isMySocketId = participant.clientId === this.socket?.id;
            const isMySupabaseId = this.supabaseUser && participant.clientId === this.supabaseUser.id;
            
            if (isMySocketId || isMySupabaseId) {
                this.viewOwnProfile();
                return;
            }

            this.profileMode = 'viewing';
            this.viewingParticipant = participant;
            this.showProfileModal = true;
            this.log(`👁️ Visualizando perfil de: ${participant.name || participant.clientId}`, 'info');
        },

        // Check if currently viewing another participant's profile
        isViewingOtherProfile() {
            return this.profileMode === 'viewing' && this.viewingParticipant !== null;
        },

        // Get display name for the profile being viewed
        getProfileDisplayName() {
            if (this.profileMode === 'own') {
                return this.supabaseUser?.email || this.participantName || 'Meu Perfil';
            } else if (this.viewingParticipant) {
                return this.viewingParticipant.supabaseUser?.email 
                    || this.viewingParticipant.name 
                    || 'Usuário Anônimo';
            }
            return 'Perfil';
        },

        // ==================== BOTTOM SHEET SWIPE HANDLERS ====================
        
        handleSheetTouchStart(event) {
            this.swipeStartY = event.touches[0].clientY;
            this.swipeCurrentY = this.swipeStartY;
            this.swipeDelta = 0;
        },

        handleSheetTouchMove(event, sheetElement) {
            this.swipeCurrentY = event.touches[0].clientY;
            this.swipeDelta = this.swipeCurrentY - this.swipeStartY;
            
            // Só permite arrastar para baixo (delta positivo)
            if (this.swipeDelta > 0) {
                // Aplicar transformação com resistência (rubber band effect)
                const resistance = Math.min(this.swipeDelta / 2, 200);
                sheetElement.style.transform = `translateY(${resistance}px)`;
                sheetElement.style.transition = 'none';
            }
        },

        handleSheetTouchEnd(event, sheetElement, modalStateProperty) {
            // Se arrastou mais que o threshold, fecha a modal
            if (this.swipeDelta > this.swipeThreshold) {
                this[modalStateProperty] = false;
            }
            
            // Reset transform com transição
            sheetElement.style.transition = 'transform 300ms ease-out';
            sheetElement.style.transform = '';
            
            // Reset state
            this.swipeStartY = 0;
            this.swipeCurrentY = 0;
            this.swipeDelta = 0;
        },

        // ==================== APPLICATIONS MANAGEMENT ====================

        /**
         * Load all applications for the current user
         */
        async loadApplications() {
            if (!this.supabaseToken) {
                this.applications = [];
                return;
            }

            this.isLoadingApplications = true;
            try {
                const response = await this.authenticatedFetch(`${this.baseUrl}/applications`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                this.applications = await response.json();
                this.log(`✅ ${this.applications.length} aplicações carregadas`, 'success');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao carregar aplicações: ${error.message}`, 'error');
                    Toast.error('Erro ao carregar aplicações');
                }
            } finally {
                this.isLoadingApplications = false;
            }
        },

        /**
         * Create a new application
         */
        async createApplication() {
            if (!this.applicationForm.name.trim()) {
                Toast.error('Digite o nome da aplicação');
                return;
            }

            this.isSavingApplication = true;
            try {
                const response = await this.authenticatedFetch(`${this.baseUrl}/applications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: this.applicationForm.name,
                        description: this.applicationForm.description || null
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const newApp = await response.json();
                
                // Show the API key to the user
                this.selectedApplication = newApp;
                this.showCreateApplicationModal = false;
                this.showApiKeyModal = true;
                
                // Reload applications list
                await this.loadApplications();
                
                this.resetApplicationForm();
                Toast.success('Aplicação criada com sucesso!');
                this.log(`✅ Aplicação criada: ${newApp.name}`, 'success');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao criar aplicação: ${error.message}`, 'error');
                    Toast.error('Erro ao criar aplicação');
                }
            } finally {
                this.isSavingApplication = false;
            }
        },

        /**
         * Update an existing application
         */
        async updateApplication() {
            if (!this.selectedApplication || !this.applicationForm.name.trim()) {
                Toast.error('Digite o nome da aplicação');
                return;
            }

            this.isSavingApplication = true;
            try {
                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/applications/${this.selectedApplication.id}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: this.applicationForm.name,
                            description: this.applicationForm.description || null,
                            isActive: this.applicationForm.isActive
                        })
                    }
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                await this.loadApplications();
                this.closeApplicationModal();
                Toast.success('Aplicação atualizada com sucesso!');
                this.log(`✅ Aplicação atualizada: ${this.applicationForm.name}`, 'success');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao atualizar aplicação: ${error.message}`, 'error');
                    Toast.error('Erro ao atualizar aplicação');
                }
            } finally {
                this.isSavingApplication = false;
            }
        },

        /**
         * Delete an application
         */
        async deleteApplication() {
            if (!this.selectedApplication) return;

            this.isDeletingApplication = true;
            try {
                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/applications/${this.selectedApplication.id}`,
                    { method: 'DELETE' }
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                await this.loadApplications();
                this.showDeleteApplicationModal = false;
                this.selectedApplication = null;
                Toast.success('Aplicação excluída com sucesso!');
                this.log(`✅ Aplicação excluída`, 'success');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao excluir aplicação: ${error.message}`, 'error');
                    Toast.error('Erro ao excluir aplicação');
                }
            } finally {
                this.isDeletingApplication = false;
            }
        },

        /**
         * Regenerate API key for an application
         */
        async regenerateKey() {
            if (!this.selectedApplication) return;

            this.isRegeneratingKey = true;
            try {
                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/applications/${this.selectedApplication.id}/regenerate-key`,
                    { method: 'POST' }
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const updatedApp = await response.json();
                this.selectedApplication = updatedApp;
                
                await this.loadApplications();
                this.showRegenerateKeyModal = false;
                this.showApiKeyModal = true;
                
                Toast.success('API Key regenerada com sucesso!');
                this.log(`✅ API Key regenerada para: ${updatedApp.name}`, 'success');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao regenerar API Key: ${error.message}`, 'error');
                    Toast.error('Erro ao regenerar API Key');
                }
            } finally {
                this.isRegeneratingKey = false;
            }
        },

        /**
         * Toggle application active status
         */
        async toggleApplicationStatus(app) {
            try {
                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/applications/${app.id}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive: !app.isActive })
                    }
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                await this.loadApplications();
                Toast.success(app.isActive ? 'Aplicação desativada' : 'Aplicação ativada');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    Toast.error('Erro ao alterar status');
                }
            }
        },

        /**
         * View full API key for an application
         */
        async viewApplicationKey(app) {
            try {
                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/applications/${app.id}`
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                this.selectedApplication = await response.json();
                this.showApiKeyModal = true;
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    Toast.error('Erro ao carregar API Key');
                }
            }
        },

        /**
         * Copy API key to clipboard
         */
        async copyApiKey(app) {
            try {
                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/applications/${app.id}`
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const fullApp = await response.json();
                await navigator.clipboard.writeText(fullApp.key);
                Toast.success('API Key copiada!');
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    Toast.error('Erro ao copiar API Key');
                }
            }
        },

        /**
         * Copy full API key from modal
         */
        async copyFullApiKey() {
            if (!this.selectedApplication?.key) return;
            
            try {
                await navigator.clipboard.writeText(this.selectedApplication.key);
                Toast.success('API Key copiada!');
            } catch (error) {
                Toast.error('Erro ao copiar');
            }
        },

        async copyRoomId(roomId) {
            try {
                await navigator.clipboard.writeText(roomId);
                Toast.success('ID da sala copiado!');
            } catch (error) {
                Toast.error('Erro ao copiar ID da sala');
            }
        },

        getAppInitials(name) {
            if (!name) return 'AP';
            const parts = name.trim().split(/\s+/).slice(0, 2);
            return parts.map(part => part.charAt(0).toUpperCase()).join('');
        },

        getAppColor(appId) {
            if (!appId) return 'hsl(28, 75%, 45%)';
            let hash = 0;
            for (let i = 0; i < appId.length; i += 1) {
                hash = appId.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            return `hsl(${hue}, 70%, 45%)`;
        },

        /**
         * Open edit modal for an application
         */
        editApplication(app) {
            this.selectedApplication = app;
            this.applicationForm = {
                name: app.name,
                description: app.description || '',
                isActive: app.isActive
            };
            this.showEditApplicationModal = true;
        },

        /**
         * Open delete confirmation modal
         */
        confirmDeleteApplication(app) {
            this.selectedApplication = app;
            this.showDeleteApplicationModal = true;
        },

        /**
         * Open regenerate key confirmation modal
         */
        confirmRegenerateKey(app) {
            this.selectedApplication = app;
            this.showRegenerateKeyModal = true;
        },

        /**
         * Close create/edit modal
         */
        closeApplicationModal() {
            this.showCreateApplicationModal = false;
            this.showEditApplicationModal = false;
            this.selectedApplication = null;
            this.resetApplicationForm();
        },

        /**
         * Reset application form
         */
        resetApplicationForm() {
            this.applicationForm = {
                name: '',
                description: '',
                isActive: true
            };
        },

        // ==================== ROOM APPLICATIONS ====================

        async openRoomApplications(room) {
            if (!this.supabaseToken) {
                Toast.error('Faça login para gerenciar aplicações');
                return;
            }

            this.selectedRoomForApplications = room;
            this.showRoomApplicationsModal = true;
            this.roomApplicationIds = [];
            this.roomApplicationMeta = {};
            this.isLoadingRoomApplications = true;

            try {
                if (this.applications.length === 0) {
                    await this.loadApplications();
                }

                const response = await this.authenticatedFetch(
                    `${this.baseUrl}/rooms/${room.id}/applications`
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const linkedApplications = await response.json();
                this.roomApplicationIds = linkedApplications.map(app => app.id);
                this.roomApplicationMeta = linkedApplications.reduce((acc, app) => {
                    acc[app.id] = {
                        linkedBy: app.linkedBy,
                        linkedAt: app.linkedAt
                    };
                    return acc;
                }, {});
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao carregar aplicações da sala: ${error.message}`, 'error');
                    Toast.error('Erro ao carregar aplicações da sala');
                }
            } finally {
                this.isLoadingRoomApplications = false;
            }
        },

        closeRoomApplicationsModal() {
            this.showRoomApplicationsModal = false;
            this.selectedRoomForApplications = null;
            this.roomApplicationIds = [];
            this.roomApplicationMeta = {};
            this.savingRoomApplicationId = null;
        },

        isApplicationLinked(applicationId) {
            return this.roomApplicationIds.includes(applicationId);
        },

        getApplicationLinkMeta(applicationId) {
            return this.roomApplicationMeta[applicationId] || null;
        },

        async toggleRoomApplication(app) {
            if (!this.selectedRoomForApplications) return;

            const isLinked = this.isApplicationLinked(app.id);
            this.savingRoomApplicationId = app.id;

            try {
                const endpoint = `${this.baseUrl}/rooms/${this.selectedRoomForApplications.id}/applications`;
                const response = isLinked
                    ? await this.authenticatedFetch(`${endpoint}/${app.id}`, { method: 'DELETE' })
                    : await this.authenticatedFetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ applicationId: app.id })
                    });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                if (isLinked) {
                    this.roomApplicationIds = this.roomApplicationIds.filter(id => id !== app.id);
                    delete this.roomApplicationMeta[app.id];
                    Toast.success('Aplicação removida da sala');
                } else {
                    this.roomApplicationIds = [...this.roomApplicationIds, app.id];
                    this.roomApplicationMeta = {
                        ...this.roomApplicationMeta,
                        [app.id]: {
                            linkedBy: this.supabaseUser?.id || null,
                            linkedAt: new Date().toISOString()
                        }
                    };
                    Toast.success('Aplicação vinculada à sala');
                }
            } catch (error) {
                if (error.message !== 'Unauthorized') {
                    this.log(`❌ Erro ao atualizar aplicação da sala: ${error.message}`, 'error');
                    Toast.error('Erro ao atualizar associação');
                }
            } finally {
                this.savingRoomApplicationId = null;
            }
        }
    };
}
