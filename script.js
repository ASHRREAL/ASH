import * as THREE from 'three'; // Restore Three.js import

// Global reference for Three.js elements needed for updates
let particleMaterial; // Make material accessible globally
let threeRenderer; // Make renderer accessible globally for clear color update
let currentClearAlpha = 0.1; // Adjust this value for trail length (lower = longer trails)

document.addEventListener('DOMContentLoaded', () => {
    // console.log('Portfolio website loaded.'); // DEBUG
    // console.log("DOMContentLoaded event fired."); // DEBUG

    // --- Initialize Theme Toggle Listener --- 
    const themeToggleButton = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement; // Target html element now
    
    if (themeToggleButton) {
        const themeIcon = themeToggleButton.querySelector('i');

        // Function to set the theme CLASS
        // Renamed to avoid confusion with the initial inline script's function
        window.toggleThemeClass = () => { 
            const isCurrentlyLight = htmlElement.classList.contains('light-mode');
            const newTheme = isCurrentlyLight ? 'dark' : 'light';
            
            // --- Add toggling class for animation ---
            if (themeIcon) {
                themeIcon.classList.add('toggling');
            }
            // --- End animation trigger ---
            
            // Toggle theme class on HTML element
            htmlElement.classList.toggle('light-mode', !isCurrentlyLight);
            
            // Update button icon AFTER class change
            if (themeIcon) { 
                themeIcon.classList.toggle('fa-sun', isCurrentlyLight);
                themeIcon.classList.toggle('fa-moon', !isCurrentlyLight);
                
                // Remove toggling class after animation duration
                setTimeout(() => {
                    themeIcon.classList.remove('toggling');
                }, 400); // Match CSS transition duration (0.4s)
            }
            
            // Save preference
            localStorage.setItem('theme', newTheme);
            console.log(`Theme toggled to: ${newTheme}`);

            // Update Particle Color
            const newParticleColor = getComputedStyle(htmlElement).getPropertyValue('--particle-color').trim();
            if (particleMaterial) {
                 particleMaterial.color.set(newParticleColor || (newTheme === 'light' ? '#000000' : '#ffffff'));
            }

            // --- Update Clear Color on theme change ---
            updateClearColor(); 
        };

        // Update icon on initial load based on class set by inline script
        const initialThemeIsLight = htmlElement.classList.contains('light-mode');
        if (themeIcon) {
            themeIcon.classList.toggle('fa-sun', !initialThemeIsLight);
            themeIcon.classList.toggle('fa-moon', initialThemeIsLight);
        }

        // Add event listener for the toggle button
        themeToggleButton.addEventListener('click', window.toggleThemeClass);
        
        // console.log("Theme toggle listener initialized."); // DEBUG
    } else {
        console.error("Theme toggle button #theme-toggle not found!");
    }
    // --- End Theme Toggle Listener Init ---

    // Smooth scrolling for navigation links
    setupSmoothScrolling();

    // Add subtle animations on scroll (optional)
    setupScrollAnimations();

    // Initialize 3D Visual Effects (if enabled)
    const visualContainer = document.getElementById('visual-effect-container');
    if (visualContainer && typeof initThreeJSBackground === 'function') { 
        // console.log('Initializing 3D background effect...'); // DEBUG
        initThreeJSBackground(visualContainer);
    }

    // Check if project elements exist BEFORE fetching
    const projectGridCheck = document.querySelector('.project-grid');
    const projectsSectionCheck = document.getElementById('projects');
    if (projectGridCheck && projectsSectionCheck) {
        // console.log("Project containers found just before fetch call."); // DEBUG
        fetchAndDisplayGitHubProjects(); // Fetch projects only if containers exist
    } else {
        console.error("CRITICAL: Project containers not found after DOMContentLoaded."); // Keep critical
    }
    
    // Initial setup for effects - might be called again after fetch
    setupProjectCardEffects();

    // console.log("Finished initializing scripts in DOMContentLoaded."); // DEBUG

    // --- Initialize Page Transition Listener ---
    document.addEventListener('click', handlePageTransition);
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
        root: null, // relative to document viewport
        rootMargin: '0px',
        threshold: 0.15 // Trigger slightly later
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) translateX(0)'; // Reset transforms
                entry.target.style.filter = 'blur(0)'; // Reset blur
                // Optional: unobserve after animation
                 observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sections.forEach((section, index) => {
        // Initial state for animation
        section.style.opacity = '0';
        // Alternate slide-in direction (optional)
        // const slideDirection = index % 2 === 0 ? '-50px' : '50px';
        // section.style.transform = `translateX(${slideDirection})`;

        // Slide-up effect
        section.style.transform = 'translateY(50px)';
        section.style.filter = 'blur(5px)'; // Add a blur effect

        observer.observe(section);
    });
}

