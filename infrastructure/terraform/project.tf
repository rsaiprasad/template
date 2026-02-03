# GCP Project Creation (optional - only if create_project = true)

resource "google_project" "new" {
  count = var.create_project ? 1 : 0

  provider        = google-beta.no_user_project_override
  name            = var.project_name
  project_id      = var.project_id
  billing_account = var.billing_account
  org_id          = var.org_id

  labels = {
    "firebase" = "enabled"
  }
}

# Enable Firebase on the project

resource "google_firebase_project" "default" {
  provider = google-beta

  project = local.project_id

  depends_on = [
    google_project.new,
    google_project_service.firebase,
  ]
}
