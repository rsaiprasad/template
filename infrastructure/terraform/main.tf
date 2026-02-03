# Provider configuration
# google-beta includes all stable features plus Firebase resources

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}

# Alias for bootstrapping (creating projects, enabling APIs)
provider "google-beta" {
  alias                 = "no_user_project_override"
  project               = var.project_id
  region                = var.region
  user_project_override = false
}

# Local values for convenience
locals {
  project_id = var.project_id
}