// Restore the entire initThreeJSBackground function

function initThreeJSBackground(container) {
    let scene, camera, /*renderer,*/ particles, particleSystem; // renderer is now global
    const particleCount = 5000;
    const mouse = new THREE.Vector2();

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    camera.position.z = 50; // Adjust based on particle spread

    // Renderer
    threeRenderer = new THREE.WebGLRenderer({ alpha: true });
    threeRenderer.setSize(container.offsetWidth, container.offsetHeight);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.autoClear = false; // <-- Disable auto clear
    container.appendChild(threeRenderer.domElement);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 500; // Adjust spread
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Read initial particle color from CSS variable
    const initialParticleColor = getComputedStyle(document.documentElement)
                                  .getPropertyValue('--particle-color').trim();

    // Assign to global material variable
    particleMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(initialParticleColor || '#ffffff'), // Use fetched color or default
        size: 0.4, // Reduced size
        transparent: true,
        opacity: 0.5, // Reduced opacity
        sizeAttenuation: true
    });

    particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);

    // --- Set initial clear color ---
    updateClearColor(); 

    // Mouse move listener
    document.addEventListener('mousemove', onMouseMove, false);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // --- Manual Clear with Low Alpha --- 
        threeRenderer.clear(); // Clear depth/stencil buffer
        // Set clear color with transparency just before rendering this frame
        // The actual background color comes from CSS, this clear creates the trail
        // We assume the CSS variables are already set correctly for the current theme
        // (updateClearColor function ensures threeRenderer clear color matches)
        // No need to setClearColor here every frame if updated on theme change

        // Subtle rotation for background movement
        if (particleSystem) {
            particleSystem.rotation.x += 0.0001;
            particleSystem.rotation.y += 0.0002;
        }

        // Make particles react slightly to mouse (parallax by moving camera) - Reduced effect
        const mouseEffectStrength = 5; // Reduced from 10
        const lerpFactor = 0.02;
        camera.position.x += (mouse.x * mouseEffectStrength - camera.position.x) * lerpFactor;
        camera.position.y += (-mouse.y * mouseEffectStrength - camera.position.y) * lerpFactor;
        camera.lookAt(scene.position); // Keep camera focused on the center

        threeRenderer.render(scene, camera);
    }

    // Handle mouse movement
    function onMouseMove(event) {
        // Normalize mouse coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    // Handle window resize
    function onWindowResize() {
        if (!container) return;
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        threeRenderer.setSize(container.offsetWidth, container.offsetHeight);
        threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Update pixel ratio on resize
        // Also update clear color on resize in case theme changed while hidden
        updateClearColor(); 
    }

    window.addEventListener('resize', onWindowResize, false);

    // Start animation
    animate();

    console.log('Three.js background initialized with initial particle color:', initialParticleColor);
}

// --- Function to update the renderer clear color based on CSS variables ---
function updateClearColor() {
    if (!threeRenderer) return; // Don't run if renderer not initialized

    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--bg-color').trim(); // Get the actual RGBA string
    
    try {
        // Use the existing bg color variable which has alpha
        threeRenderer.setClearColor(bgColor, 1); // Set clear color but clear alpha is handled differently
        
        // We actually control the 'trail' by how much we clear the *color* buffer.
        // We clear depth/stencil fully, but only clear color slightly.
        // This seems complex, let's simplify: we'll use a transparent plane instead.
        console.warn("Trail effect via clearAlpha is complex; consider a transparent plane or post-processing.");
        // Re-enabling autoClear for simplicity for now.
        threeRenderer.autoClear = true; 
        
    } catch (e) {
        console.error("Error setting clear color:", e, "bgColor was:", bgColor);
        // Fallback clear color
        const isLight = document.documentElement.classList.contains('light-mode');
        threeRenderer.setClearColor(isLight ? 0xf8f9fa : 0x121212, 1);
    }
}

