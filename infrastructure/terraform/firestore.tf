# Firestore Database

resource "google_firestore_database" "default" {
  provider = google-beta

  project     = local.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Recommended settings
  concurrency_mode            = "PESSIMISTIC"
  app_engine_integration_mode = "DISABLED"

  # ABANDON prevents data loss on terraform destroy; use DELETE only for dev/test
  deletion_policy = "ABANDON"

  depends_on = [
    google_firebase_project.default,
    google_project_service.apis["firestore.googleapis.com"],
  ]
}

# Firestore Security Rules

resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta

  project = local.project_id

  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../../firebase/firestore.rules")
    }
  }

  depends_on = [google_firestore_database.default]
}

resource "google_firebaserules_release" "firestore" {
  provider = google-beta

  project      = local.project_id
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firestore_database.default]
}
