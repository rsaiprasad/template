# Identity Platform Configuration

resource "google_identity_platform_config" "default" {
  provider = google-beta

  project = local.project_id

  # Auto-delete anonymous users after 30 days
  autodelete_anonymous_users = true

  # Sign-in configuration
  sign_in {
    allow_duplicate_emails = false

    anonymous {
      enabled = false
    }

    email {
      enabled           = false
      password_required = false
    }
  }

  depends_on = [
    google_firebase_project.default,
    google_project_service.apis["identitytoolkit.googleapis.com"],
  ]
}

# Google Sign-In Provider (optional - requires OAuth credentials)

resource "google_identity_platform_default_supported_idp_config" "google" {
  count = var.enable_google_signin ? 1 : 0

  provider = google-beta

  project       = local.project_id
  idp_id        = "google.com"
  client_id     = var.oauth_client_id
  client_secret = var.oauth_client_secret
  enabled       = true

  depends_on = [google_identity_platform_config.default]
}
