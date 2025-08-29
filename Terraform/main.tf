provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
  use_cli = true
  subscription_id = var.subscription_id
}

provider "local" {}

locals {
  name_prefix = "${var.services_prefix}-${var.env_name}"
}

data "azurerm_client_config" "current" {}

# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group.html
# terraform import azurerm_resource_group.main /subscriptions/27de852c-c023-4de6-ac4d-52c9d4470482/resourceGroups/teeledger-q-rg
resource "azurerm_resource_group" "main" {
  name     = "${local.name_prefix}-rg"
  location = "Southeast Asia"
}