# Firebase Web App

resource "google_firebase_web_app" "default" {
  provider = google-beta

  project      = local.project_id
  display_name = "${var.project_name} Web App"

  deletion_policy = "DELETE"

  depends_on = [google_firebase_project.default]
}

# Get Firebase Web App configuration (apiKey, authDomain, etc.)

data "google_firebase_web_app_config" "default" {
  provider = google-beta

  project    = local.project_id
  web_app_id = google_firebase_web_app.default.app_id

  depends_on = [google_firebase_web_app.default]
}
