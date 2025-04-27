import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';

// Define the comment interface
interface Comment {
  id: number;
  username: string;
  content: string;
  timestamp: Date;
  imageUrl: string | null;
}

const Community: React.FC = () => {
  // State for comments, form inputs, and pagination
  const [comments, setComments] = useState<Comment[]>([]);
  const [username, setUsername] = useState('');
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const commentsPerPage = 10;
  
  // Calculate pagination values
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = comments.slice(indexOfFirstComment, indexOfLastComment);
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  
  // Load sample data on component mount
  useEffect(() => {
    // In a real app, this would be an API call
    const sampleComments: Comment[] = [
      {
        id: 1,
        username: 'JohnDoe',
        content: 'This community is amazing! Looking forward to connecting with everyone.',
        timestamp: new Date(Date.now() - 86400000),
        imageUrl: null
      },
      {
        id: 2,
        username: 'SarahSmith',
        content: 'Just joined today. Any recommendations for newcomers?',
        timestamp: new Date(Date.now() - 43200000),
        imageUrl: null
      }
    ];
    
    setComments(sampleComments);
  }, []);
  
  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  
  // Submit a new comment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !content.trim()) {
      alert('Please enter both username and comment');
      return;
    }
    
    setLoading(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      const newComment: Comment = {
        id: comments.length + 1,
        username,
        content,
        timestamp: new Date(),
        imageUrl: imagePreview
      };
      
      setComments([newComment, ...comments]);
      setUsername('');
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setLoading(false);
      
      // If we have exactly 10 comments now and a new page should be created
      if (comments.length + 1 > commentsPerPage && (comments.length + 1) % commentsPerPage === 1) {
        setCurrentPage(Math.ceil((comments.length + 1) / commentsPerPage));
      }
    }, 500);
  };
  
  // Format the timestamp
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Handle pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  return (
    <>
    <Helmet>
        {/* Bootstrap CSS */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        {/* Bootstrap Icons */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet" />
        {/* Bootstrap JS Bundle with Popper */}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </Helmet>
    <div className="container py-5">
      {/* Header */}
      <header className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary">Community Forum</h1>
        <p className="lead text-muted">Connect, share, and grow with our community</p>
        <hr className="my-4" />
      </header>
      
      {/* Comment Form */}
      <div className="row justify-content-center mb-5">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Share Your Thoughts</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="content" className="form-label">Comment</label>
                  <textarea
                    className="form-control"
                    id="content"
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    required
                  ></textarea>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="image" className="form-label">Add Image (optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
                
                {imagePreview && (
                  <div className="mb-3">
                    <div className="position-relative d-inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="img-thumbnail" 
                        style={{ maxHeight: '200px' }} 
                      />
                      <button 
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                        onClick={removeImage}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="d-grid">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Posting...
                      </>
                    ) : (
                      'Post Comment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h2 className="mb-4">Community Discussion ({comments.length})</h2>
          
          {currentComments.length === 0 ? (
            <div className="alert alert-info">No comments yet. Be the first to share!</div>
          ) : (
            <>
              {currentComments.map((comment) => (
                <div className="card mb-4 shadow-sm" key={comment.id}>
                  <div className="card-header d-flex justify-content-between align-items-center bg-light">
                    <div className="d-flex align-items-center">
                      <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                        {comment.username.charAt(0).toUpperCase()}
                      </div>
                      <h5 className="mb-0">{comment.username}</h5>
                    </div>
                    <small className="text-muted">{formatDate(comment.timestamp)}</small>
                  </div>
                  <div className="card-body">
                    <p className="card-text">{comment.content}</p>
                    {comment.imageUrl && (
                      <img 
                        src={comment.imageUrl} 
                        alt="Comment attachment" 
                        className="img-fluid rounded mb-2" 
                        style={{ maxHeight: '300px' }} 
                      />
                    )}
                  </div>
                  <div className="card-footer bg-white border-top-0">
                    <div className="d-flex">
                      <button className="btn btn-sm btn-outline-primary me-2">
                        <i className="bi bi-hand-thumbs-up"></i> Like
                      </button>
                      <button className="btn btn-sm btn-outline-secondary">
                        <i className="bi bi-reply"></i> Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Comment pagination" className="my-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {[...Array(totalPages)].map((_, index) => (
                      <li 
                        key={index} 
                        className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}
                      >
                        <button 
                          className="page-link" 
                          onClick={() => paginate(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Community;