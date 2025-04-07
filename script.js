import * as THREE from 'three'; 

let particleMaterial; 
let threeRenderer; 
let currentClearAlpha = 0.1;

document.addEventListener('DOMContentLoaded', () => {

    const themeToggleButton = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    if (themeToggleButton) {
        const themeIcon = themeToggleButton.querySelector('i');

        window.toggleThemeClass = () => { 
            const isCurrentlyLight = htmlElement.classList.contains('light-mode');
            const newTheme = isCurrentlyLight ? 'dark' : 'light';
            
            if (themeIcon) {
                themeIcon.classList.add('toggling');
            }
            
            htmlElement.classList.toggle('light-mode', !isCurrentlyLight);
            
            if (themeIcon) { 
                themeIcon.classList.toggle('fa-sun', isCurrentlyLight);
                themeIcon.classList.toggle('fa-moon', !isCurrentlyLight);
                
                setTimeout(() => {
                    themeIcon.classList.remove('toggling');
                }, 400);
            }
            
            localStorage.setItem('theme', newTheme);
            console.log(`Theme toggled to: ${newTheme}`);

            const newParticleColor = getComputedStyle(htmlElement).getPropertyValue('--particle-color').trim();
            if (particleMaterial) {
                 particleMaterial.color.set(newParticleColor || (newTheme === 'light' ? '#000000' : '#ffffff'));
            }

            updateClearColor(); 
        };

        const initialThemeIsLight = htmlElement.classList.contains('light-mode');
        if (themeIcon) {
            themeIcon.classList.toggle('fa-sun', !initialThemeIsLight);
            themeIcon.classList.toggle('fa-moon', initialThemeIsLight);
        }

        themeToggleButton.addEventListener('click', window.toggleThemeClass);

    } else {
        console.error("Theme toggle button #theme-toggle not found!");
    }

    setupSmoothScrolling();

    setupScrollAnimations();

    const visualContainer = document.getElementById('visual-effect-container');
    if (visualContainer && typeof initThreeJSBackground === 'function') { 
        initThreeJSBackground(visualContainer);
    }

    const projectGridCheck = document.querySelector('.project-grid');
    const projectsSectionCheck = document.getElementById('projects');
    if (projectGridCheck && projectsSectionCheck) {
        fetchAndDisplayGitHubProjects();
    } else {
        console.error("CRITICAL: Project containers not found after DOMContentLoaded."); 
    }
    
    setupProjectCardEffects();

});

function setupSmoothScrolling() {
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function setupScrollAnimations() {
    const sections = document.querySelectorAll('section');
    const observerOptions = {
        root: null, 
        rootMargin: '0px', 
        threshold: 0.1 
    };

    const getStaggerDelay = (index) => {
        return `${0.1 + (index * 0.1)}s`;
    };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.animationDelay || '0s';
                
                entry.target.style.transitionDelay = delay;
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) translateX(0)'; 
                entry.target.style.filter = 'blur(0)'; 
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sections.forEach((section, index) => {
        if (prefersReducedMotion) {
            section.style.opacity = '1';
            section.style.transform = 'none';
            section.style.filter = 'none';
            return; 
        }

        section.style.opacity = '0';
        
        section.dataset.animationDelay = getStaggerDelay(index);
        
        section.style.transform = 'translateY(30px)';
        section.style.filter = 'blur(3px)';
        
        section.style.transition = `
            opacity var(--transition-speed-slow) var(--transition-easing),
            transform var(--transition-speed-slow) var(--transition-easing),
            filter var(--transition-speed) var(--transition-easing),
            background-color var(--transition-speed) var(--transition-easing),
            box-shadow var(--transition-speed) var(--transition-easing)
        `;

        observer.observe(section);
    });
    
    const setupProjectCardAnimations = () => {
        const projectCards = document.querySelectorAll('.project-item');
        projectCards.forEach((card, index) => {
            if (prefersReducedMotion) {
                card.style.opacity = '1';
                return;
            }
            
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            card.style.transition = `
                opacity var(--transition-speed) var(--transition-easing),
                transform var(--transition-speed) var(--transition-easing)
            `;
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + (index * 50)); 
        });
    };
    
    const originalSetupProjectCardEffects = window.setupProjectCardEffects || setupProjectCardEffects;
    window.setupProjectCardEffects = function() {
        originalSetupProjectCardEffects();
        setupProjectCardAnimations();
    };
}


