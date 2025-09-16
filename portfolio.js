// Portfolio JavaScript - Frontend functionality
class PortfolioApp {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.enhanceFormValidation();
    this.trackPageView();
    this.setupSmoothScrolling();
    this.setupProjectTracking();
  }

  setupEventListeners() {
    // Contact form submission
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) =>
        this.handleContactSubmit(e)
      );
    }

    // Track social link clicks
    document.querySelectorAll(".social-link").forEach((link) => {
      link.addEventListener("click", (e) => this.trackSocialClick(e));
    });

    // Track project views
    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", (e) => this.trackProjectView(e));
    });
  }

  setupSmoothScrolling() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }

  setupProjectTracking() {
    // Track time spent on page
    let startTime = Date.now();
    window.addEventListener("beforeunload", () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      this.trackEvent("page_time", { duration: timeSpent });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener("scroll", () => {
      const scrollTop = window.pageYOffset;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
      }
    });

    // Send scroll depth on page unload
    window.addEventListener("beforeunload", () => {
      if (maxScroll > 0) {
        this.trackEvent("scroll_depth", { percentage: maxScroll });
      }
    });
  }

  async handleContactSubmit(e) {
    e.preventDefault();

    if (!this.validateAllFields()) {
      return;
    }

    const submitBtn = document.getElementById("contactSubmitBtn");
    const originalText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");

    const formData = new FormData(e.target);
    const contactData = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const response = await this.apiCall("/api/contact", "POST", contactData);

      // Hide form and show success message
      document.getElementById("contactForm").style.display = "none";
      document.getElementById("contactSuccess").style.display = "block";
      document.getElementById("contactError").style.display = "none";

      // Track successful contact submission
      this.trackEvent("contact_form_submit", { success: true });

      // Reset form for future use
      e.target.reset();
    } catch (error) {
      // Show error message
      document.getElementById("contactError").style.display = "block";
      document.getElementById("contactErrorMessage").textContent =
        error.message || "Failed to send message. Please try again.";
      document.getElementById("contactSuccess").style.display = "none";

      // Track failed contact submission
      this.trackEvent("contact_form_submit", {
        success: false,
        error: error.message,
      });
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
  }

  trackPageView() {
    this.trackEvent("page_view", {
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  trackSocialClick(e) {
    const link = e.currentTarget;
    const platform = link.querySelector("span").textContent.toLowerCase();

    this.trackEvent("social_click", {
      platform: platform,
      url: link.href,
    });
  }

  trackProjectView(e) {
    const card = e.currentTarget;
    const projectName = card.querySelector("h3").textContent;
    const projectUrl = card.href;

    this.trackEvent("project_view", {
      project: projectName,
      url: projectUrl,
    });
  }

  trackEvent(eventType, data = {}) {
    // Send analytics data to backend
    const analyticsData = {
      eventType,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        pageUrl: window.location.href,
      },
    };

    // Use sendBeacon for better reliability on page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(analyticsData)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      // Fallback to fetch (won't work on page unload)
      this.apiCall("/api/analytics/track", "POST", analyticsData).catch(() => {
        // Silently fail analytics calls
      });
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem("portfolio_session_id");
    if (!sessionId) {
      sessionId =
        "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("portfolio_session_id", sessionId);
    }
    return sessionId;
  }

  async apiCall(endpoint, method = "GET", data = null) {
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const base = window?.location?.origin || "http://localhost:3000";
    const response = await fetch(`${base}${endpoint}`, config);

    let result;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // Handle non-JSON responses (like rate limiter messages)
      const text = await response.text();
      result = { message: text };
    }

    if (!response.ok) {
      throw new Error(result.message || "API call failed");
    }

    return result;
  }

  // Utility functions
  showToast(message, type = "info") {
    // Create toast element if it doesn't exist
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.className = "toast";
    }, 3000);
  }

  // Add some interactive features
  addScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    }, observerOptions);

    // Observe elements for animation
    document
      .querySelectorAll(".project-card, .skill-item, .timeline-item")
      .forEach((el) => {
        observer.observe(el);
      });
  }

  // Add loading states for better UX
  addLoadingStates() {
    // Add loading class to body initially
    document.body.classList.add("loading");

    // Remove loading class when page is fully loaded
    window.addEventListener("load", () => {
      document.body.classList.remove("loading");
    });
  }

  // Handle form validation feedback
  enhanceFormValidation() {
    const inputs = document.querySelectorAll("input, textarea");

    inputs.forEach((input) => {
      input.addEventListener("blur", (e) => {
        this.validateField(e.target);
      });

      input.addEventListener("input", (e) => {
        if (e.target.classList.contains("invalid")) {
          this.validateField(e.target);
        }
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = "";

    // Basic validation
    if (field.hasAttribute("required") && !value) {
      isValid = false;
      errorMessage = "This field is required";
    } else if (field.type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = "Please enter a valid email address";
      }
    } else if (field.name === "name" && value) {
      // Name validation: 2-50 chars, letters and spaces only
      if (value.length < 2 || value.length > 50) {
        isValid = false;
        errorMessage = "Name must be between 2 and 50 characters";
      } else if (!/^[a-zA-Z\s]+$/.test(value)) {
        isValid = false;
        errorMessage = "Name can only contain letters and spaces";
      }
    } else if (field.name === "subject" && value) {
      // Subject validation: 5-100 chars
      if (value.length < 5 || value.length > 100) {
        isValid = false;
        errorMessage = "Subject must be between 5 and 100 characters";
      }
    } else if (field.name === "message" && value) {
      // Message validation: 10-1000 chars
      if (value.length < 10 || value.length > 1000) {
        isValid = false;
        errorMessage = "Message must be between 10 and 1000 characters";
      }
    }

    // Update field appearance
    field.classList.toggle("invalid", !isValid);
    field.classList.toggle("valid", isValid && value);

    // Show/hide error message
    let errorElement = field.parentNode.querySelector(".field-error");
    if (!isValid && errorMessage) {
      if (!errorElement) {
        errorElement = document.createElement("div");
        errorElement.className = "field-error";
        field.parentNode.appendChild(errorElement);
      }
      errorElement.textContent = errorMessage;
    } else if (errorElement) {
      errorElement.remove();
    }

    return isValid;
  }

  validateAllFields() {
    const inputs = document.querySelectorAll(
      "#contactForm input[required], #contactForm textarea[required]"
    );
    let allValid = true;
    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        allValid = false;
      }
    });
    return allValid;
  }
}

