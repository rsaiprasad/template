# Service Account for local development

resource "google_service_account" "dev" {
  provider = google-beta

  project      = local.project_id
  account_id   = "admin-dashboard-dev"
  display_name = "Admin Dashboard Development"
  description  = "Service account for local development"

  depends_on = [google_firebase_project.default]
}

# IAM roles for the service account

resource "google_project_iam_member" "dev_datastore" {
  provider = google-beta

  project = local.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.dev.email}"
}

resource "google_project_iam_member" "dev_firebase" {
  provider = google-beta

  project = local.project_id
  role    = "roles/firebase.sdkAdminServiceAgent"
  member  = "serviceAccount:${google_service_account.dev.email}"
}