function initThreeJSBackground(container) {
    let scene, camera, /*renderer,*/ particles, particleSystem; 
    const particleCount = window.innerWidth < 768 ? 2500 : 5000; 
    const mouse = new THREE.Vector2();
    let frameCount = 0;
    const frameSkip = 1;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    camera.position.z = 50;

    threeRenderer = new THREE.WebGLRenderer({ 
        alpha: true,
        powerPreference: 'high-performance',
        antialias: false 
    });
    threeRenderer.setSize(container.offsetWidth, container.offsetHeight);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
    threeRenderer.autoClear = false; 
    container.appendChild(threeRenderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 500; 
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const initialParticleColor = getComputedStyle(document.documentElement)
                                  .getPropertyValue('--particle-color').trim();

 
    particleMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(initialParticleColor || '#ffffff'), 
        size: 0.4,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true
    });

    particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);

  
    updateClearColor(); 

    let mouseMoveTimeout;
    document.addEventListener('mousemove', (event) => {
        if (mouseMoveTimeout) return;
        
        mouseMoveTimeout = setTimeout(() => {
            onMouseMove(event);
            mouseMoveTimeout = null;
        }, 10); 
    }, { passive: true }); 
    function animate() {
        requestAnimationFrame(animate);

        frameCount++;
        if (frameCount % frameSkip !== 0) return;
 
        threeRenderer.clear();

        if (particleSystem) {
            particleSystem.rotation.x += 0.00005;
            particleSystem.rotation.y += 0.0001;
        }

       
        const mouseEffectStrength = 5; 
        const lerpFactor = 0.01;
        camera.position.x += (mouse.x * mouseEffectStrength - camera.position.x) * lerpFactor;
        camera.position.y += (-mouse.y * mouseEffectStrength - camera.position.y) * lerpFactor;
        camera.lookAt(scene.position);

        threeRenderer.render(scene, camera);
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function onWindowResize() {
        if (!container) return;
        
        if (window.innerWidth < 768 && particleSystem && particleSystem.geometry.attributes.position.count > 2500) {
            scene.remove(particleSystem);
            const newGeometry = new THREE.BufferGeometry();
            const newPositions = new Float32Array(2500 * 3);
            
            for (let i = 0; i < 2500 * 3; i++) {
                newPositions[i] = (Math.random() - 0.5) * 500;
            }
            
            newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
            particleSystem = new THREE.Points(newGeometry, particleMaterial);
            scene.add(particleSystem);
        }
        
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        threeRenderer.setSize(container.offsetWidth, container.offsetHeight);
        threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
        updateClearColor(); 
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onWindowResize, 100);
    }, false);

    animate();
}

function updateClearColor() {
    if (!threeRenderer) return; 
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--bg-color').trim(); 
    
    try {
        threeRenderer.setClearColor(bgColor, 1); 
        console.warn("Trail effect via clearAlpha is complex; consider a transparent plane or post-processing.");
        threeRenderer.autoClear = true; 
        
    } catch (e) {
        console.error("Error setting clear color:", e, "bgColor was:", bgColor);
        
        const isLight = document.documentElement.classList.contains('light-mode');
        threeRenderer.setClearColor(isLight ? 0xf8f9fa : 0x121212, 1);
    }
}

