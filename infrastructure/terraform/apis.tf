# Enable required Google Cloud APIs

locals {
  required_apis = [
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
  ]
}

# Firebase API needs to be enabled first
resource "google_project_service" "firebase" {
  provider = google-beta.no_user_project_override

  project = local.project_id
  service = "firebase.googleapis.com"

  disable_on_destroy = false

  depends_on = [google_project.new]
}

# Enable all other required APIs
resource "google_project_service" "apis" {
  provider = google-beta

  for_each = toset([for api in local.required_apis : api if api != "firebase.googleapis.com"])

  project = local.project_id
  service = each.value

  disable_on_destroy = false

  depends_on = [
    google_project.new,
    google_project_service.firebase,
  ]
}
