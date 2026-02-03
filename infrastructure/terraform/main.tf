# Provider configuration
# Two provider configurations are needed:
# - Default: with user_project_override for quota/billing
# - Bootstrap: without override for initial project setup

provider "google-beta" {
  user_project_override = true
  billing_project       = var.project_id
}

provider "google-beta" {
  alias                 = "no_user_project_override"
  user_project_override = false
}

# Data source to get project details (when using existing project)
data "google_project" "existing" {
  count      = var.create_project ? 0 : 1
  project_id = var.project_id
}

# Local values for convenience
locals {
  project_id     = var.project_id
  project_number = var.create_project ? google_project.new[0].number : data.google_project.existing[0].number
}