function setupProjectCardEffects() {
    const projectItems = document.querySelectorAll('.project-item');
    if (!projectItems || projectItems.length === 0) {
        return;
    }
    
    
    const parallaxIntensity = 12; 
    
    const debounce = (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    projectItems.forEach(item => {
        createParticleEffect(item);
        
        
        const handleMouseMove = debounce((e) => {
            const rect = item.getBoundingClientRect();

            const xCenter = e.clientX - rect.left - rect.width / 2;
            const yCenter = e.clientY - rect.top - rect.height / 2;
            const offsetXPercent = xCenter / rect.width;
            const offsetYPercent = yCenter / rect.height;
            
            const bgOffsetX = -offsetXPercent * parallaxIntensity;
            const bgOffsetY = -offsetYPercent * parallaxIntensity;

            item.style.setProperty('--bg-offset-x', `${bgOffsetX}px`);
            item.style.setProperty('--bg-offset-y', `${bgOffsetY}px`);
            
            const tiltAmount = 5; 
            const tiltX = offsetYPercent * tiltAmount;
            const tiltY = -offsetXPercent * tiltAmount;
            
            item.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }, 10); 

        item.addEventListener('mouseenter', () => {
       
            item.style.transition = `transform var(--transition-speed-fast) ${getComputedStyle(document.documentElement).getPropertyValue('--transition-easing')}`;
            item.classList.add('active');
        }, { passive: true });

        item.addEventListener('mousemove', handleMouseMove, { passive: true });

        item.addEventListener('mouseleave', () => {
            item.style.setProperty('--bg-offset-x', '0px');
            item.style.setProperty('--bg-offset-y', '0px');
            item.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
            item.classList.remove('active');
        }, { passive: true });
    });
}

function createParticleEffect(cardElement) {
    let canvas = cardElement.querySelector('.particle-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'particle-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity var(--transition-speed) ease-in-out';
        cardElement.insertBefore(canvas, cardElement.firstChild);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            initializeParticles(canvas, cardElement);
        }
    }
}

function initializeParticles(canvas, parentElement) {
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 30;
    function resizeCanvas() {
        canvas.width = parentElement.offsetWidth;
        canvas.height = parentElement.offsetHeight;
    }
    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 0.5 - 0.25,
                speedY: Math.random() * 0.5 - 0.25,
                opacity: Math.random() * 0.5 + 0.1
            });
        }
    }
    
    function animate() {
        if (!canvas.isConnected) return; 
    
        if (parentElement.classList.contains('active')) {
            canvas.style.opacity = '1';
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const primaryColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--primary-color').trim();
            
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = primaryColor;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            canvas.style.opacity = '0';
        }
        
        requestAnimationFrame(animate);
    }
    
    resizeCanvas();
    initParticles();
    animate();
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    }, { passive: true });
}


