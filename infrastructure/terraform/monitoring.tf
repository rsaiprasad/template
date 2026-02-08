# Cloud Monitoring and Logging Configuration
# All resources are conditionally created based on var.monitoring configuration

locals {
  monitoring_enabled       = var.monitoring.enabled
  audit_logs_enabled       = local.monitoring_enabled && var.monitoring.audit_logs.enabled
  alerts_enabled           = local.monitoring_enabled
  notification_email       = coalesce(var.monitoring.notifications.email, var.super_admin_email)
  uptime_check_enabled     = local.monitoring_enabled && var.monitoring.alerts.uptime.enabled && var.monitoring.alerts.uptime.api_domain != null
}

# Enable Logging and Monitoring APIs (always enabled when monitoring is on)
resource "google_project_service" "logging" {
  provider = google-beta
  count    = local.monitoring_enabled ? 1 : 0

  project = local.project_id
  service = "logging.googleapis.com"

  disable_on_destroy = false

  depends_on = [
    google_project.new,
    google_project_service.bootstrap,
  ]
}

resource "google_project_service" "monitoring" {
  provider = google-beta
  count    = local.monitoring_enabled ? 1 : 0

  project = local.project_id
  service = "monitoring.googleapis.com"

  disable_on_destroy = false

  depends_on = [
    google_project.new,
    google_project_service.bootstrap,
  ]
}

# =============================================================================
# AUDIT LOGGING
# =============================================================================

# Enable Data Access Audit Logs for Firestore
resource "google_project_iam_audit_config" "firestore_audit" {
  provider = google-beta
  count    = local.audit_logs_enabled && var.monitoring.audit_logs.firestore ? 1 : 0

  project = local.project_id
  service = "firestore.googleapis.com"

  dynamic "audit_log_config" {
    for_each = var.monitoring.audit_logs.log_types
    content {
      log_type = audit_log_config.value
    }
  }

  depends_on = [google_project_service.logging]
}

# Enable Data Access Audit Logs for Identity Toolkit (Auth)
resource "google_project_iam_audit_config" "identity_audit" {
  provider = google-beta
  count    = local.audit_logs_enabled && var.monitoring.audit_logs.auth ? 1 : 0

  project = local.project_id
  service = "identitytoolkit.googleapis.com"

  dynamic "audit_log_config" {
    for_each = var.monitoring.audit_logs.log_types
    content {
      log_type = audit_log_config.value
    }
  }

  depends_on = [google_project_service.logging]
}

# =============================================================================
# LOG-BASED METRICS
# =============================================================================

# Log-based metric for authentication failures
resource "google_logging_metric" "auth_failures" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.auth_failures.enabled ? 1 : 0

  project = local.project_id
  name    = "auth-failures"
  filter  = <<-EOT
    resource.type="identitytoolkit.googleapis.com/Project"
    AND severity>=ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "error_code"
      value_type  = "STRING"
      description = "The authentication error code"
    }
  }

  label_extractors = {
    "error_code" = "EXTRACT(jsonPayload.error.code)"
  }

  depends_on = [google_project_service.logging]
}

# Log-based metric for Cloud Functions errors
resource "google_logging_metric" "function_errors" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.function_errors.enabled ? 1 : 0

  project = local.project_id
  name    = "cloud-function-errors"
  filter  = <<-EOT
    resource.type="cloud_function"
    AND severity>=ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "function_name"
      value_type  = "STRING"
      description = "Name of the Cloud Function"
    }
  }

  label_extractors = {
    "function_name" = "EXTRACT(resource.labels.function_name)"
  }

  depends_on = [google_project_service.logging]
}

# Log-based metric for Firestore errors
resource "google_logging_metric" "firestore_errors" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.firestore_errors.enabled ? 1 : 0

  project = local.project_id
  name    = "firestore-errors"
  filter  = <<-EOT
    resource.type="firestore_database"
    AND severity>=ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }

  depends_on = [google_project_service.logging]
}

# Log-based metric for high latency requests
resource "google_logging_metric" "high_latency_requests" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.high_latency.enabled ? 1 : 0

  project = local.project_id
  name    = "high-latency-requests"
  filter  = <<-EOT
    resource.type="cloud_function"
    AND httpRequest.latency>"${var.monitoring.alerts.high_latency.latency_seconds}s"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }

  depends_on = [google_project_service.logging]
}

# =============================================================================
# NOTIFICATION CHANNELS
# =============================================================================

# Email notification channel
resource "google_monitoring_notification_channel" "email" {
  provider = google-beta
  count    = local.alerts_enabled ? 1 : 0

  project      = local.project_id
  display_name = "${var.project_name} Alerts (Email)"
  type         = "email"

  labels = {
    email_address = local.notification_email
  }

  depends_on = [google_project_service.monitoring]
}

# Slack notification channel (optional)
resource "google_monitoring_notification_channel" "slack" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.notifications.slack_webhook != null ? 1 : 0

  project      = local.project_id
  display_name = "${var.project_name} Alerts (Slack)"
  type         = "slack"

  labels = {
    channel_name = "#alerts"
  }

  sensitive_labels {
    auth_token = var.monitoring.notifications.slack_webhook
  }

  depends_on = [google_project_service.monitoring]
}

locals {
  # Build list of notification channels based on what's configured
  notification_channels = compact([
    local.alerts_enabled ? google_monitoring_notification_channel.email[0].name : "",
    local.alerts_enabled && var.monitoring.notifications.slack_webhook != null ? google_monitoring_notification_channel.slack[0].name : "",
  ])
}

# =============================================================================
# ALERT POLICIES
# =============================================================================