// NEW Function Renamed for 3D Tilt and Parallax
function setupProjectCardEffects() {
    const projectItems = document.querySelectorAll('.project-item');
    if (!projectItems || projectItems.length === 0) {
        // console.log("setupProjectCardEffects: No project items found yet."); // DEBUG - Normal if called before fetch
        return;
    }
    const parallaxIntensity = 12; // Intensity for blocky background shift

    projectItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            // item.classList.add('is-hovered'); // No longer needed for highlight
        });

        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();

            // Calculate grid offsets based on center
            const xCenter = e.clientX - rect.left - rect.width / 2;
            const yCenter = e.clientY - rect.top - rect.height / 2;
            const offsetXPercent = xCenter / rect.width;
            const offsetYPercent = yCenter / rect.height;
            const bgOffsetX = -offsetXPercent * parallaxIntensity;
            const bgOffsetY = -offsetYPercent * parallaxIntensity;

            // Removed calculation and setting of --mouse-x, --mouse-y

            // Apply styles using CSS custom properties (only parallax offset)
            item.style.setProperty('--bg-offset-x', `${bgOffsetX}px`);
            item.style.setProperty('--bg-offset-y', `${bgOffsetY}px`);
        });

        item.addEventListener('mouseleave', () => {
            // item.classList.remove('is-hovered'); // No longer needed for highlight
            // Reset grid offset - CSS transition on ::before handles visual reset
            // We can reset the value instantly though
            item.style.setProperty('--bg-offset-x', '0px');
            item.style.setProperty('--bg-offset-y', '0px');
        });
    });
    // console.log("Project card effects setup: Grid Parallax Active."); // DEBUG
}

// --- GitHub Project Fetching ---

async function fetchAndDisplayGitHubProjects() {
    // console.log("Attempting to run fetchAndDisplayGitHubProjects..."); // DEBUG
    const username = 'ASHRREAL';
    const isOnProjectsPage = window.location.pathname.includes('projects.html');
    const perPageCount = isOnProjectsPage ? 100 : 10;
    const apiUrl = `https://api.github.com/users/${username}/repos?type=public&sort=updated&per_page=${perPageCount}`;
    const projectGrid = document.querySelector('.project-grid');
    const projectsSection = document.getElementById('projects');

    if (!projectGrid || !projectsSection) {
        console.error('CRITICAL: Project grid or section not found.'); // Keep critical
        return;
    }
    // console.log(`Fetching projects for ${username} (Page: ${isOnProjectsPage ? 'All Projects' : 'Index'})...`); // DEBUG

    // Clear any previous button (only relevant for index page)
    if (!isOnProjectsPage) {
        const existingButtonContainer = projectsSection.querySelector('.show-more-container');
        if (existingButtonContainer) {
            existingButtonContainer.remove();
        }
    }

    // Show loading spinner instead of text
    projectGrid.innerHTML = '<div class="loading-spinner"></div>';
    console.log(`Fetching projects for ${username}...`);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            // Try to get more info from response if possible
            let errorText = response.statusText;
            try { 
                const errorData = await response.json();
                errorText += ` - ${errorData.message || 'No additional message.'}`;
            } catch (e) { /* Ignore if response body isn't JSON */ }
            throw new Error(`GitHub API error: ${response.status} ${errorText}`);
        }
        const repos = await response.json();

        // console.log(`Found ${repos.length} repositories.`); // DEBUG
        projectGrid.innerHTML = ''; // Clear loading message

        if (repos.length === 0) {
            projectGrid.innerHTML = '<p>No public projects found on GitHub.</p>';
            return;
        }

        let displayCount = 0;
        // Set maxDisplay based on the page
        const maxDisplay = isOnProjectsPage ? repos.length : 2; // Show all on projects page, 2 on index

        repos.forEach(repo => {
            if (displayCount >= maxDisplay) {
                 if (!isOnProjectsPage) return; // Stop adding on index page only
                 // On projects page, we let it continue to process all fetched repos
            }

            // Skip forks if desired
            // if (repo.fork) return;

            // --- Create Project Item HTML (same as before) ---
            const projectName = repo.name;
            const projectDesc = repo.description || 'No description provided.';
            const projectUrl = repo.html_url;
            const projectId = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const maxLength = 100;
            let displayDesc = projectDesc;
            if (!isOnProjectsPage && projectDesc.length > maxLength) { // Only truncate on index page
                displayDesc = projectDesc.substring(0, maxLength).trim() + '...';
            }
            const projectItemHTML = `
                <div class="project-item" data-project-id="${projectId}">
                    <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="project-link">
                        <h3>${projectName}</h3>
                        <p title="${projectDesc}">${displayDesc}</p>
                    </a>
                </div>
            `;
            projectGrid.insertAdjacentHTML('beforeend', projectItemHTML);
            displayCount++;
        });

        // Re-apply JS effects
        setupProjectCardEffects();
        // console.log(`Displayed ${displayCount} projects.`); // DEBUG

        // Add "Show More" button only on the index page if needed
        if (!isOnProjectsPage && repos.length > maxDisplay) {
            // console.log("More projects available, adding 'Show More' button."); // DEBUG
            const buttonHTML = `
                <div class="show-more-container" style="text-align: center; margin-top: 2rem;">
                    <a href="projects.html" class="show-more-button">Show More Projects</a>
                </div>
            `;
            // Ensure button container doesn't exist before adding
            if (!projectsSection.querySelector('.show-more-container')) {
                 projectsSection.insertAdjacentHTML('beforeend', buttonHTML);
            }
        }

    } catch (error) {
        console.error('Error fetching/displaying GitHub projects:', error); // Keep important error
        // Provide a slightly more user-friendly error message
        projectGrid.innerHTML = '<p class="error-message">Could not load projects. Check console for details.</p>';
    }
}

