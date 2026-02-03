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

# Service Account Key (optional - stored in Terraform state)
# For production, use Workload Identity Federation instead

resource "google_service_account_key" "dev" {
  count = var.create_service_account_key ? 1 : 0

  provider = google-beta

  service_account_id = google_service_account.dev.name
  key_algorithm      = "KEY_ALG_RSA_2048"
}