# Alert policy for authentication failures
resource "google_monitoring_alert_policy" "auth_failure_alert" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.auth_failures.enabled ? 1 : 0

  project      = local.project_id
  display_name = "Authentication Failures Spike"
  combiner     = "OR"

  conditions {
    display_name = "Auth failures exceed threshold (${var.monitoring.alerts.auth_failures.threshold})"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.auth_failures[0].name}\" AND resource.type=\"identitytoolkit.googleapis.com/Project\""
      duration        = var.monitoring.alerts.auth_failures.window
      comparison      = "COMPARISON_GT"
      threshold_value = var.monitoring.alerts.auth_failures.threshold

      aggregations {
        alignment_period   = var.monitoring.alerts.auth_failures.window
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "Authentication failures have exceeded ${var.monitoring.alerts.auth_failures.threshold} in ${var.monitoring.alerts.auth_failures.window}. This may indicate a brute force attack or configuration issue. Check Cloud Logging for details."
    mime_type = "text/markdown"
  }

  depends_on = [
    google_logging_metric.auth_failures,
    google_monitoring_notification_channel.email,
  ]
}

# Alert policy for Cloud Function errors
resource "google_monitoring_alert_policy" "function_error_alert" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.function_errors.enabled ? 1 : 0

  project      = local.project_id
  display_name = "Cloud Function Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "Function errors exceed threshold (${var.monitoring.alerts.function_errors.threshold})"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.function_errors[0].name}\" AND resource.type=\"cloud_function\""
      duration        = var.monitoring.alerts.function_errors.window
      comparison      = "COMPARISON_GT"
      threshold_value = var.monitoring.alerts.function_errors.threshold

      aggregations {
        alignment_period   = var.monitoring.alerts.function_errors.window
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "Cloud Function error rate has exceeded ${var.monitoring.alerts.function_errors.threshold} errors in ${var.monitoring.alerts.function_errors.window}. Check the function logs for error details and stack traces."
    mime_type = "text/markdown"
  }

  depends_on = [
    google_logging_metric.function_errors,
    google_monitoring_notification_channel.email,
  ]
}

# Alert policy for Firestore errors
resource "google_monitoring_alert_policy" "firestore_error_alert" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.firestore_errors.enabled ? 1 : 0

  project      = local.project_id
  display_name = "Firestore Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "Firestore errors exceed threshold (${var.monitoring.alerts.firestore_errors.threshold})"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.firestore_errors[0].name}\" AND resource.type=\"firestore_database\""
      duration        = var.monitoring.alerts.firestore_errors.window
      comparison      = "COMPARISON_GT"
      threshold_value = var.monitoring.alerts.firestore_errors.threshold

      aggregations {
        alignment_period   = var.monitoring.alerts.firestore_errors.window
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "Firestore error rate has exceeded ${var.monitoring.alerts.firestore_errors.threshold} errors in ${var.monitoring.alerts.firestore_errors.window}. Check Cloud Logging for Firestore-related errors."
    mime_type = "text/markdown"
  }

  depends_on = [
    google_logging_metric.firestore_errors,
    google_monitoring_notification_channel.email,
  ]
}

# Alert policy for high latency
resource "google_monitoring_alert_policy" "latency_alert" {
  provider = google-beta
  count    = local.alerts_enabled && var.monitoring.alerts.high_latency.enabled ? 1 : 0

  project      = local.project_id
  display_name = "High Latency Requests"
  combiner     = "OR"

  conditions {
    display_name = "High latency requests detected (>${var.monitoring.alerts.high_latency.latency_seconds}s)"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.high_latency_requests[0].name}\" AND resource.type=\"cloud_function\""
      duration        = var.monitoring.alerts.high_latency.window
      comparison      = "COMPARISON_GT"
      threshold_value = var.monitoring.alerts.high_latency.threshold_count

      aggregations {
        alignment_period   = var.monitoring.alerts.high_latency.window
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "Detected ${var.monitoring.alerts.high_latency.threshold_count}+ requests with latency >${var.monitoring.alerts.high_latency.latency_seconds}s in ${var.monitoring.alerts.high_latency.window}. This may indicate database performance issues or inefficient queries."
    mime_type = "text/markdown"
  }

  depends_on = [
    google_logging_metric.high_latency_requests,
    google_monitoring_notification_channel.email,
  ]
}

# =============================================================================
# UPTIME CHECKS
# =============================================================================

# Uptime check for the API (if configured)
resource "google_monitoring_uptime_check_config" "api_health" {
  provider = google-beta
  count    = local.uptime_check_enabled ? 1 : 0

  project      = local.project_id
  display_name = "${var.project_name} API Health"
  timeout      = var.monitoring.alerts.uptime.timeout
  period       = var.monitoring.alerts.uptime.period

  http_check {
    path         = var.monitoring.alerts.uptime.check_path
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = local.project_id
      host       = var.monitoring.alerts.uptime.api_domain
    }
  }

  depends_on = [google_project_service.monitoring]
}

# Alert for uptime check failures
resource "google_monitoring_alert_policy" "uptime_alert" {
  provider = google-beta
  count    = local.uptime_check_enabled ? 1 : 0

  project      = local.project_id
  display_name = "API Uptime Check Failed"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failure"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.labels.check_id=\"${google_monitoring_uptime_check_config.api_health[0].uptime_check_id}\""
      duration        = var.monitoring.alerts.uptime.period
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = var.monitoring.alerts.uptime.period
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MIN"
        group_by_fields      = ["resource.label.host"]
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "The API health check at ${var.monitoring.alerts.uptime.api_domain}${var.monitoring.alerts.uptime.check_path} has failed. The service may be down or experiencing issues. Check Cloud Functions and Cloud Run logs."
    mime_type = "text/markdown"
  }

  depends_on = [
    google_monitoring_uptime_check_config.api_health,
    google_monitoring_notification_channel.email,
  ]
}
