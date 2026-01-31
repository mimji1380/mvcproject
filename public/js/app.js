// Application configuration
const CONFIG = {
  // IMPORTANT:
  // Use a relative URL so it works on your deployed domain + HTTPS.
  // This must match your backend routes (server.js).
  API_BASE_URL: '/api/posts',
  DEBUG_MODE: true,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// Debug utilities
function showDebugError(errorLike) {
  const err = errorLike instanceof Error
    ? errorLike
    : new Error(typeof errorLike === 'string' ? errorLike : 'Unknown error');

  const debugDiv = document.createElement('div');
  debugDiv.className = 'debug-error';
  debugDiv.innerHTML = `
    <strong>Debug Error:</strong> ${err.message}<br>
    <small>${(err.stack || '').replaceAll('\n', '<br>')}</small>
  `;
  document.body.appendChild(debugDiv);

  setTimeout(() => debugDiv.remove(), 5000);
}

function log(message, data = null) {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[BlogMVC] ${message}`, data);
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message);
  if (CONFIG.DEBUG_MODE) {
    showDebugError(event.error || event.message || 'Global error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (CONFIG.DEBUG_MODE) {
    showDebugError(event.reason || 'Unhandled rejection');
  }
});

// Educational content
function showEducationalModal() {
  const modal = document.getElementById('educational-modal');
  const modalBody = document.getElementById('modal-body');

  modalBody.innerHTML = `
    <div class="educational-content">
      <div class="mvc-diagram">
        <div class="mvc-component model">
          <h3>🏗️ Model</h3>
          <p>Manages data and business logic</p>
          <ul>
            <li>API communications</li>
            <li>Data validation</li>
            <li>State management</li>
            <li>Observer pattern</li>
          </ul>
        </div>
        <div class="mvc-component view">
          <h3>👁️ View</h3>
          <p>Handles UI and user interactions</p>
          <ul>
            <li>HTML rendering</li>
            <li>Form validation</li>
            <li>Event handling</li>
            <li>User feedback</li>
          </ul>
        </div>
        <div class="mvc-component controller">
          <h3>🎮 Controller</h3>
          <p>Coordinates Model and View</p>
          <ul>
            <li>User action handling</li>
            <li>Data coordination</li>
            <li>Flow management</li>
            <li>Error handling</li>
          </ul>
        </div>
      </div>

      <div class="api-info">
        <h3>🌐 RESTful API Endpoints</h3>
        <div class="api-endpoints">
          <div class="endpoint">
            <span class="method get">GET</span>
            <span class="path">/api/posts</span>
            <span class="description">Get all blog posts</span>
          </div>
          <div class="endpoint">
            <span class="method get">GET</span>
            <span class="path">/api/posts/:id</span>
            <span class="description">Get single post by ID</span>
          </div>
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/posts</span>
            <span class="description">Create new post</span>
          </div>
          <div class="endpoint">
            <span class="method put">PUT</span>
            <span class="path">/api/posts/:id</span>
            <span class="description">Update existing post</span>
          </div>
          <div class="endpoint">
            <span class="method delete">DELETE</span>
            <span class="path">/api/posts/:id</span>
            <span class="description">Delete post</span>
          </div>
        </div>
      </div>

      <div class="features">
        <h3>✨ Features</h3>
        <ul>
          <li>SQLite data storage (server-side)</li>
          <li>Full CRUD operations</li>
          <li>Form validation</li>
          <li>Error handling</li>
          <li>Loading states</li>
          <li>Responsive design</li>
        </ul>
      </div>
    </div>
  `;

  modal.style.display = 'block';
}

function closeModalById(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function setupModalControls() {
  const educationalBtn = document.getElementById('educational-btn');
  const eduModal = document.getElementById('educational-modal');
  const eduClose = document.getElementById('close-modal');
  const eduCloseX = eduModal?.querySelector('.close');

  if (educationalBtn) educationalBtn.addEventListener('click', showEducationalModal);
  if (eduClose) eduClose.addEventListener('click', () => closeModalById('educational-modal'));
  if (eduCloseX) eduCloseX.addEventListener('click', () => closeModalById('educational-modal'));

  // Edit modal close button already has id in your HTML
  const editCloseX = document.getElementById('close-edit-modal');
  if (editCloseX) editCloseX.addEventListener('click', () => closeModalById('edit-modal'));

  // Click outside to close (both modals)
  window.addEventListener('click', (event) => {
    if (event.target === eduModal) closeModalById('educational-modal');

    const editModal = document.getElementById('edit-modal');
    if (event.target === editModal) closeModalById('edit-modal');
  });

  // ESC closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModalById('educational-modal');
      closeModalById('edit-modal');
    }
  });
}

// Initialize application
async function initializeApp() {
  log('Initializing Blog MVC application...');

  // Check if required components are available
  if (!window.BlogModel || !window.BlogView || !window.BlogController) {
    throw new Error('Required MVC components not found');
  }

  // Create MVC instances
  const model = new BlogModel();

  // ✅ FIX: Do NOT append "/api/posts" again.
  // CONFIG.API_BASE_URL is already the full endpoint base for posts.
  if (CONFIG.API_BASE_URL) {
    model.apiBaseUrl = CONFIG.API_BASE_URL;
  }

  const view = new BlogView();
  const controller = new BlogController(model, view);

  // Store instances globally for debugging
  window.blogApp = { model, view, controller, config: CONFIG };

  setupModalControls();

  // Initialize controller
  await controller.initialize();

  log('Application initialized successfully');

  // Show educational modal on first visit
  if (!localStorage.getItem('blogMVC_visited')) {
    setTimeout(() => {
      showEducationalModal();
      localStorage.setItem('blogMVC_visited', 'true');
    }, 1000);
  }
}

// Performance monitoring
function measurePerformance() {
  if (CONFIG.DEBUG_MODE && window.performance) {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      log(`Page load duration: ${Math.round(nav.duration)}ms`);
      log(`DOM ready: ${Math.round(nav.domContentLoadedEventEnd - nav.startTime)}ms`);
    }
  }
}

// Network status monitoring
function setupNetworkMonitoring() {
  window.addEventListener('online', () => {
    log('Network: Online');
    if (window.blogApp?.view?.clearError) window.blogApp.view.clearError();
    if (window.blogApp?.controller?.loadPosts) window.blogApp.controller.loadPosts();
  });

  window.addEventListener('offline', () => {
    log('Network: Offline');
    if (window.blogApp?.view?.showError) {
      window.blogApp.view.showError('You are offline. Some features may not work.');
    }
  });
}

// Start the application
document.addEventListener('DOMContentLoaded', async () => {
  log('DOM content loaded');

  try {
    measurePerformance();
    setupNetworkMonitoring();
    await initializeApp();
  } catch (error) {
    console.error('Application startup failed:', error);

    // Show user-friendly error
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="error-message">
          <h3>🚨 Application Error</h3>
          <p>Failed to initialize the blog application.</p>
          <p><strong>Error:</strong> ${error?.message || 'Unknown error'}</p>
          <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
        </div>
      `;
      errorContainer.style.display = 'block';
    }
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + / for educational modal
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    showEducationalModal();
  }

  // Ctrl/Cmd + R override only in debug
  if (CONFIG.DEBUG_MODE && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    if (window.blogApp?.controller?.loadPosts) {
      window.blogApp.controller.loadPosts();
    }
  }
});

log('Application script loaded');
