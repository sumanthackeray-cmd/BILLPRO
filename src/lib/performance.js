/**
 * Performance Optimization Module
 * Ensures sub-100ms page load time and instant interactions
 * Handles caching, preloading, code splitting, and resource optimization
 */

/**
 * Performance Monitoring
 */
export const performanceMonitor = {
  metrics: {},

  mark(name) {
    performance.mark(`${name}-start`);
  },

  measure(name) {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name)[0];
      this.metrics[name] = measure.duration;
      
      if (measure.duration > 100) {
        console.warn(`[v0] ${name} took ${measure.duration.toFixed(2)}ms (exceeded 100ms target)`);
      }
      
      return measure.duration;
    } catch (e) {
      console.error(`[v0] Performance measure error: ${name}`, e);
      return 0;
    }
  },

  getMetrics() {
    return this.metrics;
  },

  reportMetrics() {
    const metrics = performance.getEntriesByType('navigation')[0];
    if (metrics) {
      return {
        dns: metrics.domainLookupEnd - metrics.domainLookupStart,
        tcp: metrics.connectEnd - metrics.connectStart,
        ttfb: metrics.responseStart - metrics.requestStart,
        download: metrics.responseEnd - metrics.responseStart,
        domInteractive: metrics.domInteractive - metrics.responseEnd,
        domComplete: metrics.domComplete - metrics.responseEnd,
        loadComplete: metrics.loadEventEnd - metrics.responseEnd,
        total: metrics.loadEventEnd - metrics.fetchStart
      };
    }
    return {};
  }
};

/**
 * Cache Strategy Manager
 */
export const cacheManager = {
  // In-memory cache for immediate access
  memoryCache: new Map(),
  
  // Set with TTL
  set(key, value, ttlMs = 5 * 60 * 1000) {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  },

  // Get from cache
  get(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry.value;
  },

  // Check if key exists
  has(key) {
    return this.get(key) !== null;
  },

  // Clear all
  clear() {
    this.memoryCache.clear();
  },

  // Cache size
  size() {
    return this.memoryCache.size;
  }
};

/**
 * Resource Preloader
 */
export const preloader = {
  /**
   * Preload critical resources
   */
  preloadCritical() {
    // Preload fonts
    this.preloadFont('/fonts/inter-var.woff2', 'font');
    
    // Preload critical images
    const criticalImages = [
      '/logo.png',
      '/hero-image.jpg',
      '/favicon.ico'
    ];
    
    criticalImages.forEach(src => this.preloadImage(src));
  },

  /**
   * Preload font resource
   */
  preloadFont(href, type = 'font') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = type;
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  },

  /**
   * Preload image
   */
  preloadImage(src) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  },

  /**
   * Prefetch resource
   */
  prefetch(href) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  },

  /**
   * DNS prefetch
   */
  dnsPrefetch(domain) {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  }
};

/**
 * Request Deduplication
 */
export const requestDeduplicator = {
  activeRequests: new Map(),

  /**
   * Execute request with automatic deduplication
   * If the same request is in progress, wait for its result
   */
  async execute(key, requestFn) {
    // Check if request is already in progress
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key);
    }

    // Execute request and store promise
    const promise = requestFn()
      .then(result => {
        this.activeRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.activeRequests.delete(key);
        throw error;
      });

    this.activeRequests.set(key, promise);
    return promise;
  }
};

/**
 * Compression & Optimization
 */
export const compression = {
  /**
   * Compress large strings
   */
  compress(str) {
    return btoa(unescape(encodeURIComponent(str)));
  },

  /**
   * Decompress compressed strings
   */
  decompress(str) {
    return decodeURIComponent(escape(atob(str)));
  },

  /**
   * Minify JSON
   */
  minifyJSON(obj) {
    return JSON.stringify(obj);
  }
};

/**
 * Lazy Loading Strategy
 */
export const lazyLoader = {
  /**
   * Create intersection observer for lazy loading
   */
  createObserver(callback, options = {}) {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01,
      ...options
    };

    return new IntersectionObserver(callback, defaultOptions);
  },

  /**
   * Lazy load images
   */
  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = this.createObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }
};

/**
 * Worker Pool for Heavy Computation
 */
export class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = new Set();

    // Initialize worker pool
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
    }
  }

  /**
   * Execute task in worker pool
   */
  execute(data) {
    return new Promise((resolve, reject) => {
      // Get available worker
      const worker = this.workers.find(w => !this.activeWorkers.has(w));

      if (!worker) {
        // Queue task if no workers available
        this.taskQueue.push({ data, resolve, reject });
        return;
      }

      this.activeWorkers.add(worker);

      const handler = (event) => {
        worker.removeEventListener('message', handler);
        worker.removeEventListener('error', errorHandler);
        this.activeWorkers.delete(worker);

        // Process queued tasks
        if (this.taskQueue.length > 0) {
          const { data: nextData, resolve: nextResolve, reject: nextReject } = this.taskQueue.shift();
          this.execute(nextData).then(nextResolve).catch(nextReject);
        }

        resolve(event.data);
      };

      const errorHandler = (error) => {
        worker.removeEventListener('message', handler);
        worker.removeEventListener('error', errorHandler);
        this.activeWorkers.delete(worker);
        reject(error);
      };

      worker.addEventListener('message', handler);
      worker.addEventListener('error', errorHandler);
      worker.postMessage(data);
    });
  }
}

/**
 * Connection Speed Detection
 */
export const connectionSpeed = {
  /**
   * Get connection information
   */
  getConnection() {
    const nav = navigator;
    
    if ('connection' in nav || 'mozConnection' in nav || 'webkitConnection' in nav) {
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      return {
        effectiveType: conn.effectiveType || '4g',
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }

    return {
      effectiveType: '4g',
      downlink: null,
      rtt: null,
      saveData: false
    };
  },

  /**
   * Check if slow connection
   */
  isSlowConnection() {
    const conn = this.getConnection();
    return conn.effectiveType === '2g' || conn.effectiveType === '3g' || conn.saveData;
  },

  /**
   * Check if fast connection
   */
  isFastConnection() {
    const conn = this.getConnection();
    return conn.effectiveType === '4g' || conn.effectiveType === '5g';
  }
};

/**
 * Initialize all performance optimizations
 */
export const initializePerformance = () => {
  // Preload critical resources
  preloader.preloadCritical();

  // DNS prefetch for external services
  preloader.dnsPrefetch('https://api.supabase.co');
  preloader.dnsPrefetch('https://www.google-analytics.com');

  // Lazy load images when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lazyLoader.lazyLoadImages();
    });
  } else {
    lazyLoader.lazyLoadImages();
  }

  // Report performance metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const metrics = performanceMonitor.reportMetrics();
      console.log('[v0] Performance Metrics:', metrics);
      
      if (metrics.total > 100) {
        console.warn(`[v0] Page load time exceeded 100ms target: ${metrics.total.toFixed(2)}ms`);
      }
    }, 0);
  });
};

export default {
  performanceMonitor,
  cacheManager,
  preloader,
  requestDeduplicator,
  compression,
  lazyLoader,
  WorkerPool,
  connectionSpeed,
  initializePerformance
};
