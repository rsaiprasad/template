# Enable required Google Cloud APIs

locals {
  # APIs that must be enabled before anything else on a new project.
  # These use the no_user_project_override provider so they work
  # even when serviceusage.googleapis.com isn't active yet.
  bootstrap_apis = [
    "firebase.googleapis.com",
    "serviceusage.googleapis.com",
    "iam.googleapis.com",
  ]

  required_apis = [
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

# Bootstrap APIs — enabled first using the provider that doesn't require
# serviceusage.googleapis.com to already be active.
resource "google_project_service" "bootstrap" {
  provider = google-beta.no_user_project_override

  for_each = toset(local.bootstrap_apis)

  project = local.project_id
  service = each.value

  disable_on_destroy = false

  depends_on = [google_project.new]
}

# Wait for bootstrap APIs to propagate before enabling the rest.
# New GCP projects need a brief window after API enablement.
resource "time_sleep" "wait_for_apis" {
  depends_on      = [google_project_service.bootstrap]
  create_duration = "30s"
}

# Enable all other required APIs
resource "google_project_service" "apis" {
  provider = google-beta

  for_each = toset(local.required_apis)

  project = local.project_id
  service = each.value

  disable_on_destroy = false

  depends_on = [time_sleep.wait_for_apis]
}