async function fetchAndDisplayGitHubProjects() {
   
    const username = 'ASHRREAL';
    const isOnProjectsPage = window.location.pathname.includes('projects.html');
    const perPageCount = isOnProjectsPage ? 100 : 10;
    const apiUrl = `https://api.github.com/users/${username}/repos?type=public&sort=updated&per_page=${perPageCount}`;
    const projectGrid = document.querySelector('.project-grid');
    const projectsSection = document.getElementById('projects');

    if (!projectGrid || !projectsSection) {
        console.error('CRITICAL: Project grid or section not found.');
        return;
    }
    if (!isOnProjectsPage) {
        const existingButtonContainer = projectsSection.querySelector('.show-more-container');
        if (existingButtonContainer) {
            existingButtonContainer.remove();
        }
    }
    projectGrid.innerHTML = '<div class="loading-spinner"></div>';
    console.log(`Fetching projects for ${username}...`);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            let errorText = response.statusText;
            try { 
                const errorData = await response.json();
                errorText += ` - ${errorData.message || 'No additional message.'}`;
            } catch (e) {  }
            throw new Error(`GitHub API error: ${response.status} ${errorText}`);
        }
        const repos = await response.json();


        projectGrid.innerHTML = '';

        if (repos.length === 0) {
            projectGrid.innerHTML = '<p>No public projects found on GitHub.</p>';
            return;
        }

        let displayCount = 0;
        const maxDisplay = isOnProjectsPage ? repos.length : 2; 

        repos.forEach(repo => {
            if (displayCount >= maxDisplay) {
                 if (!isOnProjectsPage) return;
            }
            const projectName = repo.name;
            const projectDesc = repo.description || 'No description provided.';
            const projectUrl = repo.html_url;
            const projectId = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const maxLength = 100;
            let displayDesc = projectDesc;
            if (!isOnProjectsPage && projectDesc.length > maxLength) { 
                displayDesc = projectDesc.substring(0, maxLength).trim() + '...';
            }
            const projectItemHTML = `
                <div class="project-item" data-project-id="${projectId}">
                    <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="project-link">
                        <div class="project-content">
                            <div class="project-text-wrapper">
                                <h3>${projectName}</h3>
                                <p title="${projectDesc}">${displayDesc}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            projectGrid.insertAdjacentHTML('beforeend', projectItemHTML);
            displayCount++;
        });

        setupProjectCardEffects();

        if (!isOnProjectsPage && repos.length > maxDisplay) {
            const buttonHTML = `
                <div class="show-more-container" style="text-align: center; margin-top: 2rem;">
                    <a href="projects.html" class="show-more-button">Show More Projects</a>
                </div>
            `;
            if (!projectsSection.querySelector('.show-more-container')) {
                 projectsSection.insertAdjacentHTML('beforeend', buttonHTML);
            }
        }

    } catch (error) {
        console.error('Error fetching/displaying GitHub projects:', error); 
        projectGrid.innerHTML = '<p class="error-message">Could not load projects. Check console for details.</p>';
    }
}
function setupPageTransitions() {
    if (!document.querySelector('.page-transition-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        
        const loader = document.createElement('div');
        loader.className = 'page-loader';
        
        const loaderText = document.createElement('div');
        loaderText.className = 'page-loader-text';
        loaderText.textContent = 'Loading...';
        
        overlay.appendChild(loader);
        overlay.appendChild(loaderText);
        document.body.appendChild(overlay);
    }
    
    const transitionOverlay = document.querySelector('.page-transition-overlay');
    
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const url = link.getAttribute('href');
        if (!url || url.startsWith('#') || url.startsWith('http') || url.startsWith('mailto')) {
            return;
        }
        e.preventDefault();
        transitionOverlay.classList.add('page-transition-active');
        const loaderText = transitionOverlay.querySelector('.page-loader-text');
        if (url.includes('index.html')) {
            loaderText.textContent = 'Going Home...';
        } else if (url.includes('projects')) {
            loaderText.textContent = 'Loading Projects...';
        } else {
            loaderText.textContent = 'Loading...';
        }
        setTimeout(() => {
            window.location.href = url;
        }, 500);
    });
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            transitionOverlay.classList.remove('page-transition-active');
        }
    });
    
    window.addEventListener('load', () => {
        transitionOverlay.classList.remove('page-transition-active');
    });
}
function initializeWebsite() {
    setupThemeToggle();
    setupProjectCardEffects();
    setupScrollAnimations();
    setupPageTransitions(); 

    
    loadProjects();
    const container = document.getElementById('visual-effect-container');
    if (container) {
        initThreeJSBackground(container);
    }
}
document.addEventListener('DOMContentLoaded', initializeWebsite);

function loadProjects() {
    const projectGrid = document.querySelector('.project-grid');
    const loadingSpinner = projectGrid ? projectGrid.querySelector('.loading-spinner') : null;
    const showMoreContainer = document.querySelector('.show-more-container');
    const isProjectsPage = document.body.classList.contains('projects-page');
    const limit = isProjectsPage ? 100 : 2;

    if (!projectGrid) {
        console.error('Project grid container not found.');
        return;
    }

    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    const username = 'ASHRREAL'; 
    const apiUrl = `https://api.github.com/users/${username}/repos?sort=updated&direction=desc`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(repos => {
            projectGrid.innerHTML = '';
            if (loadingSpinner) projectGrid.appendChild(loadingSpinner); 

            const sortedRepos = repos.filter(repo => !repo.fork).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
            const reposToDisplay = sortedRepos.slice(0, limit);
            const remainingReposCount = sortedRepos.length - limit;

            reposToDisplay.forEach(repo => {
                const projectItem = createProjectCard(repo);
                projectGrid.appendChild(projectItem);
            });
            setupProjectCardEffects();
            if (!isProjectsPage && remainingReposCount > 0 && showMoreContainer) {
                showMoreContainer.innerHTML = '';
                const showMoreButton = document.createElement('a');
                showMoreButton.href = 'projects.html';
                showMoreButton.classList.add('button'); 
                showMoreButton.textContent = `Show All ${sortedRepos.length} Projects`;
                showMoreContainer.appendChild(showMoreButton);
            } else if (showMoreContainer) {
                showMoreContainer.innerHTML = ''; 
            }

        })
        .catch(error => {
            console.error('Error fetching GitHub repositories:', error);
            projectGrid.innerHTML = '<p class="error-message">Failed to load projects. Please check the console for details.</p>'; // Show error message
        })
        .finally(() => {
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        });
} 