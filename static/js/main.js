
document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll('.paper-section');
    sections.forEach(section => {
        observer.observe(section);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Lightbox Functionality
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'lightbox-modal';
    document.body.appendChild(lightbox);

    const lightboxImg = document.createElement('img');
    lightboxImg.className = 'lightbox-content';
    lightboxImg.style.display = 'none'; // Hidden by default
    lightbox.appendChild(lightboxImg);

    // Canvas for cropped images
    const lightboxCanvas = document.createElement('canvas');
    lightboxCanvas.className = 'lightbox-content';
    lightboxCanvas.style.display = 'none'; // Hidden by default
    lightbox.appendChild(lightboxCanvas);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';
    lightbox.appendChild(closeBtn);

    // Open Lightbox
    document.querySelectorAll('.method-image, .teaser-img, .result-item img, .slider-img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
            if (window.innerWidth < 768) return; // Disable on mobile
            lightbox.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Disable scroll

            // Check for Scrolly/Slider special classes
            const container = img.closest('.slider-image-container');
            const isSpecial = img.classList.contains('img-pos-left') || img.classList.contains('img-pos-right');

            if (isSpecial && container) {
                // Show Canvas, Hide Img
                lightboxImg.style.display = 'none';
                lightboxCanvas.style.display = 'block';

                // Calculate Visual Aspect Ratio from Container
                const containerW = container.offsetWidth;
                const containerH = container.offsetHeight;
                const ratio = containerW / containerH;

                // Canvas Dimensions based on Image Natural Height * Container Ratio
                // This ensures resolution matches the full height of the image
                const drawH = img.naturalHeight;
                const drawW = drawH * ratio;

                lightboxCanvas.width = drawW;
                lightboxCanvas.height = drawH;

                const ctx = lightboxCanvas.getContext('2d');
                // Fill background with white (user request)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, drawW, drawH);

                if (img.classList.contains('img-pos-left')) {
                    // Left: translateX(0)
                    // Draw image at 0, 0
                    ctx.drawImage(img, 0, 0);
                } else if (img.classList.contains('img-pos-right')) {
                    // Right: translateX(-61%)
                    // Calculate shift in pixels relative to natural dimensions
                    const shiftX = img.naturalWidth * 0.61;
                    // Draw image shifted left
                    ctx.drawImage(img, -shiftX, 0);
                }
            } else {  // Normal Image: Show Img, Hide Canvas
                lightboxCanvas.style.display = 'none';
                lightboxImg.style.display = 'block';
                lightboxImg.src = img.src;
            }
        });
    });

    // Close Lightbox
    const closeLightbox = () => {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto'; // Enable scroll
    };

    closeBtn.addEventListener('click', closeLightbox);

    // Close on click outside
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.style.display === 'block') {
            closeLightbox();
        }
    });

    // Slider Class
    class Slider {
        constructor(containerElement, options = {}) {
            this.container = containerElement;
            this.sliderWrapper = this.container.querySelector('.slides-wrapper');
            this.slides = this.container.querySelectorAll('.slide');
            this.progressBar = this.container.querySelector('.progress-bar');
            this.btnPrev = this.container.querySelector('.btn-prev');
            this.btnNext = this.container.querySelector('.btn-next');
            this.btnPause = this.container.querySelector('.btn-pause');
            this.navBtns = this.container.querySelectorAll('.nav-btn');

            // NOTE: Dynamic slides added after constructor call might require re-querying slides if we strictly followed this order.
            // However, for mesh slider, we will inject slides BEFORE initializing the Slider class.

            if (!this.sliderWrapper) return;
            // Allow empty slides initially if we are building them? No, we build first.
            if (this.slides.length === 0) {
                // Try to re-query in case they were just added?
                this.slides = this.container.querySelectorAll('.slide');
                if (this.slides.length === 0) return;
            }

            this.currentSlide = 0;
            this.isPaused = false;
            this.progress = 0;
            this.slideDuration = options.duration || 5000;
            this.intervalTime = 50;
            this.sliderInterval = null;
            this.autoPlay = options.autoPlay !== undefined ? options.autoPlay : true;

            this.init();
        }

        init() {
            // Event Listeners
            if (this.btnNext) {
                this.btnNext.addEventListener('click', () => {
                    this.nextSlide();
                    this.startTimer();
                });
            }

            if (this.btnPrev) {
                this.btnPrev.addEventListener('click', () => {
                    this.prevSlide();
                    this.startTimer();
                });
            }

            if (this.btnPause) {
                this.btnPause.addEventListener('click', () => {
                    this.isPaused = !this.isPaused;
                    this.btnPause.innerHTML = this.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
                });
            }

            this.navBtns.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    this.goToSlide(index);
                });
            });

            this.updateSlider();
            if (this.autoPlay) {
                this.startTimer();
            } else {
                this.isPaused = true;
                if (this.btnPause) {
                    this.btnPause.innerHTML = '<i class="fas fa-play"></i>';
                }
            }

            this.syncHeights();
            window.addEventListener('resize', () => this.syncHeights());

            // Also retry sync after image load
            const firstImg = this.slides[0].querySelector('img');
            if (firstImg && !firstImg.complete) {
                firstImg.onload = () => this.syncHeights();
            }
        }

        updateSlider() {
            this.sliderWrapper.style.transform = `translateX(-${this.currentSlide * 100}%)`;
            this.progress = 0;
            if (this.progressBar) this.progressBar.style.width = '0%';

            this.navBtns.forEach((btn, index) => {
                if (index === this.currentSlide) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        nextSlide() {
            this.currentSlide = (this.currentSlide + 1) % this.slides.length;
            this.updateSlider();
        }

        prevSlide() {
            this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
            this.updateSlider();
        }

        goToSlide(index) {
            this.currentSlide = index;
            this.updateSlider();
            this.startTimer();
        }

        startTimer() {
            if (!this.autoPlay && this.isPaused) return;

            clearInterval(this.sliderInterval);
            this.sliderInterval = setInterval(() => {
                if (!this.isPaused) {
                    this.progress += this.intervalTime;
                    const percent = (this.progress / this.slideDuration) * 100;
                    if (this.progressBar) this.progressBar.style.width = `${percent}%`;

                    if (this.progress >= this.slideDuration) {
                        this.nextSlide();
                    }
                }
            }, this.intervalTime);
        }

        syncHeights() {
            if (window.innerWidth < 768) {
                // Reset styles for mobile
                this.container.querySelectorAll('.slider-image-container, .img-crop-container').forEach(el => {
                    el.style.height = '';
                    el.style.display = '';
                    el.style.alignItems = '';
                });
                this.container.querySelectorAll('.slider-image-container img, .img-pos-left, .img-pos-right').forEach(img => {
                    img.style.height = '';
                    img.style.width = '';
                });
                // Also reset model viewer containers if present
                this.container.querySelectorAll('.render_wrapper').forEach(el => {
                    el.style.height = ''; // Let CSS handle it?
                });
                return;
            }

            const firstImg = this.slides[0].querySelector('.slider-img');
            // If we are in mesh slider, we might not have .slider-img, but model-viewer or .render_wrapper
            // Let's check for .render_wrapper as well

            // For general slider (img based)
            if (firstImg) {
                // Logic adapted to scope:
                const firstContainer = this.slides[0].querySelector('.slider-image-container');
                if (firstContainer) {
                    firstContainer.style.height = '';
                    firstImg.style.height = '';
                }

                const height = firstImg.offsetHeight;
                if (height > 0) {
                    this.container.querySelectorAll('.slider-image-container').forEach(container => {
                        container.style.height = `${height}px`;
                        container.style.display = 'flex';
                        container.style.alignItems = 'center';

                        const img = container.querySelector('img');
                        if (img) {
                            img.style.height = '100%';
                            img.style.objectFit = 'contain';
                        }
                    });

                    this.container.querySelectorAll('.img-crop-container').forEach(container => {
                        container.style.height = `${height}px`;
                    });

                    this.container.querySelectorAll('.img-pos-left, .img-pos-right').forEach(img => {
                        img.style.height = '100%';
                        img.style.width = 'auto'; // Width auto to maintain aspect ratio
                        img.style.objectFit = 'cover';
                    });
                }
            } else {
                // For Model Viewer Slider
                // We enforce a height via CSS generally, but maybe we want consistency?
                // Currently .render_wrapper has height: 350px in adapter HTML.
                // We can rely on CSS for this one.
            }
        }
    }



    // Initialize Video Slider
    const videoSliderInit = document.querySelector('#video-slider');
    if (videoSliderInit) {
        new Slider(videoSliderInit, { autoPlay: false });
    }

    // -------------------------------------------------------------------------
    // Custom Carousel Logic for Mesh Visualization (Shift by 1)
    // -------------------------------------------------------------------------
    const modelPaths = [
        "fish",
        "lemon",
        "penguin",
        "rose",
        "cow",
        "structure",
        "alpaca",
        "belt",
        "skull",
        "sofa"
    ];

    function createRadioButtons(name) {
        const createRadioButton = (value, label, checked = false) => {
            const wrapper = document.createElement("div");
            wrapper.className = "mesh-radio-option";

            const input = document.createElement("input");
            input.type = "radio";
            input.name = name;
            input.value = value;
            input.checked = checked;
            input.id = value + "-" + name;

            const labelElement = document.createElement("label");
            labelElement.htmlFor = input.id;
            labelElement.innerHTML = label;

            wrapper.appendChild(input);
            wrapper.appendChild(labelElement);
            return { wrapper, input };
        };

        const opt1 = createRadioButton("texture", "Ours", true);
        const opt2 = createRadioButton("sim_texture", "Standard<br>Fine-Tune", false);
        const opt3 = createRadioButton("mesh", "Mesh", false);

        const container = document.createElement("div");
        container.className = "mesh-controls-group";
        container.appendChild(opt1.wrapper);
        container.appendChild(opt2.wrapper);
        container.appendChild(opt3.wrapper);

        return { container, inputs: [opt1.input, opt2.input, opt3.input] };
    }

    const meshSliderContainer = document.querySelector('#mesh-slider');

    if (meshSliderContainer) {
        const slidesWrapper = meshSliderContainer.querySelector('.slides-wrapper');
        const paginationContainer = meshSliderContainer.querySelector('#mesh-slider-pagination');
        const btnPrev = meshSliderContainer.querySelector('.btn-prev');
        const btnNext = meshSliderContainer.querySelector('.btn-next');

        // 1. Clear pagination (not used in finite carousel mode)
        paginationContainer.innerHTML = '';
        paginationContainer.style.display = 'none';

        // 2. Setup Container Styling
        slidesWrapper.style.display = "flex";
        slidesWrapper.style.transition = "transform 0.5s ease-out";
        slidesWrapper.style.width = "100%";

        // 3. Create Items
        modelPaths.forEach((path, index) => {
            // Item Wrapper: 1/3 width
            const itemWrapper = document.createElement("div");
            itemWrapper.className = "mesh-carousel-item";
            // Removed inline width/flex styles to let CSS handle responsiveness
            itemWrapper.style.boxSizing = "border-box";

            // Viewer Container
            const viewerContainer = document.createElement("div");
            viewerContainer.className = "render_wrapper";
            viewerContainer.style.height = "250px"; // Adjust height if key
            viewerContainer.style.position = "relative";
            viewerContainer.style.width = "100%";
            viewerContainer.style.overflow = "hidden";

            // Model Viewer
            const modelViewer = document.createElement("model-viewer");
            // Cache busting: Append timestamp to force reload if file changes
            const timestamp = new Date().getTime();
            const basePath = `./texture_meshes/${path}.glb?v=${timestamp}`;
            const simPath = `./texture_meshes_sim/${path}.glb?v=${timestamp}`;

            modelViewer.src = basePath;
            modelViewer.alt = "3D Mesh Visualization";
            modelViewer.setAttribute("auto-rotate", "");
            modelViewer.setAttribute("camera-controls", "");
            modelViewer.setAttribute("camera-orbit", "50deg 75deg 3m");
            modelViewer.setAttribute("max-camera-orbit", "auto 95deg auto");
            modelViewer.style.width = "100%";
            modelViewer.style.height = "100%";
            modelViewer.style.backgroundColor = "transparent";

            // Controls
            const radioName = "display-option-" + index;
            const { container: controlsDiv, inputs } = createRadioButtons(radioName);
            const [radioTexture, radioSim, radioMesh] = inputs;

            // Texture Toggle Logic
            let originalTexture = null;
            // We need to capture the texturing whenever a model loads
            modelViewer.addEventListener("load", () => {
                const material = modelViewer.model.materials[0];
                if (material && material.pbrMetallicRoughness.baseColorTexture) {
                    // Only save if it's not null (i.e. if we are in a textured mode)
                    // If we just loaded "Mesh" mode (technically we load texture then strip it, 
                    // but if logic is right we handle it).
                    // Actually, simpler: Always cache the texture of the current model 
                    // IF we are in a mode that expects texture.

                    // But wait, if we switch to "sim", we have a different texture.
                    // We don't need to cache "sim" texture because "Mesh" mode 
                    // only ever uses the BASE path geometry.

                    // So we only really need to cache the texture from the BASE path.
                    // Let's rely on the fact that loading a file brings its texture.
                    if (modelViewer.src.includes("texture_meshes/")) {
                        originalTexture = material.pbrMetallicRoughness.baseColorTexture.texture;
                    }
                }

                // Post-load check: If we are in "Mesh" mode, strip texture immediately
                if (radioMesh.checked) {
                    const material = modelViewer.model.materials[0];
                    if (material) {
                        material.pbrMetallicRoughness.baseColorTexture.setTexture(null);
                    }
                }
            });

            // 1. Texture Option
            radioTexture.addEventListener("change", function () {
                if (this.checked) {
                    // Ensure correct source
                    if (!modelViewer.src.includes(basePath)) {
                        modelViewer.src = basePath;
                        // Texture comes with load
                    } else {
                        // Same source, just restore texture if it was gone
                        const material = modelViewer.model.materials[0];
                        if (material && originalTexture) {
                            material.pbrMetallicRoughness.baseColorTexture.setTexture(originalTexture);
                        }
                    }
                }
            });

            // 2. Sim Texture Option
            radioSim.addEventListener("change", function () {
                if (this.checked) {
                    // Ensure correct source
                    if (!modelViewer.src.includes(simPath)) {
                        modelViewer.src = simPath;
                        // Texture comes with load
                    }
                    // No need to restore texture manually, new load has it
                }
            });

            // 3. Mesh Option
            radioMesh.addEventListener("change", function () {
                if (this.checked) {
                    // Ensure correct source (mesh mode uses base path geometry)
                    if (!modelViewer.src.includes(basePath)) {
                        modelViewer.src = basePath;
                        // Texture will be stripped by 'load' listener
                    } else {
                        // Same source, just strip texture
                        const material = modelViewer.model.materials[0];
                        material.pbrMetallicRoughness.baseColorTexture.setTexture(null);
                    }
                }
            });

            // Error Handling
            modelViewer.addEventListener('error', (e) => {
                console.error("Model error:", e);
                const errorDiv = document.createElement("div");
                Object.assign(errorDiv.style, {
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)", color: "red",
                    fontSize: "0.8rem", textAlign: "center", width: "100%"
                });
                errorDiv.innerHTML = "Failed<br>to load";
                viewerContainer.appendChild(errorDiv);
            });

            viewerContainer.appendChild(modelViewer);
            // viewerContainer.appendChild(controlsDiv); // Moved out

            // Text Caption
            const captionDiv = document.createElement("div");
            captionDiv.className = "mesh-caption";
            // Placeholder or empty initially
            captionDiv.textContent = "";

            fetch(`./texture_text/${path}.txt`)
                .then(r => r.text())
                .then(text => {
                    captionDiv.textContent = text;
                })
                .catch(e => console.warn("No text for " + path));

            itemWrapper.appendChild(viewerContainer);
            itemWrapper.appendChild(controlsDiv); // Appended here
            itemWrapper.appendChild(captionDiv);

            slidesWrapper.appendChild(itemWrapper);
        });

        // 4. Carousel Navigation Logic
        let currentIndex = 0;
        const totalItems = modelPaths.length;

        function getItemsVisible() {
            return window.innerWidth < 768 ? 1 : 3;
        }

        function updateCarousel() {
            const itemsVisible = getItemsVisible();
            const percentage = 100 / itemsVisible;
            const translateX = -(currentIndex * percentage);
            slidesWrapper.style.transform = `translateX(${translateX}%)`;

            const maxIndex = Math.max(0, totalItems - itemsVisible);

            // Button State
            if (btnPrev) {
                btnPrev.style.opacity = currentIndex <= 0 ? "0.3" : "1";
                btnPrev.style.pointerEvents = currentIndex <= 0 ? "none" : "auto";
                btnPrev.style.cursor = currentIndex <= 0 ? "default" : "pointer";
            }
            if (btnNext) {
                btnNext.style.opacity = currentIndex >= maxIndex ? "0.3" : "1";
                btnNext.style.pointerEvents = currentIndex >= maxIndex ? "none" : "auto";
                btnNext.style.cursor = currentIndex >= maxIndex ? "default" : "pointer";
            }
        }

        // Attach Listeners with Clone to remove old listeners if any
        if (btnPrev) {
            const newPrev = btnPrev.cloneNode(true);
            btnPrev.parentNode.replaceChild(newPrev, btnPrev);
            newPrev.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });
        }

        if (btnNext) {
            const newNext = btnNext.cloneNode(true);
            btnNext.parentNode.replaceChild(newNext, btnNext);
            newNext.addEventListener('click', () => {
                const itemsVisible = getItemsVisible();
                const maxIndex = Math.max(0, totalItems - itemsVisible);
                if (currentIndex < maxIndex) {
                    currentIndex++;
                    updateCarousel();
                }
            });
        }

        // Handle Resize
        window.addEventListener('resize', () => {
            const itemsVisible = getItemsVisible();
            const maxIndex = Math.max(0, totalItems - itemsVisible);
            if (currentIndex > maxIndex) {
                currentIndex = maxIndex;
            }
            updateCarousel();
        });

        // Initialize
        updateCarousel();

        // Initialize view
        updateCarousel();
    }

    // Copy BibTeX
    const copyBtn = document.getElementById('copyBibtexBtn');
    const bibtexCode = document.getElementById('bibtexCode');

    if (copyBtn && bibtexCode) {
        copyBtn.addEventListener('click', () => {
            const textToCopy = bibtexCode.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Success feedback
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.style.color = 'var(--visible-success, #10B981)';
                copyBtn.style.borderColor = '#10B981';

                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.style.color = '';
                    copyBtn.style.borderColor = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    }
    // -------------------------------------------------------------------------
    // PDF Rendering Logic (Method Figure)
    // -------------------------------------------------------------------------
    const canvas = document.getElementById('method-pdf-canvas');
    if (canvas) {
        const url = 'static/images/method_figure.pdf';
        const ctx = canvas.getContext('2d');

        // Asynchronous download of PDF
        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.promise.then(function (pdf) {

            // Fetch the first page
            pdf.getPage(1).then(function (page) {
                const scale = 2.0; // Render at higher resolution for crispness
                const viewport = page.getViewport({ scale: scale });

                // Prepare canvas using PDF page dimensions
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render PDF page into canvas context
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                const renderTask = page.render(renderContext);
                renderTask.promise.then(function () {
                    console.log('PDF rendered successfully');
                });
            });
        }, function (reason) {
            // PDF loading error
            console.error(reason);
        });
    }

});
