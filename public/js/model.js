class BlogModel {
  constructor() {
    this.posts = [];
    this.observers = [];
    this.apiBaseUrl = '/api/posts';
    this.isLoading = false;
  }

  // Observer pattern implementation
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

  // API Methods
  async loadPosts() {
    this.setLoading(true);
    this.notifyObservers('onLoadingStart');

    try {
      const response = await fetch(this.apiBaseUrl);
      if (!response.ok) {
        throw new Error(`Failed to load posts (HTTP ${response.status})`);
      }

      this.posts = await response.json();
      this.notifyObservers('onPostsLoaded', this.posts);
      return this.posts;
    } catch (error) {
      console.error('Error loading posts:', error);
      this.notifyObservers('onError', error.message);
      throw error;
    } finally {
      this.setLoading(false);
      this.notifyObservers('onLoadingEnd');
    }
  }

  async createPost(postData) {
    this.setLoading(true);

    try {
      // Validate post data
      const validationErrors = this.validatePostData(postData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        // try to parse API error body if present
        let message = `Failed to create post (HTTP ${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.error) message = errBody.error;
        } catch (_) {}
        throw new Error(message);
      }

      const newPost = await response.json();
      this.posts.unshift(newPost); // Add to beginning
      this.notifyObservers('onPostCreated', newPost);
      return newPost;
    } catch (error) {
      console.error('Error creating post:', error);
      this.notifyObservers('onError', error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // ✅ COMPLETE: Update post
  async updatePost(postId, postData) {
    this.setLoading(true);

    try {
      const id = Number(postId);
      if (!Number.isFinite(id)) {
        throw new Error('Invalid post id');
      }

      const validationErrors = this.validatePostData(postData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        let message = `Failed to update post (HTTP ${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.error) message = errBody.error;
        } catch (_) {}
        throw new Error(message);
      }

      const updatedPost = await response.json();

      // Replace in local cache
      const idx = this.posts.findIndex((p) => Number(p.id) === id);
      if (idx !== -1) this.posts[idx] = updatedPost;

      this.notifyObservers('onPostUpdated', updatedPost);
      return updatedPost;
    } catch (error) {
      console.error('Error updating post:', error);
      this.notifyObservers('onError', error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // ✅ COMPLETE: Delete post
  async deletePost(postId) {
    this.setLoading(true);

    try {
      const id = Number(postId);
      if (!Number.isFinite(id)) {
        throw new Error('Invalid post id');
      }

      const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        let message = `Failed to delete post (HTTP ${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.error) message = errBody.error;
        } catch (_) {}
        throw new Error(message);
      }

      // Remove from local cache
      this.posts = this.posts.filter((p) => Number(p.id) !== id);

      this.notifyObservers('onPostDeleted', id);
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      this.notifyObservers('onError', error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Utility methods
  setLoading(loading) {
    this.isLoading = loading;
    this.notifyObservers('onLoadingChange', loading);
  }

  getPostById(postId) {
    const id = Number(postId);
    return this.posts.find((post) => Number(post.id) === id);
  }

  validatePostData(postData) {
    const errors = [];

    if (!postData.title || postData.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (postData.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }

    if (!postData.content || postData.content.trim().length === 0) {
      errors.push('Content is required');
    } else if (postData.content.trim().length < 10) {
      errors.push('Content must be at least 10 characters long');
    }

    return errors;
  }

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
}

/**
 * ✅ Fix: modelExplanation was referenced but never defined.
 * You can show this in the educational modal if you want.
 */
const modelExplanation = `
<h3>Model (BlogModel)</h3>
<ul>
  <li>Handles data and API calls (CRUD posts).</li>
  <li>Stores local cache of posts.</li>
  <li>Notifies observers (View/Controller) when data changes.</li>
</ul>
`;

window.modelExplanation = modelExplanation;
window.BlogModel = BlogModel;
