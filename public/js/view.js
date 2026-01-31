class BlogView {
  constructor() {
    this.postsContainer = null;
    this.formContainer = null;
    this.loadingIndicator = null;
    this.errorContainer = null;

    this.currentEditId = null;
    this.observers = [];

    this.editModal = null;
    this.editFormContainer = null;

    // Internal flags to avoid double event binding
    this._postEventsBound = false;
    this._formEventsBound = false;
    this._editEventsBound = false;

    // Bind methods
    this.renderPosts = this.renderPosts.bind(this);
    this.renderPostForm = this.renderPostForm.bind(this);

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleDelete = this.handleDelete.bind(this);

    this.showLoading = this.showLoading.bind(this);
    this.hideLoading = this.hideLoading.bind(this);

    this.showError = this.showError.bind(this);
    this.hideError = this.hideError.bind(this);
    this.clearError = this.clearError.bind(this);

    this.showEditForm = this.showEditForm.bind(this);
    this.showEditModal = this.showEditModal.bind(this);
    this.hideEditModal = this.hideEditModal.bind(this);

    this.handleEditSubmit = this.handleEditSubmit.bind(this);
  }

  // Observer pattern
  addObserver(observer) {
    this.observers.push(observer);
  }

  removeObserver(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notifyObservers(event, data) {
    this.observers.forEach((observer) => {
      if (typeof observer[event] === 'function') {
        observer[event](data);
      }
    });
  }

  // Initialization
  initialize() {
    this.setupDOMElements();
    this.renderPostForm();
    this.bindStaticEvents();
    this.notifyObservers('onViewInitialized');
  }

  setupDOMElements() {
    this.postsContainer = document.getElementById('posts-container');
    this.formContainer = document.getElementById('form-container');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.errorContainer = document.getElementById('error-container');

    this.editModal = document.getElementById('edit-modal');
    this.editFormContainer = document.getElementById('edit-form-container');

    if (!this.postsContainer || !this.formContainer || !this.loadingIndicator || !this.errorContainer) {
      throw new Error('Required DOM elements not found. Check HTML structure.');
    }
  }

  bindStaticEvents() {
    // Bind post list delegation once
    if (!this._postEventsBound) {
      this._postEventsBound = true;
      this.postsContainer.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;

        const postId = Number(actionEl.dataset.postId);
        const actionType = actionEl.dataset.action;

        if (actionType === 'edit') this.handleEdit(postId);
        if (actionType === 'delete') this.handleDelete(postId);
      });
    }

    // Close edit modal button (exists in HTML)
    const closeEditX = document.getElementById('close-edit-modal');
    if (closeEditX && !closeEditX.dataset.bound) {
      closeEditX.dataset.bound = '1';
      closeEditX.addEventListener('click', () => this.hideEditModal());
    }
  }

  // Rendering
  renderPosts(posts) {
    if (!posts || posts.length === 0) {
      this.postsContainer.innerHTML = `
        <div class="no-posts">
          <h3>No blog posts yet</h3>
          <p>Be the first to create a blog post!</p>
        </div>
      `;
      return;
    }

    this.postsContainer.innerHTML = posts.map((post) => this.renderPostCard(post)).join('');
  }

  renderPostCard(post) {
    const formattedDate = this.formatDate(post.createdAt);
    const updatedBadge =
      post.updatedAt && post.createdAt && post.updatedAt !== post.createdAt
        ? `<span class="post-updated">Updated</span>`
        : '';

    return `
      <article class="post-card" data-post-id="${post.id}">
        <div class="post-header">
          <h2 class="post-title">${this.escapeHtml(post.title)}</h2>
          <div class="post-meta">
            <span class="post-date">${formattedDate}</span>
            ${updatedBadge}
          </div>
        </div>
        <div class="post-content">
          ${this.renderPostContent(post.content)}
        </div>
        <div class="post-actions">
          <button class="btn btn-edit" data-action="edit" data-post-id="${post.id}">
            <span class="icon">✏️</span> Edit
          </button>
          <button class="btn btn-delete" data-action="delete" data-post-id="${post.id}">
            <span class="icon">🗑️</span> Delete
          </button>
        </div>
      </article>
    `;
  }

  renderPostContent(content) {
    const safe = this.escapeHtml(content || '');
    // keep it readable: preserve line breaks
    return safe.replaceAll('\n', '<br>');
  }

  renderPostForm() {
    const isEditing = !!this.currentEditId;

    this.formContainer.innerHTML = `
      <form id="post-form" class="post-form" novalidate>
        <div class="form-group">
          <label for="title">Title</label>
          <input id="title" name="title" type="text" placeholder="Post title" />
          <div id="title-error" class="field-error" style="display:none;"></div>
        </div>

        <div class="form-group">
          <label for="content">Content</label>
          <textarea id="content" name="content" rows="6" placeholder="Write something..."></textarea>
          <div id="content-error" class="field-error" style="display:none;"></div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            ${isEditing ? 'Update Post' : 'Create Post'}
          </button>

          ${
            isEditing
              ? `<button type="button" id="cancel-edit" class="btn btn-secondary">Cancel</button>`
              : ''
          }
        </div>
      </form>
    `;

    this.attachFormEventListeners();
  }

  attachFormEventListeners() {
    if (this._formEventsBound) return;

    // Because form is re-rendered, we re-bind safely by removing old handlers implicitly via new DOM.
    // But we want to avoid adding multiple listeners in same render, so we bind each render to the new form.
    const form = document.getElementById('post-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit);
    }

    const cancelEdit = document.getElementById('cancel-edit');
    if (cancelEdit) {
      cancelEdit.addEventListener('click', () => this.cancelEdit());
    }

    // We set flag false because DOM is re-rendered; listeners are attached to new elements each time.
    // Use a micro-flag to prevent double-binding within same render cycle.
    this._formEventsBound = true;
    setTimeout(() => (this._formEventsBound = false), 0);
  }

  // Form submit (create/update)
  handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const postData = {
      title: String(formData.get('title') || '').trim(),
      content: String(formData.get('content') || '').trim(),
    };

    this.clearFormErrors();

    const errors = this.validateForm(postData);
    if (errors.length > 0) {
      this.displayFormErrors(errors);
      return;
    }

    if (this.currentEditId) {
      this.notifyObservers('onPostUpdate', { id: this.currentEditId, ...postData });
    } else {
      this.notifyObservers('onPostCreate', postData);
    }
  }

  // Edit flow (opens modal; controller provides post + may call this)
  handleEdit(postId) {
    // Let controller decide and then call showEditForm(post)
    this.notifyObservers('onPostEdit', postId);
  }

  showEditForm(postData) {
    if (!postData) return;
    this.showEditModal();
    this.renderEditForm(postData);
    this.attachEditFormEventListeners();
  }

  showEditModal() {
    if (this.editModal) this.editModal.style.display = 'block';
  }

  hideEditModal() {
    if (this.editModal) this.editModal.style.display = 'none';
    if (this.editFormContainer) this.editFormContainer.innerHTML = '';
  }

  renderEditForm(postData) {
    this.editFormContainer.innerHTML = `
      <form id="edit-post-form" class="post-form" novalidate>
        <input type="hidden" name="id" value="${this.escapeHtml(String(postData.id))}" />

        <div class="form-group">
          <label for="edit-title">Title</label>
          <input id="edit-title" name="title" type="text" value="${this.escapeHtml(postData.title || '')}" />
          <div id="edit-title-error" class="field-error" style="display:none;"></div>
        </div>

        <div class="form-group">
          <label for="edit-content">Content</label>
          <textarea id="edit-content" name="content" rows="6">${this.escapeHtml(postData.content || '')}</textarea>
          <div id="edit-content-error" class="field-error" style="display:none;"></div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" id="cancel-edit-modal" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    `;
  }

  attachEditFormEventListeners() {
    if (this._editEventsBound) return;
    this._editEventsBound = true;

    const form = document.getElementById('edit-post-form');
    const cancel = document.getElementById('cancel-edit-modal');

    if (form) form.addEventListener('submit', this.handleEditSubmit);
    if (cancel) cancel.addEventListener('click', () => this.hideEditModal());

    // reset flag next tick because modal content may be re-rendered
    setTimeout(() => (this._editEventsBound = false), 0);
  }

  handleEditSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const id = Number(formData.get('id'));
    const postData = {
      title: String(formData.get('title') || '').trim(),
      content: String(formData.get('content') || '').trim(),
    };

    this.clearEditFormErrors();

    const errors = this.validateForm(postData);
    if (errors.length > 0) {
      this.displayEditFormErrors(errors);
      return;
    }

    this.notifyObservers('onPostUpdate', { id, ...postData });
    this.hideEditModal();
  }

  // Delete
  handleDelete(postId) {
    const ok = confirm('Delete this post? This cannot be undone.');
    if (!ok) return;
    this.notifyObservers('onPostDelete', postId);
  }

  // Form utilities (main form)
  clearForm() {
    const form = document.getElementById('post-form');
    if (form) form.reset();
    this.currentEditId = null;
    this.clearFormErrors();
    this.renderPostForm();
  }

  cancelEdit() {
    this.clearForm();
  }

  validateForm(postData) {
    const errors = [];

    if (!postData.title || postData.title.length < 3) {
      errors.push({ field: 'title', message: 'Title must be at least 3 characters long' });
    }

    if (!postData.content || postData.content.length < 10) {
      errors.push({ field: 'content', message: 'Content must be at least 10 characters long' });
    }

    return errors;
  }

  displayFormErrors(errors) {
    errors.forEach((error) => {
      const errorElement = document.getElementById(`${error.field}-error`);
      const inputElement = document.getElementById(error.field);

      if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
      }
      if (inputElement) inputElement.classList.add('error');
    });
  }

  clearFormErrors() {
    // Only clear our field errors, not global error container
    ['title', 'content'].forEach((field) => {
      const err = document.getElementById(`${field}-error`);
      const input = document.getElementById(field);
      if (err) {
        err.textContent = '';
        err.style.display = 'none';
      }
      if (input) input.classList.remove('error');
    });
  }

  // Edit form errors
  clearEditFormErrors() {
    ['title', 'content'].forEach((field) => {
      const err = document.getElementById(`edit-${field}-error`);
      const input = document.getElementById(`edit-${field}`);
      if (err) {
        err.textContent = '';
        err.style.display = 'none';
      }
      if (input) input.classList.remove('error');
    });
  }

  displayEditFormErrors(errors) {
    errors.forEach((error) => {
      const err = document.getElementById(`edit-${error.field}-error`);
      const input = document.getElementById(`edit-${error.field}`);

      if (err) {
        err.textContent = error.message;
        err.style.display = 'block';
      }
      if (input) input.classList.add('error');
    });
  }

  // UI state
  showLoading() {
    this.loadingIndicator.style.display = 'block';
    this.hideError();
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
  }

  showError(message) {
    this.errorContainer.innerHTML = `
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        <span class="error-text">${this.escapeHtml(message)}</span>
        <button class="error-close" type="button">×</button>
      </div>
    `;
    this.errorContainer.style.display = 'block';

    const closeBtn = this.errorContainer.querySelector('.error-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideError(), { once: true });
    }
  }

  hideError() {
    this.errorContainer.style.display = 'none';
  }

  clearError() {
    this.hideError();
    this.errorContainer.innerHTML = '';
  }

  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
      <span class="success-icon">✅</span>
      <span class="success-text">${this.escapeHtml(message)}</span>
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  }

  // Utilities
  formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }
}

// Prevent ReferenceError
const viewExplanation = `
<h3>View (BlogView)</h3>
<ul>
  <li>Renders UI (form, list, modals).</li>
  <li>Captures user actions and notifies Controller.</li>
  <li>Shows loading/error/success states.</li>
</ul>
`;

window.viewExplanation = viewExplanation;
window.BlogView = BlogView;
