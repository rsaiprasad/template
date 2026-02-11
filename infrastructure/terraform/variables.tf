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

# Monitoring Configuration

variable "monitoring" {
  description = "Monitoring and alerting configuration"
  type = object({
    enabled = bool

    # Audit logging configuration
    audit_logs = optional(object({
      enabled    = bool
      firestore  = optional(bool, true)
      auth       = optional(bool, true)
      log_types  = optional(list(string), ["ADMIN_READ", "DATA_READ", "DATA_WRITE"])
    }), { enabled = true })

    # Alert notification settings
    notifications = optional(object({
      email         = optional(string)
      slack_webhook = optional(string)
    }), {})

    # Individual alert configurations
    alerts = optional(object({
      auth_failures = optional(object({
        enabled   = bool
        threshold = optional(number, 10)
        window    = optional(string, "300s")
      }), { enabled = true })

      function_errors = optional(object({
        enabled   = bool
        threshold = optional(number, 5)
        window    = optional(string, "300s")
      }), { enabled = true })

      firestore_errors = optional(object({
        enabled   = bool
        threshold = optional(number, 5)
        window    = optional(string, "300s")
      }), { enabled = true })

      high_latency = optional(object({
        enabled          = bool
        threshold_count  = optional(number, 10)
        latency_seconds  = optional(number, 5)
        window           = optional(string, "300s")
      }), { enabled = true })

      uptime = optional(object({
        enabled      = bool
        api_domain   = optional(string)
        check_path   = optional(string, "/api/v1/health")
        period       = optional(string, "300s")
        timeout      = optional(string, "10s")
      }), { enabled = false })
    }), {})
  })

  default = {
    enabled = true
  }
}

# AI Service Configuration

variable "ai_service" {
  description = "AI Assistant service configuration"
  type = object({
    enabled        = bool
    image          = optional(string, "")
    gemini_api_key = optional(string, "")
    backend_url    = optional(string, "")
    system_prompt  = optional(string, "")
    default_mode   = optional(string, "chat")
    max_instances  = optional(number, 5)
    cors_origins   = optional(string, "")
  })
  default = {
    enabled = true
  }
}