// Initialize the portfolio app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.portfolioApp = new PortfolioApp();
});

// Add some CSS for enhanced interactions
const additionalStyles = `
<style>
/* Form validation styles */
.form-group input.invalid,
.form-group textarea.invalid {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-group input.valid,
.form-group textarea.valid {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.field-error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

/* Loading states */
body.loading * {
    animation: none !important;
}

/* Animation classes */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-in {
    animation: fadeInUp 0.6s ease-out forwards;
}

/* Enhanced button states */
.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
    transform: translateY(0);
}

/* Contact form success/error states */
.contact-success {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border-radius: 12px;
    margin: 1rem 0;
}

.contact-error {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border-radius: 12px;
    margin: 1rem 0;
}

.contact-success i,
.contact-error i {
    font-size: 3rem;
    margin-bottom: 1rem;
}

/* Responsive enhancements */
@media (max-width: 768px) {
    .hero-content h1 {
        font-size: 2.5rem;
    }

    .project-card {
        margin-bottom: 1rem;
    }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* Focus states for keyboard navigation */
.btn:focus,
input:focus,
textarea:focus,
select:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    .btn {
        border: 2px solid currentColor;
    }

    .skill-fill {
        background: currentColor !important;
    }
}
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML("beforeend", additionalStyles);