// --- Page Transition Handler ---
function handlePageTransition(event) {
    // Find the nearest anchor tag ancestor
    const link = event.target.closest('a');

    // Check if it's a valid internal link
    if (link && link.href && link.target !== '_blank' && link.href.startsWith(window.location.origin) && !link.href.includes('#')) {
        // Exclude links within project cards for now, as they don't navigate away
        if (link.closest('.project-item')) {
            return;
        }
        
        // Prevent immediate navigation
        event.preventDefault();
        
        // Get the destination URL
        const destination = link.href;
        
        // Add fade-out class to body
        document.body.classList.add('fade-out');
        
        // Wait for animation to finish, then navigate
        setTimeout(() => {
            window.location.href = destination;
        }, 300); // Match CSS animation duration (0.3s)
    }
}

function loadProjects() {
    const projectGrid = document.querySelector('.project-grid');
    const loadingSpinner = projectGrid ? projectGrid.querySelector('.loading-spinner') : null;
    const showMoreContainer = document.querySelector('.show-more-container');
    const isProjectsPage = document.body.classList.contains('projects-page');
    const limit = isProjectsPage ? 100 : 2; // Show 100 on projects page, 2 on index

    if (!projectGrid) {
        console.error('Project grid container not found.');
        return;
    }

    // Show spinner before fetching
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    // Clear existing projects immediately (optional, prevents seeing old projects briefly)
    // projectGrid.innerHTML = ''; // Keep spinner if we do this
    // if(loadingSpinner) projectGrid.appendChild(loadingSpinner);

    const username = 'FelipeTurra'; // Replace with your GitHub username
    const apiUrl = `https://api.github.com/users/${username}/repos?sort=updated&direction=desc`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(repos => {
            projectGrid.innerHTML = ''; // Clear grid *before* adding new items (keeps spinner if fetch is fast)
            if (loadingSpinner) projectGrid.appendChild(loadingSpinner); // Re-add spinner after clearing

            const sortedRepos = repos.filter(repo => !repo.fork).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
            const reposToDisplay = sortedRepos.slice(0, limit);
            const remainingReposCount = sortedRepos.length - limit;

            reposToDisplay.forEach(repo => {
                const projectItem = createProjectCard(repo);
                projectGrid.appendChild(projectItem);
            });

            // Setup effects after cards are added
            setupProjectCardEffects();

            // Add 'Show More' button on index page if needed
            if (!isProjectsPage && remainingReposCount > 0 && showMoreContainer) {
                showMoreContainer.innerHTML = ''; // Clear previous button if any
                const showMoreButton = document.createElement('a');
                showMoreButton.href = 'projects.html';
                showMoreButton.classList.add('button'); // Use existing button style
                showMoreButton.textContent = `Show All ${sortedRepos.length} Projects`;
                showMoreContainer.appendChild(showMoreButton);
            } else if (showMoreContainer) {
                showMoreContainer.innerHTML = ''; // Ensure it's empty on projects page or if no more repos
            }

        })
        .catch(error => {
            console.error('Error fetching GitHub repositories:', error);
            projectGrid.innerHTML = '<p class="error-message">Failed to load projects. Please check the console for details.</p>'; // Show error message
        })
        .finally(() => {
            // Hide spinner after fetch completes (success or error)
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        });
} 