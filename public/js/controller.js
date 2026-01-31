class BlogController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.isInitialized = false;

    // Bind methods to maintain context
    this.initialize = this.initialize.bind(this);

    this.loadPosts = this.loadPosts.bind(this);

    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.handlePostUpdate = this.handlePostUpdate.bind(this);
    this.handlePostDelete = this.handlePostDelete.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);

    this.handleLoadingStart = this.handleLoadingStart.bind(this);
    this.handleLoadingEnd = this.handleLoadingEnd.bind(this);
    this.handleError = this.handleError.bind(this);

    this.handlePostsLoaded = this.handlePostsLoaded.bind(this);
    this.handlePostCreated = this.handlePostCreated.bind(this);
    this.handlePostUpdated = this.handlePostUpdated.bind(this);
    this.handlePostDeleted = this.handlePostDeleted.bind(this);

    this.handleViewInitialized = this.handleViewInitialized.bind(this);
  }

  // Initialization
  async initialize() {
    if (this.isInitialized) {
      console.warn('Controller already initialized');
      return;
    }

    try {
      console.log('Initializing Blog Controller...');
      this.setupModelObservers();
      this.setupViewObservers();

      await this.view.initialize();
      await this.loadPosts();

      this.isInitialized = true;
      console.log('Blog Controller initialized successfully');
    } catch (error) {
      console.error('Failed to initialize controller:', error);
      this.view.showError('Failed to initialize application. Please refresh the page.');
      throw error;
    }
  }

  // Observer setup
  setupModelObservers() {
    this.model.addObserver({
      onPostsLoaded: this.handlePostsLoaded,
      onPostCreated: this.handlePostCreated,
      onPostUpdated: this.handlePostUpdated,
      onPostDeleted: this.handlePostDeleted,
      onError: this.handleError,
      onLoadingStart: this.handleLoadingStart,
      onLoadingEnd: this.handleLoadingEnd,
    });
  }

  setupViewObservers() {
    this.view.addObserver({
      onViewInitialized: this.handleViewInitialized,
      onPostCreate: this.handlePostCreate,
      onPostUpdate: this.handlePostUpdate,
      onPostDelete: this.handlePostDelete,
      onPostEdit: this.handlePostEdit,
    });
  }

  // Data operations
  async loadPosts() {
    try {
      console.log('Loading blog posts...');
      await this.model.loadPosts();
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.view.showError('Failed to load blog posts. Please try again.');
    }
  }

  // Create
  async handlePostCreate(postData) {
    try {
      console.log('Creating new post:', postData);
      await this.model.createPost(postData);
      this.view.showSuccess('Post created successfully!');
      // list refresh is already handled in handlePostCreated
    } catch (error) {
      console.error('Failed to create post:', error);
      this.view.showError(error.message || 'Failed to create post. Please try again.');
    }
  }

  // Update
  // updateData expected shape: { id, title, content, author? }
  async handlePostUpdate(updateData) {
    try {
      if (!updateData || updateData.id == null) {
        throw new Error('Missing post id for update');
      }

      const { id, ...postData } = updateData;

      console.log('Updating post:', id, postData);
      await this.model.updatePost(id, postData);

      this.view.showSuccess('Post updated successfully!');
      // list refresh is already handled in handlePostUpdated
    } catch (error) {
      console.error('Failed to update post:', error);
      this.view.showError(error.message || 'Failed to update post. Please try again.');
    }
  }

  // Delete
  async handlePostDelete(postId) {
    try {
      if (postId == null) throw new Error('Missing post id for delete');

      console.log('Deleting post with ID:', postId);
      await this.model.deletePost(postId);

      this.view.showSuccess('Post deleted successfully!');
      // list refresh is already handled in handlePostDeleted
    } catch (error) {
      console.error('Failed to delete post:', error);
      this.view.showError(error.message || 'Failed to delete post. Please try again.');
    }
  }

  // Edit (prepare edit UI)
  handlePostEdit(postId) {
    try {
      if (postId == null) throw new Error('Missing post id for edit');

      console.log('Editing post with ID:', postId);
      const post = this.model.getPostById(postId);

      if (!post) {
        this.view.showError('Post not found.');
        return;
      }

      this.view.showEditForm(post);
    } catch (error) {
      console.error('Failed to load post for editing:', error);
      this.view.showError(error.message || 'Failed to load post for editing. Please try again.');
    }
  }

  // Model event handlers
  handlePostsLoaded(posts) {
    console.log('Posts loaded:', posts?.length ?? 0);
    this.view.renderPosts(posts || []);
  }

  handlePostCreated(newPost) {
    console.log('Post created:', newPost?.id);
    this.view.clearForm();
    this.loadPosts();
  }

  handlePostUpdated(updatedPost) {
    console.log('Post updated:', updatedPost?.id);
    this.view.clearForm();
    this.loadPosts();
  }

  handlePostDeleted(deletedId) {
    console.log('Post deleted:', deletedId);
    this.view.clearForm();
    this.loadPosts();
  }

  // View event handlers
  handleViewInitialized() {
    console.log('View initialized');
  }

  // Loading + errors
  handleLoadingStart() {
    console.log('Loading started');
    this.view.showLoading();
  }

  handleLoadingEnd() {
    console.log('Loading ended');
    this.view.hideLoading();
  }

  handleError(errorMessage) {
    console.error('Error occurred:', errorMessage);
    // model already notifies onError; view can show it if needed
    if (errorMessage) this.view.showError(errorMessage);
  }

  // Utility helpers
  formatDate(dateString) {
    return this.model.formatDate(dateString);
  }

  validatePostData(postData) {
    return this.model.validatePostData(postData);
  }

  getPostById(postId) {
    return this.model.getPostById(postId);
  }

  // Debugging and development helpers
  getState() {
    return {
      isInitialized: this.isInitialized,
      postsCount: this.model.posts.length,
      currentEditId: this.view.currentEditId,
      isLoading: this.model.isLoading,
    };
  }

  reset() {
    console.log('Resetting controller...');
    this.view.clearForm();
    this.loadPosts();
  }
}

// Prevent ReferenceError (like your model.js issue)
const controllerExplanation = `
<h3>Controller (BlogController)</h3>
<ul>
  <li>Connects View events to Model actions.</li>
  <li>Listens to Model updates and tells View to render.</li>
  <li>Handles create/update/delete/edit flows.</li>
</ul>
`;

window.controllerExplanation = controllerExplanation;
window.BlogController = BlogController;
