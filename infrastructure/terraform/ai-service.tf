# AI Service - Cloud Run Deployment
# All resources are conditionally created based on var.ai_service.enabled

locals {
  ai_service_enabled = var.ai_service.enabled
  ai_service_image = var.ai_service.image != "" ? var.ai_service.image : "${var.region}-docker.pkg.dev/${local.project_id}/ai-service/ai-service:latest"
}

# =============================================================================
# ARTIFACT REGISTRY - Docker Image Repository
# =============================================================================

resource "google_artifact_registry_repository" "ai_service" {
  provider = google-beta
  count    = local.ai_service_enabled ? 1 : 0

  project       = local.project_id
  location      = var.region
  repository_id = "ai-service"
  format        = "DOCKER"
  description   = "Docker images for the AI service"

  depends_on = [
    google_project_service.apis["artifactregistry.googleapis.com"],
  ]
}

# =============================================================================
# SECRET MANAGER - Gemini API Key
# =============================================================================

resource "google_secret_manager_secret" "gemini_api_key" {
  provider = google-beta
  count    = local.ai_service_enabled ? 1 : 0

  project   = local.project_id
  secret_id = "gemini-api-key"

  replication {
    auto {}
  }

  depends_on = [
    google_project_service.apis["secretmanager.googleapis.com"],
  ]
}

resource "google_secret_manager_secret_version" "gemini_api_key" {
  provider = google-beta
  count    = local.ai_service_enabled && var.ai_service.gemini_api_key != "" ? 1 : 0

  secret      = google_secret_manager_secret.gemini_api_key[0].id
  secret_data = var.ai_service.gemini_api_key
}

# =============================================================================
# CLOUD RUN SERVICE
# =============================================================================

resource "google_cloud_run_v2_service" "ai_service" {
  provider = google-beta
  count    = local.ai_service_enabled ? 1 : 0

  project  = local.project_id
  location = var.region
  name     = "ai-service"

  # Session affinity for WebSocket connections
  template {
    session_affinity = true

    scaling {
      min_instance_count = 0
      max_instance_count = var.ai_service.max_instances
    }

    containers {
      image = local.ai_service_image

      ports {
        container_port = 8080
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key[0].secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "BACKEND_URL"
        value = var.ai_service.backend_url
      }

      env {
        name  = "CORS_ORIGINS"
        value = var.ai_service.cors_origins
      }

      env {
        name  = "DEFAULT_MODE"
        value = var.ai_service.default_mode
      }

      env {
        name  = "SYSTEM_PROMPT"
        value = var.ai_service.system_prompt
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    # Allow the Cloud Run service account to access the secret
    service_account = google_service_account.ai_service[0].email
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_secret_manager_secret_version.gemini_api_key,
    google_artifact_registry_repository.ai_service,
  ]
}

# =============================================================================
# SERVICE ACCOUNT
# =============================================================================

resource "google_service_account" "ai_service" {
  provider = google-beta
  count    = local.ai_service_enabled ? 1 : 0

  project      = local.project_id
  account_id   = "ai-service"
  display_name = "AI Service"
  description  = "Service account for the AI service Cloud Run instance"

  depends_on = [google_project_service.apis["iam.googleapis.com"]]
}

# Grant the service account access to read the Gemini API key secret
resource "google_secret_manager_secret_iam_member" "ai_service_gemini_key" {
  provider = google-beta
  count    = local.ai_service_enabled ? 1 : 0

  project   = local.project_id
  secret_id = google_secret_manager_secret.gemini_api_key[0].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.ai_service[0].email}"
}

# =============================================================================
# IAM - Public Access
# =============================================================================

# Allow unauthenticated access (auth is handled at the app level via Firebase tokens)
resource "google_cloud_run_v2_service_iam_member" "ai_service_public" {
  provider = google-beta
  count    = local.ai_service_enabled ? 1 : 0

  project  = local.project_id
  location = var.region
  name     = google_cloud_run_v2_service.ai_service[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
