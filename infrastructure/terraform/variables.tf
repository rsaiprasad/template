# Required Variables

variable "project_id" {
  description = "The GCP project ID (must be globally unique)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with a letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "project_name" {
  description = "Display name for the project"
  type        = string
  default     = "Admin Dashboard"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "super_admin_email" {
  description = "Email address for the super admin user"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.super_admin_email))
    error_message = "Must be a valid email address."
  }
}

# Optional Variables

variable "billing_account" {
  description = "Billing account ID (required only for creating new projects)"
  type        = string
  default     = null
}

variable "create_project" {
  description = "Whether to create a new GCP project (false = use existing)"
  type        = bool
  default     = false
}

variable "org_id" {
  description = "Organization ID (optional, for creating projects under an org)"
  type        = string
  default     = null
}

# OAuth Configuration (required for Google Sign-In)

variable "oauth_client_id" {
  description = "OAuth 2.0 Client ID for Google Sign-In (from GCP Console)"
  type        = string
  default     = null
}

variable "oauth_client_secret" {
  description = "OAuth 2.0 Client Secret for Google Sign-In (from GCP Console)"
  type        = string
  sensitive   = true
  default     = null
}

variable "enable_google_signin" {
  description = "Whether to enable Google Sign-In (requires oauth_client_id and oauth_client_secret)"
  type        = bool
  default     = false
}

