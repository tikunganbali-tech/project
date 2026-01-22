package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"

	"engine-hub/internal/api"
	"engine-hub/internal/content"
	"engine-hub/internal/engine"
	"engine-hub/internal/jobs"
	"engine-hub/internal/marketing"
	seoworker "engine-hub/internal/seo"
	v2 "engine-hub/internal/ai/v2"
)

func main() {
	// CRITICAL: Global panic recovery
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[FATAL PANIC] %v", r)
			// Log stack trace if possible
			log.Printf("[FATAL PANIC] Details: %+v", r)
		}
	}()

	log.Println("[BOOT] Server starting...")

	// Load .env file ONLY for development (ENV=development)
	// PRODUCTION-GRADE RULE: Engine HANYA percaya pada os.Getenv()
	// .env TIDAK BOLEH jadi sumber kebenaran produksi
	if os.Getenv("ENV") == "development" {
		log.Println("[BOOT] Development mode detected - loading .env file...")
		if err := godotenv.Load(); err == nil {
			log.Println("[BOOT] Loaded .env file for development")
		} else {
			log.Println("[BOOT] No .env file found (non-fatal in dev mode)")
		}
	} else {
		log.Println("[BOOT] Production mode - using OS environment variables only")
	}

	// VALIDASI STARTUP - FAIL FAST (MANDATORY)
	// FASE B - B1: Server HARUS FAIL FAST jika API key tidak ada atau invalid
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AI_API_KEY")
	}
	
	// FASE B - B1: Validasi ENV di OS - Panjang > 100 char, tidak kosong, tidak ada spasi/quote salah
	if apiKey == "" {
		// FAIL FAST - Server tidak boleh start tanpa API key
		log.Fatal("[FATAL] OPENAI_API_KEY is not set. Server will not start.\n" +
			"Please set OPENAI_API_KEY as OS environment variable (not .env file for production).\n" +
			"Windows: setx OPENAI_API_KEY \"sk-xxxxx\"\n" +
			"Linux: export OPENAI_API_KEY=\"sk-xxxxx\"")
	}
	
	// FASE B - B1: Validasi panjang API key (harus > 100 karakter untuk OpenAI key)
	if len(apiKey) <= 100 {
		log.Fatal("[FATAL] OPENAI_API_KEY is too short (length=", len(apiKey), "). Expected > 100 characters.\n" +
			"Please verify your API key is correct and set properly in OS environment.")
	}
	
	// FASE B - B1: Validasi tidak ada spasi di awal/akhir atau quote salah
	trimmedKey := strings.TrimSpace(apiKey)
	if trimmedKey != apiKey {
		log.Fatal("[FATAL] OPENAI_API_KEY contains leading/trailing spaces. This is invalid.\n" +
			"Please set API key without spaces: setx OPENAI_API_KEY \"sk-xxxxx\"")
	}
	
	// FASE B - B1: Validasi tidak ada quote yang salah (misalnya quote di dalam value)
	if strings.Contains(apiKey, "\"") || strings.Contains(apiKey, "'") {
		log.Fatal("[FATAL] OPENAI_API_KEY contains quotes. This is invalid.\n" +
			"Please set API key without quotes in the value itself.")
	}
	
	// Log eksplisit API key status (setelah semua validasi lulus)
	log.Printf("[BOOT] OPENAI_API_KEY: present=true, length=%d, valid=true", len(apiKey))
	log.Println("[BOOT] Registering Tracking Engine...")
	// Register Tracking Engine
	tracking := engine.NewTrackingEngine()
	engine.Register(tracking)

	log.Println("[BOOT] Starting Tracking Engine...")
	// Start engine
	if err := tracking.Start(); err != nil {
		log.Fatal("[BOOT] Failed to start tracking engine:", err)
	}
	log.Println("[BOOT] Tracking Engine started")

	// Test job execution
	log.Println("[BOOT] Starting test job execution...")
	go jobs.Run("tracking", "initial-metrics-scan")

	log.Println("[BOOT] Initializing Content Engine...")
	// STEP 20C: Start Content Engine
	// Note: Content engine can run in DEV MODE without database for AI pipeline testing
	contentEngine := content.NewContentEngine()
	if err := contentEngine.Start(); err != nil {
		log.Printf("[BOOT] WARNING: Failed to start content engine: %v", err)
		log.Println("[BOOT] Content engine will not process jobs until database is configured")
	} else {
		log.Println("[BOOT] Content engine started successfully")
		// Note: If no database, engine runs in DEV MODE (AI pipeline still works)
	}

	// FASE D - D1: Start Daily Scheduler (if database available)
	// Only start if content engine started successfully (database available)
	if contentEngine.IsRunning() && content.GetDB() != nil {
		log.Println("[BOOT] Initializing Daily Scheduler...")
		scheduler := content.NewDailyScheduler()
		if err := scheduler.Start(); err != nil {
			log.Printf("[BOOT] WARNING: Failed to start scheduler: %v", err)
			log.Println("[BOOT] Scheduler will not create jobs")
		} else {
			log.Println("[BOOT] Daily scheduler started successfully")
		}
	} else {
		log.Println("[BOOT] Skipping scheduler (database not available)")
	}

	log.Println("[BOOT] Initializing Event Emitter...")
	// STEP 22B-3: Initialize Event Emitter (config only, no auto-fire)
	if err := marketing.InitEmitter(); err != nil {
		log.Printf("[BOOT] WARNING: Failed to initialize event emitter: %v", err)
		log.Println("[BOOT] Event emitter will not send events until properly configured")
	} else {
		log.Println("[BOOT] Event Emitter initialized (ready for manual emit calls)")
	}

	log.Println("[BOOT] Registering HTTP handlers...")
	http.HandleFunc("/health", api.Health)
	http.HandleFunc("/health/full", api.HealthFull)
	http.HandleFunc("/api/engines", api.Engines)
	http.HandleFunc("/engines", api.Engines) // Backward compatibility
	http.HandleFunc("/api/engines/control", api.ControlEngine)
	http.HandleFunc("/engines/control", api.ControlEngine) // Backward compatibility
	http.HandleFunc("/api/engines/logs", api.EngineLogs)
	http.HandleFunc("/engines/logs", api.EngineLogs) // Backward compatibility
	http.HandleFunc("/logs", api.EngineLogs)         // STEP 18C-1: Central logs endpoint

	// STEP 18B-1: Jobs endpoints
	http.HandleFunc("/api/jobs", api.EngineJobs)     // GET /api/jobs
	http.HandleFunc("/engines/jobs", api.EngineJobs) // Backward compatibility

	// STEP 18B-1: Manual run endpoint - POST /api/jobs/{id}/run
	// Note: Go's http.ServeMux doesn't support path parameters directly,
	// so we'll handle it in the handler function
	http.HandleFunc("/api/jobs/", api.HandleJobRun)        // Handles /api/jobs/{id}/run
	http.HandleFunc("/engines/jobs/run", api.RunEngineJob) // Backward compatibility (old format)

	http.HandleFunc("/api/jobs/results", api.EngineJobResults)
	http.HandleFunc("/engines/jobs/results", api.EngineJobResults) // Backward compatibility

	// STEP 23B-4: Attribution endpoint (READ-ONLY)
	http.HandleFunc("/api/marketing/attribution", api.Attribution)

	// AI Content Generation endpoint - POST /api/engine/ai/generate (LEGACY - v1)
	log.Println("[BOOT] Registering AI Generate endpoint (v1 - LEGACY)...")
	http.HandleFunc("/api/engine/ai/generate", api.AIGenerate)
	
	// AI Generator v2 - Single Entry Point: POST /api/engine/ai/generate-v2
	// A1: Set v2 as default - ALL Blog/Product generation MUST use this endpoint
	log.Println("[BOOT] Registering AI Generate v2 endpoint (DEFAULT)...")
	http.HandleFunc("/api/engine/ai/generate-v2", api.AIGenerateV2)
	
	// AI Generator v2 - PHASE 1: Question Generation endpoint
	log.Println("[BOOT] Registering AI Generate Questions endpoint (v2)...")
	http.HandleFunc("/api/engine/ai/generate-questions", api.AIGenerateQuestions)
	
	// M-05: Product Image Generation endpoint
	log.Println("[BOOT] Registering Product Image Generation endpoint (M-05)...")
	http.HandleFunc("/api/engine/ai/generate-product-images", api.AIGenerateProductImages)
	log.Println("[BOOT] AI Generate endpoints registered")

	// Controlled Production endpoint - POST /api/engine/ai/controlled-production
	// BACKEND ONLY - for quality learning system (closed-loop)
	log.Println("[BOOT] Registering Controlled Production endpoint...")
	http.HandleFunc("/api/engine/ai/controlled-production", api.ControlledProduction)
	log.Println("[BOOT] Controlled Production endpoint registered")

	// Batch Production endpoint - POST /api/engine/ai/batch-production
	// CTO FINAL - LOCKED: Production batch generation with retry logic and keyword rotation
	log.Println("[BOOT] Registering Batch Production endpoint...")
	http.HandleFunc("/api/engine/ai/batch-production", api.BatchProduction)
	log.Println("[BOOT] Batch Production endpoint registered")

	// PHASE 1: AI Generator v2 endpoints
	log.Println("[BOOT] Registering AI Generator v2 endpoints...")
	http.HandleFunc("/api/v2/generate", api.V2Generate)
	http.HandleFunc("/api/v2/content/", api.V2Content) // Handles /api/v2/content/:pageId/:version, /api/v2/content/:pageId/versions, /api/v2/content/:pageId/latest
	http.HandleFunc("/api/v2/pages", api.V2ListPages)
	
	// PHASE 3: Event endpoints
	http.HandleFunc("/api/v2/events/publish", api.V2PublishEvent)
	http.HandleFunc("/api/v2/events/content-produced", api.V2ContentProducedEvent)
	http.HandleFunc("/api/v2/events/user-interaction", api.V2UserInteractionEvent)
	http.HandleFunc("/api/v2/events/post-generation-complete", api.V2PostGenerationComplete)
	
	// PHASE 4: QC endpoints
	http.HandleFunc("/api/v2/qc/decision", api.V2QCDecision)
	http.HandleFunc("/api/v2/qc/", api.V2QCStatus)
	
	// PHASE B: QC recheck endpoint
	http.HandleFunc("/qc/recheck", api.QCRecheck)
	
	// PHASE 5: Insights endpoints
	http.HandleFunc("/api/v2/insights/", api.V2Insights)
	
	// PHASE 7C: Aggregated insights endpoints (READ-ONLY)
	log.Println("[BOOT] Registering Aggregated Insights endpoints...")
	http.HandleFunc("/api/v2/insights/aggregated", api.V2AggregatedInsight)
	http.HandleFunc("/api/v2/insights/brands", api.V2ListBrands)
	http.HandleFunc("/api/v2/insights/locales", api.V2ListLocales)
	log.Println("[BOOT] Aggregated Insights endpoints registered")
	
	// PHASE 8A: Ads Intelligence endpoints
	log.Println("[BOOT] Registering Ads Intelligence endpoints...")
	http.HandleFunc("/api/ads/generate", api.AdsGenerate)
	log.Println("[BOOT] Ads Intelligence endpoints registered")
	
	log.Println("[BOOT] AI Generator v2 endpoints registered")
	
	// PHASE 3: Setup SEO v2 listeners
	log.Println("[BOOT] Setting up SEO v2 listeners...")
	v2.SetupSEOListener()
	
	// Setup POST_GENERATION_COMPLETE handler (moved here to avoid import cycle)
	emitter := v2.GetEventEmitter()
	emitter.Subscribe(v2.EventPostGenerationComplete, func(payload v2.EventPayload) {
		log.Printf("[SEO WORKER] Received POST_GENERATION_COMPLETE: entity=%v, entity_id=%v", payload.Data["entity"], payload.Data["entity_id"])
		seoworker.HandlePostGenerationComplete(payload.Data)
	})
	
	log.Println("[BOOT] SEO v2 listeners setup complete")

	log.Println("[BOOT] All handlers registered")
	
	// Use port 8090 for development to avoid conflicts with other services
	port := ":8090"
	if envPort := os.Getenv("ENGINE_PORT"); envPort != "" {
		port = ":" + envPort
	}
	
	log.Printf("[BOOT] ENGINE HUB RUNNING ON %s", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
