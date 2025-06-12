document.addEventListener('DOMContentLoaded', async () => {
    const sanitize = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize : input => input;

    // Load posts from backend
    let blogPosts = [];
    try {
        const response = await fetch('/api/posts');
        if (response.ok) {
            blogPosts = await response.json();
            blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    } catch (error) {
        console.error('Error fetching posts:', error);
    }

    // Access ads from posts.js
    const ads = window.blogData?.ads || [];

    // Utility Functions
    const toggleClass = (element, className) => element?.classList.toggle(className);
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    };

    // Overlay Management
    const overlays = {
        articleOverlay: document.querySelector('.article-overlay'),
        savedArticlesOverlay: document.querySelector('.saved-articles-overlay'),
        shareOverlay: document.querySelector('.share-overlay'),
        searchOverlay: document.querySelector('.search-overlay')
    };

    const resetOverlays = (excludeOverlay = null) => {
        Object.values(overlays).forEach(overlay => {
            if (overlay && overlay !== excludeOverlay) {
                overlay.classList.remove('active');
            }
        });
        restoreBackgroundScroll();
        const mainNav = document.querySelector('.main-nav');
        const menuToggle = document.querySelector('.menu-toggle');
        if (mainNav) mainNav.classList.remove('active');
        if (menuToggle) {
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    };

    const disableBackgroundScroll = () => {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
    };

    const restoreBackgroundScroll = () => {
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
    };

    const handleOutsideClick = (overlay, closeButton, contentSelector) => {
        return (e) => {
            if (!e.target.closest(contentSelector) && overlay.classList.contains('active')) {
                closeButton.click();
            }
        };
    };

    // Main Content Setup
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }

    // Article Card Rendering
    const renderArticleCard = (post) => `
        <div class="article-card" data-post-id="${sanitize(post.id)}">
            <div class="article-image">
                <img src="${sanitize(post.image)}" alt="${sanitize(post.title)}" loading="lazy">
            </div>
            <div class="article-content">
                <span class="category">${sanitize(post.category)}</span>
                <h3><a href="#post/${sanitize(post.id)}">${sanitize(post.title)}</a></h3>
                <div class="creator-info">
                    <p><strong>Author:</strong> ${sanitize(post.creator.name)}</p>
                    ${post.creator.email ? `<p><strong>Email:</strong> <a href="mailto:${sanitize(post.creator.email)}">${sanitize(post.creator.email)}</a></p>` : ''}
                    ${post.creator.social ? `<p><strong>Social:</strong> <a href="${sanitize(post.creator.social)}" target="_blank">${sanitize(post.creator.social)}</a></p>` : ''}
                </div>
                <div class="meta">
                    <span><i class="fas fa-clock"></i> ${sanitize(post.readTime)}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${sanitize(post.date)}</span>
                </div>
                <div class="article-actions">
                    <button class="save-btn" data-post-id="${sanitize(post.id)}" aria-label="Save article"><i class="${localStorage.getItem(`saved-${post.id}`) ? 'fas' : 'far'} fa-bookmark"></i></button>
                    <button class="share-btn" aria-label="Share article"><i class="fas fa-share-alt"></i></button>
                    ${post.category.toLowerCase() === 'myblog' ? `<button class="delete-btn" data-post-id="${sanitize(post.id)}" aria-label="Delete article"><i class="fas fa-trash-alt"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;

    // Render Post Overlay
    const renderPostOverlay = async (postId) => {
        let post;
        try {
            const response = await fetch(`/api/posts/${postId}`);
            if (!response.ok) throw new Error('Post not found');
            post = await response.json();
        } catch (error) {
            console.error('Error fetching post:', error);
            overlays.articleOverlay.classList.remove('active');
            mainContent.innerHTML = '<h2>Post not found</h2>';
            restoreBackgroundScroll();
            return;
        }

        overlays.articleOverlay.querySelector('.article-content').innerHTML = `
            <article>
                <div class="article-image">
                    <img src="${sanitize(post.image)}" alt="${sanitize(post.title)}" loading="lazy">
                </div>
                <div class="article-content">
                    <span class="category">${sanitize(post.category)}</span>
                    <h1>${sanitize(post.title)}</h1>
                    <div class="creator-info">
                        <p><strong>Author:</strong> ${sanitize(post.creator.name)}</p>
                        ${post.creator.email ? `<p><strong>Email:</strong> <a href="mailto:${sanitize(post.creator.email)}">${sanitize(post.creator.email)}</a></p>` : ''}
                        ${post.creator.social ? `<p><strong>Social:</strong> <a href="${sanitize(post.creator.social)}" target="_blank">${sanitize(post.creator.social)}</a></p>` : ''}
                    </div>
                    <p class="excerpt">${sanitize(post.excerpt)}</p>
                    <div class="meta">
                        <span><i class="fas fa-clock"></i> ${sanitize(post.readTime)}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${sanitize(post.date)}</span>
                    </div>
                    <div class="content">${sanitize(post.content)}</div>
                    <div class="article-actions">
                        <button class="save-btn" data-post-id="${sanitize(post.id)}" aria-label="Save article"><i class="${localStorage.getItem(`saved-${post.id}`) ? 'fas' : 'far'} fa-bookmark"></i></button>
                        <button class="share-btn" aria-label="Share article"><i class="fas fa-share-alt"></i></button>
                        ${post.category.toLowerCase() === 'myblog' ? `<button class="delete-btn" data-post-id="${sanitize(post.id)}" aria-label="Delete article"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </article>
        `;
        resetOverlays(overlays.articleOverlay);
        overlays.articleOverlay.classList.add('active');
        disableBackgroundScroll();

        localStorage.setItem(`lastRead-${postId}`, Date.now());

        const focusableElements = overlays.articleOverlay.querySelectorAll('button, a, input, [tabindex="0"]');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        firstFocusable?.focus();

        const trapFocus = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };
        overlays.articleOverlay.addEventListener('keydown', trapFocus);

        const closeButton = overlays.articleOverlay.querySelector('.close-article-btn');
        const closeHandler = () => {
            overlays.articleOverlay.classList.remove('active');
            overlays.articleOverlay.removeEventListener('keydown', trapFocus);
            restoreBackgroundScroll();
            const outsideClickHandler = handleOutsideClick(overlays.articleOverlay, closeButton, '.article-overlay-container');
            document.removeEventListener('click', outsideClickHandler);
        };
        closeButton.onclick = closeHandler;

        const outsideClickHandler = handleOutsideClick(overlays.articleOverlay, closeButton, '.article-overlay-container');
        document.addEventListener('click', outsideClickHandler);

        initializeSaveButtons();
        initializeShareButtons();
        initializeDeleteButtons();
    };

    // Initialize Delete Buttons
    const initializeDeleteButtons = () => {
        document.querySelectorAll('.delete-btn[data-post-id]').forEach(button => {
            button.removeEventListener('click', button._handler);
            button._handler = async () => {
                const postId = button.getAttribute('data-post-id');
                if (!postId) return;
                if (confirm('Are you sure you want to delete this post?')) {
                    try {
                        const response = await fetch(`/api/posts/${postId}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) throw new Error('Failed to delete post');
                        blogPosts = blogPosts.filter(p => p.id !== postId);
                        localStorage.removeItem(`saved-${postId}`);
                        localStorage.removeItem(`saveTime-${postId}`);
                        localStorage.removeItem(`lastRead-${postId}`);
                        alert('Post deleted successfully');
                        resetOverlays();
                        handleRouting();
                    } catch (error) {
                        console.error('Error deleting post:', error);
                        alert('Failed to delete post');
                    }
                }
            };
            button.addEventListener('click', button._handler);
        });
    };

    // Initialize Save and Share Buttons (simplified)
    const initializeSaveButtons = () => {
        document.querySelectorAll('.save-btn').forEach(button => {
            button.onclick = () => {
                const postId = button.getAttribute('data-post-id');
                const isSaved = localStorage.getItem(`saved-${postId}`);
                if (isSaved) {
                    localStorage.removeItem(`saved-${postId}`);
                    localStorage.removeItem(`saveTime-${postId}`);
                    button.querySelector('i').classList.replace('fas', 'far');
                } else {
                    localStorage.setItem(`saved-${postId}`, 'true');
                    localStorage.setItem(`saveTime-${postId}`, Date.now());
                    button.querySelector('i').classList.replace('far', 'fas');
                }
            };
        });
    };

    const initializeShareButtons = () => {
        document.querySelectorAll('.share-btn').forEach(button => {
            button.onclick = () => {
                alert('Share functionality not implemented yet.');
            };
        });
    };

    // Page Rendering Functions
    const renderHome = () => {
        mainContent.innerHTML = `
            <section class="hero">
                <div class="container">
                    <div class="hero-content">
                        <span class="category-badge">Featured</span>
                        <h1>Explore the Future of Technology</h1>
                        <p class="excerpt">Discover cutting-edge AI innovations, programming tutorials, and in-depth gadget reviews.</p>
                        <a href="/blog-creator.html" class="create-blog-btn">Free Blog</a>
                        <a href="#posts" class="read-more-btn">Read Blogs <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="hero-image">
                        <img src="images/ai_image.png" alt="Futuristic technology illustration" loading="lazy">
                    </div>
                </div>
            </section>
            <section class="featured-posts" id="posts">
                <div class="container">
                    <h2 class="section-title">Featured Posts</h2>
                    <div class="slider-container">
                        <div class="slider">
                            ${blogPosts.map(post => `
                                <div class="post-slide" data-post-id="${sanitize(post.id)}">
                                    <img src="${sanitize(post.image)}" alt="${sanitize(post.title)}" loading="lazy">
                                    <div class="slide-content">
                                        <span class="category">${sanitize(post.category)}</span>
                                        <h3><a href="#post/${sanitize(post.id)}">${sanitize(post.title)}</a></h3>
                                        <div class="meta">
                                            <span><i class="fas fa-clock"></i> ${sanitize(post.readTime)}</span>
                                            <span><i class="fas fa-calendar-alt"></i> ${sanitize(post.date)}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button class="slider-nav prev-btn" aria-label="Previous slide"><i class="fas fa-chevron-left"></i></button>
                        <button class="slider-nav next-btn" aria-label="Next slide"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </section>
            <section class="main-content">
                <div class="container">
                    <div class="articles-grid" id="articles-grid">
                        ${blogPosts.map(post => renderArticleCard(post)).join('')}
                    </div>
                    <aside class="sidebar">
                        <div class="ad-image">
                            ${ads.length > 0 ? `<img src="${sanitize(ads[0].image)}" alt="${sanitize(ads[0].alt)}" loading="lazy">` : '<p>No ads available.</p>'}
                        </div>
                    </aside>
                </div>
                <div class="pagination-wrapper">
                    <div class="pagination" id="pagination"></div>
                </div>
            </section>
            <div class="search-overlay">
                <form class="search-form">
                    <input type="text" placeholder="Search SabirBlog..." aria-label="Search">
                    <button type="submit" aria-label="Search"><i class="fas fa-search"></i></button>
                </form>
                <button class="close-search" aria-label="Close search"><i class="fas fa-times"></i></button>
                <div class="search-suggestions"></div>
                <div class="search-results-grid"></div>
            </div>
        `;
        initializeFeatures();
    };

    const renderCategory = (category) => {
        const filteredPosts = category.toLowerCase() === 'myblog' 
            ? blogPosts 
            : blogPosts.filter(post => post.category.toLowerCase() === category.toLowerCase());
        mainContent.innerHTML = `
            <section class="main-content">
                <div class="container">
                    <h2 class="section-title">${sanitize(category)}</h2>
                    <div class="articles-grid" id="articles-grid">
                        ${filteredPosts.length > 0 ? filteredPosts.map(post => renderArticleCard(post)).join('') : '<p>No posts found in this category.</p>'}
                    </div>
                    <aside class="sidebar">
                        <div class="ad-image">
                            ${ads.length > 0 ? `<img src="${sanitize(ads[0].image)}" alt="${sanitize(ads[0].alt)}" loading="lazy">` : '<p>No ads available.</p>'}
                        </div>
                    </aside>
                </div>
                <div class="pagination-wrapper">
                    <div class="pagination" id="pagination"></div>
                </div>
            </section>
            <div class="search-overlay">
                <form class="search-form">
                    <input type="text" placeholder="Search SabirBlog..." aria-label="Search">
                    <button type="submit" aria-label="Search"><i class="fas fa-search"></i></button>
                </form>
                <button class="close-search" aria-label="Close search"><i class="fas fa-times"></i></button>
                <div class="search-suggestions"></div>
                <div class="search-results-grid"></div>
            </div>
        `;
        initializeFeatures();
    };

    const renderAbout = () => {
        mainContent.innerHTML = `
            <section class="about-section">
                <div class="container">
                    <h1>About SabirBlog</h1>
                    <p>SabirBlog is your go-to source for cutting-edge insights on AI, programming, graphic design, and technology trends. We aim to empower our readers with practical tutorials, in-depth reviews, and the latest innovations in the tech world.</p>
                    <p>Founded in 2024, our mission is to make complex tech topics accessible to everyone, from beginners to seasoned professionals.</p>
                </div>
            </section>
        `;
        initializeFeatures();
    };

    // Client-Side Routing
    const handleRouting = () => {
        let hash = window.location.hash || '#home';
        if (!window.location.hash) {
            window.location.hash = '#home';
            hash = '#home';
        }
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.main-nav a[href="${hash}"]`);
        if (activeLink) activeLink.classList.add('active');

        mainContent.style.opacity = '0';
        mainContent.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            resetOverlays();
            if (hash === '#home') {
                renderHome();
            } else if (hash.startsWith('#post/')) {
                const postId = hash.split('/')[1];
                renderPostOverlay(postId);
            } else if (hash.startsWith('#category/')) {
                const category = decodeURIComponent(hash.split('/')[1]);
                renderCategory(category);
            } else if (hash === '#about') {
                renderAbout();
            } else {
                renderHome();
            }
            mainContent.style.opacity = '1';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 400);
    };

    // Pagination Logic
    const initializePagination = () => {
        const articlesPerPage = 6;
        let currentPage = 1;

        const showPage = (page) => {
            const articlesGrid = document.querySelector('.articles-grid');
            const pagination = document.getElementById('pagination');
            if (!articlesGrid || !pagination) return;

            const articleCards = Array.from(articlesGrid.querySelectorAll('.article-card'));
            const totalPages = Math.ceil(articleCards.length / articlesPerPage);
            currentPage = Math.max(1, Math.min(page, totalPages));
            const start = (currentPage - 1) * articlesPerPage;
            const end = start + articlesPerPage;

            articlesGrid.style.opacity = '0';
            setTimeout(() => {
                articleCards.forEach((card, index) => {
                    card.style.display = index >= start && index < end ? 'block' : 'none';
                });
                articlesGrid.style.opacity = '1';
                renderPagination(totalPages, pagination);
            }, 300);
        };

        const renderPagination = (totalPages, pagination) => {
            pagination.innerHTML = '';
            const createButton = (text, page, disabled = false, active = false) => {
                const btn = document.createElement('button');
                btn.textContent = text;
                btn.setAttribute('aria-label', text);
                if (disabled) btn.disabled = true;
                if (active) btn.classList.add('active');
                if (!disabled) btn.onclick = () => showPage(page);
                pagination.appendChild(btn);
            };

            createButton('« Prev', currentPage - 1, currentPage === 1);
            for (let i = 1; i <= totalPages; i++) {
                createButton(i, i, false, i === currentPage);
            }
            createButton('Next »', currentPage + 1, currentPage === totalPages);
        };

        showPage(1);
    };

    // Feature Initialization
    const initializeFeatures = () => {
        const menuToggle = document.querySelector('.menu-toggle');
        const mainNav = document.querySelector('.main-nav');
        if (menuToggle && mainNav) {
            menuToggle.onclick = () => {
                toggleClass(mainNav, 'active');
                toggleClass(menuToggle, 'active');
                menuToggle.setAttribute('aria-expanded', mainNav.classList.contains('active'));
            };
            mainNav.querySelectorAll('a').forEach(link => {
                link.onclick = () => {
                    mainNav.classList.remove('active');
                    menuToggle.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                };
            });
        }

        const slider = document.querySelector('.slider');
        const prevBtn = document.querySelector('.slider-nav.prev-btn');
        const nextBtn = document.querySelector('.slider-nav.next-btn');
        if (slider && prevBtn && nextBtn) {
            prevBtn.onclick = () => slider.scrollBy({ left: -300, behavior: 'smooth' });
            nextBtn.onclick = () => slider.scrollBy({ left: 300, behavior: 'smooth' });
        }

        initializeSaveButtons();
        initializeShareButtons();
        initializeDeleteButtons();
        initializePagination();

        document.querySelectorAll('.article-card').forEach(card => {
            card.onclick = (e) => {
                if (!e.target.closest('.save-btn, .share-btn, .delete-btn')) {
                    const postId = card.getAttribute('data-post-id');
                    renderPostOverlay(postId);
                }
            };
        });
    };

    window.addEventListener('hashchange', handleRouting);
    handleRouting();
});