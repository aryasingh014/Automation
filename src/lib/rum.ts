export interface RUMConfig {
  serviceName: string;
  endpoint: string;
  sampleRate: number;
  enableTracking: boolean;
}

export interface BrowserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  pageViews: PageView[];
  errors: JavaScriptError[];
  resources: ResourceTiming[];
  actions: UserAction[];
}

export interface PageView {
  id: string;
  url: string;
  title: string;
  referrer: string;
  timestamp: number;
  loadTime?: number;
  networkTime?: number;
}

export interface JavaScriptError {
  id: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  severity: 'error' | 'warning';
}

export interface ResourceTiming {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  timestamp: number;
}

export interface UserAction {
  id: string;
  type: 'click' | 'input' | 'scroll' | 'navigation';
  target: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class RUMClient {
  private sessionId: string;
  private config: RUMConfig;
  private pageViews: PageView[] = [];
  private errors: JavaScriptError[] = [];
  private actions: UserAction[] = [];
  private lastActivity = 0;
  private sessionStart = 0;

  constructor(config: Partial<RUMConfig> = {}) {
    this.config = {
      serviceName: config.serviceName || 'observability-os',
      endpoint: config.endpoint || '/api/rum',
      sampleRate: config.sampleRate ?? 100,
      enableTracking: config.enableTracking ?? true,
    };

    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();

    if (this.config.enableTracking) {
      this.init();
    }
  }

  private generateSessionId(): string {
    return `rum-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private shouldSample(): boolean {
    return Math.random() * 100 < this.config.sampleRate;
  }

  private init() {
    if (typeof window === 'undefined') return;

    this.trackPageViews();
    this.trackErrors();
    this.trackResources();
    this.trackUserActions();

    window.addEventListener('beforeunload', () => {
      this.sendSession();
    });
  }

  private trackPageViews() {
    const recordPageView = () => {
      if (!this.shouldSample()) return;

      const entry: PageView = {
        id: this.generateId(),
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        timestamp: Date.now(),
      };

      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        entry.loadTime = perfData.loadEventEnd - perfData.fetchStart;
        entry.networkTime = perfData.responseEnd - perfData.requestStart;
      }

      this.pageViews.push(entry);

      this.send({
        type: 'pageview',
        data: entry,
      });
    };

    recordPageView();

    window.addEventListener('popstate', recordPageView);
    
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      recordPageView();
    };
  }

  private trackErrors() {
    window.addEventListener('error', (event) => {
      if (!this.shouldSample()) return;

      const error: JavaScriptError = {
        id: this.generateId(),
        message: event.message,
        stack: (event.error as Error)?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        severity: 'error',
      };

      this.errors.push(error);

      this.send({
        type: 'error',
        data: error,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (!this.shouldSample()) return;

      const error: JavaScriptError = {
        id: this.generateId(),
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        severity: 'warning',
      };

      this.errors.push(error);

      this.send({
        type: 'error',
        data: error,
      });
    });
  }

  private trackResources() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        if (!this.shouldSample()) return;

        list.getEntries().forEach((entry) => {
          const typedEntry = entry as PerformanceResourceTiming;
          if (typedEntry.initiatorType === 'navigation' || typedEntry.initiatorType === 'beacon') return;

          const resource: ResourceTiming = {
            name: entry.name,
            initiatorType: typedEntry.initiatorType,
            duration: entry.duration,
            transferSize: (entry as any).transferSize || 0,
            timestamp: Date.now(),
          };

          this.send({
            type: 'resource',
            data: resource,
          });
        });
      });

      observer.observe({ entryTypes: ['resource', 'paint'] });
    } catch (e) {
      console.warn('[RUM] Resource tracking not supported');
    }
  }

  private trackUserActions() {
    const handleClick = (event: MouseEvent) => {
      if (!this.shouldSample()) return;

      const target = event.target as HTMLElement;
      const action: UserAction = {
        id: this.generateId(),
        type: 'click',
        target: target.tagName.toLowerCase() + (target.id ? `#${target.id}` : ''),
        timestamp: Date.now(),
        metadata: {
          text: target.textContent?.trim().substring(0, 50),
        },
      };

      this.actions.push(action);

      this.send({
        type: 'action',
        data: action,
      });
    };

    const handleInput = (event: Event) => {
      if (!this.shouldSample()) return;

      const target = event.target as HTMLInputElement;
      if (!target || target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;

      const action: UserAction = {
        id: this.generateId(),
        type: 'input',
        target: target.tagName.toLowerCase() + (target.id ? `#${target.id}` : ''),
        timestamp: Date.now(),
        metadata: {
          inputType: target.type,
          valueLength: target.value?.length,
        },
      };

      this.send({
        type: 'action',
        data: action,
      });
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
  }

  public send(payload: { type: string; data: any }) {
    try {
      fetch(this.config.endpoint + '/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          serviceName: this.config.serviceName,
          ...payload,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {}
  }

  private sendSession() {
    this.send({
      type: 'session_end',
      data: {
        sessionId: this.sessionId,
        duration: Date.now() - this.sessionStart,
        pageViews: this.pageViews,
        errors: this.errors,
        actions: this.actions,
      },
    });
  }

  public setUserId(userId: string) {
    this.send({
      type: 'identify',
      data: { userId },
    });
  }
}

let rumClient: RUMClient | null = null;

export function initRUM(config?: Partial<RUMConfig>) {
  if (rumClient) return rumClient;
  
  rumClient = new RUMClient(config);
  return rumClient;
}

export function trackEvent(eventName: string, metadata?: Record<string, unknown>) {
  if (!rumClient) return;
  
  rumClient.send({
    type: 'custom_event',
    data: {
      name: eventName,
      metadata,
      timestamp: Date.now(),
    },
  });
}

export default RUMClient;